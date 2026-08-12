/* ============================================================
   API CPV A10GG — nguồn "FINANCIAL REPORT_A10GG" (tab Phân bổ).

   Tab này là BÁO CÁO KẾT QUẢ KINH DOANH THEO THÁNG, không phải sổ đơn
   hàng, nên khác hẳn các nguồn còn lại:
   - Mỗi chỉ tiêu một dòng; cột G là TỔNG cả năm, cột H trở đi là
     Tháng 1 … Tháng 12.
   - A10GG TIỀN VỀ CHẬM ~45 NGÀY: doanh thu một tháng chỉ chốt xong
     khoảng 45 ngày sau khi hết tháng. Tháng vừa qua vì thế thường còn
     RE = 0 dù chi phí đã ghi — KHÔNG phải team ngừng bán.
   - Các tháng chưa tới đang để số DỰ TRÙ. Số dự trù TUYỆT ĐỐI không
     được cộng vào báo cáo tập đoàn, nên tách hẳn ra khỏi phần "thật".

   Cách phân biệt thật / dự trù: dòng 5 của file ghi số tháng cho từng
   cột (1, 2, 3 …). Cột nào có số tháng KHỚP với vị trí của nó thì là
   tháng thật; cột dự trù được sao chép từ tháng gần nhất nên số tháng
   không khớp (vd cột Tháng 8 vẫn ghi 7). Team sửa file khai số thật
   thì cột tự chuyển sang "thật", không phải sửa code.
   ============================================================ */

import Papa from 'papaparse';
import { nhoDocFile } from '@/lib/boNho';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/* Số ngày tiền về chậm — dùng để chú thích, không dùng để tính */
export const TRE_NGAY = 45;

const norm = (s) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/đ/gi, 'd')
    .replace(/\s+/g, ' ')
    .trim();

/* Số kiểu Việt: 1.234.567 hoặc 1.234,56 · ngoặc đơn là số âm */
function viNum(raw) {
  let s = String(raw ?? '').trim().replace(/\s/g, '').replace(/%$/, '');
  if (!s || s === '-') return 0;
  const am = /^\(.*\)$/.test(s);
  if (am) s = s.slice(1, -1);
  if (s.startsWith('-')) { s = s.slice(1); return -docSo(s); }
  return am ? -docSo(s) : docSo(s);
}
function docSo(s) {
  if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
  else s = s.replace(/[.,](?=\d{3}\b)/g, '');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function csvUrl(url, gid) {
  const pub = String(url || '').match(/\/spreadsheets\/d\/e\/([^/]+)/);
  if (!pub) return null;
  return `https://docs.google.com/spreadsheets/d/e/${pub[1]}/pub?gid=${gid}&single=true&output=csv`;
}

async function taiTab(url, gid) {
  const u = csvUrl(url, gid);
  if (!u) throw new Error('Link A10GG không phải link đã công bố');
  const { val } = await nhoDocFile(`a10gg|${u}`, async () => {
    let loiCuoi = null;
    for (let i = 0; i < 3; i++) {
      if (i) await new Promise((ok) => setTimeout(ok, i * 2000));
      try {
        const res = await fetch(u, { redirect: 'follow', cache: 'no-store', signal: AbortSignal.timeout(25000) });
        if (!res.ok) throw new Error(`Google trả về HTTP ${res.status}`);
        const text = await res.text();
        if (text.trim().startsWith('<')) throw new Error('Nhận về HTML thay vì CSV');
        return text;
      } catch (e) {
        loiCuoi = e;
      }
    }
    throw loiCuoi;
  });
  return Papa.parse(val, { header: false, skipEmptyLines: false }).data;
}

const o = (grid, i, k) => String(grid?.[i]?.[k] ?? '').trim();

/* Cột G (chỉ số 6) là TỔNG, H–S (7–18) là Tháng 1–12 */
const COT_TONG = 6;
const COT_T1 = 7;
const SO_THANG = 12;

/* Dòng khai số tháng cho từng cột — dò trong 10 dòng đầu, lấy dòng có
   nhiều ô 1..12 nhất. Nhờ dòng này mới tách được thật / dự trù. */
function dongSoThang(grid) {
  let tot = null;
  let diem = 0;
  for (let i = 0; i < Math.min(grid.length, 10); i++) {
    let d = 0;
    for (let k = COT_T1; k < COT_T1 + SO_THANG; k++) {
      const n = parseInt(o(grid, i, k), 10);
      if (n >= 1 && n <= 12) d++;
    }
    if (d > diem) { diem = d; tot = i; }
  }
  return diem >= 6 ? tot : null;
}

/* Năm của báo cáo — ô 20xx trong khối tiêu đề */
function namBaoCao(grid) {
  for (let i = 0; i < Math.min(grid.length, 10); i++) {
    for (let k = 0; k < Math.min((grid[i] || []).length, 20); k++) {
      const m = o(grid, i, k).match(/(?:^|\D)(20\d{2})(?:\D|$)/);
      if (m) return parseInt(m[1], 10);
    }
  }
  return new Date().getUTCFullYear();
}

/* Khối chỉ tiêu cấp 1: nhãn nằm ở cột B (1), cột D (3) để trống.
   Dòng có cột D là mô tả chi tiết thì thuộc cấp 2, bỏ qua. */
function timKhoi(grid, nhan) {
  const can = norm(nhan);
  for (let i = 0; i < grid.length; i++) {
    if (norm(o(grid, i, 1)) !== can) continue;
    if (o(grid, i, 3)) continue;
    return i;
  }
  return -1;
}

const NGAY_CUOI_THANG = (nam, thang) => new Date(Date.UTC(nam, thang, 0)).getUTCDate();

export async function GET(req) {
  const q = new URL(req.url).searchParams;
  const url = q.get('url');
  /* Đọc 'gids' TRƯỚC 'gid'. lib/sheetQuery.js luôn append gid=<cfg.gid||'0'>
     cho mỗi file, còn số tab thật của nguồn một-tab thì nằm ở qs.gids —
     nếu ưu tiên 'gid' thì sẽ vớ phải '0' (chuỗi rỗng mới là falsy) và đi
     đòi nhầm tab, Google trả 401 vì tab 0 không được xuất bản. */
  const gid = q.get('gids') || q.get('gid') || '1620350371';
  if (!url) return Response.json({ error: 'Thiếu url' }, { status: 400 });

  let grid;
  try {
    grid = await taiTab(url, gid);
  } catch (e) {
    return Response.json({ error: `A10GG: ${e.message}` }, { status: 502 });
  }

  const nam = namBaoCao(grid);
  const dongThang = dongSoThang(grid);

  /* Chỉ tiêu cần lấy — nhãn đúng như trong file */
  const KHOI = [
    ['pl7', 'LÃI/LỖ'],
    ['re', 'RE'],
    ['tong_chi', 'TỔNG CHI'],
    ['co', 'COGS'],
    ['se', 'SE'],
    ['me', 'ME'],
    ['op', 'OP'],
    ['ov', 'OV'],
  ];

  const dong = {};
  const thieu = [];
  for (const [key, nhan] of KHOI) {
    const i = timKhoi(grid, nhan);
    if (i < 0) thieu.push(nhan);
    dong[key] = i;
  }
  if (dong.re < 0 || dong.co < 0) {
    return Response.json(
      { error: `A10GG: không tìm thấy dòng ${thieu.join(', ')} trong tab — file có thể đã đổi cấu trúc` },
      { status: 502 }
    );
  }

  const lay = (key, k) => (dong[key] >= 0 ? viNum(o(grid, dong[key], k)) : 0);

  /* Tách tháng thật / tháng dự trù.
     Hai điều kiện, phải thoả CẢ HAI thì mới tính là số thật:
     1. Số tháng khai ở dòng 5 khớp với vị trí cột (cột dự trù được sao
        chép từ tháng gần nhất nên khai sai — vd cột Tháng 8 vẫn ghi 7).
     2. Tháng đó đã kết thúc. Chốt chặn này để phòng trường hợp file sửa
        lại dòng khai tháng cho khớp trong khi số vẫn là dự trù — thà bỏ
        sót một tháng còn hơn cộng nhầm số kế hoạch vào số thực hiện.
        Hợp với thực tế A10GG tiền về chậm ~45 ngày: tháng chưa xong thì
        chắc chắn chưa chốt được doanh thu. */
  const now = new Date();
  const namNay = now.getUTCFullYear();
  const thangNay = now.getUTCMonth() + 1;
  const daXong = (t) => nam < namNay || (nam === namNay && t < thangNay);

  const that = [];
  const duTru = [];
  for (let t = 1; t <= SO_THANG; t++) {
    const k = COT_T1 + (t - 1);
    const khaiThang = dongThang == null ? null : parseInt(o(grid, dongThang, k), 10);
    const khopKhai = dongThang == null ? true : khaiThang === t;
    const laThat = khopKhai && daXong(t);

    const re = lay('re', k);
    const co = lay('co', k);
    const rec = {
      thang: `${String(t).padStart(2, '0')}/${nam}`,
      sortKey: `${nam}${String(t).padStart(2, '0')}`,
      /* Số theo tháng — quy về ngày cuối tháng để lọc theo kỳ dùng chung
         với các nguồn theo ngày. A10GG không có số theo từng ngày. */
      ngay: `${String(NGAY_CUOI_THANG(nam, t)).padStart(2, '0')}/${String(t).padStart(2, '0')}/${nam}`,
      re,
      co,
      pl1: re - co,
      tong_chi: lay('tong_chi', k),
      pl7: lay('pl7', k),
      se: lay('se', k),
      me: lay('me', k),
      op: lay('op', k),
      ov: lay('ov', k),
      ty_le_co: re ? (co / re) * 100 : null,
      bien_pl1: re ? ((re - co) / re) * 100 : null,
    };
    (laThat ? that : duTru).push(rec);
  }

  /* Chỉ tháng THẬT mới vào tổng — số dự trù để riêng cho trang team xem */
  const tong = (k) => that.reduce((t, r) => t + (r[k] || 0), 0);
  const re = tong('re');
  const co = tong('co');
  const pl7 = tong('pl7');

  const thangThat = that.map((r) => r.thang);
  const thangDuTru = duTru.map((r) => r.thang);

  return Response.json({
    a10gg_thang: that,
    a10gg_du_tru: duTru,
    kpis: {
      re,
      co,
      pl1: re - co,
      pl7,
      tong_chi: tong('tong_chi'),
      ty_le_co: re ? (co / re) * 100 : null,
      bien_pl1: re ? ((re - co) / re) * 100 : null,
      bien_pl7: re ? (pl7 / re) * 100 : null,
    },
    meta: {
      nguon: o(grid, 0, 1) || 'FINANCIAL REPORT_A10GG',
      team: 'A10GG',
      nam,
      tre_ngay: TRE_NGAY,
      thang_that: thangThat,
      thang_du_tru: thangDuTru,
      thieu_dong: thieu,
      ghi_chu:
        `A10GG chỉ có số theo THÁNG (không có số theo ngày) và tiền về chậm khoảng ${TRE_NGAY} ngày, ` +
        'nên tháng vừa qua thường còn doanh thu 0 dù chi phí đã ghi. ' +
        `Tháng dự trù (${thangDuTru.join(', ') || 'không có'}) KHÔNG được cộng vào số tập đoàn.`,
    },
  });
}
