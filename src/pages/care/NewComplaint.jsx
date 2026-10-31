import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Sparkles } from 'lucide-react';
import { careApi } from '../../lib/api';
import { Notice, errorText } from '../../components/kit';

const input = { width: '100%', padding: 9, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)', fontSize: 13 };
const lbl = { fontSize: 12.5, fontWeight: 700, display: 'block', marginBottom: 5 };

/** The new-complaint form; with complaint triage on, the likely types appear as the description is typed. */
export default function NewComplaint({ categoryOptions, channels, channelLabels, triage, onClose, onDone }) {
    const [v, setV] = useState({ description: '', category: '', channel: 'PHONE', customerPhone: '', customerName: '', reference: '' });
    const [hints, setHints] = useState([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const timer = useRef(null);
    const set = (k) => (e) => setV(s => ({ ...s, [k]: e.target.value }));

    useEffect(() => {
        if (!triage) return undefined;
        clearTimeout(timer.current);
        if (v.description.trim().length < 12) { setHints([]); return undefined; }
        timer.current = setTimeout(() => {
            careApi.triage(v.description).then(r => setHints(r.data?.data?.suggestions || [])).catch(() => setHints([]));
        }, 500);
        return () => clearTimeout(timer.current);
    }, [v.description, triage]);

    const submit = async (e) => {
        e.preventDefault();
        setBusy(true); setError('');
        try {
            const r = await careApi.open(v);
            toast.success('Complaint opened');
            onDone(r.data?.data);
            onClose();
        } catch (err) { setError(errorText(err)); }
        finally { setBusy(false); }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
            <form onSubmit={submit} onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', borderRadius: 18, padding: 24, width: '100%', maxWidth: 560, maxHeight: '90vh', overflow: 'auto', border: '1px solid var(--border)' }}>
                <h2 style={{ fontSize: 17, fontWeight: 800, margin: '0 0 14px' }}>New complaint</h2>
                {error && <Notice kind="error">{error}</Notice>}
                <div style={{ marginBottom: 12 }}>
                    <label style={lbl}>What happened</label>
                    <textarea style={{ ...input, minHeight: 90 }} value={v.description} onChange={set('description')} required />
                </div>
                {hints.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
                        <Sparkles size={14} style={{ color: 'var(--primary)' }} />
                        {hints.map(h => (
                            <button type="button" key={h.category} onClick={() => setV(s => ({ ...s, category: h.category }))}
                                className={`btn ${v.category === h.category ? 'btn-primary' : 'btn-outline'}`} style={{ padding: '4px 10px', fontSize: 12 }}>
                                {h.title} · {Math.round(h.confidence * 100)}%
                            </button>
                        ))}
                    </div>
                )}
                <div style={{ marginBottom: 12 }}>
                    <label style={lbl}>Type</label>
                    <select style={input} value={v.category} onChange={set('category')} required>
                        <option value="">Select…</option>
                        {categoryOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                    <div><label style={lbl}>Received by</label>
                        <select style={input} value={v.channel} onChange={set('channel')} required>
                            {channels.map(c => <option key={c} value={c}>{channelLabels[c] || c}</option>)}
                        </select></div>
                    <div><label style={lbl}>Transaction reference</label><input style={input} value={v.reference} onChange={set('reference')} /></div>
                    <div><label style={lbl}>Customer phone</label><input style={input} value={v.customerPhone} onChange={set('customerPhone')} /></div>
                    <div><label style={lbl}>Customer name</label><input style={input} value={v.customerName} onChange={set('customerName')} /></div>
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                    <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={busy}>{busy ? 'Working…' : 'Open complaint'}</button>
                </div>
            </form>
        </div>
    );
}

/** The investigation helper's reading of a reference: findings, what to check next and a draft reply to copy. */
export function Explain({ reference }) {
    const [x, setX] = useState(null);
    const [busy, setBusy] = useState(false);
    const run = async () => {
        setBusy(true);
        try { setX((await careApi.explain(reference)).data?.data); }
        catch (e) { toast.error(errorText(e)); }
        finally { setBusy(false); }
    };
    const copy = async () => { try { await navigator.clipboard.writeText(x.draftReply); toast.success('Copied'); } catch { toast.error('Copy failed'); } };
    if (!x) return <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: 12.5 }} onClick={run} disabled={busy}><Sparkles size={14} /> {busy ? '…' : 'Explain'}</button>;
    return (
        <div style={{ display: 'grid', gap: 10, fontSize: 13 }}>
            <ul style={{ margin: 0, paddingLeft: 18 }}>{x.findings.map((f, i) => <li key={i}>{f}</li>)}</ul>
            <div><strong>Next</strong><ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>{x.next.map((f, i) => <li key={i}>{f}</li>)}</ul></div>
            <div style={{ background: 'var(--bg-2)', borderRadius: 10, padding: 12, whiteSpace: 'pre-wrap' }}>{x.draftReply}</div>
            <div><button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: 12.5 }} onClick={copy}>Copy reply</button></div>
        </div>
    );
}
