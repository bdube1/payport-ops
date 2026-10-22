import { useState } from 'react';
import { ledgerApi } from '../../lib/api';
import { useAuth } from '../../lib/auth.jsx';
import { Page, Section, Table, Notice, useLoad, Badge, Act, minor } from '../../components/kit';

/** The double-entry ledger: integrity, trial balance by entity/category/currency, and accounts. Read-only. */
export default function LedgerPage() {
    const { user } = useAuth();
    const canIntegrity = ['ADMIN', 'FINANCE'].includes(user?.role);
    const integrity = useLoad(() => (canIntegrity ? ledgerApi.integrity() : Promise.resolve({ data: { data: null } })), [canIntegrity]);
    const tb = useLoad(() => ledgerApi.trialBalance());
    const [filter, setFilter] = useState({ category: '', owner: '', currency: '' });
    const [applied, setApplied] = useState({});
    const accounts = useLoad(() => ledgerApi.accounts(applied), [JSON.stringify(applied)]);
    const inp = { padding: 6, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)', width: 150 };
    return (
        <Page title="Ledger" subtitle="Every money movement is a balanced journal posted through the database's ledger procedures. Liability accounts (wallets, merchant payables, agent float) cannot go below zero.">
            {integrity.value && (integrity.value.healthy
                ? <Notice kind="ok">Integrity checks pass. Last scheduled run: {String(integrity.value.lastScheduledRun)}</Notice>
                : <Notice kind="error">Integrity violations: {integrity.value.violations.length}. See below.</Notice>)}
            {canIntegrity && integrity.value && !integrity.value.healthy && <Section title="Violations">
                <Table rows={integrity.value.violations} columns={[{ key: 'checkCode', label: 'Check' }, { key: 'subject', label: 'Subject' }, { key: 'detail', label: 'Detail' }]} />
            </Section>}
            {canIntegrity && <div style={{ marginBottom: 14 }}><Act label="Run integrity check now" run={() => ledgerApi.runIntegrity()} done={integrity.reload} /></div>}
            <Section title="Trial balance">
                {tb.error && <Notice kind="error">{tb.error}</Notice>}
                <Table rows={tb.value} empty="No postings yet." columns={[
                    { key: 'entity_code', label: 'Entity' }, { key: 'book', label: 'Book' }, { key: 'account_type', label: 'Type' }, { key: 'category', label: 'Category', render: r => <Badge value={r.category} /> },
                    { key: 'currency', label: 'Ccy' }, { key: 'accounts', label: 'Accounts' },
                    { key: 'debit_total', label: 'Debits', render: r => minor(r.debit_total) }, { key: 'credit_total', label: 'Credits', render: r => minor(r.credit_total) },
                    { key: 'balance', label: 'Balance', render: r => minor(r.balance) },
                ]} />
            </Section>
            <Section title="Accounts" right={<form onSubmit={e => { e.preventDefault(); setApplied(Object.fromEntries(Object.entries(filter).filter(([, v]) => v))); }} style={{ display: 'flex', gap: 6 }}>
                <input style={inp} placeholder="Category" value={filter.category} onChange={e => setFilter({ ...filter, category: e.target.value })} />
                <input style={inp} placeholder="Owner contains" value={filter.owner} onChange={e => setFilter({ ...filter, owner: e.target.value })} />
                <input style={{ ...inp, width: 80 }} placeholder="Ccy" value={filter.currency} onChange={e => setFilter({ ...filter, currency: e.target.value })} />
                <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 12.5 }}>Filter</button></form>}>
                <Table rows={accounts.value} empty="No accounts." columns={[
                    { key: 'code', label: 'Account' }, { key: 'status', label: 'Status' },
                    { key: 'debit_total', label: 'Debits', render: r => minor(r.debit_total) }, { key: 'credit_total', label: 'Credits', render: r => minor(r.credit_total) },
                    { key: 'balance', label: 'Balance', render: r => minor(r.balance, r.currency) },
                ]} />
            </Section>
        </Page>
    );
}
