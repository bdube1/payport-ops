import { ExportArea } from '../components/kit';
import { useState, useEffect } from 'react';
import { Percent, RefreshCw, Download } from 'lucide-react';
import { getCommissionReport, formatAmount } from '../lib/api';

export default function CommissionReportPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const load = () => {
        setLoading(true);
        getCommissionReport().then(res => setData(res.data?.data || res.data)).finally(() => setLoading(false));
    };

    useEffect(load, []);

    const exportCsv = () => {
        if (!data) return;
        const rows = [['Merchant', 'Currency', 'Commission', 'Transactions', 'Effective Rate']];
        data.perMerchant.forEach(m => {
            Object.entries(m.byCurrency).forEach(([currency, t]) => {
                rows.push([
                    m.merchantName, currency, (t.commissionCents / 100).toFixed(2), t.transactionCount,
                    m.effectiveCommissionBps != null ? `${(m.effectiveCommissionBps / 100).toFixed(2)}%` : 'default',
                ]);
            });
        });
        const csv = rows.map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `payport-commission-report-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (loading || !data) {
        return <div style={{ padding: 32 }}><div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-2)' }}>Loading…</div></div>;
    }

    const totals = Object.entries(data.totalCommissionByCurrency || {});

    return (
        <div className="op-page">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 22, fontWeight: 800 }}>
                        <Percent size={22} /> Commission Report
                    </h1>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={exportCsv} className="btn btn-ghost"><Download size={14} /> Export CSV</button>
                    <button onClick={load} className="btn btn-ghost"><RefreshCw size={14} /></button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
                {totals.length === 0 ? (
                    <div className="card" style={{ padding: 20, color: 'var(--text-2)' }}>No commission collected yet.</div>
                ) : totals.map(([currency, cents]) => (
                    <div key={currency} className="card" style={{ padding: 20 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', marginBottom: 8 }}>{currency} TOTAL COMMISSION</div>
                        <div style={{ fontSize: 26, fontWeight: 800 }}>{formatAmount(cents, currency)}</div>
                    </div>
                ))}
            </div>

            <div className="card" style={{ padding: 0 }}>
                <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--border)' }}>
                    <h2 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>By merchant</h2>
                </div>
                {(data.perMerchant || []).length === 0 ? (
                    <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-2)' }}>No commission collected yet.</div>
                ) : (
                    <ExportArea name="Commission report"><table>
                        <thead><tr><th>Merchant</th><th>Rate</th><th>Currency</th><th>Transactions</th><th>Commission</th></tr></thead>
                        <tbody>
                            {data.perMerchant.map(m => (
                                Object.entries(m.byCurrency).map(([currency, t], i) => (
                                    <tr key={`${m.merchantId}-${currency}`}>
                                        <td style={{ fontWeight: i === 0 ? 700 : 400, color: i === 0 ? 'var(--text)' : 'var(--text-faint)' }}>
                                            {i === 0 ? m.merchantName : ''}
                                        </td>
                                        <td style={{ color: 'var(--text-2)' }}>{i === 0 ? (m.effectiveCommissionBps != null ? `${(m.effectiveCommissionBps / 100).toFixed(2)}%` : 'platform default') : ''}</td>
                                        <td>{currency}</td>
                                        <td style={{ color: 'var(--text-2)' }}>{t.transactionCount}</td>
                                        <td style={{ fontWeight: 700 }}>{formatAmount(t.commissionCents, currency)}</td>
                                    </tr>
                                ))
                            ))}
                        </tbody>
                    </table></ExportArea>
                )}
            </div>
        </div>
    );
}
