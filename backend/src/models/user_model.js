import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const UserSchema = new mongoose.Schema({
  nom: { type: String, required: true, trim: true },
  prenom: { type: String, required: true, trim: true },
  mot_de_passe: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  numero_compte: { type: String, required: true, unique: true, trim: true },
  phone: { type: String, trim: true },
  cni: { type: String, trim: true },
  birthdate: { type: String, trim: true },
  adresse: { type: String, trim: true },
  role: { type: String, enum: ['client', 'distributeur', 'agent'], default: 'client' },
  statut: { type: String, enum: ['actif', 'bloque'], default: 'actif' },
  avatarUrl: { type: String, trim: true },
  solde: { type: Number, default: 0, min: 0 },
  // soft-delete flags
  archived: { type: Boolean, default: false, index: true },
  archivedAt: { type: Date, default: null }
}, { timestamps: true })

// Hide password when converting to JSON
UserSchema.methods.toJSON = function () {
  const obj = this.toObject()
  delete obj.mot_de_passe
  return obj
}

// Hash password before save when modified
UserSchema.pre('save', async function (next) {
  if (this.isModified('mot_de_passe')) {
    this.mot_de_passe = await bcrypt.hash(this.mot_de_passe, 10)
  }
  next()
})

// Compare password
UserSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.mot_de_passe)
}

export default mongoose.model('User', UserSchema)

