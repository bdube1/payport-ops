import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { walletsAdminApi } from '../../lib/api';
import { Page, Section, Notice, ExportArea, Badge, data, errorText, minor, show } from '../../components/kit';

const today = () => new Date().toISOString().slice(0, 10);
const monthAgo = () => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 10); };
const amount = (m, ccy) => (m === null || m === undefined ? '' : minor(m, ccy));

/** One wallet's statement for a period: opening balance, every movement with its running balance, closing balance. */
export default function WalletStatementPage() {
    const [params, setParams] = useSearchParams();
    const [q, setQ] = useState(params.get('ref') || '');
    const [matches, setMatches] = useState(null);
    const [ref, setRef] = useState(params.get('ref') || '');
    const [from, setFrom] = useState(monthAgo());
    const [to, setTo] = useState(today());
    const [st, setSt] = useState(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const run = async (r = ref) => {
        if (!r) return;
        setBusy(true); setError('');
        try { setSt(data(await walletsAdminApi.statementReport(r, from, to))); setParams({ ref: r }, { replace: true }); }
        catch (e) { setError(errorText(e, 'Could not run the statement')); setSt(null); }
        finally { setBusy(false); }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { if (ref) run(ref); }, []);

    const find = async (e) => {
        e.preventDefault();
        setError(''); setMatches(null);
        try {
            const list = data(await walletsAdminApi.search(q.trim())) || [];
            if (list.length === 1) { setRef(list[0].wallet_ref); run(list[0].wallet_ref); }
            else setMatches(list);
        } catch (x) { setError(errorText(x)); }
    };

    const w = st?.wallet || {};
    const ccy = st?.currency;
    return (
        <Page title="Wallet Statement">
            <Section>
                <form onSubmit={find} style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 2fr) repeat(2, minmax(150px, 1fr)) auto', gap: 12, alignItems: 'end' }}>
                    <label style={{ fontSize: 12.5, fontWeight: 600 }}>Wallet<input value={q} onChange={e => setQ(e.target.value)} style={{ width: '100%', marginTop: 6 }} /></label>
                    <label style={{ fontSize: 12.5, fontWeight: 600 }}>From<input type="date" value={from} onChange={e => setFrom(e.target.value)} style={{ width: '100%', marginTop: 6 }} /></label>
                    <label style={{ fontSize: 12.5, fontWeight: 600 }}>To<input type="date" value={to} onChange={e => setTo(e.target.value)} style={{ width: '100%', marginTop: 6 }} /></label>
                    <button className="btn btn-primary" disabled={busy || !q.trim()}>{busy ? 'Running…' : 'Run statement'}</button>
                </form>
                {matches && (matches.length === 0 ? <p style={{ marginTop: 12, color: 'var(--text-2)', fontSize: 13 }}>No wallet found.</p> : (
                    <div style={{ marginTop: 14 }}>
                        <table>
                            <thead><tr><th>Wallet</th><th>Holder</th><th>Phone</th><th>ID Number</th><th>Currency</th><th></th></tr></thead>
                            <tbody>{matches.map(m => (
                                <tr key={m.wallet_ref}>
                                    <td className="mono">{m.wallet_ref}</td><td>{m.full_name}</td><td>{m.phone}</td><td className="mono">{show(m.id_number)}</td><td>{m.currency}</td>
                                    <td><button type="button" className="btn btn-ghost btn-sm" onClick={() => { setMatches(null); setQ(m.wallet_ref); setRef(m.wallet_ref); run(m.wallet_ref); }}>Select</button></td>
                                </tr>
                            ))}</tbody>
                        </table>
                    </div>
                ))}
            </Section>

            {error && <Notice kind="error">{error}</Notice>}

            {st && (
                <Section title={`${w.full_name || 'Wallet'} · ${w.wallet_ref}`} right={<Badge value={w.status} />}>
                    <ExportArea name={`Wallet statement ${w.wallet_ref}`}>
                        <table style={{ marginBottom: 16 }}>
                            <thead><tr><th>Holder</th><th>ID Number</th><th>Phone</th><th>Wallet</th><th>Period</th><th>Opening balance</th><th>Credits</th><th>Debits</th><th>Closing balance</th></tr></thead>
                            <tbody><tr>
                                <td>{show(w.full_name)}</td><td className="mono">{show(w.id_number)}</td><td>{show(w.phone)}</td><td className="mono">{w.wallet_ref} ({ccy})</td>
                                <td>{st.from || 'Start'} – {st.to || 'Today'}</td>
                                <td style={{ fontWeight: 700 }}>{minor(st.openingBalanceMinor, ccy)}</td>
                                <td style={{ color: 'var(--pill-green)', fontWeight: 600 }}>{minor(st.totalCreditsMinor, ccy)}</td>
                                <td style={{ color: 'var(--pill-red)', fontWeight: 600 }}>{minor(st.totalDebitsMinor, ccy)}</td>
                                <td style={{ fontWeight: 700 }}>{minor(st.closingBalanceMinor, ccy)}</td>
                            </tr></tbody>
                        </table>
                        <table>
                            <thead><tr><th>Date</th><th>Trxn Type</th><th>Details</th><th>Reference</th><th style={{ textAlign: 'right' }}>Debit</th><th style={{ textAlign: 'right' }}>Credit</th><th style={{ textAlign: 'right' }}>Balance</th></tr></thead>
                            <tbody>
                                <tr><td style={{ color: 'var(--text-2)' }}>{st.from || ''}</td><td colSpan={5} style={{ fontWeight: 600 }}>Opening balance</td><td style={{ textAlign: 'right', fontWeight: 700 }}>{minor(st.openingBalanceMinor, ccy)}</td></tr>
                                {st.rows.map((r, i) => (
                                    <tr key={i}>
                                        <td style={{ whiteSpace: 'nowrap', color: 'var(--text-2)' }}>{show(r.date)}</td>
                                        <td>{r.type}</td>
                                        <td>{show(r.details)}</td>
                                        <td className="mono" style={{ fontSize: 12 }}>{show(r.reference)}</td>
                                        <td style={{ textAlign: 'right', color: 'var(--pill-red)' }}>{amount(r.debitMinor, ccy)}</td>
                                        <td style={{ textAlign: 'right', color: 'var(--pill-green)' }}>{amount(r.creditMinor, ccy)}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{minor(r.balanceMinor, ccy)}</td>
                                    </tr>
                                ))}
                                <tr><td style={{ color: 'var(--text-2)' }}>{st.to || ''}</td><td colSpan={5} style={{ fontWeight: 600 }}>Closing balance</td><td style={{ textAlign: 'right', fontWeight: 700 }}>{minor(st.closingBalanceMinor, ccy)}</td></tr>
                            </tbody>
                        </table>
                    </ExportArea>
                    {!st.reconciled && <Notice kind="warn">The closing balance differs from the wallet's current balance ({minor(st.currentBalanceMinor, ccy)}).</Notice>}
                </Section>
            )}
        </Page>
    );
}
