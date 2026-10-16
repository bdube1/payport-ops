import { useState } from 'react';
import { platformApi } from '../../lib/api';
import { Page, Section, Table, Notice, useLoad, Badge, FormButton } from '../../components/kit';

export default function DestinationsPage() {
    const [status, setStatus] = useState('PENDING_VERIFICATION');
    const { value, error, reload } = useLoad(() => platformApi.destinations(status), [status]);
    return (
        <Page title="Settlement destinations" subtitle="Where merchants are paid. Nothing is paid out to an unverified account; the person who requested a change cannot verify it.">
            <Section title="Destinations" right={
                <select value={status} onChange={e => setStatus(e.target.value)}>
                    {['PENDING_VERIFICATION', 'VERIFIED', 'REJECTED', 'RETIRED'].map(s => <option key={s}>{s}</option>)}
                </select>}>
                {error && <Notice kind="error">{error}</Notice>}
                <Table rows={value} columns={[
                    { key: 'id', label: 'ID' }, { key: 'merchant_id', label: 'Merchant' }, { key: 'currency', label: 'Currency' }, { key: 'type', label: 'Type' },
                    { key: 'institution', label: 'Institution' }, { key: 'account_name', label: 'Account name' }, { key: 'account_number', label: 'Account' },
                    { key: 'status', label: 'Status', render: r => <Badge value={r.status} /> }, { key: 'requested_by', label: 'Requested by' },
                    { key: 'actions', label: '', render: r => r.status === 'PENDING_VERIFICATION' && (
                        <FormButton label="Verify…" title={`Verify destination #${r.id}`}
                            intro="Confirm the account belongs to the merchant (bank letter or a verification payment) before approving."
                            fields={[{ name: 'approve', label: 'Approve this destination', type: 'checkbox' }, { name: 'note', label: 'Evidence / note', type: 'textarea', required: true }]}
                            onSubmit={v => platformApi.verifyDestination(r.id, !!v.approve, v.note)} onDone={reload} />) },
                ]} />
            </Section>
        </Page>
    );
}
