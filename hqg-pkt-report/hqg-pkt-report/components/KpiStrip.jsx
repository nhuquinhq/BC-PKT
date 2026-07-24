'use client';

import { fmtKpi, toneOf } from '@/lib/format';

export default function KpiStrip({ kpis, values = {} }) {
  return (
    <div className="kpi-grid">
      {kpis.map((k) => {
        const raw = values[k.key];
        const text = fmtKpi(raw, k.type);
        const tone = text ? toneOf(k, raw) : '';
        return (
          <div key={k.key} className={`kpi${tone ? ` is-${tone}` : ''}`}>
            <span className="code">{k.code}</span>
            <div className="lb">{k.label}</div>
            <div className={`val${text ? '' : ' empty'}`}>{text || '—'}</div>
            {k.note ? <div className="foot">{k.note}</div> : null}
          </div>
        );
      })}
    </div>
  );
}
