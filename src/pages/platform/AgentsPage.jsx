import { useState } from 'react';
import { agentsAdminApi } from '../../lib/api';
import { useAuth } from '../../lib/auth.jsx';
import { Page, Section, Table, Notice, useLoad, Badge, FormButton, Act, minor, show, ShowOnce } from '../../components/kit';

const sum = (rows, kind, field) => (rows || []).filter(r => !kind || r.kind === kind)
    .reduce((acc, r) => ({ ...acc, [r.currency]: (acc[r.currency] || 0) + Number(r[field] || 0) }), {});
const money = (byCcy) => Object.keys(byCcy).length ? Object.entries(byCcy).map(([c, v]) => minor(v, c)).join(' · ') : '—';
const count = (rows, kind) => (rows || []).filter(r => !kind || r.kind === kind).reduce((n, r) => n + Number(r.count || 0), 0);

function Stat({ label, value, sub }) {
    return (
        <div className="card" style={{ padding: 16, minWidth: 170, flex: 1 }}>
            <div style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 700 }}>{label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, marginTop: 6 }}>{value}</div>
            {sub && <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 4 }}>{sub}</div>}
        </div>
    );
}

function loginShown(login, agent) {
    return login ? {
        title: 'Agent portal login',
        note: login.emailed ? 'This was also emailed to the agent. It is shown only once.' : 'Email could not be sent. Give these details to the agent; they are shown only once.',
        items: [{ label: 'Agent code', value: agent?.agent_code }, { label: 'Sign-in email', value: login.email }, { label: 'Temporary password', value: login.temporaryPassword }],
    } : null;
}

function AgentDetail({ id, role, onClose, onChanged, onSecret }) {
    const d = useLoad(() => agentsAdminApi.detail(id), [id]);
    const a = d.value;
    const reload = () => { d.reload(); onChanged(); };
    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 900, display: 'flex', justifyContent: 'flex-end' }} onClick={onClose}>
            <div onClick={e => e.stopPropagation()} style={{ width: 'min(760px, 100%)', height: '100%', overflow: 'auto', background: 'var(--bg)', padding: 24 }}>
                {d.error && <Notice kind="error">{d.error}</Notice>}
                {a && <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                        <div>
                            <div style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--text-2)' }}>{a.agent_code}</div>
                            <h2 style={{ margin: '4px 0', fontSize: 20, fontWeight: 800 }}>{a.name}</h2>
                            <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{[a.contact_person, a.location, a.phone, a.email].filter(Boolean).join(' · ')}</div>
                            {a.application_reference && <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>Application {a.application_reference}</div>}
                        </div>
                        <button className="btn btn-ghost" onClick={onClose}>Close</button>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '14px 0' }}>
                        <Badge value={a.status} />
                        {['ADMIN', 'OPS', 'COMPLIANCE'].includes(role) && <FormButton label="Edit" kind="ghost" title={`Edit ${a.agent_code}`} submitLabel="Save"
                            fields={[{ name: 'name', label: 'Business name', initial: a.name }, { name: 'contactPerson', label: 'Contact person', initial: a.contact_person || '' },
                                { name: 'phone', label: 'Mobile number', initial: a.phone }, { name: 'email', label: 'Email', initial: a.email || '' },
                                { name: 'idNumber', label: 'National ID / registration number', initial: a.id_number || '' },
                                { name: 'location', label: 'Location', initial: a.location },
                                { name: 'commissionBps', label: 'Commission (basis points, blank = default)', type: 'number', initial: a.commission_bps ?? '' }]}
                            onSubmit={v => agentsAdminApi.update(a.id, { ...v, commissionBps: v.commissionBps === '' ? null : v.commissionBps })} onDone={reload} />}
                        {a.status === 'PENDING' && ['ADMIN', 'COMPLIANCE'].includes(role) && <>
                            <Act label="Approve" kind="success" confirm={`Approve ${a.name} as an agent?`} run={() => agentsAdminApi.decide(a.id, true, null, null)}
                                done={(r) => { reload(); onSecret(loginShown(r?.login, r)); }} />
                            <Act label="Reject" kind="danger" confirm={`Reject ${a.name}?`} run={() => agentsAdminApi.decide(a.id, false, null, null)} done={reload} />
                        </>}
                        {a.status === 'ACTIVE' && ['ADMIN', 'OPS', 'COMPLIANCE'].includes(role) &&
                            <Act label="Suspend" kind="danger" confirm={`Suspend ${a.name}?`} run={() => agentsAdminApi.setStatus(a.id, 'SUSPENDED', null)} done={reload} />}
                        {a.status === 'SUSPENDED' && ['ADMIN', 'COMPLIANCE'].includes(role) &&
                            <Act label="Reinstate" kind="success" confirm={`Reinstate ${a.name}?`} run={() => agentsAdminApi.setStatus(a.id, 'ACTIVE', null)} done={reload} />}
                    </div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
                        <Stat label="Float" value={money(a.float || {})} />
                        <Stat label="Cash-in" value={money(sum(a.totals, 'CASH_IN', 'amount_minor'))} sub={`${count(a.totals, 'CASH_IN')} transactions`} />
                        <Stat label="Cash-out" value={money(sum(a.totals, 'CASH_OUT', 'amount_minor'))} sub={`${count(a.totals, 'CASH_OUT')} transactions`} />
                        <Stat label="Commission earned" value={money(sum(a.totals, null, 'commission_minor'))} sub={`Rate: ${a.commission_bps ?? 'default'} bps`} />
                    </div>
                    <Section title="Portal logins" right={['ADMIN', 'OPS', 'COMPLIANCE'].includes(role) && a.status !== 'PENDING' && a.status !== 'REJECTED' &&
                        <FormButton label="Add login" kind="ghost" title={`Portal login for ${a.name}`} submitLabel="Create login"
                            fields={[{ name: 'fullName', label: 'Full name', required: true, initial: a.contact_person || '' }, { name: 'email', label: 'Email', required: true }]}
                            onSubmit={v => agentsAdminApi.createLogin(a.id, v.fullName, v.email)} onDone={(l) => { reload(); onSecret(loginShown(l, a)); }} />}>
                        <Table rows={a.users} empty="No portal login yet." columns={[
                            { key: 'full_name', label: 'Name' }, { key: 'email', label: 'Email' }, { key: 'status', label: 'Status', render: r => <Badge value={r.account_locked ? 'LOCKED' : r.status} /> },
                            { key: 'last_login_at', label: 'Last sign-in', render: r => show(r.last_login_at) },
                            { key: 'actions', label: '', render: r => ['ADMIN', 'OPS'].includes(role) && <Act label="Reset password" kind="ghost" confirm={`Reset the password for ${r.email}?`}
                                run={() => agentsAdminApi.resetLogin(a.id, r.id)} done={(l) => { reload(); onSecret(loginShown(l, a)); }} /> },
                        ]} />
                    </Section>
                    <Section title="Transactions">
                        <Table rows={a.transactions} empty="No transactions yet." columns={[
                            { key: 'created_at', label: 'When', render: r => show(r.created_at) }, { key: 'kind', label: 'Type' },
                            { key: 'amount_minor', label: 'Amount', render: r => minor(r.amount_minor, r.currency) },
                            { key: 'commission_minor', label: 'Commission', render: r => minor(r.commission_minor, r.currency) },
                            { key: 'wallet_ref', label: 'Wallet' }, { key: 'op_ref', label: 'Reference' },
                        ]} />
                    </Section>
                    <Section title="Float deposits">
                        <Table rows={a.deposits} empty="No float deposits yet." columns={[
                            { key: 'created_at', label: 'When', render: r => show(r.created_at) }, { key: 'amount_minor', label: 'Amount', render: r => minor(r.amount_minor, r.currency) },
                            { key: 'bank_reference', label: 'Bank reference' }, { key: 'status', label: 'Status', render: r => <Badge value={r.status} /> },
                            { key: 'approved_by', label: 'Decided by' },
                        ]} />
                    </Section>
                </>}
            </div>
        </div>
    );
}

export default function AgentsPage({ view = 'list' }) {
    const { user } = useAuth();
    const role = user?.role;
    const canSeeMoney = ['ADMIN', 'FINANCE', 'COMPLIANCE'].includes(role);
    const agents = useLoad(() => agentsAdminApi.list());
    const dash = useLoad(() => agentsAdminApi.dashboard());
    const pending = useLoad(() => (canSeeMoney ? agentsAdminApi.deposits('PENDING') : Promise.resolve({ data: { data: [] } })), [role]);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [openId, setOpenId] = useState(null);
    const [secret, setSecret] = useState(null);
    const reload = () => { agents.reload(); dash.reload(); pending.reload(); };

    const d = dash.value || {};
    const byStatus = Object.fromEntries((d.byStatus || []).map(r => [r.status, Number(r.count)]));
    const floatTotals = Object.fromEntries((d.float || []).map(r => [r.currency, Number(r.balance_minor)]));
    const q = search.trim().toLowerCase();
    const rows = (agents.value || []).filter(a => (!status || a.status === status)
        && (!q || [a.agent_code, a.name, a.contact_person, a.phone, a.email, a.location, a.application_reference].some(v => String(v || '').toLowerCase().includes(q))));
    const floats = (f) => Object.entries(f || {}).map(([c, v]) => minor(v, c)).join(' · ');

    return (
        <Page title={view === 'dashboard' ? 'Agents Dashboard' : 'Agents'} actions={<>
            {['ADMIN', 'OPS', 'COMPLIANCE'].includes(role) && <FormButton label="Onboard agent" title="Onboard an agent" submitLabel="Onboard"
                fields={[{ name: 'name', label: 'Agent business name (as customers see it)', required: true },
                    { name: 'contactPerson', label: 'Contact person', required: true },
                    { name: 'phone', label: 'Mobile number (e.g. +263771234567)', required: true },
                    { name: 'email', label: 'Email (for the agent portal login)', required: true },
                    { name: 'idNumber', label: 'National ID / registration number' },
                    { name: 'location', label: 'Location / address', required: true },
                    { name: 'commissionBps', label: 'Commission (basis points, blank = default)', type: 'number' }]}
                onSubmit={v => agentsAdminApi.onboard({ ...v, commissionBps: v.commissionBps === '' ? null : v.commissionBps })}
                onDone={(a) => { reload(); setSecret(loginShown(a?.login, a)); if (a?.id) setOpenId(a.id); }} />}
            {['ADMIN', 'FINANCE'].includes(role) && <FormButton label="Record float deposit" kind="ghost" title="Float deposit seen on the bank statement"
                fields={[{ name: 'agentId', label: 'Agent', type: 'select', required: true, options: (agents.value || []).filter(a => a.status === 'ACTIVE').map(a => ({ value: a.id, label: `${a.agent_code} ${a.name}` })) },
                    { name: 'currency', label: 'Currency', type: 'currency', required: true }, { name: 'amount', label: 'Amount', type: 'number', step: '0.01', required: true },
                    { name: 'bankReference', label: 'Bank reference', required: true }]}
                onSubmit={v => agentsAdminApi.recordDeposit(Number(v.agentId), Math.round(Number(v.amount) * 100), v.currency, v.bankReference.trim())} onDone={reload} />}
        </>}>
            {(agents.error || dash.error) && <Notice kind="error">{agents.error || dash.error}</Notice>}

            {view === 'dashboard' && <>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
                <Stat label="Active agents" value={byStatus.ACTIVE || 0} sub={`${byStatus.PENDING || 0} pending · ${byStatus.SUSPENDED || 0} suspended`} />
                <Stat label="Float held by agents" value={money(floatTotals)} />
                <Stat label="Cash-in today" value={money(sum(d.today, 'CASH_IN', 'amount_minor'))} sub={`${count(d.today, 'CASH_IN')} transactions`} />
                <Stat label="Cash-out today" value={money(sum(d.today, 'CASH_OUT', 'amount_minor'))} sub={`${count(d.today, 'CASH_OUT')} transactions`} />
                <Stat label="Commission, last 30 days" value={money(sum(d.last30Days, null, 'commission_minor'))} sub={`${count(d.last30Days)} transactions`} />
                <Stat label="Waiting for action" value={(d.pendingApplications || 0) + (d.pendingDeposits || 0)} sub={`${d.pendingApplications || 0} applications · ${d.pendingDeposits || 0} deposits`} />
            </div>

            {(d.topAgents || []).length > 0 && <Section title="Top agents, last 30 days">
                <Table rows={d.topAgents} onRow={r => setOpenId(r.id)} columns={[
                    { key: 'agent_code', label: 'Code' }, { key: 'name', label: 'Agent' }, { key: 'location', label: 'Location' },
                    { key: 'count', label: 'Transactions' }, { key: 'amount_minor', label: 'Volume', render: r => minor(r.amount_minor, r.currency) },
                    { key: 'commission_minor', label: 'Commission', render: r => minor(r.commission_minor, r.currency) },
                ]} />
            </Section>}

            {pending.value?.length > 0 && <Section title="Float deposits awaiting approval">
                <Table rows={pending.value} columns={[
                    { key: 'agent_code', label: 'Agent' }, { key: 'name', label: 'Name' }, { key: 'amount_minor', label: 'Amount', render: r => minor(r.amount_minor, r.currency) },
                    { key: 'bank_reference', label: 'Bank reference' }, { key: 'created_by', label: 'Recorded by' }, { key: 'created_at', label: 'At', render: r => show(r.created_at) },
                    { key: 'actions', label: '', render: r => ['ADMIN', 'FINANCE'].includes(role) && <div style={{ display: 'flex', gap: 6 }}>
                        <Act label="Approve" kind="success" run={() => agentsAdminApi.decideDeposit(r.id, true, 'Seen on the bank statement')} done={reload} />
                        <Act label="Reject" kind="danger" run={() => agentsAdminApi.decideDeposit(r.id, false, 'Rejected from the ops console')} done={reload} />
                    </div> },
                ]} />
            </Section>}

            {(agents.value || []).some(a => a.status === 'PENDING') && <Section title="Applications awaiting a decision">
                <Table rows={(agents.value || []).filter(a => a.status === 'PENDING')} onRow={r => setOpenId(r.id)} columns={[
                    { key: 'application_reference', label: 'Reference' }, { key: 'name', label: 'Business' }, { key: 'contact_person', label: 'Contact' },
                    { key: 'phone', label: 'Phone' }, { key: 'location', label: 'Location' }, { key: 'applied_at', label: 'Applied', render: r => show(r.applied_at) },
                ]} />
            </Section>}
            </>}

            {view !== 'dashboard' && <Section title="All agents" right={<>
                <input placeholder="Search code, name, phone, location" value={search} onChange={e => setSearch(e.target.value)}
                    style={{ padding: '7px 10px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)', fontSize: 13, minWidth: 240 }} />
                <select value={status} onChange={e => setStatus(e.target.value)}
                    style={{ padding: '7px 10px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)', fontSize: 13 }}>
                    <option value="">All statuses</option>{['ACTIVE', 'PENDING', 'SUSPENDED', 'REJECTED'].map(s => <option key={s}>{s}</option>)}
                </select></>}>
                <Table rows={rows} empty="No agents yet." onRow={r => setOpenId(r.id)} columns={[
                    { key: 'agent_code', label: 'Agent code' }, { key: 'name', label: 'Name' }, { key: 'contact_person', label: 'Contact' }, { key: 'phone', label: 'Phone' },
                    { key: 'application_reference', label: 'Application' },
                    { key: 'location', label: 'Location' }, { key: 'float', label: 'Float', render: r => floats(r.float) },
                    { key: 'status', label: 'Status', render: r => <Badge value={r.status} /> },
                ]} />
            </Section>}

            {openId && <AgentDetail id={openId} role={role} onClose={() => setOpenId(null)} onChanged={reload} onSecret={setSecret} />}
            {secret && <ShowOnce {...secret} onClose={() => setSecret(null)} />}
        </Page>
    );
}
