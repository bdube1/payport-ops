import { useNavigate } from 'react-router-dom';
import { platformApi } from '../../lib/api';
import { Page, Section, Table, Notice, useLoad, minor, Badge } from '../../components/kit';

const QUEUES = [
    { key: 'kybAwaitingRecommendation', title: 'KYB: awaiting recommendation', to: r => `/kyb?merchant=${r.merchant_id}` },
    { key: 'kybAwaitingDecision', title: 'KYB: awaiting second-person decision', to: r => `/kyb?merchant=${r.merchant_id}` },
    { key: 'destinationsToVerify', title: 'Settlement destinations to verify', to: () => '/destinations' },
    { key: 'settlementBatchesToApprove', title: 'Settlement batches to approve', to: r => `/settlement-batches?batch=${r.id}` },
    { key: 'refundsRequiredForLatePayments', title: 'Late payments to refund (never deliver)', to: () => '/recon-exceptions' },
    { key: 'reconExceptions', title: 'Reconciliation exceptions', to: () => '/recon-exceptions' },
    { key: 'disputesNeedingResponse', title: 'Disputes needing a response', to: () => '/disputes' },
    { key: 'failedWebhooks', title: 'Failed merchant webhooks (7 days)' },
    { key: 'manualFulfilment', title: 'Manual fulfilment', to: r => `/transactions/${r.reference}` },
];

export default function WorkQueuesPage() {
    const navigate = useNavigate();
    const { value, error, reload } = useLoad(() => platformApi.workQueues());
    const queues = value?.queues || {};
    return (
        <Page title="Work queues" subtitle="Everything waiting for a person, oldest first. Click a row to open it."
              actions={<button className="btn btn-ghost" onClick={reload}>Refresh</button>}>
            {error && <Notice kind="error">{error}</Notice>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 18 }}>
                {QUEUES.map(q => (
                    <a key={q.key} href={`#${q.key}`} className="card" style={{ padding: 14, textDecoration: 'none', color: 'var(--text)' }}>
                        <div style={{ fontSize: 24, fontWeight: 800 }}>{queues[q.key]?.count ?? '—'}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{q.title}</div>
                    </a>
                ))}
            </div>
            {QUEUES.filter(q => queues[q.key]?.count).map(q => (
                <div id={q.key} key={q.key}>
                    <Section title={`${q.title} (${queues[q.key].count})`}>
                        <Table rows={queues[q.key].items} onRow={q.to ? r => navigate(q.to(r)) : undefined}
                               columns={Object.keys(queues[q.key].items[0]).map(k => ({
                                   key: k, label: k.replace(/_/g, ' '),
                                   render: /_minor$|amount_cents/.test(k) ? r => minor(r[k], r.currency) : /status|category|recommendation/.test(k) ? r => <Badge value={r[k]} /> : undefined,
                               }))} />
                    </Section>
                </div>
            ))}
        </Page>
    );
}
