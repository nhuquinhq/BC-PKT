/* Định dạng số theo chuẩn trình bày của PKT */

export function toNumber(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return isNaN(v) ? null : v;
  const s = String(v).trim().replace(/\s/g, '').replace(/%$/, '');
  // Hỗ trợ cả 1.234.567,89 (VN) và 1,234,567.89 (EN)
  const vn = /^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s);
  const cleaned = vn ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

export function fmtMoney(v, compact = false) {
  const n = toNumber(v);
  if (n === null) return '—';
  if (compact) return fmtCompact(n);
  return n.toLocaleString('vi-VN', { maximumFractionDigits: 0 });
}

export function fmtCompact(v) {
  const n = toNumber(v);
  if (n === null) return '—';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} tỷ`;
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tr`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} k`;
  return n.toLocaleString('vi-VN', { maximumFractionDigits: 0 });
}

export function fmtNum(v, digits = 2) {
  const n = toNumber(v);
  if (n === null) return '—';
  return n.toLocaleString('vi-VN', { maximumFractionDigits: digits });
}

export function fmtRate(v) {
  const n = toNumber(v);
  if (n === null) return '—';
  const abs = Math.abs(n);
  const d = abs >= 1000 ? 0 : abs >= 10 ? 2 : 6;
  return n.toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: d });
}

export function fmtPct(v) {
  const n = toNumber(v);
  if (n === null) return '—';
  // Giá trị đã là số phần trăm: 0.38 → 0,38% · -2.24 → -2,24%
  return `${n.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}%`;
}

export function fmtDate(v) {
  if (!v) return '—';
  const d = new Date(v);
  if (isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function fmtUsd(v) {
  const n = toNumber(v);
  if (n === null) return '—';
  return `$${n.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function fmtCell(value, type) {
  switch (type) {
    case 'money': return fmtMoney(value);
    case 'usd': return fmtUsd(value);
    case 'num': return fmtNum(value);
    case 'rate': return fmtRate(value);
    case 'pct': return fmtPct(value);
    case 'date': return fmtDate(value);
    default: return value === null || value === undefined || value === '' ? '—' : String(value);
  }
}

export function fmtKpi(value, type) {
  if (value === null || value === undefined || value === '') return null;
  switch (type) {
    case 'money': return fmtCompact(value);
    case 'usd': return fmtUsd(value);
    case 'num': return fmtNum(value);
    case 'rate': return fmtRate(value);
    case 'pct': return fmtPct(value);
    default: return String(value);
  }
}

export function toneOf(kpi, value) {
  if (kpi.tone && kpi.tone !== 'auto') return kpi.tone;
  if (kpi.tone === 'auto') {
    const n = toNumber(value);
    if (n === null) return '';
    return n >= 0 ? 'gain' : 'loss';
  }
  return '';
}

export const isNumericType = (t) => ['money', 'num', 'rate', 'pct'].includes(t);
