import { useState } from 'react';
import { walletsAdminApi } from '../../lib/api';
import { useAuth } from '../../lib/auth.jsx';
import { Page, Section, Table, Notice, useLoad, Badge, FormButton, Act, minor } from '../../components/kit';

/** Customer wallets: find, statement, freeze (ops) / unfreeze and tier (compliance), refund a wallet payment (finance). */
export default function CustomerWalletsPage() {
    const { user } = useAuth();
    const role = user?.role;
    const [q, setQ] = useState('');
    const [query, setQuery] = useState('');
    const list = useLoad(() => walletsAdminApi.search(query), [query]);
    const totals = useLoad(() => (['ADMIN', 'FINANCE', 'COMPLIANCE'].includes(role) ? walletsAdminApi.totals() : Promise.resolve({ data: { data: [] } })), [role]);
    const [open, setOpen] = useState(null);
    const statement = useLoad(() => (open ? walletsAdminApi.statement(open) : Promise.resolve({ data: { data: [] } })), [open]);
    const reload = () => { list.reload(); totals.reload(); statement.reload(); };
    return (
        <Page title="Customer wallets" subtitle="Balances are the ledger's CUSTOMER_WALLET accounts. Freezing stops all spending at once; only compliance or an administrator unfreezes. Tier changes need KYC evidence."
            actions={['ADMIN', 'FINANCE'].includes(role) && <FormButton label="Refund a wallet payment" title="Refund to wallet"
                intro="Puts a payment that was paid from a wallet back into that wallet and closes the payment as REFUNDED."
                fields={[{ name: 'reference', label: 'Payment reference', required: true }, { name: 'reason', label: 'Reason', type: 'textarea', required: true }]}
                onSubmit={v => walletsAdminApi.refund(v.reference.trim(), v.reason)} onDone={reload} />}>
            {list.error && <Notice kind="error">{list.error}</Notice>}
            {totals.value?.length > 0 && <Section title="Totals">
                <Table rows={totals.value} columns={[{ key: 'currency', label: 'Currency' }, { key: 'wallets', label: 'Wallets' }, { key: 'frozen', label: 'Frozen' },
                    { key: 'balance_minor', label: 'Held for customers', render: r => minor(r.balance_minor, r.currency) }]} />
            </Section>}
            <Section title="Wallets" right={<form onSubmit={e => { e.preventDefault(); setQuery(q); }} style={{ display: 'flex', gap: 6 }}>
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="Wallet number or phone" style={{ padding: 6, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)' }} />
                <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 12.5 }}>Search</button></form>}>
                <Table rows={list.value} onRow={r => setOpen(r.wallet_ref)} empty="No wallets." columns={[
                    { key: 'wallet_ref', label: 'Wallet' }, { key: 'full_name', label: 'Holder' }, { key: 'phone', label: 'Phone' }, { key: 'currency', label: 'Ccy' },
                    { key: 'balance_minor', label: 'Balance', render: r => minor(r.balance_minor, r.currency) }, { key: 'tier', label: 'Tier' },
                    { key: 'status', label: 'Status', render: r => <Badge value={r.status} /> }, { key: 'status_reason', label: 'Reason' },
                    { key: 'actions', label: '', render: r => <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                        {r.status === 'ACTIVE' && ['ADMIN', 'OPS', 'COMPLIANCE'].includes(role) && <FormButton label="Freeze" kind="ghost" title={`Freeze ${r.wallet_ref}`} submitLabel="Freeze"
                            fields={[{ name: 'reason', label: 'Reason', type: 'textarea', required: true }]} onSubmit={v => walletsAdminApi.setStatus(r.wallet_ref, 'FROZEN', v.reason)} onDone={reload} />}
                        {r.status === 'FROZEN' && ['ADMIN', 'COMPLIANCE'].includes(role) && <FormButton label="Unfreeze" title={`Unfreeze ${r.wallet_ref}`} submitLabel="Unfreeze"
                            fields={[{ name: 'reason', label: 'Reason', type: 'textarea', required: true }]} onSubmit={v => walletsAdminApi.setStatus(r.wallet_ref, 'ACTIVE', v.reason)} onDone={reload} />}
                        {role === 'COMPLIANCE' && <FormButton label="Tier" kind="ghost" title={`KYC tier for ${r.wallet_ref}`} submitLabel="Set tier"
                            fields={[{ name: 'tier', label: 'Tier', type: 'select', options: ['TIER1', 'TIER2', 'TIER3'], required: true, initial: r.tier },
                                { name: 'reason', label: 'KYC evidence', type: 'textarea', required: true }]} onSubmit={v => walletsAdminApi.setTier(r.wallet_ref, v.tier, v.reason)} onDone={reload} />}
                    </div> },
                ]} />
            </Section>
            {open && <Section title={`Statement ${open}`} right={<Act label="Close" kind="ghost" run={async () => setOpen(null)} done="" />}>
                <Table rows={statement.value} empty="No operations." columns={[
                    { key: 'created_at', label: 'When' }, { key: 'kind', label: 'Type', render: r => <Badge value={r.kind} /> }, { key: 'direction', label: 'Dir' },
                    { key: 'amount_minor', label: 'Amount', render: r => minor(r.amount_minor, r.currency) }, { key: 'counterparty', label: 'With' },
                    { key: 'reference', label: 'Reference' }, { key: 'entry_ref', label: 'Ledger entry' },
                ]} />
            </Section>}
        </Page>
    );
}
