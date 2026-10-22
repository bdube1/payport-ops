import { complianceApi, platformControlsApi } from '../../lib/api';
import { Page, Section, Table, Notice, useLoad, Badge, Act, FormButton } from '../../components/kit';

const TYPES = ['VELOCITY_COUNT', 'VELOCITY_AMOUNT', 'STRUCTURING', 'LARGE_TRANSACTION', 'SANCTIONS', 'TX_LIMIT', 'PERIOD_LIMIT', 'CDD_THRESHOLD', 'SCREENING_HEALTH'];

function decide(r, approve) {
    if (r.action_type === 'COMPLIANCE_PARAMETER_CHANGE') return complianceApi.decideParameterChange(r.id, approve, '');
    if (r.action_type === 'COMPLIANCE_AUTHORITY_GRANT') return complianceApi.decideAuthority(r.id, approve, '');
    return complianceApi.decideRuleChange(r.id, approve, '');
}

export default function RulesPage() {
    const rules = useLoad(() => complianceApi.rules());
    const changes = useLoad(() => complianceApi.ruleChanges());
    const params = useLoad(() => complianceApi.parameters());
    const refresh = () => { rules.reload(); changes.reload(); params.reload(); };
    return (
        <Page title="Rules, limits and parameters" subtitle="Every change needs a second compliance officer. New rules start in OBSERVE. Only an approved ENFORCE + BLOCK rule can stop a payment (the database refuses anything else)."
              actions={<FormButton label="New rule" title="Propose a new rule" intro="Created in OBSERVE after a second officer approves."
                  fields={[{ name: 'code', label: 'Code', type: 'text', required: true }, { name: 'name', label: 'Name', type: 'text', required: true },
                      { name: 'type', label: 'Type', type: 'select', options: TYPES, required: true },
                      { name: 'params', label: 'Parameters (JSON)', type: 'json', initial: '{"parameter": "CTR.THRESHOLD_MINOR"}', required: true },
                      { name: 'action', label: 'Action when enforced', type: 'select', options: ['ALERT', 'BLOCK'], required: true },
                      { name: 'severity', label: 'Severity', type: 'select', options: ['LOW', 'MEDIUM', 'HIGH'], required: true },
                      { name: 'source', label: 'Source (regulation / standard)', type: 'text', required: true }, { name: 'reason', label: 'Reason', type: 'textarea', required: true }]}
                  onSubmit={v => complianceApi.createRule(v)} onDone={refresh} />}>
            <Section title="Requests for a second officer (rules, parameters, authorities)">
                {changes.error && <Notice kind="error">{changes.error}</Notice>}
                <Table rows={changes.value} empty="Nothing waiting." columns={[
                    { key: 'id', label: 'ID' }, { key: 'action_type', label: 'Change' }, { key: 'subject_ref', label: 'Subject' },
                    { key: 'payload', label: 'Proposed', render: r => <code style={{ fontSize: 11 }}>{String(r.payload)}</code> },
                    { key: 'requested_by', label: 'Requested by' }, { key: 'reason', label: 'Reason' }, { key: 'status', label: 'Status', render: r => <Badge value={r.status} /> },
                    { key: 'act', label: '', render: r => r.status === 'PENDING' && <div style={{ display: 'flex', gap: 6 }}>
                        <Act label="Approve" kind="success" run={() => decide(r, true)} done={refresh} title="You cannot approve your own request" />
                        <Act label="Reject" kind="danger" run={() => decide(r, false)} done={refresh} />
                    </div> },
                ]} />
            </Section>
            <Section title="Rules">
                {rules.error && <Notice kind="error">{rules.error}</Notice>}
                <Table rows={rules.value} columns={[
                    { key: 'code', label: 'Code' }, { key: 'name', label: 'Name' }, { key: 'rule_type', label: 'Type' },
                    { key: 'mode', label: 'Mode', render: r => <Badge value={r.mode} /> }, { key: 'action', label: 'Action' }, { key: 'severity', label: 'Severity' },
                    { key: 'params', label: 'Parameters', render: r => <code style={{ fontSize: 11 }}>{String(r.params)}</code> },
                    { key: 'approved_by', label: 'Approved by' }, { key: 'param_status', label: 'Basis', render: r => <Badge value={r.param_status} /> },
                    { key: 'act', label: '', render: r => (
                        <FormButton label="Change…" kind="ghost" title={`Change ${r.code}`}
                            intro="Moving to ENFORCE with BLOCK lets this rule stop payments once approved. Keep new rules in OBSERVE until Compliance has reviewed their alerts."
                            fields={[{ name: 'mode', label: 'Mode', type: 'select', options: ['OFF', 'OBSERVE', 'ENFORCE'], initial: r.mode },
                                { name: 'action', label: 'Action', type: 'select', options: ['ALERT', 'BLOCK'], initial: r.action },
                                { name: 'params', label: 'Parameters (JSON)', type: 'json', initial: String(r.params || '{}') },
                                { name: 'reason', label: 'Reason', type: 'textarea', required: true }]}
                            onSubmit={v => complianceApi.ruleChange(r.code, v)} onDone={refresh} />) },
                ]} />
            </Section>
            <Section title="Parameters (limits, thresholds, deadlines, matching)">
                {params.error && <Notice kind="error">{params.error}</Notice>}
                <Table rows={params.value} columns={[
                    { key: 'param_key', label: 'Key' }, { key: 'value_json', label: 'Value', render: r => <code style={{ fontSize: 11 }}>{String(r.value_json)}</code> },
                    { key: 'unit', label: 'Unit' }, { key: 'status', label: 'Status', render: r => <Badge value={r.status} /> },
                    { key: 'source', label: 'Source' }, { key: 'version', label: 'v' },
                    { key: 'act', label: '', render: r => (
                        <FormButton label="Change…" kind="ghost" title={`Change ${r.param_key}`}
                            intro="Tick 'confirm' only when the value has been checked against the applicable requirement; it then shows as CONFIRMED."
                            fields={[{ name: 'value', label: 'Value (JSON)', type: 'json', initial: String(r.value_json) },
                                { name: 'confirm', label: 'Confirmed against the source', type: 'checkbox' },
                                { name: 'source', label: 'Source', type: 'text', initial: r.source || '' }, { name: 'reason', label: 'Reason', type: 'textarea', required: true }]}
                            onSubmit={v => complianceApi.parameterChange(r.param_key, v)} onDone={refresh} />) },
                ]} />
            </Section>
        </Page>
    );
}
