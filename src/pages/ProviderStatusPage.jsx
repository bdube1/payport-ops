import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { getProviderHealth } from '../lib/api';
import { Page } from '../components/kit';

const NAMES = {
    ECONET: 'Econet', NETONE: 'NetOne', TELECEL: 'Telecel', ECOCASH: 'EcoCash', ONEMONEY: 'OneMoney', TELECASH: 'Telecash',
    OMARI: "O'mari", BULAWAYO: 'City of Bulawayo', ESOLUTIONS: 'eSolutions', NYARADZO: 'Nyaradzo', MOONLIGHT: 'Moonlight', ZOL: 'ZOL', INNBUCKS: 'InnBucks', ZIMSWITCH: 'ZimSwitch', ZESA: 'ZESA', PAYPORT_WALLET: 'PayPort Wallet',
};
const TYPES = { PAYMENT: 'Payments', FULFILMENT: 'Fulfilment', WALLET: 'Wallet', BILLER: 'Bills' };
const STATE = {
    UP: { label: 'Operational', color: 'var(--green)', pill: 'badge-green' },
    TIMEOUTS: { label: 'Degraded', color: 'var(--amber)', pill: 'badge-amber' },
    DEGRADED: { label: 'Degraded', color: 'var(--amber)', pill: 'badge-amber' },
    DOWN: { label: 'Down', color: 'var(--red)', pill: 'badge-red' },
    REACHABLE: { label: 'Reachable', color: 'var(--blue)', pill: 'badge-blue' },
    NOT_CONFIGURED: { label: 'Not configured', color: 'var(--text-2)', pill: 'badge-gray' },
    NOT_CHECKED: { label: 'Not checked', color: 'var(--text-2)', pill: 'badge-gray' },
    OPERATIONAL: { label: 'Not checked', color: 'var(--text-2)', pill: 'badge-gray' },
};
const state = (s) => STATE[s] || { label: s ? s.charAt(0) + s.slice(1).toLowerCase() : 'Unknown', color: 'var(--text-2)', pill: 'badge-gray' };
const name = (code) => NAMES[code] || (code || '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
const when = (v) => {
    if (!v) return '';
    const d = Array.isArray(v) ? new Date(v[0], v[1] - 1, v[2], v[3] || 0, v[4] || 0) : new Date(String(v).replace(' ', 'T'));
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

function Letter({ code, color }) {
    return (
        <span style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--bg-2)', color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>
            {name(code).charAt(0)}
        </span>
    );
}

/** One provider as a list row (dashboard). */
export function ProviderRow({ p }) {
    const s = state(p.status);
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
            <Letter code={p.providerCode} color="var(--blue)" />
            <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{name(p.providerCode)}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-2)' }}>{TYPES[p.providerType] || p.providerType || ''}</div>
            </div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: s.color }}>
                <span className="dot" style={{ background: s.color }} />{s.label}
            </span>
        </div>
    );
}

export default function ProviderStatusPage() {
    const [rows, setRows] = useState(null);
    const [at, setAt] = useState(null);
    const [busy, setBusy] = useState(false);
    const load = useCallback(async () => {
        setBusy(true);
        try {
            const r = await getProviderHealth();
            const d = r.data?.data || r.data || [];
            setRows(Array.isArray(d) ? d : []);
            setAt(new Date());
        } catch { setRows([]); } finally { setBusy(false); }
    }, []);
    useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

    const counts = (rows || []).reduce((a, p) => { const k = state(p.status).label; a[k] = (a[k] || 0) + 1; return a; }, {});

    return (
        <Page title="Provider Status" actions={<>
            {at && <span style={{ fontSize: 12, color: 'var(--text-2)' }}>Last updated {at.toLocaleTimeString()}</span>}
            <button className="btn btn-outline" onClick={load} disabled={busy}><RefreshCw size={14} style={busy ? { animation: 'spin 1s linear infinite' } : undefined} /> Refresh</button>
        </>}>
            {rows === null ? <div className="spinner" /> : (
                <>
                    <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                        {Object.entries(counts).map(([k, v]) => <span key={k} className={`badge ${Object.values(STATE).find(s => s.label === k)?.pill || 'badge-gray'}`}>{v} {k}</span>)}
                    </div>
                    {rows.length === 0 && <div className="card" style={{ color: 'var(--text-2)' }}>No provider checks yet.</div>}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 14 }}>
                        {rows.map(p => {
                            const s = state(p.status);
                            return (
                                <div key={p.providerCode} className="card" style={{ padding: 16 }}>
                                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                        <Letter code={p.providerCode} color="var(--blue)" />
                                        <div style={{ minWidth: 0 }}>
                                            <div style={{ fontWeight: 700, fontSize: 14 }}>{name(p.providerCode)}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{TYPES[p.providerType] || p.providerType || ''}</div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 14, fontSize: 12.5, fontWeight: 600, color: s.color }}>
                                        <span className="dot" style={{ background: s.color }} />{s.label}
                                        {p.manualOverride && <span className="badge badge-gray" style={{ marginLeft: 6 }}>Manual</span>}
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, color: 'var(--text-2)' }}>
                                        <span>{p.successRate10m != null ? `${Number(p.successRate10m).toFixed(0)}% success (10 min)` : ''}</span>
                                        <span>{when(p.lastCheckedAt)}</span>
                                    </div>
                                    {p.detail && <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 6 }}>{p.detail}</div>}
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </Page>
    );
}
