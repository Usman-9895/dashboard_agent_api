import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Topbar from './components/Topbar'
import Sidebar from './components/Sidebar'
import Users from './pages/Users'
import Deposit from './pages/Deposit'
import Cancel from './pages/Cancel'
import History from './pages/History'
import Login from './pages/Login'
import { isAuthenticated } from './auth'
import { apiFetch } from './apiClient'
import './App.css'

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const location = useLocation()

  const isLoginPage = location.pathname === '/login'

  const Protected = ({ children }) => {
    if (!isAuthenticated()) {
      return <Navigate to="/login" replace />
    }
    return children
  }

  // ------------------------------
  // Sliding session keep-alive and draft restoration
  // ------------------------------
  useEffect(() => {
    if (isLoginPage) return
    let intervalId = null
    let lastActivity = Date.now()
    const ping = async () => {
      if (!isAuthenticated()) return
      try { await apiFetch('/api/users/ping', { method: 'GET' }) } catch { /* ignore */ }
    }
    const onActivity = () => { lastActivity = Date.now(); ping() }
    const events = ['mousemove','mousedown','keydown','touchstart','scroll','focus']
    events.forEach(ev => window.addEventListener(ev, onActivity, { passive: true }))
    // periodic keep-alive every 45s if there was activity in last 2 minutes
    intervalId = setInterval(() => {
      if (Date.now() - lastActivity < 2 * 60 * 1000) ping()
    }, 45000)
    return () => {
      if (intervalId) clearInterval(intervalId)
      events.forEach(ev => window.removeEventListener(ev, onActivity))
    }
  }, [isLoginPage])

  // Restore form draft after navigation (if any)
  useEffect(() => {
    if (isLoginPage) return
    try {
      const loc = location.pathname + location.search
      const key = `form_draft:${loc}`
      const raw = localStorage.getItem(key)
      if (raw) {
        const draft = JSON.parse(raw)
        const form = document.querySelector('form')
        if (form && draft && typeof draft === 'object') {
          Object.entries(draft).forEach(([name, value]) => {
            const el = form.querySelector(`#${CSS.escape(name)}, [name="${CSS.escape(name)}"]`)
            if (!el) return
            if (el.type === 'checkbox') el.checked = !!value
            else if (el.type === 'radio') {
              const radio = form.querySelector(`[name="${CSS.escape(name)}"][value="${CSS.escape(String(value))}"]`)
              if (radio) radio.checked = true
            } else {
              el.value = value
              el.dispatchEvent(new Event('input', { bubbles: true }))
              el.dispatchEvent(new Event('change', { bubbles: true }))
            }
          })
        }
        localStorage.removeItem(key)
      }
    } catch { /* ignore */ }
  }, [location, isLoginPage])

  return (
    <div className="app-root">
      {!isLoginPage && <Topbar onToggleSidebar={() => setSidebarOpen(v => !v)} />}
      {!isLoginPage && <Sidebar open={sidebarOpen} />}

      <main className={`main ${!isLoginPage && sidebarOpen ? 'with-sidebar' : ''}`}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/users" replace />} />
          <Route path="/users" element={<Protected><Users /></Protected>} />
          <Route path="/deposit" element={<Protected><Deposit /></Protected>} />
          <Route path="/cancel" element={<Protected><Cancel /></Protected>} />
          <Route path="/history" element={<Protected><History /></Protected>} />
          <Route path="*" element={<Navigate to="/users" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
