import { useState } from 'react';
import { platformControlsApi } from '../../lib/api';
import { useAuth } from '../../lib/auth.jsx';
import { Page, Section, Table, Notice, useLoad, Badge, FormButton, Act } from '../../components/kit';

export default function ChannelsProductsPage() {
    const { user } = useAuth();
    const channels = useLoad(() => platformControlsApi.channels());
    const lines = useLoad(() => platformControlsApi.serviceLines());
    const fx = useLoad(() => (['ADMIN', 'FINANCE', 'COMPLIANCE'].includes(user?.role) ? platformControlsApi.fxRates() : Promise.resolve({ data: [] })));
    const [quote, setQuote] = useState(null);
    const reload = () => { channels.reload(); lines.reload(); fx.reload(); };
    return (
        <Page title="Channels and product lines">
            <Section title="Channels">
                {channels.error && <Notice kind="error">{channels.error}</Notice>}
                <Table rows={channels.value} columns={[
                    { key: 'code', label: 'Code' }, { key: 'name', label: 'Channel' },
                    { key: 'enabled', label: 'State', render: c => <Badge value={c.enabled ? 'ENABLED' : 'DISABLED'} /> },
                    { key: 'updated_by', label: 'Changed by' },
                    { key: 'act', label: '', render: c => ['ADMIN', 'OPS'].includes(user?.role) && (
                        <Act label={c.enabled ? 'Switch off' : 'Switch on'} kind={c.enabled ? 'danger' : 'success'}
                            run={() => platformControlsApi.setChannel(c.code, !c.enabled, '')} done={reload} />) },
                ]} />
            </Section>
            <Section title="Product lines">
                {lines.error && <Notice kind="error">{lines.error}</Notice>}
                <Table rows={lines.value} columns={[
                    { key: 'name', label: 'Line' }, { key: 'description', label: 'Description' },
                    { key: 'enabled', label: 'State', render: l => <Badge value={l.enabled ? 'ENABLED' : 'DISABLED'} /> },
                    { key: 'updated_by', label: 'Changed by' },
                    { key: 'act', label: '', render: l => ['ADMIN', 'OPS'].includes(user?.role) && (
                        <Act label={l.enabled ? 'Switch off' : 'Switch on'} kind={l.enabled ? 'danger' : 'success'}
                            run={() => platformControlsApi.setServiceLine(l.code, !l.enabled, '')} done={reload} />) },
                ]} />
            </Section>
            {['ADMIN', 'FINANCE', 'COMPLIANCE'].includes(user?.role) && (
                <Section title="FX reference rates" right={<>
                    {['ADMIN', 'FINANCE'].includes(user?.role) && <FormButton label="Propose rate" title="New reference rate"
                        fields={[{ name: 'base', label: 'Base currency', type: 'text', required: true, initial: 'USD' }, { name: 'quote', label: 'Quote currency', type: 'text', required: true, initial: 'ZWG' },
                            { name: 'rate', label: 'Rate (quote per 1 base)', type: 'number', step: 'any', required: true }, { name: 'spreadBps', label: 'Spread (basis points)', type: 'number', initial: 0 },
                            { name: 'source', label: 'Source (e.g. RBZ interbank rate, date)', type: 'text', required: true }]}
                        onSubmit={v => platformControlsApi.proposeFxRate({ ...v, base: v.base.toUpperCase(), quote: v.quote.toUpperCase() })} onDone={reload} />}
                    <FormButton label="Quote" kind="ghost" title="Indicative quote" fields={[{ name: 'from', label: 'From', type: 'text', required: true, initial: 'USD' },
                        { name: 'to', label: 'To', type: 'text', required: true, initial: 'ZWG' }, { name: 'amount', label: 'Amount (major units)', type: 'number', step: '0.01', required: true }]}
                        onSubmit={v => platformControlsApi.fxQuote(v.from.toUpperCase(), v.to.toUpperCase(), Math.round(Number(v.amount) * 100))} onDone={setQuote} />
                </>}>
                    {quote && <Notice kind="info">Quote: <code>{JSON.stringify(quote)}</code></Notice>}
                    <Table rows={fx.value} columns={[
                        { key: 'id', label: 'ID' }, { key: 'base_ccy', label: 'Base' }, { key: 'quote_ccy', label: 'Quote' }, { key: 'rate', label: 'Rate' },
                        { key: 'spread_bps', label: 'Spread bps' }, { key: 'source', label: 'Source' }, { key: 'status', label: 'Status', render: r => <Badge value={r.status} /> },
                        { key: 'created_by', label: 'Proposed by' }, { key: 'approved_by', label: 'Approved by' },
                        { key: 'act', label: '', render: r => r.status === 'PENDING' && ['ADMIN', 'FINANCE'].includes(user?.role) && (
                            <FormButton label="Decide" kind="ghost" title={`Rate #${r.id}`} fields={[{ name: 'approve', label: 'Approve', type: 'checkbox' }, { name: 'note', label: 'Note', type: 'text' }]}
                                onSubmit={v => platformControlsApi.decideFxRate(r.id, !!v.approve, v.note)} onDone={reload} />) },
                    ]} />
                </Section>
            )}
        </Page>
    );
}
