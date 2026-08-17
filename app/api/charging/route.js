/* ============================================================
   API CPV dự án CHARGING — nguồn "FINANCIAL REPORT_CHARGING_TOA".

   Cùng họ bảng TOA với A10GG nhưng khác ba chỗ, phải xử lý riêng:
   1. Nhãn chỉ tiêu nằm ở CỘT A (không phải cột B), TOTAL ở cột C, các
      tháng từ cột D trở đi. Dòng tiêu đề ghi tháng kiểu 12026 · 22026 …
      102026 (tháng rồi năm) — đọc thẳng từ đó nên thêm/bớt cột vẫn đúng.
   2. Số viết kiểu Mỹ: 11,990,328,820 (phẩy ngăn nghìn) chứ không phải
      kiểu Việt như A10GG. Số âm để trong ngoặc: (929,860).
   3. KHÔNG có cột dự trù sao chép như A10GG. Các tháng chưa tới có
      RE = COGS = 0 nhưng OP vẫn ghi sẵn một khoản phân bổ đều, kéo PL7
      xuống âm. Cộng mấy tháng đó vào là ghi khống lỗ, nên chỉ lấy tháng
      đã tới (≤ tháng hiện tại).
   ============================================================ */

import Papa from 'papaparse';
import { nhoDocFile } from '@/lib/boNho';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const norm = (s) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/đ/gi, 'd')
    .replace(/\s+/g, ' ')
    .trim();

/* Nhận cả kiểu Mỹ (1,234,567.89) lẫn kiểu Việt (1.234.567,89):
   dấu nào xuất hiện SAU CÙNG và còn ≤ 2 chữ số phía sau thì đó là dấu
   thập phân, dấu còn lại là ngăn nghìn. Số âm để trong ngoặc. */
function viNum(raw) {
  let s = String(raw ?? '').trim().replace(/\s/g, '').replace(/%$/, '');
  if (!s || s === '-') return 0;
  let am = false;
  if (/^\(.*\)$/.test(s)) { am = true; s = s.slice(1, -1); }
  if (s.startsWith('-')) { am = true; s = s.slice(1); }
  const cham = s.lastIndexOf('.');
  const phay = s.lastIndexOf(',');
  let thapPhan = '';
  if (cham >= 0 && phay >= 0) thapPhan = cham > phay ? '.' : ',';
  else if (cham >= 0) thapPhan = s.length - cham - 1 <= 2 ? '.' : '';
  else if (phay >= 0) thapPhan = s.length - phay - 1 <= 2 ? ',' : '';
  if (thapPhan === '.') s = s.replace(/,/g, '');
  else if (thapPhan === ',') s = s.replace(/\./g, '').replace(',', '.');
  else s = s.replace(/[.,]/g, '');
  const n = parseFloat(s);
  if (isNaN(n)) return 0;
  return am ? -n : n;
}

function csvUrl(url, gid) {
  const pub = String(url || '').match(/\/spreadsheets\/d\/e\/([^/]+)/);
  if (!pub) return null;
  return `https://docs.google.com/spreadsheets/d/e/${pub[1]}/pub?gid=${gid}&single=true&output=csv`;
}

async function taiTab(url, gid, moi = false) {
  const u = csvUrl(url, gid);
  if (!u) throw new Error('Link Charging không phải link đã công bố');
  const { val } = await nhoDocFile(`charging|${u}`, async () => {
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
  }, { moi });
  return Papa.parse(val, { header: false, skipEmptyLines: false }).data;
}

const o = (grid, i, k) => String(grid?.[i]?.[k] ?? '').trim();

/* Dòng tiêu đề: ô cột A ghi "THAM SỐ". Từ đó đọc ra cột nào là tháng nào
   qua các ô kiểu 12026 (tháng 1 năm 2026) hoặc 102026 (tháng 10). */
function docCotThang(grid) {
  for (let i = 0; i < Math.min(grid.length, 40); i++) {
    if (norm(o(grid, i, 0)) !== 'tham so') continue;
    const cot = [];
    for (let k = 2; k < (grid[i] || []).length; k++) {
      const m = o(grid, i, k).replace(/\s/g, '').match(/^(\d{1,2})(\d{4})$/);
      if (m) {
        const thang = parseInt(m[1], 10);
        const nam = parseInt(m[2], 10);
        if (thang >= 1 && thang <= 12) cot.push({ k, thang, nam });
      }
    }
    if (cot.length) return { dong: i, cot };
  }
  return null;
}

/* Dòng chỉ tiêu: khớp CHÍNH XÁC nhãn ở cột A. Các dòng tỉ lệ đều bắt đầu
   bằng '%' nên không đụng nhau (vd '%PL7/RE' khác 'PL7'). */
function timDong(grid, nhan) {
  const can = norm(nhan);
  for (let i = 0; i < grid.length; i++) if (norm(o(grid, i, 0)) === can) return i;
  return -1;
}

const NGAY_CUOI_THANG = (nam, thang) => new Date(Date.UTC(nam, thang, 0)).getUTCDate();

export async function GET(req) {
  const q = new URL(req.url).searchParams;
  /* moi=1: bỏ qua bản nhớ, đọc lại Google. Trình duyệt gửi tham số này ở lượt
     hỏi lại sau khi đã hiện số cũ — thiếu chỗ nhận thì lượt đó vô nghĩa. */
  const moi = q.get('moi') === '1';
  const url = q.get('url');
  /* Đọc 'gids' TRƯỚC 'gid' — sheetQuery luôn append gid=<cfg.gid||'0'> nên
     ưu tiên 'gid' sẽ vớ phải '0' và đòi nhầm tab (đã dính ở /api/a10gg). */
  const gid = q.get('gids') || q.get('gid') || '894789387';
  if (!url) return Response.json({ error: 'Thiếu url' }, { status: 400 });

  let grid;
  try {
    grid = await taiTab(url, gid, moi);
  } catch (e) {
    return Response.json({ error: `Charging: ${e.message}` }, { status: 502 });
  }

  const hdr = docCotThang(grid);
  if (!hdr) {
    return Response.json(
      { error: 'Charging: không tìm thấy dòng tiêu đề tháng (ô "THAM SỐ") — file có thể đã đổi cấu trúc' },
      { status: 502 }
    );
  }

  const CHI_TIEU = [
    ['re', 'RE'], ['co', 'COGS'],
    ['pl1a', 'PL1A'], ['pl1b', 'PL1B'], ['pl2', 'PL2'], ['pl7', 'PL7'],
    ['se', 'SE'], ['me', 'ME'], ['op', 'OP'], ['ov', 'OV'],
    ['fi', 'FI'], ['ca', 'CA'], ['ot', 'OT'],
  ];
  const dong = {};
  const thieu = [];
  for (const [key, nhan] of CHI_TIEU) {
    const i = timDong(grid, nhan);
    if (i < 0) thieu.push(nhan);
    dong[key] = i;
  }
  if (dong.re < 0 || dong.co < 0) {
    return Response.json(
      { error: `Charging: không thấy dòng ${thieu.join(', ')} — file có thể đã đổi cấu trúc` },
      { status: 502 }
    );
  }

  const now = new Date();
  const namNay = now.getUTCFullYear();
  const thangNay = now.getUTCMonth() + 1;
  /* Tháng đã tới thì là số thật; tháng chưa tới chỉ là khoản phân bổ
     ghi trước (OP), cộng vào sẽ thành ghi khống lỗ. */
  const daToi = (thang, nam) => nam < namNay || (nam === namNay && thang <= thangNay);

  const lay = (key, k) => (dong[key] >= 0 ? viNum(o(grid, dong[key], k)) : 0);

  const that = [];
  const chuaToi = [];
  for (const { k, thang, nam } of hdr.cot) {
    const re = lay('re', k);
    const co = lay('co', k);
    const pl7 = lay('pl7', k);
    const rec = {
      thang: `${String(thang).padStart(2, '0')}/${nam}`,
      sortKey: `${nam}${String(thang).padStart(2, '0')}`,
      /* Chỉ có số theo THÁNG — ghi vào ngày cuối tháng để lọc theo kỳ
         dùng chung được với các nguồn theo ngày. */
      ngay: `${String(NGAY_CUOI_THANG(nam, thang)).padStart(2, '0')}/${String(thang).padStart(2, '0')}/${nam}`,
      re,
      /* File không tách GMV riêng — lấy RE làm GMV cho đồng nhất với các
         đơn vị khác trên báo cáo tập đoàn. */
      gmv: re,
      co,
      pl1: re - co,
      pl2: lay('pl2', k),
      pl7,
      se: lay('se', k),
      me: lay('me', k),
      op: lay('op', k),
      ov: lay('ov', k),
      fi: lay('fi', k),
      ca: lay('ca', k),
      ot: lay('ot', k),
      tong_chi: 0,
      ty_le_co: re ? (co / re) * 100 : null,
      bien_pl1: re ? ((re - co) / re) * 100 : null,
      bien_pl7: re ? (pl7 / re) * 100 : null,
    };
    rec.tong_chi = rec.co + rec.se + rec.me + rec.op + rec.ov + rec.fi + rec.ca + rec.ot;
    for (const kk of ['co', 'se', 'me', 'op', 'ov']) {
      rec[`ty_le_${kk}`] = re ? (rec[kk] / re) * 100 : null;
    }
    (daToi(thang, nam) ? that : chuaToi).push(rec);
  }

  const tong = (kk) => that.reduce((t, r) => t + (r[kk] || 0), 0);
  const re = tong('re');
  const co = tong('co');
  const pl7 = tong('pl7');

  return Response.json({
    charging_thang: that,
    charging_chua_toi: chuaToi,
    kpis: {
      re,
      gmv: re,
      co,
      pl1: re - co,
      pl2: tong('pl2'),
      pl7,
      tong_chi: tong('tong_chi'),
      ty_le_co: re ? (co / re) * 100 : null,
      bien_pl1: re ? ((re - co) / re) * 100 : null,
      bien_pl7: re ? (pl7 / re) * 100 : null,
    },
    meta: {
      nguon: o(grid, 0, 0) || 'FINANCIAL REPORT_CHARGING',
      team: 'Charging',
      thang_that: that.map((r) => r.thang),
      thang_chua_toi: chuaToi.map((r) => r.thang),
      thieu_dong: thieu,
      ghi_chu:
        'Charging chỉ có số theo THÁNG (không có số theo ngày). Các tháng chưa tới ' +
        'vẫn ghi sẵn khoản phân bổ OP nên PL7 âm — những tháng đó KHÔNG được cộng ' +
        'vào số thật và cũng không vào báo cáo tập đoàn.',
    },
  });
}
