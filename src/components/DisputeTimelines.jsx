import { disputeTimelinesApi } from '../lib/api';
import { Section, Table, Notice, useLoad, Badge, Act, FormButton } from './kit';

/** Regulatory deadlines per dispute (RBZ Consumer Protection Framework defaults, configurable by Compliance). */
export default function DisputeTimelines() {
    const list = useLoad(() => disputeTimelinesApi.list());
    const settings = useLoad(() => disputeTimelinesApi.settings());
    const provisional = (settings.value || []).filter(p => p.status === 'PROVISIONAL');
    return (
        <Section title="Deadlines" right={<button className="btn btn-ghost" onClick={list.reload}>Refresh</button>}>
            {list.error && <Notice kind="error">{list.error}</Notice>}
            {provisional.length > 0 && <Notice kind="warn">Provisional settings (not yet confirmed against the applicable requirement): {provisional.map(p => p.param_key).join(', ')}</Notice>}
            <Table rows={list.value} columns={[
                { key: 'id', label: 'Dispute' }, { key: 'type', label: 'Type' }, { key: 'status', label: 'Status', render: r => <Badge value={r.status} /> },
                { key: 'worst', label: 'Worst', render: r => <Badge value={r.worst} /> },
                { key: 'deadlines', label: 'Deadlines', render: r => (r.deadlines || []).map(d => (
                    <div key={d.kind} style={{ fontSize: 12, marginBottom: 3 }} title={`${d.rule} (${d.ruleStatus}): ${d.ruleSource}`}>
                        <Badge value={d.state} /> {d.kind.replace(/_/g, ' ').toLowerCase()} by {String(d.dueAt || '—').replace('T', ' ').slice(0, 16)}{d.ruleStatus === 'PROVISIONAL' ? ' (provisional)' : ''}
                    </div>)) },
                { key: 'act', label: '', render: r => (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {r.acknowledgement !== 'MET' && r.acknowledgement !== 'MET_LATE' && r.acknowledgement !== 'NOT_APPLICABLE' &&
                            <Act label="Acknowledge" kind="ghost" run={() => disputeTimelinesApi.acknowledge(r.id)} done={list.reload} />}
                        <FormButton label="Record update" kind="ghost" title={`Customer communication: dispute #${r.id}`}
                            fields={[{ name: 'kind', label: 'Kind', type: 'select', required: true, options: ['PROGRESS_UPDATE', 'OUTCOME_NOTICE', 'RBZ_NOTICE', 'ACKNOWLEDGEMENT'] },
                                { name: 'note', label: 'What was communicated, and how', type: 'textarea', required: true }]}
                            onSubmit={v => disputeTimelinesApi.update(r.id, v.kind, v.note)} onDone={list.reload} />
                    </div>) },
            ]} />
        </Section>
    );
}
