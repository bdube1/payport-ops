import { posAdminApi } from '../../lib/api';
import { Page, Section, Table, Notice, useLoad, Badge, FormButton, Act, KeyValues } from '../../components/kit';

/** POS terminals across merchants (disable a lost or stolen terminal at once). */
export default function PosTerminalsPage() {
    const terminals = useLoad(() => posAdminApi.terminals());
    return (
        <Page title="POS terminals">
            {terminals.error && <Notice kind="error">{terminals.error}</Notice>}
            <Section title="Terminals">
                <Table rows={terminals.value} empty="No terminals registered." columns={[
                    { key: 'terminal_id', label: 'Terminal' }, { key: 'business_name', label: 'Merchant' }, { key: 'label', label: 'Label' },
                    { key: 'status', label: 'Status', render: r => <Badge value={r.status} /> }, { key: 'status_reason', label: 'Reason' }, { key: 'last_seen_at', label: 'Last seen' },
                    { key: 'actions', label: '', render: r => r.status === 'ACTIVE'
                        ? <Act label="Disable" kind="ghost" confirm={`Disable terminal ${r.terminal_id}?`} run={() => posAdminApi.setStatus(r.terminal_id, false, 'Disabled from the ops console')} done={terminals.reload} />
                        : <Act label="Enable" confirm={`Enable terminal ${r.terminal_id}?`} run={() => posAdminApi.setStatus(r.terminal_id, true, 'Enabled from the ops console')} done={terminals.reload} /> },
                ]} />
            </Section>
        </Page>
    );
}
