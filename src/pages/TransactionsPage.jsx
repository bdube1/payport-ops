import { CurrencySelect, ExportArea } from '../components/kit';
import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import TransactionDrawer from '../components/TransactionDrawer';
import { Search, Download, RefreshCw, X, AlertTriangle } from 'lucide-react';
import { searchTransactions, formatDate, STATUS_CONFIG, opsExtraApi } from '../lib/api';

const STATUSES = ['', 'INITIATED', 'PAYMENT_PENDING', 'PAYMENT_CONFIRMED', 'FULFILMENT_PENDING', 'FULFILMENT_RETRY', 'FULFILMENT_FAILED', 'COMPLETED', 'PAYMENT_FAILED', 'PAYMENT_TIMEOUT', 'REFUND_PENDING', 'REFUNDED', 'MANUAL_FULFILMENT'];
const PRODUCTS = ['', 'AIRTIME_ECONET', 'AIRTIME_NETONE', 'AIRTIME_TELECEL', 'ZESA_TOKEN', 'DSTV_RENEWAL', 'TELONE_BILL'];

function fmt(amountCents, currency = 'USD') {
    const val = (amountCents / 100).toFixed(2);
    return currency === 'USD' ? `$${val}` : `ZWG ${val}`;
}

export default function TransactionsPage() {
    const [txs, setTxs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [page, setPage] = useState(0);
    const [error, setError] = useState('');
    const [params] = useSearchParams();
    const [open, setOpen] = useState(null);

    const [filters, setFilters] = useState({
        reference: '', status: '', customerPhone: '', recipientIdentifier: '',
        productTypeCode: '', providerReference: '', paymentCorrelator: '',
        dateFrom: '', dateTo: '', currency: '', payportOnly: false,
    });

    const load = useCallback(async (p = 0, f = filters) => {
        setLoading(true); setError('');
        const params = { page: p, size: 20 };
        Object.entries(f).forEach(([k, v]) => { if (v) params[k] = v; });
        try {
            const r = await searchTransactions(params);
            const data = r.data?.data || {};
            setTxs(data.content || []);
            setTotal(data.totalElements || 0);
            setTotalPages(data.totalPages || 0);
            setPage(p);
        } catch (e) {
            setError(e.response?.data?.message || 'Failed to load transactions');
        } finally { setLoading(false); }
    }, [filters]);

    // ?q= from the top-bar search (a phone number or a reference), ?status= from Reports.
    useEffect(() => {
        const q = (params.get('q') || '').trim();
        const status = params.get('status') || '';
        const next = { ...filters, status };
        if (q) {
            if (/^\+?[0-9 ]{7,}$/.test(q)) next.customerPhone = q.replace(/\s/g, '');
            else next.reference = q;
        }
        setFilters(next);
        load(0, next);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params]);

    const updateFilter = (key, val) => setFilters(f => ({ ...f, [key]: val }));

    const clearFilters = () => {
        const empty = Object.fromEntries(Object.keys(filters).map(k => [k, '']));
        setFilters(empty);
        load(0, empty);
    };

    const hasFilters = Object.values(filters).some(v => v);

    // Every record matching the filters, from the gateway; falls back to the page on screen.
    const exportCSV = async () => {
        try {
            const params = Object.fromEntries(['customerPhone', 'recipientIdentifier', 'status', 'productTypeCode', 'dateFrom', 'dateTo']
                .filter(k => filters[k]).map(k => [k, filters[k]]));
            const r = await opsExtraApi.exportTransactionsCsv(params);
            const a = document.createElement('a');
            a.href = URL.createObjectURL(r.data instanceof Blob ? r.data : new Blob([r.data], { type: 'text/csv' }));
            a.download = `payport-transactions-${new Date().toISOString().slice(0,10)}.csv`;
            a.click();
            return;
        } catch { /* fall through to the page export */ }
        exportPageCSV();
    };
    const exportPageCSV = () => {
        if (!txs.length) return;
        const headers = ['Reference', 'Status', 'Customer Phone', 'Recipient', 'Product', 'Amount', 'Currency', 'Payment Method', 'Provider Ref', 'Date'];
        const rows = txs.map(t => [
            t.reference, t.status, t.customerPhone || '', t.recipientIdentifier || '',
            t.productTypeCode || '', fmt(t.amountCents || 0, t.currency),
            t.currency || 'USD', t.paymentMethodCode || '', t.providerReference || '', formatDate(t.createdAt),
        ]);
        const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
        a.download = `payport-transactions-${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
    };

    const exportPDF = () => {
        const w = window.open('', '_blank');
        w.document.write(`
      <html><head><title>Payport Transactions Report</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; }
        .header { display: flex; align-items: center; gap: 20px; border-bottom: 3px solid #06A3DA; padding-bottom: 16px; margin-bottom: 20px; }
        .header img { height: 50px; }
        .meta { color: #5a7a91; font-size: 11px; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #06A3DA; color: white; padding: 8px 10px; text-align: left; font-size: 11px; }
        td { padding: 7px 10px; border-bottom: 1px solid #eee; }
        tr:nth-child(even) td { background: #f4f8fb; }
        .footer { margin-top: 20px; text-align: center; font-size: 10px; color: #888; border-top: 1px solid #eee; padding-top: 12px; }
        @media print { button { display: none; } }
      </style></head><body>
      <div class="header">
        <img src="${window.location.origin}/images/brand/lockup.png" alt="Payport" style="height:44px;object-fit:contain;margin-right:8px" onerror="this.style.display='none'" />
        <div>
          <h2 style="color:#091E3E;margin:0">Payport Financial Services</h2>
          <p style="color:#5a7a91;margin:4px 0 0;font-size:12px">232 Herbert Chitepo Ave, Harare · support@payport.africa · www.payport.africa</p>
        </div>
      </div>
      <h3>Transactions Report</h3>
      <div class="meta">Generated: ${new Date().toLocaleString()} · Total records: ${total} · Showing: ${txs.length}</div>
      <ExportArea name="Transactions"><table>
        <thead><tr><th>Reference</th><th>Status</th><th>Customer</th><th>Recipient</th><th>Product</th><th>Amount</th><th>Currency</th><th>Payment Method</th><th>Provider Ref</th><th>Date</th></tr></thead>
        <tbody>
          ${txs.map(t => `
          <tr>
            <td>${t.reference}</td>
            <td>${t.status}</td>
            <td>${t.customerPhone || '—'}</td>
            <td>${t.recipientIdentifier || '—'}</td>
            <td>${t.productTypeCode || '—'}</td>
            <td>${fmt(t.amountCents || 0, t.currency)}</td>
            <td>${t.currency || 'USD'}</td>
            <td>${t.paymentMethodCode || '—'}</td>
            <td>${t.providerReference || '—'}</td>
            <td>${formatDate(t.createdAt)}</td>
          </tr>
          `).join('')}
        </tbody>
      </table></ExportArea>
      <div class="footer">
        © ${new Date().getFullYear()} Payport Financial Services · CONFIDENTIAL · This report is intended for authorised personnel only.
        <br/><strong>PAYPORT DIGITAL STAMP</strong> · Generated ${new Date().toISOString()}
      </div>
      <button onclick="window.print()" style="margin-top:16px;padding:10px 20px;background:#06A3DA;color:white;border:none;border-radius:6px;cursor:pointer;font-size:13px">Print / Save as PDF</button>
      </body></html>
    `);
        w.document.close();
    };

    // Calculate totals by currency for display
    const totalsByCurrency = {};
    txs.forEach(t => {
        const currency = t.currency || 'USD';
        if (!totalsByCurrency[currency]) totalsByCurrency[currency] = 0;
        if (t.status === 'COMPLETED') {
            totalsByCurrency[currency] += (t.amountCents || 0);
        }
    });

    return (
        <div className="op-page">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 800 }}>Transactions</h1>
                    <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>
                        {loading ? 'Loading...' : `${total.toLocaleString()} records found`}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={exportCSV} className="btn btn-ghost">
                        <Download size={14} /> CSV
                    </button>
                    <button onClick={exportPDF} className="btn btn-ghost" disabled={!txs.length}>
                        <Download size={14} /> PDF
                    </button>
                    <button onClick={() => load(0)} className="btn btn-ghost">
                        <RefreshCw size={14} /> Refresh
                    </button>
                </div>
            </div>

            {/* Summary by Currency */}
            {Object.keys(totalsByCurrency).length > 0 && (
                <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
                    {Object.entries(totalsByCurrency).map(([currency, cents]) => (
                        <div key={currency} className="card" style={{ padding: '16px 24px', textAlign: 'center' }}>
                            <div style={{ fontSize: 24, fontWeight: 900, color: currency === 'USD' ? 'var(--blue)' : 'var(--amber)' }}>
                                {currency === 'USD' ? '$' : 'ZWG '}{(cents / 100).toFixed(2)}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-2)' }}>Total ({currency})</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Filters */}
            <div style={{ background: 'var(--bg-card)', borderRadius: 14, padding: '20px 24px', marginBottom: 24, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Search size={14} /> Search Filters
                    </h3>
                    {hasFilters && (
                        <button onClick={clearFilters} className="btn btn-ghost" style={{ fontSize: 12 }}>
                            <X size={12} /> Clear all
                        </button>
                    )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                    {[
                        ['reference', 'Reference (PP-WEB-...)'],
                        ['customerPhone', 'Customer / Source Phone'],
                        ['recipientIdentifier', 'Recipient Phone'],
                        ['providerReference', 'Provider Reference'],
                    ].map(([key, label]) => (
                        <div key={key}>
                            <label style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 600, display: 'block', marginBottom: 5 }}>{label}</label>
                            <input value={filters[key]} onChange={e => updateFilter(key, e.target.value)}
                                   placeholder={label} style={{ width: '100%' }} />
                        </div>
                    ))}
                    <div>
                        <label style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 600, display: 'block', marginBottom: 5 }}>Currency</label>
                        <CurrencySelect value={filters.currency} onChange={v => updateFilter('currency', v)} allLabel="All currencies" style={{ width: '100%' }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                        <label style={{ fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', paddingBottom: 9 }}>
                            <input type="checkbox" checked={filters.payportOnly} onChange={e => updateFilter('payportOnly', e.target.checked)} style={{ width: 'auto' }} />
                            <span>Payport only <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>(exclude merchant checkouts)</span></span>
                        </label>
                    </div>
                    <div>
                        <label style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 600, display: 'block', marginBottom: 5 }}>Status</label>
                        <select value={filters.status} onChange={e => updateFilter('status', e.target.value)} style={{ width: '100%' }}>
                            {STATUSES.map(s => <option key={s} value={s}>{s || 'All statuses'}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 600, display: 'block', marginBottom: 5 }}>Product</label>
                        <select value={filters.productTypeCode} onChange={e => updateFilter('productTypeCode', e.target.value)} style={{ width: '100%' }}>
                            {PRODUCTS.map(s => <option key={s} value={s}>{s || 'All products'}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 600, display: 'block', marginBottom: 5 }}>Date From</label>
                        <input type="datetime-local" value={filters.dateFrom} onChange={e => updateFilter('dateFrom', e.target.value)} style={{ width: '100%' }} />
                    </div>
                    <div>
                        <label style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 600, display: 'block', marginBottom: 5 }}>Date To</label>
                        <input type="datetime-local" value={filters.dateTo} onChange={e => updateFilter('dateTo', e.target.value)} style={{ width: '100%' }} />
                    </div>
                </div>
                <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
                    <button onClick={() => load(0)} className="btn btn-primary">
                        <Search size={13} /> Search
                    </button>
                </div>
            </div>

            {/* Table */}
            {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: 'var(--red)', fontSize: 13 }}><AlertTriangle size={16} style={{ flexShrink: 0 }} /> {error}</div>
            )}
            <div className="card" style={{ overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ padding: 60, textAlign: 'center', display: 'flex', justifyContent: 'center', gap: 12, alignItems: 'center', color: 'var(--text-2)' }}>
                        <div className="spinner" /> Loading transactions...
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <ExportArea name="Transactions"><table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                            <tr>
                                <th>Date & Time</th>
                                <th>Reference</th>
                                <th>Customer</th>
                                <th>Recipient</th>
                                <th>Service</th>
                                <th>Provider</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                            </thead>
                            <tbody>
                            {txs.length === 0 ? (
                                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 48, color: 'var(--text-2)' }}>No transactions found</td></tr>
                            ) : txs.map(tx => {
                                const sc = STATUS_CONFIG[tx.status] || { label: tx.status, badge: 'badge-gray' };
                                return (
                                    <tr key={tx.reference}>
                                        <td style={{ color: 'var(--text-2)', whiteSpace: 'nowrap' }}>{formatDate(tx.createdAt)}</td>
                                        <td className="mono" style={{ whiteSpace: 'nowrap' }}>{tx.reference}</td>
                                        <td style={{ whiteSpace: 'nowrap' }}><div style={{ fontWeight: 600 }}>{tx.customerName || tx.customerPhone || '—'}</div>{tx.customerName && <div style={{ fontSize: 11.5, color: 'var(--text-2)' }}>{tx.customerPhone}</div>}</td>
                                        <td>{tx.recipientIdentifier || '—'}</td>
                                        <td>{tx.productName || tx.productTypeCode || '—'}</td>
                                        <td>{tx.paymentMethodName || tx.paymentMethodCode || '—'}{tx.providerReference && <div className="mono" style={{ fontSize: 11, color: 'var(--text-2)' }}>{tx.providerReference}</div>}</td>
                                        <td style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{fmt(tx.amountCents || 0, tx.currency)}</td>
                                        <td><span className={`badge ${sc.badge}`}>{sc.label}</span></td>
                                        <td><button className="btn btn-ghost btn-sm" onClick={() => setOpen(tx.reference)}>View</button></td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table></ExportArea>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
                    <button onClick={() => load(page-1)} disabled={page === 0} className="btn btn-ghost">← Previous</button>
                    <span style={{ padding: '8px 16px', fontSize: 13, color: 'var(--text-2)' }}>Page {page+1} of {totalPages}</span>
                    <button onClick={() => load(page+1)} disabled={page >= totalPages-1} className="btn btn-ghost">Next →</button>
                </div>
            )}
            {open && <TransactionDrawer reference={open} onClose={() => setOpen(null)} onChanged={() => load(page)} />}
        </div>
    );
}