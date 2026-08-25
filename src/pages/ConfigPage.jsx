import { useState, useEffect } from 'react';
import { Settings, Plus, Pencil, Trash2, Save, X } from 'lucide-react';
import { getAdminProducts, createAdminProduct, updateAdminProduct, getAdminPrefixes, createAdminPrefix, updateAdminPrefix, deleteAdminPrefix, getAdminPaymentMethods, updateAdminPaymentMethod } from '../lib/api';
import toast from 'react-hot-toast';

const TABS = ['Products', 'Network Prefixes', 'Payment Methods'];

function Field({ label, value, onChange, type = 'text', hint }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        style={{ width: '100%', padding: '10px 12px', borderRadius: 8 }} />
      {hint && <p style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 4 }}>{hint}</p>}
    </div>
  );
}

export default function ConfigPage() {
  const [tab, setTab] = useState('Products');
  const [products, setProducts] = useState([]);
  const [prefixes, setPrefixes] = useState([]);
  const [payMethods, setPayMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingPrefix, setEditingPrefix] = useState(null);
  const [newProduct, setNewProduct] = useState(false);
  const [newPrefix, setNewPrefix] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [pRes, pfRes, pmRes] = await Promise.all([
        getAdminProducts(), getAdminPrefixes(), getAdminPaymentMethods()
      ]);
      setProducts(pRes.data?.data || []);
      setPrefixes(pfRes.data?.data || []);
      setPayMethods(pmRes.data?.data || []);
    } catch { toast.error('Failed to load config'); }
    finally { setLoading(false); }
  };
  useEffect(() => { loadAll(); }, []);

  // Product edit form
  function ProductForm({ product, onSave, onClose }) {
    const [f, setF] = useState({
      code: product?.code || '', name: product?.name || '',
      category: product?.category || 'AIRTIME', providerCode: product?.providerCode || '',
      minAmountCents: product?.minAmountCents || 50, maxAmountCents: product?.maxAmountCents || 20000,
      currency: product?.currency || 'USD', isActive: product?.isActive !== false,
    });
    const set = (k, v) => setF(p => ({ ...p, [k]: v }));

    const save = async () => {
      try {
        if (product?.id) { await updateAdminProduct(product.id, f); toast.success('Product updated'); }
        else { await createAdminProduct(f); toast.success('Product created'); }
        onSave();
      } catch (e) { toast.error(e.response?.data?.message || 'Failed to save'); }
    };

    return (
      <div style={{ background: 'var(--bg-card-2)', borderRadius: 14, padding: 24, border: '1px solid var(--border)', marginBottom: 16 }}>
        <h3 style={{ fontWeight: 700, marginBottom: 20 }}>{product?.id ? 'Edit Product' : 'New Product'}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
          <Field label="Product Code" value={f.code} onChange={v => set('code', v)} hint="e.g. AIRTIME_ECONET" />
          <Field label="Display Name" value={f.name} onChange={v => set('name', v)} />
          <Field label="Category" value={f.category} onChange={v => set('category', v)} hint="AIRTIME, BILLS, DATA" />
          <Field label="Provider Code" value={f.providerCode} onChange={v => set('providerCode', v)} hint="ECONET, NETONE, TELECEL" />
          <Field label="Min Amount (cents)" value={f.minAmountCents} onChange={v => set('minAmountCents', parseInt(v)||0)} type="number" hint={`$${(f.minAmountCents/100).toFixed(2)}`} />
          <Field label="Max Amount (cents)" value={f.maxAmountCents} onChange={v => set('maxAmountCents', parseInt(v)||0)} type="number" hint={`$${(f.maxAmountCents/100).toFixed(2)}`} />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 16 }}>
          <input type="checkbox" checked={f.isActive} onChange={e => set('isActive', e.target.checked)} />
          <span style={{ fontSize: 14, fontWeight: 600 }}>Active (visible to customers)</span>
        </label>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={save} className="btn btn-primary"><Save size={13} /> Save</button>
          <button onClick={onClose} className="btn btn-ghost"><X size={13} /> Cancel</button>
        </div>
      </div>
    );
  }

  // Prefix form
  function PrefixForm({ prefix, onSave, onClose }) {
    const [f, setF] = useState({ prefix: prefix?.prefix || '', networkCode: prefix?.networkCode || '', networkName: prefix?.networkName || '', countryCode: prefix?.countryCode || 'ZW' });
    const set = (k, v) => setF(p => ({ ...p, [k]: v }));
    const save = async () => {
      try {
        if (prefix?.id) { await updateAdminPrefix(prefix.id, f); toast.success('Prefix updated'); }
        else { await createAdminPrefix(f); toast.success('Prefix added'); }
        onSave();
      } catch (e) { toast.error(e.response?.data?.message || 'Failed to save'); }
    };
    return (
      <div style={{ background: 'var(--bg-card-2)', borderRadius: 14, padding: 24, border: '1px solid var(--border)', marginBottom: 16 }}>
        <h3 style={{ fontWeight: 700, marginBottom: 20 }}>{prefix?.id ? 'Edit Prefix' : 'Add Prefix'}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
          <Field label="Prefix" value={f.prefix} onChange={v => set('prefix', v)} hint="e.g. 0771" />
          <Field label="Country Code" value={f.countryCode} onChange={v => set('countryCode', v)} />
          <Field label="Network Code" value={f.networkCode} onChange={v => set('networkCode', v)} hint="ECONET, NETONE, TELECEL" />
          <Field label="Network Name" value={f.networkName} onChange={v => set('networkName', v)} hint="Display name" />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={save} className="btn btn-primary"><Save size={13} /> Save</button>
          <button onClick={onClose} className="btn btn-ghost"><X size={13} /> Cancel</button>
        </div>
      </div>
    );
  }

  if (loading) return <div style={{ padding: 60, display: 'flex', justifyContent: 'center' }}><div className="spinner" /></div>;

  return (
    <div style={{ padding: 28, maxWidth: 1100 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Settings size={22} /> System Configuration
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4 }}>
          Manage products, network prefixes, and payment methods. Changes take effect immediately.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 28, background: 'var(--bg-2)', padding: 4, borderRadius: 12, width: 'fit-content' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '9px 20px', borderRadius: 9, fontSize: 13, fontWeight: 700,
            border: 'none', cursor: 'pointer', transition: 'all 0.2s',
            background: tab === t ? 'var(--bg-card)' : 'transparent',
            color: tab === t ? 'var(--blue)' : 'var(--text-2)',
            boxShadow: tab === t ? 'var(--shadow)' : 'none',
          }}>{t}</button>
        ))}
      </div>

      {/* Products tab */}
      {tab === 'Products' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button onClick={() => setNewProduct(true)} className="btn btn-primary"><Plus size={13} /> Add Product</button>
          </div>
          {newProduct && <ProductForm onSave={() => { setNewProduct(false); loadAll(); }} onClose={() => setNewProduct(false)} />}
          {editingProduct && <ProductForm product={editingProduct} onSave={() => { setEditingProduct(null); loadAll(); }} onClose={() => setEditingProduct(null)} />}
          <div className="card" style={{ overflow: 'hidden' }}>
            <table>
              <thead>
                <tr><th>Code</th><th>Name</th><th>Category</th><th>Provider</th><th>Min</th><th>Max</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700 }}>{p.code}</td>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td><span className="badge badge-gray">{p.category}</span></td>
                    <td style={{ fontSize: 12 }}>{p.providerCode}</td>
                    <td>${(p.minAmountCents/100).toFixed(2)}</td>
                    <td>${(p.maxAmountCents/100).toFixed(2)}</td>
                    <td><span className={`badge ${p.isActive ? 'badge-green' : 'badge-gray'}`}>{p.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td>
                      <button onClick={() => { setNewProduct(false); setEditingProduct(p); }} className="btn btn-ghost" style={{ fontSize: 12, padding: '5px 10px' }}>
                        <Pencil size={12} /> Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Network Prefixes tab */}
      {tab === 'Network Prefixes' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button onClick={() => setNewPrefix(true)} className="btn btn-primary"><Plus size={13} /> Add Prefix</button>
          </div>
          {newPrefix && <PrefixForm onSave={() => { setNewPrefix(false); loadAll(); }} onClose={() => setNewPrefix(false)} />}
          {editingPrefix && <PrefixForm prefix={editingPrefix} onSave={() => { setEditingPrefix(null); loadAll(); }} onClose={() => setEditingPrefix(null)} />}
          <div className="card" style={{ overflow: 'hidden' }}>
            <table>
              <thead><tr><th>Prefix</th><th>Network Code</th><th>Network Name</th><th>Country</th><th>Actions</th></tr></thead>
              <tbody>
                {prefixes.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 14 }}>{p.prefix}</td>
                    <td><span className="badge badge-blue">{p.networkCode}</span></td>
                    <td>{p.networkName}</td>
                    <td>{p.countryCode}</td>
                    <td style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => { setNewPrefix(false); setEditingPrefix(p); }} className="btn btn-ghost" style={{ fontSize: 12, padding: '5px 10px' }}><Pencil size={12} /></button>
                      <button onClick={async () => { if (confirm(`Delete prefix ${p.prefix}?`)) { try { await deleteAdminPrefix(p.id); loadAll(); toast.success('Deleted'); } catch { toast.error('Failed'); } }}} className="btn btn-danger" style={{ fontSize: 12, padding: '5px 10px' }}><Trash2 size={12} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payment Methods tab */}
      {tab === 'Payment Methods' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table>
            <thead><tr><th>Code</th><th>Name</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {payMethods.map(pm => (
                <tr key={pm.id}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{pm.code}</td>
                  <td style={{ fontWeight: 600 }}>{pm.name}</td>
                  <td><span className={`badge ${pm.isActive ? 'badge-green' : 'badge-gray'}`}>{pm.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td>
                    <button onClick={async () => {
                      try { await updateAdminPaymentMethod(pm.id, { isActive: !pm.isActive }); loadAll(); toast.success('Updated'); }
                      catch { toast.error('Failed'); }
                    }} className={`btn ${pm.isActive ? 'btn-danger' : 'btn-success'}`} style={{ fontSize: 12 }}>
                      {pm.isActive ? 'Disable' : 'Enable'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
