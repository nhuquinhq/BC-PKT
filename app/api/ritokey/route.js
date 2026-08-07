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

/* Tab Daily.Report là bảng NGANG: dòng 5 là ngày (từ cột H), mỗi chỉ tiêu
   một dòng cố định. Nhận diện dòng theo nhãn ở cột A–D để không phụ thuộc
   số thứ tự dòng — chèn thêm dòng trong file vẫn đọc đúng. */
const NHAN = [
  ['pl1', ['pl1b']],
  ['gmv', ['gmv']],
  ['gmv_tien_ich', ['doanh so dich vu tien ich']],
  ['gmv_giftcard', ['doanh so dich vu giftcard']],
  ['gmv_steam', ['doanh so dich vu steam']],
  ['re', ['doanh thu']],
  ['re_tien_ich', ['doanh thu dich vu tien ich']],
  ['re_giftcard', ['doanh thu dich vu giftcard']],
  ['re_steam', ['doanh thu dich vu steam']],
  ['pt', ['phai tra ctv tien ich']],
  ['co', ['co']],
  ['so_don', ['so luong don']],
  ['don_tien_ich', ['so don tien ich']],
  ['don_giftcard', ['so don giftcard']],
  ['don_steam', ['so don steam']],
];

function docDaily(grid) {
  /* Dòng ngày: dòng đầu tiên có từ 20 ô trở lên đọc được thành ngày */
  let hàng = -1;
  let cot = {};
  for (let i = 0; i < Math.min(grid.length, 12); i++) {
    const c = {};
    for (let k = 4; k < (grid[i] || []).length; k++) {
      const dt = parseDate(grid[i][k]);
      if (dt) c[k] = dt;
    }
    if (Object.keys(c).length >= 20) { hàng = i; cot = c; break; }
  }
  if (hàng < 0) throw new Error('Không tìm thấy dòng ngày của tab Daily.Report');

  const dong = {};
  for (let i = hàng + 1; i < grid.length; i++) {
    const nhan = norm((grid[i] || []).slice(0, 5).filter(Boolean).join(' '));
    if (!nhan) continue;
    for (const [key, ten] of NHAN) {
      if (dong[key] === undefined && ten.some((t) => nhan === t || nhan.endsWith(t))) dong[key] = i;
    }
  }
  if (dong.gmv === undefined) throw new Error('Không tìm thấy dòng GMV của tab Daily.Report');

  const rows = [];
  for (const [k, dt] of Object.entries(cot)) {
    const rec = { ngay: `${dt.d}/${dt.m}/${dt.y}`, sortKey: `${dt.y}${dt.m}${dt.d}`, thang: `${dt.m}/${dt.y}` };
    for (const [key] of NHAN) rec[key] = dong[key] === undefined ? 0 : viNum((grid[dong[key]] || [])[k]);
    for (const key of ['so_don', 'don_tien_ich', 'don_giftcard', 'don_steam']) rec[key] = Math.round(rec[key]);
    if (rec.gmv || rec.so_don) rows.push(rec);
  }
  return rows.sort((a, b) => (a.sortKey < b.sortKey ? -1 : 1));
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');
  const gids = (searchParams.get('gids') || searchParams.get('gid') || '')
    .split(',').map((x) => x.trim()).filter(Boolean);

  /* Ngày đọc trực tiếp (nếu có) ĐÈ LÊN datalake theo từng ngày — số mới
     nhất luôn thắng, các ngày file live chưa có thì vẫn giữ bản chốt. */
  let loi = null;
  let songay = 0;
  const theoNgay = new Map();
  for (const r of HIST.ngay) theoNgay.set(r.ngay, { ...r, nguon: 'Bản chốt' });
  if (url && gids.length) {
    for (const g of gids) {
      try {
        const live = docDaily(await taiTab(url, g));
        for (const r of live) theoNgay.set(r.ngay, { ...r, nguon: 'Đọc trực tiếp' });
        songay += live.length;
      } catch (e) {
        loi = e.message;
      }
    }
  }
  const cpv_ngay = [...theoNgay.values()]
    .sort((a, b) => (a.sortKey < b.sortKey ? -1 : 1))
    .map((r) => ({
      ...r,
      pl1: r.pl1 || r.re - r.co,
      ty_le_co: r.re ? (r.co / r.re) * 100 : null,
      bien_pl1: r.gmv ? ((r.pl1 || r.re - r.co) / r.gmv) * 100 : null,
    }));

  /* Gộp tháng từ chính dữ liệu ngày — luôn nhất quán với bảng ngày */
  const CONG = ['gmv', 'gmv_tien_ich', 'gmv_giftcard', 'gmv_steam', 're', 're_tien_ich',
    're_giftcard', 're_steam', 'pt', 'co', 'pl1', 'so_don', 'don_tien_ich', 'don_giftcard', 'don_steam'];
  const mT = new Map();
  for (const r of cpv_ngay) {
    const a = mT.get(r.thang) || { thang: r.thang, sortKey: r.thang.slice(3) + r.thang.slice(0, 2), nguon: r.nguon };
    for (const k of CONG) a[k] = (a[k] || 0) + (r[k] || 0);
    if (r.nguon === 'Đọc trực tiếp') a.nguon = 'Đọc trực tiếp';
    mT.set(r.thang, a);
  }
  const cpv_thang = [...mT.values()]
    .sort((a, b) => (a.sortKey < b.sortKey ? -1 : 1))
    .map((r) => ({
      ...r,
      ty_le_co: r.re ? (r.co / r.re) * 100 : null,
      bien_pl1: r.gmv ? (r.pl1 / r.gmv) * 100 : null,
    }));

  const tong = (k) => cpv_ngay.reduce((t, r) => t + (r[k] || 0), 0);
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
      ar: tong('pt'),
    },
    meta: {
      nguon: HIST.nguon,
      team: HIST.team,
      so_ngay: cpv_ngay.length,
      so_ngay_doc_truc_tiep: songay,
      loi_doc_live: loi,
    },
  });
}
