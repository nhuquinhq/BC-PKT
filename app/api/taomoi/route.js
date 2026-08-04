/* ============================================================
   API Đơn hàng TẠO MỚI cho PKT11 — tab "Đơn tạo mới" của bộ file
   Báo cáo đơn hàng V3 (nhiều file theo tháng, lặp url/gid):
   - Gồm đơn CHƯA CF (Chờ xử lý) và đơn ĐANG XỬ LÝ; đơn CO=0 là đơn
     chưa có giá vốn (cột X trống/0) — đánh dấu nc để tính tỉ lệ.
   - Một đơn có thể nhiều dòng (mỗi dòng 1 code): Doanh thu chỉ nằm ở
     dòng đầu, Giá vốn tính theo TỪNG dòng → gộp theo ID đơn trước.
   - Tiền toàn bộ là USD; mốc thời gian theo NGÀY TẠO đơn.
   Trả cùng khuôn dữ liệu với /api/cpv để dùng chung CpvBoard.
   ============================================================ */

import Papa from 'papaparse';

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

const DATE_ISO = /(\d{4})-(\d{1,2})-(\d{1,2})/;

/* Gộp dòng theo ID đơn → mỗi đơn 1 bản ghi */
function parseTaoMoi(grid) {
  let headIdx = -1;
  let headers = [];
  for (let i = 0; i < Math.min(grid.length, 10); i++) {
    const h = (grid[i] || []).map(norm);
    if (h.includes('order id') && h.includes('trang thai') && h.includes('ngay tao')) {
      headIdx = i;
      headers = h;
      break;
    }
  }
  if (headIdx < 0) throw new Error('Không tìm thấy dòng tiêu đề tab Đơn tạo mới.');

  const giaVonIdx = headers.reduce((acc, h, i) => (h === 'gia von' ? [...acc, i] : acc), []);
  const col = {
    id: headers.indexOf('id don'),
    order_id: headers.indexOf('order id'),
    san: headers.indexOf('san'),
    doanh_thu: headers.indexOf('doanh thu'),
    ngay_tao: headers.indexOf('ngay tao'),
    trang_thai: headers.indexOf('trang thai'),
    loai_don: headers.indexOf('loai don'),
    nguon: headers.indexOf('nguon'), /* cột W "Nguồn" — nguồn NCC (vd RBX) */
    gia_von: giaVonIdx[0] ?? -1, /* cột X "Giá vốn" (USD) — bỏ cột AA "(auto/thủ công)" vì không trùng tên chính xác */
  };

  const orders = new Map();
  for (let i = headIdx + 1; i < grid.length; i++) {
    const r = grid[i] || [];
    const id = String(r[col.id] ?? '').trim();
    const san = String(r[col.san] ?? '').trim().toUpperCase();
    if (!id || !san) continue;
    if (!orders.has(id)) {
      const m = String(r[col.ngay_tao] ?? '').match(DATE_ISO);
      if (!m) continue;
      const dt = { y: m[1], m: m[2].padStart(2, '0'), d: m[3].padStart(2, '0') };
      orders.set(id, {
        id,
        order_id: String(r[col.order_id] ?? '').trim(),
        san,
        trang_thai: String(r[col.trang_thai] ?? '').trim(),
        loai_don: String(r[col.loai_don] ?? '').trim() || '—',
        ngay: `${dt.d}/${dt.m}/${dt.y}`,
        sortKey: `${dt.y}${dt.m}${dt.d}`,
        nguon_ncc: '',
        doanh_thu_usd: 0,
        gia_von: 0,
      });
    }
    const o = orders.get(id);
    o.doanh_thu_usd += col.doanh_thu >= 0 ? viNum(r[col.doanh_thu]) : 0;
    o.gia_von += col.gia_von >= 0 ? viNum(r[col.gia_von]) : 0;
    /* Nguồn NCC nằm rải trên dòng bất kỳ của đơn — lấy giá trị đầu tiên có */
    if (!o.nguon_ncc && col.nguon >= 0) o.nguon_ncc = String(r[col.nguon] ?? '').trim().toUpperCase();
  }
  return [...orders.values()];
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const urls = searchParams.getAll('url');
  const gids = searchParams.getAll('gid');
  if (!urls.length) return Response.json({ error: 'Thiếu url' }, { status: 400 });

  let orders = [];
  const errors = [];
  const loaded = await Promise.all(
    urls.map((u, i) =>
      loadGrid(u, gids[i] || '0')
        .then((grid) => ({ grid }))
        .catch((e) => ({ err: e }))
    )
  );
  for (let i = 0; i < loaded.length; i++) {
    try {
      if (loaded[i].err) throw loaded[i].err;
      orders = orders.concat(parseTaoMoi(loaded[i].grid));
    } catch (e) {
      errors.push(`file ${i + 1}: ${e.message}`);
    }
  }
  if (!orders.length && errors.length) {
    return Response.json({ error: `Tab Đơn tạo mới: ${errors.join(' · ')}` }, { status: 502 });
  }

  /* Phân loại: CHƯA CF = Chờ xử lý; còn lại là ĐANG XỬ LÝ. CO=0 đánh dấu nc. */
  const agg = new Map();
  const list = [];
  for (const o of orders) {
    const nhom = norm(o.trang_thai).includes('cho xu ly') ? 'CHƯA CF (Chờ xử lý)' : 'ĐANG XỬ LÝ';
    const co0 = o.gia_von <= 0;
    if (list.length < 4000) {
      list.push({
        order_id: o.order_id || o.id,
        san: o.san,
        bu: '',
        spdv: nhom,
        loai_don: o.loai_don,
        nguon_ncc: o.nguon_ncc || '—',
        co0: co0 ? 'CO = 0' : '',
        ngay: o.ngay,
        sortKey: o.sortKey,
        doanh_thu_usd: o.doanh_thu_usd,
        gia_von: o.gia_von,
      });
    }
    const key = `${o.sortKey}|${o.san}|${nhom}`;
    if (!agg.has(key)) {
      agg.set(key, {
        ngay: o.ngay, sortKey: o.sortKey, san: o.san, spdv: nhom, bu: '', nguon: 'dh',
        so_don: 0, don_fail: 0, don_huy: 0, nc_don: 0, nc_gmv: 0,
        doanh_thu_usd: 0, phi_san: 0, phi_san_vnd: 0, dthu_thuc: 0,
        thanh_tien: 0, gia_von: 0, loi_nhuan: 0,
      });
    }
    const a = agg.get(key);
    a.so_don += 1;
    a.doanh_thu_usd += o.doanh_thu_usd;
    a.dthu_thuc += o.doanh_thu_usd;
    a.gia_von += o.gia_von;
    if (co0) {
      a.nc_don += 1;
      a.nc_gmv += o.doanh_thu_usd; /* USD chờ về của đơn chưa có giá vốn */
    }
  }
  const detail = [...agg.values()].sort((x, y) => (x.sortKey < y.sortKey ? -1 : x.sortKey > y.sortKey ? 1 : x.san.localeCompare(y.san)));
  const dates = detail.map((x) => x.ngay);

  return Response.json({
    detail,
    no_cost_list: list,
    meta: {
      gia_von_found: true,
      rows_used: orders.length,
      main_used: orders.length,
      don_fail: 0,
      don_huy: 0,
      api_used: 0,
      api_no_cost: 0,
      api_error: null,
      main_files: urls.length,
      main_error: errors.length ? errors.join(' · ') : null,
      dedup_removed: 0,
      api_out_of_range: 0,
      from: dates[0] || '',
      to: dates[dates.length - 1] || '',
    },
  });
}
