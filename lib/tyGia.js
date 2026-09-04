/* ============================================================
   TỶ GIÁ TUẦN — REV (doanh thu) và CO (giá vốn)

   Nguồn chuẩn: tab tỷ giá tuần (gid 1739295342) của file
   "HQS - BẢNG TỶ GIÁ HÀNG TUẦN". Bảng trải NGANG: mỗi tuần một khối cột,
   các dòng mốc là YEAR · MONTH · WEEK · DAYS, còn hai dòng số là
   "REV Rate" và "CO Rate" trong khối ER2 USDT/VND.

   HAI tỷ giá, đừng dùng lẫn:
   - REV → quy đổi DOANH THU
   - CO  → quy đổi GIÁ VỐN, cao hơn REV khoảng 520 đ

   Và nhớ đúng công thức:
     Thành tiền (GMV VND) = DThu thực nhận (USD) × REV
   chứ KHÔNG phải Doanh thu gộp × REV. Lấy nhầm doanh thu gộp thì tỷ giá suy
   ngược ra vống lên đúng bằng phần phí sàn — đã dính một lần, bot báo 26.073
   trong khi REV thật là 25.282.

   Đọc SỐNG từ file, hụt thì lùi về bảng tĩnh lib/data/ty-gia-tuan.json.
   Vì sao cần bản dự phòng: trước đây bảng tĩnh phải cập nhật tay mỗi tuần,
   quên là cả tháng 9 bị áp tỷ giá của tuần 17/08. Nhưng Google cũng có lúc
   xuất hụt, nên bỏ hẳn bảng tĩnh thì lại thành quy đổi bằng 0.
   ============================================================ */

import BANG from '@/lib/data/ty-gia-tuan.json';
import { nhoDoc } from '@/lib/boNho';

const TAB_TY_GIA =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vRBzYH7dMHHBU1PhVf368oCNlLhKhGFclc4VuH9nucqShlrk5fxbYtUUBUUAbYXzm7c3nXO6P7Yb9vQ/pub?gid=1739295342&single=true&output=csv';

/* dd/mm/yyyy → yyyymmdd, cùng dạng sortKey của /api/cpv để so chuỗi là ra
   đúng thứ tự thời gian, khỏi dựng Date cho từng dòng đơn. */
const khoa = (ngay) => {
  const m = String(ngay || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m ? `${m[3]}${m[2].padStart(2, '0')}${m[1].padStart(2, '0')}` : '';
};

const sapMoc = (moc) =>
  moc
    .map((m) => ({ khoa: khoa(m.tu), re: Number(m.re) || 0, co: Number(m.co) || 0 }))
    .filter((m) => m.khoa && m.re > 0)
    .sort((a, b) => (a.khoa < b.khoa ? 1 : -1));

const MOC_TINH = sapMoc(BANG.moc || []);

const so = (s) => {
  const t = String(s ?? '').trim().replace(/\s/g, '');
  if (!t) return 0;
  const n = parseFloat(t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t.replace(/\./g, ''));
  return Number.isFinite(n) ? n : 0;
};

/* Bóc bảng ngang thành danh sách mốc. Bám NHÃN dòng chứ không bám số thứ tự
   dòng: hai tab tỷ giá xếp REV/CO ở dòng khác nhau, và người ta còn chèn dòng. */
function bocBang(csv) {
  const grid = csv.split(/\r?\n/).map((d) => d.split(','));
  const nhan = (r) => (r || []).slice(0, 4).map((c) => String(c || '').replace(/"/g, '').trim()).filter(Boolean).join(' ').toLowerCase();
  let iNam = -1, iThang = -1, iTuan = -1, iRe = -1, iCo = -1;
  for (let i = 0; i < grid.length; i++) {
    const k = nhan(grid[i]);
    if (iNam < 0 && k === 'year') iNam = i;
    if (iThang < 0 && k === 'month') iThang = i;
    if (iTuan < 0 && k === 'week') iTuan = i;
    if (iRe < 0 && k.includes('rev rate')) iRe = i;
    if (iCo < 0 && k.includes('co rate')) iCo = i;
  }
  if (iNam < 0 || iThang < 0 || iRe < 0) throw new Error('Không nhận ra dòng YEAR / MONTH / REV Rate');

  const o = (i, j) => String(grid[i]?.[j] ?? '').replace(/"/g, '').trim();
  const rong = Math.max(...grid.map((r) => r.length));
  const ra = [];
  for (let j = 2; j < rong; j++) {
    if (!/^\d{1,2}$/.test(o(iTuan, j))) continue;
    const nam = Number(o(iNam, j));
    const thang = Number(o(iThang, j));
    const re = so(o(iRe, j));
    const co = so(o(iCo, j));
    /* Tuần chưa nhập tỷ giá để 0 — bỏ qua, để ngày đó lùi về tuần gần nhất
       CÓ số thay vì quy đổi bằng 0. */
    if (!nam || !thang || re <= 0) continue;
    /* Chỉ có ngày đầu tuần dạng "31/8" nên ghép năm từ dòng YEAR. Đầu khối
       cột chính là ngày bắt đầu tuần. */
    ra.push({ tu: `${o(iTuan, j)}`, khoa: '', nam, thang, re, co, cot: j });
  }
  /* Dựng khoá từ dòng DAYS nếu có, không thì suy từ năm+tháng+thứ tự tuần */
  let iNgay = -1;
  for (let i = 0; i < grid.length; i++) if (nhan(grid[i]) === 'days') { iNgay = i; break; }
  for (const m of ra) {
    const d = iNgay >= 0 ? o(iNgay, m.cot) : '';
    const mm = d.match(/^(\d{1,2})\/(\d{1,2})$/);
    m.khoa = mm
      ? `${m.nam}${mm[2].padStart(2, '0')}${mm[1].padStart(2, '0')}`
      : `${m.nam}${String(m.thang).padStart(2, '0')}01`;
  }
  const sach = ra.filter((m) => m.khoa).sort((a, b) => (a.khoa < b.khoa ? 1 : -1));
  if (!sach.length) throw new Error('Không bóc được tuần nào có tỷ giá');
  return sach;
}

/* Nhớ 6 tiếng: tỷ giá đổi theo TUẦN nên không cần đọc lại mỗi lượt. */
async function docBang() {
  try {
    const { val } = await nhoDoc(
      'ty-gia-tuan',
      async () => {
        const res = await fetch(TAB_TY_GIA, { redirect: 'follow', cache: 'no-store', signal: AbortSignal.timeout(20000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        if (text.trim().startsWith('<')) throw new Error('Nhận về HTML thay vì CSV');
        return bocBang(text);
      },
      { song: 6 * 3600 * 1000 }
    );
    return Array.isArray(val) && val.length ? val : MOC_TINH;
  } catch {
    /* Đọc hụt thì dùng bảng tĩnh — thà tỷ giá cũ vài tuần còn hơn bằng 0 */
    return MOC_TINH;
  }
}

/* Trả về bộ tra cho MỘT lượt xử lý: đọc bảng một lần rồi tra nhiều ngày.
   Ngày sau mốc cuối dùng luôn mốc cuối; ngày TRƯỚC mốc đầu trả 0 để bên gọi
   biết là ngoài phạm vi mà báo ra, đừng lặng lẽ quy đổi sai. */
export async function boTyGia() {
  const moc = await docBang();
  const tra = (sortKey) => (sortKey ? moc.find((x) => x.khoa <= sortKey) : null);
  return {
    re: (sortKey) => tra(sortKey)?.re || 0,
    co: (sortKey) => {
      const m = tra(sortKey);
      return m ? m.co || m.re : 0;
    },
    soTuan: moc.length,
    moiNhat: moc[0]?.khoa || '',
    tuFile: moc !== MOC_TINH,
  };
}

/* Bản đồng bộ dùng bảng tĩnh — giữ cho chỗ nào chưa chuyển sang boTyGia() */
export const tyGiaRe = (sortKey) => (sortKey ? MOC_TINH.find((x) => x.khoa <= sortKey)?.re || 0 : 0);
export const tyGiaCo = (sortKey) => {
  const m = sortKey ? MOC_TINH.find((x) => x.khoa <= sortKey) : null;
  return m ? m.co || m.re : 0;
};

export const TY_GIA_CAP_NHAT = BANG.cap_nhat || '';
