'use client';

import Papa from 'papaparse';

const LS_PREFIX = 'hqg-pkt-';

/* ---------- Lưu tạm trên trình duyệt (ưu tiên cao nhất) ---------- */
export function loadOverride(slug) {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(LS_PREFIX + slug);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveOverride(slug, data) {
  try {
    window.localStorage.setItem(LS_PREFIX + slug, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function clearOverride(slug) {
  try {
    window.localStorage.removeItem(LS_PREFIX + slug);
  } catch {
    /* bỏ qua */
  }
}

/* ---------- Nguồn 1: file JSON trong public/data ---------- */
export async function fetchJson(slug) {
  const res = await fetch(`/data/${slug}.json`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Không đọc được /data/${slug}.json`);
  return res.json();
}

/* ---------- Nguồn 2: dán CSV / TSV ---------- */
export function parseDelimited(text) {
  const out = Papa.parse(text.trim(), {
    header: true,
    skipEmptyLines: true,
    delimiter: '',
    transformHeader: (h) => h.trim(),
  });
  return out.data || [];
}

/* Ghép dữ liệu thô vào đúng cột đã khai báo trong lib/reports.js.
   Khớp theo key trước, sau đó khớp theo nhãn cột (không phân biệt hoa thường). */
export function mapRows(rows, columns) {
  const byKey = new Map();
  columns.forEach((c) => {
    byKey.set(c.key.toLowerCase(), c.key);
    byKey.set(c.label.toLowerCase(), c.key);
  });
  return rows.map((r) => {
    const o = {};
    Object.entries(r).forEach(([k, v]) => {
      const target = byKey.get(String(k).trim().toLowerCase());
      if (target) o[target] = v;
    });
    return o;
  });
}

/* ---------- Nguồn 3: Google Sheet ---------- */
export async function fetchSheet(url, gid) {
  const qs = new URLSearchParams({ url });
  if (gid) qs.set('gid', gid);
  const res = await fetch(`/api/sheet?${qs.toString()}`, { cache: 'no-store' });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Không đọc được Google Sheet');
  return json.rows || [];
}

/* ---------- Khung dữ liệu rỗng dựng từ cấu hình báo cáo ---------- */
export function emptyData(report) {
  const tables = {};
  report.tables.forEach((t) => {
    tables[t.id] = (t.seed || []).map((s) => ({ ...s }));
  });
  const kpis = {};
  report.kpis.forEach((k) => { kpis[k.key] = null; });
  return { meta: { ky: '', cap_nhat: '', nguoi_lap: '', ghi_chu: '' }, kpis, tables };
}
