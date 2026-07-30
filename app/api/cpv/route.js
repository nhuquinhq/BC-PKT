/* ============================================================
   API tổng hợp Doanh thu – Giá vốn từ file đơn hàng BE HQS
   (Giá Vốn HQS10000 - BE · tab Data, publish CSV).

   File gốc ~vài chục nghìn dòng đơn → server đọc, lọc đơn Hoàn Tất,
   gộp theo (Ngày hoàn tất × Sàn) rồi trả về bản compact vài trăm dòng
   cho trình duyệt tự tính các chiều Ngày / Sàn / BU.
   ============================================================ */

import Papa from 'papaparse';
import { spdvOf } from '@/lib/cpvDims';

export const dynamic = 'force-dynamic';

/* Chuẩn hoá header: thường, bỏ dấu, gọn khoảng trắng */
const norm = (s) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ')
    .trim();

/* Số kiểu VN: "7.103.732.354,81" → 7103732354.81 · "49,96" → 49.96 */
function viNum(raw) {
  let s = String(raw ?? '').trim().replace(/\s/g, '').replace(/%$/, '');
  if (!s) return 0;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

/* "Ngày hoàn tất" trên file dạng ISO: 2026-07-09 09:02:10 · dự phòng dd/mm/yyyy */
const DATE_ISO = /(\d{4})-(\d{1,2})-(\d{1,2})/;
const DATE_VN = /(\d{1,2})\/(\d{1,2})\/(\d{4})/;
function parseDate(cell) {
  const s = String(cell ?? '');
  let m = s.match(DATE_ISO);
  if (m) return { y: m[1], m: m[2].padStart(2, '0'), d: m[3].padStart(2, '0') };
  m = s.match(DATE_VN);
  if (m) return { y: m[3], m: m[2].padStart(2, '0'), d: m[1].padStart(2, '0') };
  return null;
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
    return sheetUrl; // cho phép URL CSV trực tiếp (mock/test)
  }
}

/* Tìm cột theo danh sách ứng viên: 'ten' = so khớp bằng, '~ten' = chứa */
function findCol(headers, candidates) {
  for (const c of candidates) {
    const contains = c.startsWith('~');
    const key = contains ? c.slice(1) : c;
    const i = headers.findIndex((h) => (contains ? h.includes(key) : h === key));
    if (i >= 0) return i;
  }
  return -1;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get('url');
  const gid = searchParams.get('gid') || '0';
  if (!rawUrl) return Response.json({ error: 'Thiếu url' }, { status: 400 });
  const csvUrl = toCsvUrl(rawUrl, gid) || rawUrl;

  let text;
  try {
    const res = await fetch(csvUrl, { redirect: 'follow', cache: 'no-store' });
    if (!res.ok) throw new Error(`Google trả về HTTP ${res.status}`);
    text = await res.text();
  } catch (e) {
    return Response.json({ error: `Không đọc được Google Sheet: ${e.message}` }, { status: 502 });
  }
  if (text.trim().startsWith('<')) {
    return Response.json({ error: 'Nhận về HTML thay vì CSV — kiểm tra sheet đã Publish to web và GID đúng tab Data.' }, { status: 502 });
  }

  const grid = Papa.parse(text, { header: false, skipEmptyLines: false }).data;

  /* Tìm dòng tiêu đề bảng đơn hàng */
  let headIdx = -1;
  let headers = [];
  for (let i = 0; i < Math.min(grid.length, 40); i++) {
    const h = (grid[i] || []).map(norm);
    if (h.includes('order id') || (h.some((x) => x === 'san') && h.some((x) => x.startsWith('doanh thu')))) {
      headIdx = i;
      headers = h;
      break;
    }
  }
  if (headIdx < 0) {
    return Response.json({ error: 'Không tìm thấy dòng tiêu đề (Order ID / Sàn / Doanh thu) trong tab.' }, { status: 422 });
  }

  /* File có 2 cột trùng tên "Giá vốn": cột đầu = đơn giá USD, cột sau = thành tiền VND */
  const giaVonIdx = headers.reduce((acc, h, i) => (h === 'gia von' ? [...acc, i] : acc), []);

  const col = {
    san: findCol(headers, ['san', '~san giao dich']),
    doanh_thu_usd: findCol(headers, ['doanh thu', '~doanh thu']),
    phi_san: findCol(headers, ['~phi san']),
    dthu_thuc: findCol(headers, ['~thuc nhan']),
    gia_von_usd: giaVonIdx[0] ?? -1,
    gia_von: giaVonIdx.length > 1 ? giaVonIdx[giaVonIdx.length - 1] : giaVonIdx[0] ?? -1,
    thanh_tien: findCol(headers, ['thanh tien', '~thanh tien']),
    loi_nhuan: findCol(headers, ['loi nhuan', '~loi nhuan']),
    trang_thai: findCol(headers, ['trang thai', '~trang thai']),
    ngay_hoan_tat: findCol(headers, ['ngay hoan tat', '~ngay hoan tat', '~hoan tat luc', '~ngay hoan thanh']),
    ngay_tao: findCol(headers, ['ngay tao', '~ngay tao']),
    bu: findCol(headers, ['bu', '~khoi kd']),
    dich_vu: findCol(headers, ['dich vu', '~dich vu']),
    game: findCol(headers, ['game']),
    san_pham: findCol(headers, ['~san pham']),
  };

  const missing = [];
  if (col.san < 0) missing.push('Sàn');
  if (col.thanh_tien < 0 && col.doanh_thu_usd < 0) missing.push('Thành tiền / Doanh thu');
  if (col.ngay_hoan_tat < 0) missing.push('Ngày hoàn tất');
  if (missing.length) {
    return Response.json({ error: `Không tìm thấy cột: ${missing.join(', ')}. Header đọc được: ${headers.filter(Boolean).slice(0, 30).join(' | ')}` }, { status: 422 });
  }

  /* Phân loại trạng thái đơn: thành công / thất bại / hoàn hủy / khác */
  const statusClass = (raw) => {
    const st = norm(raw);
    if (!st || st.includes('hoan tat') || st.includes('hoan thanh')) return 'ok';
    if (st.includes('hoan')) return 'huy'; /* hoàn hủy / hoàn tiền */
    if (st.includes('huy')) return 'huy';
    if (st.includes('that bai') || st.includes('fail') || st.includes('loi')) return 'fail';
    return 'other'; /* đang xử lý... không tính */
  };

  /* Gộp theo Ngày × Sàn × SPDV; đơn fail/hoàn hủy chỉ đếm số lượng */
  const agg = new Map();
  let used = 0;
  let skipNoDate = 0;
  let skipStatus = 0;
  let countFail = 0;
  let countHuy = 0;
  for (let i = headIdx + 1; i < grid.length; i++) {
    const r = grid[i] || [];
    const san = String(r[col.san] ?? '').trim();
    if (!san) continue;

    const sc = col.trang_thai >= 0 ? statusClass(r[col.trang_thai]) : 'ok';
    if (sc === 'other') { skipStatus++; continue; }

    /* Đơn thành công lấy Ngày hoàn tất; đơn fail/hủy chưa giao lấy Ngày tạo thay thế */
    let dt = parseDate(r[col.ngay_hoan_tat]);
    if (!dt && sc !== 'ok' && col.ngay_tao >= 0) dt = parseDate(r[col.ngay_tao]);
    if (!dt) { skipNoDate++; continue; }
    const ngay = `${dt.d}/${dt.m}/${dt.y}`;
    const sortKey = `${dt.y}${dt.m}${dt.d}`;

    const spdv = spdvOf(col.dich_vu >= 0 ? r[col.dich_vu] : '', col.game >= 0 ? r[col.game] : '', col.san_pham >= 0 ? r[col.san_pham] : '');
    const key = `${sortKey}|${san}|${spdv}`;
    if (!agg.has(key)) {
      agg.set(key, {
        ngay,
        sortKey,
        san,
        spdv,
        bu: col.bu >= 0 && String(r[col.bu] ?? '').trim() ? String(r[col.bu]).trim().toUpperCase() : (san.match(/^[A-Za-z]+/)?.[0] || san).toUpperCase(),
        so_don: 0,
        don_fail: 0,
        don_huy: 0,
        doanh_thu_usd: 0,
        phi_san: 0,
        phi_san_vnd: 0,
        dthu_thuc: 0,
        thanh_tien: 0,
        gia_von: 0,
        loi_nhuan: 0,
      });
    }
    const a = agg.get(key);

    if (sc === 'fail') { a.don_fail += 1; countFail++; continue; }
    if (sc === 'huy') { a.don_huy += 1; countHuy++; continue; }

    const doanhThuUsd = col.doanh_thu_usd >= 0 ? viNum(r[col.doanh_thu_usd]) : 0;
    const phiSan = col.phi_san >= 0 ? viNum(r[col.phi_san]) : 0;
    const dthuThuc = col.dthu_thuc >= 0 ? viNum(r[col.dthu_thuc]) : doanhThuUsd - phiSan;
    const thanhTien = col.thanh_tien >= 0 ? viNum(r[col.thanh_tien]) : 0;
    const giaVon = col.gia_von >= 0 ? viNum(r[col.gia_von]) : 0;
    const loiNhuan = col.loi_nhuan >= 0 ? viNum(r[col.loi_nhuan]) : thanhTien - giaVon;
    /* Phí sàn quy VND theo REV rate ẩn của chính dòng đó (Thành tiền / DThu thực nhận) */
    const phiSanVnd = dthuThuc > 0 ? phiSan * (thanhTien / dthuThuc) : 0;

    a.so_don += 1;
    a.doanh_thu_usd += doanhThuUsd;
    a.phi_san += phiSan;
    a.phi_san_vnd += phiSanVnd;
    a.dthu_thuc += dthuThuc;
    a.thanh_tien += thanhTien;
    a.gia_von += giaVon;
    a.loi_nhuan += loiNhuan;
    used++;
  }

  const detail = [...agg.values()].sort((x, y) => (x.sortKey < y.sortKey ? -1 : x.sortKey > y.sortKey ? 1 : x.san.localeCompare(y.san)));
  const dates = detail.map((x) => x.ngay);

  return Response.json({
    detail,
    meta: {
      header_row: headIdx + 1,
      gia_von_found: col.gia_von >= 0,
      bu_from_header: col.bu >= 0,
      rows_used: used,
      don_fail: countFail,
      don_huy: countHuy,
      rows_skip_no_date: skipNoDate,
      rows_skip_status: skipStatus,
      from: dates[0] || '',
      to: dates[dates.length - 1] || '',
    },
    csvUrl,
  });
}
