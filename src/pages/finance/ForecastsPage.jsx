import { Page, Section, Table, Notice, Badge, useLoad } from '../../components/kit';
import { forecastApi } from '../../lib/api';

const money = (minor, ccy) => `${ccy} ${(Number(minor || 0) / 100).toLocaleString('en-ZW', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function ForecastsPage() {
    const { value, error } = useLoad(() => forecastApi.get(), []);
    const settlement = value?.settlement || [];
    const agents = value?.agents || [];
    return (
        <Page title="Forecasts">
            {error && <Notice kind="error">{error}</Notice>}
            <Section title="Settlement funding, next 7 days">
                <Table rows={settlement} exportName="Settlement forecast" empty="No settlement history yet." columns={[
                    { key: 'currency', label: 'Currency' },
                    { key: 'owedNowMinor', label: 'Owed to merchants now', render: s => money(s.owedNowMinor, s.currency) },
                    { key: 'next7DaysMinor', label: 'Expected next 7 days', render: s => money(s.next7DaysMinor, s.currency) },
                    { key: 'next7DaysP90Minor', label: 'Busy week (90%)', render: s => money(s.next7DaysP90Minor, s.currency) },
                    { key: 'fundingNeededMinor', label: 'Have at the bank', render: s => <strong>{money(s.fundingNeededMinor, s.currency)}</strong> },
                    { key: 'enoughHistory', label: 'History', render: s => <Badge value={s.enoughHistory ? 'ENOUGH' : 'UNDER 2 WEEKS'} /> },
                ]} />
                {settlement.map(s => (
                    <div key={s.currency} style={{ display: 'grid', gridTemplateColumns: `repeat(${s.days.length}, 1fr)`, gap: 6, marginTop: 12 }}>
                        {s.days.map(d => (
                            <div key={d.date} className="card" style={{ padding: 10, fontSize: 12.5 }}>
                                <div style={{ color: 'var(--text-2)' }}>{d.day} {d.date.slice(5)}</div>
                                <div style={{ fontWeight: 700 }}>{money(d.expectedMinor, s.currency)}</div>
                                <div style={{ color: 'var(--text-2)' }}>up to {money(d.p90Minor, s.currency)}</div>
                            </div>
                        ))}
                    </div>
                ))}
            </Section>
            <Section title="Agent float, next 7 days">
                <Table rows={agents} exportName="Agent float forecast" empty="No active agents." columns={[
                    { key: 'agentCode', label: 'Agent', render: a => <>{a.name} <span style={{ color: 'var(--text-2)' }}>({a.agentCode})</span></> },
                    { key: 'location', label: 'Location' },
                    { key: 'currency', label: 'Currency' },
                    { key: 'floatNowMinor', label: 'Float now', render: a => money(a.floatNowMinor, a.currency) },
                    { key: 'useNext7DaysMinor', label: 'Expected use', render: a => money(a.useNext7DaysMinor, a.currency) },
                    { key: 'runsOutInDays', label: 'Runs out', render: a => a.runsOutInDays == null ? '—' : <Badge value={a.runsOutInDays <= 2 ? `IN ${a.runsOutInDays} DAY${a.runsOutInDays === 1 ? '' : 'S'}` : `IN ${a.runsOutInDays} DAYS`} /> },
                    { key: 'topUpMinor', label: 'Top up (busy week)', render: a => a.topUpMinor > 0 ? <strong>{money(a.topUpMinor, a.currency)}</strong> : '—' },
                ]} />
            </Section>
            {value?.method && <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{value.method}</div>}
        </Page>
    );
}
