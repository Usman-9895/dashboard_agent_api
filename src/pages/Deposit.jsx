import { useMemo, useState, useEffect } from 'react'
import { FaSearch } from 'react-icons/fa'

function generateMock(count = 27) {
  const out = []
  for (let i = 1; i <= count; i++) {
    out.push({
      id: i,
      date: new Date(2025, 8, (i % 28) + 1, 10, (i * 3) % 60).toLocaleString(),
      compte: `AC${1000 + i}`,
      montant: (Math.floor(Math.random() * 90) + 10) * 1000,
      ref: `TX-${String(i).padStart(4, '0')}`,
      statut: i % 5 === 0 ? 'Échoué' : 'Succès',
    })
  }
  return out
}

export default function Deposit() {
  const [compte, setCompte] = useState('')
  const [montant, setMontant] = useState('')
  const [items, setItems] = useState(generateMock())
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return items
    return items.filter(t =>
      t.compte.toLowerCase().includes(s) ||
      t.ref.toLowerCase().includes(s) ||
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
  const isFail = (s) => {
    if (!s) return false
    const plain = s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    // couvre "Échoué", "Echoué", "Echoue", etc.
    return plain.startsWith('echou')
  }

  const submit = (e) => {
    e.preventDefault()
    if (!compte || !montant || Number(montant) <= 0) return
    const id = items.length ? items[items.length - 1].id + 1 : 1
    const ajout = {
      id,
      date: new Date().toLocaleString(),
      compte: compte.trim(),
      montant: Number(montant),
      ref: `TX-${String(id).padStart(4, '0')}`,
      statut: 'Succès',
    }
    setItems([ajout, ...items])
    setCompte('')
    setMontant('')
    setPage(1)
  }

  const prev = () => setPage(p => Math.max(1, p - 1))
  const next = () => setPage(p => Math.min(pageCount, p + 1))
  const goto = (n) => setPage(Math.min(Math.max(1, n), pageCount))

  const format = (n) => n.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 })

  return (
    <div>
      <section className="form-card">
        <header className="form-card-header">Dépôt</header>
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
            Montant
            <input
              type="number"
              min="1"
              step="100"
              placeholder="Ex: 50000"
              value={montant}
              onChange={e => setMontant(e.target.value)}
              required
            />
          </label>
          <div className="actions-right">
            <button type="submit" className="btn-primary">Valider le dépôt</button>
          </div>
        </form>
      </section>

      <section className="table-wrap" style={{marginTop: 16}}>
        <header className="table-header">
          <span>Historique des transactions</span>
          <div className="table-toolbar">
            <div className="search">
              <FaSearch />
              <input
                type="text"
                placeholder="Rechercher... (compte, référence, statut)"
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
              <th>Montant</th>
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
                <td>{format(t.montant)}</td>
                <td>
                  <span className={`chip ${isAnnul(t.statut) || isFail(t.statut) ? 'danger' : (t.statut.toLowerCase().startsWith('succ') ? 'success' : '')}`}>
                    {t.statut}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <footer className="table-footer">
          <span>{page} sur {pageCount}</span>
          <div className="pager-size">
            <label htmlFor="deposit-page-size">Lignes par page :</label>
            <select
              id="deposit-page-size"
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
