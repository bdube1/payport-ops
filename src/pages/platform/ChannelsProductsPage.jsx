import { useState } from 'react';
import { platformControlsApi } from '../../lib/api';
import { useAuth } from '../../lib/auth.jsx';
import { Page, Section, Table, Notice, useLoad, Badge, FormButton, Act, FormModal } from '../../components/kit';

export default function ChannelsProductsPage() {
    const { user } = useAuth();
    const channels = useLoad(() => platformControlsApi.channels());
    const lines = useLoad(() => platformControlsApi.serviceLines());
    const fx = useLoad(() => (['ADMIN', 'FINANCE', 'COMPLIANCE'].includes(user?.role) ? platformControlsApi.fxRates() : Promise.resolve({ data: [] })));
    const [quote, setQuote] = useState(null);
    const ready = useLoad(() => platformControlsApi.paymentsReadiness());
    const [goLive, setGoLive] = useState(false);
    const reload = () => { channels.reload(); lines.reload(); fx.reload(); ready.reload(); };
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
                            confirm={`Are you sure you want to switch ${c.enabled ? 'off' : 'on'} ${c.name}?`}
                            run={() => platformControlsApi.setChannel(c.code, !c.enabled, c.enabled ? 'Switched off from the ops console' : 'Switched on from the ops console')} done={reload} />) },
                ]} />
            </Section>
            <Section title="Store payments" right={user?.role === 'ADMIN' && ready.value && (ready.value.storePaymentsLive
                ? <Act label="Back to sandbox" kind="danger" confirm="Are you sure?" run={() => platformControlsApi.setStorePaymentsLive(false, 'Back to sandbox from the ops console')} done={reload} />
                : <button className="btn btn-success" style={{ padding: '6px 12px', fontSize: 12.5 }} disabled={!ready.value.readyForLive} onClick={() => setGoLive(true)}>Switch to live</button>)}>
                {ready.error && <Notice kind="error">{ready.error}</Notice>}
                {ready.value && <div style={{ marginBottom: 10 }}><Badge value={ready.value.storePaymentsLive ? 'LIVE' : 'SANDBOX'} /> <span style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{ready.value.environment}</span></div>}
                <Table rows={ready.value?.methods || []} noExport columns={[
                    { key: 'name', label: 'Method' },
                    { key: 'switchedOn', label: 'State', render: m => <Badge value={m.switchedOn ? 'ENABLED' : 'DISABLED'} /> },
                    { key: 'credentialsInPlace', label: 'Provider credentials', render: m => m.credentialsInPlace ? <Badge value="READY" /> : <span style={{ fontSize: 12.5 }}>Missing: {m.missing.join(', ')}</span> },
                ]} />
                {goLive && <FormModal title="Switch store payments to live" submitLabel="Switch to live"
                    fields={[{ name: 'reason', label: 'Approval', type: 'textarea', required: true }]}
                    onSubmit={(v) => (window.confirm('Are you sure?') ? platformControlsApi.setStorePaymentsLive(true, v.reason) : Promise.reject(new Error('Cancelled')))}
                    onClose={() => setGoLive(false)} onDone={() => { setGoLive(false); reload(); }} />}
            </Section>
            <Section title="Product lines">
                {lines.error && <Notice kind="error">{lines.error}</Notice>}
                <Table rows={lines.value} columns={[
                    { key: 'name', label: 'Line' }, { key: 'description', label: 'Description' },
                    { key: 'enabled', label: 'State', render: l => <Badge value={l.enabled ? 'ENABLED' : 'DISABLED'} /> },
                    { key: 'updated_by', label: 'Changed by' },
                    { key: 'act', label: '', render: l => ['ADMIN', 'OPS'].includes(user?.role) && (
                        <Act label={l.enabled ? 'Switch off' : 'Switch on'} kind={l.enabled ? 'danger' : 'success'}
                            confirm={`Are you sure you want to switch ${l.enabled ? 'off' : 'on'} ${l.name}?`}
                            run={() => platformControlsApi.setServiceLine(l.code, !l.enabled, l.enabled ? 'Switched off from the ops console' : 'Switched on from the ops console')} done={reload} />) },
                ]} />
            </Section>
            {['ADMIN', 'FINANCE', 'COMPLIANCE'].includes(user?.role) && (
                <Section title="FX reference rates" right={<>
                    {['ADMIN', 'FINANCE'].includes(user?.role) && <FormButton label="Propose rate" title="New reference rate"
                        fields={[{ name: 'base', label: 'Base currency', type: 'currency', required: true, initial: 'USD' }, { name: 'quote', label: 'Quote currency', type: 'currency', required: true, initial: 'ZWG' },
                            { name: 'rate', label: 'Rate (quote per 1 base)', type: 'number', step: 'any', required: true }, { name: 'spreadBps', label: 'Spread (basis points)', type: 'number', initial: 0 },
                            { name: 'source', label: 'Source (e.g. RBZ interbank rate, date)', type: 'text', required: true }]}
                        onSubmit={v => platformControlsApi.proposeFxRate({ ...v, base: v.base.toUpperCase(), quote: v.quote.toUpperCase() })} onDone={reload} />}
                    <FormButton label="Quote" kind="ghost" title="Indicative quote" fields={[{ name: 'from', label: 'From', type: 'currency', required: true, initial: 'USD' },
                        { name: 'to', label: 'To', type: 'currency', required: true, initial: 'ZWG' }, { name: 'amount', label: 'Amount (major units)', type: 'number', step: '0.01', required: true }]}
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
