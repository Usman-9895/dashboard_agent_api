import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FaBars, FaSignOutAlt, FaUser, FaMoon, FaSun } from 'react-icons/fa'
import './topbar.css'

export default function Topbar({ onToggleSidebar, agentImageSrc = 'omd2025.png', logoSrc = 'logo.png' }) {
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [openMenu, setOpenMenu] = useState(false)
  const [agentForm, setAgentForm] = useState({
    prenom: 'Agent',
    nom: 'Principal',
    email: 'agent@example.com',
    phone: '770000000',
  })
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => (t === 'light' ? 'dark' : 'light'))

  const openProfile = () => setShowProfileModal(true)
  const closeProfile = () => setShowProfileModal(false)
  const onSubmit = (e) => {
    e.preventDefault()
    // Ici, vous pourriez propager les infos de l'agent vers un store ou une API.
    // Pour l'instant, on sauvegarde localement et on ferme la modale.
    setShowProfileModal(false)
  }

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="burger" aria-label="Toggle menu" onClick={onToggleSidebar}>
          <FaBars size={22} />
        </button>
        <Link to="/users" className="topbar-logo-link" aria-label="Aller à l'accueil">
          <img src={logoSrc} alt="OMD" className="topbar-logo" />
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
          <img src={agentImageSrc} alt="agent" className="avatar" />
        </button>
        {openMenu && (
          <div className="avatar-menu">
            <button className="menu-item" onClick={() => { setOpenMenu(false); openProfile() }}>
              <FaUser /> <span>Modifier</span>
            </button>
            <button className="menu-item danger" onClick={() => setOpenMenu(false)}>
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
                <input type="email" value={agentForm.email} onChange={e => setAgentForm({ ...agentForm, email: e.target.value })} required />
              </label>
              <label>
                Numéro de téléphone
                <input value={agentForm.phone} onChange={e => setAgentForm({ ...agentForm, phone: e.target.value })} required />
              </label>
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
