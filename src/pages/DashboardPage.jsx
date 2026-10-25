import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Activity, CheckCircle2, Clock, AlertTriangle, XCircle, DollarSign, RefreshCw, ArrowUpRight, ArrowDownRight, ChevronRight } from 'lucide-react';
import { api, getDashboardKpis, getProviderHealth } from '../lib/api';
import { Sparkline, LineChart, Legend } from '../components/charts';
import { ProviderRow } from './ProviderStatusPage';

const money = (cents, ccy = 'USD') => {
    const n = (Number(cents || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return ccy === 'USD' ? `$ ${n}` : `${ccy === 'ZWL' ? 'ZWG' : ccy} ${n}`;
};
const sum = (a) => (a || []).reduce((x, y) => x + Number(y || 0), 0);
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
    const [providers, setProviders] = useState([]);
    const [volume, setVolume] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [lastRefresh, setLastRefresh] = useState(new Date());

    const load = useCallback(async (silent = false) => {
        if (silent) setRefreshing(true);
        setError('');
        try {
            // Three small answers: the counts, the hourly volume (grouped by the database) and provider health.
            const [k, v, h] = await Promise.all([
                getDashboardKpis(), api.get('/admin/dashboard/volume').catch(() => null), getProviderHealth().catch(() => ({ data: [] })),
            ]);
            setKpis(k.data?.data || k.data || {});
            setVolume(v ? (v.data?.data || v.data) : null);
            const hd = h.data?.data || h.data || [];
            setProviders(Array.isArray(hd) ? hd : []);
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

    const hours = volume?.hours || new Date().getHours() + 1;
    const labels = Array.from({ length: hours }, (_, i) => `${String(i).padStart(2, '0')}:00`);
    const zero = new Array(hours).fill(0);
    const series = useMemo(() => {
        const t = volume?.today || {};
        return { all: t.all || zero, completed: t.completed || zero, pending: t.pending || zero, failed: t.failed || zero,
            attention: t.attention || zero, revenue: t.revenueUsd || zero };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [volume, hours]);
    // Against the same time yesterday (counted by the database).
    const y = volume?.yesterdaySoFar;
    const cmp = (now, key) => (y && y[key] ? { now, before: y[key] } : null);
    const n = (v) => (v === null || v === undefined ? '—' : Number(v).toLocaleString('en-US'));

    const revenue = kpis?.revenueByCurrency || {};
    const otherRevenue = Object.entries(revenue).filter(([c, v]) => c !== 'USD' && v);

    const cards = [
        { label: 'Total Today', value: n(kpis?.totalTransactionsToday), color: '#1D6FE8', icon: Activity, spark: cumulative(series.all),
          trend: cmp(sum(series.all), 'all') },
        { label: 'Completed', value: n(kpis?.completedToday), color: '#16A34A', icon: CheckCircle2, spark: cumulative(series.completed), trend: cmp(sum(series.completed), 'completed') },
        { label: 'Pending Payment', value: n(kpis?.pendingPayment), color: '#E8930C', icon: Clock, spark: series.pending, trend: cmp(sum(series.pending), 'pending') },
        { label: 'Need Attention', value: n(kpis?.needAttention), color: '#E5484D', icon: AlertTriangle, spark: series.attention, trend: null, to: '/attention' },
        { label: 'Failed', value: n(kpis?.failedToday), color: '#E5484D', icon: XCircle, spark: cumulative(series.failed), trend: cmp(sum(series.failed), 'failed') },
        { label: 'Revenue Today', value: money(revenue.USD || 0), color: '#7C5CFA', icon: DollarSign, spark: cumulative(series.revenue),
          trend: cmp(sum(series.revenue), 'revenueUsd'),
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
                    <h1>Dashboard</h1>
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

        </div>
    );
}
