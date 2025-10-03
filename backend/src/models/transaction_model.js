import mongoose from 'mongoose'

const TransactionSchema = new mongoose.Schema({
  type: { type: String, enum: ['depot'], required: true },
  reference: { type: String, required: true, unique: true },
  numero_compte: { type: String, required: true, index: true },
  montant: { type: Number, required: true, min: 1 },
  statut: { type: String, enum: ['succes', 'echoue', 'annule'], default: 'succes' },
  agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  cancelReason: { type: String },
  cancelledAt: { type: Date },
  cancelledByAgentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true })

export default mongoose.model('Transaction', TransactionSchema)
