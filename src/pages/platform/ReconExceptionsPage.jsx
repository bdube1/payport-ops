import { useState } from 'react';
import { financeApi } from '../../lib/api';
import { Page, Section, Table, Notice, useLoad, Badge, FormButton, minor } from '../../components/kit';

const LATE = ['PAID_AFTER_TIMEOUT', 'PAID_ON_SUPERSEDED_ATTEMPT', 'PAID_AFTER_FAILURE'];
const ALL = ['EXPLAINED_TIMING', 'REFUND_REQUIRED', 'REFUNDED', 'PROVIDER_CORRECTED', 'WRITTEN_OFF', 'FALSE_POSITIVE'];
const LATE_ONLY = ['REFUND_REQUIRED', 'REFUNDED', 'PROVIDER_CORRECTED'];

export default function ReconExceptionsPage() {
    const [category, setCategory] = useState('');
    const { value, error, reload } = useLoad(() => financeApi.exceptions(category || undefined), [category]);
    return (
        <Page title="Reconciliation exceptions" subtitle="Differences between Payport and provider or bank statements. Nothing is adjusted automatically. A late payment is only ever refunded, never delivered."
              actions={<FormButton label="Import provider statement" kind="ghost" title="Provider statement"
                  fields={[{ name: 'provider', label: 'Provider code', type: 'text', required: true }, { name: 'format', label: 'Format', type: 'select', options: ['NATIVE', 'CSV'], initial: 'NATIVE' },
                      { name: 'file', label: 'File', type: 'file', required: true }]}
                  onSubmit={v => financeApi.importStatement(v.provider, v.format || 'NATIVE', v.file)} onDone={reload} />}>
            <div style={{ marginBottom: 14 }}><FormButton label="Re-run a statement" kind="ghost" title="Re-run reconciliation for an imported statement" submitLabel="Re-run"
                fields={[{ name: 'id', label: 'Statement number', type: 'number', required: true }]} onSubmit={v => financeApi.rerunStatement(v.id)} onDone={reload} /></div>
            <Section title="Open exceptions" right={
                <select value={category} onChange={e => setCategory(e.target.value)}>
                    <option value="">All categories</option>
                    {['MISSING_IN_PAYPORT', 'MISSING_IN_STATEMENT', 'DUPLICATE', 'AMOUNT_MISMATCH', 'CURRENCY_MISMATCH', 'STATUS_MISMATCH', 'TIMING', ...LATE, 'FAILED_AFTER_PAID'].map(c => <option key={c}>{c}</option>)}
                </select>}>
                {error && <Notice kind="error">{error}</Notice>}
                <Table rows={value} columns={[
                    { key: 'id', label: 'ID' }, { key: 'category', label: 'Category', render: r => <Badge value={r.category} /> }, { key: 'provider_code', label: 'Source' },
                    { key: 'transaction_reference', label: 'Payport ref' }, { key: 'provider_reference', label: 'Provider ref' },
                    { key: 'expected_minor', label: 'Expected', render: r => minor(r.expected_minor, r.currency) }, { key: 'actual_minor', label: 'Actual', render: r => minor(r.actual_minor, r.currency) },
                    { key: 'detail', label: 'Detail' }, { key: 'created_at', label: 'Raised' },
                    { key: 'act', label: '', render: r => (
                        <FormButton label="Resolve…" title={`Resolve exception #${r.id}`}
                            intro={LATE.includes(r.category) ? 'Late payment: refund it. Delivering is not an option.' : 'Record what was found.'}
                            fields={[{ name: 'resolution', label: 'Resolution', type: 'select', required: true, options: LATE.includes(r.category) ? LATE_ONLY : ALL },
                                { name: 'note', label: 'Note', type: 'textarea', required: true }]}
                            onSubmit={v => financeApi.resolveException(r.id, v.resolution, v.note)} onDone={reload} />) },
                ]} />
            </Section>
        </Page>
    );
}
