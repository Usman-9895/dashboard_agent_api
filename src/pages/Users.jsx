import { useMemo, useState, useEffect } from 'react'
import { FaPlus, FaSearch } from 'react-icons/fa'
import { UsersAPI, API_BASE_URL } from '../apiClient'
import { getUser } from '../auth'
import { toast } from 'react-hot-toast'
import ConfirmModal from '../components/ConfirmModal'

export default function Users() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(() => new Set())
  const [editing, setEditing] = useState(null) // store user being edited
  const currentUser = getUser()

  // Avatar upload state (self only)
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState('')
  const [avatarErr, setAvatarErr] = useState('')
  const [avatarLoading, setAvatarLoading] = useState(false)

  useEffect(() => {
    let ignore = false
    async function run() {
      setLoading(true)
      setError('')
      try {
        const data = await UsersAPI.list()
        const sortRecent = (arr) => [...arr].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        if (!ignore) setUsers(sortRecent(data))
      } catch (e) {
        if (!ignore) setError(e.message || 'Erreur lors du chargement')
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    run()
    return () => { ignore = true }
  }, [])

  // UI state
  const [query, setQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    prenom: '',
    nom: '',
    email: '',
    phone: '', // optionnel UI
    role: 'Client',
    cni: '',   // optionnel UI
    birthdate: '', // optionnel UI
    adresse: '',
  })
  const [formErr, setFormErr] = useState({})
  

  // Pagination state
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter(u =>
      (u.prenom || '').toLowerCase().includes(q) ||
      (u.nom || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.numero_compte || '').toLowerCase().includes(q) ||
      (u.phone || '').toLowerCase().includes(q) ||
      (u.adresse || '').toLowerCase().includes(q) ||
      (u.role || '').toLowerCase().includes(q) ||
      (u.statut || '').toLowerCase().includes(q)
    )
  }, [query, users])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const pageData = useMemo(() => {
    const start = (page - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page, pageSize])

  // Real counts for dashboard stats
  const counts = useMemo(() => {
    const dis = users.filter(u => (u.role || '').toLowerCase() === 'distributeur').length
    const cli = users.filter(u => (u.role || '').toLowerCase() === 'client').length
    const agt = users.filter(u => (u.role || '').toLowerCase() === 'agent').length
    return { dis, cli, agt }
  }, [users])

  // Keep page within bounds when results count changes
  useEffect(() => {
    setPage(p => Math.min(p, pageCount))
  }, [pageCount])

  const prev = () => setPage(p => Math.max(1, p - 1))
  const next = () => setPage(p => Math.min(pageCount, p + 1))
  const goto = (n) => setPage(Math.min(Math.max(1, n), pageCount))

  const openModal = () => { setEditing(null); setShowModal(true) }
  const closeModal = () => {
    setShowModal(false)
    setForm({ prenom: '', nom: '', email: '', phone: '', role: 'Client', cni: '', birthdate: '', adresse: '' })
    setFormErr({})
    // reset avatar state when closing
    setAvatarFile(null)
    setAvatarPreview('')
    setAvatarErr('')
    setAvatarLoading(false)
  }
  // Confirmation modal
  const [confirmState, setConfirmState] = useState({ open: false, message: '', onConfirm: null })
  const askConfirm = (message, onConfirm) => setConfirmState({ open: true, message, onConfirm })
  const closeConfirm = () => setConfirmState({ open: false, message: '', onConfirm: null })
  const isSelfEditing = editing && currentUser && (editing.email === currentUser.email || editing._id === currentUser._id)
  const refresh = async () => {
    try {
      setLoading(true)
      const data = await UsersAPI.list()
      const sortRecent = (arr) => [...arr].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      setUsers(sortRecent(data))
    } catch (e) {
      setError(e.message || 'Erreur lors du rafraîchissement')
    } finally {
      setLoading(false)
    }
  }
  const setFieldError = (field, msg) => setFormErr(prev => ({ ...prev, [field]: msg }))
  const validateEmail = (v) => {
    const val = String(v || '').trim()
    if (!val) return 'Email requis'
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)
    return ok ? '' : 'Format d\'email invalide'
  }
  const snFormat = (digitsAfter221) => {
    const d = (digitsAfter221 || '').slice(0, 9)
    const a = d.slice(0, 2)
    const b = d.slice(2, 5)
    const c = d.slice(5, 7)
    const e = d.slice(7, 9)
    return `+221${d.length ? ' ' : ''}${a}${b ? ' ' + b : ''}${c ? ' ' + c : ''}${e ? ' ' + e : ''}`
  }
  const normalizeSnDigits = (inputVal) => {
    const raw = String(inputVal || '')
    const digits = raw.replace(/\D/g, '')
    const after = digits.startsWith('221') ? digits.slice(3) : digits
    return after.slice(0, 9)
  }
  const validatePhone = (v) => {
    const val = String(v || '').trim()
    if (!val) return 'Téléphone requis'
    const after = normalizeSnDigits(val)
    return after.length === 9 ? '' : 'Téléphone invalide.'
  }
  const validateName = (label, v) => {
    const val = String(v || '').trim()
    if (!val) return `${label} requis`
    const ok = /^[A-Za-zÀ-ÖØ-öø-ÿ\s]+$/.test(val)
    return ok ? '' : `${label} ne doit contenir que des lettres`
  }
  const validateNonEmpty = (label, v) => (String(v || '').trim() ? '' : `${label} requis`)
  const validateCNI = (v) => {
    const digits = String(v || '').replace(/\D/g, '')
    return digits.length === 13 ? '' : 'Le numéro CNI doit contenir 13 chiffres'
  }
  const validateBirthdate = (v) => (v ? '' : 'Date de naissance requise')
  const validateRole = (v) => (v ? '' : 'Rôle requis')

  const validateAll = () => {
    const errs = {}
    if (editing && isSelfEditing) {
      errs.prenom = validateName('Prénom', form.prenom)
      errs.nom = validateName('Nom', form.nom)
      errs.phone = validatePhone(form.phone)
      errs.adresse = validateNonEmpty('Adresse', form.adresse)
    } else {
      errs.prenom = validateName('Prénom', form.prenom)
      errs.nom = validateName('Nom', form.nom)
      errs.email = validateEmail(form.email)
      errs.phone = validatePhone(form.phone)
      errs.cni = validateCNI(form.cni)
      errs.birthdate = validateBirthdate(form.birthdate)
      errs.role = validateRole(form.role)
      errs.adresse = validateNonEmpty('Adresse', form.adresse)
    }
    setFormErr(errs)
    return Object.values(errs).every(x => !x)
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!validateAll()) return
    try {
      setLoading(true)
      if (editing && editing._id) {
        // Edit
        const payload = isSelfEditing
          ? {
              prenom: form.prenom,
              nom: form.nom,
              phone: form.phone,
              adresse: form.adresse,
            }
          : {
              prenom: form.prenom,
              nom: form.nom,
              email: form.email,
              role: (form.role || '').toLowerCase(),
              phone: form.phone,
              cni: form.cni,
              birthdate: form.birthdate,
              adresse: form.adresse,
            }
        await UsersAPI.update(editing._id, payload)
      } else {
        // Create - backend requires numero_compte & mot_de_passe
        const payload = {
          prenom: form.prenom,
          nom: form.nom,
          email: form.email,
          role: (form.role || '').toLowerCase(),
          mot_de_passe: 'Temp@1234',
          phone: form.phone,
          cni: form.cni,
          birthdate: form.birthdate,
          adresse: form.adresse,
        }
        await UsersAPI.register(payload)
      }
      await refresh()
      closeModal()
      toast.success(editing ? 'Utilisateur mis à jour' : 'Utilisateur créé')
    } catch (err) {
      setError(err.message || 'Erreur sauvegarde')
      toast.error(err.message || 'Erreur lors de la sauvegarde')
    } finally {
      setLoading(false)
    }
  }

  // ----------------------
  // Avatar helpers (self only)
  // ----------------------
  const allowedExt = new Set(['.jpg', '.jpeg', '.png', '.webp'])
  const validateAvatar = (file) => {
    if (!file) return 'Fichier requis'
    const name = file.name || ''
    const ext = name.substring(name.lastIndexOf('.')).toLowerCase()
    if (!allowedExt.has(ext)) return 'Extensions autorisées: jpg, jpeg, png, webp'
    const size = file.size || 0
    const max = 2 * 1024 * 1024 // 2MB
    if (size > max) return 'Fichier trop volumineux (max 2 Mo)'
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
    if (!editing || !editing._id) return
    if (!avatarFile) { setAvatarErr('Choisissez un fichier'); return }
    const msg = validateAvatar(avatarFile)
    if (msg) { setAvatarErr(msg); return }
    try {
      setAvatarLoading(true)
      const updated = await UsersAPI.updateAvatar(editing._id, avatarFile)
      // update local list and current user cache
      await refresh()
      try {
        const raw = localStorage.getItem('auth_user')
        const me = raw ? JSON.parse(raw) : null
        if (me && (me._id === updated._id)) {
          localStorage.setItem('auth_user', JSON.stringify(updated))
          try { window.dispatchEvent(new Event('auth_user_updated')) } catch (err) { console.debug('dispatch auth_user_updated failed', err) }
        }
      } catch (e) { console.debug('auth_user update skipped', e) }
      toast.success('Photo de profil mise à jour')
      // keep modal open; reset file picker
      setAvatarFile(null)
      setAvatarPreview('')
      setAvatarErr('')
    } catch (e) {
      setAvatarErr(e.message || 'Échec du téléversement')
      toast.error(e.message || 'Échec du téléversement')
    } finally {
      setAvatarLoading(false)
    }
  }

  const onDeleteOne = async (id) => {
    askConfirm('Confirmer la suppression de cet utilisateur ?', async () => {
      closeConfirm()
      try {
        await UsersAPI.delete(id)
        await refresh()
        toast.success('Utilisateur supprimé')
      } catch (e) { setError(e.message || 'Erreur suppression') }
    })
  }

  const toggleSelect = (id, checked) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (checked) next.add(id); else next.delete(id)
      return next
    })
  }
  const selectAllVisible = (checked, rows) => {
    setSelected(prev => {
      const next = new Set(prev)
      rows.forEach(u => {
        const isSelf = currentUser && (u.email === currentUser.email || u._id === currentUser._id)
        if (isSelf) return
        if (checked) next.add(u._id); else next.delete(u._id)
      })
      return next
    })
  }
  const bulkBlock = async () => {
    if (!selected.size) return
    askConfirm('Bloquer les utilisateurs sélectionnés ?', async () => {
      closeConfirm()
      await UsersAPI.blockMany(Array.from(selected)); setSelected(new Set()); await refresh(); toast.success('Utilisateurs bloqués')
    })
  }
  const bulkUnblock = async () => {
    if (!selected.size) return
    askConfirm('Débloquer les utilisateurs sélectionnés ?', async () => {
      closeConfirm()
      await UsersAPI.unblockMany(Array.from(selected)); setSelected(new Set()); await refresh(); toast.success('Utilisateurs débloqués')
    })
  }
  const bulkDelete = async () => {
    if (!selected.size) return
    askConfirm('Supprimer les utilisateurs sélectionnés ?', async () => {
      closeConfirm()
      await UsersAPI.deleteMany(Array.from(selected)); setSelected(new Set()); await refresh(); toast.success('Utilisateurs supprimés')
    })
  }

  return (
    <>
      <section className="stats">
        <div className="stat-card">
          <p className="stat-value">{counts.dis}</p>
          <p className="stat-title">Distributeurs</p>
        </div>
        <div className="stat-card">
          <p className="stat-value">{counts.cli}</p>
          <p className="stat-title">Clients</p>
        </div>
        <div className="stat-card">
          <p className="stat-value">{counts.agt}</p>
          <p className="stat-title">Agents</p>
        </div>
      </section>

      <section className="table-wrap">
        <header className="table-header">
          <span>Utilisateurs</span>
          <div className="table-toolbar">
            <div className="search">
              <FaSearch />
              <input
                type="text"
                placeholder="Rechercher... (nom, prénom, compte, statut)"
                value={query}
                onChange={e => { setQuery(e.target.value); setPage(1) }}
              />
            </div>
            <button className="add-btn" onClick={openModal}><FaPlus /> Ajouter</button>
          </div>
        </header>
        {error && (
          <div style={{ padding: '12px 16px', color: '#7f1d1d', background: '#fecaca' }}>
            {error}
          </div>
        )}
        {loading ? (
          <div style={{ padding: '14px 16px' }}>Chargement…</div>
        ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  onChange={(e) => selectAllVisible(e.target.checked, pageData)}
                  checked={pageData.length > 0 && pageData.every(u => selected.has(u._id))}
                  aria-label="Tout sélectionner"
                />
              </th>
              <th>N°</th>
              <th>Prénom</th>
              <th>Nom</th>
              <th>Email</th>
              <th>N° Compte</th>
              <th>Téléphone</th>
              <th>Solde</th>
              <th>Rôle</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageData.map((u, idx) => {
              const isSelf = currentUser && (u.email === currentUser.email || u._id === currentUser._id)
              return (
              <tr key={u._id || idx}>
                <td>
                  <input
                    type="checkbox"
                    checked={selected.has(u._id)}
                    onChange={(e) => toggleSelect(u._id, e.target.checked)}
                    disabled={isSelf}
                    aria-label={`Sélectionner ${u.prenom} ${u.nom}`}
                  />
                </td>
                <td>{(page - 1) * pageSize + idx + 1}</td>
                <td>{u.prenom}</td>
                <td>{u.nom}</td>
                <td>{u.email}</td>
                <td>{u.numero_compte}</td>
                <td>{u.phone || '-'}</td>
                <td>{Number(u.solde || 0).toLocaleString('fr-FR')} FCFA</td>
                <td>{u.role}</td>
                <td>
                  <span className={`chip ${u.statut === 'actif' ? 'success' : 'danger'}`}>
                    {u.statut}
                  </span>
                </td>
                <td className="actions">
                  <button className="icon-btn" title="Editer" onClick={() => { setEditing(u); setForm({ prenom: u.prenom, nom: u.nom, email: u.email, role: (u.role || '').charAt(0).toUpperCase() + (u.role || '').slice(1), phone: u.phone || '', cni: u.cni || '', birthdate: u.birthdate || '', adresse: u.adresse || '' }); setShowModal(true) }}>✏️</button>
                  {!isSelf && (
                    <>
                      <button className="icon-btn" title="Supprimer" onClick={() => onDeleteOne(u._id)}>🗑️</button>
                      <button className="icon-btn" title="Bloquer" onClick={() => askConfirm('Bloquer cet utilisateur ?', async () => { closeConfirm(); await UsersAPI.blockMany([u._id]); await refresh(); toast.success('Utilisateur bloqué') })}>🚫</button>
                    </>
                  )}
                </td>
              </tr>
            )})}
          </tbody>
        </table>
        )}
        <footer className="table-footer">
          <span>{page} sur {pageCount}</span>
          <div className="actions" style={{ marginLeft: 12 }}>
            <button className="btn-secondary" onClick={bulkBlock} disabled={!selected.size}>Bloquer</button>
            <button className="btn-secondary" onClick={bulkUnblock} disabled={!selected.size}>Débloquer</button>
            <button className="btn-danger" onClick={bulkDelete} disabled={!selected.size}>Supprimer</button>
          </div>
          <div className="pager-size">
            <label htmlFor="users-page-size">Lignes par page :</label>
            <select
              id="users-page-size"
              value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
          </div>
          <div className="pager">
            <button className="pager-btn" aria-label="Précédent" onClick={prev} disabled={page === 1}>◀</button>
            {Array.from({ length: pageCount }, (_, i) => i + 1).map(n => (
              <button
                key={n}
                className="pager-btn"
                onClick={() => goto(n)}
                aria-current={n === page ? 'page' : undefined}
                aria-label={`Aller à la page ${n}`}
              >{n}</button>
            ))}
            <button className="pager-btn" aria-label="Suivant" onClick={next} disabled={page === pageCount}>▶</button>
          </div>
        </footer>
      </section>

      {showModal && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>{editing ? 'Modifier un utilisateur' : 'Ajouter un utilisateur'}</h3>
            <form onSubmit={onSubmit} className="form-grid" noValidate>
              <label>
                Prénom
                <input
                  value={form.prenom}
                  onChange={e => {
                    // refuse digits/specials; keep letters and spaces only
                    const cleaned = e.target.value.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ\s]/g, '')
                    setForm({ ...form, prenom: cleaned })
                    if (formErr.prenom) setFieldError('prenom', validateName('Prénom', cleaned))
                  }}
                  onBlur={e => setFieldError('prenom', validateName('Prénom', e.target.value))}
                />
                {formErr.prenom && <div className="field-error">{formErr.prenom}</div>}
              </label>
              <label>
                Nom
                <input
                  value={form.nom}
                  onChange={e => {
                    const cleaned = e.target.value.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ\s]/g, '')
                    setForm({ ...form, nom: cleaned })
                    if (formErr.nom) setFieldError('nom', validateName('Nom', cleaned))
                  }}
                  onBlur={e => setFieldError('nom', validateName('Nom', e.target.value))}
                />
                {formErr.nom && <div className="field-error">{formErr.nom}</div>}
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={form.email}
                  onChange={e => { setForm({ ...form, email: e.target.value }); if (formErr.email) setFieldError('email', isSelfEditing ? '' : validateEmail(e.target.value)) }}
                  onBlur={e => setFieldError('email', isSelfEditing ? '' : validateEmail(e.target.value))}
                  disabled={isSelfEditing}
                  readOnly={isSelfEditing}
                />
                {!isSelfEditing && formErr.email && <div className="field-error">{formErr.email}</div>}
              </label>
              <label>
                Numéro de téléphone
                <input
                  value={snFormat(normalizeSnDigits(form.phone))}
                  placeholder="+221 xx xxx xx xx"
                  onChange={e => {
                    const after = normalizeSnDigits(e.target.value)
                    const formatted = snFormat(after)
                    setForm({ ...form, phone: formatted })
                    if (formErr.phone) setFieldError('phone', validatePhone(formatted))
                  }}
                  onBlur={e => setFieldError('phone', validatePhone(e.target.value))}
                />
                {formErr.phone && <div className="field-error">{formErr.phone}</div>}
              </label>
              <label>
                Adresse
                <input
                  value={form.adresse}
                  onChange={e => { setForm({ ...form, adresse: e.target.value }); if (formErr.adresse) setFieldError('adresse', validateNonEmpty('Adresse', e.target.value)) }}
                  onBlur={e => setFieldError('adresse', validateNonEmpty('Adresse', e.target.value))}
                />
                {formErr.adresse && <div className="field-error">{formErr.adresse}</div>}
              </label>
              <label>
                Rôle
                <select
                  value={form.role}
                  onChange={e => { setForm({ ...form, role: e.target.value }); if (formErr.role) setFieldError('role', isSelfEditing ? '' : validateRole(e.target.value)) }}
                  onBlur={e => setFieldError('role', isSelfEditing ? '' : validateRole(e.target.value))}
                  disabled={isSelfEditing}
                >
                  <option>Client</option>
                  <option>Distributeur</option>
                </select>
                {!isSelfEditing && formErr.role && <div className="field-error">{formErr.role}</div>}
              </label>
              <label>
                CNI
                <input
                  value={form.cni}
                  onChange={e => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0,13)
                    const formatted = digits.length
                      ? `${digits[0] || ''}${digits.length>1 ? ' ' : ''}${digits.slice(1,4)}${digits.length>4 ? ' ' : ''}${digits.slice(4,8)}${digits.length>8 ? ' ' : ''}${digits.slice(8,13)}`
                      : ''
                    setForm({ ...form, cni: formatted })
                    if (formErr.cni) setFieldError('cni', isSelfEditing ? '' : validateCNI(formatted))
                  }}
                  placeholder="x xxx xxxx xxxxx"
                  disabled={isSelfEditing}
                  onBlur={() => setFieldError('cni', isSelfEditing ? '' : validateCNI(form.cni))}
                />
                {!isSelfEditing && formErr.cni && <div className="field-error">{formErr.cni}</div>}
              </label>
              <label>
                Date de naissance
                <input
                  type="date"
                  value={form.birthdate}
                  onChange={e => { setForm({ ...form, birthdate: e.target.value }); if (formErr.birthdate) setFieldError('birthdate', isSelfEditing ? '' : validateBirthdate(e.target.value)) }}
                  onBlur={e => setFieldError('birthdate', isSelfEditing ? '' : validateBirthdate(e.target.value))}
                  disabled={isSelfEditing}
                />
                {!isSelfEditing && formErr.birthdate && <div className="field-error">{formErr.birthdate}</div>}
              </label>
              {isSelfEditing && (
                <div style={{ gridColumn: '1 / -1', borderTop: '1px solid #e5e7eb', paddingTop: 12 }}>
                  <h4 style={{ margin: '8px 0' }}>Photo de profil</h4>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ width: 64, height: 64, borderRadius: 8, overflow: 'hidden', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {avatarPreview || editing?.avatarUrl ? (
                        <img
                          src={avatarPreview || (editing.avatarUrl?.startsWith('http') ? editing.avatarUrl : `${API_BASE_URL}${editing.avatarUrl || ''}`)}
                          alt="Aperçu"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
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
              )}
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={closeModal}>Annuler</button>
                <button type="submit" className="btn-primary">{editing ? 'Enregistrer' : 'Ajouter'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ConfirmModal
        open={confirmState.open}
        title="Confirmation"
        message={confirmState.message}
        confirmText="Confirmer"
        cancelText="Annuler"
        onConfirm={confirmState.onConfirm}
        onClose={closeConfirm}
      />
    </>
  )
}
