import { AuthAPI, setToken, clearToken } from './apiClient'

const USER_KEY = 'auth_user'

export async function login(email, password) {
  try {
    const data = await AuthAPI.login(email, password)
    if (data?.token) setToken(data.token)
    if (data?.user) localStorage.setItem(USER_KEY, JSON.stringify(data.user))
    return { ok: true, user: data.user }
  } catch (err) {
    return { ok: false, error: err.message || 'Erreur de connexion' }
  }
}

export async function logout() {
  try { await AuthAPI.logout() } catch { /* ignore */ }
  clearToken()
  localStorage.removeItem(USER_KEY)
}

export function getUser() {
  const raw = localStorage.getItem(USER_KEY)
  try { return raw ? JSON.parse(raw) : null } catch { return null }
}

export function isAuthenticated() {
  return !!localStorage.getItem('auth_token')
}
