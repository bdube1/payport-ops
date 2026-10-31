import { providerSettlementApi } from '../../lib/api';
import { useAuth } from '../../lib/auth.jsx';
import { Page, Section, Table, Notice, useLoad, Badge, FormButton, Act, minor } from '../../components/kit';

/** Rules that recognise a payment rail's settlement on Payport's bank statement (proposer ≠ approver). */
export default function ProviderSettlementRulesPage() {
    const { user } = useAuth();
    const role = user?.role;
    const rules = useLoad(() => providerSettlementApi.rules());
    const positions = useLoad(() => (['ADMIN', 'FINANCE', 'COMPLIANCE'].includes(role) ? providerSettlementApi.positions() : Promise.resolve({ data: { data: [] } })), [role]);
    return (
        <Page title="Provider settlement rules" subtitle="A booked credit on a camt.053 statement that matches an active rule (counterparty and/or remittance text contains the pattern, same currency) is booked Dr BANK_CASH · Cr PROVIDER_RECEIVABLE[provider] and traced as PROVIDER_SETTLEMENT. Unmatched credits stay UNIDENTIFIED for review."
            actions={role === 'FINANCE' && <FormButton label="Propose rule" title="Provider settlement rule" intro="A second finance user or an administrator approves it."
                fields={[{ name: 'providerCode', label: 'Provider code (e.g. ECOCASH, ONEMONEY, MTN_MOMO)', required: true }, { name: 'currency', label: 'Currency', type: 'currency', required: true },
                    { name: 'counterpartyPattern', label: 'Counterparty contains', help: 'Text in the payer name on the statement line' },
                    { name: 'remittancePattern', label: 'Remittance contains', help: 'Text in the remittance information' }]}
                onSubmit={v => providerSettlementApi.propose({ ...v, providerCode: v.providerCode.trim().toUpperCase(), currency: v.currency.trim().toUpperCase() })} onDone={rules.reload} />}>
            {rules.error && <Notice kind="error">{rules.error}</Notice>}
            <Section>
                <Table rows={rules.value} empty="No rules yet." columns={[
                    { key: 'id', label: 'ID' }, { key: 'provider_code', label: 'Provider' }, { key: 'currency', label: 'Ccy' },
                    { key: 'counterparty_pattern', label: 'Counterparty contains' }, { key: 'remittance_pattern', label: 'Remittance contains' },
                    { key: 'status', label: 'Status', render: r => <Badge value={r.status} /> }, { key: 'created_by', label: 'Proposed by' }, { key: 'approved_by', label: 'Decided by' },
                    { key: 'actions', label: '', render: r => <div style={{ display: 'flex', gap: 6 }}>
                        {r.status === 'PENDING' && ['ADMIN', 'FINANCE'].includes(role) && <>
                            <Act label="Approve" run={() => providerSettlementApi.decide(r.id, true)} done={rules.reload} />
                            <Act label="Reject" kind="ghost" run={() => providerSettlementApi.decide(r.id, false)} done={rules.reload} />
                        </>}
                        {r.status === 'ACTIVE' && ['ADMIN', 'FINANCE'].includes(role) && <Act label="Retire" kind="ghost" confirm="Retire this rule?" run={() => providerSettlementApi.retire(r.id)} done={rules.reload} />}
                    </div> },
                ]} />
            </Section>
            <Section title="What each provider owes Payport">
                {positions.error && <Notice kind="error">{positions.error}</Notice>}
                <Table rows={positions.value} empty="No provider collections yet." columns={[
                    { key: 'provider_code', label: 'Provider' }, { key: 'currency', label: 'Currency' },
                    { key: 'collected_minor', label: 'Collected', render: r => minor(r.collected_minor, r.currency) },
                    { key: 'settled_minor', label: 'Settled to bank', render: r => minor(r.settled_minor, r.currency) },
                    { key: 'outstanding_minor', label: 'Outstanding', render: r => minor(r.outstanding_minor, r.currency) },
                    { key: 'position', label: 'Position', render: r => <Badge value={r.position} /> },
                ]} />
            </Section>
        </Page>
    );
}
