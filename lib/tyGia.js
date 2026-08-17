/* ============================================================
   TỶ GIÁ TUẦN — REV Rate (quy đổi DOANH THU USD → VND)

   Vì sao cần: nguồn đơn hàng mới (Báo cáo đơn hàng V3) là bản xuất thô từ
   hệ thống, chỉ có Doanh thu USD, không có cột Thành tiền VND lẫn cột tỷ
   giá — mấy cột đó là công thức kế toán tự đặt bên file CPV BE cũ. File BE
   thì Google xuất hụt liên miên nên không đọc kèm được nữa.

   Lưu ý dễ nhầm: file BE có HAI cột cùng tên "Tỷ giá tuần" —
   - cột 32 CO Rate  → quy đổi GIÁ VỐN
   - cột 33 REV Rate → quy đổi DOANH THU
   Bảng này chỉ chứa REV. Báo cáo CPV chỉ báo doanh thu nên dùng REV.
   ============================================================ */

import BANG from '@/lib/data/ty-gia-tuan.json';

/* dd/mm/yyyy → yyyymmdd, cùng dạng sortKey của /api/cpv để so chuỗi là ra
   đúng thứ tự thời gian, khỏi dựng Date cho từng dòng đơn. */
const khoa = (ngay) => {
  const m = String(ngay || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}${m[2]}${m[1]}` : '';
};

/* Sắp sẵn một lần theo thứ tự thời gian, mốc mới nhất đứng đầu để tra là
   lấy mốc ĐẦU TIÊN không muộn hơn ngày cần tra. */
const MOC = (BANG.moc || [])
  .map((m) => ({ khoa: khoa(m.tu), ty_gia: Number(m.ty_gia) || 0 }))
  .filter((m) => m.khoa && m.ty_gia > 0)
  .sort((a, b) => (a.khoa < b.khoa ? 1 : -1));

/* Tỷ giá REV của một ngày, nhận sortKey dạng yyyymmdd.
   Ngày sau mốc cuối dùng luôn tỷ giá mốc cuối — tuần mới chưa kịp khai vẫn
   ra số hợp lý thay vì tụt về 0. Ngày TRƯỚC mốc đầu tiên trả 0 để bên gọi
   biết là ngoài phạm vi mà báo ra, đừng lặng lẽ quy đổi sai. */
export function tyGiaRe(sortKey) {
  if (!sortKey) return 0;
  const m = MOC.find((x) => x.khoa <= sortKey);
  return m ? m.ty_gia : 0;
}

export const TY_GIA_CAP_NHAT = BANG.cap_nhat || '';
export const TY_GIA_MOC_DAU = MOC.length ? MOC[MOC.length - 1].khoa : '';
