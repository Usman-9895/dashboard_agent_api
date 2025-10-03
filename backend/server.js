/* eslint-env node */
import 'dotenv/config'
import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import userRoutes, { seedDefaultAgent } from './src/routes/user_routes.js'
import transactionRoutes from './src/routes/transaction_routes.js'
import path from 'path'
import process from 'node:process'

const app = express()
const PORT = process.env.PORT || 4000

// Basic CORS for local dev (React at 5173)
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'],
  credentials: false,
  exposedHeaders: ['x-auth-token'] // allow frontend to read refreshed token header
}))
app.use(express.json())

// Health check
app.get('/api/health', (_req, res) => res.json({ ok: true }))

// Routes
app.use('/api/users', userRoutes)
app.use('/api/transactions', transactionRoutes)

// Static serving for uploaded files (avatars)
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')))

// Mongo connection and optional seeding
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/minibank_db'

mongoose.connect(mongoUri).then(async () => {
  console.log('✅ Connecté à MongoDB')
  await seedDefaultAgent()
  app.listen(PORT, () => console.log(`🚀 API démarrée sur http://localhost:${PORT}`))
}).catch(err => {
  console.error('❌ Erreur de connexion à MongoDB:', err.message)
  process.exit(1)
})
