import { useMemo, useState, useEffect } from 'react'
import { FaSearch } from 'react-icons/fa'
import { TransactionsAPI } from '../apiClient'
import { toast } from 'react-hot-toast'

export default function Cancel() {
  const [compte, setCompte] = useState('')
  const [transfert, setTransfert] = useState('')
  const [message, setMessage] = useState('')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [compteErr, setCompteErr] = useState('')
  const [refErr, setRefErr] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return items
    return items.filter(t =>
      (t.numero_compte || '').toLowerCase().includes(s) ||
      (t.reference || '').toLowerCase().includes(s) ||
      (t.cancelReason || '').toLowerCase().includes(s) ||
      (t.statut || '').toLowerCase().includes(s)
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

  // Load annulled transactions
  const load = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await TransactionsAPI.list({ statut: 'annule' })
      setItems(data)
    } catch (e) {
      setError(e.message || 'Erreur lors du chargement des annulations')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const isAnnul = (s) => {
    if (!s) return false
    const plain = s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    return plain.startsWith('annul')
  }

  const submit = async (e) => {
    e.preventDefault()
    const ref = transfert.trim()
    // Validation personnalisée
    const refValid = /^TX-[0-9A-Za-z-]+$/.test(ref)
    const c = (compte || '').trim().toUpperCase()
    const compteValid = !c || /^AD\d{5}$/i.test(c) || /^AC\d{5}$/i.test(c)
    const refMsg = refValid ? '' : 'Référence invalide. Format attendu: TX-...'
    const compteMsg = compteValid ? '' : 'Numéro de compte invalide (ADxxxxx ou ACxxxxx)'
    setRefErr(refMsg)
    setCompteErr(compteMsg)
    if (refMsg || compteMsg) return
    try {
      setLoading(true)
      setMessage('')
      await TransactionsAPI.cancel(ref, 'Demande client', c || undefined)
      toast.success('Transfert annulé')
      setCompte('')
      setTransfert('')
      setPage(1)
      await load()
    } catch (err) {
      toast.error(err.message || 'Erreur lors de l\'annulation')
    } finally {
      setLoading(false)
    }
  }

  const prev = () => setPage(p => Math.max(1, p - 1))
  const next = () => setPage(p => Math.min(pageCount, p + 1))
  const goto = (n) => setPage(Math.min(Math.max(1, n), pageCount))

  return (
    <div>
      <section className="form-card">
        <header className="form-card-header">Annuler un transfert</header>
        <form className="inline-form" onSubmit={submit} noValidate>
          <label>
            Numéro de compte
            <input
              placeholder="Ex: AC1234"
              value={compte}
              onChange={e => { setCompte(e.target.value); if (compteErr) { const v = e.target.value.trim().toUpperCase(); setCompteErr(!v || /^AD\d{5}$/i.test(v) || /^AC\d{5}$/i.test(v) ? '' : 'Numéro de compte invalide (ADxxxxx ou ACxxxxx)') } }}
              onBlur={() => { const v = (compte||'').trim().toUpperCase(); setCompteErr(!v || /^AD\d{5}$/i.test(v) || /^AC\d{5}$/i.test(v) ? '' : 'Numéro de compte invalide (ADxxxxx ou ACxxxxx)') }}
            />
            {compteErr && <div className="field-error">{compteErr}</div>}
          </label>
          <label>
            Numéro de transfert
            <input
              placeholder="Ex: TX-0001"
              value={transfert}
              onChange={e => { setTransfert(e.target.value); if (refErr) { const ok = /^TX-[0-9A-Za-z-]+$/.test(e.target.value.trim()); setRefErr(ok ? '' : 'Référence invalide. Format attendu: TX-...') } }}
              onBlur={() => setRefErr(/^TX-[0-9A-Za-z-]+$/.test((transfert||'').trim()) ? '' : 'Référence invalide. Format attendu: TX-...')}
            />
            {refErr && <div className="field-error">{refErr}</div>}
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
        {error && (
          <div style={{ padding: '12px 16px', color: '#7f1d1d', background: '#fecaca' }}>{error}</div>
        )}
        {loading ? (
          <div style={{ padding: '14px 16px' }}>Chargement…</div>
        ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Référence</th>
              <th>Numéro de compte</th>
              <th>Motif</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
              {pageItems.map((t, idx) => (
                <tr key={t._id || idx}>
                  <td>{new Date(t.cancelledAt || t.updatedAt || t.createdAt).toLocaleString()}</td>
                  <td>{t.reference}</td>
                  <td>{t.numero_compte}</td>
                  <td>{t.cancelReason || 'Demande client'}</td>
                  <td>
                    {isAnnul(t.statut)
                      ? <span className="chip danger">Annulé</span>
                      : <span className="chip">{t.statut}</span>}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        )}
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
