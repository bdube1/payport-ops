import { useState } from 'react';
import { Link } from 'react-router-dom';
import { walletsAdminApi } from '../../lib/api';
import { Page, Section, Notice, Table, Badge, CurrencySelect, useLoad, minor, show } from '../../components/kit';

/** Every wallet holder's balance, largest first. */
export default function WalletBalancesPage() {
    const [currency, setCurrency] = useState('');
    const [q, setQ] = useState('');
    const [query, setQuery] = useState('');
    const r = useLoad(() => walletsAdminApi.balances(currency, query), [currency, query]);
    const v = r.value || {};
    return (
        <Page title="Wallet Balances">
            {r.error && <Notice kind="error">{r.error}</Notice>}
            {(v.totals || []).length > 0 && (
                <div className="op-kpis" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                    {v.totals.map(t => (
                        <div key={t.currency} className="card op-kpi">
                            <div className="op-kpi-label">{t.currency} wallets · {t.wallets}</div>
                            <div className="op-kpi-value">{minor(t.balanceMinor, t.currency)}</div>
                        </div>
                    ))}
                </div>
            )}
            <Section title="Balances" right={<form onSubmit={e => { e.preventDefault(); setQuery(q.trim()); }} style={{ display: 'flex', gap: 8 }}>
                <CurrencySelect value={currency} onChange={setCurrency} allLabel="All currencies" />
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, phone, ID or wallet" style={{ width: 240 }} />
                <button className="btn btn-primary btn-sm">Search</button>
            </form>}>
                {r.loading && !r.value ? <div className="spinner" /> : (
                    <Table rows={v.rows} empty="No wallets." exportName="Wallet balances" columns={[
                        { key: 'rank', label: '#', render: x => (v.rows.indexOf(x) + 1) },
                        { key: 'full_name', label: 'Holder' },
                        { key: 'id_number', label: 'ID Number' },
                        { key: 'phone', label: 'Phone' },
                        { key: 'wallet_ref', label: 'Wallet', render: x => <Link to={`/customer-wallets/statement?ref=${encodeURIComponent(x.wallet_ref)}`} className="mono">{x.wallet_ref}</Link> },
                        { key: 'currency', label: 'Currency' },
                        { key: 'balance_minor', label: 'Balance', render: x => <b>{minor(x.balance_minor, x.currency)}</b> },
                        { key: 'status', label: 'Status', render: x => <Badge value={x.status} /> },
                        { key: 'created_at', label: 'Opened', render: x => show(x.created_at).slice(0, 10) },
                    ]} />
                )}
            </Section>
        </Page>
    );
}
