import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { X, Receipt, RotateCcw, Download, Check, Clock, AlertTriangle } from 'lucide-react';
import { getTransaction, getTransactionTimeline, retryFulfilment, formatDate, STATUS_CONFIG } from '../lib/api';

const money = (cents, ccy = 'USD') => `${ccy === 'USD' ? '$' : (ccy === 'ZWL' ? 'ZWG' : ccy) + ' '}${(Number(cents || 0) / 100).toFixed(2)}`;
const RETRYABLE = ['FULFILMENT_FAILED', 'FULFILMENT_RETRY', 'MANUAL_FULFILMENT'];
const PENDING_STEP = ['INITIATED', 'PAYMENT_PENDING', 'FULFILMENT_PENDING', 'FULFILMENT_RETRY', 'REFUND_PENDING'];
const BAD = ['PAYMENT_FAILED', 'FULFILMENT_FAILED', 'PAYMENT_TIMEOUT', 'CANCELLED'];

async function receiptPdf(tx) {
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
    const doc = new jsPDF({ unit: 'pt', format: 'a5' });
    doc.setFontSize(15); doc.text('Payport — Transaction', 32, 40);
    doc.setFontSize(9); doc.text(`Printed ${new Date().toLocaleString()}`, 32, 56);
    const rows = [
        ['Reference', tx.reference], ['Status', (STATUS_CONFIG[tx.status] || {}).label || tx.status], ['Service', tx.productName || tx.productTypeCode || ''],
        ['Recipient', tx.recipientIdentifier || ''], ['Customer', tx.customerName || tx.customerPhone || ''], ['Payment method', tx.paymentMethodName || tx.paymentMethodCode || ''],
        ['Amount', money(tx.totalCents ?? tx.amountCents, tx.currency)], ['Provider reference', tx.providerReference || ''],
        ['Initiated', formatDate(tx.createdAt || tx.initiatedAt)], ['Completed', tx.completedAt ? formatDate(tx.completedAt) : ''],
    ].filter(r => r[1]);
    autoTable(doc, { body: rows, startY: 70, theme: 'plain', styles: { fontSize: 9, cellPadding: 4 }, columnStyles: { 0: { textColor: [100, 116, 139], cellWidth: 110 } } });
    doc.save(`payport-${tx.reference}.pdf`);
}

/** Side panel with a transaction's details, its timeline and the actions on it. */
export default function TransactionDrawer({ reference, onClose, onChanged }) {
    const navigate = useNavigate();
    const [tx, setTx] = useState(null);
    const [timeline, setTimeline] = useState([]);
    const [busy, setBusy] = useState(false);

    const load = async () => {
        try {
            const [a, b] = await Promise.all([getTransaction(reference), getTransactionTimeline(reference).catch(() => ({ data: [] }))]);
            setTx(a.data?.data || a.data);
            const t = b.data?.data || b.data || [];
            setTimeline(Array.isArray(t) ? t : []);
        } catch { setTx({ reference, error: true }); }
    };
    useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [reference]);
    useEffect(() => {
        const esc = (e) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', esc);
        return () => window.removeEventListener('keydown', esc);
    }, [onClose]);

    const retry = async () => {
        if (!window.confirm('Are you sure?')) return;
        setBusy(true);
        try { await retryFulfilment(reference); toast.success('Retry started'); await load(); onChanged?.(); }
        catch (e) { toast.error(e.response?.data?.message || e.response?.data?.error?.message || 'Retry failed'); }
        finally { setBusy(false); }
    };

    const sc = tx ? (STATUS_CONFIG[tx.status] || { label: tx.status, badge: 'badge-gray' }) : null;
    return (
        <>
            <div className="op-drawer-back" onClick={onClose} />
            <aside className="op-drawer" role="dialog" aria-label="Transaction details">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
                    <h2 style={{ fontSize: 16, fontWeight: 700 }}>Transaction Details</h2>
                    <button className="op-icon-btn" onClick={onClose} aria-label="Close"><X size={17} /></button>
                </div>
                {!tx ? <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}><div className="spinner" /></div> : tx.error ? (
                    <p style={{ padding: 22, color: 'var(--text-2)' }}>Could not load {reference}.</p>
                ) : (
                    <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 18 }}>
                        <div className="card" style={{ boxShadow: 'none' }}>
                            <dl className="op-kv" style={{ gridTemplateColumns: '110px 1fr 90px 1fr' }}>
                                <dt>Reference</dt><dd className="mono">{tx.reference}</dd>
                                <dt>Customer</dt><dd>{tx.customerName || tx.customerPhone || '—'}</dd>
                                <dt>Service</dt><dd>{tx.productName || tx.productTypeCode || '—'}</dd>
                                <dt>Initiated</dt><dd>{formatDate(tx.createdAt || tx.initiatedAt)}</dd>
                                <dt>Amount</dt><dd>{money(tx.totalCents ?? tx.amountCents, tx.currency)}</dd>
                                <dt>Status</dt><dd><span className={`badge ${sc.badge}`}>{sc.label}</span></dd>
                                <dt>Method</dt><dd>{tx.paymentMethodName || tx.paymentMethodCode || '—'}</dd>
                                <dt>Recipient</dt><dd>{tx.recipientIdentifier || '—'}</dd>
                                {tx.providerReference && <><dt>Provider ref</dt><dd className="mono" style={{ gridColumn: 'span 3' }}>{tx.providerReference}</dd></>}
                                {tx.failureReason && <><dt>Reason</dt><dd style={{ gridColumn: 'span 3', color: 'var(--pill-red)' }}>{tx.failureReason}</dd></>}
                            </dl>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 1fr)', gap: 16 }}>
                            <div className="card" style={{ boxShadow: 'none' }}>
                                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Transaction Timeline</h3>
                                {timeline.length === 0 && <p style={{ fontSize: 13, color: 'var(--text-2)' }}>No events.</p>}
                                <ul className="op-timeline">
                                    {[...timeline].reverse().map((e, i) => {
                                        const bad = BAD.includes(e.toStatus);
                                        const Icon = bad ? AlertTriangle : (PENDING_STEP.includes(e.toStatus) && i === 0 ? Clock : Check);
                                        return (
                                            <li key={i}>
                                                <span className="op-tl-dot" style={{ background: bad ? 'var(--badge-red)' : Icon === Clock ? 'var(--badge-amber)' : 'var(--badge-green)', color: bad ? 'var(--pill-red)' : Icon === Clock ? 'var(--pill-amber)' : 'var(--pill-green)' }}><Icon size={12} /></span>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontSize: 13, fontWeight: 600 }}>{(STATUS_CONFIG[e.toStatus] || {}).label || e.toStatus}</div>
                                                    <div style={{ fontSize: 11.5, color: 'var(--text-2)' }}>{formatDate(e.changedAt)}{e.actor ? ` · ${e.actor}` : ''}</div>
                                                    {e.notes && <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>{e.notes}</div>}
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                            <div className="card" style={{ boxShadow: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Actions</h3>
                                <button className="btn btn-outline" onClick={() => navigate(`/transactions/${encodeURIComponent(tx.reference)}`)}><Receipt size={15} /> View Receipt</button>
                                <button className="btn btn-outline" onClick={retry} disabled={busy || !RETRYABLE.includes(tx.status)}><RotateCcw size={15} /> Retry Transaction</button>
                                <button className="btn btn-outline" onClick={() => receiptPdf(tx).catch(() => toast.error('Could not create the PDF'))}><Download size={15} /> Download PDF</button>
                            </div>
                        </div>
                    </div>
                )}
            </aside>
        </>
    );
}
