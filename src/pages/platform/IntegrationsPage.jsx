import { integrationsApi } from '../../lib/api';
import { Page, Section, Table, Notice, useLoad, Badge, Act, FormButton } from '../../components/kit';

export default function IntegrationsPage() {
    const { value, error, reload } = useLoad(() => integrationsApi.list());
    const rows = Array.isArray(value) ? value : value?.providers || [];
    return (
        <Page title="Integrations" subtitle="Providers and billers: capabilities, configured environment, verification evidence, health and the kill switch (refuses before anything is sent, so no unknown outcomes)."
              actions={<button className="btn btn-ghost" onClick={reload}>Refresh</button>}>
            {error && <Notice kind="error">{error}</Notice>}
            <Section title="Register and health">
                <Table rows={rows} columns={[
                    { key: 'code', label: 'Code' }, { key: 'name', label: 'Name' }, { key: 'kind', label: 'Kind' },
                    { key: 'configuredEnvironment', label: 'Environment', render: r => <Badge value={r.configuredEnvironment} /> },
                    { key: 'verification', label: 'Verification', render: r => <Badge value={r.verification} /> },
                    { key: 'status', label: 'Health', render: r => <Badge value={r.status || r.health?.status} /> },
                    { key: 'circuit', label: 'Circuit', render: r => r.circuit || r.health?.circuit || '—' },
                    { key: 'p95', label: 'p95 ms', render: r => r.health?.p95Ms ?? r.health?.latencyP95Ms ?? '—' },
                    { key: 'act', label: '', render: r => (
                        <div style={{ display: 'flex', gap: 6 }}>
                            <FormButton label="Suspend" kind="danger" title={`Suspend ${r.code}`} intro="New payments to this provider are refused with 'No money was taken' until resumed."
                                fields={[{ name: 'reason', label: 'Reason', type: 'textarea', required: true }]} onSubmit={v => integrationsApi.suspend(r.code, v.reason)} onDone={reload} />
                            <FormButton label="Resume" kind="success" title={`Resume ${r.code}`} fields={[{ name: 'note', label: 'Note', type: 'textarea', required: true }]}
                                onSubmit={v => integrationsApi.resume(r.code, v.note)} onDone={reload} />
                            <FormButton label="Record test" kind="ghost" title={`Verification evidence: ${r.code}`}
                                intro="Records the result of a test you ran against this provider (evidence only). It does not switch anything on: product lines are switched on under Channels & Product Lines, payment methods under Products & Payment Methods."
                                fields={[{ name: 'environment', label: 'Environment', type: 'select', options: ['SANDBOX', 'PRODUCTION'], required: true },
                                    (r.operations || []).length
                                        ? { name: 'flow', label: 'Flow tested', type: 'select', options: r.operations, required: true }
                                        : { name: 'flow', label: 'Flow (one the provider declares)', type: 'text', required: true },
                                    { name: 'pass', label: 'Passed', type: 'checkbox' }, { name: 'evidence', label: 'Evidence (references, logs, screenshots location)', type: 'textarea', required: true }]}
                                onSubmit={v => integrationsApi.verification(r.code, { environment: v.environment, flow: v.flow, pass: !!v.pass, evidence: v.evidence })} onDone={reload} />
                        </div>) },
                ]} />
            </Section>
        </Page>
    );
}
