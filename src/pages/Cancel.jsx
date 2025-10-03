import { useMemo, useState, useEffect } from 'react'
import { FaSearch } from 'react-icons/fa'

function generateMockAnnuls(count = 19) {
  const out = []
  for (let i = 1; i <= count; i++) {
    out.push({
      id: i,
      date: new Date(2025, 8, (i % 28) + 1, 14, (i * 5) % 60).toLocaleString(),
      ref: `TX-${String(500 + i).padStart(4, '0')}`,
      compte: `AC${2000 + i}`,
      motif: i % 3 === 0 ? 'Doublon' : 'Demande client',
      statut: 'Annulé',
    })
  }
  return out
}

export default function Cancel() {
  const [compte, setCompte] = useState('')
  const [transfert, setTransfert] = useState('')
  const [message, setMessage] = useState('')
  const [items, setItems] = useState(generateMockAnnuls())
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return items
    return items.filter(t =>
      t.compte.toLowerCase().includes(s) ||
      t.ref.toLowerCase().includes(s) ||
      t.motif.toLowerCase().includes(s) ||
      t.statut.toLowerCase().includes(s)
    )
  }, [items, q])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page, pageSize])

  // Keep page within bounds when number of items changes
  useEffect(() => {
    setPage(p => Math.min(p, pageCount))
  }, [pageCount])

  const isAnnul = (s) => {
    if (!s) return false
    const plain = s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    return plain.startsWith('annul')
  }

  const submit = (e) => {
    e.preventDefault()
    if (!compte || !transfert) return
    // Ici tu pourras appeler ton API d'annulation
    setMessage(`Requête d'annulation envoyée pour le transfert ${transfert} du compte ${compte}.`)
    const id = items.length ? items[0].id + 1 : 1
    const record = {
      id,
      date: new Date().toLocaleString(),
      ref: transfert.trim(),
      compte: compte.trim(),
      motif: 'Demande client',
      statut: 'Annulé',
    }
    setItems([record, ...items])
    setCompte('')
    setTransfert('')
    setPage(1)
  }

  const prev = () => setPage(p => Math.max(1, p - 1))
  const next = () => setPage(p => Math.min(pageCount, p + 1))
  const goto = (n) => setPage(Math.min(Math.max(1, n), pageCount))

  return (
    <div>
      <section className="form-card">
        <header className="form-card-header">Annuler un transfert</header>
        <form className="inline-form" onSubmit={submit}>
          <label>
            Numéro de compte
            <input
              placeholder="Ex: AC1234"
              value={compte}
              onChange={e => setCompte(e.target.value)}
              required
            />
          </label>
          <label>
            Numéro de transfert
            <input
              placeholder="Ex: TX-0001"
              value={transfert}
              onChange={e => setTransfert(e.target.value)}
              required
            />
          </label>
          <div className="actions-right">
            <button type="submit" className="btn-primary">Annuler le transfert</button>
          </div>
        </form>
      </section>

      {message && (
        <div style={{marginTop: 12, background: '#e7f5ee', border: '1px solid #cfeadd', color: '#0f5132', padding: 12, borderRadius: 8}}>
          {message}
        </div>
      )}

      <section className="table-wrap" style={{marginTop: 16}}>
        <header className="table-header">
          <span>Historique des annulations</span>
          <div className="table-toolbar">
            <div className="search">
              <FaSearch />
              <input
                type="text"
                placeholder="Rechercher... (compte, référence, motif, statut)"
                value={q}
                onChange={e => { setQ(e.target.value); setPage(1) }}
              />
            </div>
          </div>
        </header>
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Date</th>
              <th>Référence</th>
              <th>Numéro de compte</th>
              <th>Motif</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
              {pageItems.map(t => (
                <tr key={t.id}>
                  <td>{t.id}</td>
                  <td>{t.date}</td>
                  <td>{t.ref}</td>
                  <td>{t.compte}</td>
                  <td>{t.motif}</td>
                  <td>
                    {isAnnul(t.statut)
                      ? <span className="chip danger">{t.statut}</span>
                      : <span className="chip">{t.statut}</span>}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        <footer className="table-footer">
          <span>{page} sur {pageCount}</span>
          <div className="pager-size">
            <select
              id="cancel-page-size"
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
    </div>
  )
}
