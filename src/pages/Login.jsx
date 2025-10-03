import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login, isAuthenticated } from '../auth'
import './login.css'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  // const [remember, setRemember] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [emailErr, setEmailErr] = useState('')
  const [passErr, setPassErr] = useState('')

  useEffect(() => {
    if (isAuthenticated()) {
      navigate('/users', { replace: true })
    }
  }, [navigate])

  const validateEmail = (v) => {
    const val = String(v || '').trim()
    if (!val) return 'Email requis'
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)
    return ok ? '' : 'Format d\'email invalide'
  }
  const validatePassword = (v) => {
    const val = String(v || '')
    if (!val) return 'Mot de passe requis'
    if (val.length < 6) return 'Le mot de passe doit contenir au moins 6 caractères'
    return ''
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    // custom validation
    const eErr = validateEmail(email)
    const pErr = validatePassword(password)
    setEmailErr(eErr)
    setPassErr(pErr)
    if (eErr || pErr) return

    setLoading(true)
    setError('')
    const res = await login(email.trim(), password)
    setLoading(false)
    if (res.ok) {
      // Redirect back to last protected route if available
      let target = '/users'
      try {
        const saved = localStorage.getItem('post_login_redirect')
        if (saved && typeof saved === 'string' && saved.startsWith('/')) {
          target = saved
          localStorage.removeItem('post_login_redirect')
        }
      } catch { /* ignore */ }
      navigate(target, { replace: true })
    } else {
      setError(res.error || 'Erreur de connexion')
    }
  }

  const fillDefault = () => {
    setEmail('othman@gmail.com')
    setPassword('omd@25')
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-title">Connexion</h1>
        <form onSubmit={handleSubmit} className="login-form" noValidate>
          <label>
            <span>Email</span>
            <input
              type="email"
              placeholder="exemple@email.com"
              value={email}
              onChange={(e)=>{ setEmail(e.target.value); if (emailErr) setEmailErr(validateEmail(e.target.value)) }}
              onBlur={()=> setEmailErr(validateEmail(email))}
            />
            {emailErr && <div className="field-error">{emailErr}</div>}
          </label>
          <label>
            <span>Mot de passe</span>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e)=>{ setPassword(e.target.value); if (passErr) setPassErr(validatePassword(e.target.value)) }}
              onBlur={()=> setPassErr(validatePassword(password))}
            />
            {passErr && <div className="field-error">{passErr}</div>}
          </label>

          <div className="login-row">
            {/* <label className="remember">
              <input type="checkbox" checked={remember} onChange={(e)=>setRemember(e.target.checked)} />
              <span>Se souvenir de moi</span>
            </label> */}
            <button type="button" className="link-btn" onClick={fillDefault}>Remplir par défaut</button>
          </div>

          {error && <div className="error-box">{error}</div>}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
          {/* <p className="muted">Compte par défaut: othman@gmail.com / omd@25</p> */}
        </form>
      </div>
    </div>
  )
}
