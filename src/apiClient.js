export const API_BASE_URL = (import.meta?.env?.VITE_API_URL) || 'http://localhost:4000'

const AUTH_TOKEN_KEY = 'auth_token'

export function setToken(token) {
  localStorage.setItem(AUTH_TOKEN_KEY, token)
}
export function getToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY)
}
export function clearToken() {
  localStorage.removeItem(AUTH_TOKEN_KEY)
}

export async function apiFetch(path, options = {}) {
  const headers = new Headers(options.headers || {})
  // Only set JSON Content-Type when body is not FormData and caller didn't set it
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData
  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers })
  // Sliding session: if backend provides a refreshed token, store it
  try {
    const refreshed = res.headers.get('x-auth-token')
    if (refreshed) setToken(refreshed)
  } catch { /* ignore */ }
  const contentType = res.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')
  const data = isJson ? await res.json() : await res.text()
  if (!res.ok) {
    // Handle unauthorized globally: token expired/invalid -> auto logout and redirect
    if (res.status === 401) {
      try {
        // Persist return URL and a minimal form draft before clearing auth
        try {
          const loc = (typeof window !== 'undefined' && window.location) ? window.location.pathname + window.location.search : ''
          if (loc && loc !== '/login') {
            localStorage.setItem('post_login_redirect', loc)
            // Save simple draft of the first form on the page
            if (typeof document !== 'undefined') {
              const form = document.querySelector('form')
              if (form) {
                const draft = {}
                const fields = form.querySelectorAll('input, textarea, select')
                fields.forEach(el => {
                  const name = el.name || el.id || ''
                  if (!name) return
                  if (el.type === 'checkbox') draft[name] = !!el.checked
                  else if (el.type === 'radio') { if (el.checked) draft[name] = el.value }
                  else draft[name] = el.value
                })
                try { localStorage.setItem(`form_draft:${loc}`, JSON.stringify(draft)) } catch { /* ignore */ }
              }
            }
          }
        } catch { /* ignore */ }
        clearToken()
        try { localStorage.removeItem('auth_user') } catch (e) { console.debug('auth_user removal failed', e) }
        try { window.dispatchEvent(new Event('auth_user_updated')) } catch (e) { console.debug('dispatch auth_user_updated failed', e) }
      } finally {
        if (typeof window !== 'undefined' && window.location && window.location.pathname !== '/login') {
          try { window.location.assign('/login') } catch (e) { console.debug('redirect to /login failed', e) }
        }
      }
    }
    const message = (data && data.message) || res.statusText
    throw new Error(message)
  }
  return data
}

export const UsersAPI = {
  list: () => apiFetch('/api/users'),
  register: (payload) => apiFetch('/api/users/register', { method: 'POST', body: JSON.stringify(payload) }),
  update: (id, payload) => apiFetch(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  delete: (id) => apiFetch(`/api/users/${id}`, { method: 'DELETE' }),
  blockMany: (userIds) => apiFetch('/api/users/bloquer', { method: 'PATCH', body: JSON.stringify({ userIds }) }),
  unblockMany: (userIds) => apiFetch('/api/users/debloquer', { method: 'PATCH', body: JSON.stringify({ userIds }) }),
  deleteMany: (userIds) => apiFetch('/api/users/supprimer-plusieurs', { method: 'DELETE', body: JSON.stringify({ userIds }) }),
  updateAvatar: (id, file) => {
    const fd = new FormData()
    fd.append('avatar', file)
    return apiFetch(`/api/users/${id}/avatar`, { method: 'POST', body: fd })
  }
}

export const AuthAPI = {
  login: (email, mot_de_passe) => apiFetch('/api/users/login', { method: 'POST', body: JSON.stringify({ email, mot_de_passe }) }),
  logout: () => apiFetch('/api/users/logout', { method: 'POST' })
}

export const TransactionsAPI = {
  deposit: (numero_compte, montant) => apiFetch('/api/transactions/depot', { method: 'POST', body: JSON.stringify({ numero_compte, montant }) }),
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return apiFetch(`/api/transactions${qs ? `?${qs}` : ''}`)
  },
  cancel: (reference, motif, numero_compte) => apiFetch('/api/transactions/annuler', { method: 'POST', body: JSON.stringify({ reference, motif, numero_compte }) })
}
