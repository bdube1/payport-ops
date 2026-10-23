import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { financeApi } from '../../lib/api';
import { Page, Section, Table, Notice, useLoad, Badge, Act, FormButton, KeyValues, minor, CurrencySelect } from '../../components/kit';

function download(name, content) {
    const url = URL.createObjectURL(new Blob([content], { type: name.endsWith('.xml') ? 'application/xml' : 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}

function Batch({ id }) {
    const { value, error, reload } = useLoad(() => financeApi.batch(id), [id]);
    const b = value?.batch || value;
    return (
        <Section title={`Batch #${id}`} right={<>
            <Act label="Approve" kind="success" run={() => financeApi.approveBatch(id)} done={reload} title="The creator cannot approve; large batches need two approvers" />
            <Act label="Instruct (payout file)" run={() => financeApi.instructBatch(id)} done={(f) => { reload(); if (f?.content) download(f.fileName, f.content); }}
                 confirm="Generate the payout instruction file? Refused while settlement runs in PARALLEL mode." />
            <Act label="Cancel" kind="danger" run={() => financeApi.cancelBatch(id)} done={reload} confirm="Cancel this batch? Its sessions become eligible again." />
        </>}>
            {error && <Notice kind="error">{error}</Notice>}
            {b && <KeyValues obj={Object.fromEntries(Object.entries(b).filter(([k]) => !['items', 'legacyComparison', 'file_content'].includes(k)))} />}
            {value?.items && <div style={{ marginTop: 14 }}><Table rows={value.items} columns={[
                { key: 'instruction_ref', label: 'Instruction' }, { key: 'merchant_id', label: 'Merchant' }, { key: 'session_count', label: 'Sessions' },
                { key: 'net_minor', label: 'Net', render: r => minor(r.net_minor, r.currency) }, { key: 'destination', label: 'Destination' },
                { key: 'status', label: 'Status', render: r => <Badge value={r.status} /> }, { key: 'bank_reference', label: 'Bank ref' }, { key: 'return_reason', label: 'Return reason' },
            ]} /></div>}
            {value?.legacyComparison && <><h3 style={{ fontSize: 13, margin: '16px 0 8px' }}>Parallel run: comparison with legacy settlement</h3><Table rows={value.comparison} /></>}
        </Section>
    );
}

export default function SettlementBatchesPage() {
    const [params, setParams] = useSearchParams();
    const [currency, setCurrency] = useState('USD');
    const [openId, setOpenId] = useState('');
    const eligible = useLoad(() => financeApi.eligible(currency), [currency]);
    const batchId = params.get('batch');
    const total = (eligible.value || []).reduce((s, e) => s + (e.net || 0), 0);
    return (
        <Page title="Settlement batches" subtitle="Draft from reconciled collections, approve (maker is never checker), then instruct the bank. Bank results need the bank's reference and the file as proof."
              actions={<>
                  <Act label={`Draft ${currency} batch`} run={() => financeApi.draftBatch(currency)} done={(b) => { eligible.reload(); if (b?.id) setParams({ batch: b.id }); }} />
                  <FormButton label="Upload bank results" kind="ghost" title="Payout results (CSV)" intro="instruction_ref,status(PAID|RETURNED|FAILED),bank_reference,reason. For ISO 20022 pain.002 use Bank messages."
                      fields={[{ name: 'file', label: 'File', type: 'file', required: true }]} onSubmit={v => financeApi.payoutResults(v.file)} />
              </>}>
            <Section title="Open a batch" right={<>
                <input placeholder="Batch ID" value={openId} onChange={e => setOpenId(e.target.value)} style={{ width: 110 }} />
                <button className="btn btn-ghost" onClick={() => openId && setParams({ batch: openId })}>Open</button>
            </>}>
                <p style={{ fontSize: 12.5, color: 'var(--text-2)', margin: 0 }}>Batches waiting for approval are listed in Work queues.</p>
            </Section>
            {batchId && <Batch id={batchId} />}
            <Section title={`Eligible now: ${(eligible.value || []).length} sessions, net ${minor(total, currency)}`} right={
                <CurrencySelect value={currency} onChange={setCurrency} />}>
                {eligible.error && <Notice kind="error">{eligible.error}</Notice>}
                <Table rows={eligible.value} columns={[
                    { key: 'sessionId', label: 'Session' }, { key: 'merchantId', label: 'Merchant' }, { key: 'gross', label: 'Gross', render: r => minor(r.gross, r.currency) },
                    { key: 'fee', label: 'Fee', render: r => minor(r.fee, r.currency) }, { key: 'refunded', label: 'Refunded', render: r => minor(r.refunded, r.currency) },
                    { key: 'net', label: 'Net', render: r => minor(r.net, r.currency) },
                ]} />
            </Section>
        </Page>
    );
}
