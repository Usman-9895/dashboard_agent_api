import { useMemo, useState, useEffect } from 'react'
import { FaSearch } from 'react-icons/fa'

  const mock = [
  { id: 1, name: 'Niass Lamine', phone: '1257894365987', amount: -1000, currency: 'FCFA', datetime: '15/09/2025 15:45:38', type: 'Retrait', tx: '1234567548907', status: 'Complété' },
  { id: 2, name: 'Niass Momo',   phone: '1257894365987', amount:  1000, currency: 'FCFA', datetime: '15/09/2025 15:45:38', type: 'Dépôt',   tx: '123456854321',  status: 'Annulé' },
  { id: 3, name: 'Awa Diop',      phone: '774445566',     amount:  5000, currency: 'FCFA', datetime: '16/09/2025 11:20:10', type: 'Dépôt',   tx: '123456000111',  status: 'Complété' },
  { id: 4, name: 'Moussa Ndour',  phone: '705551212',     amount: -2500, currency: 'FCFA', datetime: '16/09/2025 09:01:44', type: 'Retrait', tx: '123456000222',  status: 'Annulé' },
  { id: 5, name: 'Niass Lamine', phone: '1257894365987', amount: -1000, currency: 'FCFA', datetime: '15/09/2025 15:45:38', type: 'Retrait', tx: '1234567548907', status: 'Complété' },
  { id: 6, name: 'Niass Momo',   phone: '1257894365987', amount:  1000, currency: 'FCFA', datetime: '15/09/2025 15:45:38', type: 'Dépôt',   tx: '123456854321',  status: 'Complété' },
  { id: 7, name: 'Awa Diop',      phone: '774445566',     amount:  5000, currency: 'FCFA', datetime: '16/09/2025 11:20:10', type: 'Dépôt',   tx: '123456000111',  status: 'Complété' },
  { id: 8, name: 'Moussa Ndour',  phone: '705551212',     amount: -2500, currency: 'FCFA', datetime: '16/09/2025 09:01:44', type: 'Retrait', tx: '123456000222',  status: 'Complété' },
  { id: 9, name: 'Niass Lamine', phone: '1257894365987', amount: -1000, currency: 'FCFA', datetime: '15/09/2025 15:45:38', type: 'Retrait', tx: '1234567548907', status: 'Complété' },
  { id: 10, name: 'Niass Momo',   phone: '1257894365987', amount:  1000, currency: 'FCFA', datetime: '15/09/2025 15:45:38', type: 'Dépôt',   tx: '123456854321',  status: 'Complété' },
  { id: 11, name: 'Awa Diop',      phone: '774445566',     amount:  5000, currency: 'FCFA', datetime: '16/09/2025 11:20:10', type: 'Dépôt',   tx: '123456000111',  status: 'Complété' },
  { id: 12, name: 'Moussa Ndour',  phone: '705551212',     amount: -2500, currency: 'FCFA', datetime: '16/09/2025 09:01:44', type: 'Retrait', tx: '123456000222',  status: 'Complété' },
  { id: 13, name: 'Niass Lamine', phone: '1257894365987', amount: -1000, currency: 'FCFA', datetime: '15/09/2025 15:45:38', type: 'Retrait', tx: '1234567548907', status: 'Complété' },
  { id: 14, name: 'Niass Momo',   phone: '1257894365987', amount:  1000, currency: 'FCFA', datetime: '15/09/2025 15:45:38', type: 'Dépôt',   tx: '123456854321',  status: 'Complété' },
  { id: 15, name: 'Awa Diop',      phone: '774445566',     amount:  5000, currency: 'FCFA', datetime: '16/09/2025 11:20:10', type: 'Dépôt',   tx: '123456000111',  status: 'Complété' },
  { id: 16, name: 'Moussa Ndour',  phone: '705551212',     amount: -2500, currency: 'FCFA', datetime: '16/09/2025 09:01:44', type: 'Retrait', tx: '123456000222',  status: 'Complété' },
]

export default function History() {
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return mock
    return mock.filter(t =>
      t.name.toLowerCase().includes(s) ||
      t.phone.toLowerCase().includes(s) ||
      t.type.toLowerCase().includes(s) ||
      t.tx.toLowerCase().includes(s)
    )
  }, [q])
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const data = useMemo(() => {
    const start = (page - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page, pageSize])
  const prev = () => setPage(p => Math.max(1, p - 1))
  const next = () => setPage(p => Math.min(pageCount, p + 1))
  const goto = (n) => setPage(Math.min(Math.max(1, n), pageCount))

  // Keep page within bounds when results change
  useEffect(() => {
    setPage(p => Math.min(p, pageCount))
  }, [pageCount])

  const initial = (name) => (name?.[0] || '?').toUpperCase()
  const money = (n, cur='FCFA') => `${n >= 0 ? '+ ' : '- '}${Math.abs(n).toLocaleString('fr-FR')} ${cur}`
  const isAnnul = (s) => {
    if (!s) return false
    const plain = s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    return plain.startsWith('annul')
  }

  return (
    <div>
      <section className="table-wrap">
        <header className="table-header">
          <span>Historiques</span>
          <div className="table-toolbar">
            <div className="search">
              <FaSearch />
              <input
                type="text"
                placeholder="Rechercher... (bénéficiaire, téléphone, type, n° transaction)"
                value={q}
                onChange={e => { setQ(e.target.value); setPage(1) }}
              />
            </div>
            {/* <button className="btn-primary">Rechercher</button> */}
          </div>
        </header>

        <div className="section-subtitle">Transactions Récentes</div>

        <table className="data-table history-table">
          <thead>
            <tr>
              <th>Bénéficiaire</th>
              <th>Montant</th>
              <th>Date et Heure</th>
              <th>Type</th>
              <th>N° transaction</th>
              <th>Action</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {data.map(t => (
              <tr key={t.id}>
                <td>
                  <div className="benef">
                    <div className="avatar-sm">{initial(t.name)}</div>
                    <div className="benef-info">
                      <div className="benef-name">{t.name}</div>
                      <div className="benef-phone">{t.phone}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={t.amount >= 0 ? 'amt positive' : 'amt negative'}>
                    {money(t.amount, t.currency)}
                  </span>
                </td>
                <td>{t.datetime}</td>
                <td>{t.type}</td>
                <td>{t.tx}</td>
                <td><button className="btn-primary">Annuler</button></td>
                <td>
                  <span className={`chip ${isAnnul(t.status) ? 'danger' : 'success'}`}>
                    {t.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <footer className="table-footer">
          <span>{page} sur {pageCount}</span>
          <div className="pager-size">
            <label htmlFor="history-page-size">Lignes par page :</label>
            <select
              id="history-page-size"
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
