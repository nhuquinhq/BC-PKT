/* ============================================================
   API BÁO CÁO TIỀN — đọc file "Báo cáo TIỀN" (bộ 12 tab của PKT)
   để lên PKT3 (Dòng tiền) và PKT4 (Cân đối kế toán).

   File công bố ở dạng pubhtml CẢ SỔ nên không biết trước gid từng
   tab: đọc trang pubhtml gốc một lần để lấy bảng "tên tab → gid",
   rồi tải riêng các tab cần (đều là tab nhỏ, không đụng 2 tab sổ
   45.000 dòng).

   Trả về:
   - bclctt   : 12 tháng + luỹ kế theo từng chỉ tiêu B03a
   - kiem_soat: khối kiểm soát (lệch A−B, số GD chưa gán mã…)
   - viec_ton : việc tồn đang chặn phát hành
   - kpis     : số tổng hợp cho dải KPI
   ============================================================ */

import Papa from 'papaparse';

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
  const am = /^\(.*\)$/.test(s); /* (1.234) = số âm kiểu kế toán */
  if (am) s = s.slice(1, -1);
  if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
  else s = s.replace(/[.,](?=\d{3}\b)/g, '');
  const n = parseFloat(s);
  if (isNaN(n)) return 0;
  return am ? -n : n;
}

/* Khoá file công bố: .../d/e/{key}/pubhtml */
const pubKey = (url) => String(url || '').match(/\/spreadsheets\/d\/e\/([^/]+)/)?.[1] || '';

async function tai(url, timeout = 25000) {
  const res = await fetch(url, { redirect: 'follow', cache: 'no-store', signal: AbortSignal.timeout(timeout) });
  if (!res.ok) throw new Error(`Google trả về HTTP ${res.status}`);
  return res.text();
}

/* Trang pubhtml cả sổ có menu tab kèm gid — bóc thành map tên → gid */
async function mapGid(key) {
  const html = await tai(`https://docs.google.com/spreadsheets/d/e/${key}/pubhtml`);
  const map = new Map();
  for (const m of html.matchAll(/#gid=(\d+)['"][^>]*>([^<]+)</g)) map.set(norm(m[2]), m[1]);
  for (const m of html.matchAll(/\{"name":\s*"([^"]+)",\s*"gid":\s*"?(\d+)/g)) map.set(norm(m[1]), m[2]);
  return map;
}

async function taiTab(key, gid) {
  const text = await tai(`https://docs.google.com/spreadsheets/d/e/${key}/pub?gid=${gid}&single=true&output=csv`);
  if (text.trim().startsWith('<')) throw new Error('Nhận về HTML thay vì CSV');
  return Papa.parse(text, { header: false, skipEmptyLines: false }).data;
}

const THANG = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];

/* Tab 7_BCLCTT: dòng tiêu đề có "CHỈ TIÊU" + "Mã số" + 12 cột tháng */
function docBclctt(grid) {
  let h = -1;
  for (let i = 0; i < Math.min(grid.length, 15); i++) {
    const r = (grid[i] || []).map(norm);
    if (r.includes('chi tieu') && r.some((x) => x === 'ma so')) { h = i; break; }
  }
  if (h < 0) throw new Error('Không thấy dòng tiêu đề tab 7_BCLCTT');
  const head = (grid[h] || []).map(norm);
  const cT1 = head.indexOf('thang 1');
  const cLuy = head.findIndex((x) => x.startsWith('luy ke'));
  const cMa = head.indexOf('ma so');

  const rows = [];
  const ks = []; /* khối kiểm soát nằm dưới, tiêu đề riêng */
  let trongKiemSoat = false;
  for (let i = h + 1; i < grid.length; i++) {
    const r = grid[i] || [];
    const ten = String(r[0] ?? '').trim();
    if (!ten) continue;
    const nt = norm(ten);
    if (nt.startsWith('khoi kiem soat')) { trongKiemSoat = true; continue; }
    if (nt === 'chi tieu kiem soat') continue;
    const thang = {};
    for (let k = 0; k < 12; k++) thang[`t${k + 1}`] = viNum(r[cT1 + k]);
    const luy = cLuy >= 0 ? viNum(r[cLuy]) : Object.values(thang).reduce((a, b) => a + b, 0);
    const ma = cMa >= 0 ? String(r[cMa] ?? '').trim() : '';
    const rec = { chi_tieu: ten, ma, ...thang, luy_ke: luy };
    if (trongKiemSoat) {
      /* dòng E là chữ OK/LỆCH — giữ nguyên chữ để hiện trạng thái */
      const chu = String(r[cT1 + 6] ?? '').trim();
      ks.push({ ...rec, trang_thai: /ok|lech|lệch/i.test(chu) ? chu : '' });
    } else if (!/^(i|ii|iii)\./i.test(nt) && !nt.startsWith('ma 38') && !nt.startsWith('trinh tu') && !nt.startsWith('ba dieu kien') && !nt.startsWith('rieng ma 37')) {
      rows.push(rec);
    }
  }
  return { rows, ks };
}

/* Tab 0_DASHBOARD: bóc các khối trạng thái + việc tồn (cột A/B/C/D).
   ver4 đổi tên khối: A đối soát sao kê · C sổ chi phí · E việc tồn. */
function docDashboard(grid) {
  const lay = (...dau) => {
    const out = [];
    let bat = false;
    for (const r of grid) {
      const a = String(r?.[0] ?? '').trim();
      if (!a && !bat) continue;
      const na = norm(a);
      if (!bat && dau.some((d) => na.startsWith(d))) { bat = true; continue; }
      if (!bat) continue;
      if (/^[a-h]\.\s/i.test(a)) break; /* sang khối chữ cái kế tiếp */
      if (!a) continue;
      out.push({ a, b: r?.[1] ?? '', c: r?.[2] ?? '', d: r?.[3] ?? '' });
    }
    return out;
  };
  return {
    hach_toan: lay('a. tinh trang doi soat', 'a. tinh trang hach toan'),
    chi_phi: lay('c. so chi phi'),
    viec_ton: lay('e. viec ton', 'g. viec ton'),
  };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');
  if (!url) return Response.json({ error: 'Thiếu url' }, { status: 400 });
  const key = pubKey(url);
  if (!key) return Response.json({ error: 'URL không phải dạng công bố /d/e/…' }, { status: 400 });

  try {
    const gids = await mapGid(key);
    const tim = (ten) => {
      const n = norm(ten);
      for (const [k, v] of gids) if (k === n || k.startsWith(n)) return v;
      return null;
    };
    /* ver4 tách 3 bản: VNĐ · ngoại tệ quy đổi · tổng hợp (bản chính thức).
       ver3 chỉ có một bản tên 7_BCLCTT — vẫn đọc được để không gãy. */
    const gBc = searchParams.get('gid_bclctt') || tim('9_bclctt_tong_hop') || tim('7_bclctt');
    const gVnd = tim('7_bclctt_vnd');
    const gUsd = tim('8_bclctt_usd');
    const gDb = searchParams.get('gid_dashboard') || tim('0_dashboard');
    if (!gBc) throw new Error(`Không tìm thấy tab BCLCTT trong file (các tab đọc được: ${[...gids.keys()].join(', ') || 'không đọc được menu tab'})`);

    const [gridBc, gridDb, gridVnd, gridUsd] = await Promise.all([
      taiTab(key, gBc),
      gDb ? taiTab(key, gDb).catch(() => []) : Promise.resolve([]),
      gVnd ? taiTab(key, gVnd).catch(() => []) : Promise.resolve([]),
      gUsd ? taiTab(key, gUsd).catch(() => []) : Promise.resolve([]),
    ]);

    const { rows, ks } = docBclctt(gridBc);
    const db = gridDb.length ? docDashboard(gridDb) : { hach_toan: [], chi_phi: [], viec_ton: [] };

    /* Bảng "dòng tiền theo loại tiền": ghép luỹ kế của bản VNĐ và bản ngoại tệ */
    let theoTien = [];
    if (gridVnd.length || gridUsd.length) {
      const mapLuy = (grid) => {
        try {
          const m = new Map();
          for (const r of docBclctt(grid).rows) if (r.ma) m.set(r.ma, r.luy_ke);
          return m;
        } catch { return new Map(); }
      };
      const mv = mapLuy(gridVnd);
      const mu = mapLuy(gridUsd);
      theoTien = rows
        .filter((r) => r.ma)
        .map((r) => ({
          ma: r.ma,
          chi_tieu: r.chi_tieu,
          vnd: mv.get(r.ma) ?? 0,
          ngoai_te_qd: mu.get(r.ma) ?? 0,
          tong: r.luy_ke,
        }));
    }

    const lay = (ma) => rows.find((r) => r.ma === ma) || {};
    const ocf = lay('20').luy_ke || 0;
    const icf = lay('30').luy_ke || 0;
    const fcf = lay('40').luy_ke || 0;
    const thuan = lay('50').luy_ke || 0;
    const dauKy = lay('60').t1 || 0;
    const cuoiKy = lay('70').luy_ke || 0;
    const thu = ['01', '06', '22', '24', '26', '27', '31', '33'].reduce((t, m) => t + (lay(m).luy_ke || 0), 0);
    const chi = ['02', '03', '04', '05', '07', '21', '23', '25', '32', '34', '35', '36'].reduce((t, m) => t + (lay(m).luy_ke || 0), 0);
    const lechKs = ks.find((r) => norm(r.chi_tieu).startsWith('c. chenh lech'))?.luy_ke || 0;
    const chuaGan = ks.find((r) => norm(r.chi_tieu).startsWith('d. so gd chua gan'))?.luy_ke || 0;
    const trangThai = ks.find((r) => norm(r.chi_tieu).startsWith('e. kiem tra'))?.trang_thai || '';

    return Response.json({
      bclctt: rows,
      theo_tien: theoTien,
      kiem_soat: ks,
      dashboard: db,
      kpis: {
        tien_dau_ky: dauKy,
        tong_thu: thu,
        tong_chi: chi,
        tien_cuoi_ky: cuoiKy,
        ocf,
        icf,
        fcf,
        luu_chuyen_thuan: thuan,
        lech_doi_soat: lechKs,
        gd_chua_gan_ma: chuaGan,
      },
      meta: {
        trang_thai_doi_soat: trangThai || 'không đọc được',
        so_dong_bclctt: rows.length,
        tabs: [...gids.keys()].slice(0, 20),
      },
    });
  } catch (e) {
    return Response.json({ error: `Không đọc được Báo cáo TIỀN: ${e.message}` }, { status: 502 });
  }
}
