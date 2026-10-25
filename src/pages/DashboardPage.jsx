import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Activity, CheckCircle2, Clock, AlertTriangle, XCircle, DollarSign, RefreshCw, ArrowUpRight, ArrowDownRight, ChevronRight } from 'lucide-react';
import { getDashboardKpis, getAttentionQueue, getProviderHealth, searchTransactions, formatDate, STATUS_CONFIG } from '../lib/api';
import { ExportArea } from '../components/kit';
import { Sparkline, LineChart, Legend } from '../components/charts';
import { ProviderRow } from './ProviderStatusPage';

const PENDING = ['INITIATED', 'PAYMENT_PENDING', 'PAYMENT_CONFIRMED', 'FULFILMENT_PENDING', 'FULFILMENT_RETRY'];
const FAILED = ['PAYMENT_FAILED', 'FULFILMENT_FAILED', 'PAYMENT_TIMEOUT'];
const ATTENTION = ['FULFILMENT_FAILED', 'MANUAL_FULFILMENT', 'REFUND_PENDING', 'FULFILMENT_RETRY'];

const iso = (d) => {
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};
const toDate = (v) => (Array.isArray(v) ? new Date(v[0], v[1] - 1, v[2], v[3] || 0, v[4] || 0, v[5] || 0) : new Date(String(v || '').replace(' ', 'T')));
const money = (cents, ccy = 'USD') => {
    const n = (Number(cents || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return ccy === 'USD' ? `$ ${n}` : `${ccy === 'ZWL' ? 'ZWG' : ccy} ${n}`;
};

async function dayOf(from, to) {
    try {
        const r = await searchTransactions({ dateFrom: iso(from), dateTo: iso(to), size: 1000, page: 0 });
        const d = r.data?.data || r.data || {};
        const rows = d.content || [];
        return { rows, total: Number(d.totalElements ?? rows.length), complete: Number(d.totalElements ?? rows.length) <= rows.length };
    } catch { return { rows: [], total: 0, complete: false }; }
}

/** Hourly buckets 00:00 … now. */
function buckets(rows, hours, pick) {
    const out = new Array(hours).fill(0);
    for (const t of rows) {
        const at = toDate(t.createdAt || t.initiatedAt);
        const h = at.getHours();
        if (h < hours) out[h] += pick(t);
    }
    return out;
}
const cumulative = (a) => a.reduce((acc, v, i) => (acc.push((acc[i - 1] || 0) + v), acc), []);

function Trend({ now, before }) {
    if (!before) return <span style={{ fontSize: 12, color: 'var(--text-2)' }}>Today</span>;
    const pct = Math.round(((now - before) / before) * 100);
    const up = pct >= 0;
    const Icon = up ? ArrowUpRight : ArrowDownRight;
    return (
        <span title="Against the same time yesterday" style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 12, fontWeight: 600, color: up ? 'var(--pill-green)' : 'var(--pill-red)' }}>
            <Icon size={14} />{Math.abs(pct)}%
        </span>
    );
}

export default function DashboardPage() {
    const [kpis, setKpis] = useState(null);
    const [queue, setQueue] = useState([]);
    const [providers, setProviders] = useState([]);
    const [todayDay, setToday] = useState({ rows: [], total: 0, complete: false });
    const [yesterdayDay, setYesterday] = useState({ rows: [], total: 0, complete: false });
    const today = todayDay.rows;
    const yesterday = yesterdayDay.rows;
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [lastRefresh, setLastRefresh] = useState(new Date());

    const load = useCallback(async (silent = false) => {
        if (silent) setRefreshing(true);
        setError('');
        const now = new Date();
        const start = new Date(now); start.setHours(0, 0, 0, 0);
        const yStart = new Date(start); yStart.setDate(yStart.getDate() - 1);
        const yNow = new Date(now); yNow.setDate(yNow.getDate() - 1);
        try {
            const [k, q, h, t, y] = await Promise.all([
                getDashboardKpis(), getAttentionQueue().catch(() => ({ data: [] })), getProviderHealth().catch(() => ({ data: [] })),
                dayOf(start, now), dayOf(yStart, yNow),
            ]);
            setKpis(k.data?.data || k.data || {});
            const qd = q.data?.data || q.data || [];
            setQueue(Array.isArray(qd) ? qd : []);
            const hd = h.data?.data || h.data || [];
            setProviders(Array.isArray(hd) ? hd : []);
            setToday(t);
            setYesterday(y);
            setLastRefresh(new Date());
        } catch {
            setError('Could not load the dashboard.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        load();
        const t = setInterval(() => load(true), 30000);
        return () => clearInterval(t);
    }, [load]);

    const hours = new Date().getHours() + 1;
    const labels = Array.from({ length: hours }, (_, i) => `${String(i).padStart(2, '0')}:00`);
    const series = useMemo(() => ({
        all: buckets(today, hours, () => 1),
        completed: buckets(today, hours, t => (t.status === 'COMPLETED' ? 1 : 0)),
        pending: buckets(today, hours, t => (PENDING.includes(t.status) ? 1 : 0)),
        failed: buckets(today, hours, t => (FAILED.includes(t.status) ? 1 : 0)),
        attention: buckets(today, hours, t => (ATTENTION.includes(t.status) ? 1 : 0)),
        revenue: buckets(today, hours, t => (t.status === 'COMPLETED' && (t.currency || 'USD') === 'USD' ? Number(t.amountCents || 0) : 0)),
    }), [today, hours]);
    // Against the same time yesterday: only when both days were read in full (otherwise the counts are partial).
    const both = todayDay.complete && yesterdayDay.complete;
    const cmp = (f) => (both ? { now: today.filter(f).length, before: yesterday.filter(f).length } : null);
    const n = (v) => (v === null || v === undefined ? '—' : Number(v).toLocaleString('en-US'));

    const revenue = kpis?.revenueByCurrency || {};
    const otherRevenue = Object.entries(revenue).filter(([c, v]) => c !== 'USD' && v);

    const cards = [
        { label: 'Total Today', value: n(kpis?.totalTransactionsToday), color: '#1D6FE8', icon: Activity, spark: cumulative(series.all),
          trend: yesterdayDay.total ? { now: todayDay.total, before: yesterdayDay.total } : null },
        { label: 'Completed', value: n(kpis?.completedToday), color: '#16A34A', icon: CheckCircle2, spark: cumulative(series.completed), trend: cmp(t => t.status === 'COMPLETED') },
        { label: 'Pending Payment', value: n(kpis?.pendingPayment), color: '#E8930C', icon: Clock, spark: series.pending, trend: cmp(t => PENDING.includes(t.status)) },
        { label: 'Need Attention', value: n(kpis?.needAttention), color: '#E5484D', icon: AlertTriangle, spark: series.attention, trend: null, to: '/attention' },
        { label: 'Failed', value: n(kpis?.failedToday), color: '#E5484D', icon: XCircle, spark: cumulative(series.failed), trend: cmp(t => FAILED.includes(t.status)) },
        { label: 'Revenue Today', value: money(revenue.USD || 0), color: '#7C5CFA', icon: DollarSign, spark: cumulative(series.revenue),
          trend: both ? { now: today.filter(t => t.status === 'COMPLETED').reduce((a, t) => a + Number(t.amountCents || 0), 0), before: yesterday.filter(t => t.status === 'COMPLETED').reduce((a, t) => a + Number(t.amountCents || 0), 0) } : null,
          extra: otherRevenue.map(([c, v]) => money(v, c)).join(' · ') },
    ];

    const chart = [
        { name: 'Completed', color: '#1D6FE8', values: series.completed },
        { name: 'Pending', color: '#E8930C', values: series.pending },
        { name: 'Failed', color: '#E5484D', values: series.failed },
    ];

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}><div className="spinner" /></div>
    );

    return (
        <div className="op-page">
            <div className="op-page-head">
                <div>
                    <h1>Operations Dashboard</h1>
                    <p style={{ fontSize: 12.5, color: 'var(--text-2)', marginTop: 4 }}>Last updated {lastRefresh.toLocaleTimeString()} · every 30s</p>
                </div>
                <button className="btn btn-outline" onClick={() => load(true)} disabled={refreshing}>
                    <RefreshCw size={14} style={refreshing ? { animation: 'spin 1s linear infinite' } : undefined} /> Refresh
                </button>
            </div>

            {error && <div className="card" style={{ marginBottom: 16, color: 'var(--pill-red)', background: 'var(--badge-red)', borderColor: 'transparent' }}>{error}</div>}

            <div className="op-kpis" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(165px, 1fr))' }}>
                {cards.map(c => {
                    const body = (
                        <div className="card op-kpi" style={{ height: '100%' }}>
                            <div className="op-kpi-label">
                                <span className="op-kpi-ic" style={{ background: `${c.color}1A`, color: c.color }}><c.icon size={15} /></span>
                                {c.label}
                            </div>
                            <div className="op-kpi-value">{c.value ?? '—'}</div>
                            {c.extra && <div style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 600 }}>{c.extra}</div>}
                            <div className="op-kpi-foot">
                                <Trend now={c.trend?.now} before={c.trend?.before} />
                                <Sparkline values={c.spark} color={c.color} />
                            </div>
                        </div>
                    );
                    return c.to ? <Link key={c.label} to={c.to} style={{ textDecoration: 'none', color: 'inherit' }}>{body}</Link> : <div key={c.label}>{body}</div>;
                })}
            </div>

            <div className="op-grid op-dash" style={{ marginBottom: 18 }}>
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 12, flexWrap: 'wrap' }}>
                        <h2 style={{ fontSize: 15, fontWeight: 700 }}>Transaction Volume</h2>
                        <Legend series={chart} />
                    </div>
                    <LineChart labels={labels} series={chart} height={300} />
                </div>
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <h2 style={{ fontSize: 15, fontWeight: 700 }}>Provider Status</h2>
                        <Link to="/provider-status" style={{ fontSize: 12.5, fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center' }}>View all <ChevronRight size={14} /></Link>
                    </div>
                    {providers.length === 0 && <p style={{ fontSize: 13, color: 'var(--text-2)', padding: '10px 0' }}>No provider checks yet.</p>}
                    {providers.slice(0, 8).map(p => <ProviderRow key={p.providerCode} p={p} />)}
                </div>
            </div>

            <div className="card" style={{ padding: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px 8px' }}>
                    <h2 style={{ fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                        Attention Queue {queue.length > 0 && <span className="badge badge-red">{queue.length}</span>}
                    </h2>
                    <Link to="/attention" className="btn btn-ghost btn-sm">View all</Link>
                </div>
                {queue.length === 0 ? (
                    <p style={{ padding: '18px 20px 22px', color: 'var(--text-2)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <CheckCircle2 size={16} color="var(--green)" /> Nothing needs attention.
                    </p>
                ) : (
                    <div style={{ padding: '0 4px 8px', overflowX: 'auto' }}>
                        <ExportArea name="Attention queue" style={{ padding: '0 16px' }}>
                            <table>
                                <thead><tr><th>Reference</th><th>Service</th><th>Amount</th><th>Status</th><th>Initiated</th><th>Action</th></tr></thead>
                                <tbody>
                                    {queue.slice(0, 10).map(t => {
                                        const cfg = STATUS_CONFIG[t.status] || STATUS_CONFIG.INITIATED;
                                        return (
                                            <tr key={t.reference}>
                                                <td className="mono">{t.reference}</td>
                                                <td>{t.productName || t.productTypeCode || '—'}</td>
                                                <td style={{ fontWeight: 600 }}>{money(t.amountCents, t.currency || 'USD')}</td>
                                                <td><span className={`badge ${cfg.badge}`}>{cfg.label}</span></td>
                                                <td style={{ color: 'var(--text-2)' }}>{formatDate(t.createdAt)}</td>
                                                <td><Link to={`/transactions/${t.reference}`} className="btn btn-ghost btn-sm">View</Link></td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </ExportArea>
                    </div>
                )}
            </div>
        </div>
    );
}
