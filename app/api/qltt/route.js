/* ============================================================
   API CPV QLTT (C100 + C200) — hai team WGG và VX101.

   - T1–T6 đã chốt: nằm trong datalake lib/data/qltt-2026.json.
   - Tháng đang chạy: đọc trực tiếp file Google cùng khuôn. File có mấy
     chục tab (Bán nick T7, DV Tự động T7, …) mà bản công bố chỉ cho một
     đường dẫn gốc, nên phải dò gid của từng tab từ menu của trang
     pubhtml rồi mới xuất CSV từng tab.

   Quy ước giống bản chốt:
   - Cột dò THEO TÊN tiêu đề (dòng 7) chứ không theo số thứ tự — các
     tháng không giống nhau, đã gặp tab thêm bớt cột giữa chừng.
   - AST tính vào VX101.
   - Giá vốn của CTV Ngoài xếp vào AR (phải trả NCC), còn lại vào CO.
   ============================================================ */

import Papa from 'papaparse';
import HIST from '@/lib/data/qltt-2026.json';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const chuan = (s) =>
  String(s ?? '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

function viNum(raw) {
  let s = String(raw ?? '').trim().replace(/\s/g, '');
  if (!s || s === '-') return 0;
  if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
  else s = s.replace(/[.,](?=\d{3}\b)/g, '');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

/* Ngày trên file có thể là 2026-04-01 00:00:00 hoặc 01/04/2026 */
function parseNgay(v) {
  const s = String(v ?? '').trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return { y: m[1], m: m[2].padStart(2, '0'), d: m[3].padStart(2, '0') };
  m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (m) return { y: m[3], m: m[2].padStart(2, '0'), d: m[1].padStart(2, '0') };
  return null;
}

const team = (v) => {
  const t = String(v ?? '').trim().toUpperCase();
  if (t.startsWith('WGG')) return 'WGG';
  if (t === 'VX101' || t === 'AST') return 'VX101';
  return 'Chưa phân loại';
};

/* Họ tab → tên cột cần tìm (khớp theo chuỗi con đã bỏ dấu) */
const HO = [
  { ten: 'ban nick', date: ['thoi gian ban'], dt: ['doanh thu'], gv: ['gia von ban nick'], team: ['pl team'], ctv: ['pl ctv'], nhom: 'ban_nick' },
  { ten: 'dv tu dong', date: ['ngay hoan tat'], dt: ['tri gia'], gv: ['gia von dv tu dong'], team: ['team'], ctv: [], nhom: 'dv_tu_dong' },
  { ten: 'doanh thu minigame', date: ['thoi gian'], dt: ['tong tien'], gv: [], team: ['phan loai team'], ctv: [], nhom: 'minigame' },
  { ten: 'dt - gv dv thu cong', date: ['ngay hoan tat'], dt: ['tri gia'], gv: ['gia von chuan dv thu cong'], team: ['phan loai shop'], ctv: ['phan loai ctv'], nhom: 'dv_thu_cong' },
  { ten: 'gia von minigame tu dong', date: ['ngay hoan tat'], dt: [], gv: ['gia von rut minigame'], team: ['team'], ctv: [], nhom: 'minigame' },
  { ten: 'gia von minigame thu cong', date: ['ngay hoan tat'], dt: [], gv: ['gia von minigame'], team: [], ctv: [], nhom: 'minigame' },
  { ten: 'gia von minigame rut vat pham', date: ['thoi gian hoan tat'], dt: [], gv: ['gia von minigame'], team: ['phan loai shop'], ctv: [], nhom: 'minigame' },
];

const khoaPub = (url) => (String(url || '').match(/\/spreadsheets\/d\/e\/([^/]+)/) || [])[1] || '';

async function tai(u, han = 60000) {
  const res = await fetch(u, { redirect: 'follow', cache: 'no-store', signal: AbortSignal.timeout(han) });
  if (!res.ok) throw new Error(`Google trả về HTTP ${res.status}`);
  return res.text();
}

/* Danh sách tab → gid.

   Ưu tiên tham số tabs khai trong cấu hình (dạng "tên tab:gid;tên tab:gid").
   Không có thì dò menu của trang pubhtml: khi file được xuất bản ở chế độ
   TOÀN BỘ TÀI LIỆU, Google render <li id="sheet-button-<gid>"><a>Tên</a>.
   Nếu file chỉ xuất bản MỘT TAB thì trang đó không có menu — lúc ấy phải
   xuất bản lại hoặc khai gid tay, nên báo hẳn ra cho biết đường xử lý. */
async function doGid(url, tabs) {
  const map = new Map();
  for (const phan of String(tabs || '').split(';')) {
    const i = phan.lastIndexOf(':');
    if (i > 0) map.set(chuan(phan.slice(0, i)), phan.slice(i + 1).trim());
  }
  if (map.size) return map;

  const key = khoaPub(url);
  if (!key) throw new Error('Đường dẫn không phải bản công bố /d/e/…');
  const html = await tai(`https://docs.google.com/spreadsheets/d/e/${key}/pubhtml`, 90000);
  const re = /id="sheet-button-(\d+)"[^>]*>\s*<a[^>]*>([^<]*)</g;
  let m;
  while ((m = re.exec(html))) map.set(chuan(m[2]), m[1]);
  if (!map.size) {
    throw new Error(
      'bản công bố của file đang ở chế độ MỘT TAB nên trang pubhtml không có menu tab. ' +
      'Mở file → Tệp → Chia sẻ → Xuất bản lên web → chọn "Toàn bộ tài liệu" rồi xuất bản lại; ' +
      'hoặc gửi gid từng tab để khai thẳng vào cấu hình.'
    );
  }
  return map;
}

function timCot(tieuDe, ten) {
  for (const t of ten) {
    const i = tieuDe.findIndex((h) => h.includes(t));
    if (i >= 0) return i;
  }
  return -1;
}

/* Một tab chi tiết → các dòng {ngay, team, nhom, gmv, co, ar, don} */
function docTab(grid, cfg) {
  /* Tiêu đề ở dòng 7 của file gốc, nhưng dò lại cho chắc */
  let hi = 6;
  for (let i = 0; i < Math.min(grid.length, 12); i++) {
    const h = (grid[i] || []).map(chuan);
    if (timCot(h, cfg.date) >= 0 && (!cfg.gv.length || timCot(h, cfg.gv) >= 0)) { hi = i; break; }
  }
  const tieuDe = (grid[hi] || []).map(chuan);
  const cNgay = timCot(tieuDe, cfg.date);
  const cDt = cfg.dt.length ? timCot(tieuDe, cfg.dt) : -1;
  const cGv = cfg.gv.length ? timCot(tieuDe, cfg.gv) : -1;
  let cTeam = cfg.team.length ? timCot(tieuDe, cfg.team) : -1;
  if (cTeam < 0 && cfg.team.length && cGv >= 0) cTeam = cGv + 1; /* vài tháng bỏ trống ô tiêu đề */
  const cCtv = cfg.ctv.length ? timCot(tieuDe, cfg.ctv) : -1;
  const cTt = timCot(tieuDe, ['trang thai']);
  if (cNgay < 0 || (cfg.dt.length && cDt < 0) || (cfg.gv.length && cGv < 0)) {
    throw new Error(`thiếu cột (ngày=${cNgay} doanh thu=${cDt} giá vốn=${cGv})`);
  }

  const out = [];
  for (let i = hi + 1; i < grid.length; i++) {
    const r = grid[i] || [];
    const dt = parseNgay(r[cNgay]);
    if (!dt) continue;
    /* Chỉ tính đơn thành công. Từ T5 có thêm "Đã bán chờ xác nhận" và
       "Hoàn tất đợi xác nhận" nên khớp theo phần đầu chuỗi; loại Hủy /
       Từ chối / Thất bại / Đang check thông tin. */
    if (cTt >= 0) {
      const tt = chuan(r[cTt]);
      if (!tt.startsWith('hoan tat') && !tt.startsWith('da ban')) continue;
    }
    const ngoai = cCtv >= 0 && chuan(r[cCtv]) === 'ctv ngoai';
    const gv = cGv >= 0 ? viNum(r[cGv]) : 0;
    out.push({
      ngay: `${dt.d}/${dt.m}/${dt.y}`,
      sortKey: `${dt.y}${dt.m}${dt.d}`,
      thang: `${dt.m}/${dt.y}`,
      team: team(cTeam >= 0 ? r[cTeam] : ''),
      nhom: cfg.nhom,
      gmv: cDt >= 0 ? viNum(r[cDt]) : 0,
      ar: ngoai ? gv : 0,
      co: ngoai ? 0 : gv,
      don: cDt >= 0 ? 1 : 0,
    });
  }
  return out;
}

const CONG = ['gmv', 'co', 'ar', 'so_don', 'gmv_ban_nick', 'gmv_dv_tu_dong', 'gmv_dv_thu_cong',
  'gmv_minigame', 'co_ban_nick', 'co_dv_tu_dong', 'co_dv_thu_cong', 'co_minigame'];

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');
  const thangLive = (searchParams.get('thang') || '')
    .split(',').map((x) => parseInt(x, 10)).filter(Boolean);

  /* Bản chốt trước, tháng đọc trực tiếp ĐÈ LÊN theo từng ngày × team */
  const theoKhoa = new Map();
  for (const r of HIST.ngay) theoKhoa.set(`${r.ngay}|${r.team}`, { ...r, nguon: 'Bản chốt' });

  const loi = [];
  let soTab = 0;
  if (url && thangLive.length) {
    try {
      const gid = await doGid(url, searchParams.get('tabs'));
      const key = khoaPub(url);
      const viec = [];
      for (const t of thangLive) {
        for (const cfg of HO) {
          /* tên tab kiểu "Bán nick T7"; tab rút vật phẩm gộp cả năm nên không có số tháng */
          for (const [ten, g] of gid) {
            if (ten === `${cfg.ten} t${t}` || (cfg.nhom === 'minigame' && ten.startsWith(cfg.ten) && !/t\d+$/.test(ten) && t === thangLive[0])) {
              viec.push({ ten, g, cfg });
            }
          }
        }
      }
      const ketQua = await Promise.all(
        viec.map(({ ten, g, cfg }) =>
          tai(`https://docs.google.com/spreadsheets/d/e/${key}/pub?gid=${g}&single=true&output=csv`, 90000)
            .then((txt) => ({ ten, cfg, grid: Papa.parse(txt, { header: false, skipEmptyLines: false }).data }))
            .catch((e) => ({ ten, err: e }))
        )
      );
      /* Ngày nào có dữ liệu live thì bỏ hẳn bản chốt của ngày đó rồi cộng lại
         từ đầu — nếu không sẽ cộng chồng lên số đã chốt. */
      const song = new Map();
      for (const kq of ketQua) {
        if (kq.err) { loi.push(`${kq.ten}: ${kq.err.message}`); continue; }
        let rows;
        try { rows = docTab(kq.grid, kq.cfg); } catch (e) { loi.push(`${kq.ten}: ${e.message}`); continue; }
        soTab++;
        for (const r of rows) {
          const k = `${r.ngay}|${r.team}`;
          const a = song.get(k) || {
            ngay: r.ngay, sortKey: r.sortKey, thang: r.thang, team: r.team,
            ...Object.fromEntries(CONG.map((c) => [c, 0])),
          };
          a.gmv += r.gmv; a.co += r.co; a.ar += r.ar; a.so_don += r.don;
          a[`gmv_${r.nhom}`] += r.gmv;
          a[`co_${r.nhom}`] += r.co + r.ar;
          song.set(k, a);
        }
      }
      for (const [k, v] of song) theoKhoa.set(k, { ...v, nguon: 'Đọc trực tiếp' });
    } catch (e) {
      loi.push(e.message);
    }
  }

  const ngay = [...theoKhoa.values()]
    .sort((a, b) => (a.sortKey === b.sortKey ? a.team.localeCompare(b.team) : a.sortKey < b.sortKey ? -1 : 1))
    .map((r) => {
      const cogs = (r.co || 0) + (r.ar || 0);
      const pl1 = (r.gmv || 0) - cogs;
      return {
        ...r, cogs, pl1,
        ty_le_co: r.gmv ? (cogs / r.gmv) * 100 : null,
        bien_pl1: r.gmv ? (pl1 / r.gmv) * 100 : null,
      };
    });

  const gop = (rows, khoa, nhan) => {
    const m = new Map();
    for (const r of rows) {
      const k = r[khoa];
      const a = m.get(k) || { [khoa]: k, sortKey: r.sortKey, nguon: r.nguon,
        ...Object.fromEntries([...CONG, 'cogs', 'pl1'].map((c) => [c, 0])) };
      for (const c of [...CONG, 'cogs', 'pl1']) a[c] += r[c] || 0;
      if (r.nguon === 'Đọc trực tiếp') a.nguon = 'Đọc trực tiếp';
      if (r.sortKey < a.sortKey) a.sortKey = r.sortKey;
      m.set(k, a);
    }
    return [...m.values()].map((r) => ({
      ...r,
      ty_le_co: r.gmv ? (r.cogs / r.gmv) * 100 : null,
      bien_pl1: r.gmv ? (r.pl1 / r.gmv) * 100 : null,
    })).sort(nhan);
  };

  const theoThang = gop(ngay, 'thang', (a, b) =>
    (a.thang.slice(3) + a.thang.slice(0, 2)).localeCompare(b.thang.slice(3) + b.thang.slice(0, 2)));
  const theoTeam = gop(ngay, 'team', (a, b) => b.gmv - a.gmv);

  const t = (k) => ngay.reduce((s, r) => s + (r[k] || 0), 0);
  const gmv = t('gmv');
  const cogs = t('cogs');
  return Response.json({
    qltt_ngay: ngay,
    qltt_thang: theoThang,
    qltt_team: theoTeam,
    kpis: {
      gmv, co: t('co'), ar: t('ar'), cogs, pl1: gmv - cogs,
      so_don: t('so_don'),
      ty_le_co: gmv ? (cogs / gmv) * 100 : null,
      bien_pl1: gmv ? ((gmv - cogs) / gmv) * 100 : null,
    },
    meta: {
      nguon: HIST.nguon,
      don_vi: HIST.don_vi,
      ghi_chu: HIST.ghi_chu,
      so_tab_doc_truc_tiep: soTab,
      loi_doc_live: loi.length ? loi.join(' · ') : null,
    },
  });
}
