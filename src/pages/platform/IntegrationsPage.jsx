import { integrationsApi } from '../../lib/api';
import { Page, Section, Table, Notice, useLoad, Badge, Act, FormButton } from '../../components/kit';

export default function IntegrationsPage() {
    const { value, error, reload } = useLoad(() => integrationsApi.list());
    const rows = Array.isArray(value) ? value : value?.providers || [];
    return (
        <Page title="Integrations"
              actions={<button className="btn btn-ghost" onClick={reload}>Refresh</button>}>
            {error && <Notice kind="error">{error}</Notice>}
            <Section title="Register and health">
                <Table rows={rows} columns={[
                    { key: 'code', label: 'Code' }, { key: 'name', label: 'Name' }, { key: 'kind', label: 'Kind' },
                    { key: 'configuredEnvironment', label: 'Environment', render: r => <Badge value={r.configuredEnvironment} /> },
                    { key: 'verification', label: 'Verification', render: r => <Badge value={r.verification} /> },
                    { key: 'status', label: 'State', render: r => <Badge value={(r.status || r.health?.status) === 'SUSPENDED' ? 'OFF' : (r.status || r.health?.status)} /> },
                    { key: 'circuit', label: 'Circuit', render: r => r.circuit || r.health?.circuit || '—' },
                    { key: 'p95', label: 'p95 ms', render: r => r.health?.p95Ms ?? r.health?.latencyP95Ms ?? '—' },
                    { key: 'act', label: '', render: r => (
                        <div style={{ display: 'flex', gap: 6 }}>
                            {(r.status || r.health?.status) === 'SUSPENDED'
                                ? <Act label="Switch on" kind="success" run={() => integrationsApi.resume(r.code, '')} done={reload} />
                                : <Act label="Switch off" kind="danger" run={() => integrationsApi.suspend(r.code, '')} done={reload} />}
                            <FormButton label="Record test" kind="ghost" title={`Verification evidence: ${r.code}`}
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
