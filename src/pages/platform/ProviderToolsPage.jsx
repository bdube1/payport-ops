import { useState } from 'react';
import { providerToolsApi } from '../../lib/api';
import { Page, Section, Notice, Table, CurrencySelect, data } from '../../components/kit';

const inp = { padding: '7px 10px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)', fontSize: 13 };

function Result({ value }) {
    if (value === null || value === undefined) return null;
    if (value.__error) return <Notice kind="error">{value.__error}</Notice>;
    if (Array.isArray(value)) return <Table rows={value} empty="Nothing returned." />;
    if (typeof value === 'object') return <Table rows={[value]} />;
    return <p style={{ fontSize: 13 }}>{String(value)}</p>;
}

function useCall() {
    const [value, setValue] = useState(null);
    const [busy, setBusy] = useState(false);
    const run = async (fn) => {
        setBusy(true);
        try { setValue(data(await fn())); } catch (e) { setValue({ __error: e?.response?.data?.message || e?.response?.data?.error?.message || e.message }); }
        finally { setBusy(false); }
    };
    return { value, busy, run };
}

export default function ProviderToolsPage() {
    const [msisdn, setMsisdn] = useState('');
    const [ccy, setCcy] = useState('USD');
    const econet = useCall();
    const [nMobile, setNMobile] = useState('');
    const [nCcy, setNCcy] = useState('USD');
    const netone = useCall();
    return (
        <Page title="Provider tools">
            <Section title="Econet">
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                    <input style={{ ...inp, minWidth: 200 }} placeholder="Econet number, e.g. 0771234567" value={msisdn} onChange={e => setMsisdn(e.target.value)} />
                    <CurrencySelect value={ccy} onChange={setCcy} />
                    <button className="btn btn-primary" disabled={econet.busy || !msisdn.trim()} onClick={() => econet.run(() => providerToolsApi.econetValidate(msisdn.trim(), ccy))}>Validate number</button>
                    <button className="btn btn-ghost" disabled={econet.busy || !msisdn.trim()} onClick={() => econet.run(() => providerToolsApi.econetBalance(msisdn.trim(), ccy))}>Account balance</button>
                </div>
                <Result value={econet.value} />
            </Section>
            <Section title="NetOne">
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                    <button className="btn btn-ghost" disabled={netone.busy} onClick={() => netone.run(() => providerToolsApi.netoneWallet())}>Wallet balance (ZWG)</button>
                    <button className="btn btn-ghost" disabled={netone.busy} onClick={() => netone.run(() => providerToolsApi.netoneWalletUsd())}>Wallet balance (USD)</button>
                    <button className="btn btn-ghost" disabled={netone.busy} onClick={() => netone.run(() => providerToolsApi.netonePinStock())}>PIN stock</button>
                    <CurrencySelect value={nCcy} onChange={setNCcy} />
                    <button className="btn btn-ghost" disabled={netone.busy} onClick={() => netone.run(() => providerToolsApi.netoneBundles(nCcy))}>Data bundles</button>
                    <input style={{ ...inp, minWidth: 200 }} placeholder="NetOne number" value={nMobile} onChange={e => setNMobile(e.target.value)} />
                    <button className="btn btn-primary" disabled={netone.busy || !nMobile.trim()} onClick={() => netone.run(() => providerToolsApi.netoneEndUser(nMobile.trim()))}>Customer balance</button>
                </div>
                <Result value={netone.value} />
            </Section>
        </Page>
    );
}
