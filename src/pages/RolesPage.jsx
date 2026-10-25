import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Save, RotateCcw, Trash2, Search, ShieldCheck, Users } from 'lucide-react';
import { api } from '../lib/api';
import { Page, data, errorText } from '../components/kit';
import { useAuth } from '../lib/auth.jsx';

const blank = { code: '', name: '', description: '', permissions: [], builtIn: false, isNew: true };

export default function RolesPage() {
    const { refresh } = useAuth();
    const [catalog, setCatalog] = useState([]);
    const [roles, setRoles] = useState(null);
    const [sel, setSel] = useState(null);
    const [draft, setDraft] = useState(blank);
    const [filter, setFilter] = useState('');
    const [busy, setBusy] = useState(false);

    const load = async (keep) => {
        try {
            const [c, r] = await Promise.all([api.get('/admin/roles/catalog'), api.get('/admin/roles')]);
            setCatalog(data(c) || []);
            const list = data(r) || [];
            setRoles(list);
            const pick = list.find(x => x.code === (keep ?? sel)) || list[0];
            if (pick) { setSel(pick.code); setDraft({ ...pick, permissions: [...pick.permissions] }); }
        } catch (e) { toast.error(errorText(e, 'Could not load roles')); setRoles([]); }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { load(); }, []);

    const open = (r) => { setSel(r.code); setDraft({ ...r, permissions: [...r.permissions] }); };
    const startNew = () => { setSel(null); setDraft({ ...blank }); };
    const has = (p) => draft.permissions.includes(p);
    const setPerm = (p, on) => setDraft(d => {
        let next = new Set(d.permissions);
        if (on) { next.add(p); if (p.endsWith('.manage')) next.add(p.replace('.manage', '.view')); }
        else { next.delete(p); if (p.endsWith('.view')) next.delete(p.replace('.view', '.manage')); }
        return { ...d, permissions: [...next] };
    });
    const setGroup = (features, level, on) => setDraft(d => {
        const next = new Set(d.permissions);
        features.forEach(f => {
            if (on) { next.add(f.view); if (level === 'manage') next.add(f.manage); }
            else { next.delete(f.manage); if (level === 'view') next.delete(f.view); }
        });
        return { ...d, permissions: [...next] };
    });

    const total = useMemo(() => catalog.reduce((n, g) => n + g.features.length * 2, 0), [catalog]);
    const q = filter.trim().toLowerCase();
    const shown = catalog.map(g => ({ ...g, features: g.features.filter(f => !q || f.name.toLowerCase().includes(q) || g.group.toLowerCase().includes(q)) })).filter(g => g.features.length);

    const save = async () => {
        if (!draft.name.trim()) { toast.error('Enter a role name'); return; }
        if (!window.confirm('Are you sure?')) return;
        setBusy(true);
        try {
            const body = { code: draft.code || undefined, name: draft.name, description: draft.description, permissions: draft.permissions };
            const r = draft.isNew ? await api.post('/admin/roles', body) : await api.put(`/admin/roles/${draft.code}`, body);
            toast.success('Saved');
            await load(data(r)?.code);
            refresh();
        } catch (e) { toast.error(errorText(e)); } finally { setBusy(false); }
    };
    const reset = async () => {
        if (!window.confirm('Are you sure?')) return;
        try { await api.post(`/admin/roles/${draft.code}/reset`); toast.success('Reset'); await load(draft.code); refresh(); }
        catch (e) { toast.error(errorText(e)); }
    };
    const remove = async () => {
        if (!window.confirm('Are you sure?')) return;
        try { await api.delete(`/admin/roles/${draft.code}`); toast.success('Deleted'); setSel(null); await load(''); }
        catch (e) { toast.error(errorText(e)); }
    };

    return (
        <Page title="Roles & Permissions" actions={<button className="btn btn-primary" onClick={startNew}><Plus size={15} /> New Role</button>}>
            {roles === null ? <div className="spinner" /> : (
                <div className="op-split">
                    <div className="card" style={{ padding: 8, position: 'sticky', top: 'calc(var(--top-h) + 16px)' }}>
                        {roles.map(r => (
                            <button key={r.code} onClick={() => open(r)} style={{
                                display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font)',
                                background: sel === r.code ? 'var(--badge-blue)' : 'transparent', color: 'var(--text)',
                            }}>
                                <ShieldCheck size={17} color={sel === r.code ? 'var(--blue)' : 'var(--text-2)'} />
                                <span style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 13.5, fontWeight: 600, color: sel === r.code ? 'var(--blue)' : 'var(--text)' }}>{r.name}</div>
                                    <div style={{ fontSize: 11.5, color: 'var(--text-2)' }}>{r.permissions.length} of {total} · {r.builtIn ? 'Built-in' : 'Custom'}</div>
                                </span>
                                <span title="Users" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-2)' }}><Users size={13} />{r.users}</span>
                            </button>
                        ))}
                        {draft.isNew && (
                            <div style={{ padding: '11px 12px', borderRadius: 10, background: 'var(--badge-blue)', color: 'var(--blue)', fontWeight: 600, fontSize: 13.5, marginTop: 4 }}>
                                {draft.name || 'New role'}
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'grid', gap: 16 }}>
                        <div className="card">
                            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 2fr)', gap: 14 }}>
                                <div>
                                    <label style={{ fontSize: 12.5, fontWeight: 600, display: 'block', marginBottom: 6 }}>Role name</label>
                                    <input value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} style={{ width: '100%' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize: 12.5, fontWeight: 600, display: 'block', marginBottom: 6 }}>Description</label>
                                    <input value={draft.description || ''} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} style={{ width: '100%' }} />
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
                                <span className="badge badge-blue">{draft.permissions.length} of {total} permissions</span>
                                {!draft.isNew && <span className="badge badge-gray">{draft.code}</span>}
                                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                                    {!draft.isNew && draft.builtIn && <button className="btn btn-ghost" onClick={reset}><RotateCcw size={14} /> Reset</button>}
                                    {!draft.isNew && !draft.builtIn && <button className="btn btn-danger" onClick={remove}><Trash2 size={14} /> Delete</button>}
                                    <button className="btn btn-primary" onClick={save} disabled={busy}><Save size={14} /> {busy ? 'Saving…' : 'Save'}</button>
                                </div>
                            </div>
                        </div>

                        <div className="card" style={{ padding: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
                                <h2 style={{ fontSize: 15, fontWeight: 700 }}>Permissions</h2>
                                <div style={{ position: 'relative', marginLeft: 'auto', width: 260 }}>
                                    <Search size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-2)' }} />
                                    <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Find a permission" style={{ width: '100%', paddingLeft: 34 }} />
                                </div>
                            </div>
                            <table>
                                <thead>
                                    <tr><th>Area</th><th style={{ width: 110, textAlign: 'center' }}>View</th><th style={{ width: 110, textAlign: 'center' }}>Manage</th></tr>
                                </thead>
                                <tbody>
                                    {shown.map(g => {
                                        const allView = g.features.every(f => has(f.view));
                                        const allManage = g.features.every(f => has(f.manage));
                                        return [
                                            <tr key={g.group} style={{ background: 'var(--bg-2)' }}>
                                                <td style={{ fontWeight: 700, background: 'var(--bg-2)' }}>{g.group}</td>
                                                <td style={{ textAlign: 'center', background: 'var(--bg-2)' }}><input type="checkbox" checked={allView} onChange={e => setGroup(g.features, 'view', e.target.checked)} /></td>
                                                <td style={{ textAlign: 'center', background: 'var(--bg-2)' }}><input type="checkbox" checked={allManage} onChange={e => setGroup(g.features, 'manage', e.target.checked)} /></td>
                                            </tr>,
                                            ...g.features.map(f => (
                                                <tr key={f.key}>
                                                    <td style={{ paddingLeft: 32 }}>{f.name}</td>
                                                    <td style={{ textAlign: 'center' }}><input type="checkbox" checked={has(f.view)} onChange={e => setPerm(f.view, e.target.checked)} /></td>
                                                    <td style={{ textAlign: 'center' }}><input type="checkbox" checked={has(f.manage)} onChange={e => setPerm(f.manage, e.target.checked)} /></td>
                                                </tr>
                                            )),
                                        ];
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </Page>
    );
}
