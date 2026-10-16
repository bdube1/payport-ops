import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getMerchants, platformApi } from '../../lib/api';
import { Page, Section, Table, Notice, useLoad, Badge, Act, FormButton, KeyValues } from '../../components/kit';

const CHECKLIST = [
    ['registration_documents_verified', 'Registration documents verified'],
    ['directors_identified', 'Directors and beneficial owners identified'],
    ['sanctions_screened', 'Sanctions screening clear'],
    ['business_activity_acceptable', 'Business activity acceptable'],
    ['bank_account_verified', 'Bank account verified'],
];

function KybCase({ merchantId }) {
    const kyb = useLoad(() => platformApi.kyb(merchantId), [merchantId]);
    const ready = useLoad(() => platformApi.readiness(merchantId), [merchantId]);
    const refresh = () => { kyb.reload(); ready.reload(); };
    const c = kyb.value;
    return (
        <>
            <Section title={`KYB case: merchant #${merchantId}`} right={<>
                <Act label="Assign to me" kind="ghost" run={() => platformApi.kybAssign(merchantId)} done={refresh} />
                <FormButton label="Recommend" title="Recommendation (first person)"
                    intro="The recommender cannot also decide. Approval needs a CLEAR sanctions screening; the server checks it again."
                    fields={[
                        { name: 'recommendation', label: 'Recommendation', type: 'select', required: true, options: ['APPROVE', 'REJECT'] },
                        ...CHECKLIST.map(([name, label]) => ({ name, label, type: 'checkbox' })),
                        { name: 'note', label: 'Note', type: 'textarea', required: true },
                    ]}
                    onSubmit={v => platformApi.kybRecommend(merchantId, v.recommendation, Object.fromEntries(CHECKLIST.map(([k]) => [k, !!v[k]])), v.note)}
                    onDone={refresh} />
                <FormButton label="Decide" kind="success" title="Decision (second person)"
                    intro="Accept or return the recommendation. You cannot decide on your own recommendation."
                    fields={[{ name: 'accept', label: 'Accept the recommendation', type: 'checkbox' }, { name: 'note', label: 'Note', type: 'textarea', required: true }]}
                    onSubmit={v => platformApi.kybDecide(merchantId, !!v.accept, v.note)} onDone={(r) => { refresh(); const k = r?.approval?.testKeyPair; if (k) window.alert(`Merchant approved. First test key pair (shown once, pass it to the merchant securely):\n${JSON.stringify(k, null, 2)}`); }} />
            </>}>
                {kyb.error && <Notice kind="error">{kyb.error}</Notice>}
                <KeyValues obj={c} />
            </Section>
            <Section title="Go-live readiness and market enablements" right={
                <FormButton label="Enable / disable currency" title="Market enablement"
                    intro="Live payments only in currencies enabled here. A sandbox market's currency can never be enabled for live money."
                    fields={[
                        { name: 'country', label: 'Country (blank = the currency\'s market)', type: 'text' },
                        { name: 'currency', label: 'Currency', type: 'text', required: true },
                        { name: 'enabled', label: 'Enabled for live payments', type: 'checkbox', initial: true },
                    ]}
                    onSubmit={v => platformApi.enable(merchantId, v.country || null, v.currency.toUpperCase(), !!v.enabled)} onDone={refresh} />}>
                {ready.error && <Notice kind="error">{ready.error}</Notice>}
                <KeyValues obj={ready.value} />
            </Section>
        </>
    );
}

export default function KybPage() {
    const [params, setParams] = useSearchParams();
    const selected = params.get('merchant');
    const [status, setStatus] = useState('PENDING');
    const list = useLoad(() => getMerchants(status), [status]);
    return (
        <Page title="KYB review" subtitle="Four-eyes merchant approval: one person recommends with the checklist, a different person decides.">
            <Section title="Merchants" right={
                <select value={status} onChange={e => setStatus(e.target.value)}>
                    {['PENDING', 'UNDER_REVIEW', 'UPDATE_REQUIRED', 'ACTIVE', 'SUSPENDED', 'REJECTED'].map(s => <option key={s}>{s}</option>)}
                </select>}>
                {list.error && <Notice kind="error">{list.error}</Notice>}
                <Table rows={list.value} onRow={r => setParams({ merchant: r.id })} columns={[
                    { key: 'id', label: 'ID' }, { key: 'businessName', label: 'Business' }, { key: 'registrationNumber', label: 'Registration' },
                    { key: 'status', label: 'Status', render: r => <Badge value={r.status} /> }, { key: 'createdAt', label: 'Applied' },
                ]} />
            </Section>
            {selected && <KybCase merchantId={selected} />}
        </Page>
    );
}
