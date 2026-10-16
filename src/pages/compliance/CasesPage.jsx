import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { complianceApi } from '../../lib/api';
import { Page, Section, Table, Notice, useLoad, Badge, Act, FormButton, KeyValues } from '../../components/kit';

function CaseDetail({ id, onChange }) {
    const { value: c, error, reload } = useLoad(() => complianceApi.case(id), [id]);
    const refresh = () => { reload(); onChange?.(); };
    return (
        <Section title={`Case #${id}`} right={<>
            <FormButton label="Assign" kind="ghost" title="Assign case" fields={[{ name: 'assignee', label: 'Assignee (staff:+263…)', type: 'text', required: true }]}
                onSubmit={v => complianceApi.assign(id, v.assignee)} onDone={refresh} />
            <FormButton label="Add note" kind="ghost" title="Case note" fields={[{ name: 'note', label: 'Note', type: 'textarea', required: true }]}
                onSubmit={v => complianceApi.note(id, v.note)} onDone={refresh} />
            <FormButton label="Propose outcome" title="Propose an outcome (first officer)"
                intro="A second officer must accept it. CONFIRMED_SUSPICIOUS drafts an STR for review; nothing is sent to the FIU automatically. Never tell the customer (tipping off)."
                fields={[{ name: 'outcome', label: 'Outcome', type: 'select', required: true, options: ['FALSE_POSITIVE', 'NO_ACTION', 'CONFIRMED_SUSPICIOUS'] },
                    { name: 'rationale', label: 'Rationale', type: 'textarea', required: true }]}
                onSubmit={v => complianceApi.propose(id, v.outcome, v.rationale)} onDone={refresh} />
            <FormButton label="Decide" kind="success" title="Decide on the proposal (second officer)" intro="You cannot decide on your own proposal."
                fields={[{ name: 'accept', label: 'Accept the proposed outcome', type: 'checkbox' }, { name: 'note', label: 'Note', type: 'textarea', required: true }]}
                onSubmit={v => complianceApi.decide(id, !!v.accept, v.note)} onDone={refresh} />
        </>}>
            {error && <Notice kind="error">{error}</Notice>}
            {c && <>
                <KeyValues obj={Object.fromEntries(Object.entries(c).filter(([k]) => !['alerts', 'notes', 'reports'].includes(k)))} />
                <h3 style={{ fontSize: 13, margin: '16px 0 6px' }}>Alerts</h3>
                <Table rows={c.alerts} columns={[{ key: 'id', label: 'ID' }, { key: 'rule_code', label: 'Rule' }, { key: 'severity', label: 'Severity', render: r => <Badge value={r.severity} /> },
                    { key: 'mode', label: 'Mode', render: r => <Badge value={r.mode} /> }, { key: 'subject_key', label: 'Subject' }, { key: 'detail', label: 'Detail' }, { key: 'created_at', label: 'At' }]} />
                <h3 style={{ fontSize: 13, margin: '16px 0 6px' }}>Notes</h3>
                <Table rows={c.notes} />
                <h3 style={{ fontSize: 13, margin: '16px 0 6px' }}>FIU reports</h3>
                <Table rows={c.reports} empty="No reports for this case." />
            </>}
        </Section>
    );
}

export default function CasesPage() {
    const [params, setParams] = useSearchParams();
    const [alertStatus, setAlertStatus] = useState('OPEN');
    const [picked, setPicked] = useState([]);
    const alerts = useLoad(() => complianceApi.alerts(alertStatus), [alertStatus]);
    const cases = useLoad(() => complianceApi.cases());
    const toggle = (id) => setPicked(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
    const caseId = params.get('case');
    return (
        <Page title="Alerts and cases" subtitle="Monitoring alerts (OBSERVE never blocks; only approved ENFORCE rules can) and investigation cases. Closing a case needs two officers.">
            <Section title="Open cases">
                {cases.error && <Notice kind="error">{cases.error}</Notice>}
                <Table rows={cases.value} onRow={r => setParams({ case: r.id })} columns={[
                    { key: 'id', label: 'ID' }, { key: 'status', label: 'Status', render: r => <Badge value={r.status} /> }, { key: 'subject_key', label: 'Subject' },
                    { key: 'assignee', label: 'Assignee' }, { key: 'proposed_outcome', label: 'Proposed' }, { key: 'sla_due_at', label: 'Review due' },
                ]} />
            </Section>
            {caseId && <CaseDetail id={caseId} onChange={cases.reload} />}
            <Section title="Alerts" right={<>
                <select value={alertStatus} onChange={e => setAlertStatus(e.target.value)}>{['OPEN', 'IN_CASE', 'CLOSED'].map(s => <option key={s}>{s}</option>)}</select>
                <Act label={`Open case from ${picked.length} alert(s)`} disabled={!picked.length} run={() => complianceApi.caseFromAlerts(picked)}
                     done={(c) => { setPicked([]); alerts.reload(); cases.reload(); if (c?.id) setParams({ case: c.id }); }} />
            </>}>
                {alerts.error && <Notice kind="error">{alerts.error}</Notice>}
                <Table rows={alerts.value} columns={[
                    { key: 'pick', label: '', render: r => <input type="checkbox" checked={picked.includes(r.id)} onChange={() => toggle(r.id)} /> },
                    { key: 'id', label: 'ID' }, { key: 'rule_code', label: 'Rule' }, { key: 'severity', label: 'Severity', render: r => <Badge value={r.severity} /> },
                    { key: 'mode', label: 'Mode', render: r => <Badge value={r.mode} /> }, { key: 'subject_key', label: 'Subject' }, { key: 'transaction_reference', label: 'Transaction' },
                    { key: 'blocked', label: 'Blocked' }, { key: 'created_at', label: 'At' },
                ]} />
            </Section>
        </Page>
    );
}
