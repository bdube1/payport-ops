import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ChevronLeft, RefreshCw, DollarSign, Clock, CheckCircle, XCircle, Loader, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import { getTransaction, getTransactionTimeline, retryFulfilment, completeRefund, formatDate, STATUS_CONFIG, opsExtraApi } from '../lib/api'
import toast from 'react-hot-toast'

function fmt(amountCents, currency = 'USD') {
    const val = (amountCents / 100).toFixed(2);
    return currency === 'USD' ? `$${val}` : `ZWG ${val}`;
}

export default function TransactionDetailPage() {
    const { ref } = useParams()
    const [txn, setTxn] = useState(null)
    const [timeline, setTimeline] = useState([])
    const [loading, setLoading] = useState(true)
    const [retrying, setRetrying] = useState(false)
    const [refunding, setRefunding] = useState(false)
    const [refundReason, setRefundReason] = useState('')
    const [refundReference, setRefundReference] = useState('')
    const [refundMethod, setRefundMethod] = useState('ECOCASH')
    const [showRefundForm, setShowRefundForm] = useState(false)
    const [showRawPayload, setShowRawPayload] = useState(false)

    const load = async () => {
        try {
            const [txnRes, timelineRes] = await Promise.all([
                getTransaction(ref),
                getTransactionTimeline(ref),
            ])
            setTxn(txnRes.data?.data || txnRes.data)
            const tl = timelineRes.data?.data || timelineRes.data || []
            setTimeline(Array.isArray(tl) ? tl : [])
        } catch (err) {
            toast.error('Failed to load transaction')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load() }, [ref])

    const handleRetry = async () => {
        setRetrying(true)
        try {
            await retryFulfilment(ref)
            toast.success('Fulfilment retry initiated')
            await load()
        } catch (err) {
            toast.error(err.response?.data?.message || 'Retry failed')
        } finally {
            setRetrying(false)
        }
    }

    const handleStartRefund = async () => {
        const reason = window.prompt('Reason for the refund')
        if (!reason || !reason.trim()) return
        setRefunding(true)
        try {
            await opsExtraApi.startRefund(ref, reason.trim())
            toast.success('Refund started')
            await load()
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not start the refund')
        } finally {
            setRefunding(false)
        }
    }

    const handleRefund = async () => {
        if (!refundReference.trim()) { toast.error('Please enter the refund reference'); return }
        setRefunding(true)
        try {
            await completeRefund(ref, { refundReference: refundReference.trim(), refundMethod, reason: refundReason })
            toast.success('Transaction marked as refunded')
            setShowRefundForm(false)
            setRefundReason('')
            setRefundReference('')
            await load()
        } catch (err) {
            toast.error(err.response?.data?.message || 'Refund failed')
        } finally {
            setRefunding(false)
        }
    }

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
            <Loader size={32} color="var(--green)" style={{ animation: 'spin 1.2s linear infinite' }} />
        </div>
    )

    if (!txn) return (
        <div style={{ padding: 28 }}>
            <p style={{ color: 'var(--text-2)' }}>Transaction not found: {ref}</p>
        </div>
    )

    const cfg = STATUS_CONFIG[txn.status] || { label: txn.status, badge: 'badge-gray' }
    // Was including PAYMENT_FAILED/PAYMENT_TIMEOUT -- nothing was ever
    // actually charged in either state, so refunding it makes no sense.
    // The backend's own state machine already rejects this transition
    // (neither status has a path to REFUND_PENDING at all), so this was
    // purely a frontend bug offering an action that would always fail.
    const canRefund = ['FULFILMENT_FAILED', 'MANUAL_FULFILMENT', 'REFUND_PENDING'].includes(txn.status)
    const canStartRefund = txn.status === 'COMPLETED'

    // Retry only makes sense within a reasonable window of the original
    // attempt -- a fulfilment failure from weeks ago isn't something a
    // fresh retry meaningfully addresses, and it's exactly this kind of
    // stale item that used to bury genuinely recent ones in the
    // Attention Queue. Refund has no such window -- it stays available
    // via canRefund above regardless of how much time has passed.
    const withinRetryWindow = txn.initiatedAt && (Date.now() - new Date(txn.initiatedAt).getTime()) < 24 * 60 * 60 * 1000
    const canRetry = ['FULFILMENT_FAILED', 'MANUAL_FULFILMENT'].includes(txn.status) && withinRetryWindow
    const retryWindowExpired = ['FULFILMENT_FAILED', 'MANUAL_FULFILMENT'].includes(txn.status) && !withinRetryWindow

    const statusIcon = txn.status === 'COMPLETED' ? <CheckCircle size={18} color="var(--green)" /> :
        ['PAYMENT_FAILED', 'PAYMENT_TIMEOUT', 'FULFILMENT_FAILED'].includes(txn.status) ? <XCircle size={18} color="var(--red)" /> :
            ['PAYMENT_PENDING', 'FULFILMENT_PENDING', 'FULFILMENT_RETRY'].includes(txn.status) ? <Loader size={18} color="var(--amber)" style={{ animation: 'spin 1.2s linear infinite' }} /> :
                <Clock size={18} color="var(--text-2)" />

    return (
        <div style={{ padding: 28 }}>
            {/* Back */}
            <Link to="/transactions" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-2)', fontSize: 13, marginBottom: 20, transition: 'color 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-2)'}
            >
                <ChevronLeft size={16} /> Back to Transactions
            </Link>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 14 }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        {statusIcon}
                        <h1 style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 20, letterSpacing: '0.02em' }}>{ref}</h1>
                        <span className={`badge ${cfg.badge}`} style={{ fontSize: 12 }}>{cfg.label}</span>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text-2)' }}>
                        Created {formatDate(txn.initiatedAt)}
                        {txn.completedAt && <> · Completed {formatDate(txn.completedAt)}</>}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button onClick={load} className="btn btn-ghost btn-sm">
                        <RefreshCw size={13} /> Refresh
                    </button>
                    {canRetry && (
                        <button onClick={handleRetry} disabled={retrying} className="btn btn-amber btn-sm">
                            {retrying ? <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={13} />}
                            Retry Fulfilment
                        </button>
                    )}
                    {retryWindowExpired && (
                        <span style={{ fontSize: 11.5, color: 'var(--text-2)' }}>
                            Retry no longer available — past the 24-hour window
                        </span>
                    )}
                    {canStartRefund && (
                        <button onClick={handleStartRefund} disabled={refunding} className="btn btn-danger btn-sm">
                            <DollarSign size={13} /> Start refund
                        </button>
                    )}
                    {canRefund && !showRefundForm && (
                        <button onClick={() => setShowRefundForm(true)} className="btn btn-danger btn-sm">
                            <DollarSign size={13} /> Mark as Refunded
                        </button>
                    )}
                </div>
            </div>

            {/* Refund form */}
            {showRefundForm && (
                <div className="card" style={{ marginBottom: 20, border: '1px solid var(--red)', animation: 'fadeIn 0.3s ease' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                        <AlertTriangle size={16} color="var(--red)" />
                        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--red)' }}>Mark as Refunded</h3>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 14, lineHeight: 1.5 }}>
                        This records a refund you've already paid the customer manually — bank transfer, EcoCash, OneMoney,
                        Innbucks, or Omari. It does not send any money itself.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                        <div>
                            <label style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Refunded via</label>
                            <select value={refundMethod} onChange={e => setRefundMethod(e.target.value)} className="input" style={{ width: '100%' }}>
                                <option value="ECOCASH">EcoCash</option>
                                <option value="ONEMONEY">OneMoney</option>
                                <option value="OMARI">Omari</option>
                                <option value="INNBUCKS">Innbucks</option>
                                <option value="BANK">Bank transfer</option>
                                <option value="OTHER">Other</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Refund reference (required)</label>
                            <input
                                value={refundReference}
                                onChange={e => setRefundReference(e.target.value)}
                                placeholder="e.g. transaction/receipt reference"
                                className="input"
                                style={{ width: '100%' }}
                            />
                        </div>
                    </div>
                    <div style={{ marginBottom: 12 }}>
                        <label style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Reason (optional)</label>
                        <textarea
                            value={refundReason}
                            onChange={e => setRefundReason(e.target.value)}
                            placeholder="e.g. Service could not be delivered after repeated retries"
                            rows={3}
                            className="input"
                            style={{ width: '100%', resize: 'vertical' }}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={handleRefund} disabled={refunding} className="btn btn-danger">
                            {refunding ? <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <DollarSign size={13} />}
                            Confirm — Mark as Refunded
                        </button>
                        <button onClick={() => { setShowRefundForm(false); setRefundReason(''); setRefundReference('') }} className="btn btn-ghost">Cancel</button>
                    </div>
                </div>
            )}

            {/* Detail grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                {/* Transaction Details */}
                <div className="card">
                    <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, marginBottom: 16, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Transaction</h3>
                    <DetailRows rows={[
                        { label: 'Service', value: txn.productName || txn.productTypeCode },
                        { label: 'Recipient', value: txn.recipientIdentifier, mono: true },
                        { label: 'Amount', value: fmt(txn.amountCents || 0, txn.currency), bold: true },
                        { label: 'Currency', value: txn.currency || 'USD' },
                        { label: 'Channel', value: txn.channel },
                    ]} />
                </div>

                {/* Payment Details */}
                <div className="card">
                    <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, marginBottom: 16, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Payment</h3>
                    <DetailRows rows={[
                        { label: 'Method', value: txn.paymentMethodCode },
                        { label: 'Customer Phone', value: txn.customerPhone, mono: true },
                        { label: 'Provider Reference', value: txn.providerReference || '—', mono: true },
                        { label: 'EcoCash Correlator', value: txn.paymentCorrelator || '—', mono: true },
                        { label: 'Retry Count', value: txn.retryCount ?? '0' },
                        { label: 'Failure Reason', value: txn.failureReason || '—', warn: !!txn.failureReason },
                        ...(txn.status === 'REFUNDED' ? [
                            { label: 'Refunded Via', value: txn.refundMethod || '—' },
                            { label: 'Refund Reference', value: txn.refundReference || '—', mono: true },
                            { label: 'Refunded At', value: txn.refundedAt ? formatDate(txn.refundedAt) : '—' },
                        ] : []),
                    ]} />
                </div>
            </div>

            {/* Timeline */}
            <div className="card" style={{ marginBottom: 16 }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, marginBottom: 20, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Audit Timeline ({timeline.length} events)
                </h3>
                {timeline.length === 0 ? (
                    <p style={{ color: 'var(--text-2)', fontSize: 13 }}>No timeline events found.</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {timeline.map((event, i) => (
                            <div key={i} style={{ display: 'flex', gap: 16 }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 20 }}>
                                    <div style={{
                                        width: 10, height: 10, borderRadius: '50%', flexShrink: 0, marginTop: 4,
                                        background: i === 0 ? 'var(--green)' : 'var(--border)',
                                        border: i === 0 ? 'none' : '1px solid var(--border)',
                                    }} />
                                    {i < timeline.length - 1 && <div style={{ width: 1, flex: 1, background: 'var(--border)', minHeight: 20 }} />}
                                </div>
                                <div style={{ paddingBottom: i < timeline.length - 1 ? 20 : 0, flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                        {event.fromStatus && (
                                            <><span className="badge badge-gray" style={{ fontSize: 10 }}>{event.fromStatus}</span>
                                                <span style={{ color: 'var(--text-2)', fontSize: 12 }}>→</span></>
                                        )}
                                        <span className={`badge ${(STATUS_CONFIG[event.toStatus] || {}).badge || 'badge-gray'}`} style={{ fontSize: 10 }}>{event.toStatus}</span>
                                        <span style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>{formatDate(event.changedAt)}</span>
                                        <span style={{ fontSize: 11, color: 'var(--blue)', background: 'var(--badge-blue)', padding: '2px 6px', borderRadius: 4 }}>{event.actor}</span>
                                    </div>
                                    {event.notes && <p style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 4 }}>{event.notes}</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

function DetailRows({ rows }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {rows.map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-2)', flexShrink: 0 }}>{row.label}</span>
                    <span style={{
                        fontSize: 12,
                        fontFamily: row.mono ? 'var(--font-mono)' : 'inherit',
                        fontWeight: row.bold ? 700 : 500,
                        color: row.warn ? 'var(--red)' : 'var(--text)',
                        textAlign: 'right',
                        wordBreak: 'break-all',
                        maxWidth: row.truncate ? 200 : 'none',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: row.truncate ? 'nowrap' : 'normal',
                        title: row.value,
                    }} title={row.value}>{row.value}</span>
                </div>
            ))}
        </div>
    )
}