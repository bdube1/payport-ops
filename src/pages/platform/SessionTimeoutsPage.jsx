import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Save, Monitor, Store, HandCoins, Globe, Smartphone } from 'lucide-react';
import { api } from '../../lib/api';
import { Page, Section, data, errorText } from '../../components/kit';

const PORTALS = [
    ['ops', 'Ops portal', Monitor],
    ['merchant', 'Merchant portal', Store],
    ['agent', 'Agent portal', HandCoins],
    ['consumer', 'Consumer web', Globe],
    ['mobile', 'Mobile app', Smartphone],
];

/** Minutes without activity before each portal signs the person out. */
export default function SessionTimeoutsPage() {
    const [values, setValues] = useState(null);
    const [busy, setBusy] = useState(false);
    useEffect(() => {
        api.get('/session-timeouts').then(r => setValues(data(r) || {})).catch(e => { toast.error(errorText(e)); setValues({}); });
    }, []);
    const save = async () => {
        if (!window.confirm('Are you sure?')) return;
        setBusy(true);
        try { setValues(data(await api.put('/admin/session-timeouts', values))); toast.success('Saved'); }
        catch (e) { toast.error(errorText(e)); }
        finally { setBusy(false); }
    };
    return (
        <Page title="Session Timeouts" actions={<button className="btn btn-primary" onClick={save} disabled={busy || !values}><Save size={14} /> {busy ? 'Saving…' : 'Save'}</button>}>
            <Section>
                {!values ? <div className="spinner" /> : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
                        {PORTALS.map(([k, label, Icon]) => (
                            <div key={k} className="card" style={{ boxShadow: 'none' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                                    <span className="op-kpi-ic" style={{ background: 'var(--badge-blue)', color: 'var(--blue)' }}><Icon size={16} /></span>
                                    <b style={{ fontSize: 14 }}>{label}</b>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <input type="number" min={1} max={1440} value={values[k] ?? ''} style={{ width: 110 }}
                                        onChange={e => setValues(v => ({ ...v, [k]: e.target.value === '' ? '' : Number(e.target.value) }))} />
                                    <span style={{ color: 'var(--text-2)', fontSize: 13 }}>minutes</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Section>
        </Page>
    );
}
