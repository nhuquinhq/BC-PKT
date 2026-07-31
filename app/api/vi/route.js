/* ============================================================
   API Lịch sử ví HQS10000 cho PKT6:
   - Doanh thu THỰC NHẬN về ví sàn (đã sau phí) — chỉ lấy các dòng
     có cột "Tìm" = DT (trống là giao dịch khác, bỏ qua).
   - Tháng đang chạy đọc live tab THVí Tiền (url + gid + month/year
     vì trên tab chỉ có số NGÀY trong tháng, không có ngày đầy đủ).
   - Tháng đã chốt nằm trong datalake lib/data/vi-*.json.
   Trả về cùng khuôn dữ liệu với /api/cpv để dùng chung CpvBoard.
   ============================================================ */

import Papa from 'papaparse';
import histT4 from '@/lib/data/vi-2026-04.json';
import histT5 from '@/lib/data/vi-2026-05.json';
import histT6 from '@/lib/data/vi-2026-06.json';

const HIST = [histT4, histT5, histT6];

export const dynamic = 'force-dynamic';

const norm = (s) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ')
    .trim();

function viNum(raw) {
  let s = String(raw ?? '').trim().replace(/\s/g, '').replace(/%$/, '');
  if (!s) return 0;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function toCsvUrl(sheetUrl, gid) {
  try {
    const u = new URL(sheetUrl);
    if (!u.hostname.includes('docs.google.com')) return null;
    const pub = u.pathname.match(/\/spreadsheets\/d\/e\/([^/]+)/);
    if (pub) return `https://docs.google.com/spreadsheets/d/e/${pub[1]}/pub?output=csv&gid=${gid || u.searchParams.get('gid') || '0'}`;
    const m = u.pathname.match(/\/spreadsheets\/d\/([^/]+)/);
    if (m) return `https://docs.google.com/spreadsheets/d/${m[1]}/export?format=csv&gid=${gid || '0'}`;
    return null;
  } catch {
    return sheetUrl; // URL CSV trực tiếp (mock/test)
  }
}

async function loadGrid(url, gid) {
  const csvUrl = toCsvUrl(url, gid) || url;
  const res = await fetch(csvUrl, { redirect: 'follow', cache: 'no-store' });
  if (!res.ok) throw new Error(`Google trả về HTTP ${res.status}`);
  const text = await res.text();
  if (text.trim().startsWith('<')) throw new Error('Nhận về HTML thay vì CSV — kiểm tra Publish to web và GID.');
  return Papa.parse(text, { header: false, skipEmptyLines: false }).data;
}

/* Tab THVí Tiền: header dòng 5 — Tên sàn | ID | Trạng thái | Số Tiền | Ngày |
   Tuần | Tỷ giá tuần | DT VND | Giá Vốn | Tìm | Lợi Nhuận | Tên Sheet |
   Loại đơn hàng BE | ... | BU */
function parseWallet(grid, { month, year }) {
  let headIdx = -1;
  let headers = [];
  for (let i = 0; i < Math.min(grid.length, 20); i++) {
    const h = (grid[i] || []).map(norm);
    if ((h.includes('ten san') || h.includes('san')) && h.includes('so tien') && h.includes('tim')) {
      headIdx = i;
      headers = h;
      break;
    }
  }
  if (headIdx < 0) throw new Error('Không tìm thấy dòng tiêu đề tab THVí Tiền.');

  const col = {
    san: headers.indexOf('ten san') >= 0 ? headers.indexOf('ten san') : headers.indexOf('san'),
    so_tien: headers.indexOf('so tien'),
    ngay: headers.indexOf('ngay'),
    dt_vnd: headers.indexOf('dt vnd'),
    gia_von: headers.indexOf('gia von'),
    tim: headers.indexOf('tim'),
    loi_nhuan: headers.indexOf('loi nhuan'),
    loai_don: headers.findIndex((h) => h.startsWith('loai don hang')),
    bu: headers.indexOf('bu'),
  };

  const agg = new Map();
  let ok = 0;
  for (let i = headIdx + 1; i < grid.length; i++) {
    const r = grid[i] || [];
    if (norm(r[col.tim]) !== 'dt') continue; // chỉ dòng doanh thu
    const san = String(r[col.san] ?? '').trim();
    const day = Math.round(viNum(r[col.ngay]));
    if (!san || day < 1 || day > 31) continue;
    const ngay = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
    const sortKey = `${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`;
    const spdv = String(r[col.loai_don] ?? '').trim() || 'KHÁC';
    const bu = col.bu >= 0 ? String(r[col.bu] ?? '').trim().toUpperCase() : '';
    const key = `${sortKey}|${san}|${spdv}|${bu}`;
    if (!agg.has(key)) {
      agg.set(key, {
        ngay, sortKey, san, spdv, bu, nguon: 'dh',
        so_don: 0, don_fail: 0, don_huy: 0,
        doanh_thu_usd: 0, phi_san: 0, phi_san_vnd: 0,
        dthu_thuc: 0, thanh_tien: 0, gia_von: 0, loi_nhuan: 0,
      });
    }
    const a = agg.get(key);
    ok += 1;
    const usd = viNum(r[col.so_tien]);
    const tt = viNum(r[col.dt_vnd]);
    const gv = viNum(r[col.gia_von]);
    const lnRaw = String(r[col.loi_nhuan] ?? '').trim();
    a.so_don += 1;
    a.doanh_thu_usd += usd;
    a.dthu_thuc += usd;
    a.thanh_tien += tt;
    a.gia_von += gv;
    a.loi_nhuan += lnRaw ? viNum(lnRaw) : tt - gv;
  }
  const detail = [...agg.values()].sort((x, y) => (x.sortKey < y.sortKey ? -1 : x.sortKey > y.sortKey ? 1 : x.san.localeCompare(y.san)));
  return { detail, ok };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');
  const gid = searchParams.get('gid') || '0';
  const month = parseInt(searchParams.get('month') || '0', 10);
  const year = parseInt(searchParams.get('year') || '0', 10);
  const useHist = searchParams.get('hist') === '1';
  if (!url) return Response.json({ error: 'Thiếu url' }, { status: 400 });
  if (!month || !year) return Response.json({ error: 'Thiếu month/year cho tab ví' }, { status: 400 });

  let live = { detail: [], ok: 0 };
  try {
    const grid = await loadGrid(url, gid);
    live = parseWallet(grid, { month, year });
  } catch (e) {
    return Response.json({ error: `Tab THVí Tiền: ${e.message}` }, { status: 502 });
  }

  let detail = live.detail;
  let histOk = 0;
  if (useHist) {
    const histRows = HIST.flatMap((h) => h.detail);
    detail = histRows
      .concat(detail)
      .sort((x, y) => (x.sortKey < y.sortKey ? -1 : x.sortKey > y.sortKey ? 1 : x.san.localeCompare(y.san)));
    for (const h of HIST) histOk += h.counts?.ok || 0;
  }
  const dates = detail.map((x) => x.ngay);

  return Response.json({
    detail,
    meta: {
      gia_von_found: true,
      rows_used: live.ok + histOk,
      main_used: live.ok + histOk,
      don_fail: 0,
      don_huy: 0,
      api_used: 0,
      api_no_cost: 0,
      api_error: null,
      main_files: 1,
      main_error: null,
      dedup_removed: 0,
      api_out_of_range: 0,
      from: dates[0] || '',
      to: dates[dates.length - 1] || '',
    },
  });
}
