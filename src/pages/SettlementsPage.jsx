import { ExportArea } from '../components/kit';
import { useState, useEffect } from 'react';
import { Landmark, RefreshCw, Play } from 'lucide-react';
import { getSettlements, runSettlements, markSettlementPaid, formatAmount, formatDate } from '../lib/api';
import toast from 'react-hot-toast';

const STATUS_BADGE = { PENDING: 'badge-amber', PROCESSING: 'badge-blue', PAID: 'badge-green' };

function MarkPaidModal({ settlement, onClose, onDone }) {
    const [reference, setReference] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await markSettlementPaid(settlement.id, reference);
            toast.success('Marked as paid');
            onDone();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to mark as paid');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
            <form onSubmit={submit} onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 420, border: '1px solid var(--border)' }}>
                <h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 4 }}>Mark settlement #{settlement.id} as paid</h2>
                <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 18 }}>
                    {settlement.merchantName} — {formatAmount(settlement.netAmountCents, settlement.currency)}
                </p>
                <label style={{ fontSize: 12.5, fontWeight: 700, display: 'block', marginBottom: 6 }}>Payout reference</label>
                <input value={reference} onChange={e => setReference(e.target.value)} placeholder="Bank transfer ref, EcoCash txn ID, etc." required
                    style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)', marginBottom: 20 }} />
                <div style={{ display: 'flex', gap: 10 }}>
                    <button type="button" onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
                    <button type="submit" disabled={submitting} className="btn btn-primary" style={{ flex: 1 }}>
                        {submitting ? 'Saving…' : 'Mark paid'}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default function SettlementsPage() {
    const [settlements, setSettlements] = useState([]);
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [loading, setLoading] = useState(true);
    const [running, setRunning] = useState(false);
    const [payTarget, setPayTarget] = useState(null);

    const load = () => {
        setLoading(true);
        getSettlements()
            .then(res => setSettlements(res.data?.data || []))
            .finally(() => setLoading(false));
    };

    useEffect(load, []);

    const filtered = statusFilter === 'ALL' ? settlements : settlements.filter(s => s.status === statusFilter);

    const runNow = async () => {
        setRunning(true);
        try {
            const res = await runSettlements(1);
            const count = res.data?.data?.settlementsCreated ?? 0;
            toast.success(`${count} settlement${count === 1 ? '' : 's'} created`);
            load();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Settlement run failed');
        } finally {
            setRunning(false);
        }
    };

    return (
        <div className="op-page">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 22, fontWeight: 800 }}>
                        <Landmark size={22} /> Settlements
                    </h1>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-primary" onClick={runNow} disabled={running}>
                        <Play size={14} /> {running ? 'Running…' : 'Run settlement now'}
                    </button>
                    <button className="btn btn-ghost" onClick={load}><RefreshCw size={14} /> Refresh</button>
                </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                {['ALL', 'PENDING', 'PROCESSING', 'PAID'].map(s => (
                    <button key={s} onClick={() => setStatusFilter(s)}
                        className={statusFilter === s ? 'btn btn-primary' : 'btn btn-ghost'}
                        style={{ padding: '8px 16px', fontSize: 13 }}>{s}</button>
                ))}
            </div>

            {loading ? (
                <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-2)' }}>Loading…</div>
            ) : filtered.length === 0 ? (
                <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-2)' }}>No settlements{statusFilter !== 'ALL' ? ` with status ${statusFilter}` : ''}.</div>
            ) : (
                <div className="card" style={{ padding: 0 }}>
                    <ExportArea name="Settlements"><table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', fontSize: 11.5, textTransform: 'uppercase', color: 'var(--text-2)' }}>
                                <th style={{ padding: '12px 16px' }}>Merchant</th>
                                <th style={{ padding: '12px 16px' }}>Period</th>
                                <th style={{ padding: '12px 16px' }}>Txns</th>
                                <th style={{ padding: '12px 16px' }}>Net payout</th>
                                <th style={{ padding: '12px 16px' }}>Status</th>
                                <th style={{ padding: '12px 16px' }}>Reference</th>
                                <th style={{ padding: '12px 16px' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(s => (
                                <tr key={s.id} style={{ borderTop: '1px solid var(--border)' }}>
                                    <td style={{ padding: '12px 16px', fontWeight: 700 }}>{s.merchantName}</td>
                                    <td style={{ padding: '12px 16px', color: 'var(--text-2)', fontSize: 12.5 }}>
                                        {formatDate(s.periodStart)} – {formatDate(s.periodEnd)}
                                    </td>
                                    <td style={{ padding: '12px 16px', color: 'var(--text-2)' }}>{s.sessionCount}</td>
                                    <td style={{ padding: '12px 16px', fontWeight: 700 }}>{formatAmount(s.netAmountCents, s.currency)}</td>
                                    <td style={{ padding: '12px 16px' }}><span className={`badge ${STATUS_BADGE[s.status] || 'badge-gray'}`}>{s.status}</span></td>
                                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 12, color: 'var(--text-2)' }}>{s.payoutReference || '—'}</td>
                                    <td style={{ padding: '12px 16px' }}>
                                        {(s.status === 'PENDING' || s.status === 'PROCESSING') && (
                                            <button onClick={() => setPayTarget(s)} className="btn btn-primary" style={{ fontSize: 12 }}>Mark paid</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table></ExportArea>
                </div>
            )}

            {payTarget && <MarkPaidModal settlement={payTarget} onClose={() => setPayTarget(null)} onDone={load} />}
        </div>
    );
}
