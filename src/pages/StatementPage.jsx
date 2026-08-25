import { useState } from 'react';
import { Search, Download, AlertTriangle } from 'lucide-react';
import { getCustomerStatement, formatDate } from '../lib/api';

// Format amount WITHOUT currency prefix (since we have a separate currency column)
function fmt(amountCents) {
    return (amountCents / 100).toFixed(2);
}

// Digital Seal Component - Smaller, professional size
// Only updates Document ID and Date
const getDigitalSeal = (docId, date) => `
<div style="
  margin: 20px auto 16px auto;
  text-align: center;
  max-width: 200px;
">
  <img 
    src="${window.location.origin}/images/payport-digital-seal.png" 
    alt="Payport Digital Stamp"
    style="
      width: 100%;
      max-width: 160px;
      height: auto;
      display: block;
      margin: 0 auto;
      opacity: 0.95;
    "
    onerror="this.style.display='none'; this.parentElement.innerHTML = '<div style=\\\'padding: 12px; border: 1.5px solid #06A3DA; border-radius: 10px; text-align: center; background: #f8f9fa;\\\'><p style=\\\'color: #06A3DA; font-weight: bold; font-size: 11px; margin: 0;\\\'>PAYPORT DIGITAL STAMP</p><p style=\\\'font-size: 9px; color: #666; margin: 4px 0 0 0;\\\'>VERIFIED</p></div>'"
  />
  <div style="
    font-size: 9px;
    color: #8b949e;
    margin-top: 6px;
    font-family: monospace;
  ">
    ${docId}
  </div>
  <div style="
    font-size: 8px;
    color: #a0a8b2;
    margin-top: 2px;
  ">
    ${date}
  </div>
</div>
`;

export default function StatementPage() {
    const [phone, setPhone] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [data, setData] = useState(null);

    const normalizePhone = (p) => {
        p = p.replace(/\s+/g, '');
        if (p.startsWith('0')) return '+263' + p.slice(1);
        if (p.startsWith('263')) return '+' + p;
        return p;
    };

    const search = async () => {
        if (!phone) { setError('Enter a phone number'); return; }
        setLoading(true); setError(''); setData(null);
        try {
            const r = await getCustomerStatement({ phone: normalizePhone(phone), dateFrom, dateTo });
            setData(r.data?.data || {});
        } catch (e) {
            setError(e.response?.data?.message || 'Failed to load statement');
        } finally { setLoading(false); }
    };

    const exportCSV = () => {
        if (!data?.transactions?.length) return;
        const headers = ['Reference', 'Status', 'Recipient', 'Product', 'Amount', 'Currency', 'Payment Method', 'Provider Ref', 'Date'];
        const rows = data.transactions.map(t => [
            t.reference, t.status, t.recipientIdentifier || '',
            t.productTypeCode || '', fmt(t.amountCents || 0),
            t.currency || 'USD', t.paymentMethodCode || '', t.providerReference || '', formatDate(t.createdAt),
        ]);
        const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
        a.download = `payport-statement-${data.phone}-${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
    };

    const exportPDF = () => {
        if (!data) return;
        const w = window.open('', '_blank');
        const docId = `PAYPORT-${Date.now()}`;
        const generationDate = new Date().toLocaleString();

        // Group totals by currency
        const totalsByCurrency = {};
        (data.transactions || []).forEach(t => {
            const currency = t.currency || 'USD';
            if (!totalsByCurrency[currency]) totalsByCurrency[currency] = 0;
            if (t.status === 'COMPLETED') {
                totalsByCurrency[currency] += (t.amountCents || 0);
            }
        });

        // Get the seal image as URL
        const sealImageUrl = `${window.location.origin}/images/payport-digital-seal.png`;

        w.document.write(`
      <!DOCTYPE html>
      <html><head><title>Payport Customer Statement - ${data.phone}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: 'Segoe UI', Arial, sans-serif; 
          font-size: 12px; 
          margin: 0; 
          padding: 24px; 
          color: #091E3E; 
          background: white;
        }
        .statement-container {
          max-width: 1100px;
          margin: 0 auto;
        }
        .header { 
          display: flex; 
          justify-content: space-between; 
          align-items: flex-start; 
          border-bottom: 3px solid #06A3DA; 
          padding-bottom: 16px; 
          margin-bottom: 20px; 
        }
        .company h1 { color: #091E3E; font-size: 20px; margin: 0 0 4px; }
        .company p { color: #5a7a91; font-size: 10px; margin: 0; }
        .statement-info { text-align: right; }
        .statement-info h2 { color: #06A3DA; font-size: 14px; margin: 0 0 6px; }
        .statement-info p { color: #5a7a91; font-size: 10px; margin: 2px 0; }
        .summary { 
          display: grid; 
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); 
          gap: 12px; 
          margin-bottom: 20px; 
        }
        .summary-card { 
          background: #EEF9FF; 
          border-radius: 8px; 
          padding: 12px; 
          text-align: center; 
          border: 1px solid rgba(6,163,218,0.15); 
        }
        .summary-card .value { font-size: 18px; font-weight: 800; color: #06A3DA; }
        .summary-card .label { font-size: 10px; color: #5a7a91; margin-top: 4px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #06A3DA; color: white; padding: 8px 10px; text-align: left; font-size: 10px; font-weight: 600; }
        td { padding: 7px 10px; border-bottom: 1px solid #eee; font-size: 11px; }
        tr:nth-child(even) td { background: #f9fbfd; }
        .status-completed { color: #34AD54; font-weight: 700; }
        .status-failed { color: #e53e3e; }
        .footer { 
          margin-top: 20px; 
          text-align: center; 
          font-size: 9px; 
          color: #8b949e; 
          border-top: 1px solid #eee; 
          padding-top: 10px; 
        }
        .seal-container {
          margin: 16px auto 12px auto;
          text-align: center;
          max-width: 180px;
        }
        .seal-container img {
          width: 100%;
          max-width: 140px;
          height: auto;
          display: block;
          margin: 0 auto;
        }
        .seal-document-id {
          font-size: 8px;
          color: #8b949e;
          margin-top: 5px;
          font-family: monospace;
          letter-spacing: 0.5px;
        }
        .seal-date {
          font-size: 7px;
          color: #a0a8b2;
          margin-top: 2px;
        }
        @media print {
          body { padding: 0; }
          .no-print { display: none; }
        }
      </style>
      </head>
      <body>
      <div class="statement-container">
        <div class="header">
          <div class="company">
            <h1>Payport Financial Services</h1>
            <p>232 Herbert Chitepo Avenue, Harare, Zimbabwe</p>
            <p>support@payport.africa · +263 719 183 557 · www.payport.africa</p>
          </div>
          <div class="statement-info">
            <h2>Customer Statement</h2>
            <p><strong>Account:</strong> ${data.phone}</p>
            <p><strong>Generated:</strong> ${generationDate}</p>
            ${dateFrom || dateTo ? `<p><strong>Period:</strong> ${dateFrom || 'All time'} — ${dateTo || 'Present'}</p>` : '<p><strong>Period:</strong> All transactions</p>'}
          </div>
        </div>

        <div class="summary">
          <div class="summary-card">
            <div class="value">${data.totalTransactions || 0}</div>
            <div class="label">Total Transactions</div>
          </div>
          <div class="summary-card">
            <div class="value">${data.completedTransactions || 0}</div>
            <div class="label">Successful</div>
          </div>
          ${Object.entries(totalsByCurrency).map(([currency, cents]) => `
          <div class="summary-card">
            <div class="value">${currency === 'USD' ? '$' : 'ZWG '}${(cents / 100).toFixed(2)}</div>
            <div class="label">Total Spent (${currency})</div>
          </div>
          `).join('')}
        </div>

        <table>
          <thead>
            <tr>
              <th>Date</th><th>Reference</th><th>Product</th><th>Recipient</th><th>Amount</th><th>Currency</th><th>Payment Method</th><th>Provider Ref</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${(data.transactions || []).map(t => `
            <tr>
              <td>${formatDate(t.createdAt)}</td>
              <td style="font-family:monospace;font-size:10px">${t.reference}</td>
              <td>${t.productName || t.productTypeCode || '—'}</td>
              <td>${t.recipientIdentifier || '—'}</td>
              <td style="font-weight:700">${fmt(t.amountCents || 0)}</td>
              <td>${t.currency || 'USD'}</td>
              <td>${t.paymentMethodCode || '—'}</td>
              <td style="font-family:monospace;font-size:10px">${t.providerReference || '—'}</td>
              <td class="${t.status === 'COMPLETED' ? 'status-completed' : t.status?.includes('FAIL') ? 'status-failed' : ''}">${t.status}</td>
            </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="seal-container">
          <img 
            src="${sealImageUrl}" 
            alt="Payport Digital Stamp"
            onerror="this.style.display='none'; this.parentElement.innerHTML = '<div style=\\\'padding: 8px; border: 1px solid #06A3DA; border-radius: 8px; text-align: center; background: #f8f9fa;\\\'><p style=\\\'color: #06A3DA; font-weight: bold; font-size: 10px; margin: 0;\\\'>PAYPORT DIGITAL STAMP</p><p style=\\\'font-size: 8px; color: #666; margin: 3px 0 0 0;\\\'>VERIFIED</p></div>'"
          />
          <div class="seal-document-id">
            ${docId}
          </div>
          <div class="seal-date">
            ${generationDate}
          </div>
        </div>

        <div class="footer">
          © ${new Date().getFullYear()} Payport Financial Services · CONFIDENTIAL · This statement is for the exclusive use of the named account holder.
        </div>
      </div>
      <button onclick="window.print()" class="no-print" style="margin-top:16px;padding:10px 20px;background:#06A3DA;color:white;border:none;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600">Print / Save as PDF</button>
      </body></html>
    `);
        w.document.close();
    };

    return (
        <div style={{ padding: 28, maxWidth: 1200 }}>
            <div style={{ marginBottom: 28 }}>
                <h1 style={{ fontSize: 22, fontWeight: 800 }}>Customer Statements</h1>
                <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4 }}>Generate a full transaction history for any customer</p>
            </div>

            {/* Search */}
            <div className="card" style={{ padding: '24px', marginBottom: 28 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 20 }}>
                    <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Customer Phone Number</label>
                        <input value={phone} onChange={e => setPhone(e.target.value)}
                               placeholder="07X XXX XXXX or +263..."
                               style={{ width: '100%', padding: '12px 16px', fontSize: 15 }} />
                    </div>
                    <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 8 }}>Date From (optional)</label>
                        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ width: '100%' }} />
                    </div>
                    <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 8 }}>Date To (optional)</label>
                        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ width: '100%' }} />
                    </div>
                </div>
                <button onClick={search} disabled={loading} className="btn btn-primary">
                    <Search size={14} /> {loading ? 'Searching...' : 'Generate Statement'}
                </button>
            </div>

            {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, color: 'var(--red)', fontSize: 13 }}>
                    <AlertTriangle size={16} style={{ flexShrink: 0 }} /> {error}
                </div>
            )}

            {data && (
                <>
                    {/* Summary by Currency */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 24 }}>
                        {[
                            ['Total Transactions', data.totalTransactions, 'var(--blue)'],
                            ['Successful', data.completedTransactions, 'var(--green)'],
                        ].map(([label, val, color]) => (
                            <div key={label} className="card" style={{ padding: '20px', textAlign: 'center' }}>
                                <div style={{ fontSize: 28, fontWeight: 900, color }}>{val}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 4 }}>{label}</div>
                            </div>
                        ))}
                        {/* Total Spent by Currency */}
                        {Object.entries(data.totalsByCurrency || {}).map(([currency, cents]) => (
                            <div key={currency} className="card" style={{ padding: '20px', textAlign: 'center' }}>
                                <div style={{ fontSize: 28, fontWeight: 900, color: currency === 'USD' ? 'var(--blue)' : 'var(--amber)' }}>
                                    {currency === 'USD' ? '$' : 'ZWG '}{(cents / 100).toFixed(2)}
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 4 }}>Total Spent ({currency})</div>
                            </div>
                        ))}
                    </div>

                    {/* Export buttons */}
                    <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                        <button onClick={exportCSV} className="btn btn-ghost"><Download size={14} /> Export CSV</button>
                        <button onClick={exportPDF} className="btn btn-primary"><Download size={14} /> Download PDF Statement</button>
                    </div>

                    {/* Table */}
                    <div className="card" style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                            <tr>
                                <th>Date</th><th>Reference</th><th>Product</th><th>Recipient</th><th>Amount</th><th>Currency</th><th>Payment Method</th><th>Provider Ref</th><th>Status</th>
                            </tr>
                            </thead>
                            <tbody>
                            {(data.transactions || []).map(t => (
                                <tr key={t.reference}>
                                    <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{formatDate(t.createdAt)}</td>
                                    <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{t.reference}</td>
                                    <td style={{ fontSize: 12 }}>{t.productName || t.productTypeCode || '—'}</td>
                                    <td style={{ fontSize: 12 }}>{t.recipientIdentifier || '—'}</td>
                                    <td style={{ fontWeight: 700 }}>{fmt(t.amountCents || 0)}</td>
                                    <td style={{ fontSize: 12 }}>{t.currency || 'USD'}</td>
                                    <td style={{ fontSize: 12 }}>{t.paymentMethodCode || '—'}</td>
                                    <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{t.providerReference || '—'}</td>
                                    <td><span className={`badge ${t.status === 'COMPLETED' ? 'badge-green' : t.status?.includes('FAIL') ? 'badge-red' : 'badge-amber'}`}>{t.status}</span></td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}