import { useMemo, useState, useEffect } from 'react'
import { FaPlus, FaSearch } from 'react-icons/fa'

const initialUsers = [
  { id: 1, prenom: 'Ousmane', nom: 'Dieng', email: 'ousmane@example.com', phone: '770000001', role: 'Client', cni: 'CNI123456', birthdate: '1995-05-10' },
  { id: 2, prenom: 'Modou', nom: 'Ndiaye', email: 'modou@example.com',   phone: '770000002', role: 'Distributeur', cni: 'CNI654321', birthdate: '1990-01-20' },
  { id: 3, prenom: 'Omar', nom: 'Ndiaye', email: 'omar@example.com',   phone: '770000003', role: 'Agent', cni: 'CNI654321', birthdate: '1990-01-20' },
  { id: 4, prenom: 'Aliou', nom: 'Ndoye', email: 'aliou@example.com',   phone: '778596547', role: 'Client', cni: 'CNI96789', birthdate: '1980-05-20' },
  
]

export default function Users() {
  const [users, setUsers] = useState(initialUsers)
  const [query, setQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    prenom: '',
    nom: '',
    email: '',
    phone: '',
    role: 'Client',
    cni: '',
    birthdate: '',
    
  })

  // Pagination state
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter(u =>
      String(u.id).includes(q) ||
      u.prenom.toLowerCase().includes(q) ||
      u.nom.toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.phone || '').toLowerCase().includes(q) ||
      (u.role || '').toLowerCase().includes(q) ||
      (u.cni || '').toLowerCase().includes(q) ||
      (u.birthdate || '').toLowerCase().includes(q)
    )
  }, [query, users])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const pageData = useMemo(() => {
    const start = (page - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page, pageSize])

  // Keep page within bounds when results count changes
  useEffect(() => {
    setPage(p => Math.min(p, pageCount))
  }, [pageCount])

  const prev = () => setPage(p => Math.max(1, p - 1))
  const next = () => setPage(p => Math.min(pageCount, p + 1))
  const goto = (n) => setPage(Math.min(Math.max(1, n), pageCount))

  const openModal = () => setShowModal(true)
  const closeModal = () => {
    setShowModal(false)
    setForm({ prenom: '', nom: '', email: '', phone: '', role: 'Client', cni: '', birthdate: '' })
  }
  const onSubmit = (e) => {
    e.preventDefault()
    if (!form.prenom || !form.nom || !form.email || !form.phone || !form.role || !form.cni || !form.birthdate) return
    const nextId = users.length ? Math.max(...users.map(u => u.id)) + 1 : 1
    setUsers([...users, { id: nextId, ...form }])
    closeModal()
  }

  return (
    <>
      <section className="stats">
        <div className="stat-card">
          <p className="stat-value">12</p>
          <p className="stat-title">Distributeurs</p>
        </div>
        <div className="stat-card">
          <p className="stat-value">16</p>
          <p className="stat-title">Clients</p>
        </div>
        <div className="stat-card">
          <p className="stat-value">1</p>
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
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Prenom</th>
              <th>Nom</th>
              <th>Email</th>
              <th>Téléphone</th>
              <th>Rôle</th>
              <th>CNI</th>
              <th>Date de naissance</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageData.map(u => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>{u.prenom}</td>
                <td>{u.nom}</td>
                <td>{u.email}</td>
                <td>{u.phone}</td>
                <td>{u.role}</td>
                <td>{u.cni}</td>
                <td>{u.birthdate}</td>
                <td className="actions">
                  <button className="icon-btn" title="Editer">✏️</button>
                  <button className="icon-btn" title="Supprimer">🗑️</button>
                  <button className="icon-btn" title="Bloquer">🚫</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <footer className="table-footer">
          <span>{page} sur {pageCount}</span>
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
            <h3>Ajouter un utilisateur</h3>
            <form onSubmit={onSubmit} className="form-grid">
              <label>
                Prénom
                <input value={form.prenom} onChange={e => setForm({ ...form, prenom: e.target.value })} required />
              </label>
              <label>
                Nom
                <input value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} required />
              </label>
              <label>
                Email
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
              </label>
              <label>
                Numéro de téléphone
                <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} required />
              </label>
              <label>
                Rôle
                <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                  <option>Client</option>
                  <option>Distributeur</option>
                </select>
              </label>
              <label>
                CNI
                <input value={form.cni} onChange={e => setForm({ ...form, cni: e.target.value })} required />
              </label>
              <label>
                Date de naissance
                <input type="date" value={form.birthdate} onChange={e => setForm({ ...form, birthdate: e.target.value })} required />
              </label>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={closeModal}>Annuler</button>
                <button type="submit" className="btn-primary">Ajouter</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
