import { posAdminApi, whatsappAdminApi } from '../../lib/api';
import { Page, Section, Table, Notice, useLoad, Badge, FormButton, Act, KeyValues } from '../../components/kit';

/** POS terminals across merchants (disable a lost or stolen terminal at once) and the WhatsApp channel's configuration state. */
export default function PosTerminalsPage() {
    const terminals = useLoad(() => posAdminApi.terminals());
    const wa = useLoad(() => whatsappAdminApi.status());
    return (
        <Page title="POS terminals & WhatsApp" subtitle="Terminals sign every request (HMAC + nonce). Card acceptance fails closed until a card acquirer is configured. The channels themselves are switched on the Channels & Product Lines page.">
            {terminals.error && <Notice kind="error">{terminals.error}</Notice>}
            <Section title="Terminals">
                <Table rows={terminals.value} empty="No terminals registered." columns={[
                    { key: 'terminal_id', label: 'Terminal' }, { key: 'business_name', label: 'Merchant' }, { key: 'label', label: 'Label' },
                    { key: 'status', label: 'Status', render: r => <Badge value={r.status} /> }, { key: 'status_reason', label: 'Reason' }, { key: 'last_seen_at', label: 'Last seen' },
                    { key: 'actions', label: '', render: r => r.status === 'ACTIVE'
                        ? <FormButton label="Disable" kind="ghost" title={`Disable ${r.terminal_id}`} submitLabel="Disable" fields={[{ name: 'reason', label: 'Reason', required: true }]}
                            onSubmit={v => posAdminApi.setStatus(r.terminal_id, false, v.reason)} onDone={terminals.reload} />
                        : <Act label="Enable" run={() => posAdminApi.setStatus(r.terminal_id, true, 'Re-enabled by PayPort')} done={terminals.reload} /> },
                ]} />
            </Section>
            <Section title="WhatsApp">
                {wa.error && <Notice kind="error">{wa.error}</Notice>}
                {wa.value && <>
                    {!wa.value.webhookSecretConfigured && <Notice kind="warn">WhatsApp webhook secret not configured (WHATSAPP_APP_SECRET): every delivery is refused.</Notice>}
                    {!wa.value.senderConfigured && <Notice kind="warn">WhatsApp sender not configured (WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN): replies are recorded but not sent.</Notice>}
                    <KeyValues obj={{ 'Webhook secret': wa.value.webhookSecretConfigured, 'Verify token': wa.value.verifyTokenConfigured, Sender: wa.value.senderConfigured }} />
                    <div style={{ height: 12 }} />
                    <Table rows={wa.value.recent} empty="No messages received." columns={[
                        { key: 'received_at', label: 'Received' }, { key: 'wa_id', label: 'From' }, { key: 'sent', label: 'Reply sent' }, { key: 'send_error', label: 'Send error' },
                    ]} />
                </>}
            </Section>
        </Page>
    );
}
