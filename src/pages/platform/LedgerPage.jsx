import { useState } from 'react';
import { ledgerApi } from '../../lib/api';
import { useAuth } from '../../lib/auth.jsx';
import { Page, Section, Table, Notice, useLoad, Badge, Act, FormButton, minor, show, CurrencySelect } from '../../components/kit';

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
    const isAdmin = user?.role === 'ADMIN', isFinance = user?.role === 'FINANCE';
    const [account, setAccount] = useState('');
    const [bal, setBal] = useState(null);
    const [diffsOnly, setDiffsOnly] = useState(true);
    const shadow = useLoad(() => (canIntegrity ? ledgerApi.shadowComparison(diffsOnly) : Promise.resolve({ data: { data: null } })), [canIntegrity, diffsOnly]);
    const failures = useLoad(() => (canIntegrity ? ledgerApi.shadowFailures(true) : Promise.resolve({ data: { data: [] } })), [canIntegrity]);
    const taxes = useLoad(() => (canIntegrity ? ledgerApi.taxRates() : Promise.resolve({ data: { data: [] } })), [canIntegrity]);
    const lookup = async (e) => {
        e.preventDefault();
        try { const r = await ledgerApi.balance(account.trim()); setBal(r.data?.data ?? r.data); } catch (err) { setBal({ error: err?.response?.data?.message || 'Not found' }); }
    };
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
                <CurrencySelect value={filter.currency} onChange={v => setFilter({ ...filter, currency: v })} allLabel="All currencies" />
                <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 12.5 }}>Filter</button></form>}>
                <Table rows={accounts.value} empty="No accounts." columns={[
                    { key: 'code', label: 'Account' }, { key: 'status', label: 'Status' },
                    { key: 'debit_total', label: 'Debits', render: r => minor(r.debit_total) }, { key: 'credit_total', label: 'Credits', render: r => minor(r.credit_total) },
                    { key: 'balance', label: 'Balance', render: r => minor(r.balance, r.currency) },
                ]} />
            </Section>
            <Section title="Account balance" right={<form onSubmit={lookup} style={{ display: 'flex', gap: 6 }}>
                <input style={{ ...inp, width: 340 }} placeholder="Account code" value={account} onChange={e => setAccount(e.target.value)} />
                <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 12.5 }}>Look up</button></form>}>
                {bal && (bal.error ? <Notice kind="error">{bal.error}</Notice> : <Table rows={[bal]} columns={[
                    { key: 'account', label: 'Account', render: r => show(r.account?.code || account) },
                    { key: 'debitTotal', label: 'Debits', render: r => minor(r.debitTotal) }, { key: 'creditTotal', label: 'Credits', render: r => minor(r.creditTotal) },
                    { key: 'balance', label: 'Balance', render: r => minor(r.balance) }]} />)}
            </Section>
            {canIntegrity && <Section title="Shadow ledger" right={<>
                <label style={{ fontSize: 12.5, display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input type="checkbox" checked={diffsOnly} onChange={e => setDiffsOnly(e.target.checked)} /> Differences only</label>
                <Act label="Run now" kind="ghost" run={() => ledgerApi.runShadow()} done={() => { shadow.reload(); failures.reload(); }} />
                {isAdmin && <FormButton label="Backfill" kind="ghost" title="Post history to the shadow ledger" submitLabel="Backfill"
                    fields={[{ name: 'from', label: 'From date (YYYY-MM-DD)', required: true }]} onSubmit={v => ledgerApi.backfillShadow(v.from.trim())}
                    onDone={() => { shadow.reload(); failures.reload(); }} />}</>}>
                {shadow.error && <Notice kind="error">{shadow.error}</Notice>}
                {shadow.value && <p style={{ fontSize: 13, margin: '0 0 10px' }}>{shadow.value.matching} matching · {shadow.value.withDifferences} with differences · {shadow.value.merchantCurrencyPairs} merchant-currency pairs</p>}
                <Table rows={shadow.value?.rows} empty="No differences." />
                {(failures.value || []).length > 0 && <>
                    <h3 style={{ fontSize: 14, margin: '16px 0 8px' }}>Postings that failed</h3>
                    <Table rows={failures.value} columns={[
                        { key: 'idempotencyKey', label: 'Key' }, { key: 'templateCode', label: 'Template' }, { key: 'sourceRef', label: 'Source' },
                        { key: 'errorCode', label: 'Error' }, { key: 'message', label: 'Message' }, { key: 'attempts', label: 'Attempts' },
                        { key: 'act', label: '', render: r => <FormButton label="Resolve" kind="ghost" title={`Resolve ${r.idempotencyKey}`} submitLabel="Resolve"
                            fields={[{ name: 'resolution', label: 'Resolution', type: 'textarea', required: true }]}
                            onSubmit={v => ledgerApi.resolveShadowFailure(r.idempotencyKey, v.resolution)} onDone={failures.reload} /> },
                    ]} />
                </>}
            </Section>}
            {canIntegrity && <Section title="Tax rates" right={isFinance && <FormButton label="Propose rate" title="New tax rate" submitLabel="Propose"
                fields={[{ name: 'taxCode', label: 'Tax code (e.g. VAT, IMTT)', required: true }, { name: 'currency', label: 'Currency', type: 'currency', required: true },
                    { name: 'ratePercent', label: 'Rate (%)', type: 'number', step: '0.01', required: true }, { name: 'cap', label: 'Cap per transaction (blank = none)', type: 'number', step: '0.01' },
                    { name: 'merchantBorne', label: 'Paid by the merchant', type: 'checkbox' }, { name: 'effectiveFrom', label: 'Effective from (YYYY-MM-DD)', required: true },
                    { name: 'notes', label: 'Notes', type: 'textarea' }]}
                onSubmit={v => ledgerApi.proposeTaxRate({ entity: 'PAYPORT_ZW', taxCode: v.taxCode.trim().toUpperCase(), currency: v.currency, rateBps: Math.round(Number(v.ratePercent) * 100),
                    capMinor: v.cap === '' ? null : Math.round(Number(v.cap) * 100), merchantBorne: !!v.merchantBorne, effectiveFrom: v.effectiveFrom.trim(), notes: v.notes })}
                onDone={taxes.reload} />}>
                {taxes.error && <Notice kind="error">{taxes.error}</Notice>}
                <Table rows={taxes.value} empty="No tax rates." columns={[
                    { key: 'taxCode', label: 'Tax' }, { key: 'currency', label: 'Currency' }, { key: 'rateBps', label: 'Rate', render: r => `${(r.rateBps / 100).toFixed(2)}%` },
                    { key: 'capMinor', label: 'Cap', render: r => minor(r.capMinor, r.currency) }, { key: 'merchantBorne', label: 'Merchant pays', render: r => show(r.merchantBorne) },
                    { key: 'effectiveFrom', label: 'From' }, { key: 'effectiveTo', label: 'To' }, { key: 'status', label: 'Status', render: r => <Badge value={r.status} /> },
                    { key: 'createdBy', label: 'Proposed by' }, { key: 'approvedBy', label: 'Approved by' },
                    { key: 'act', label: '', render: r => r.status === 'PENDING' && <div style={{ display: 'flex', gap: 6 }}>
                        <Act label="Approve" kind="success" run={() => ledgerApi.approveTaxRate(r.id, '')} done={taxes.reload} />
                        <Act label="Reject" kind="danger" run={() => ledgerApi.rejectTaxRate(r.id, '')} done={taxes.reload} /></div> },
                ]} />
            </Section>}
        </Page>
    );
}
