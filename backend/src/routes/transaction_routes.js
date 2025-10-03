import express from 'express'
import Transaction from '../models/transaction_model.js'
import User from '../models/user_model.js'
import { verifyToken } from './user_routes.js'

const router = express.Router()

function generateRef() {
  const now = new Date()
  const y = String(now.getFullYear()).slice(-2)
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const h = String(now.getHours()).padStart(2, '0')
  const min = String(now.getMinutes()).padStart(2, '0')
  const s = String(now.getSeconds()).padStart(2, '0')
  return `TX-${y}${m}${d}${h}${min}${s}`
}

// POST /api/transactions/depot
// body: { numero_compte: 'ADxxxxx', montant: number }
router.post('/depot', async (req, res) => {
  try {
    const { numero_compte, montant } = req.body || {}
    if (!numero_compte || typeof numero_compte !== 'string') {
      return res.status(400).json({ message: 'Numéro de compte requis' })
    }
    if (!/^AD\d{5}$/i.test(numero_compte)) {
      return res.status(400).json({ message: 'Le dépôt est autorisé uniquement pour les comptes distributeurs' })
    }
    const amount = Number(montant)
    if (!Number.isFinite(amount) || amount < 500) {
      return res.status(400).json({ message: 'Le montant minimum est 500 F' })
    }

    const target = await User.findOne({ numero_compte: numero_compte.toUpperCase() })
    if (!target) return res.status(404).json({ message: 'Compte introuvable' })
    if ((target.role || '').toLowerCase() !== 'distributeur') {
      return res.status(400).json({ message: 'Ce compte n\'est pas un distributeur' })
    }
    if ((target.statut || '').toLowerCase() !== 'actif') {
      return res.status(400).json({ message: 'Le compte distributeur est bloqué' })
    }

    const tx = await Transaction.create({
      type: 'depot',
      reference: generateRef(),
      numero_compte: numero_compte.toUpperCase(),
      montant: amount,
      statut: 'succes',
      targetUserId: target._id,
    })
    // Increment user balance (solde)
    try {
      target.solde = Math.max(0, Number(target.solde || 0) + amount)
      await target.save()
    } catch (err) {
      // If updating balance fails, still return the transaction but log the error
      console.error('Failed to update user balance after deposit:', err)
    }
    return res.status(201).json(tx)
  } catch (e) {
    console.error('Depot error:', e)
    return res.status(500).json({ message: 'Erreur lors du dépôt' })
  }
})

// GET /api/transactions
// query: q (search), numero_compte, page, pageSize
router.get('/', async (req, res) => {
  try {
    const { numero_compte, q, statut } = req.query
    const filter = {}
    if (numero_compte) filter.numero_compte = numero_compte.toUpperCase()
    if (statut) filter.statut = new RegExp(`^${statut}$`, 'i')
    if (q) {
      filter.$or = [
        { reference: new RegExp(q, 'i') },
        { numero_compte: new RegExp(q, 'i') },
        { statut: new RegExp(q, 'i') },
      ]
    }
    const items = await Transaction.find(filter).sort({ createdAt: -1 }).limit(200)
    res.json(items)
  } catch {
    res.status(500).json({ message: 'Erreur lors de la récupération des transactions' })
  }
})

// POST /api/transactions/annuler
// body: { reference: 'TX-...', motif?: string }
router.post('/annuler', verifyToken, async (req, res) => {
  try {
    if (!req.user || String(req.user.role).toLowerCase() !== 'agent') {
      return res.status(403).json({ message: 'Seul un agent peut annuler une transaction' })
    }
    const { reference, motif, numero_compte } = req.body || {}
    if (!reference) return res.status(400).json({ message: 'Référence requise' })
    const tx = await Transaction.findOne({ reference })
    if (!tx) return res.status(404).json({ message: 'Transaction introuvable' })
    if (String(tx.statut).toLowerCase() === 'annule') {
      return res.status(400).json({ message: 'Transaction déjà annulée' })
    }
    if (numero_compte && tx.numero_compte.toUpperCase() !== String(numero_compte).toUpperCase()) {
      return res.status(400).json({ message: 'Le numéro de compte ne correspond pas à la transaction' })
    }

    // Délai d'annulation (par défaut 24h)
    const windowMinutes = Number(process.env.CANCEL_WINDOW_MINUTES || 1440)
    const ageMinutes = (Date.now() - new Date(tx.createdAt).getTime()) / 60000
    if (ageMinutes > windowMinutes) {
      return res.status(400).json({ message: 'Délai d\'annulation dépassé' })
    }
    // Pour l'instant: autoriser l'annulation des dépôts vers distributeur.
    // Préparer la logique pour d'autres types (distributeur→client, client→client) quand ils seront stockés.
    if (tx.type !== 'depot') {
      return res.status(400).json({ message: 'Annulation non supportée pour ce type de transaction pour le moment' })
    }
    // Dépôt vers distributeur seulement (ADxxxxx)
    if (!/^AD\d{5}$/i.test(tx.numero_compte)) {
      return res.status(400).json({ message: 'Annulation non supportée pour ce compte' })
    }

    tx.statut = 'annule'
    tx.cancelReason = motif || 'Demande client'
    tx.cancelledAt = new Date()
    tx.cancelledByAgentId = req.user._id
    await tx.save()
    // Decrement user balance for the cancelled deposit (only for depot to ADxxxxx)
    try {
      const target = await User.findOne({ numero_compte: tx.numero_compte.toUpperCase() })
      if (target) {
        const newSolde = Math.max(0, Number(target.solde || 0) - Number(tx.montant || 0))
        target.solde = newSolde
        await target.save()
      }
    } catch (err) {
      console.error('Failed to adjust user balance on cancellation:', err)
    }
    return res.json(tx)
  } catch (err) {
    console.error('Cancel error:', err)
    return res.status(500).json({ message: 'Erreur lors de l\'annulation' })
  }
})

export default router
