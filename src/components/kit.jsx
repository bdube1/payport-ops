import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { exportExcel, exportPdf } from '../lib/exporter';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { ISO_COUNTRIES, ISO_CURRENCIES } from '../lib/iso';

/*
 * Small building blocks for the Phase 4-7 screens. Every rule (who may approve, four-eyes,
 * what can be edited) is enforced by the backend; these screens only show its answers.
 */

export const data = (r) => r?.data?.data ?? r?.data;
export const errorText = (e, fallback = 'Request failed') => e?.response?.data?.message || e?.message || fallback;

// Countries and currencies PayPort serves (GET /api/v1/markets), loaded once per session.
let marketsPromise = null;
export function useMarkets() {
    const [markets, setMarkets] = useState([]);
    useEffect(() => {
        if (!marketsPromise) marketsPromise = api.get('/markets').then(r => data(r) || []).catch(() => { marketsPromise = null; return []; });
        let live = true;
        marketsPromise.then(m => { if (live) setMarkets(Array.isArray(m) ? m : []); });
        return () => { live = false; };
    }, []);
    return markets;
}

export const currencyOptions = (markets) => [...new Set(markets.flatMap(m => (m.currencies || []).map(c => c.code)))].sort().map(c => ({ value: c, label: c }));
export const countryOptions = (markets) => markets.map(m => ({ value: m.country, label: `${m.name} (${m.country})` }));

const selectStyle = { padding: '7px 10px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)', fontSize: 13 };

export function CurrencySelect({ value, onChange, allLabel, style, required }) {
    const opts = currencyOptions(useMarkets());
    return (
        <select value={value ?? ''} onChange={e => onChange(e.target.value)} required={required} style={{ ...selectStyle, ...style }}>
            <option value="">{allLabel || 'Currency…'}</option>
            {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
    );
}

export function CountrySelect({ value, onChange, allLabel, style, required }) {
    const opts = countryOptions(useMarkets());
    return (
        <select value={value ?? ''} onChange={e => onChange(e.target.value)} required={required} style={{ ...selectStyle, ...style }}>
            <option value="">{allLabel || 'Country…'}</option>
            {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
    );
}

export function useLoad(loader, deps = []) {
    const [value, setValue] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const reload = useCallback(async () => {
        setLoading(true);
        try { setValue(data(await loader())); setError(''); }
        catch (e) { setError(errorText(e, 'Could not load')); }
        finally { setLoading(false); }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
    useEffect(() => { reload(); }, [reload]);
    return { value, error, loading, reload };
}

const ReportName = createContext('');

export function Page({ title, subtitle, actions, children }) {
    return (
        <ReportName.Provider value={typeof title === 'string' ? title : ''}>
            <div className="op-page">
                <div className="op-page-head">
                    <h1>{title}</h1>
                    <div className="op-actions">{actions}</div>
                </div>
                {children}
            </div>
        </ReportName.Provider>
    );
}

export function Section({ title, right, children }) {
    const page = useContext(ReportName);
    const name = [page, typeof title === 'string' ? title : ''].filter(Boolean).join(' - ');
    return (
        <ReportName.Provider value={name}>
            <div className="card" style={{ padding: 18, marginBottom: 18 }}>
                {(title || right) && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{title}</h2>
                        <div style={{ display: 'flex', gap: 8 }}>{right}</div>
                    </div>
                )}
                {children}
            </div>
        </ReportName.Provider>
    );
}

export function Notice({ kind = 'info', children }) {
    const bg = { info: 'var(--badge-blue)', warn: 'var(--badge-amber)', error: 'var(--badge-red)', ok: 'var(--badge-green)' }[kind];
    return <div style={{ background: bg, padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 14 }}>{children}</div>;
}

const BADGES = {
    green: ['APPROVED', 'ACTIVE', 'VERIFIED', 'CLEAR', 'PAID', 'COMPLETED', 'MET', 'ON_TRACK', 'CONFIRMED', 'SOURCED', 'TRACED', 'UP', 'CLOSED', 'SUBMITTED', 'POSTED', 'ENABLED', 'NEW_VERSION', 'UNCHANGED', 'RESOLVED', 'LIVE', 'PROVIDER_SETTLEMENT', 'EXECUTED', 'REDEEMED', 'GRANTED', 'NOT_REQUIRED'],
    amber: ['PENDING', 'PENDING_VERIFICATION', 'UNDER_REVIEW', 'OBSERVE', 'DRAFT', 'AT_RISK', 'PROVISIONAL', 'OPEN', 'IN_REVIEW', 'INSTRUCTED', 'RECOVERING', 'POTENTIAL_MATCH', 'PROPOSED', 'NOT_YET_CONFIRMED', 'LEDGER_PENDING', 'SANDBOX', 'MET_LATE', 'UPDATE_REQUIRED'],
    red: ['REJECTED', 'LOCKED', 'FAILED', 'BREACHED', 'ENFORCE', 'DOWN', 'SUSPENDED', 'INCOMPLETE', 'QUARANTINED', 'RETURNED', 'OVERDUE', 'HIGH', 'UNIDENTIFIED', 'AMOUNT_MISMATCH', 'CANCELLED', 'FROZEN', 'DISABLED', 'RETIRED', 'REFUSED'],
};

export function Badge({ value }) {
    if (value === null || value === undefined || value === '') return <span style={{ color: 'var(--text-2)' }}>—</span>;
    const v = String(value);
    const cls = BADGES.green.includes(v) ? 'badge-green' : BADGES.amber.includes(v) ? 'badge-amber' : BADGES.red.includes(v) ? 'badge-red' : 'badge-gray';
    const text = v.replace(/_/g, ' ').toLowerCase();
    return <span className={`badge ${cls}`}>{text.charAt(0).toUpperCase() + text.slice(1)}</span>;
}

export function show(v) {
    if (v === null || v === undefined || v === '') return '—';
    if (typeof v === 'boolean') return v ? 'Yes' : 'No';
    if (typeof v === 'object') return JSON.stringify(v);
    const s = String(v);
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) return s.replace('T', ' ').slice(0, 19);
    return s;
}

export const minor = (m, ccy = '') => (m === null || m === undefined ? '—' : `${ccy ? ccy + ' ' : ''}${(Number(m) / 100).toFixed(2)}`);

/** Excel and PDF buttons for the report tables inside it (every table on screen can be exported). */
export function ExportArea({ name = 'Report', children, style, pdf }) {
    const ref = useRef(null);
    const [busy, setBusy] = useState('');
    const run = async (kind) => {
        const tables = [...(ref.current?.querySelectorAll('table') || [])];
        if (!tables.length) { toast.error('Nothing to export'); return; }
        setBusy(kind);
        try { if (kind === 'xlsx') await exportExcel(tables, name); else await exportPdf(tables, name); }
        catch (e) { toast.error(errorText(e, 'Export failed')); }
        finally { setBusy(''); }
    };
    return (
        <div style={style}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginBottom: 8 }} data-export-bar>
                <button type="button" className="btn btn-ghost btn-sm" disabled={!!busy} onClick={() => run('xlsx')}>{busy === 'xlsx' ? '…' : 'Excel'}</button>
                <button type="button" className="btn btn-ghost btn-sm" disabled={!!busy} onClick={() => (pdf ? pdf() : run('pdf'))}>{busy === 'pdf' ? '…' : 'PDF'}</button>
            </div>
            <div ref={ref}>{children}</div>
        </div>
    );
}

/** columns: [{ key, label, render?(row) }]; without columns every field is shown. Every table can be exported to Excel and PDF. */
export function Table({ rows, columns, empty = 'Nothing here.', onRow, exportName, noExport }) {
    const context = useContext(ReportName);
    const list = Array.isArray(rows) ? rows : [];
    if (!list.length) return <p style={{ fontSize: 13, color: 'var(--text-2)', margin: 0 }}>{empty}</p>;
    const cols = columns || Object.keys(list[0]).map(k => ({ key: k, label: k }));
    const table = (
        <div style={{ overflowX: 'auto' }}>
            <table>
                <thead>
                    <tr>{cols.map(c => <th key={c.key}>{c.label}</th>)}</tr>
                </thead>
                <tbody>
                    {list.map((r, i) => (
                        <tr key={r.id ?? r.code ?? r.param_key ?? i} onClick={onRow ? () => onRow(r) : undefined} style={{ cursor: onRow ? 'pointer' : 'default' }}>
                            {cols.map(c => <td key={c.key}>{c.render ? c.render(r) : show(r[c.key])}</td>)}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
    return noExport ? table : <ExportArea name={exportName || context || 'Report'}>{table}</ExportArea>;
}

/** A button that runs an async call, shows the server's answer and refreshes. */
export function Act({ label, run, done, confirm, kind = 'primary', disabled, title }) {
    const [busy, setBusy] = useState(false);
    const go = async (e) => {
        e?.stopPropagation?.();
        if (confirm && !window.confirm(confirm)) return;
        setBusy(true);
        try {
            const r = await run();
            toast.success(typeof done === 'string' ? done : 'Done');
            if (typeof done === 'function') done(data(r));
        } catch (err) {
            toast.error(errorText(err));
        } finally { setBusy(false); }
    };
    return <button className={`btn btn-${kind}`} disabled={busy || disabled} title={title} onClick={go} style={{ padding: '6px 12px', fontSize: 12.5 }}>{busy ? '…' : label}</button>;
}

/**
 * A modal form. fields: [{ name, label, type: text|textarea|number|select|checkbox|json|file, options?, required?, help?, initial? }].
 * onSubmit(values) returns a promise; the server's message is shown on failure.
 */
export function FormModal({ title, intro, fields, submitLabel = 'Submit', onSubmit, onClose, onDone }) {
    const [values, setValues] = useState(() => Object.fromEntries(fields.map(f => [f.name, f.initial ?? (f.type === 'checkbox' ? false : '')])));
    const markets = useMarkets();
    const optionsFor = (f) => f.type === 'currency' ? currencyOptions(markets)
        : f.type === 'country' ? countryOptions(markets)
        : f.type === 'iso-country' ? ISO_COUNTRIES.map(c => ({ value: c.code, label: `${c.name} (${c.code})` }))
        : f.type === 'iso-currency' ? ISO_CURRENCIES
        : f.options;
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const set = (k, v) => setValues(s => ({ ...s, [k]: v }));
    const submit = async (e) => {
        e.preventDefault();
        setError(''); setBusy(true);
        try {
            const parsed = { ...values };
            for (const f of fields) {
                if (f.type === 'json' && typeof parsed[f.name] === 'string' && parsed[f.name].trim()) {
                    try { parsed[f.name] = JSON.parse(parsed[f.name]); } catch { throw new Error(`${f.label}: not valid JSON`); }
                }
                if (f.type === 'number' && parsed[f.name] !== '') parsed[f.name] = Number(parsed[f.name]);
            }
            const r = await onSubmit(parsed);
            toast.success('Done');
            onDone?.(data(r));
            onClose();
        } catch (err) { setError(errorText(err)); }
        finally { setBusy(false); }
    };
    const input = { width: '100%', padding: 9, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)', fontSize: 13 };
    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
            <form onSubmit={submit} onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', borderRadius: 18, padding: 24, width: '100%', maxWidth: 520, maxHeight: '90vh', overflow: 'auto', border: '1px solid var(--border)' }}>
                <h2 style={{ fontSize: 17, fontWeight: 800, margin: '0 0 4px' }}>{title}</h2>
                {error && <Notice kind="error">{error}</Notice>}
                {fields.map(f => (
                    <div key={f.name} style={{ marginBottom: 12 }}>
                        {f.type === 'checkbox' ? (
                            <label style={{ fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}>
                                <input type="checkbox" checked={!!values[f.name]} onChange={e => set(f.name, e.target.checked)} /> {f.label}
                            </label>
                        ) : (
                            <>
                                <label style={{ fontSize: 12.5, fontWeight: 700, display: 'block', marginBottom: 5 }}>{f.label}</label>
                                {['select', 'currency', 'country', 'iso-country', 'iso-currency'].includes(f.type) ? (
                                    <select style={input} value={values[f.name]} required={f.required} onChange={e => set(f.name, e.target.value)}>
                                        <option value="">Select…</option>
                                        {(optionsFor(f) || []).map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
                                    </select>
                                ) : f.type === 'textarea' || f.type === 'json' ? (
                                    <textarea style={{ ...input, minHeight: f.type === 'json' ? 120 : 80, fontFamily: f.type === 'json' ? 'monospace' : 'inherit' }}
                                        value={values[f.name]} required={f.required} onChange={e => set(f.name, e.target.value)} />
                                ) : f.type === 'file' ? (
                                    <input type="file" accept={f.accept} required={f.required} onChange={e => set(f.name, e.target.files?.[0] || null)} />
                                ) : (
                                    <input style={input} type={f.type === 'number' ? 'number' : 'text'} step={f.step} value={values[f.name]} required={f.required}
                                        onChange={e => set(f.name, e.target.value)} />
                                )}
                            </>
                        )}
                    </div>
                ))}
                <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                    <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={busy}>{busy ? 'Working…' : submitLabel}</button>
                </div>
            </form>
        </div>
    );
}

/** Opens a FormModal from a button. */
export function FormButton({ label, kind = 'primary', ...modal }) {
    const [open, setOpen] = useState(false);
    return (
        <>
            <button className={`btn btn-${kind}`} style={{ padding: '6px 12px', fontSize: 12.5 }} onClick={(e) => { e.stopPropagation(); setOpen(true); }}>{label}</button>
            {open && <FormModal {...modal} onClose={() => setOpen(false)} />}
        </>
    );
}

export function KeyValues({ obj, keys }) {
    if (!obj) return null;
    const ks = keys || Object.keys(obj);
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '6px 16px', fontSize: 13 }}>
            {ks.map(k => (
                <div key={k} style={{ display: 'contents' }}>
                    <div style={{ color: 'var(--text-2)' }}>{k}</div>
                    <div style={{ wordBreak: 'break-word' }}>{typeof obj[k] === 'string' && BADGES.green.concat(BADGES.amber, BADGES.red).includes(obj[k]) ? <Badge value={obj[k]} /> : show(obj[k])}</div>
                </div>
            ))}
        </div>
    );
}

export const staffId = (user) => user?.phone ? `staff:${user.phone}` : user?.email || user?.username || '';


/** Shows values that the server returns once (temporary passwords, access keys) with copy buttons. */
export function ShowOnce({ title, items, note, onClose }) {
    const copy = (v) => { navigator.clipboard?.writeText(String(v)).then(() => toast.success('Copied')).catch(() => {}); };
    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{ background: 'var(--bg-card)', borderRadius: 18, padding: 24, width: '100%', maxWidth: 520, border: '1px solid var(--border)' }}>
                <h2 style={{ fontSize: 17, fontWeight: 800, margin: '0 0 12px' }}>{title}</h2>
                {note && <Notice kind="warn">{note}</Notice>}
                {items.filter(i => i.value !== undefined && i.value !== null && i.value !== '').map(i => (
                    <div key={i.label} style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 700, marginBottom: 4 }}>{i.label}</div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <code style={{ flex: 1, padding: '8px 10px', borderRadius: 8, background: 'var(--bg-2)', fontSize: 13, wordBreak: 'break-all' }}>{String(i.value)}</code>
                            <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => copy(i.value)}>Copy</button>
                        </div>
                    </div>
                ))}
                <button className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} onClick={onClose}>Done</button>
            </div>
        </div>
    );
}
