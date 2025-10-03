import { useMemo, useState, useEffect, useRef } from 'react'
import { FaSearch } from 'react-icons/fa'
import { TransactionsAPI, UsersAPI } from '../apiClient'
import { toast } from 'react-hot-toast'

export default function Deposit() {
  const [compte, setCompte] = useState('')
  const [montant, setMontant] = useState('')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [compteErr, setCompteErr] = useState('')
  const [montantErr, setMontantErr] = useState('')
  const [q, setQ] = useState('')
  // Distributors quick-pick
  const [dists, setDists] = useState([])
  const [distsLoading, setDistsLoading] = useState(false)
  const [showPick, setShowPick] = useState(false)
  const compteWrapRef = useRef(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)
  const presetAmounts = [500, 1000, 5000, 10000]

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return items
    return items.filter(t =>
      (t.numero_compte || '').toLowerCase().includes(s) ||
      (t.reference || '').toLowerCase().includes(s) ||
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

  // Load latest transactions on mount
  const load = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await TransactionsAPI.list()
      setItems(data)
    } catch (e) {
      setError(e.message || 'Erreur lors du chargement des transactions')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  // Load distributors once when opening the picker
  const ensureDistributors = async () => {
    if (dists.length || distsLoading) return
    try {
      setDistsLoading(true)
      const all = await UsersAPI.list()
      const only = all.filter(u => String(u.role || '').toLowerCase() === 'distributeur' && String(u.statut || '').toLowerCase() === 'actif')
      setDists(only)
    } finally {
      setDistsLoading(false)
    }
  }

  // Close picker when clicking outside
  useEffect(() => {
    function onDocDown(e) {
      if (!compteWrapRef.current) return
      if (!compteWrapRef.current.contains(e.target)) setShowPick(false)
    }
    document.addEventListener('mousedown', onDocDown)
    return () => document.removeEventListener('mousedown', onDocDown)
  }, [])

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

  const submit = async (e) => {
    e.preventDefault()
    const num = (compte || '').trim().toUpperCase()
    const amount = Number(montant)
    const cErr = /^AD\d{5}$/i.test(num) ? '' : 'Compte distributeur invalide. Format attendu: ADxxxxx'
    const mErr = (!Number.isFinite(amount) || amount < 500) ? 'Le montant minimum est 500 F' : ''
    setCompteErr(cErr)
    setMontantErr(mErr)
    if (cErr || mErr) return
    try {
      setLoading(true)
      await TransactionsAPI.deposit(num, amount)
      toast.success('Dépôt effectué')
      setCompte('')
      setMontant('')
      setPage(1)
      await load()
    } catch (err) {
      toast.error(err.message || 'Erreur lors du dépôt')
    } finally {
      setLoading(false)
    }
  }

  const prev = () => setPage(p => Math.max(1, p - 1))
  const next = () => setPage(p => Math.min(pageCount, p + 1))
  const goto = (n) => setPage(Math.min(Math.max(1, n), pageCount))

  const format = (n) => Number(n).toLocaleString('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 })

  return (
    <div>
      <section className="form-card">
        <header className="form-card-header">Dépôt</header>
        <form className="inline-form" onSubmit={submit} noValidate>
          <label ref={compteWrapRef} style={{ position: 'relative' }}>
            Numéro de compte
            <input
              placeholder="Ex: AD12345"
              value={compte}
              onFocus={async () => { setShowPick(true); await ensureDistributors() }}
              onClick={async () => { setShowPick(true); await ensureDistributors() }}
              onChange={e => { setCompte(e.target.value); if (compteErr) setCompteErr(/^AD\d{5}$/i.test(e.target.value.trim()) ? '' : 'Compte distributeur invalide. Format attendu: ADxxxxx'); if (!showPick) setShowPick(true) }}
              onBlur={() => setCompteErr(/^AD\d{5}$/i.test((compte||'').trim()) ? '' : 'Compte distributeur invalide. Format attendu: ADxxxxx')}
            />
            {compteErr && <div className="field-error">{compteErr}</div>}
            {showPick && (
              <div
                role="listbox"
                aria-label="Sélectionner un distributeur"
                style={{
                  position: 'absolute',
                  zIndex: 40,
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: '#ffffff',
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  marginTop: 6,
                  boxShadow: '0 10px 24px rgba(0,0,0,0.08)',
                  maxHeight: 260,
                  overflow: 'auto'
                }}
              >
                <div style={{ padding: '6px 10px', color: '#6b7280', fontSize: 12 }}>
                  {distsLoading ? 'Chargement des distributeurs…' : 'Sélectionnez un distributeur'}
                </div>
                {dists
                  .filter(u => {
                    const s = (compte || '').trim().toLowerCase()
                    if (!s) return true
                    return (
                      (u.prenom || '').toLowerCase().includes(s) ||
                      (u.nom || '').toLowerCase().includes(s) ||
                      (u.numero_compte || '').toLowerCase().includes(s)
                    )
                  })
                  .slice(0, 50)
                  .map((u) => (
                    <button
                      key={u._id}
                      type="button"
                      onClick={() => { setCompte(u.numero_compte || ''); setCompteErr(''); setShowPick(false) }}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        width: '100%',
                        padding: '10px 12px',
                        background: 'transparent',
                        border: 'none',
                        textAlign: 'left',
                        cursor: 'pointer'
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{u.prenom} {u.nom}</span>
                      <span style={{ fontFamily: 'monospace', color: '#0f172a' }}>{u.numero_compte}</span>
                    </button>
                  ))}
              </div>
            )}
          </label>
          <label>
            Montant
            <input
              type="number"
              min="500"
              step="1"
              placeholder="Ex: 50000"
              value={montant}
              onChange={e => { setMontant(e.target.value); if (montantErr) { const v = Number(e.target.value); setMontantErr(!Number.isFinite(v)|| v<500 ? 'Le montant minimum est 500 F' : '') } }}
              onBlur={() => { const v = Number(montant); setMontantErr(!Number.isFinite(v)|| v<500 ? 'Le montant minimum est 500 F' : '') }}
            />
            {montantErr && <div className="field-error">{montantErr}</div>}
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              {presetAmounts.map(v => (
                <button
                  type="button"
                  key={v}
                  className="btn-secondary"
                  onClick={() => { setMontant(String(v)); setMontantErr('') }}
                  aria-label={`Sélectionner ${v} FCFA`}
                >
                  {v.toLocaleString('fr-FR')} F
                </button>
              ))}
            </div>
          </label>
          <div className="actions-right">
            <button type="submit" className="btn-primary" disabled={loading}>Valider le dépôt</button>
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
              <th>Montant</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((t, idx) => (
              <tr key={t._id || idx}>
                <td>{new Date(t.createdAt).toLocaleString()}</td>
                <td>{t.reference}</td>
                <td>{t.numero_compte}</td>
                <td>{format(t.montant)}</td>
                <td>
                  <span className={`chip ${isAnnul(t.statut) || isFail(t.statut) ? 'danger' : (String(t.statut).toLowerCase().startsWith('succ') ? 'success' : '')}`}>
                    {t.statut}
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
