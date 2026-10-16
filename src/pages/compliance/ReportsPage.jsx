import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { complianceApi } from '../../lib/api';
import { Page, Section, Table, Notice, useLoad, Badge, Act, FormButton, KeyValues } from '../../components/kit';

function parse(s) { try { return typeof s === 'string' ? JSON.parse(s) : s; } catch { return null; } }

function ReportEditor({ id, templates, onChange }) {
    const { value: r, error, reload } = useLoad(() => complianceApi.report(id), [id]);
    const [edits, setEdits] = useState({});
    const def = useMemo(() => parse((templates || []).find(t => t.id === r?.template_id)?.definition), [templates, r]);
    const editable = new Set((def?.sections || []).flatMap(sec => sec.fields || []).filter(f => f.source === 'manual' || f.overridable).map(f => f.name));
    const draft = r?.status === 'DRAFT';
    const refresh = () => { reload(); onChange?.(); setEdits({}); };
    const missing = String(r?.missing_fields || '').split(',').map(x => x.trim()).filter(Boolean);
    return (
        <Section title={`Report #${id} ${r?.report_ref || ''}`} right={<>
            <Act label="Save fields" disabled={!draft || !Object.keys(edits).length} run={() => complianceApi.reportFields(id, edits)} done={refresh} />
            <Act label="Approve" kind="success" disabled={!draft} run={() => complianceApi.approveReport(id)} done={refresh}
                 title="Only a designated REPORT_APPROVER who did not prepare it; all required fields must be complete" />
            <FormButton label="Mark submitted" kind="ghost" title="Submitted to the FIU (goAML)" fields={[{ name: 'fiuReference', label: 'goAML / FIU reference', type: 'text', required: true }]}
                onSubmit={v => complianceApi.reportSubmitted(id, v.fiuReference)} onDone={refresh} />
        </>}>
            {error && <Notice kind="error">{error}</Notice>}
            {r && <>
                <KeyValues obj={{ Type: r.report_type, Status: r.status, Deadline: r.deadline, 'Due': r.due_at, 'Prepared by': r.prepared_by, 'Approved by': r.approved_by, 'FIU reference': r.fiu_reference }} />
                {missing.length > 0 && <Notice kind="warn">Missing before approval: {missing.join(', ')}</Notice>}
                <Notice kind="info">Confidential. Do not tell the customer or anyone outside Compliance that a report exists (tipping off is an offence).</Notice>
                {(def?.sections || []).map(sec => (
                    <div key={sec.id || sec.title} style={{ marginTop: 14 }}>
                        <h3 style={{ fontSize: 13, margin: '0 0 8px' }}>{sec.label || sec.title || sec.id}</h3>
                        {(sec.fields || []).map(f => {
                            const val = edits[f.name] ?? r.fields?.[f.name] ?? '';
                            const canEdit = draft && editable.has(f.name);
                            const isLong = typeof val === 'string' && (val.length > 80 || f.minLength);
                            return (
                                <div key={f.name} style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 10, marginBottom: 6, fontSize: 12.5 }}>
                                    <div style={{ color: missing.includes(f.name) ? 'var(--red)' : 'var(--text-2)' }}>{f.label}{f.required ? ' *' : ''}</div>
                                    {canEdit ? (isLong
                                        ? <textarea value={val} onChange={e => setEdits(s => ({ ...s, [f.name]: e.target.value }))} style={{ minHeight: 90 }} />
                                        : <input value={val} onChange={e => setEdits(s => ({ ...s, [f.name]: e.target.value }))} />)
                                        : <div style={{ whiteSpace: 'pre-wrap' }}>{typeof val === 'object' ? JSON.stringify(val) : String(val || '—')}</div>}
                                </div>
                            );
                        })}
                    </div>
                ))}
                {r.rendered && <details style={{ marginTop: 14 }}><summary style={{ cursor: 'pointer', fontSize: 13 }}>goAML output</summary><pre style={{ fontSize: 11, overflow: 'auto' }}>{r.rendered}</pre></details>}
            </>}
        </Section>
    );
}

export default function ReportsPage() {
    const [params, setParams] = useSearchParams();
    const reports = useLoad(() => complianceApi.reports());
    const templates = useLoad(() => complianceApi.templates());
    const reportId = params.get('report');
    return (
        <Page title="FIU reports (STR / CTR)" subtitle="Reports stay DRAFT until an authorised REPORT_APPROVER (not the preparer) approves them. Formats follow FIU Zimbabwe's goAML structure; templates are versioned and activated by a second officer."
              actions={<FormButton label="Prepare CTRs" kind="ghost" title="Cash / threshold transaction reports" intro="Aggregates each customer's transactions per day at or above CTR.THRESHOLD_MINOR."
                  fields={[{ name: 'from', label: 'From (YYYY-MM-DD)', type: 'text', required: true }, { name: 'to', label: 'To (YYYY-MM-DD)', type: 'text', required: true }]}
                  onSubmit={v => complianceApi.prepareCtr(v.from, v.to)} onDone={reports.reload} />}>
            <Section title="Reports">
                {reports.error && <Notice kind="error">{reports.error}</Notice>}
                <Table rows={reports.value} onRow={r => setParams({ report: r.id })} columns={[
                    { key: 'id', label: 'ID' }, { key: 'report_ref', label: 'Reference' }, { key: 'report_type', label: 'Type' }, { key: 'status', label: 'Status', render: r => <Badge value={r.status} /> },
                    { key: 'case_id', label: 'Case' }, { key: 'due_at', label: 'Due' }, { key: 'missing_fields', label: 'Missing' }, { key: 'prepared_by', label: 'Prepared by' },
                ]} />
            </Section>
            {reportId && <ReportEditor id={reportId} templates={templates.value} onChange={reports.reload} />}
            <Section title="Templates" right={<FormButton label="New template version" kind="ghost" title="New template version (DRAFT)"
                intro="Another officer must activate it. The definition lists sections and fields with their source (param:, case., subject., officer., report., manual, const:)."
                fields={[{ name: 'code', label: 'Template code', type: 'text', required: true, initial: 'PAYPORT_STR' }, { name: 'definition', label: 'Definition (JSON)', type: 'json', required: true },
                    { name: 'source', label: 'Basis / source', type: 'text', required: true }]}
                onSubmit={v => complianceApi.createTemplate(v)} onDone={templates.reload} />}>
                <Table rows={templates.value} columns={[
                    { key: 'id', label: 'ID' }, { key: 'code', label: 'Code' }, { key: 'report_type', label: 'Type' }, { key: 'version', label: 'v' },
                    { key: 'status', label: 'Status', render: r => <Badge value={r.status} /> }, { key: 'output_format', label: 'Format' }, { key: 'created_by', label: 'Created by' },
                    { key: 'approved_by', label: 'Activated by' },
                    { key: 'act', label: '', render: r => r.status === 'DRAFT' && <Act label="Activate" run={() => complianceApi.activateTemplate(r.id)} done={templates.reload} title="Not by its author" /> },
                ]} />
            </Section>
        </Page>
    );
}
