import { useState } from 'react';
import { complianceApi } from '../../lib/api';
import { Page, Section, Table, Notice, useLoad, Act } from '../../components/kit';

export default function AuditPage() {
    const verify = useLoad(() => complianceApi.auditVerify());
    const authorities = useLoad(() => complianceApi.authorities());
    const [subject, setSubject] = useState('');
    const [trailFor, setTrailFor] = useState('');
    const trail = useLoad(() => (trailFor ? complianceApi.audit(trailFor) : Promise.resolve({ data: [] })), [trailFor]);
    const v = verify.value;
    return (
        <Page title="Compliance audit" subtitle="Every compliance action is written to a hash-chained log; any change to past entries breaks the chain.">
            <Section title="Integrity" right={<Act label="Verify again" kind="ghost" run={() => complianceApi.auditVerify()} done={verify.reload} />}>
                {verify.error && <Notice kind="error">{verify.error}</Notice>}
                {v && (v.intact && v.headMatches
                    ? <Notice kind="ok">Chain intact: {v.entriesChecked} entries checked.</Notice>
                    : <Notice kind="error">Chain broken at entry {String(v.brokenAtId)} (head matches: {String(v.headMatches)}). Escalate immediately.</Notice>)}
            </Section>
            <Section title="Trail for a subject" right={<>
                <input placeholder="report:12, case:5, risk_rule:CODE…" value={subject} onChange={e => setSubject(e.target.value)} style={{ width: 240 }} />
                <button className="btn btn-ghost" onClick={() => setTrailFor(subject.trim())}>Show</button>
            </>}>
                <Table rows={trail.value} empty={trailFor ? 'No entries.' : 'Enter a subject.'} columns={[
                    { key: 'id', label: 'ID' }, { key: 'at', label: 'At' }, { key: 'actor', label: 'Actor' }, { key: 'action', label: 'Action' }, { key: 'details', label: 'Details' },
                ]} />
            </Section>
            <Section title="Designated authorities">
                <Table rows={authorities.value} />
            </Section>
        </Page>
    );
}
