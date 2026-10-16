import { agentsAdminApi } from '../../lib/api';
import { useAuth } from '../../lib/auth.jsx';
import { Page, Section, Table, Notice, useLoad, Badge, FormButton, minor } from '../../components/kit';

/** Agents: compliance approval, suspension, and four-eyes float deposits (recorded by one person, approved by another). */
export default function AgentsPage() {
    const { user } = useAuth();
    const role = user?.role;
    const agents = useLoad(() => agentsAdminApi.list());
    const pending = useLoad(() => (['ADMIN', 'FINANCE', 'COMPLIANCE'].includes(role) ? agentsAdminApi.deposits('PENDING') : Promise.resolve({ data: { data: [] } })), [role]);
    const all = useLoad(() => (['ADMIN', 'FINANCE', 'COMPLIANCE'].includes(role) ? agentsAdminApi.deposits() : Promise.resolve({ data: { data: [] } })), [role]);
    const reload = () => { agents.reload(); pending.reload(); all.reload(); };
    const floats = (f) => Object.entries(f || {}).map(([c, v]) => minor(v, c)).join(' · ');
    return (
        <Page title="Agents" subtitle="Cash-in / cash-out agents. Applications are approved by compliance; float is bought with a bank deposit that finance confirms against the statement (the recorder cannot approve)."
            actions={['ADMIN', 'FINANCE'].includes(role) && <FormButton label="Record float deposit" title="Float deposit seen on the bank statement"
                fields={[{ name: 'agentId', label: 'Agent', type: 'select', required: true, options: (agents.value || []).filter(a => a.status === 'ACTIVE').map(a => ({ value: a.id, label: `${a.agent_code} ${a.name}` })) },
                    { name: 'currency', label: 'Currency', required: true }, { name: 'amount', label: 'Amount', type: 'number', step: '0.01', required: true },
                    { name: 'bankReference', label: 'Bank reference', required: true }]}
                onSubmit={v => agentsAdminApi.recordDeposit(Number(v.agentId), Math.round(Number(v.amount) * 100), v.currency.trim().toUpperCase(), v.bankReference.trim())} onDone={reload} />}>
            {agents.error && <Notice kind="error">{agents.error}</Notice>}
            {pending.value?.length > 0 && <Section title="Float deposits awaiting approval">
                <Table rows={pending.value} columns={[
                    { key: 'agent_code', label: 'Agent' }, { key: 'name', label: 'Name' }, { key: 'amount_minor', label: 'Amount', render: r => minor(r.amount_minor, r.currency) },
                    { key: 'bank_reference', label: 'Bank reference' }, { key: 'created_by', label: 'Recorded by' }, { key: 'created_at', label: 'At' },
                    { key: 'actions', label: '', render: r => ['ADMIN', 'FINANCE'].includes(role) && <div style={{ display: 'flex', gap: 6 }}>
                        <FormButton label="Approve" title="Approve float deposit" intro="Only after you have seen the deposit on PayPort's bank statement." submitLabel="Approve"
                            fields={[{ name: 'note', label: 'Note (statement line)', required: true }]} onSubmit={v => agentsAdminApi.decideDeposit(r.id, true, v.note)} onDone={reload} />
                        <FormButton label="Reject" kind="ghost" title="Reject float deposit" submitLabel="Reject"
                            fields={[{ name: 'note', label: 'Why', required: true }]} onSubmit={v => agentsAdminApi.decideDeposit(r.id, false, v.note)} onDone={reload} />
                    </div> },
                ]} />
            </Section>}
            <Section title="Agents">
                <Table rows={agents.value} empty="No agents yet." columns={[
                    { key: 'agent_code', label: 'Code' }, { key: 'name', label: 'Name' }, { key: 'business_name', label: 'Merchant' }, { key: 'phone', label: 'Phone' },
                    { key: 'location', label: 'Location' }, { key: 'country', label: 'Market' }, { key: 'float', label: 'Float', render: r => floats(r.float) },
                    { key: 'commission_bps', label: 'Commission (bps)' }, { key: 'status', label: 'Status', render: r => <Badge value={r.status} /> },
                    { key: 'actions', label: '', render: r => <div style={{ display: 'flex', gap: 6 }}>
                        {r.status === 'PENDING' && role === 'COMPLIANCE' && <>
                            <FormButton label="Approve" title={`Approve agent ${r.agent_code}`} submitLabel="Approve"
                                fields={[{ name: 'reason', label: 'Due-diligence evidence', type: 'textarea', required: true },
                                    { name: 'commissionBps', label: 'Own commission rate (bps, blank = default)', type: 'number' }]}
                                onSubmit={v => agentsAdminApi.decide(r.id, true, v.reason, v.commissionBps === '' ? null : v.commissionBps)} onDone={reload} />
                            <FormButton label="Reject" kind="ghost" title={`Reject agent ${r.agent_code}`} submitLabel="Reject"
                                fields={[{ name: 'reason', label: 'Why', type: 'textarea', required: true }]} onSubmit={v => agentsAdminApi.decide(r.id, false, v.reason, null)} onDone={reload} />
                        </>}
                        {r.status === 'ACTIVE' && ['ADMIN', 'OPS', 'COMPLIANCE'].includes(role) && <FormButton label="Suspend" kind="ghost" title={`Suspend ${r.agent_code}`} submitLabel="Suspend"
                            fields={[{ name: 'reason', label: 'Reason', type: 'textarea', required: true }]} onSubmit={v => agentsAdminApi.setStatus(r.id, 'SUSPENDED', v.reason)} onDone={reload} />}
                        {r.status === 'SUSPENDED' && ['ADMIN', 'COMPLIANCE'].includes(role) && <FormButton label="Reinstate" title={`Reinstate ${r.agent_code}`} submitLabel="Reinstate"
                            fields={[{ name: 'reason', label: 'Reason', type: 'textarea', required: true }]} onSubmit={v => agentsAdminApi.setStatus(r.id, 'ACTIVE', v.reason)} onDone={reload} />}
                    </div> },
                ]} />
            </Section>
            {all.value?.length > 0 && <Section title="All float deposits">
                <Table rows={all.value} columns={[
                    { key: 'agent_code', label: 'Agent' }, { key: 'amount_minor', label: 'Amount', render: r => minor(r.amount_minor, r.currency) },
                    { key: 'bank_reference', label: 'Bank reference' }, { key: 'status', label: 'Status', render: r => <Badge value={r.status} /> },
                    { key: 'created_by', label: 'Recorded by' }, { key: 'approved_by', label: 'Decided by' }, { key: 'entry_ref', label: 'Ledger entry' },
                ]} />
            </Section>}
        </Page>
    );
}
