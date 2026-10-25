import { useMemo, useState } from 'react';

/** Tiny trend line for a KPI card. */
export function Sparkline({ values, color = 'var(--blue)', width = 92, height = 34 }) {
    const pts = (values && values.length > 1 ? values : [0, 0]).map(Number);
    const max = Math.max(...pts, 1), min = Math.min(...pts, 0);
    const step = width / (pts.length - 1);
    const y = (v) => height - 3 - ((v - min) / (max - min || 1)) * (height - 6);
    const d = pts.map((v, i) => `${i ? 'L' : 'M'}${(i * step).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    const id = useMemo(() => 'sg' + Math.random().toString(36).slice(2, 8), []);
    return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', overflow: 'visible' }} aria-hidden="true">
            <defs>
                <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.25" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            <path d={`${d} L${width},${height} L0,${height} Z`} fill={`url(#${id})`} />
            <path d={d} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
    );
}

/**
 * Line chart over labelled buckets. series: [{ name, color, values }]. Hover shows the values for a bucket.
 */
export function LineChart({ labels, series, height = 260, format = (v) => v }) {
    const [hover, setHover] = useState(null);
    const W = 760, H = height, L = 44, R = 12, T = 12, B = 28;
    const all = series.flatMap(s => s.values);
    const rawMax = Math.max(...all, 1);
    const mag = Math.pow(10, Math.floor(Math.log10(rawMax)));
    const max = Math.ceil(rawMax / mag) * mag;
    const n = Math.max(labels.length - 1, 1);
    const x = (i) => L + (i / n) * (W - L - R);
    const y = (v) => T + (1 - v / max) * (H - T - B);
    const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(max * f));
    const every = Math.max(1, Math.ceil(labels.length / 8));
    return (
        <div style={{ position: 'relative' }}>
            <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display: 'block' }}
                onMouseLeave={() => setHover(null)}
                onMouseMove={(e) => {
                    const r = e.currentTarget.getBoundingClientRect();
                    const px = ((e.clientX - r.left) / r.width) * W;
                    const i = Math.round(((px - L) / (W - L - R)) * n);
                    setHover(i >= 0 && i < labels.length ? i : null);
                }}>
                {ticks.map(t => (
                    <g key={t}>
                        <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeDasharray={t ? '3 4' : ''} />
                        <text x={L - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--text-2)">{format(t)}</text>
                    </g>
                ))}
                {labels.map((l, i) => i % every === 0 && (
                    <text key={l + i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--text-2)">{l}</text>
                ))}
                {series.map(s => {
                    const d = s.values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
                    return (
                        <g key={s.name}>
                            <path d={`${d} L${x(s.values.length - 1)},${y(0)} L${x(0)},${y(0)} Z`} fill={s.color} opacity="0.07" />
                            <path d={d} fill="none" stroke={s.color} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                        </g>
                    );
                })}
                {hover !== null && (
                    <g>
                        <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} stroke="var(--text-2)" strokeDasharray="3 3" opacity="0.6" />
                        {series.map(s => <circle key={s.name} cx={x(hover)} cy={y(s.values[hover] || 0)} r="4" fill="var(--bg-card)" stroke={s.color} strokeWidth="2" />)}
                    </g>
                )}
            </svg>
            {hover !== null && (
                <div style={{ position: 'absolute', top: 8, left: `clamp(8px, calc(${(x(hover) / W) * 100}% + 12px), calc(100% - 170px))`, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 12px', boxShadow: 'var(--shadow-lg)', fontSize: 12, pointerEvents: 'none', minWidth: 150 }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{labels[hover]}</div>
                    {series.map(s => (
                        <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'space-between' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-2)' }}><span className="dot" style={{ background: s.color }} />{s.name}</span>
                            <b>{format(s.values[hover] || 0)}</b>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export function Legend({ series }) {
    return (
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            {series.map(s => (
                <span key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-2)' }}>
                    <span className="dot" style={{ background: s.color }} />{s.name}
                </span>
            ))}
        </div>
    );
}
