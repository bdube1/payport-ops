import { useState } from 'react';
import { financeApi } from '../../lib/api';
import { Page, Section, Table, Notice, useLoad, Badge, FormButton, minor } from '../../components/kit';

export default function BankMessagesPage() {
    const schemas = useLoad(() => financeApi.isoSchemas());
    const statements = useLoad(() => financeApi.bankStatements());
    const messages = useLoad(() => financeApi.isoMessages());
    const [open, setOpen] = useState(null);
    const entries = useLoad(() => (open ? financeApi.bankEntries(open) : Promise.resolve({ data: [] })), [open]);
    const missing = Object.entries(schemas.value || {}).filter(([, ok]) => !ok).map(([k]) => k);
    const refresh = () => { statements.reload(); messages.reload(); };
    return (
        <Page title="Bank messages (ISO 20022)" subtitle="camt.053 statements of PayPort's accounts and pain.002 payout status reports. Every file is validated against the official ISO 20022 schema; statements must balance and be for the market's own account."
              actions={<>
                  <FormButton label="Upload camt.053 statement" title="Bank statement (camt.053.001.08)" fields={[{ name: 'file', label: 'XML file', type: 'file', accept: '.xml', required: true }]}
                      onSubmit={v => financeApi.isoUpload('camt053', v.file)} onDone={refresh} />
                  <FormButton label="Upload pain.002 status report" kind="ghost" title="Payout status report (pain.002.001.10)" fields={[{ name: 'file', label: 'XML file', type: 'file', accept: '.xml', required: true }]}
                      onSubmit={v => financeApi.isoUpload('pain002', v.file)} onDone={refresh} />
              </>}>
            {missing.length > 0 && <Notice kind="error">Schemas not installed: {missing.join(', ')}. These messages are refused until they are.</Notice>}
            <Section title="Statements">
                <Table rows={statements.value} onRow={r => setOpen(r.id)} columns={[
                    { key: 'id', label: 'ID' }, { key: 'country', label: 'Market' }, { key: 'entity_code', label: 'Entity' }, { key: 'statement_id', label: 'Statement' },
                    { key: 'currency', label: 'Ccy' }, { key: 'opening_minor', label: 'Opening', render: r => minor(r.opening_minor) },
                    { key: 'credits_minor', label: 'Credits', render: r => minor(r.credits_minor) }, { key: 'debits_minor', label: 'Debits', render: r => minor(r.debits_minor) },
                    { key: 'closing_minor', label: 'Closing', render: r => minor(r.closing_minor) }, { key: 'entry_count', label: 'Entries' }, { key: 'imported_at', label: 'Imported' },
                ]} />
            </Section>
            {open && (
                <Section title={`Statement #${open}: entries and trace`}>
                    <Table rows={entries.value} columns={[
                        { key: 'entry_no', label: '#' }, { key: 'direction', label: 'Dir' }, { key: 'amount_minor', label: 'Amount', render: r => minor(r.amount_minor, r.currency) },
                        { key: 'status', label: 'Bank status' }, { key: 'booking_date', label: 'Booked' }, { key: 'bank_reference', label: 'Bank ref' },
                        { key: 'end_to_end_id', label: 'End-to-end' }, { key: 'counterparty', label: 'Counterparty' },
                        { key: 'trace_status', label: 'Trace', render: r => <Badge value={r.trace_status} /> }, { key: 'ledger_entry_ref', label: 'Ledger entry' }, { key: 'detail', label: 'Detail' },
                    ]} />
                </Section>
            )}
            <Section title="Messages exchanged">
                <Table rows={messages.value} columns={[
                    { key: 'id', label: 'ID' }, { key: 'direction', label: 'Dir' }, { key: 'message_type', label: 'Type' }, { key: 'msg_id', label: 'MsgId' },
                    { key: 'related_ref', label: 'Related' }, { key: 'sha256', label: 'SHA-256', render: r => <code>{String(r.sha256).slice(0, 16)}…</code> },
                    { key: 'created_by', label: 'By' }, { key: 'created_at', label: 'At' },
                ]} />
            </Section>
        </Page>
    );
}
