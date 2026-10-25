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
    const omari = useCall();
    const [oMsisdn, setOMsisdn] = useState('');
    const [oAmount, setOAmount] = useState('1.00');
    const [oCcy, setOCcy] = useState('USD');
    const [oRef, setORef] = useState('');
    const [oOtp, setOOtp] = useState('');
    return (
        <Page title="Provider tools">
            <Section title="Econet">
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                    <input style={{ ...inp, minWidth: 200 }} placeholder="Econet number" value={msisdn} onChange={e => setMsisdn(e.target.value)} />
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
            <Section title="O'mari">
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                    <input style={{ ...inp, minWidth: 180 }} placeholder="O'mari number" value={oMsisdn} onChange={e => setOMsisdn(e.target.value)} />
                    <input style={{ ...inp, width: 100 }} placeholder="Amount" value={oAmount} onChange={e => setOAmount(e.target.value)} />
                    <CurrencySelect value={oCcy} onChange={setOCcy} />
                    <button className="btn btn-primary" disabled={omari.busy || !oMsisdn.trim()}
                        onClick={() => omari.run(async () => { const r = await providerToolsApi.omariStart(oMsisdn.trim(), oAmount, oCcy); const d = data(r); if (d?.reference) setORef(d.reference); return r; })}>Send test OTP</button>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                    <input style={{ ...inp, minWidth: 260 }} placeholder="O'mari reference" value={oRef} onChange={e => setORef(e.target.value)} />
                    <input style={{ ...inp, width: 120 }} placeholder="OTP" value={oOtp} onChange={e => setOOtp(e.target.value)} />
                    <button className="btn btn-primary" disabled={omari.busy || !oRef.trim() || !oOtp.trim()} onClick={() => omari.run(() => providerToolsApi.omariConfirm(oRef.trim(), oOtp.trim(), oMsisdn.trim() || undefined))}>Confirm test payment</button>
                    <button className="btn btn-ghost" disabled={omari.busy || !oRef.trim()} onClick={() => omari.run(() => providerToolsApi.omariQuery(oRef.trim()))}>Query</button>
                    <button className="btn btn-danger" disabled={omari.busy || !oRef.trim()} onClick={() => { if (window.confirm('Void this O\'mari payment?')) omari.run(() => providerToolsApi.omariVoid(oRef.trim())); }}>Void</button>
                </div>
                <Result value={omari.value} />
            </Section>
        </Page>
    );
}
