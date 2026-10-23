import React, { useState, useEffect, useCallback } from 'react'
import { useMarkets, currencyOptions } from '../components/kit'
import {
    Package, CreditCard, RefreshCw, Loader, DollarSign,
    ToggleLeft, ToggleRight, ChevronDown, ChevronRight, Edit2, Check, X, Image, Upload, Lightbulb, AlertTriangle
} from 'lucide-react'
import {
    getAdminProducts, updateAdminProduct,
    getAdminPaymentMethods, updateAdminPaymentMethod
} from '../lib/api'

const KNOWN_CURRENCY_META = {
    USD: { label: 'USD $',   color: 'var(--green)', bg: 'var(--badge-green)', symbol: '$'    },
    ZWG: { label: 'ZWG ZiG', color: 'var(--purple)', bg: 'var(--badge-purple)', symbol: 'ZiG'  },
}
const CURRENCY_META = new Proxy(KNOWN_CURRENCY_META, {
    get: (t, k) => t[k] || { label: String(k), color: 'var(--blue)', bg: 'var(--badge-blue)', symbol: String(k) },
})

// ── API helpers ──────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL || 'https://api.payport.africa'
const authHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('ops_token') || ''}`,
    'X-Request-ID': `ops-${Date.now()}`,
})

async function apiPut(path, body) {
    const res = await fetch(`${API_BASE}/api/v1${path}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
}

async function apiGet(path) {
    const res = await fetch(`${API_BASE}/api/v1${path}`, { headers: authHeaders() })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
}

async function apiPostFormData(path, formData) {
    const res = await fetch(`${API_BASE}/api/v1${path}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('ops_token') || ''}`,
        },
        body: formData,
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
}

// ── Sub-components ───────────────────────────────────────────────────────────

function CurrencyBadge({ currency, isActive, onClick, saving }) {
    const meta = CURRENCY_META[currency] || { label: currency, color: 'var(--text-2)', bg: 'var(--bg-2)' }
    return (
        <button
            onClick={onClick}
            disabled={saving}
            title={isActive ? `Disable ${currency}` : `Enable ${currency}`}
            style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 12px', borderRadius: 8, border: 'none', cursor: saving ? 'wait' : 'pointer',
                background: isActive ? meta.bg : 'var(--bg-2)',
                color: isActive ? meta.color : 'var(--text-2)',
                fontWeight: 700, fontSize: 12, transition: 'all 0.18s',
                opacity: saving ? 0.6 : 1,
                outline: isActive ? `2px solid ${meta.bg}` : '2px solid transparent',
            }}
        >
            {saving
                ? <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} />
                : isActive
                    ? <ToggleRight size={14} />
                    : <ToggleLeft  size={14} />
            }
            {meta.label}
        </button>
    )
}

function ProductRow({ product, onRefresh }) {
    const marketCurrencies = currencyOptions(useMarkets()).map(o => o.value)
    const CCYS = marketCurrencies.length ? marketCurrencies : ['USD', 'ZWG']
    const [expanded, setExpanded] = useState(false)
    const [saving,   setSaving]   = useState({})   // {USD: bool, ZWG: bool, active: bool, logo: bool}
    const [editing,  setEditing]  = useState(false)
    const [editName, setEditName] = useState(product.name)
    const [uploading, setUploading] = useState(false)

    const currencies = product.currencies || []

    const toggleCurrency = async (currency, currentActive) => {
        if (!window.confirm(`Are you sure you want to switch ${currentActive ? 'off' : 'on'} ${currency} for ${product.name}?`)) return
        setSaving(s => ({ ...s, [currency]: true }))
        try {
            await apiPut(`/admin/config/products/${product.id}/currencies/${currency}`, {
                isActive: !currentActive,
            })
            await onRefresh()
        } catch (e) {
            alert(`Failed to update ${currency}: ${e.message}`)
        } finally {
            setSaving(s => ({ ...s, [currency]: false }))
        }
    }

    const toggleProduct = async () => {
        if (!window.confirm(`Are you sure you want to switch ${product.isActive ? 'off' : 'on'} ${product.name}?`)) return
        setSaving(s => ({ ...s, active: true }))
        try {
            await apiPut(`/admin/config/products/${product.id}`, { isActive: !product.isActive })
            await onRefresh()
        } catch (e) {
            alert(`Failed to update product: ${e.message}`)
        } finally {
            setSaving(s => ({ ...s, active: false }))
        }
    }

    const saveName = async () => {
        if (!editName.trim() || editName === product.name) { setEditing(false); return }
        try {
            await apiPut(`/admin/config/products/${product.id}`, { name: editName.trim() })
            await onRefresh()
            setEditing(false)
        } catch (e) {
            alert(`Failed to save name: ${e.message}`)
        }
    }

    const uploadLogo = async (file) => {
        if (!file) return

        setUploading(true)
        const formData = new FormData()
        formData.append('file', file)

        try {
            // Upload to server
            const res = await apiPostFormData('/admin/upload-logo', formData)
            const logoUrl = res.data?.logoUrl || res.logoUrl

            if (!logoUrl) {
                throw new Error('No logo URL returned from server')
            }

            // Update product with logo URL
            await apiPut(`/admin/config/products/${product.id}`, { logoUrl })
            await onRefresh()

        } catch (e) {
            alert(`Failed to upload logo: ${e.message}`)
        } finally {
            setUploading(false)
        }
    }

    const CATEGORY_COLOR = {
        AIRTIME: { bg: '#eff6ff', color: '#1d4ed8' },
        DATA:    { bg: 'var(--badge-green)', color: '#15803d' },
        BILLS:   { bg: '#fff7ed', color: '#c2410c' },
    }[product.category] || { bg: 'var(--bg-2)', color: 'var(--text-2)' }

    return (
        <div style={{
            border: '1.5px solid var(--border)', borderRadius: 12, overflow: 'hidden',
            marginBottom: 8, background: 'var(--bg-card)',
        }}>
            {/* Main row */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px', cursor: 'pointer',
                background: expanded ? 'var(--bg-2)' : 'var(--bg-card)',
            }}>
                {/* Expand toggle */}
                <div onClick={() => setExpanded(e => !e)} style={{ color: 'var(--text-2)', flexShrink: 0 }}>
                    {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </div>

                {/* Logo */}
                {product.logoUrl && (
                    <img
                        src={product.logoUrl}
                        alt={product.name}
                        style={{ width: 24, height: 24, borderRadius: 4, objectFit: 'contain' }}
                        onError={(e) => e.target.style.display = 'none'}
                    />
                )}

                {/* Code */}
                <span style={{
                    fontFamily: 'monospace', fontSize: 11, color: 'var(--blue)',
                    background: 'var(--badge-blue)', padding: '3px 8px', borderRadius: 6, flexShrink: 0, minWidth: 140,
                }}>{product.code}</span>

                {/* Name */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    {editing ? (
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <input
                                value={editName}
                                onChange={e => setEditName(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditing(false) }}
                                autoFocus
                                style={{ flex: 1, padding: '4px 8px', border: '1.5px solid var(--blue)', borderRadius: 6, fontSize: 13 }}
                            />
                            <button onClick={saveName} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--green)' }}><Check size={14} /></button>
                            <button onClick={() => setEditing(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)' }}><X size={14} /></button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{product.name}</span>
                            <button onClick={() => setEditing(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', padding: 2 }}>
                                <Edit2 size={11} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Category badge */}
                <span style={{
                    padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                    background: CATEGORY_COLOR.bg, color: CATEGORY_COLOR.color, flexShrink: 0,
                }}>{product.category}</span>

                {/* Currency quick-badges */}
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    {CCYS.map(ccy => {
                        const existing = currencies.find(c => c.currency === ccy)
                        const isActive = existing?.isActive === true
                        return (
                            <CurrencyBadge
                                key={ccy}
                                currency={ccy}
                                isActive={isActive}
                                saving={saving[ccy]}
                                onClick={e => { e.stopPropagation(); toggleCurrency(ccy, isActive) }}
                            />
                        )
                    })}
                </div>

                {/* Product active toggle */}
                <button
                    onClick={e => { e.stopPropagation(); toggleProduct() }}
                    disabled={saving.active}
                    style={{
                        padding: '5px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                        background: product.isActive ? 'var(--badge-green)' : 'var(--badge-red)',
                        color: product.isActive ? 'var(--green)' : 'var(--red)',
                        fontWeight: 700, fontSize: 12, flexShrink: 0,
                    }}
                >
                    {saving.active ? <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} /> : product.isActive ? 'Active' : 'Inactive'}
                </button>
            </div>

            {/* Expanded detail */}
            {expanded && (
                <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--bg-2)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                        {CCYS.map(ccy => {
                            const meta = CURRENCY_META[ccy]
                            const existing = currencies.find(c => c.currency === ccy)
                            const isActive = existing?.isActive === true
                            return (
                                <div key={ccy} style={{
                                    border: `1.5px solid ${isActive ? meta.bg : 'var(--border)'}`,
                                    borderRadius: 10, padding: '12px 14px',
                                    background: isActive ? meta.bg : 'var(--bg-2)',
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontWeight: 700, color: isActive ? meta.color : 'var(--text-2)' }}>
                      {meta.label}
                    </span>
                                        <span style={{
                                            fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                                            background: isActive ? meta.color : '#64748B', color: 'white',
                                        }}>{isActive ? 'ENABLED' : 'DISABLED'}</span>
                                    </div>
                                    {existing && (
                                        <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
                                            <div>Min: {existing.minAmountCents != null
                                                ? `${meta.symbol}${(existing.minAmountCents/100).toFixed(2)}`
                                                : `${meta.symbol}${(product.minAmountCents/100).toFixed(2)} (inherited)`}
                                            </div>
                                            <div>Max: {existing.maxAmountCents != null
                                                ? `${meta.symbol}${(existing.maxAmountCents/100).toFixed(2)}`
                                                : `${meta.symbol}${(product.maxAmountCents/100).toFixed(2)} (inherited)`}
                                            </div>
                                            {existing.updatedBy && (
                                                <div style={{ marginTop: 4, color: 'var(--text-2)' }}>
                                                    Last by: {existing.updatedBy}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <button
                                        onClick={() => toggleCurrency(ccy, isActive)}
                                        disabled={saving[ccy]}
                                        style={{
                                            marginTop: 10, width: '100%', padding: '7px',
                                            border: `1.5px solid ${isActive ? meta.color : 'var(--border)'}`,
                                            borderRadius: 7, cursor: 'pointer',
                                            background: isActive ? meta.color : 'var(--bg-card)',
                                            color: isActive ? 'white' : 'var(--text-2)',
                                            fontWeight: 600, fontSize: 12,
                                        }}
                                    >
                                        {saving[ccy]
                                            ? 'Saving...'
                                            : isActive
                                                ? `Disable ${ccy}`
                                                : `Enable ${ccy}`}
                                    </button>
                                </div>
                            )
                        })}
                    </div>

                    {/* Logo management section with file upload */}
                    <div style={{ marginTop: 16, padding: '12px', background: 'var(--bg-2)', borderRadius: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                            <Image size={16} color="var(--text-2)" />
                            <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>Product Logo</span>
                        </div>

                        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                            {/* Logo preview */}
                            {product.logoUrl && (
                                <div style={{ textAlign: 'center' }}>
                                    <img
                                        src={product.logoUrl}
                                        alt={product.name}
                                        style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'contain', border: '1px solid var(--border)' }}
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                            e.target.parentNode.innerHTML += '<p style="color:var(--text-2);font-size:11px;">Failed to load</p>';
                                        }}
                                    />
                                </div>
                            )}

                            {/* Upload area */}
                            <div style={{ flex: 1 }}>
                                <label
                                    htmlFor={`logo-upload-${product.id}`}
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: '20px',
                                        border: '2px dashed var(--border)',
                                        borderRadius: 8,
                                        background: 'var(--bg-card)',
                                        cursor: uploading ? 'wait' : 'pointer',
                                        transition: 'all 0.2s',
                                    }}
                                    onMouseEnter={(e) => { if (!uploading) e.currentTarget.style.borderColor = 'var(--blue)' }}
                                    onMouseLeave={(e) => { if (!uploading) e.currentTarget.style.borderColor = 'var(--border)' }}
                                >
                                    {uploading ? (
                                        <>
                                            <Loader size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--blue)', marginBottom: 8 }} />
                                            <span style={{ color: 'var(--text-2)', fontSize: 13 }}>Uploading...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Upload size={24} color="var(--text-2)" style={{ marginBottom: 8 }} />
                                            <span style={{ color: 'var(--text)', fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
                        Click to upload logo
                      </span>
                                            <span style={{ color: 'var(--text-2)', fontSize: 11 }}>
                        PNG, JPG, SVG up to 2MB
                      </span>
                                        </>
                                    )}
                                </label>
                                <input
                                    id={`logo-upload-${product.id}`}
                                    type="file"
                                    accept="image/png,image/jpeg,image/svg+xml"
                                    onChange={(e) => {
                                        if (e.target.files[0]) {
                                            uploadLogo(e.target.files[0])
                                        }
                                    }}
                                    disabled={uploading}
                                    style={{ display: 'none' }}
                                />
                            </div>
                        </div>

                        {/* Instructions */}
                        <p style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 11, color: 'var(--text-2)', marginTop: 12, padding: '8px', background: 'var(--bg-card)', borderRadius: 6 }}>
                            <Lightbulb size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                            <span><strong>Tip:</strong> Upload a square logo (200x200px recommended).
                            The image will be stored on the server and served from: <code>/uploads/logos/</code></span>
                        </p>
                    </div>

                    <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-2)', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Provider: <strong>{product.providerCode}</strong> &nbsp;·&nbsp; Product ID: <strong>{product.id}</strong></span>
                        {product.logoUrl && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--green)' }}>
                <Check size={12} /> Logo: {product.logoUrl.split('/').pop()}
              </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ProductsPage() {
    const [products,  setProducts]  = useState([])
    const [methods,   setMethods]   = useState([])
    const [loading,   setLoading]   = useState(true)
    const [filter,    setFilter]    = useState('ALL')
    const [savingPM,  setSavingPM]  = useState({})

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const [prodRes, methodsRes] = await Promise.all([
                apiGet('/admin/config/products'),
                apiGet('/admin/config/payment-methods'),
            ])
            const pd = prodRes.data || []
            const md = methodsRes.data || []
            setProducts(Array.isArray(pd) ? pd : [])
            setMethods(Array.isArray(md) ? md : [])
        } catch (err) {
            console.error('Failed to load data:', err)
            alert(`Error loading data: ${err.message}`)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { load() }, [load])

    const togglePaymentMethod = async (pm) => {
        if (!window.confirm(`Are you sure you want to switch ${pm.isActive ? 'off' : 'on'} ${pm.name}?`)) return
        setSavingPM(s => ({ ...s, [pm.id]: true }))
        try {
            await apiPut(`/admin/config/payment-methods/${pm.id}`, { isActive: !pm.isActive })
            await load()
        } catch (e) {
            alert(`Failed: ${e.message}`)
        } finally {
            setSavingPM(s => ({ ...s, [pm.id]: false }))
        }
    }

    const categories = ['ALL', 'AIRTIME', 'DATA', 'BILLS']
    const filtered = filter === 'ALL' ? products : products.filter(p => p.category === filter)

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
            <Loader size={32} color="var(--blue, var(--blue))" style={{ animation: 'spin 1.2s linear infinite' }} />
        </div>
    )

    return (
        <div style={{ padding: 28, maxWidth: 1100 }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontWeight: 800, fontSize: 24, color: 'var(--text)', margin: 0 }}>Products & Currencies</h1>
                    <p style={{ color: 'var(--text-2)', fontSize: 13, margin: '4px 0 0' }}>
                        Toggle currencies per product — changes take effect immediately on the consumer portal.
                    </p>
                </div>
                <button onClick={load}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', border: '1.5px solid var(--border)', borderRadius: 8, background: 'var(--bg-card)', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                    <RefreshCw size={14} /> Refresh
                </button>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
                {Object.entries(CURRENCY_META).map(([ccy, meta]) => (
                    <div key={ccy} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-2)' }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: meta.color }} />
                        {meta.label} — click badge to toggle
                    </div>
                ))}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-2)', marginLeft: 'auto' }}>
                    <AlertTriangle size={13} /> Disabling a currency hides it from the consumer portal immediately
                </div>
            </div>

            {/* Products section */}
            <div style={{ background: 'var(--bg-card)', borderRadius: 16, border: '1.5px solid var(--border)', padding: '20px 20px 12px', marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Package size={18} color="var(--blue)" />
                        <h2 style={{ fontWeight: 700, fontSize: 16, margin: 0, color: 'var(--text)' }}>
                            Product Catalogue ({filtered.length})
                        </h2>
                    </div>
                    {/* Category filter */}
                    <div style={{ display: 'flex', gap: 6 }}>
                        {categories.map(cat => (
                            <button key={cat} onClick={() => setFilter(cat)} style={{
                                padding: '5px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
                                background: filter === cat ? 'var(--blue)' : 'var(--bg-2)',
                                color: filter === cat ? 'white' : 'var(--text-2)',
                                fontWeight: 600, fontSize: 12,
                            }}>{cat}</button>
                        ))}
                    </div>
                </div>

                {filtered.length === 0
                    ? <p style={{ color: 'var(--text-2)', fontSize: 13, textAlign: 'center', padding: 20 }}>
                        No products found.
                    </p>
                    : filtered.map(p => (
                        <ProductRow key={p.id} product={p} onRefresh={load} />
                    ))
                }
            </div>

            {/* Payment Methods section */}
            <div style={{ background: 'var(--bg-card)', borderRadius: 16, border: '1.5px solid var(--border)', padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <CreditCard size={18} color="var(--blue)" />
                    <h2 style={{ fontWeight: 700, fontSize: 16, margin: 0, color: 'var(--text)' }}>
                        Payment Methods ({methods.length})
                    </h2>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                    {methods.map(m => (
                        <div key={m.id} style={{
                            background: 'var(--bg-2)', borderRadius: 12, padding: '14px 16px',
                            border: `1.5px solid ${m.isActive ? 'var(--green)' : 'var(--border)'}`,
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                <p style={{ fontWeight: 700, fontSize: 14, margin: 0, color: 'var(--text)' }}>{m.name}</p>
                                <span style={{
                                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                                    background: m.isActive ? 'var(--badge-green)' : 'var(--badge-red)',
                                    color: m.isActive ? 'var(--green)' : 'var(--red)',
                                }}>{m.isActive ? 'Active' : 'Inactive'}</span>
                            </div>
                            <p style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-2)', margin: '0 0 10px' }}>{m.code}</p>
                            <button
                                onClick={() => togglePaymentMethod(m)}
                                disabled={savingPM[m.id]}
                                style={{
                                    width: '100%', padding: '7px', border: 'none', borderRadius: 7, cursor: 'pointer',
                                    background: m.isActive ? 'var(--badge-red)' : 'var(--badge-green)',
                                    color: m.isActive ? 'var(--red)' : 'var(--green)',
                                    fontWeight: 600, fontSize: 12,
                                }}
                            >
                                {savingPM[m.id] ? 'Saving...' : m.isActive ? 'Disable' : 'Enable'}
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Global styles for animations */}
            <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    )
}