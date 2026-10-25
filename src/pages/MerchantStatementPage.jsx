import { ExportArea } from '../components/kit';
import { useState, useEffect } from 'react';
import { FileText, Download, RefreshCw } from 'lucide-react';
import { searchMerchantTransactions, formatAmount, formatDate } from '../lib/api';
import MerchantPicker from '../components/MerchantPicker';

const METHOD_LABELS = { ECOCASH: 'EcoCash', ONEMONEY: 'OneMoney', OMARI: 'Omari', ZIMSWITCH: 'Card (ZimSwitch)' };
const STATUS_BADGE = {
    PAID: 'badge-green', FAILED: 'badge-red', EXPIRED: 'badge-gray', CANCELLED: 'badge-gray',
    PENDING: 'badge-amber', CREATED: 'badge-gray', PARTIALLY_REFUNDED: 'badge-amber', REFUNDED: 'badge-red',
};

function todayIso() {
    return new Date().toISOString().slice(0, 10);
}
function daysAgoIso(days) {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().slice(0, 10);
}

export default function MerchantStatementPage() {
    const [selectedMerchant, setSelectedMerchant] = useState(null); // null = All merchants
    const [dateFrom, setDateFrom] = useState(daysAgoIso(30));
    const [dateTo, setDateTo] = useState(todayIso());
    const [transactions, setTransactions] = useState(null);
    const [loading, setLoading] = useState(false);

    const runStatement = () => {
        setLoading(true);
        searchMerchantTransactions({
            ...(selectedMerchant ? { merchantId: selectedMerchant.id } : {}),
            dateFrom: `${dateFrom}T00:00:00`,
            dateTo: `${dateTo}T23:59:59`,
        })
            .then(res => setTransactions(res.data?.data || res.data || []))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        runStatement();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedMerchant]);

    const summary = (transactions || []).reduce((acc, t) => {
        if (t.status !== 'PAID' && t.status !== 'PARTIALLY_REFUNDED' && t.status !== 'REFUNDED') return acc;
        const cur = t.currency;
        acc[cur] = acc[cur] || { gross: 0, commission: 0, net: 0, count: 0 };
        acc[cur].gross += t.amountCents || 0;
        acc[cur].commission += t.commissionAmountCents || 0;
        acc[cur].net += t.netAmountCents || 0;
        acc[cur].count += 1;
        return acc;
    }, {});

    const exportCsv = () => {
        if (!transactions) return;
        const headers = ['Reference', 'Description', 'Method', 'Amount', 'Currency', 'Commission', 'Net', 'Status', 'Customer', 'Date'];
        const rows = transactions.map(t => [
            t.reference, (t.description || '').replace(/,/g, ';'), METHOD_LABELS[t.paymentMethodCode] || t.paymentMethodCode || '',
            (t.amountCents / 100).toFixed(2), t.currency, ((t.commissionAmountCents || 0) / 100).toFixed(2),
            ((t.netAmountCents || 0) / 100).toFixed(2), t.status, t.customerPhone || t.customerEmail || '', t.createdAt,
        ]);
        const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(selectedMerchant?.businessName || 'all-merchants').replace(/\s+/g, '-')}-statement-${dateFrom}-to-${dateTo}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="op-page">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 22, fontWeight: 800 }}>
                        <FileText size={22} /> Merchant Statement
                    </h1>
                </div>
                <button onClick={exportCsv} disabled={!transactions || transactions.length === 0} className="btn btn-primary">
                    <Download size={14} /> Export CSV
                </button>
            </div>

            <div className="card" style={{ padding: 20, marginBottom: 20, display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 280px', minWidth: 260 }}>
                    <label style={{ fontSize: 11.5, color: 'var(--text-2)', fontWeight: 700, display: 'block', marginBottom: 6 }}>Merchant</label>
                    <MerchantPicker value={selectedMerchant} onSelect={setSelectedMerchant} includeAllOption />
                </div>
                <div>
                    <label style={{ fontSize: 11.5, color: 'var(--text-2)', fontWeight: 700, display: 'block', marginBottom: 6 }}>From</label>
                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                </div>
                <div>
                    <label style={{ fontSize: 11.5, color: 'var(--text-2)', fontWeight: 700, display: 'block', marginBottom: 6 }}>To</label>
                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                </div>
                <button onClick={runStatement} disabled={loading} className="btn btn-primary">
                    <RefreshCw size={14} /> {loading ? 'Running…' : 'Run statement'}
                </button>
            </div>

            {transactions !== null && (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 20 }}>
                        {Object.keys(summary).length === 0 ? (
                            <div className="card" style={{ padding: 20, color: 'var(--text-2)' }}>No paid transactions in this period.</div>
                        ) : Object.entries(summary).map(([currency, s]) => (
                            <div key={currency} className="card" style={{ padding: 20 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', marginBottom: 8 }}>{currency} — {s.count} transactions</div>
                                <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>{formatAmount(s.net, currency)} <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-2)' }}>net</span></div>
                                <div style={{ fontSize: 12, color: 'var(--text-2)' }}>Gross: {formatAmount(s.gross, currency)} · Commission: {formatAmount(s.commission, currency)}</div>
                            </div>
                        ))}
                    </div>

                    <div className="card" style={{ padding: 0 }}>
                        {loading ? (
                            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-2)' }}>Loading…</div>
                        ) : transactions.length === 0 ? (
                            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-2)' }}>No transactions in this period.</div>
                        ) : (
                            <ExportArea name="Merchant statement"><table>
                                <thead>
                                    <tr><th>Reference</th><th>Method</th><th>Amount</th><th>Commission</th><th>Net</th><th>Status</th><th>Date</th></tr>
                                </thead>
                                <tbody>
                                    {transactions.map(t => (
                                        <tr key={t.id}>
                                            <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{t.reference}</td>
                                            <td style={{ color: 'var(--text-2)' }}>{METHOD_LABELS[t.paymentMethodCode] || t.paymentMethodCode || '—'}</td>
                                            <td style={{ fontWeight: 700 }}>{formatAmount(t.amountCents, t.currency)}</td>
                                            <td style={{ color: 'var(--text-2)' }}>{t.commissionAmountCents ? formatAmount(t.commissionAmountCents, t.currency) : '—'}</td>
                                            <td>{t.netAmountCents ? formatAmount(t.netAmountCents, t.currency) : '—'}</td>
                                            <td><span className={`badge ${STATUS_BADGE[t.status] || 'badge-gray'}`}>{t.status}</span></td>
                                            <td style={{ color: 'var(--text-2)', fontSize: 12 }}>{formatDate(t.createdAt)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table></ExportArea>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
