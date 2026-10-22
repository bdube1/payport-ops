import { complianceAdminApi } from '../../lib/api';
import { Page, Section, Table, Notice, useLoad, FormButton } from '../../components/kit';

export default function AuthoritiesAdminPage() {
    const { value, error, reload } = useLoad(() => complianceAdminApi.list());
    return (
        <Page title="Compliance authorities" subtitle="Who may approve FIU reports (REPORT_APPROVER). An administrator requests a grant for a COMPLIANCE user; another compliance officer must approve it."
              actions={<>
                  <FormButton label="Request grant" title="Request a grant" fields={[{ name: 'holder', label: 'Holder (staff:+263…)', type: 'text', required: true },
                      { name: 'authority', label: 'Authority', type: 'select', options: ['REPORT_APPROVER'], required: true }, { name: 'reason', label: 'Reason', type: 'textarea', required: true }]}
                      onSubmit={v => complianceAdminApi.request(v.holder, v.authority, v.reason)} onDone={reload} />
                  <FormButton label="Revoke" kind="danger" title="Revoke an authority" fields={[{ name: 'holder', label: 'Holder', type: 'text', required: true },
                      { name: 'authority', label: 'Authority', type: 'select', options: ['REPORT_APPROVER'], required: true }, { name: 'reason', label: 'Reason', type: 'textarea', required: true }]}
                      onSubmit={v => complianceAdminApi.revoke(v.holder, v.authority, v.reason)} onDone={reload} />
              </>}>
            {error && <Notice kind="error">{error}</Notice>}
            <Section title="Current holders"><Table rows={value} /></Section>
        </Page>
    );
}
