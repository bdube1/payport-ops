import { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw, Plus } from 'lucide-react';
import { getDisputes, openDispute, resolveDispute, formatAmount, formatDate } from '../lib/api';
import toast from 'react-hot-toast';
import DisputeTimelines from '../components/DisputeTimelines';

const STATUS_BADGE = { OPEN: 'badge-amber', NEEDS_RESPONSE: 'badge-amber', WON: 'badge-green', LOST: 'badge-red' };

function OpenDisputeModal({ onClose, onDone }) {
    const [sessionId, setSessionId] = useState('');
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [type, setType] = useState('COMPLAINT');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const submit = async (e) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            const cents = Math.round(parseFloat(amount) * 100);
            await openDispute(Number(sessionId), cents, reason, type);
            toast.success('Dispute opened');
            onDone();
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Could not open dispute');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
            <form onSubmit={submit} onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 420, border: '1px solid var(--border)' }}>
                <h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 4 }}>Open a dispute</h2>
                <p style={{ fontSize: 12.5, color: 'var(--text-2)', marginBottom: 18 }}>Based on what the card network (via ZimSwitch) reports — not something a merchant self-reports.</p>
                {error && <div style={{ background: 'var(--badge-red)', color: 'var(--red)', padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 14 }}>{error}</div>}

                <label style={{ fontSize: 12.5, fontWeight: 700, display: 'block', marginBottom: 6 }}>Checkout session ID</label>
                <input type="number" value={sessionId} onChange={e => setSessionId(e.target.value)} required
                    style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)', marginBottom: 14 }} />

                <label style={{ fontSize: 12.5, fontWeight: 700, display: 'block', marginBottom: 6 }}>Disputed amount</label>
                <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required
                    style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)', marginBottom: 14 }} />

                <label style={{ fontSize: 12.5, fontWeight: 700, display: 'block', marginBottom: 6 }}>Type (sets the regulatory deadlines)</label>
                <select value={type} onChange={e => setType(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)', marginBottom: 14 }}>
                    <option value="COMPLAINT">Complaint (acknowledge 48h, resolve 10 working days)</option>
                    <option value="ERROR">Error (resolve within 48h, else notify RBZ)</option>
                    <option value="CHARGEBACK">Card chargeback</option>
                </select>

                <label style={{ fontSize: 12.5, fontWeight: 700, display: 'block', marginBottom: 6 }}>Reason</label>
                <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Fraud claim, item not received, etc."
                    style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)', marginBottom: 20 }} />

                <div style={{ display: 'flex', gap: 10 }}>
                    <button type="button" onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
                    <button type="submit" disabled={submitting} className="btn btn-primary" style={{ flex: 1 }}>
                        {submitting ? 'Opening…' : 'Open dispute'}
                    </button>
                </div>
            </form>
        </div>
    );
}

function ResolveModal({ dispute, onClose, onDone }) {
    const [status, setStatus] = useState('WON');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await resolveDispute(dispute.id, status, notes);
            toast.success('Dispute resolved');
            onDone();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not resolve');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
            <form onSubmit={submit} onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 420, border: '1px solid var(--border)' }}>
                <h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 18 }}>Resolve dispute #{dispute.id}</h2>

                <label style={{ fontSize: 12.5, fontWeight: 700, display: 'block', marginBottom: 6 }}>Outcome</label>
                <select value={status} onChange={e => setStatus(e.target.value)}
                    style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)', marginBottom: 14 }}>
                    <option value="WON">Won (merchant keeps the funds)</option>
                    <option value="LOST">Lost (funds returned to customer)</option>
                </select>

                <label style={{ fontSize: 12.5, fontWeight: 700, display: 'block', marginBottom: 6 }}>Evidence / notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                    style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)', marginBottom: 20, resize: 'vertical' }} />

                <div style={{ display: 'flex', gap: 10 }}>
                    <button type="button" onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
                    <button type="submit" disabled={submitting} className="btn btn-primary" style={{ flex: 1 }}>
                        {submitting ? 'Saving…' : 'Resolve'}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default function DisputesPage() {
    const [disputes, setDisputes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showOpen, setShowOpen] = useState(false);
    const [resolveTarget, setResolveTarget] = useState(null);

    const load = () => {
        setLoading(true);
        getDisputes()
            .then(res => setDisputes(res.data?.data || []))
            .finally(() => setLoading(false));
    };

    useEffect(load, []);

    return (
        <div style={{ padding: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 22, fontWeight: 800 }}>
                        <AlertTriangle size={22} /> Disputes
                    </h1>
                    <p style={{ color: 'var(--text-2)', fontSize: 14, marginTop: 4 }}>Card network chargebacks, tracked against the checkout session they concern</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-primary" onClick={() => setShowOpen(true)}><Plus size={14} /> Open dispute</button>
                    <button className="btn btn-ghost" onClick={load}><RefreshCw size={14} /> Refresh</button>
                </div>
            </div>

            {loading ? (
                <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-2)' }}>Loading…</div>
            ) : disputes.length === 0 ? (
                <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-2)' }}>No disputes.</div>
            ) : (
                <div className="card" style={{ padding: 0 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', fontSize: 11.5, textTransform: 'uppercase', color: 'var(--text-2)' }}>
                                <th style={{ padding: '12px 16px' }}>Session</th>
                                <th style={{ padding: '12px 16px' }}>Amount</th>
                                <th style={{ padding: '12px 16px' }}>Reason</th>
                                <th style={{ padding: '12px 16px' }}>Status</th>
                                <th style={{ padding: '12px 16px' }}>Opened</th>
                                <th style={{ padding: '12px 16px' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {disputes.map(d => (
                                <tr key={d.id} style={{ borderTop: '1px solid var(--border)' }}>
                                    <td style={{ padding: '12px 16px', fontFamily: 'monospace' }}>#{d.checkoutSessionId}</td>
                                    <td style={{ padding: '12px 16px', fontWeight: 700 }}>{formatAmount(d.amountCents)}</td>
                                    <td style={{ padding: '12px 16px', color: 'var(--text-2)' }}>{d.reason || '—'}</td>
                                    <td style={{ padding: '12px 16px' }}><span className={`badge ${STATUS_BADGE[d.status] || 'badge-gray'}`}>{d.status}</span></td>
                                    <td style={{ padding: '12px 16px', color: 'var(--text-2)', fontSize: 12.5 }}>{formatDate(d.createdAt)}</td>
                                    <td style={{ padding: '12px 16px' }}>
                                        {(d.status === 'OPEN' || d.status === 'NEEDS_RESPONSE') && (
                                            <button onClick={() => setResolveTarget(d)} className="btn btn-ghost" style={{ fontSize: 12 }}>Resolve</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div style={{ marginTop: 20 }}><DisputeTimelines /></div>

            {showOpen && <OpenDisputeModal onClose={() => setShowOpen(false)} onDone={load} />}
            {resolveTarget && <ResolveModal dispute={resolveTarget} onClose={() => setResolveTarget(null)} onDone={load} />}
        </div>
    );
}
