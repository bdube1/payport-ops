import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { Section, Table, data, errorText } from './kit';

const NAMES = { ZESA: 'ZESA meter', BULAWAYO: 'City of Bulawayo account', NYARADZO: 'Nyaradzo policy', MOONLIGHT: 'Moonlight policy', ZOL: 'ZOL account' };
const LABEL = { UP: 'Operational', DOWN: 'Down', DEGRADED: 'Degraded', NOT_CONFIGURED: 'Not configured' };
const COLOR = { UP: 'var(--green)', DOWN: 'var(--red)', DEGRADED: 'var(--amber)' };
const inp = { padding: '7px 10px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)', fontSize: 13, width: 180 };

/** Provider Tools → Health checks: the number each biller check looks up, and running every check now. */
export default function HealthChecks() {
    const [saved, setSaved] = useState(null);
    const [draft, setDraft] = useState({});
    const [busy, setBusy] = useState(false);
    const [checking, setChecking] = useState(false);
    const [results, setResults] = useState(null);

    const load = async () => {
        try { const d = data(await api.get('/admin/health-lookups')) || {}; setSaved(d); setDraft(d); }
        catch (e) { toast.error(errorText(e, 'Could not load the lookup numbers')); setSaved({}); }
    };
    useEffect(() => { load(); }, []);

    const changed = saved && Object.keys(draft).some(k => (draft[k] || '') !== (saved[k] || ''));
    const save = async () => {
        if (!window.confirm('Are you sure?')) return;
        setBusy(true);
        try {
            const body = Object.fromEntries(Object.keys(draft).filter(k => (draft[k] || '') !== (saved[k] || '')).map(k => [k, draft[k]]));
            const d = data(await api.put('/admin/health-lookups', body)) || {};
            setSaved(d); setDraft(d); toast.success('Saved');
        } catch (e) { toast.error(errorText(e)); } finally { setBusy(false); }
    };
    const check = async () => {
        setChecking(true);
        try {
            const d = data(await api.post('/admin/health-lookups/check', null, { timeout: 120000 })) || {};
            setResults(Object.entries(d).map(([provider, r]) => ({ provider, status: r.status, detail: r.detail })));
        } catch (e) { toast.error(errorText(e)); } finally { setChecking(false); }
    };

    return (
        <Section title="Health checks" right={<button className="btn btn-outline" onClick={check} disabled={checking}>{checking ? 'Checking…' : 'Check all now'}</button>}>
            {saved === null ? <div className="spinner" /> : (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12, marginBottom: 12 }}>
                        {Object.keys(draft).map(k => (
                            <label key={k} style={{ display: 'grid', gap: 5, fontSize: 12.5, fontWeight: 600 }}>
                                {NAMES[k] || k}
                                <input style={inp} value={draft[k] || ''} onChange={e => setDraft(d => ({ ...d, [k]: e.target.value }))} />
                            </label>
                        ))}
                    </div>
                    <button className="btn btn-primary" onClick={save} disabled={busy || !changed}>{busy ? 'Saving…' : 'Save'}</button>
                </>
            )}
            {results && (
                <div style={{ marginTop: 16 }}>
                    <Table rows={results} exportName="Provider health checks" columns={[
                        { key: 'provider', label: 'Provider' },
                        { key: 'status', label: 'Status', render: r => <span style={{ fontWeight: 600, color: COLOR[r.status] || 'var(--text-2)' }}>{LABEL[r.status] || r.status}</span> },
                        { key: 'detail', label: 'Detail' },
                    ]} />
                </div>
            )}
        </Section>
    );
}
