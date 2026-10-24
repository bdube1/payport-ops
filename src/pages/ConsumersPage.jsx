import { ExportArea } from '../components/kit';
import { useState, useEffect } from 'react';
import { Users, RefreshCw, UserX, UserCheck, Lock, Unlock, KeyRound, Copy } from 'lucide-react';
import { getUsers, deactivateUser, activateUser, unlockUser, resetCustomerPin, formatDate } from '../lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '../lib/auth.jsx';

function ResetPinModal({ consumer, onClose, onDone }) {
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(true);

    useEffect(() => {
        resetCustomerPin(consumer.id)
            .then(res => setResult(res.data?.data || res.data))
            .catch(err => setError(err.response?.data?.message || 'Could not reset PIN'))
            .finally(() => setSubmitting(false));
    }, [consumer.id]);

    const copy = (text) => { navigator.clipboard.writeText(text); toast.success('Copied'); };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
            <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 360, border: '1px solid var(--border)' }}>
                {submitting ? (
                    <p style={{ fontSize: 13, color: 'var(--text-2)' }}>Resetting…</p>
                ) : error ? (
                    <>
                        <div style={{ background: 'var(--badge-red)', color: 'var(--red)', padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 16 }}>{error}</div>
                        <button onClick={onClose} className="btn btn-ghost" style={{ width: '100%' }}>Close</button>
                    </>
                ) : (
                    <>
                        <h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 4 }}>{consumer.fullName}'s PIN reset</h2>
                        <p style={{ fontSize: 12.5, color: 'var(--amber)', fontWeight: 700, marginBottom: 16 }}>{result.warning}</p>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                            <code style={{ flex: 1, padding: 12, background: 'var(--bg-2)', borderRadius: 8, fontSize: 22, letterSpacing: 8, textAlign: 'center' }}>{result.newPin}</code>
                            <button onClick={() => copy(result.newPin)} className="btn btn-ghost"><Copy size={14} /></button>
                        </div>
                        <button onClick={() => { onDone(); onClose(); }} className="btn btn-primary" style={{ width: '100%' }}>
                            I've told them — close
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

export default function ConsumersPage() {
    const { user: currentUser } = useAuth();
    const [consumers, setConsumers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [pinTarget, setPinTarget] = useState(null);

    const load = async () => {
        setLoading(true);
        try {
            const r = await getUsers();
            setConsumers((r.data?.data || []).filter(u => u.role === 'CUSTOMER'));
        } catch {
            toast.error('Failed to load consumers');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const handleDeactivate = async (u) => {
        if (!confirm(`Deactivate ${u.fullName}'s account?`)) return;
        try {
            await deactivateUser(u.id);
            toast.success('Account deactivated');
            load();
        } catch {
            toast.error('Failed to deactivate');
        }
    };

    const handleActivate = async (u) => {
        try {
            await activateUser(u.id);
            toast.success('Account activated');
            load();
        } catch {
            toast.error('Failed to activate');
        }
    };

    const handleUnlock = async (u) => {
        if (!confirm(`Unlock ${u.fullName}'s account?`)) return;
        try {
            await unlockUser(u.id);
            toast.success('Account unlocked');
            load();
        } catch (e) {
            toast.error(e.response?.data?.message || 'Failed to unlock');
        }
    };

    const filtered = consumers.filter(u => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return u.fullName?.toLowerCase().includes(q) || u.phone?.includes(q);
    });

    return (
        <div style={{ padding: 28, maxWidth: 1100 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Users size={22} /> Consumers
                    </h1>
                    <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4 }}>{consumers.length} consumers</p>
                </div>
                <button onClick={load} className="btn btn-ghost"><RefreshCw size={14} /> Refresh</button>
            </div>

            <input
                value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or phone…"
                style={{ width: '100%', maxWidth: 340, marginBottom: 20 }}
            />

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
            ) : (
                <div className="card" style={{ overflow: 'hidden' }}>
                    <ExportArea name="Consumers"><table>
                        <thead>
                            <tr><th>Name</th><th>Phone</th><th>Status</th><th>Verified</th><th>Last Login</th><th>Registered</th><th>Actions</th></tr>
                        </thead>
                        <tbody>
                            {filtered.map(u => (
                                <tr key={u.id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, var(--blue), var(--green))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                                                {u.fullName?.[0]?.toUpperCase()}
                                            </div>
                                            <span style={{ fontWeight: 600 }}>{u.fullName}</span>
                                        </div>
                                    </td>
                                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{u.phone}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                            <span className={`badge ${u.isActive ? 'badge-green' : 'badge-red'}`}>{u.isActive ? 'Active' : 'Inactive'}</span>
                                            {u.accountLocked && (
                                                <span className="badge badge-red" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Lock size={10} /> Locked</span>
                                            )}
                                        </div>
                                    </td>
                                    <td><span className={`badge ${u.isVerified ? 'badge-green' : 'badge-gray'}`}>{u.isVerified ? 'Verified' : 'Unverified'}</span></td>
                                    <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{u.lastLoginAt ? formatDate(u.lastLoginAt) : 'Never'}</td>
                                    <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{u.registeredAt ? formatDate(u.registeredAt) : '—'}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button onClick={() => setPinTarget(u)} className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 12 }}>
                                                <KeyRound size={12} /> Reset PIN
                                            </button>
                                            {u.accountLocked && currentUser?.role === 'ADMIN' && (
                                                <button onClick={() => handleUnlock(u)} className="btn btn-primary" style={{ padding: '6px 10px', fontSize: 12 }}>
                                                    <Unlock size={12} /> Unlock
                                                </button>
                                            )}
                                            {u.isActive ? (
                                                <button onClick={() => handleDeactivate(u)} className="btn btn-danger" style={{ padding: '6px 10px', fontSize: 12 }}>
                                                    <UserX size={12} /> Deactivate
                                                </button>
                                            ) : (
                                                <button onClick={() => handleActivate(u)} className="btn btn-primary" style={{ padding: '6px 10px', fontSize: 12 }}>
                                                    <UserCheck size={12} /> Activate
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table></ExportArea>
                    {filtered.length === 0 && (
                        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-2)' }}>No consumers match.</div>
                    )}
                </div>
            )}

            {pinTarget && <ResetPinModal consumer={pinTarget} onClose={() => setPinTarget(null)} onDone={load} />}
        </div>
    );
}
