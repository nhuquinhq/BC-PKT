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
import { nhoDocFile } from '@/lib/boNho';

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
    /* single=true là BẮT BUỘC: thiếu nó Google hiểu là xuất CẢ WORKBOOK chứ
       không phải một tab, nên với file nhiều tab lớn thì trả HTTP 500 hoặc
       treo quá 90s. Đã đo được đúng lỗi này ở file BE T8 và file ví T8. */
    if (pub) return `https://docs.google.com/spreadsheets/d/e/${pub[1]}/pub?gid=${gid || u.searchParams.get('gid') || '0'}&single=true&output=csv`;
    const m = u.pathname.match(/\/spreadsheets\/d\/([^/]+)/);
    if (m) return `https://docs.google.com/spreadsheets/d/${m[1]}/export?format=csv&gid=${gid || '0'}`;
    return null;
  } catch {
    return sheetUrl; // URL CSV trực tiếp (mock/test)
  }
}

/* Đo ngày 12/08: file ví T7 xuất 5,4 MB trong 13,5s, còn file ví T8 chạy đủ
   240s rồi Google trả HTTP 400 — tức là hỏng hẳn chứ không phải chậm. Cho
   90s một lượt; gặp hết giờ thì dừng luôn thay vì đợi thêm lượt nữa, kết
   hợp với việc nhớ lỗi ở lib/boNho.js cho khỏi treo trang. */
const HAN_CHO = [90000, 90000];
/* Có nhớ: file ví tháng đang chạy khá nặng, mà PKT6 và PKT20 đọc chung —
   xem lib/boNho.js */
async function loadGrid(url, gid) {
  const csvUrl = toCsvUrl(url, gid) || url;
  const { val } = await nhoDocFile(`vi|${csvUrl}`, async () => {
    let loiCuoi = null;
    for (let i = 0; i < HAN_CHO.length; i++) {
      if (i) await new Promise((ok) => setTimeout(ok, i * 2000));
      try {
        const res = await fetch(csvUrl, { redirect: 'follow', cache: 'no-store', signal: AbortSignal.timeout(HAN_CHO[i]) });
        if (!res.ok) throw new Error(`Google trả về HTTP ${res.status}`);
        const text = await res.text();
        if (text.trim().startsWith('<')) throw new Error('Nhận về HTML thay vì CSV — kiểm tra Publish to web và GID.');
        return text;
      } catch (e) {
        if (e.name === 'TimeoutError') {
          throw new Error(`Google không xuất nổi file này trong ${HAN_CHO[i] / 1000}s — nhiều khả năng phải xuất bản lại hoặc làm nhẹ tab`);
        }
        loiCuoi = e;
      }
    }
    throw loiCuoi;
  });
  return Papa.parse(val, { header: false, skipEmptyLines: false }).data;
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

export const maxDuration = 300;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  /* Mỗi tháng đang chạy là MỘT file ví riêng, nên nhận nhiều bộ
     (url, gid, month, year) ghép theo thứ tự. */
  const urls = searchParams.getAll('url');
  const gids = searchParams.getAll('gid');
  const months = searchParams.getAll('month');
  const years = searchParams.getAll('year');
  const useHist = searchParams.get('hist') === '1';
  if (!urls.length) return Response.json({ error: 'Thiếu url' }, { status: 400 });
  if (!months.length) return Response.json({ error: 'Thiếu month/year cho tab ví' }, { status: 400 });

  const live = { detail: [], ok: 0 };
  const loi = [];
  const daDoc = await Promise.all(
    urls.map((u, i) =>
      loadGrid(u, gids[i] || '0')
        .then((grid) => ({ grid, i }))
        .catch((e) => ({ err: e, i }))
    )
  );
  for (const kq of daDoc) {
    const thang = parseInt(months[kq.i] || months[0] || '0', 10);
    const nam = parseInt(years[kq.i] || years[0] || '0', 10);
    if (kq.err) { loi.push(`file ${kq.i + 1} (tháng ${thang || '?'}): ${kq.err.message}`); continue; }
    if (!thang || !nam) { loi.push(`file ${kq.i + 1}: thiếu tháng/năm`); continue; }
    try {
      const r = parseWallet(kq.grid, { month: thang, year: nam });
      live.detail = live.detail.concat(r.detail);
      live.ok += r.ok;
    } catch (e) {
      loi.push(`file ${kq.i + 1} (tháng ${thang}): ${e.message}`);
    }
  }
  /* Hụt hết thì mới báo lỗi hẳn; hụt một file thì vẫn trả số, kèm main_error
     để trang hiện cảnh báo thay vì âm thầm thiếu một tháng. */
  if (!live.detail.length && loi.length) {
    return Response.json({ error: `Tab THVí Tiền: ${loi.join(' · ')}` }, { status: 502 });
  }

  let detail = live.detail.sort((x, y) => (x.sortKey < y.sortKey ? -1 : x.sortKey > y.sortKey ? 1 : x.san.localeCompare(y.san)));
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
      main_files: urls.length,
      main_error: loi.length ? loi.join(' · ') : null,
      dedup_removed: 0,
      api_out_of_range: 0,
      from: dates[0] || '',
      to: dates[dates.length - 1] || '',
    },
  });
}
