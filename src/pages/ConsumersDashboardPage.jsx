import { useState, useEffect } from 'react';
import { Users, TrendingUp, DollarSign, UserCheck, RefreshCw, PieChart as PieIcon } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import { getConsumerDashboard, formatAmount } from '../lib/api';

const COLORS = ['#06A3DA', '#34AD54', '#F59E0B', '#8B5CF6'];

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

export default function ConsumersDashboardPage() {
    const [data, setData] = useState(null);
    const [days, setDays] = useState(30);
    const [loading, setLoading] = useState(true);

    const load = () => {
        setLoading(true);
        getConsumerDashboard(days).then(res => setData(res.data?.data || res.data)).finally(() => setLoading(false));
    };

    useEffect(load, [days]);

    if (loading || !data) {
        return <div style={{ padding: 32 }}><div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-2)' }}>Loading…</div></div>;
    }

    const signupTrend = (data.signupTrend || []).map(d => ({ date: d.date.slice(5), signups: d.signups }));
    const txTrend = (data.transactionTrend || []).map(d => ({ date: d.date.slice(5), count: d.count }));
    const currencies = Object.entries(data.volumeByCurrency || {});
    const productData = Object.entries(data.productBreakdown || {}).map(([name, value]) => ({ name, value }));

    return (
        <div style={{ padding: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 22, fontWeight: 800 }}>
                        <Users size={22} /> Consumers Dashboard
                    </h1>
                </div>
                <button className="btn btn-ghost" onClick={load}><RefreshCw size={14} /> Refresh</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 20 }}>
                <StatCard icon={Users} label="Total Consumers" value={data.totalConsumers} />
                <StatCard icon={UserCheck} label="Active" value={data.activeConsumers} sub={`${data.verifiedConsumers} verified`} />
                <StatCard icon={TrendingUp} label="Transactions" value={Object.values(data.transactionCountByCurrency || {}).reduce((a, b) => a + b, 0)} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 20 }}>
                {currencies.length === 0 ? (
                    <div className="card" style={{ padding: 20, color: 'var(--text-2)' }}>No completed transactions yet.</div>
                ) : currencies.map(([currency, cents]) => (
                    <div key={currency} className="card" style={{ padding: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-2)', fontSize: 12, fontWeight: 700, marginBottom: 10 }}>
                            <DollarSign size={14} /> {currency} VOLUME
                        </div>
                        <div style={{ fontSize: 22, fontWeight: 800 }}>{formatAmount(cents, currency)}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginBottom: 20 }}>
                <div className="card" style={{ padding: '20px 22px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h2 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>Signups &amp; transactions</h2>
                        <div style={{ display: 'flex', gap: 6 }}>
                            {[7, 30, 90].map(d => (
                                <button key={d} onClick={() => setDays(d)} className={days === d ? 'btn btn-primary' : 'btn btn-ghost'} style={{ fontSize: 12, padding: '6px 12px' }}>{d}d</button>
                            ))}
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={signupTrend.map((s, i) => ({ ...s, count: txTrend[i]?.count || 0 }))}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                            <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-faint)' }} />
                            <YAxis tick={{ fontSize: 11, fill: 'var(--text-faint)' }} />
                            <Tooltip />
                            <Line type="monotone" dataKey="signups" name="New signups" stroke="var(--green)" strokeWidth={2.5} dot={false} />
                            <Line type="monotone" dataKey="count" name="Transactions" stroke="var(--blue)" strokeWidth={2.5} dot={false} />
                            <Legend wrapperStyle={{ fontSize: 12 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                <div className="card" style={{ padding: '20px 22px' }}>
                    <h2 style={{ fontSize: 15, fontWeight: 800, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <PieIcon size={16} /> By product
                    </h2>
                    {productData.length === 0 ? (
                        <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-faint)', fontSize: 13 }}>No completed transactions yet.</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie data={productData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} paddingAngle={2}>
                                    {productData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Pie>
                                <Tooltip />
                                <Legend wrapperStyle={{ fontSize: 11.5 }} />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>
        </div>
    );
}
