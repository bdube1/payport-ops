import { useState } from 'react';
import { ussdAdminApi, whatsappAdminApi, platformControlsApi } from '../../lib/api';
import { useAuth } from '../../lib/auth.jsx';
import { Page, Section, Table, Notice, useLoad, Badge, FormButton, Act, KeyValues, ShowOnce, show } from '../../components/kit';

const API_BASE = (import.meta.env.VITE_API_URL || 'https://api.payport.africa').replace(/\/$/, '');

const PROTOCOL = {
    ECONET: 'Econet messaging XML',
    NETONE: 'NetOne dynamic menu XML',
    TELECEL: 'Telecel JSON',
};

function Networks({ role, onSecret }) {
    const nets = useLoad(() => ussdAdminApi.networks());
    const canEdit = ['ADMIN', 'OPS'].includes(role);
    return (
        <Section title="USSD networks">
            {nets.error && <Notice kind="error">{nets.error}</Notice>}
            <Table rows={nets.value} empty="No networks." columns={[
                { key: 'name', label: 'Network' },
                { key: 'enabled', label: 'State', render: n => <Badge value={n.enabled ? 'ENABLED' : 'DISABLED'} /> },
                { key: 'shortCode', label: 'Short code' },
                { key: 'url', label: 'Address to give the network', render: n => <code style={{ fontSize: 12 }}>{`${API_BASE}/api/v1/ussd/${n.code.toLowerCase()}?key=…`}</code> },
                { key: 'protocol', label: 'Format', render: n => PROTOCOL[n.code] },
                { key: 'accessKeySet', label: 'Access key', render: n => n.accessKeySet ? `set (…${n.accessKeyHint || ''})` : 'not set' },
                { key: 'allowedIps', label: 'Allowed IPs', render: n => show(n.allowedIps) },
                { key: 'actions', label: '', render: n => canEdit && <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <Act label={n.enabled ? 'Switch off' : 'Switch on'} kind={n.enabled ? 'danger' : 'success'}
                        confirm={`Are you sure you want to switch ${n.enabled ? 'off' : 'on'} USSD on ${n.name}?`}
                        run={() => ussdAdminApi.update(n.code, { enabled: !n.enabled })} done={nets.reload} />
                    <FormButton label="Settings" kind="ghost" title={`${n.name} USSD`} submitLabel="Save"
                        fields={[{ name: 'shortCode', label: 'Short code (e.g. *123#)', initial: n.shortCode || '' },
                            { name: 'allowedIps', label: "Network gateway IP addresses (comma separated)", initial: n.allowedIps || '' }]}
                        onSubmit={v => ussdAdminApi.update(n.code, { shortCode: v.shortCode, allowedIps: v.allowedIps })} onDone={nets.reload} />
                    {role === 'ADMIN' && <Act label={n.accessKeySet ? 'New access key' : 'Create access key'} kind="ghost"
                        confirm={n.accessKeySet ? `Replace the ${n.name} access key? The old key stops working at once.` : `Create an access key for ${n.name}?`}
                        run={() => ussdAdminApi.newKey(n.code)}
                        done={(r) => { nets.reload(); onSecret({
                            title: `${n.name} USSD access`,
                            note: 'Give this address to the network. The key is shown only once.',
                            items: [{ label: 'Address', value: `${API_BASE}/api/v1/ussd/${n.code.toLowerCase()}?key=${r?.accessKey}` }, { label: 'Access key', value: r?.accessKey }],
                        }); }} />}
                </div> },
            ]} />
        </Section>
    );
}

function WhatsApp({ role }) {
    const wa = useLoad(() => whatsappAdminApi.status());
    const v = wa.value;
    return (
        <Section title="WhatsApp" right={v && <>
            {role === 'ADMIN' && <FormButton label="Connection settings" title="WhatsApp Cloud API" submitLabel="Save"
                fields={[
                    { name: 'businessNumber', label: 'WhatsApp business number', initial: v.businessNumber || '' },
                    { name: 'phoneNumberId', label: 'Phone number ID (Meta: WhatsApp > API Setup)', initial: v.phoneNumberId || '' },
                    { name: 'wabaId', label: 'WhatsApp Business Account ID', initial: v.wabaId || '' },
                    { name: 'accessToken', label: v.accessTokenSet ? 'Permanent access token (set; leave blank to keep)' : 'Permanent access token', type: 'textarea' },
                    { name: 'appSecret', label: v.appSecretSet ? 'App secret (set; leave blank to keep)' : 'App secret (Meta: App settings > Basic)' },
                    { name: 'verifyToken', label: v.verifyTokenSet ? 'Webhook verify token (set; leave blank to keep)' : 'Webhook verify token (any phrase you choose)' },
                ]}
                onSubmit={vals => whatsappAdminApi.saveSettings(vals)} onDone={wa.reload} />}
            {['ADMIN', 'OPS'].includes(role) && <FormButton label="Send test message" kind="ghost" title="Send a WhatsApp test message" submitLabel="Send"
                fields={[{ name: 'to', label: 'To (a number that messaged the business in the last 24 hours)', required: true }]}
                onSubmit={async vals => {
                    const r = await whatsappAdminApi.test(vals.to);
                    const d = r?.data?.data;
                    if (d && !d.sent) throw new Error(d.error || 'Not sent');
                    return r;
                }} />}
        </>}>
            {wa.error && <Notice kind="error">{wa.error}</Notice>}
            {v && <>
                <KeyValues obj={{
                    'Business number': v.businessNumber,
                    'Phone number ID': v.phoneNumberId,
                    'Business account ID': v.wabaId,
                    'Access token': v.accessTokenSet ? 'Set' : 'Not set',
                    'App secret': v.appSecretSet ? 'Set' : 'Not set',
                    'Verify token': v.verifyTokenSet ? 'Set' : 'Not set',
                    'Callback URL for Meta': `${API_BASE}${v.webhookPath || '/api/v1/whatsapp/webhook'}`,
                    'Receiving messages': v.webhookSecretConfigured ? 'Yes' : 'No',
                    'Sending replies': v.senderConfigured ? 'Yes' : 'No',
                    'Last changed': [v.updatedBy, show(v.updatedAt)].filter(x => x && x !== '—').join(' · '),
                }} />
                <div style={{ height: 14 }} />
                <Table rows={v.recent} empty="No messages received yet." columns={[
                    { key: 'received_at', label: 'Received', render: r => show(r.received_at) }, { key: 'wa_id', label: 'From' },
                    { key: 'sent', label: 'Reply sent', render: r => show(!!r.sent) }, { key: 'send_error', label: 'Send error' },
                ]} />
            </>}
        </Section>
    );
}

function ChannelSwitches({ role }) {
    const channels = useLoad(() => platformControlsApi.channels());
    const rows = (channels.value || []).filter(c => ['USSD', 'WHATSAPP'].includes(c.code));
    return (
        <Section title="Channels">
            {channels.error && <Notice kind="error">{channels.error}</Notice>}
            <Table rows={rows} columns={[
                { key: 'name', label: 'Channel' },
                { key: 'enabled', label: 'State', render: c => <Badge value={c.enabled ? 'ENABLED' : 'DISABLED'} /> },
                { key: 'act', label: '', render: c => ['ADMIN', 'OPS'].includes(role) && (
                    <Act label={c.enabled ? 'Switch off' : 'Switch on'} kind={c.enabled ? 'danger' : 'success'}
                        confirm={`Are you sure you want to switch ${c.enabled ? 'off' : 'on'} ${c.name}?`}
                        run={() => platformControlsApi.setChannel(c.code, !c.enabled, c.enabled ? 'Switched off from the ops console' : 'Switched on from the ops console')}
                        done={channels.reload} />) },
            ]} />
        </Section>
    );
}

export default function UssdWhatsAppPage() {
    const { user } = useAuth();
    const role = user?.role;
    const [secret, setSecret] = useState(null);
    return (
        <Page title="USSD & WhatsApp">
            <ChannelSwitches role={role} />
            <Networks role={role} onSecret={setSecret} />
            <WhatsApp role={role} />
            {secret && <ShowOnce {...secret} onClose={() => setSecret(null)} />}
        </Page>
    );
}
