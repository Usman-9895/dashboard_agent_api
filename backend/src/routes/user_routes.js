/* eslint-env node */
import express from 'express'
import jwt from 'jsonwebtoken'
import { body, validationResult } from 'express-validator'
import User from '../models/user_model.js'
import multer from 'multer'
import fs from 'fs'
import path from 'path'
import process from 'node:process'
import mongoose from 'mongoose'

const router = express.Router()

// ---------- Helpers ----------
const signToken = (payload) => jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '1h' })

export const seedDefaultAgent = async () => {
  const email = 'othman@gmail.com'
  const exists = await User.findOne({ email })
  if (exists) return
  const agent = new User({
    nom: 'Othman',
    prenom: 'Agent',
    email,
    mot_de_passe: 'omd@25',
    numero_compte: 'AGENT-0001',
    role: 'agent',
    statut: 'actif'
  })
  await agent.save()
  console.log('🌱 Agent par défaut créé:', email)
}

// Middleware: verify Bearer token
export const verifyToken = (req, res, next) => {
  const auth = req.header('Authorization') || ''
  const [, token] = auth.split(' ')
  if (!token) return res.status(401).json({ message: 'Accès refusé: token manquant' })
  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET)
    req.user = verified
    // Sliding session: if token is close to expiry, refresh it
    try {
      const nowSec = Math.floor(Date.now() / 1000)
      const expSec = Number(verified?.exp || 0)
      const thresholdSec = Number(process.env.JWT_REFRESH_THRESHOLD_SEC || 60) // default 60s
      if (expSec && (expSec - nowSec) <= thresholdSec) {
        const { _id, role } = verified || {}
        const fresh = signToken({ _id, role })
        res.set('x-auth-token', fresh)
      }
    } catch { /* ignore refresh errors */ }
    next()
  } catch {
    return res.status(401).json({ message: 'Token invalide ou expiré' })
  }
}

// Generate numero_compte by role
async function generateNumeroByRole(role) {
  const prefix = role === 'client' ? 'AC' : role === 'distributeur' ? 'AD' : 'AG'
  let numero
  // Try a few times to avoid collision
  for (let i = 0; i < 5; i++) {
    const seq = Math.floor(Math.random() * 90000 + 10000) // 5 digits
    numero = `${prefix}${seq}`
    const exists = await User.findOne({ numero_compte: numero })
    if (!exists) return numero
  }
  // Fallback with timestamp
  return `${prefix}${Date.now().toString().slice(-5)}`
}

// ----------------------
// Authentification
// ----------------------
router.post('/register',
  body('nom').trim().notEmpty(),
  body('prenom').trim().notEmpty(),
  body('email').isEmail().normalizeEmail(),
  body('mot_de_passe').isLength({ min: 6 }),
  body('role').optional().isIn(['client','distributeur','agent']),
  body('phone').trim().notEmpty(),
  body('cni').trim().notEmpty(),
  body('birthdate').trim().notEmpty(),
  body('adresse').trim().notEmpty(),
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })
    try {
      const exists = await User.findOne({ email: req.body.email })
      if (exists) return res.status(409).json({ message: 'Email déjà utilisé' })
      const role = (req.body.role || 'client').toLowerCase()
      const numero_compte = await generateNumeroByRole(role)
      // Normalize CNI: keep only digits and ensure 13 digits, then format x xxx xxxx xxxxx
      const rawCni = String(req.body.cni || '')
      const digits = rawCni.replace(/\D/g, '')
      if (digits.length !== 13) return res.status(400).json({ message: 'Le numéro CNI doit contenir 13 chiffres' })
      const cniFormatted = `${digits[0]} ${digits.slice(1,4)} ${digits.slice(4,8)} ${digits.slice(8,13)}`

      const user = new User({
        nom: req.body.nom,
        prenom: req.body.prenom,
        email: req.body.email,
        mot_de_passe: req.body.mot_de_passe,
        numero_compte,
        role,
        phone: req.body.phone,
        cni: cniFormatted,
        birthdate: req.body.birthdate,
        adresse: req.body.adresse,
      })
      await user.save()
      return res.status(201).json({ message: 'Utilisateur créé', user })
    } catch (error) {
      return res.status(400).json({ message: error.message })
    }
  }
)

router.post('/login',
  body('email').isEmail(),
  body('mot_de_passe').notEmpty(),
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    const { email, mot_de_passe } = req.body
    const user = await User.findOne({ email })
    if (!user) return res.status(400).json({ message: 'Email ou mot de passe incorrect' })
    // Restrict login to default agent only
    if (user.email !== 'othman@gmail.com' || user.role !== 'agent') {
      return res.status(403).json({ message: 'Seul l\'agent par défaut peut se connecter pour le moment' })
    }
    if (user.archived) return res.status(403).json({ message: 'Compte archivé. Contactez l\'administrateur.' })
    if (user.statut === 'bloque') return res.status(403).json({ message: 'Compte bloqué, contactez l\'administrateur' })

    const isMatch = await user.comparePassword(mot_de_passe)
    if (!isMatch) return res.status(400).json({ message: 'Email ou mot de passe incorrect' })

    const token = signToken({ _id: user._id.toString(), role: user.role })
    return res.status(200).json({
      token,
      user
    })
  }
)

router.post('/logout', (_req, res) => {
  // Client-side should forget the token; here we simply respond OK.
  return res.status(200).json({ message: 'Déconnecté' })
})

// Keep-alive ping to refresh token on activity
router.get('/ping', verifyToken, (_req, res) => {
  return res.json({ ok: true, ts: Date.now() })
})

// ----------------------
// Utilisateurs protégés
// ----------------------
router.get('/', verifyToken, async (req, res) => {
  // By default, exclude archived users. Allow ?includeArchived=1 to return all.
  const includeArchived = String(req.query.includeArchived || '').toLowerCase() === '1'
  const filter = includeArchived ? {} : { archived: { $ne: true } }
  const users = await User.find(filter)
  return res.json(users)
})

router.put('/:id', verifyToken, async (req, res) => {
  try {
    // Prevent email duplication
    if (req.body.email) {
      const dup = await User.findOne({ email: req.body.email, _id: { $ne: req.params.id } })
      if (dup) return res.status(409).json({ message: 'Email déjà utilisé' })
    }
    // If password provided, it will be re-hashed by save hook when using findById
    const doc = await User.findById(req.params.id)
    if (!doc) return res.status(404).json({ message: 'Utilisateur non trouvé' })
    // Apply allowed fields (with CNI normalization)
    const allowed = ['nom','prenom','email','role','statut','mot_de_passe','phone','cni','birthdate','adresse']
    for (const k of allowed) {
      if (k in req.body) {
        if (k === 'cni') {
          const raw = String(req.body.cni || '')
          const digits = raw.replace(/\D/g, '')
          if (digits && digits.length !== 13) {
            return res.status(400).json({ message: 'Le numéro CNI doit contenir 13 chiffres' })
          }
          if (digits) {
            doc.cni = `${digits[0]} ${digits.slice(1,4)} ${digits.slice(4,8)} ${digits.slice(8,13)}`
          }
        } else {
          doc[k] = req.body[k]
        }
      }
    }
    await doc.save()
    return res.json(doc)
  } catch (error) {
    return res.status(400).json({ message: error.message })
  }
})

router.patch('/bloquer', verifyToken, async (req, res) => {
  const { userIds } = req.body
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ message: 'Fournir un tableau d\'identifiants' })
  }
  const r = await User.updateMany({ _id: { $in: userIds } }, { $set: { statut: 'bloque' } })
  return res.json({ modified: r.modifiedCount })
})

router.patch('/debloquer', verifyToken, async (req, res) => {
  const { userIds } = req.body
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ message: 'Fournir un tableau d\'identifiants' })
  }
  const r = await User.updateMany({ _id: { $in: userIds } }, { $set: { statut: 'actif' } })
  return res.json({ modified: r.modifiedCount })
})

// Place specific route BEFORE parameterized ':id' route to avoid cast errors
router.delete('/supprimer-plusieurs', verifyToken, async (req, res) => {
  const { userIds } = req.body
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ message: 'Fournir un tableau d\'identifiants' })
  }
  const r = await User.updateMany(
    { _id: { $in: userIds } },
    { $set: { archived: true, archivedAt: new Date() } }
  )
  return res.json({ modified: r.modifiedCount })
})

router.delete('/:id', verifyToken, async (req, res) => {
  // Validate id to prevent CastError
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Identifiant invalide' })
  }
  const user = await User.findById(req.params.id)
  if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' })
  if (user.archived) return res.json({ message: 'Utilisateur déjà archivé' })
  user.archived = true
  user.archivedAt = new Date()
  await user.save()
  return res.json({ message: 'Utilisateur archivé' })
})

// ----------------------
// Upload avatar
// ----------------------
const uploadsDir = path.resolve('uploads', 'avatars')
fs.mkdirSync(uploadsDir, { recursive: true })

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, uploadsDir)
  },
  filename: function (_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase()
    const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`
    cb(null, name)
  }
})

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_SIZE_BYTES = 2 * 1024 * 1024 // 2MB
const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE_BYTES },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(new Error('Type de fichier non supporté. Autorisés: jpg, jpeg, png, webp'))
    }
    cb(null, true)
  }
})

router.post('/:id/avatar', verifyToken, (req, res, next) => {
  upload.single('avatar')(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ message: 'Fichier trop volumineux (max 2 Mo)' })
      return res.status(400).json({ message: err.message })
    } else if (err) {
      return res.status(400).json({ message: err.message })
    }
    next()
  })
}, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Aucun fichier envoyé' })

    const user = await User.findById(req.params.id)
    if (!user) {
      try { fs.unlinkSync(req.file.path) } catch { console.debug('ignore unlink error (user not found)') }
      return res.status(404).json({ message: 'Utilisateur non trouvé' })
    }

    // If user had previous avatar file path under uploads, optionally delete old file
    if (user.avatarUrl && user.avatarUrl.startsWith('/uploads/')) {
      const prevPath = path.resolve(user.avatarUrl.replace(/^\//, ''))
      if (fs.existsSync(prevPath)) {
        try { fs.unlinkSync(prevPath) } catch { console.debug('ignore unlink error (old avatar)') }
      }
    }

    const relPath = `/uploads/avatars/${path.basename(req.file.path)}`
    user.avatarUrl = relPath
    await user.save()
    return res.json(user)
  } catch (error) {
    return res.status(400).json({ message: error.message })
  }
})

export default router
