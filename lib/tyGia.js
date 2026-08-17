/* ============================================================
   TỶ GIÁ TUẦN — REV (doanh thu) và CO (giá vốn)

   Vì sao cần: nguồn đơn hàng mới (Báo cáo đơn hàng V3) là bản xuất thô từ
   hệ thống, chỉ có tiền USD — không có cột Thành tiền VND lẫn cột tỷ giá.
   Mấy cột đó là công thức kế toán tự đặt bên file CPV BE cũ, mà file BE thì
   Google xuất hụt liên miên nên không đọc kèm được nữa.

   HAI tỷ giá, đừng dùng lẫn:
   - REV (cột 33 file BE) → quy đổi DOANH THU
   - CO  (cột 32 file BE) → quy đổi GIÁ VỐN, cao hơn REV khoảng 520 đ

   Và nhớ đúng công thức:
     Thành tiền (GMV VND) = DThu thực nhận (USD) × REV
   chứ KHÔNG phải Doanh thu gộp × REV. Đã đối chiếu trên file BE tháng 7 và
   tháng 8: tỷ số Thành tiền ÷ DThu thực nhận bằng đúng REV từng ngày. Lấy
   nhầm doanh thu gộp thì tỷ giá suy ngược ra sẽ vống lên đúng bằng phần phí
   sàn — đã dính một lần, bot báo 26.073 trong khi REV thật là 25.282.
   ============================================================ */

import BANG from '@/lib/data/ty-gia-tuan.json';

/* dd/mm/yyyy → yyyymmdd, cùng dạng sortKey của /api/cpv để so chuỗi là ra
   đúng thứ tự thời gian, khỏi dựng Date cho từng dòng đơn. */
const khoa = (ngay) => {
  const m = String(ngay || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}${m[2]}${m[1]}` : '';
};

/* Sắp sẵn một lần, mốc mới nhất đứng đầu để tra là lấy mốc ĐẦU TIÊN không
   muộn hơn ngày cần tra. */
const MOC = (BANG.moc || [])
  .map((m) => ({ khoa: khoa(m.tu), re: Number(m.re) || 0, co: Number(m.co) || 0 }))
  .filter((m) => m.khoa && m.re > 0)
  .sort((a, b) => (a.khoa < b.khoa ? 1 : -1));

const tra = (sortKey) => (sortKey ? MOC.find((x) => x.khoa <= sortKey) : null);

/* Nhận sortKey dạng yyyymmdd. Ngày sau mốc cuối dùng luôn tỷ giá mốc cuối —
   tuần mới chưa kịp khai vẫn ra số hợp lý thay vì tụt về 0. Ngày TRƯỚC mốc
   đầu tiên trả 0 để bên gọi biết là ngoài phạm vi mà báo ra, đừng lặng lẽ
   quy đổi sai. */
export const tyGiaRe = (sortKey) => tra(sortKey)?.re || 0;
/* Thiếu CO thì lùi về REV còn hơn để giá vốn bằng 0 */
export const tyGiaCo = (sortKey) => {
  const m = tra(sortKey);
  return m ? m.co || m.re : 0;
};

export const TY_GIA_CAP_NHAT = BANG.cap_nhat || '';
