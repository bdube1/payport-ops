import { useState } from 'react';
import { platformControlsApi } from '../../lib/api';
import { useAuth } from '../../lib/auth.jsx';
import { Page, Section, Table, Notice, useLoad, Badge, FormButton } from '../../components/kit';

export default function ChannelsProductsPage() {
    const { user } = useAuth();
    const channels = useLoad(() => platformControlsApi.channels());
    const lines = useLoad(() => platformControlsApi.serviceLines());
    const fx = useLoad(() => (['ADMIN', 'FINANCE', 'COMPLIANCE'].includes(user?.role) ? platformControlsApi.fxRates() : Promise.resolve({ data: [] })));
    const [quote, setQuote] = useState(null);
    const reload = () => { channels.reload(); lines.reload(); fx.reload(); };
    return (
        <Page title="Channels and product lines" subtitle="Switch channels and product lines on and off without code. A channel or line that needs a licence can only be switched on after compliance records the licence decision (two officers). Individual products and payment methods are under Products.">
            <Section title="Channels">
                {channels.error && <Notice kind="error">{channels.error}</Notice>}
                <Table rows={channels.value} columns={[
                    { key: 'code', label: 'Code' }, { key: 'name', label: 'Channel' }, { key: 'description', label: 'What it covers' },
                    { key: 'enabled', label: 'State', render: c => <Badge value={c.enabled ? 'ENABLED' : 'DISABLED'} /> },
                    { key: 'licence_gate', label: 'Licence needed' }, { key: 'reason', label: 'Last reason' }, { key: 'updated_by', label: 'By' },
                    { key: 'act', label: '', render: c => ['ADMIN', 'OPS'].includes(user?.role) && (
                        <FormButton label={c.enabled ? 'Switch off' : 'Switch on'} kind={c.enabled ? 'danger' : 'success'} title={`${c.enabled ? 'Switch off' : 'Switch on'} ${c.name}`}
                            intro={c.enabled ? 'New payments through this channel are refused at once with a clear message. Payments already in progress finish normally.' : 'New payments through this channel are accepted again.'}
                            fields={[{ name: 'reason', label: 'Reason', type: 'textarea', required: true }]}
                            onSubmit={v => platformControlsApi.setChannel(c.code, !c.enabled, v.reason)} onDone={reload} />) },
                ]} />
            </Section>
            <Section title="Product lines (Phase 8)">
                {lines.error && <Notice kind="error">{lines.error}</Notice>}
                <Table rows={lines.value} columns={[
                    { key: 'name', label: 'Line' }, { key: 'description', label: 'Description' },
                    { key: 'licence_status', label: 'Licence', render: l => <Badge value={l.licence_status} /> }, { key: 'licence_reference', label: 'Reference' },
                    { key: 'harvest_status', label: 'Build', render: l => <Badge value={l.harvest_status} /> },
                    { key: 'enabled', label: 'State', render: l => <Badge value={l.enabled ? 'ENABLED' : 'DISABLED'} /> },
                    { key: 'licence_question', label: 'Licensing question', render: l => <span style={{ fontSize: 11.5 }}>{l.licence_question}</span> },
                    { key: 'act', label: '', render: l => (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {user?.role === 'COMPLIANCE' && <FormButton label="Record licence decision" kind="ghost" title={`Licence decision: ${l.name}`}
                                intro="A second compliance officer must approve it before it takes effect."
                                fields={[{ name: 'status', label: 'Status', type: 'select', required: true, options: ['NOT_ASSESSED', 'APPLIED', 'GRANTED', 'NOT_REQUIRED', 'REFUSED'] },
                                    { name: 'reference', label: 'Licence / legal opinion reference', type: 'text' }, { name: 'regulator', label: 'Regulator', type: 'text' },
                                    { name: 'reason', label: 'Basis', type: 'textarea', required: true }]}
                                onSubmit={v => platformControlsApi.requestLicence(l.code, v)} onDone={reload} />}
                            {['ADMIN', 'OPS'].includes(user?.role) && (l.enabled || user?.role === 'ADMIN') && (
                                <FormButton label={l.enabled ? 'Switch off' : 'Switch on'} kind={l.enabled ? 'danger' : 'success'} title={`${l.enabled ? 'Switch off' : 'Switch on'} ${l.name}`}
                                    intro={l.enabled ? 'Immediate.' : 'Only possible once the licence status is GRANTED or NOT_REQUIRED, and only for lines that are built.'}
                                    fields={[{ name: 'reason', label: 'Reason', type: 'textarea', required: true }]}
                                    onSubmit={v => platformControlsApi.setServiceLine(l.code, !l.enabled, v.reason)} onDone={reload} />)}
                        </div>) },
                ]} />
            </Section>
            {['ADMIN', 'FINANCE', 'COMPLIANCE'].includes(user?.role) && (
                <Section title="FX reference rates" right={<>
                    {['ADMIN', 'FINANCE'].includes(user?.role) && <FormButton label="Propose rate" title="New reference rate" intro="Another person must approve it before it is used. Conversions stay off until the FX line is licensed and switched on."
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
