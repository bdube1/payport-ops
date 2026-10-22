import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, RefreshCw, Loader, CheckCircle } from 'lucide-react'
import { getAttentionQueue, retryFulfilment, formatDate, STATUS_CONFIG } from '../lib/api'
import toast from 'react-hot-toast'

const SEVERITY = {
  FULFILMENT_FAILED: { label: 'Critical', color: 'var(--red)', bg: 'var(--badge-red)', priority: 1 },
  PAYMENT_TIMEOUT: { label: 'High', color: 'var(--amber)', bg: 'var(--badge-amber)', priority: 2 },
  FULFILMENT_RETRY: { label: 'High', color: 'var(--amber)', bg: 'var(--badge-amber)', priority: 2 },
  REFUND_PENDING: { label: 'Medium', color: 'var(--blue)', bg: 'var(--badge-blue)', priority: 3 },
  MANUAL_FULFILMENT: { label: 'Medium', color: 'var(--blue)', bg: 'var(--badge-blue)', priority: 3 },
}

export default function AttentionQueuePage() {
  const [queue, setQueue] = useState([])
  const [loading, setLoading] = useState(true)
  const [retrying, setRetrying] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await getAttentionQueue()
      const data = res.data?.data || res.data || []
      setQueue(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error(err)
      setQueue([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleRetry = async (ref) => {
    setRetrying(ref)
    try {
      await retryFulfilment(ref)
      toast.success(`Retry initiated for ${ref}`)
      await load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Retry failed')
    } finally {
      setRetrying(null)
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <Loader size={32} color="var(--green)" style={{ animation: 'spin 1.2s linear infinite' }} />
    </div>
  )

  const sorted = [...queue].sort((a, b) => {
    const pa = (SEVERITY[a.status] || { priority: 99 }).priority
    const pb = (SEVERITY[b.status] || { priority: 99 }).priority
    return pa - pb
  })

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertTriangle size={22} color="var(--amber)" />
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24 }}>Attention Queue</h1>
            {queue.length > 0 && (
              <span style={{ background: 'var(--red)', color: 'white', borderRadius: 8, padding: '2px 10px', fontSize: 13, fontWeight: 700 }}>
                {queue.length}
              </span>
            )}
          </div>
        </div>
        <button onClick={load} className="btn btn-ghost">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 0' }}>
          <CheckCircle size={48} color="var(--green)" style={{ marginBottom: 14 }} />
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, marginBottom: 6 }}>Queue is clear!</h2>
          <p style={{ color: 'var(--text-2)', fontSize: 14 }}>No transactions require attention right now.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {sorted.map(txn => {
            const cfg = STATUS_CONFIG[txn.status] || { label: txn.status, badge: 'badge-gray' }
            const sev = SEVERITY[txn.status] || { label: 'Low', color: 'var(--text-2)', bg: 'var(--bg-2)', priority: 9 }
            return (
              <div key={txn.reference} className="card" style={{
                border: `1px solid ${sev.bg}`,
                background: 'var(--bg-2)',
                padding: '18px 20px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14,
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                  <div style={{
                    background: sev.bg, color: sev.color,
                    padding: '4px 10px', borderRadius: 6,
                    fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                    whiteSpace: 'nowrap',
                  }}>{sev.label}</div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span className="mono" style={{ color: 'var(--blue)', fontSize: 13 }}>{txn.reference}</span>
                      <span className={`badge ${cfg.badge}`} style={{ fontSize: 10 }}>{cfg.label}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{txn.productName || txn.productTypeCode}</span>
                      <span style={{ fontSize: 12, fontWeight: 700 }}>{txn.amountFormatted || `$${(txn.amountCents/100).toFixed(2)}`}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{formatDate(txn.createdAt)}</span>
                    </div>
                    {txn.failureReason && (
                      <p style={{ fontSize: 11, color: 'var(--red)', marginTop: 4, maxWidth: 400 }}>{txn.failureReason?.substring(0, 120)}</p>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 2 }}>
                  {['FULFILMENT_FAILED', 'MANUAL_FULFILMENT'].includes(txn.status) && (
                    <button onClick={() => handleRetry(txn.reference)} disabled={retrying === txn.reference} className="btn btn-amber btn-sm">
                      {retrying === txn.reference ? <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={12} />}
                      Retry
                    </button>
                  )}
                  <Link to={`/transactions/${txn.reference}`} className="btn btn-ghost btn-sm">View Detail</Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
