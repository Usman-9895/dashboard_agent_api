import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FaBars, FaSignOutAlt, FaUser, FaMoon, FaSun } from 'react-icons/fa'
import './topbar.css'
import { logout, getUser } from '../auth'
import { UsersAPI, API_BASE_URL } from '../apiClient'

export default function Topbar({ onToggleSidebar, agentImageSrc = 'omd2025.png', logoSrc = 'logo.png' }) {
  const navigate = useNavigate()
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [openMenu, setOpenMenu] = useState(false)
  const [agentForm, setAgentForm] = useState({ prenom: '', nom: '', email: '', phone: '', adresse: '' })
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light')
  const [avatarSrc, setAvatarSrc] = useState(agentImageSrc)
  // avatar upload state (in-profile modal)
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState('')
  const [avatarErr, setAvatarErr] = useState('')
  const [avatarLoading, setAvatarLoading] = useState(false)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  // Initialize avatar from localStorage on mount and listen for updates
  useEffect(() => {
    const computeAvatar = () => {
      const u = getUser() || {}
      const url = String(u.avatarUrl || '').trim()
      if (url) {
        const abs = url.startsWith('http') ? url : `${API_BASE_URL}${url}`
        setAvatarSrc(abs)
      } else {
        setAvatarSrc(agentImageSrc)
      }
    }
    computeAvatar()
    const onCustom = () => computeAvatar()
    const onStorage = (e) => { if (e.key === 'auth_user') computeAvatar() }
    window.addEventListener('auth_user_updated', onCustom)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('auth_user_updated', onCustom)
      window.removeEventListener('storage', onStorage)
    }
  }, [agentImageSrc])

  const toggleTheme = () => setTheme(t => (t === 'light' ? 'dark' : 'light'))

  const openProfile = () => {
    const u = getUser() || {}
    // compute avatar
    const url = String(u.avatarUrl || '').trim()
    if (url) {
      const abs = url.startsWith('http') ? url : `${API_BASE_URL}${url}`
      setAvatarSrc(abs)
    } else {
      setAvatarSrc(agentImageSrc)
    }
    // reset avatar local state for modal
    setAvatarFile(null)
    setAvatarPreview('')
    setAvatarErr('')
    setAvatarLoading(false)
    setAgentForm({
      prenom: u.prenom || '',
      nom: u.nom || '',
      email: u.email || '',
      phone: u.phone || '',
      adresse: u.adresse || '',
    })
    setShowProfileModal(true)
  }
  const closeProfile = () => setShowProfileModal(false)
  const onSubmit = async (e) => {
    e.preventDefault()
    const u = getUser()
    if (!u || !u._id) { setShowProfileModal(false); return }
    // Only editable fields
    const payload = {
      prenom: agentForm.prenom,
      nom: agentForm.nom,
      phone: agentForm.phone,
      adresse: agentForm.adresse,
    }
    await UsersAPI.update(u._id, payload)
    // Update local storage user snapshot
    const updated = { ...u, ...payload }
    try { localStorage.setItem('auth_user', JSON.stringify(updated)) } catch (e) { console.debug('auth_user update skipped', e) }
    try { window.dispatchEvent(new Event('auth_user_updated')) } catch (e) { console.debug('dispatch auth_user_updated failed', e) }
    setShowProfileModal(false)
  }

  // ---- avatar helpers (modal in Topbar) ----
  const allowedExt = new Set(['.jpg', '.jpeg', '.png', '.webp'])
  const validateAvatar = (file) => {
    if (!file) return 'Fichier requis'
    const name = file.name || ''
    const dot = name.lastIndexOf('.')
    const ext = (dot >= 0 ? name.substring(dot) : '').toLowerCase()
    if (!allowedExt.has(ext)) return 'Formats autorisés: jpg, jpeg, png, webp'
    const size = file.size || 0
    if (size > 2 * 1024 * 1024) return 'Fichier trop volumineux (max 2 Mo)'
    return ''
  }
  const onPickAvatar = (e) => {
    const file = e.target.files?.[0]
    const msg = validateAvatar(file)
    setAvatarErr(msg)
    setAvatarFile(msg ? null : file || null)
    if (!msg && file) {
      const url = URL.createObjectURL(file)
      setAvatarPreview(url)
    } else {
      setAvatarPreview('')
    }
  }
  const onUploadAvatar = async () => {
    const u = getUser()
    if (!u || !u._id) return
    if (!avatarFile) { setAvatarErr('Choisissez un fichier'); return }
    const msg = validateAvatar(avatarFile)
    if (msg) { setAvatarErr(msg); return }
    try {
      setAvatarLoading(true)
      const updated = await UsersAPI.updateAvatar(u._id, avatarFile)
      // update local storage snapshot
      try { localStorage.setItem('auth_user', JSON.stringify(updated)) } catch (e) { console.debug('auth_user update skipped', e) }
      try { window.dispatchEvent(new Event('auth_user_updated')) } catch (e) { console.debug('dispatch auth_user_updated failed', e) }
      // update avatar shown in topbar
      const abs = updated.avatarUrl?.startsWith('http') ? updated.avatarUrl : `${API_BASE_URL}${updated.avatarUrl || ''}`
      setAvatarSrc(abs)
      // reset picker state
      setAvatarFile(null)
      setAvatarPreview('')
      setAvatarErr('')
    } catch (e) {
      setAvatarErr(e.message || 'Échec du téléversement')
    } finally {
      setAvatarLoading(false)
    }
  }

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="burger" aria-label="Toggle menu" onClick={onToggleSidebar}>
          <FaBars size={22} />
        </button>
        <Link to="/users" className="topbar-logo-link" aria-label="Aller à l'accueil">
          <img src={logoSrc} alt="LOGO" className="topbar-logo" />
        </Link>
      </div>

      <div className="topbar-center">
        <h1 className="topbar-title">Dashboard Agent</h1>
      </div>

      <div className="topbar-right">
        <div className="theme-switcher">
          <button
            className="theme-btn"
            type="button"
            aria-pressed={theme === 'dark'}
            aria-label={theme === 'dark' ? 'Basculer en mode clair' : 'Basculer en mode sombre'}
            title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
            onClick={toggleTheme}
          >
            {theme === 'dark' ? <FaSun /> : <FaMoon />}
          </button>
        </div>
        <button className="avatar-btn" onClick={() => setOpenMenu(v => !v)}>
          <img src={avatarSrc} alt="OMD" className="avatar" />
        </button>
        {openMenu && (
          <div className="avatar-menu">
            <button className="menu-item" onClick={() => { setOpenMenu(false); openProfile() }}>
              <FaUser /> <span>Modifier</span>
            </button>
            <button
              className="menu-item danger"
              type="button"
              onClick={async () => {
                setOpenMenu(false)
                await logout()
                navigate('/login', { replace: true })
              }}
            >
              <FaSignOutAlt /> <span>Déconnexion</span>
            </button>
          </div>
        )}
      </div>

      {showProfileModal && (
        <div className="modal-backdrop" onClick={closeProfile}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Modifier les informations de l'agent</h3>
            <form onSubmit={onSubmit} className="form-grid">
              <label>
                Prénom
                <input value={agentForm.prenom} onChange={e => setAgentForm({ ...agentForm, prenom: e.target.value })} required />
              </label>
              <label>
                Nom
                <input value={agentForm.nom} onChange={e => setAgentForm({ ...agentForm, nom: e.target.value })} required />
              </label>
              <label>
                Email
                <input type="email" value={agentForm.email} disabled readOnly />
              </label>
              <label>
                Numéro de téléphone
                <input value={agentForm.phone} onChange={e => setAgentForm({ ...agentForm, phone: e.target.value })} required />
              </label>
              <label>
                Adresse
                <input value={agentForm.adresse} onChange={e => setAgentForm({ ...agentForm, adresse: e.target.value })} required />
              </label>
              <div style={{ gridColumn: '1 / -1', borderTop: '1px solid #e5e7eb', paddingTop: 12 }}>
                <h4 style={{ margin: '8px 0' }}>Photo de profil</h4>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ width: 64, height: 64, borderRadius: 8, overflow: 'hidden', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {avatarPreview || avatarSrc ? (
                      <img src={avatarPreview || avatarSrc} alt="Aperçu" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: 12, color: '#6b7280' }}>Aucun</span>
                    )}
                  </div>
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onPickAvatar} />
                  <button type="button" className="btn-primary" onClick={onUploadAvatar} disabled={avatarLoading || !avatarFile}>
                    {avatarLoading ? 'Téléversement…' : 'Mettre à jour la photo'}
                  </button>
                </div>
                {avatarErr && <div className="field-error" style={{ marginTop: 6 }}>{avatarErr}</div>}
                <p className="muted" style={{ marginTop: 6 }}>Formats: jpg, jpeg, png, webp. Taille maximale: 2 Mo.</p>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={closeProfile}>Annuler</button>
                <button type="submit" className="btn-primary">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  )
}
