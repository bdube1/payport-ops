import { platformControlsApi } from '../../lib/api';
import { useAuth } from '../../lib/auth.jsx';
import { Page, Section, Table, Notice, useLoad, Badge, Act, FormButton, KeyValues } from '../../components/kit';

const STATUSES = ['SANDBOX', 'LIVE'];

function CurrencyActions({ c, reload, role }) {
    const canAsk = role === 'ADMIN';
    return (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {c.live && <FormButton label="Stop live money" kind="danger" title={`Stop live payments in ${c.currency}`}
                intro="Takes effect immediately. Turning it back on needs a request and a compliance officer's approval."
                fields={[{ name: 'reason', label: 'Reason', type: 'textarea', required: true }]}
                onSubmit={v => platformControlsApi.stopLiveCurrency(c.currency, v.reason)} onDone={reload} />}
            {c.enabled && <FormButton label="Disable" kind="danger" title={`Disable ${c.currency} completely`}
                intro="No new payments in this currency, test or live. Existing balances, refunds and settlements still work."
                fields={[{ name: 'reason', label: 'Reason', type: 'textarea', required: true }]}
                onSubmit={v => platformControlsApi.disableCurrency(c.currency, v.reason)} onDone={reload} />}
            {canAsk && <FormButton label="Request change…" kind="ghost" title={`Change ${c.currency} (${c.country})`}
                intro="Enabling a currency or live money needs a COMPLIANCE officer's approval; other settings another administrator's."
                fields={[
                    { name: 'enabled', label: 'Enabled (accept payments)', type: 'checkbox', initial: !!c.enabled },
                    { name: 'live', label: 'Live money', type: 'checkbox', initial: !!c.live },
                    { name: 'bankAccountNumber', label: 'Settlement bank account number (blank = unchanged)', type: 'text' },
                    { name: 'bankAccountName', label: 'Account name', type: 'text', initial: c.bank_account_name || '' },
                    { name: 'symbol', label: 'Display symbol', type: 'text', initial: c.symbol || '' },
                    { name: 'reason', label: 'Reason', type: 'textarea', required: true },
                ]}
                onSubmit={v => {
                    const cur = { currency: c.currency, enabled: !!v.enabled, live: !!v.live, bankAccountName: v.bankAccountName, symbol: v.symbol };
                    if (v.bankAccountNumber) cur.bankAccountNumber = v.bankAccountNumber;
                    return platformControlsApi.requestMarketChange(c.country, {}, [cur], v.reason);
                }} onDone={reload} />}
        </div>
    );
}

function Market({ m, reload, role }) {
    return (
        <Section title={`${m.name} (${m.country})`} right={<>
            <Badge value={m.status} />
            {role === 'ADMIN' && <FormButton label="Request settings change…" kind="ghost" title={`Change ${m.name}`}
                intro="Switching a market to LIVE needs the readiness blockers cleared and a COMPLIANCE officer's approval. No code change or deployment."
                fields={[
                    { name: 'status', label: 'Status', type: 'select', options: STATUSES, initial: m.status === 'SUSPENDED' ? 'SANDBOX' : m.status },
                    { name: 'legalEntityName', label: 'Legal entity name', type: 'text', initial: m.legal_name || '' },
                    { name: 'bankName', label: 'Sponsor bank', type: 'text', initial: m.bank_name || '' },
                    { name: 'bankBic', label: 'Sponsor bank BIC', type: 'text', initial: m.bank_bic || '' },
                    { name: 'payoutFormat', label: 'Payout format', type: 'select', options: ['PAYPORT_CSV_V1', 'ISO20022_PAIN_001_001_09'], initial: m.payout_format },
                    { name: 'statementGuideline', label: 'Statement usage guideline (blank = base ISO 20022)', type: 'select', options: ['', 'camt.053.001.08-HVPSPLUS'], initial: m.statement_guideline || '' },
                    { name: 'bankFormatStatus', label: 'Bank format status', type: 'text', initial: m.bank_format_status || '' },
                    { name: 'fiuReportFormat', label: 'FIU report format', type: 'select', options: ['GOAML_XML', 'NOT_CONFIGURED'], initial: m.fiu_report_format },
                    { name: 'reason', label: 'Reason', type: 'textarea', required: true },
                ]}
                onSubmit={v => {
                    const changes = {};
                    for (const [k, col] of [['status', 'status'], ['legalEntityName', 'legal_name'], ['bankName', 'bank_name'], ['bankBic', 'bank_bic'],
                        ['payoutFormat', 'payout_format'], ['statementGuideline', 'statement_guideline'], ['bankFormatStatus', 'bank_format_status'], ['fiuReportFormat', 'fiu_report_format']]) {
                        if ((v[k] ?? '') !== (m[col] ?? '')) changes[k] = v[k] === '' ? null : v[k];
                    }
                    return platformControlsApi.requestMarketChange(m.country, changes, [], v.reason);
                }} onDone={reload} />}
            {m.status !== 'SUSPENDED' && <FormButton label="Suspend" kind="danger" title={`Suspend ${m.name}`} intro="Immediate: no new payments in this market until it is reinstated (with approval)."
                fields={[{ name: 'reason', label: 'Reason', type: 'textarea', required: true }]} onSubmit={v => platformControlsApi.suspendMarket(m.country, v.reason)} onDone={reload} />}
        </>}>
            {(m.problems || []).length > 0 && <Notice kind="error">Configuration problems: {m.problems.join('; ')}</Notice>}
            <KeyValues obj={{ 'Legal entity': `${m.legal_entity} (${m.legal_name})`, Timezone: m.timezone, 'Phone code': '+' + m.phone_country_code,
                'Sponsor bank': `${m.bank_name}${m.bank_bic ? ' · ' + m.bank_bic : ''}`, 'Payout format': m.payout_format,
                'Statement format': m.statement_format + (m.statement_guideline ? ` + ${m.statement_guideline} guideline` : ''),
                'FIU reports': m.fiu_report_format, Version: m.version, 'Updated by': m.updated_by }} />
            <h3 style={{ fontSize: 13, margin: '16px 0 8px' }}>Currencies</h3>
            <Table rows={(m.currencies || []).map(c => ({ ...c, country: m.country }))} columns={[
                { key: 'currency', label: 'Currency' }, { key: 'enabled', label: 'Accepting', render: c => <Badge value={c.enabled ? 'ENABLED' : 'DISABLED'} /> },
                { key: 'live', label: 'Live money', render: c => <Badge value={c.live ? 'LIVE' : 'SANDBOX'} /> }, { key: 'symbol', label: 'Symbol' },
                { key: 'bank_account_number', label: 'Bank account' }, { key: 'ledger_owner', label: 'Ledger account' },
                { key: 'act', label: '', render: c => <CurrencyActions c={c} reload={reload} role={role} /> },
            ]} />
        </Section>
    );
}

export default function MarketsPage() {
    const { user } = useAuth();
    const markets = useLoad(() => platformControlsApi.marketSettings());
    const requests = useLoad(() => (['ADMIN', 'COMPLIANCE'].includes(user?.role) ? platformControlsApi.marketRequests() : Promise.resolve({ data: [] })));
    const reload = () => { markets.reload(); requests.reload(); };
    const pending = (requests.value || []).filter(r => r.status === 'PENDING');
    return (
        <Page title="Markets and currencies" subtitle="Countries, their legal entity, currencies and bank settings, operated from here without code changes. Switching money OFF is immediate; switching it ON needs a second person (a compliance officer when it enables money)."
              actions={user?.role === 'ADMIN' && <FormButton label="Add a market" title="New market (starts in SANDBOX)"
                  fields={[{ name: 'country', label: 'Country code (ISO 3166, e.g. MW)', type: 'text', required: true }, { name: 'name', label: 'Country name', type: 'text', required: true },
                      { name: 'legalEntity', label: 'Legal entity code (e.g. PAYPORT_MW)', type: 'text', required: true }, { name: 'legalEntityName', label: 'Legal entity name', type: 'text', required: true },
                      { name: 'timezone', label: 'Timezone (e.g. Africa/Blantyre)', type: 'text', required: true }, { name: 'phoneCountryCode', label: 'Phone country code (digits)', type: 'text', required: true },
                      { name: 'nationalPattern', label: 'Mobile number pattern (regex, national format)', type: 'text', required: true },
                      { name: 'currency', label: 'Currency (ISO 4217)', type: 'text', required: true }, { name: 'currencyName', label: 'Currency name', type: 'text', required: true },
                      { name: 'bankName', label: 'Sponsor bank', type: 'text', required: true }, { name: 'reason', label: 'Reason', type: 'textarea', required: true }]}
                  onSubmit={v => platformControlsApi.requestNewMarket({ country: v.country.toUpperCase(), name: v.name, countryName: v.name, legalEntity: v.legalEntity.toUpperCase(), legalEntityName: v.legalEntityName,
                      timezone: v.timezone, phoneCountryCode: v.phoneCountryCode, nationalPattern: v.nationalPattern, bankName: v.bankName, payoutFormat: 'ISO20022_PAIN_001_001_09',
                      currencies: [{ currency: v.currency.toUpperCase(), name: v.currencyName, minorUnits: 2, enabled: false, live: false }] }, v.reason)} onDone={reload} />}>
            {markets.error && <Notice kind="error">{markets.error}</Notice>}
            {pending.length > 0 && (
                <Section title={`Requests awaiting a second person (${pending.length})`}>
                    <Table rows={pending} columns={[
                        { key: 'id', label: 'ID' }, { key: 'action_type', label: 'Type' }, { key: 'subject_ref', label: 'Market' },
                        { key: 'payload', label: 'Change', render: r => <code style={{ fontSize: 11 }}>{String(r.payload).slice(0, 400)}</code> },
                        { key: 'required_role', label: 'Approver role' }, { key: 'requested_by', label: 'Requested by' }, { key: 'reason', label: 'Reason' },
                        { key: 'act', label: '', render: r => <div style={{ display: 'flex', gap: 6 }}>
                            <Act label="Approve" kind="success" run={() => platformControlsApi.decideMarketRequest(r.id, true, '')} done={reload} title="Not your own request" />
                            <Act label="Reject" kind="danger" run={() => platformControlsApi.decideMarketRequest(r.id, false, '')} done={reload} />
                        </div> },
                    ]} />
                </Section>
            )}
            {(markets.value || []).map(m => <Market key={m.country} m={m} reload={reload} role={user?.role} />)}
        </Page>
    );
}
