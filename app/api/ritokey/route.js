/* ============================================================
   API CPV Ritokey (team C300) — nguồn "Báo cáo kinh doanh Ritokey".

   - T1 → T7: lấy từ datalake tĩnh lib/data/ritokey-2026.json (bóc từ
     sheet Monthly.Report của file, đã đối chiếu khớp dòng Total).
     File chỉ có chi tiết giao dịch từ T4 nên các tháng đầu năm chỉ có
     số tổng — đó là lý do dùng bản chốt tháng thay vì cộng lại từ đơn.
   - Tháng đang chạy: đọc trực tiếp tab giao dịch đã công bố (gid),
     gộp theo NGÀY HOÀN TẤT. Tự nhận dạng tab Giftcard hay Tiện ích
     theo tiêu đề cột nên khai báo gid nào cũng chạy.
   ============================================================ */

import Papa from 'papaparse';
import HIST from '@/lib/data/ritokey-2026.json';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

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
  if (!s || s === '-') return 0;
  const am = /^\(.*\)$/.test(s);
  if (am) s = s.slice(1, -1);
  if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
  else s = s.replace(/[.,](?=\d{3}\b)/g, '');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : am ? -n : n;
}

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

function csvUrl(url, gid) {
  const pub = String(url || '').match(/\/spreadsheets\/d\/e\/([^/]+)/);
  if (!pub) return null;
  return `https://docs.google.com/spreadsheets/d/e/${pub[1]}/pub?gid=${gid}&single=true&output=csv`;
}

async function taiTab(url, gid) {
  const u = csvUrl(url, gid);
  if (!u) return [];
  for (let i = 0; i < 3; i++) {
    if (i) await new Promise((ok) => setTimeout(ok, i * 2000));
    try {
      const res = await fetch(u, { redirect: 'follow', cache: 'no-store', signal: AbortSignal.timeout(25000) });
      if (!res.ok) throw new Error(`Google trả về HTTP ${res.status}`);
      const text = await res.text();
      if (text.trim().startsWith('<')) throw new Error('Nhận về HTML thay vì CSV');
      return Papa.parse(text, { header: false, skipEmptyLines: false }).data;
    } catch (e) {
      if (i === 2) throw e;
    }
  }
  return [];
}

/* Hai khuôn tab giao dịch của file Ritokey — nhận dạng theo tiêu đề cột */
function docGiaoDich(grid) {
  let h = -1;
  let head = [];
  for (let i = 0; i < Math.min(grid.length, 15); i++) {
    const r = (grid[i] || []).map(norm);
    if (r.includes('trang thai') && (r.includes('gia ban') || r.includes('tri gia'))) { h = i; head = r; break; }
  }
  if (h < 0) throw new Error('Không tìm thấy dòng tiêu đề tab giao dịch');
  const first = (ten) => {
    const i = head.indexOf(ten);
    return i;
  };
  const laGiftcard = head.includes('gia ban');
  const col = {
    gmv: laGiftcard ? first('gia ban') : first('tri gia'),
    co: first('gia von'),
    tt: first('trang thai'),
    ngay: laGiftcard ? first('thoi gian hoan thanh') : first('ngay hoan tat'),
    nhom: first('danh muc san pham') >= 0 ? first('danh muc san pham') : first('loai san pham'),
  };
  const OK = new Set(['thanh cong', 'hoan tat', 'hoan tat doi xac nhan']);
  const rows = [];
  for (let i = h + 1; i < grid.length; i++) {
    const r = grid[i] || [];
    if (!String(r[0] ?? '').trim()) continue;
    if (!OK.has(norm(r[col.tt]))) continue;
    const dt = parseDate(r[col.ngay]);
    if (!dt) continue;
    rows.push({
      ngay: `${dt.d}/${dt.m}/${dt.y}`,
      sortKey: `${dt.y}${dt.m}${dt.d}`,
      thang: `${dt.m}/${dt.y}`,
      nhom: laGiftcard ? 'Giftcard' : String(r[col.nhom] ?? '').trim() || 'Tiện ích',
      gmv: viNum(r[col.gmv]),
      co: col.co >= 0 ? viNum(r[col.co]) : 0,
    });
  }
  return rows;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');
  const gids = (searchParams.get('gids') || searchParams.get('gid') || '').split(',').map((x) => x.trim()).filter(Boolean);

  let live = [];
  let loi = null;
  if (url && gids.length) {
    try {
      const nap = await Promise.all(gids.map((g) => taiTab(url, g).then(docGiaoDich).catch((e) => { loi = e.message; return []; })));
      live = nap.flat();
    } catch (e) {
      loi = e.message;
    }
  }

  /* Gộp ngày cho tháng đang chạy */
  const theoNgay = new Map();
  for (const r of live) {
    const a = theoNgay.get(r.ngay) || { ngay: r.ngay, sortKey: r.sortKey, thang: r.thang, gmv: 0, co: 0, so_don: 0 };
    a.gmv += r.gmv;
    a.co += r.co;
    a.so_don += 1;
    theoNgay.set(r.ngay, a);
  }
  const cpv_ngay = [...theoNgay.values()]
    .sort((x, y) => (x.sortKey < y.sortKey ? -1 : 1))
    .map((r) => ({ ...r, pl1: r.gmv - r.co, ty_le_co: r.gmv ? (r.co / r.gmv) * 100 : null }));

  /* Tháng đang chạy đọc live thì lấy số live, các tháng trước lấy datalake */
  const thangLive = new Set(cpv_ngay.map((r) => r.thang));
  const cpv_thang = HIST.thang
    .filter((r) => r.gmv || r.so_don)
    .map((r) => {
      if (!thangLive.has(r.thang)) return { ...r, nguon: 'Chốt tháng' };
      const g = cpv_ngay.filter((x) => x.thang === r.thang);
      const gmv = g.reduce((t, x) => t + x.gmv, 0);
      const co = g.reduce((t, x) => t + x.co, 0);
      const so_don = g.reduce((t, x) => t + x.so_don, 0);
      return {
        ...r, gmv, co, so_don, re: gmv, pl1: gmv - co,
        ty_le_co: gmv ? (co / gmv) * 100 : null,
        bien_pl1: gmv ? ((gmv - co) / gmv) * 100 : null,
        nguon: 'Đọc trực tiếp',
      };
    });

  const tong = (k) => cpv_thang.reduce((t, r) => t + (r[k] || 0), 0);
  const gmv = tong('gmv');
  const re = tong('re');
  const co = tong('co');
  const pl1 = tong('pl1');

  return Response.json({
    cpv_thang,
    cpv_ngay,
    kpis: {
      gmv, re, co, pl1,
      so_don: tong('so_don'),
      ty_le_co: re ? (co / re) * 100 : null,
      bien_pl1: gmv ? (pl1 / gmv) * 100 : null,
      ar: tong('ar'),
    },
    meta: {
      nguon: HIST.nguon,
      team: HIST.team,
      thang_live: [...thangLive].join(', ') || 'chưa đọc được tháng nào',
      so_don_live: live.length,
      loi_doc_live: loi,
    },
  });
}
