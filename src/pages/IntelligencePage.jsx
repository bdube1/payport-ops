import toast from 'react-hot-toast';
import { intelligenceApi } from '../lib/api';
import { Page, Section, Table, Notice, Badge, useLoad, errorText, show } from '../components/kit';

const NAMES = {
    COMPLAINT_TRIAGE: 'Complaint triage',
    INVESTIGATION_HELPER: 'Investigation helper',
    FRAUD_SHADOW: 'Fraud scoring (shadow)',
};
const pct = (v) => (v === null || v === undefined ? '—' : `${Math.round(Number(v) * 100)}%`);

function Tile({ title, value, sub }) {
    return (
        <div className="card" style={{ padding: 16, minWidth: 170 }}>
            <div style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 700 }}>{title}</div>
            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{value}</div>
            {sub && <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>{sub}</div>}
        </div>
    );
}

export default function IntelligencePage() {
    const o = useLoad(() => intelligenceApi.overview(), []);
    const v = o.value || {};
    const toggle = async (f) => {
        if (!window.confirm('Are you sure?')) return;
        try { await intelligenceApi.set(f.feature, !f.enabled); toast.success(f.enabled ? 'Switched off' : 'Switched on'); o.reload(); }
        catch (e) { toast.error(errorText(e)); }
    };
    const retrain = async () => {
        try { await intelligenceApi.retrain(); toast.success('Trained'); o.reload(); }
        catch (e) { toast.error(errorText(e)); }
    };
    const model = v.triage?.model;
    const m = model?.metrics || {};
    const live = v.triage?.live || {};
    const fraud = v.fraud || {};
    const scored = Object.fromEntries((fraud.scored30d || []).map(r => [r.label, r.n]));
    return (
        <Page title="Payport Intelligence">
            {o.error && <Notice kind="error">{o.error}</Notice>}
            <Section title="Features">
                <Table noExport rows={(v.features || []).map(f => ({ ...f, id: f.feature }))} columns={[
                    { key: 'feature', label: 'Feature', render: f => NAMES[f.feature] || f.feature },
                    { key: 'enabled', label: 'Status', render: f => <Badge value={f.enabled ? 'ON' : 'OFF'} /> },
                    { key: 'updated_by', label: 'Changed by', render: f => show(f.updated_by) },
                    { key: 'updated_at', label: 'When', render: f => show(f.updated_at) },
                    { key: 'act', label: '', render: f => <button className={`btn ${f.enabled ? 'btn-ghost' : 'btn-primary'}`} style={{ padding: '6px 12px', fontSize: 12.5 }} onClick={() => toggle(f)}>{f.enabled ? 'Switch off' : 'Switch on'}</button> },
                ]} />
            </Section>
            <Section title="Complaint triage" right={<button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: 12.5 }} onClick={retrain}>Train now</button>}>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <Tile title="Model" value={model ? `v${model.version}` : '—'} sub={model ? show(model.trained_at) : null} />
                    <Tile title="Complaints learned from" value={m.complaints ?? 0} />
                    <Tile title="Right first time (unseen)" value={pct(m.accuracy)} sub={m.tested ? `${m.tested} tested` : null} />
                    <Tile title="Right type in top 3" value={pct(m.top3)} />
                    <Tile title="Agreed with staff (30 days)" value={live.suggested ? pct(Number(live.agreed) / Number(live.suggested)) : '—'} sub={live.suggested ? `${live.suggested} complaints` : null} />
                </div>
            </Section>
            <Section title="Fraud scoring (shadow)">
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
                    <Tile title="Scored (30 days)" value={(scored.LOW || 0) + (scored.MEDIUM || 0) + (scored.HIGH || 0)} sub={`High ${scored.HIGH || 0} · Medium ${scored.MEDIUM || 0}`} />
                    <Tile title="Confirmed fraud" value={fraud.confirmedFraud ?? 0} />
                    <Tile title="Model: caught / precision" value={`${fraud.model?.caught ?? 0} · ${pct(fraud.model?.precision)}`} sub={`recall ${pct(fraud.model?.recall)}`} />
                    <Tile title="Rules: caught / precision" value={`${fraud.rules?.caught ?? 0} · ${pct(fraud.rules?.precision)}`} sub={`recall ${pct(fraud.rules?.recall)}`} />
                </div>
                <Table rows={(fraud.recentHigh || []).map(r => {
                    let d = {};
                    try { d = typeof r.detail === 'string' ? JSON.parse(r.detail) : (r.detail || {}); } catch { d = {}; }
                    return { ...r, reasons: (d.reasons || []).join(', '), rules: d.rulesFlagged };
                })} exportName="Shadow high scores" empty="No high scores." columns={[
                    { key: 'reference', label: 'Reference' },
                    { key: 'score', label: 'Score', render: r => pct(r.score) },
                    { key: 'reasons', label: 'Why' },
                    { key: 'rules', label: 'Rules flagged it', render: r => (r.rules ? 'Yes' : 'No') },
                    { key: 'created_at', label: 'When', render: r => show(r.created_at) },
                ]} />
            </Section>
        </Page>
    );
}
