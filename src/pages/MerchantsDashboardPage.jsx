import { ExportArea } from '../components/kit';
import { useState, useEffect } from 'react';
import { Building2, TrendingUp, DollarSign, ShieldAlert, Trophy, RefreshCw } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { getMerchantDashboard, formatAmount } from '../lib/api';

function StatCard({ icon: Icon, label, value, sub }) {
    return (
        <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-2)', fontSize: 12, fontWeight: 700, marginBottom: 10 }}>
                <Icon size={14} /> {label}
            </div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{value}</div>
            {sub && <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 4 }}>{sub}</div>}
        </div>
    );
}

export default function MerchantsDashboardPage() {
    const [data, setData] = useState(null);
    const [days, setDays] = useState(30);
    const [loading, setLoading] = useState(true);

    const load = () => {
        setLoading(true);
        getMerchantDashboard(days).then(res => setData(res.data?.data || res.data)).finally(() => setLoading(false));
    };

    useEffect(load, [days]);

    if (loading || !data) {
        return <div style={{ padding: 32 }}><div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-2)' }}>Loading…</div></div>;
    }

    const trend = (data.trend || []).map(d => ({ date: d.date.slice(5), gross: (d.grossCents || 0) / 100 }));
    const currencies = Object.entries(data.volumeByCurrency || {});
    const disputeTotal = data.totalDisputes || 0;
    const openDisputes = (data.disputesByStatus?.OPEN || 0) + (data.disputesByStatus?.NEEDS_RESPONSE || 0);

    return (
        <div className="op-page">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 22, fontWeight: 800 }}>
                        <Building2 size={22} /> Merchants Dashboard
                    </h1>
                </div>
                <button className="btn btn-ghost" onClick={load}><RefreshCw size={14} /> Refresh</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 20 }}>
                <StatCard icon={Building2} label="Total Merchants" value={data.totalMerchants}
                    sub={Object.entries(data.merchantsByStatus || {}).map(([s, c]) => `${c} ${s.toLowerCase()}`).join(' · ')} />
                <StatCard icon={TrendingUp} label="Paid Transactions" value={data.paidTransactionCount}
                    sub={`${data.failedTransactionCount} failed`} />
                <StatCard icon={ShieldAlert} label="Disputes" value={disputeTotal} sub={`${openDisputes} open`} />
                <StatCard icon={DollarSign} label="Total Commission"
                    value={currencies.length > 0 ? currencies.map(([c, t]) => formatAmount(t.commissionCents, c)).join(' + ') : formatAmount(0, 'USD')}
                    sub="Across every currency" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 20 }}>
                {currencies.length === 0 ? (
                    <div className="card" style={{ padding: 20, color: 'var(--text-2)' }}>No paid volume yet.</div>
                ) : currencies.map(([currency, totals]) => (
                    <div key={currency} className="card" style={{ padding: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-2)', fontSize: 12, fontWeight: 700, marginBottom: 10 }}>
                            <DollarSign size={14} /> {currency} VOLUME
                        </div>
                        <div style={{ fontSize: 22, fontWeight: 800 }}>{formatAmount(totals.grossCents, currency)}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 4 }}>Commission: {formatAmount(totals.commissionCents, currency)}</div>
                    </div>
                ))}
            </div>

            <div className="card" style={{ padding: '20px 22px', marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h2 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>Volume trend</h2>
                    <div style={{ display: 'flex', gap: 6 }}>
                        {[7, 30, 90].map(d => (
                            <button key={d} onClick={() => setDays(d)} className={days === d ? 'btn btn-primary' : 'btn btn-ghost'} style={{ fontSize: 12, padding: '6px 12px' }}>{d}d</button>
                        ))}
                    </div>
                </div>
                {trend.every(t => t.gross === 0) ? (
                    <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-faint)', fontSize: 13 }}>No paid volume in this period.</div>
                ) : (
                    <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={trend}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                            <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-faint)' }} />
                            <YAxis tick={{ fontSize: 11, fill: 'var(--text-faint)' }} />
                            <Tooltip formatter={(v) => `$${v.toFixed(2)}`} />
                            <Line type="monotone" dataKey="gross" stroke="var(--blue)" strokeWidth={2.5} dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </div>

            <div className="card" style={{ padding: 0 }}>
                <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--border)' }}>
                    <h2 style={{ fontSize: 15, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Trophy size={16} /> Top merchants by volume
                    </h2>
                </div>
                {(data.leaderboard || []).length === 0 ? (
                    <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-2)' }}>No paid transactions yet.</div>
                ) : (
                    <ExportArea name="Merchants dashboard"><table>
                        <thead><tr><th>Rank</th><th>Merchant</th><th>Gross volume</th></tr></thead>
                        <tbody>
                            {data.leaderboard.map((m, i) => (
                                <tr key={m.merchantId}>
                                    <td style={{ color: 'var(--text-2)' }}>#{i + 1}</td>
                                    <td style={{ fontWeight: 700 }}>{m.merchantName}</td>
                                    <td>{formatAmount(m.grossCents, 'USD')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table></ExportArea>
                )}
            </div>
        </div>
    );
}
