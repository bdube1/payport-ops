import React, { useState, useEffect, useCallback } from 'react'
import { TrendingUp, DollarSign, CheckCircle, XCircle, RefreshCw, BarChart2, Activity, PieChart, Filter, AlertCircle } from 'lucide-react'
import { searchTransactions, formatDate, STATUS_CONFIG } from '../lib/api'

// Fixed BarChart component
const BarChart = ({ data, valueKey, labelKey, color = 'var(--blue)', height = 250 }) => {
    if (!data || data.length === 0) return null

    // Handle different value types (numbers, objects with currency)
    const getValue = (item) => {
        const val = item[valueKey]
        if (typeof val === 'number') return val
        if (typeof val === 'object' && val !== null) {
            // If it's a currency object, sum all currencies for chart height
            return Object.values(val).reduce((sum, v) => sum + (v || 0), 0)
        }
        return 0
    }

    const maxValue = Math.max(...data.map(item => getValue(item)), 1)

    return (
        <div style={{ width: '100%', height, display: 'flex', alignItems: 'flex-end', gap: 12 }}>
            {data.map((item, i) => {
                const val = getValue(item)
                const percent = (val / maxValue) * 100
                const barHeight = Math.max(percent, 4) // Minimum 4px height

                return (
                    <div key={i} style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 8,
                        height: '100%'
                    }}>
                        <div style={{
                            width: '100%',
                            height: `${barHeight}%`,
                            background: color,
                            borderRadius: '6px 6px 0 0',
                            transition: 'height 0.3s ease',
                            minHeight: 4
                        }} />
                        <div style={{
                            fontSize: 11,
                            color: 'var(--text-2)',
                            fontWeight: 500,
                            textAlign: 'center',
                            maxWidth: '100%',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                        }}>
                            {item[labelKey]}
                        </div>
                        <div style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: 'var(--text)',
                            textAlign: 'center'
                        }}>
                            {formatMetricValue(item, valueKey)}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

// Fixed LineChart component
const LineChart = ({ data, color = 'var(--blue)' }) => {
    if (!data || data.length < 2) return null

    const maxValue = Math.max(...data.map(d => d.value), 1)
    const minValue = 0
    const range = maxValue - minValue

    // Calculate points for the line
    const points = data.map((d, i) => {
        const x = (i / (data.length - 1)) * 100
        const y = range === 0 ? 50 : ((maxValue - d.value) / range) * 100
        return `${x},${y}`
    }).join(' ')

    return (
        <div style={{ width: '100%', height: 250, position: 'relative' }}>
            <svg width="100%" height="200" viewBox="0 0 100 100" preserveAspectRatio="none">
                {/* Line */}
                <polyline
                    points={points}
                    fill="none"
                    stroke={color}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                {/* Data points */}
                {data.map((d, i) => {
                    const x = (i / (data.length - 1)) * 100
                    const y = range === 0 ? 50 : ((maxValue - d.value) / range) * 100
                    return (
                        <circle
                            key={i}
                            cx={x}
                            cy={y}
                            r="2"
                            fill={color}
                            stroke="white"
                            strokeWidth="1.5"
                        />
                    )
                })}
            </svg>

            {/* Labels and values */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: 8,
                padding: '0 4px'
            }}>
                {data.map((d, i) => (
                    <div key={i} style={{
                        textAlign: 'center',
                        fontSize: 10,
                        color: 'var(--text-2)',
                        flex: 1
                    }}>
                        <div>{d.label}</div>
                        <div style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: 'var(--text)',
                            marginTop: 2
                        }}>
                            {typeof d.value === 'number' ?
                                (d.value % 1 === 0 ? d.value : d.value.toFixed(1)) :
                                d.value}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

const PERIODS = [
    { label: 'Today', hours: 24 },
    { label: 'Last 7 days', hours: 24 * 7 },
    { label: 'Last 30 days', hours: 24 * 30 },
    { label: 'All time', hours: 24 * 365 * 10 },
]

const METRICS = [
    { id: 'total', label: 'Total Transactions', icon: Activity, color: 'var(--blue)' },
    { id: 'completed', label: 'Completed', icon: CheckCircle, color: 'var(--green)' },
    { id: 'failed', label: 'Failed', icon: XCircle, color: 'var(--red)' },
    { id: 'pending', label: 'Pending', icon: TrendingUp, color: 'var(--amber)' },
    { id: 'successRate', label: 'Success Rate %', icon: BarChart2, color: 'var(--green)' },
    { id: 'revenue', label: 'Revenue', icon: DollarSign, color: 'var(--green)' },
]

const CHART_TYPES = [
    { id: 'bar', label: 'Bar Chart', icon: BarChart2 },
    { id: 'line', label: 'Line Chart', icon: TrendingUp },
]

// Currency symbols
const CURRENCY_SYMBOLS = {
    'USD': '$',
    'ZWG': 'ZiG',
    'ZWL': 'ZiG'
}

// Helper to format metric values with proper currency
const formatMetricValue = (item, metricId) => {
    if (metricId === 'revenue') {
        // Handle multi-currency revenue
        if (item.revenueByCurrency) {
            return Object.entries(item.revenueByCurrency)
                .map(([currency, amount]) => {
                    const symbol = CURRENCY_SYMBOLS[currency] || currency
                    return `${symbol} ${amount.toFixed(2)}`
                })
                .join(' · ')
        }
        // Fallback to single currency
        const currency = item.currency || 'USD'
        const symbol = CURRENCY_SYMBOLS[currency] || currency
        return `${symbol} ${(item.revenue || 0).toFixed(2)}`
    }
    if (metricId === 'successRate') {
        return `${item.successRate || 0}%`
    }
    return item[metricId] || 0
}

// Helper to extract product/network name from transaction
const getGroupName = (tx, groupBy) => {
    if (groupBy === 'product') {
        // For product grouping
        return tx.productType?.name ||
            tx.productName ||
            tx.productTypeCode?.replace('AIRTIME_', '').replace('DATA_', '').replace('BILLS_', '') ||
            'Other'
    } else {
        // For network grouping - extract from product type
        const code = tx.productTypeCode || ''
        if (code.includes('ECONET')) return 'Econet'
        if (code.includes('NETONE')) return 'NetOne'
        if (code.includes('TELECEL')) return 'Telecel'
        if (code.includes('ZESA')) return 'ZESA'
        if (code.includes('DSTV')) return 'DSTV'
        if (code.includes('GOTV')) return 'GOtv'
        if (code.includes('TELONE')) return 'TelOne'
        return 'Other'
    }
}

export default function AnalyticsPage() {
    const [period, setPeriod] = useState(0)
    const [activeMetric, setActiveMetric] = useState('total')
    const [chartType, setChartType] = useState('bar')
    const [groupBy, setGroupBy] = useState('product')
    const [txs, setTxs] = useState([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [error, setError] = useState('')
    const [lastRefresh, setLastRefresh] = useState(new Date())
    const [showFilters, setShowFilters] = useState(false)
    const [currencyBreakdown, setCurrencyBreakdown] = useState({})

    const load = useCallback(async (silent = false) => {
        if (!silent) setLoading(true)
        else setRefreshing(true)
        setError('')
        try {
            // Fetch recent transactions for analytics
            const res = await searchTransactions({ page: 0, size: 1000 })
            const data = res.data?.data || res.data || {}
            const list = data.content || (Array.isArray(data) ? data : [])
            setTxs(list)
            setLastRefresh(new Date())
        } catch (err) {
            console.error('Analytics load error:', err)
            setError('Could not load analytics data. Please try again, or contact support if this continues.')
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [])

    // Initial load and auto-refresh every 60 seconds
    useEffect(() => {
        load()
        const interval = setInterval(() => load(true), 60000)
        return () => clearInterval(interval)
    }, [load])

    // Filter by period
    const now = new Date()
    const cutoff = new Date(now.getTime() - PERIODS[period].hours * 3600 * 1000)
    const filtered = txs.filter(tx => {
        let txDate = null
        if (tx.initiatedAt) {
            if (Array.isArray(tx.initiatedAt)) {
                const [year, month, day, hour, minute, second] = tx.initiatedAt
                txDate = new Date(year, month - 1, day, hour, minute, second)
            } else {
                txDate = new Date(tx.initiatedAt)
            }
        }
        return txDate && txDate >= cutoff
    })

    // Calculate metrics with multi-currency support
    const total = filtered.length
    const completed = filtered.filter(t => t.status === 'COMPLETED').length
    const failed = filtered.filter(t => ['PAYMENT_FAILED', 'FULFILMENT_FAILED', 'PAYMENT_TIMEOUT'].includes(t.status)).length
    const pending = filtered.filter(t => ['PAYMENT_PENDING', 'PAYMENT_CONFIRMED', 'FULFILMENT_PENDING', 'INITIATED'].includes(t.status)).length
    const successRate = total > 0 ? ((completed / total) * 100).toFixed(1) : '0.0'

    // Multi-currency revenue calculation
    const revenueByCurrency = filtered
        .filter(t => t.status === 'COMPLETED')
        .reduce((acc, t) => {
            const currency = t.currency || 'USD'
            const amount = (t.amountCents || 0) / 100
            acc[currency] = (acc[currency] || 0) + amount
            return acc
        }, {})

    // Group data by product or network with multi-currency support
    const groupedData = filtered.reduce((acc, tx) => {
        const groupName = getGroupName(tx, groupBy)

        if (!acc[groupName]) {
            acc[groupName] = {
                name: groupName,
                total: 0,
                completed: 0,
                failed: 0,
                pending: 0,
                revenue: 0,
                revenueByCurrency: {},
                successRate: 0
            }
        }

        acc[groupName].total++
        if (tx.status === 'COMPLETED') {
            acc[groupName].completed++
            const amount = (tx.amountCents || 0) / 100
            const currency = tx.currency || 'USD'
            acc[groupName].revenue += amount
            acc[groupName].revenueByCurrency[currency] = (acc[groupName].revenueByCurrency[currency] || 0) + amount
        } else if (['PAYMENT_FAILED', 'FULFILMENT_FAILED', 'PAYMENT_TIMEOUT'].includes(tx.status)) {
            acc[groupName].failed++
        } else {
            acc[groupName].pending++
        }

        return acc
    }, {})

    // Convert to array and calculate success rate
    const chartData = Object.values(groupedData)
        .map(d => ({
            ...d,
            successRate: d.total > 0 ? ((d.completed / d.total) * 100).toFixed(1) : 0
        }))
        .sort((a, b) => {
            if (activeMetric === 'revenue') return b.revenue - a.revenue
            if (activeMetric === 'successRate') return parseFloat(b.successRate) - parseFloat(a.successRate)
            return b[activeMetric] - a[activeMetric]
        })
        .slice(0, 8)

    // Time series data (last 7 days) with multi-currency
    const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - (6 - i))
        date.setHours(0, 0, 0, 0)
        return date
    })

    const timeSeriesData = last7Days.map(date => {
        const nextDate = new Date(date)
        nextDate.setDate(nextDate.getDate() + 1)

        const dayTxs = filtered.filter(tx => {
            let txDate = null
            if (tx.initiatedAt) {
                if (Array.isArray(tx.initiatedAt)) {
                    const [year, month, day, hour, minute, second] = tx.initiatedAt
                    txDate = new Date(year, month - 1, day, hour, minute, second)
                } else {
                    txDate = new Date(tx.initiatedAt)
                }
            }
            return txDate && txDate >= date && txDate < nextDate
        })

        const dayCompleted = dayTxs.filter(t => t.status === 'COMPLETED').length
        const dayTotal = dayTxs.length

        // Calculate revenue by currency for the day
        const dayRevenueByCurrency = dayTxs
            .filter(t => t.status === 'COMPLETED')
            .reduce((acc, t) => {
                const currency = t.currency || 'USD'
                const amount = (t.amountCents || 0) / 100
                acc[currency] = (acc[currency] || 0) + amount
                return acc
            }, {})

        return {
            label: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
            total: dayTotal,
            completed: dayCompleted,
            failed: dayTxs.filter(t => ['PAYMENT_FAILED', 'FULFILMENT_FAILED', 'PAYMENT_TIMEOUT'].includes(t.status)).length,
            pending: dayTxs.filter(t => ['PAYMENT_PENDING', 'PAYMENT_CONFIRMED', 'FULFILMENT_PENDING', 'INITIATED'].includes(t.status)).length,
            successRate: dayTotal > 0 ? ((dayCompleted / dayTotal) * 100).toFixed(1) : 0,
            revenue: Object.values(dayRevenueByCurrency).reduce((sum, v) => sum + v, 0),
            revenueByCurrency: dayRevenueByCurrency
        }
    })

    // Status breakdown
    const statusBreakdown = Object.entries(
        filtered.reduce((acc, t) => {
            acc[t.status] = (acc[t.status] || 0) + 1
            return acc
        }, {})
    ).sort((a, b) => b[1] - a[1])

    // Payment method breakdown
    const paymentMethodBreakdown = Object.entries(
        filtered.reduce((acc, t) => {
            const method = t.paymentMethod?.code || t.paymentMethodName || t.paymentMethodCode || 'UNKNOWN'
            acc[method] = (acc[method] || 0) + 1
            return acc
        }, {})
    ).sort((a, b) => b[1] - a[1])

    const COLORS = {
        COMPLETED: 'var(--green)',
        PAYMENT_FAILED: 'var(--red)',
        FULFILMENT_FAILED: 'var(--red)',
        PAYMENT_PENDING: 'var(--amber)',
        PAYMENT_CONFIRMED: 'var(--blue)',
        FULFILMENT_PENDING: '#8b5cf6',
        PAYMENT_TIMEOUT: 'var(--red)',
        INITIATED: 'var(--text-2)'
    }

    const getMetricColor = () => {
        const metric = METRICS.find(m => m.id === activeMetric)
        return metric?.color || 'var(--blue)'
    }

    const getMetricLabel = () => {
        const metric = METRICS.find(m => m.id === activeMetric)
        return metric?.label || 'Total Transactions'
    }

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 16 }}>
            <div className="spinner" style={{ width: 36, height: 36, border: '3px solid var(--badge-blue)', borderTop: '3px solid var(--blue)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <p style={{ color: 'var(--text-2)', fontSize: 14 }}>Loading analytics...</p>
        </div>
    )

    return (
        <div style={{ padding: 28 }}>
            {/* Header with refresh indicator */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
                <div>
                    <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24, marginBottom: 4 }}>Analytics Dashboard</h1>
                    <p style={{ fontSize: 13, color: 'var(--text-2)' }}>
                        {filtered.length} transactions in selected period · Last updated: {lastRefresh.toLocaleTimeString()} · Auto-refresh every 60s
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    {PERIODS.map((p, i) => (
                        <button key={p.label} onClick={() => setPeriod(i)} className={`btn ${period === i ? 'btn-primary' : 'btn-ghost'} btn-sm`}>
                            {p.label}
                        </button>
                    ))}
                    <button
                        onClick={() => load(true)}
                        disabled={refreshing}
                        className="btn btn-ghost"
                        style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                        <RefreshCw size={14} style={refreshing ? { animation: 'spin 1s linear infinite' } : {}} />
                        {refreshing ? 'Refreshing...' : 'Refresh'}
                    </button>
                </div>
            </div>

            {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(248,81,73,0.1)', border: '1px solid rgba(248,81,73,0.3)', borderRadius: 10, padding: '14px 18px', marginBottom: 24, color: 'var(--red)', fontSize: 13 }}>
                    <AlertCircle size={16} style={{ flexShrink: 0 }} /> {error}
                </div>
            )}

            {/* Currency Summary */}
            {Object.keys(revenueByCurrency).length > 0 && (
                <div className="card" style={{ marginBottom: 24, padding: '16px 20px', background: 'rgba(6,163,218,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        <DollarSign size={18} color="var(--blue)" />
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>Revenue by Currency:</span>
                        {Object.entries(revenueByCurrency).map(([currency, amount]) => {
                            const symbol = CURRENCY_SYMBOLS[currency] || currency
                            return (
                                <span key={currency} style={{
                                    background: 'var(--bg-card)',
                                    padding: '4px 12px',
                                    borderRadius: 100,
                                    fontSize: 13,
                                    fontWeight: 700,
                                    color: currency === 'USD' ? 'var(--green)' : 'var(--amber)',
                                    border: '1px solid rgba(6,163,218,0.2)'
                                }}>
                                    {symbol} {amount.toFixed(2)}
                                </span>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Metric Toggle */}
            <div className="card" style={{ marginBottom: 24, padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {METRICS.map(metric => (
                            <button
                                key={metric.id}
                                onClick={() => setActiveMetric(metric.id)}
                                className={`btn ${activeMetric === metric.id ? 'btn-primary' : 'btn-ghost'} btn-sm`}
                                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                            >
                                <metric.icon size={14} color={metric.color} />
                                {metric.label}
                            </button>
                        ))}
                    </div>
                    <button onClick={() => setShowFilters(!showFilters)} className="btn btn-ghost btn-sm">
                        <Filter size={14} /> {showFilters ? 'Hide' : 'Show'} Filters
                    </button>
                </div>

                {showFilters && (
                    <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        <div>
                            <label style={{ fontSize: 12, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>Group By</label>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button onClick={() => setGroupBy('product')} className={`btn ${groupBy === 'product' ? 'btn-primary' : 'btn-ghost'} btn-sm`}>Product Type</button>
                                <button onClick={() => setGroupBy('network')} className={`btn ${groupBy === 'network' ? 'btn-primary' : 'btn-ghost'} btn-sm`}>Network/Biller</button>
                            </div>
                        </div>
                        <div>
                            <label style={{ fontSize: 12, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>Chart Type</label>
                            <div style={{ display: 'flex', gap: 8 }}>
                                {CHART_TYPES.map(type => (
                                    <button key={type.id} onClick={() => setChartType(type.id)} className={`btn ${chartType === type.id ? 'btn-primary' : 'btn-ghost'} btn-sm`}>
                                        <type.icon size={14} style={{ marginRight: 4 }} />
                                        {type.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Summary KPIs with multi-currency */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 28 }}>
                {[
                    { label: 'Total Transactions', value: total, icon: Activity, color: 'var(--blue)' },
                    { label: 'Completed', value: completed, icon: CheckCircle, color: 'var(--green)' },
                    { label: 'Failed', value: failed, icon: XCircle, color: 'var(--red)' },
                    { label: 'Pending', value: pending, icon: TrendingUp, color: 'var(--amber)' },
                    { label: 'Success Rate', value: `${successRate}%`, icon: BarChart2, color: Number(successRate) >= 95 ? 'var(--green)' : Number(successRate) >= 80 ? 'var(--amber)' : 'var(--red)' },
                    {
                        label: 'Revenue',
                        value: Object.entries(revenueByCurrency)
                            .map(([c, a]) => `${CURRENCY_SYMBOLS[c] || c} ${a.toFixed(2)}`)
                            .join(' · '),
                        icon: DollarSign,
                        color: 'var(--green)'
                    },
                ].map(card => (
                    <div key={card.label} className="card" style={{ padding: '18px 20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{card.label}</p>
                            <card.icon size={15} color={card.color} />
                        </div>
                        <p style={{
                            fontFamily: 'var(--font-display)',
                            fontWeight: 800,
                            fontSize: card.label === 'Revenue' ? 18 : 26,
                            color: card.color,
                            wordBreak: 'break-word'
                        }}>
                            {card.value}
                        </p>
                    </div>
                ))}
            </div>

            {/* Main Chart - By Product/Network */}
            <div className="card" style={{ marginBottom: 24, padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>
                        {getMetricLabel()} by {groupBy === 'product' ? 'Product Type' : 'Network/Biller'}
                    </h3>
                    {chartData.length > 0 && (
                        <span style={{ fontSize: 12, color: 'var(--text-2)' }}>
                            Top {chartData.length} {groupBy === 'product' ? 'products' : 'networks'}
                        </span>
                    )}
                </div>

                {chartData.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-2)' }}>
                        <BarChart2 size={40} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                        <p>No data available for this period</p>
                    </div>
                ) : (
                    <>
                        {chartType === 'bar' ? (
                            <BarChart
                                data={chartData}
                                valueKey={activeMetric}
                                labelKey="name"
                                color={getMetricColor()}
                                height={250}
                            />
                        ) : (
                            <LineChart
                                data={chartData.map(d => ({
                                    label: d.name.length > 10 ? d.name.substring(0, 10) + '...' : d.name,
                                    value: activeMetric === 'revenue' ? d.revenue :
                                        activeMetric === 'successRate' ? parseFloat(d.successRate) :
                                            d[activeMetric] || 0
                                }))}
                                color={getMetricColor()}
                            />
                        )}

                        {/* Data Table with multi-currency */}
                        <div style={{ marginTop: 32, overflowX: 'auto' }}>
                            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                                <thead>
                                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                                    <th style={{ textAlign: 'left', padding: '12px 8px' }}>{groupBy === 'product' ? 'Product' : 'Network/Biller'}</th>
                                    <th style={{ textAlign: 'right', padding: '12px 8px' }}>Total</th>
                                    <th style={{ textAlign: 'right', padding: '12px 8px' }}>Completed</th>
                                    <th style={{ textAlign: 'right', padding: '12px 8px' }}>Failed</th>
                                    <th style={{ textAlign: 'right', padding: '12px 8px' }}>Pending</th>
                                    <th style={{ textAlign: 'right', padding: '12px 8px' }}>Success Rate</th>
                                    <th style={{ textAlign: 'right', padding: '12px 8px' }}>Revenue (USD)</th>
                                    <th style={{ textAlign: 'right', padding: '12px 8px' }}>Revenue (ZiG)</th>
                                </tr>
                                </thead>
                                <tbody>
                                {chartData.map((item, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'var(--bg-2)' : 'transparent' }}>
                                        <td style={{ padding: '10px 8px', fontWeight: 600 }}>{item.name}</td>
                                        <td style={{ textAlign: 'right', padding: '10px 8px' }}>{item.total}</td>
                                        <td style={{ textAlign: 'right', padding: '10px 8px', color: 'var(--green)' }}>{item.completed}</td>
                                        <td style={{ textAlign: 'right', padding: '10px 8px', color: 'var(--red)' }}>{item.failed}</td>
                                        <td style={{ textAlign: 'right', padding: '10px 8px', color: 'var(--amber)' }}>{item.pending}</td>
                                        <td style={{ textAlign: 'right', padding: '10px 8px', fontWeight: 600, color: item.successRate >= 95 ? 'var(--green)' : item.successRate >= 80 ? 'var(--amber)' : 'var(--red)' }}>
                                            {item.successRate}%
                                        </td>
                                        <td style={{ textAlign: 'right', padding: '10px 8px', fontWeight: 600 }}>
                                            ${(item.revenueByCurrency?.USD || 0).toFixed(2)}
                                        </td>
                                        <td style={{ textAlign: 'right', padding: '10px 8px', fontWeight: 600, color: 'var(--amber)' }}>
                                            ZiG {(item.revenueByCurrency?.ZWG || item.revenueByCurrency?.ZWL || 0).toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>

            {/* Time Series Chart with multi-currency */}
            <div className="card" style={{ marginBottom: 24, padding: 24 }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, marginBottom: 20 }}>
                    Daily Trend (Last 7 Days) - {getMetricLabel()}
                </h3>
                {timeSeriesData.every(d => d.total === 0) ? (
                    <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-2)' }}>
                        <TrendingUp size={40} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                        <p>No transaction data for the last 7 days</p>
                    </div>
                ) : (
                    <>
                        <LineChart
                            data={timeSeriesData.map(d => ({
                                label: d.label.split(' ')[0],
                                value: activeMetric === 'revenue' ? d.revenue :
                                    activeMetric === 'successRate' ? parseFloat(d.successRate) :
                                        d[activeMetric] || 0
                            }))}
                            color={getMetricColor()}
                        />

                        {/* Daily Stats with currency breakdown */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(7, 1fr)',
                            gap: 8,
                            marginTop: 24,
                            padding: '16px 0',
                            borderTop: '1px solid var(--border)'
                        }}>
                            {timeSeriesData.map((day, i) => (
                                <div key={i} style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 4 }}>{day.label}</div>
                                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                                        {activeMetric === 'revenue' ? (
                                            <>
                                                <div style={{ color: 'var(--green)' }}>${day.revenueByCurrency?.USD?.toFixed(2) || '0.00'}</div>
                                                <div style={{ fontSize: 11, color: 'var(--amber)' }}>ZiG {(day.revenueByCurrency?.ZWG || day.revenueByCurrency?.ZWL || 0).toFixed(2)}</div>
                                            </>
                                        ) : activeMetric === 'successRate' ? (
                                            `${day.successRate}%`
                                        ) : (
                                            day[activeMetric] || 0
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                {/* Status Breakdown */}
                <div className="card" style={{ padding: 24 }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, marginBottom: 18 }}>Status Distribution</h3>
                    {statusBreakdown.length === 0 ? (
                        <p style={{ color: 'var(--text-2)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No data for this period</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {statusBreakdown.map(([status, count]) => {
                                const cfg = STATUS_CONFIG[status] || { label: status, badge: 'badge-gray' }
                                const pct = ((count / total) * 100).toFixed(1)
                                const color = COLORS[status] || 'var(--blue)'
                                return (
                                    <div key={status}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                            <span className={`badge ${cfg.badge}`} style={{ fontSize: 11 }}>{cfg.label}</span>
                                            <span style={{ fontSize: 12, fontWeight: 700 }}>
                                                {count} <span style={{ color: 'var(--text-2)', fontWeight: 400 }}>({pct}%)</span>
                                            </span>
                                        </div>
                                        <div style={{ height: 8, background: 'var(--bg-2)', borderRadius: 4, overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4 }} />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Payment Method Breakdown */}
                <div className="card" style={{ padding: 24 }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, marginBottom: 18 }}>Payment Methods</h3>
                    {paymentMethodBreakdown.length === 0 ? (
                        <p style={{ color: 'var(--text-2)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No data for this period</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {paymentMethodBreakdown.map(([method, count]) => {
                                const pct = ((count / total) * 100).toFixed(1)
                                const colors = { ECOCASH: '#06A3DA', ONEMONEY: '#f59e0b', TELECASH: '#8b5cf6' }
                                const color = colors[method] || 'var(--green)'
                                return (
                                    <div key={method}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                            <span style={{ fontSize: 12, fontWeight: 600 }}>{method}</span>
                                            <span style={{ fontSize: 12, fontWeight: 700 }}>
                                                {count} <span style={{ color: 'var(--text-2)', fontWeight: 400 }}>({pct}%)</span>
                                            </span>
                                        </div>
                                        <div style={{ height: 8, background: 'var(--bg-2)', borderRadius: 4, overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${(count / total) * 100}%`, background: color, borderRadius: 4 }} />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Recent Transactions with multi-currency */}
            <div className="card" style={{ padding: 24 }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, marginBottom: 16 }}>
                    Recent Transactions {total > 0 && <span style={{ color: 'var(--text-2)', fontWeight: 400, fontSize: 13 }}>({total} in period)</span>}
                </h3>
                {filtered.length === 0 ? (
                    <p style={{ color: 'var(--text-2)', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>No transactions in this period</p>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                            <tr style={{ borderBottom: '2px solid var(--border)' }}>
                                <th style={{ textAlign: 'left', padding: '12px 8px' }}>Reference</th>
                                <th style={{ textAlign: 'left', padding: '12px 8px' }}>Product</th>
                                <th style={{ textAlign: 'left', padding: '12px 8px' }}>Network/Biller</th>
                                <th style={{ textAlign: 'right', padding: '12px 8px' }}>Amount</th>
                                <th style={{ textAlign: 'left', padding: '12px 8px' }}>Payment</th>
                                <th style={{ textAlign: 'left', padding: '12px 8px' }}>Status</th>
                                <th style={{ textAlign: 'left', padding: '12px 8px' }}>Date</th>
                            </tr>
                            </thead>
                            <tbody>
                            {filtered.slice(0, 20).map(tx => {
                                const cfg = STATUS_CONFIG[tx.status] || { label: tx.status, badge: 'badge-gray' }
                                const networkName = getGroupName(tx, 'network')
                                const currency = tx.currency || 'USD'
                                const symbol = CURRENCY_SYMBOLS[currency] || currency
                                return (
                                    <tr key={tx.reference} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '10px 8px' }}><span className="mono" style={{ color: 'var(--blue)', fontSize: 12 }}>{tx.reference}</span></td>
                                        <td style={{ padding: '10px 8px', color: 'var(--text-2)', fontSize: 13 }}>{tx.productType?.name || tx.productName || '—'}</td>
                                        <td style={{ padding: '10px 8px', fontSize: 13 }}>{networkName}</td>
                                        <td style={{ padding: '10px 8px', fontWeight: 600, textAlign: 'right', color: currency === 'USD' ? 'var(--green)' : 'var(--amber)' }}>
                                            {symbol} {((tx.amountCents || 0) / 100).toFixed(2)}
                                        </td>
                                        <td style={{ padding: '10px 8px', color: 'var(--text-2)', fontSize: 13 }}>{tx.paymentMethod?.code || tx.paymentMethodName || tx.paymentMethodCode || '—'}</td>
                                        <td style={{ padding: '10px 8px' }}><span className={`badge ${cfg.badge}`}>{cfg.label}</span></td>
                                        <td style={{ padding: '10px 8px', color: 'var(--text-2)', fontSize: 12 }}>{formatDate(tx.initiatedAt)}</td>
                                    </tr>
                                )
                            })}
                            </tbody>
                        </table>
                        {filtered.length > 20 && (
                            <p style={{ textAlign: 'center', padding: '16px 0 8px', color: 'var(--text-2)', fontSize: 13 }}>
                                Showing 20 of {filtered.length} transactions. Use the Transactions page to view all.
                            </p>
                        )}
                    </div>
                )}
            </div>

            <style>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    )
}