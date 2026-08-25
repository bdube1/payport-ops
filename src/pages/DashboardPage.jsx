import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { TrendingUp, CheckCircle, XCircle, Clock, RefreshCw, AlertTriangle, ArrowRight, Activity, DollarSign, CircleDot } from 'lucide-react'
import { getDashboardKpis, getAttentionQueue, getProviderHealth, formatDate, STATUS_CONFIG } from '../lib/api'

const PROVIDER_META = {
    ECONET:   { name: 'Econet Wireless',  type: 'Fulfilment' },
    NETONE:   { name: 'NetOne',           type: 'Fulfilment' },
    TELECEL:  { name: 'Telecel',          type: 'Fulfilment' },
    ECOCASH:  { name: 'EcoCash',          type: 'Payment'    },
    ONEMONEY: { name: 'OneMoney',         type: 'Payment'    },
    TELECASH: { name: 'Telecash',         type: 'Payment'    },
}

// Currency symbols and colors
const CURRENCY_CONFIG = {
    USD: { symbol: '$', color: 'var(--green)', bg: 'var(--badge-green)', label: 'USD' },
    ZWG: { symbol: 'ZiG', color: 'var(--amber)', bg: 'var(--badge-amber)', label: 'ZiG' },
    ZWL: { symbol: 'ZiG', color: 'var(--amber)', bg: 'var(--badge-amber)', label: 'ZiG' },
}

// Helper to format currency amount
const formatCurrency = (amountCents, currency = 'USD') => {
    if (amountCents == null) return '—'
    const amount = (amountCents / 100).toFixed(2)
    const config = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.USD
    return `${config.symbol} ${amount}`
}

// Helper to format multi-currency revenue
const formatRevenue = (revenueByCurrency) => {
    if (!revenueByCurrency) return '—'

    const parts = []
    if (revenueByCurrency.USD) {
        parts.push(`$${(revenueByCurrency.USD / 100).toFixed(2)}`)
    }
    if (revenueByCurrency.ZWG || revenueByCurrency.ZWL) {
        const zigAmount = revenueByCurrency.ZWG || revenueByCurrency.ZWL || 0
        parts.push(`ZiG ${(zigAmount / 100).toFixed(2)}`)
    }
    return parts.join(' · ') || '—'
}

export default function DashboardPage() {
    const [kpis, setKpis] = useState(null)
    const [queue, setQueue] = useState([])
    const [providers, setProviders] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [lastRefresh, setLastRefresh] = useState(new Date())
    const [refreshing, setRefreshing] = useState(false)

    const load = useCallback(async (silent = false) => {
        if (!silent) setLoading(true)
        else setRefreshing(true)
        setError('')
        try {
            const [kpisRes, queueRes, healthRes] = await Promise.all([
                getDashboardKpis(),
                getAttentionQueue(),
                getProviderHealth(),
            ])

            const kpiData = kpisRes.data?.data || kpisRes.data || {}
            setKpis(kpiData)

            const q = queueRes.data?.data || queueRes.data || []
            setQueue(Array.isArray(q) ? q : [])

            // Provider health returns an array of { providerCode, providerType, status, detail, lastCheckedAt }
            const health = healthRes.data?.data || healthRes.data || []
            setProviders(Array.isArray(health) ? health : [])

            setLastRefresh(new Date())
        } catch (err) {
            console.error('Dashboard load error:', err)
            setError('Could not load dashboard data. Please try again, or contact support if this continues.')
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [])

    useEffect(() => {
        load()
        const interval = setInterval(() => load(true), 30000)
        return () => clearInterval(interval)
    }, [load])

    // Extract revenue by currency from KPIs
    const revenueByCurrency = kpis?.revenueByCurrency || {}
    const hasMultipleCurrencies = Object.keys(revenueByCurrency).length > 1

    const kpiCards = [
        { label: 'Total Today',     value: kpis?.totalTransactionsToday ?? '—', color: 'var(--blue)',  icon: Activity },
        { label: 'Completed',       value: kpis?.completedToday ?? '—',         color: 'var(--green)', icon: CheckCircle },
        { label: 'Pending Payment', value: kpis?.pendingPayment ?? '—',         color: 'var(--amber)', icon: Clock },
        { label: 'Need Attention',  value: kpis?.needAttention ?? '—',          color: 'var(--red)',   icon: AlertTriangle },
        { label: 'Failed',          value: kpis?.failedToday ?? '—',            color: 'var(--red)',   icon: XCircle },
    ]

    // Add revenue card with multi-currency support
    const revenueCard = {
        label: 'Revenue Today',
        value: formatRevenue(revenueByCurrency),
        color: 'var(--green)',
        icon: DollarSign,
    }

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 16 }}>
            <div className="spinner" style={{ width: 36, height: 36, border: '3px solid var(--badge-blue)', borderTop: '3px solid var(--blue)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <p style={{ color: 'var(--text-2)', fontSize: 14 }}>Loading dashboard...</p>
        </div>
    )

    return (
        <div style={{ padding: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
                <div>
                    <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24, marginBottom: 4 }}>Operations Dashboard</h1>
                    <p style={{ fontSize: 13, color: 'var(--text-2)' }}>
                        Last updated: {lastRefresh.toLocaleTimeString()} · Auto-refresh every 30s
                    </p>
                </div>
                <button onClick={() => load(true)} disabled={refreshing} className="btn btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <RefreshCw size={14} style={refreshing ? { animation: 'spin 1s linear infinite' } : {}} />
                    {refreshing ? 'Refreshing...' : 'Refresh'}
                </button>
            </div>

            {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(248,81,73,0.1)', border: '1px solid rgba(248,81,73,0.3)', borderRadius: 10, padding: '14px 18px', marginBottom: 24, color: 'var(--red)', fontSize: 13 }}>
                    <AlertTriangle size={16} style={{ flexShrink: 0 }} /> {error}
                </div>
            )}

            {/* Currency Summary Banner - Shows when multiple currencies have revenue */}
            {hasMultipleCurrencies && (
                <div className="card" style={{ marginBottom: 24, padding: '16px 20px', background: 'rgba(6,163,218,0.05)', border: '1px solid rgba(6,163,218,0.15)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <CircleDot size={18} color="var(--blue)" />
                            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>Today's Revenue:</span>
                        </div>
                        {Object.entries(revenueByCurrency).map(([currency, amount]) => {
                            const config = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.USD
                            return (
                                <span key={currency} style={{
                                    background: 'var(--bg-card)',
                                    padding: '6px 16px',
                                    borderRadius: 100,
                                    fontSize: 14,
                                    fontWeight: 700,
                                    color: config.color,
                                    border: `1px solid ${config.bg}`,
                                    boxShadow: 'var(--shadow)'
                                }}>
                                    {config.symbol} {(amount / 100).toFixed(2)} {config.label}
                                </span>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 28 }}>
                {kpiCards.map(card => (
                    <div key={card.label} className="card" style={{ padding: '18px 20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{card.label}</p>
                            <card.icon size={16} color={card.color} />
                        </div>
                        <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28, color: card.color }}>{card.value}</p>
                    </div>
                ))}

                {/* Revenue Card - Special handling for multi-currency */}
                <div className="card" style={{ padding: '18px 20px', gridColumn: hasMultipleCurrencies ? 'span 2' : 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{revenueCard.label}</p>
                        <revenueCard.icon size={16} color={revenueCard.color} />
                    </div>
                    {hasMultipleCurrencies ? (
                        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                            {Object.entries(revenueByCurrency).map(([currency, amount]) => {
                                const config = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.USD
                                return (
                                    <div key={currency} style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 2 }}>{config.label}</span>
                                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24, color: config.color }}>
                                            {config.symbol} {(amount / 100).toFixed(2)}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28, color: revenueCard.color }}>{revenueCard.value}</p>
                    )}
                </div>
            </div>

            {/* Attention Queue */}
            <div className="card" style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <AlertTriangle size={18} color="var(--amber)" />
                        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>Attention Queue</h2>
                        {queue.length > 0 && (
                            <span style={{ background: 'var(--red)', color: 'white', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{queue.length}</span>
                        )}
                    </div>
                    <Link to="/attention" className="btn btn-ghost btn-sm">
                        View all <ArrowRight size={13} />
                    </Link>
                </div>

                {queue.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-2)' }}>
                        <CheckCircle size={32} color="var(--green)" style={{ marginBottom: 10 }} />
                        <p style={{ fontSize: 14 }}>All clear — no transactions need attention</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="table">
                            <thead>
                            <tr>
                                <th>Reference</th>
                                <th>Service</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Initiated</th>
                                <th>Action</th>
                            </tr>
                            </thead>
                            <tbody>
                            {queue.slice(0, 10).map(txn => {
                                const cfg = STATUS_CONFIG[txn.status] || STATUS_CONFIG['INITIATED']
                                const currency = txn.currency || 'USD'
                                const currencyColor = currency === 'USD' ? 'var(--green)' : 'var(--amber)'
                                return (
                                    <tr key={txn.reference}>
                                        <td><span className="mono" style={{ color: 'var(--blue)' }}>{txn.reference}</span></td>
                                        <td style={{ color: 'var(--text-2)' }}>{txn.productName || txn.productTypeCode || '—'}</td>
                                        <td style={{ fontWeight: 600, color: currencyColor }}>
                                            {formatCurrency(txn.amountCents, currency)}
                                        </td>
                                        <td><span className={`badge ${cfg.badge}`}>{cfg.label}</span></td>
                                        <td style={{ color: 'var(--text-2)' }}>{formatDate(txn.createdAt)}</td>
                                        <td><Link to={`/transactions/${txn.reference}`} className="btn btn-ghost btn-sm">View</Link></td>
                                    </tr>
                                )
                            })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Provider Status */}
            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>Provider Status</h2>
                    {providers.length > 0 && (
                        <span style={{ fontSize: 12, color: 'var(--text-2)' }}>
                            {providers.filter(p => p.status === 'UP').length}/{providers.length} operational
                        </span>
                    )}
                </div>

                {providers.length === 0 ? (
                    <p style={{ fontSize: 13, color: 'var(--text-2)', padding: '12px 0' }}>
                        No provider health data available. Check gateway connection.
                    </p>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                        {providers.map(p => {
                            const meta = PROVIDER_META[p.providerCode] || {}

                            // Color logic for status dot and text
                            const dotColor = p.status === 'UP' ? 'var(--green)'
                                : p.status === 'TIMEOUTS' ? 'var(--amber)'
                                    : 'var(--red)'

                            const statusColor = p.status === 'UP' ? 'var(--green)'
                                : p.status === 'TIMEOUTS' ? 'var(--amber)'
                                    : 'var(--red)'

                            const borderColor = p.status === 'UP' ? 'rgba(52,173,84,0.2)'
                                : p.status === 'TIMEOUTS' ? 'rgba(245,158,11,0.2)'
                                    : 'rgba(248,81,73,0.2)'

                            const bgColor = p.status === 'UP' ? 'rgba(52,173,84,0.05)'
                                : p.status === 'TIMEOUTS' ? 'rgba(245,158,11,0.05)'
                                    : 'rgba(248,81,73,0.05)'

                            return (
                                <div key={p.providerCode} style={{
                                    background: bgColor,
                                    borderRadius: 10, padding: '14px 16px',
                                    display: 'flex', alignItems: 'flex-start', gap: 12,
                                    border: `1px solid ${borderColor}`,
                                }}>
                                    <div style={{
                                        width: 9, height: 9, borderRadius: '50%',
                                        flexShrink: 0, marginTop: 4,
                                        background: dotColor,
                                        boxShadow: `0 0 6px ${dotColor}`
                                    }} />
                                    <div style={{ minWidth: 0 }}>
                                        <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>
                                            {meta.name || p.providerCode}
                                        </p>
                                        <p style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 4 }}>
                                            {p.providerType || meta.type || '—'}
                                        </p>
                                        <span style={{
                                            fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                                            color: statusColor,
                                        }}>
                                            {p.status || 'UNKNOWN'}
                                        </span>
                                        {p.detail && (
                                            <p style={{ fontSize: 10, color: 'var(--text-2)', marginTop: 3 }}>
                                                {p.detail}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Add spin animation if not already in global CSS */}
            <style>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    )
}