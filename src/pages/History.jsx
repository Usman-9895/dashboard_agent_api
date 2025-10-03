import { useMemo, useState, useEffect } from 'react'
import { FaSearch } from 'react-icons/fa'
import { TransactionsAPI } from '../apiClient'
import { toast } from 'react-hot-toast'
import ConfirmModal from '../components/ConfirmModal'

export default function History() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)
  const CANCEL_WINDOW_MINUTES = 1440 // TODO: optionally fetch from server
  const canCancel = (tx) => {
    if (!tx || String(tx.statut).toLowerCase() === 'annule') return false
    const ageMin = (Date.now() - new Date(tx.createdAt).getTime()) / 60000
    return ageMin <= CANCEL_WINDOW_MINUTES
  }
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return items
    return items.filter(t =>
      (t.benefName || '').toLowerCase().includes(s) ||
      (t.benefPhone || '').toLowerCase().includes(s) ||
      (t.type || '').toLowerCase().includes(s) ||
      (t.reference || '').toLowerCase().includes(s) ||
      (t.numero_compte || '').toLowerCase().includes(s)
    )
  }, [q, items])
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

  const load = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await TransactionsAPI.list()
      // Map to UI-friendly structure (beneficiary unknown -> use numero_compte)
      setItems(data)
    } catch (e) {
      setError(e.message || 'Erreur lors du chargement de l\'historique')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const initial = (name) => (name?.[0] || '?').toUpperCase()
  const money = (n, cur='FCFA') => `${Number(n) >= 0 ? '+ ' : '- '}${Math.abs(Number(n)).toLocaleString('fr-FR')} ${cur}`
  const isAnnul = (s) => {
    if (!s) return false
    const plain = s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    return plain.startsWith('annul')
  }

  // Cancel via action button
  const [confirm, setConfirm] = useState({ open: false, msg: '', onConfirm: null })
  const closeConfirm = () => setConfirm({ open: false, msg: '', onConfirm: null })
  const askCancel = (tx) => {
    setConfirm({
      open: true,
      msg: `Confirmer l'annulation de la transaction ${tx.reference} ?`,
      onConfirm: async () => {
        closeConfirm()
        try {
          await TransactionsAPI.cancel(tx.reference, 'Demande client')
          toast.success('Transaction annulée')
          await load()
        } catch (err) {
          toast.error(err.message || 'Erreur lors de l\'annulation')
        }
      }
    })
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

        {error && (
          <div style={{ padding: '12px 16px', color: '#7f1d1d', background: '#fecaca' }}>{error}</div>
        )}
        {loading ? (
          <div style={{ padding: '14px 16px' }}>Chargement…</div>
        ) : (

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
            {data.map((t, idx) => (
              <tr key={t._id || idx}>
                <td>
                  <div className="benef">
                    <div className="avatar-sm">{initial(t.benefName || t.numero_compte)}</div>
                    <div className="benef-info">
                      <div className="benef-name">{t.benefName || t.numero_compte}</div>
                      <div className="benef-phone">{t.benefPhone || ''}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={Number(t.montant) >= 0 ? 'amt positive' : 'amt negative'}>
                    {money(t.montant, 'FCFA')}
                  </span>
                </td>
                <td>{new Date(t.createdAt).toLocaleString()}</td>
                <td>{t.type === 'depot' ? 'Dépôt' : t.type}</td>
                <td>{t.reference}</td>
                <td>
                  <button className="btn-primary" onClick={() => askCancel(t)} disabled={!canCancel(t)}>Annuler</button>
                </td>
                <td>
                  <span className={`chip ${isAnnul(t.statut) ? 'danger' : 'success'}`}>
                    {isAnnul(t.statut) ? 'Annulé' : 'Complété'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
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
        <ConfirmModal open={confirm.open} title="Confirmation" message={confirm.msg} onConfirm={confirm.onConfirm} onClose={closeConfirm} confirmText="Confirmer" cancelText="Annuler" />
      </section>
    </div>
  )
}
