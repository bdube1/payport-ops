import { marketsApi } from '../../lib/api';
import { Page, Section, Notice, useLoad, Badge, KeyValues, Table } from '../../components/kit';

export default function MarketsPage() {
    const { value, error } = useLoad(() => marketsApi.list());
    return (
        <Page title="Markets" subtitle="Countries and the legal entities that keep their books. A SANDBOX market can never take live money. Configured in markets/<CC>.json on the backend.">
            {error && <Notice kind="error">{error}</Notice>}
            {(value || []).map(m => (
                <Section key={m.country} title={`${m.name} (${m.country})`} right={<Badge value={m.status} />}>
                    <KeyValues obj={{ 'Legal entity': m.legalEntity, Timezone: m.timezone, 'Phone country code': '+' + m.phoneCountryCode,
                        'Payout format': m.payoutFormat, 'Statement format': m.statementFormat, 'Bank formats': m.bankFormatStatus,
                        'FIU reports': m.fiuReportFormat, 'Required screening lists': (m.requiredScreeningLists || []).join(', '),
                        ...Object.fromEntries(Object.entries(m.regulators || {}).map(([k, v]) => [`Regulator (${k})`, v])) }} />
                    <h3 style={{ fontSize: 13, margin: '14px 0 6px' }}>Currencies</h3>
                    <Table rows={m.currencies} columns={[{ key: 'code', label: 'Currency' }, { key: 'live', label: 'Live money' }, { key: 'symbol', label: 'Symbol' }]} />
                    <h3 style={{ fontSize: 13, margin: '14px 0 6px' }}>Bank accounts</h3>
                    <Table rows={m.bankAccounts} />
                </Section>
            ))}
        </Page>
    );
}
