import { useState, useEffect } from 'react';
import { FileBarChart, Building2, Users, Landmark, RefreshCw } from 'lucide-react';
import { getConsolidatedReport, formatAmount } from '../lib/api';

function Section({ icon: Icon, title, children }) {
    return (
        <div className="card" style={{ padding: '20px 22px', marginBottom: 20 }}>
            <h2 style={{ fontSize: 15, fontWeight: 800, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon size={16} /> {title}
            </h2>
            {children}
        </div>
    );
}

function Stat({ label, value }) {
    return (
        <div>
            <div style={{ fontSize: 11.5, color: 'var(--text-2)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{value}</div>
        </div>
    );
}

export default function ConsolidatedReportPage() {
    const [data, setData] = useState(null);
    const [days, setDays] = useState(30);
    const [loading, setLoading] = useState(true);

    const load = () => {
        setLoading(true);
        getConsolidatedReport(days).then(res => setData(res.data?.data || res.data)).finally(() => setLoading(false));
    };

    useEffect(load, [days]);

    if (loading || !data) {
        return <div style={{ padding: 32 }}><div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-2)' }}>Loading…</div></div>;
    }

    const { merchants, consumers, settlements } = data;

    return (
        <div style={{ padding: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 22, fontWeight: 800 }}>
                        <FileBarChart size={22} /> Consolidated Report
                    </h1>
                    <p style={{ color: 'var(--text-2)', fontSize: 14, marginTop: 4 }}>One system-wide summary -- merchants, consumers, and settlements together.</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    {[7, 30, 90].map(d => (
                        <button key={d} onClick={() => setDays(d)} className={days === d ? 'btn btn-primary' : 'btn btn-ghost'} style={{ fontSize: 12.5, padding: '7px 14px' }}>{d}d</button>
                    ))}
                    <button className="btn btn-ghost" onClick={load}><RefreshCw size={14} /></button>
                </div>
            </div>

            <Section icon={Building2} title="Merchants">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 20, marginBottom: 16 }}>
                    <Stat label="Total merchants" value={merchants.totalMerchants} />
                    <Stat label="Paid transactions" value={merchants.paidTransactionCount} />
                    <Stat label="Failed transactions" value={merchants.failedTransactionCount} />
                    <Stat label="Disputes" value={merchants.totalDisputes} />
                </div>
                {Object.entries(merchants.volumeByCurrency || {}).map(([currency, totals]) => (
                    <div key={currency} style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 4 }}>
                        <strong style={{ color: 'var(--text)' }}>{currency}:</strong> {formatAmount(totals.grossCents, currency)} gross · {formatAmount(totals.commissionCents, currency)} commission
                    </div>
                ))}
            </Section>

            <Section icon={Users} title="Consumers">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 20, marginBottom: 16 }}>
                    <Stat label="Total consumers" value={consumers.totalConsumers} />
                    <Stat label="Active" value={consumers.activeConsumers} />
                    <Stat label="Verified" value={consumers.verifiedConsumers} />
                </div>
                {Object.entries(consumers.volumeByCurrency || {}).map(([currency, cents]) => (
                    <div key={currency} style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 4 }}>
                        <strong style={{ color: 'var(--text)' }}>{currency}:</strong> {formatAmount(cents, currency)} transacted
                    </div>
                ))}
            </Section>

            <Section icon={Landmark} title="Settlements">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 20, marginBottom: 16 }}>
                    <Stat label="Total settlements" value={settlements.totalSettlements} />
                    <Stat label="Paid out" value={settlements.paidOut} />
                    <Stat label="Awaiting payout" value={settlements.awaitingPayout} />
                </div>
                {Object.entries(settlements.netPaidByCurrency || {}).map(([currency, cents]) => (
                    <div key={currency} style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 4 }}>
                        <strong style={{ color: 'var(--text)' }}>{currency}:</strong> {formatAmount(cents, currency)} paid out to merchants
                    </div>
                ))}
            </Section>
        </div>
    );
}
