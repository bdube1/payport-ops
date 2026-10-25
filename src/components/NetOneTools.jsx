import { useState } from 'react';
import { providerToolsApi } from '../lib/api';
import { Section, Notice, Table, CurrencySelect, data, show } from './kit';

/** NetOne account tools on the Float Balances page: PIN stock, live data bundles, a customer's balance. */
export default function NetOneTools() {
    const [view, setView] = useState(null);
    const [busy, setBusy] = useState(false);
    const [ccy, setCcy] = useState('USD');
    const [mobile, setMobile] = useState('');
    const run = async (kind, fn) => {
        setBusy(true);
        try { setView({ kind, value: data(await fn()) }); }
        catch (e) { setView({ kind: 'error', value: e?.response?.data?.message || e?.response?.data?.error?.message || e.message }); }
        finally { setBusy(false); }
    };
    return (
        <Section title="NetOne">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                <button className="btn btn-ghost" disabled={busy} onClick={() => run('pins', providerToolsApi.netonePinStock)}>PIN stock</button>
                <CurrencySelect value={ccy} onChange={setCcy} />
                <button className="btn btn-ghost" disabled={busy} onClick={() => run('bundles', () => providerToolsApi.netoneBundles(ccy))}>Data bundles</button>
                <input value={mobile} onChange={e => setMobile(e.target.value)} placeholder="NetOne number" style={{ minWidth: 180 }} />
                <button className="btn btn-primary" disabled={busy || !mobile.trim()} onClick={() => run('customer', () => providerToolsApi.netoneEndUser(mobile.trim()))}>Customer balance</button>
            </div>
            {busy && <div className="spinner" />}
            {!busy && view && <View {...view} />}
        </Section>
    );
}

function parseList(v) {
    if (Array.isArray(v)) return v;
    if (typeof v === 'string') { try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; } }
    return [];
}

function View({ kind, value }) {
    if (kind === 'error') return <Notice kind="error">{value}</Notice>;
    if (!value) return null;
    const ok = value.replyCode === undefined || ['0', '2', 0, 2].includes(value.replyCode);
    if (!ok) return <Notice kind="error">{value.replyMsg || 'NetOne did not answer'}</Notice>;

    if (kind === 'pins') {
        const rows = parseList(value.inStock ?? value.InStock ?? value.stock);
        const brands = [...new Set(rows.map(r => r.BrandName))];
        const total = rows.reduce((a, r) => a + Number(r.PinValue || 0) * Number(r.Stock || 0), 0);
        return (
            <>
                <div className="op-kpis" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                    {brands.map(b => {
                        const list = rows.filter(r => r.BrandName === b);
                        return (
                            <div key={b} className="card op-kpi" style={{ boxShadow: 'none' }}>
                                <div className="op-kpi-label">{b}</div>
                                <div className="op-kpi-value">{list.reduce((a, r) => a + Number(r.Stock || 0), 0).toLocaleString('en-US')} PINs</div>
                                <div style={{ fontSize: 12, color: 'var(--text-2)' }}>Face value {list.reduce((a, r) => a + Number(r.PinValue || 0) * Number(r.Stock || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                            </div>
                        );
                    })}
                </div>
                <Table rows={rows} exportName="NetOne PIN stock" columns={[
                    { key: 'BrandName', label: 'Voucher type' },
                    { key: 'PinValue', label: 'PIN value', render: r => Number(r.PinValue).toFixed(2) },
                    { key: 'Stock', label: 'PINs in stock', render: r => <b style={{ color: Number(r.Stock) < 50 ? 'var(--pill-red)' : 'inherit' }}>{Number(r.Stock).toLocaleString('en-US')}</b> },
                    { key: 'total', label: 'Face value', render: r => (Number(r.PinValue) * Number(r.Stock)).toLocaleString('en-US', { minimumFractionDigits: 2 }) },
                ]} />
                <p style={{ fontSize: 12.5, color: 'var(--text-2)', marginTop: 8 }}>Total face value {total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
            </>
        );
    }
    if (kind === 'bundles') {
        const rows = parseList(value.bundles ?? value.Bundles ?? value);
        return <Table rows={rows} exportName="NetOne data bundles" empty="NetOne returned no bundles." columns={rows.length ? [
            { key: 'ProductCode', label: 'Code', render: r => show(r.ProductCode ?? r.bundleCode ?? r.BundleCode) },
            { key: 'Name', label: 'Bundle', render: r => show(r.Name ?? r.name ?? r.BundleName) },
            { key: 'Amount', label: 'Price', render: r => show(r.Amount ?? r.amount ?? r.Price) },
            { key: 'ValidityPeriod', label: 'Validity', render: r => show(r.ValidityPeriod ?? r.validity ?? r.Description) },
        ] : undefined} />;
    }
    const rows = Object.entries(value).filter(([k]) => !['replyCode'].includes(k)).map(([k, v]) => ({ field: k, value: typeof v === 'object' ? JSON.stringify(v) : String(v ?? '') }));
    return <Table rows={rows} noExport columns={[{ key: 'field', label: '' }, { key: 'value', label: '' }]} />;
}
