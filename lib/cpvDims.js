/* ============================================================
   Chiều phân tích cho báo cáo CPV BE HQS (PKT8):
   - Team: map từ cột BU của tab Data (theo quy ước PKT).
   - SPDV: lấy theo cột "LOẠI DỊCH VỤ" trên tab Data, map giá trị
     vào 5 nhóm GIFT CARD · CURRENCY · ITEM · TOPUP · ACCOUNT.
   - Danh sách sàn · BU: đọc từ datalake lib/data/san-bu.json.
   Sửa các bảng dưới đây khi có team / loại dịch vụ mới.
   ============================================================ */

import SAN_BU from '@/lib/data/san-bu.json';

/* BU trên file → Team báo cáo. BU không có trong map giữ nguyên mã gốc. */
export const TEAM_MAP = {
  BU1: 'HQS100',
  BD10F: 'HQS100',
  BU2: 'HQS200',
  BU4: 'HQS400',
  BU5: 'HQS500',
};

export const teamOf = (bu) => {
  const k = String(bu || '').toUpperCase().trim();
  return TEAM_MAP[k] || k || '—';
};

/* Danh sách sàn lấy từ datalake lib/data/san-bu.json (bảng Sàn – BU của
   PKT). Thêm sàn / đổi BU / dừng bán thì sửa file JSON đó, không sửa ở
   đây — hai bảng dưới và SAN_LIST bên lib/reports.js đều suy từ nó. */
export const SAN_ROWS = SAN_BU.san;

/* Bỏ dấu + thường hoá để so trạng thái không phụ thuộc cách gõ */
const boDau = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

/* Chỉ sàn đang bán mới vào báo cáo và phân quyền */
export const SAN_DANG_BAN = SAN_ROWS.filter(
  (r) => boDau(r.trang_thai) === 'dang ban hang',
);

/* Mã sàn → tên sàn hiển thị (vd G1 → G2G) */
export const SAN_TEN_MAP = Object.fromEntries(SAN_ROWS.map((r) => [r.ma, r.ten]));

/* Sàn → BU dự phòng khi dòng dữ liệu không có cột BU (vd file API G2G,
   và file CPV BE 08/2026 bản xây lại đã bỏ hẳn cột BU) */
export const SAN_BU_MAP = Object.fromEntries(SAN_ROWS.map((r) => [r.ma, r.bu]));

/* Team → các sàn thuộc BU đó. Dùng cho phân quyền 2 cấp: leader được cấp
   trang team thì TỰ ĐỘNG được xem + cấp lại các trang SÀN của BU mình. */
export const TEAM_SAN_MAP = {};
for (const r of SAN_DANG_BAN) {
  const team = teamOf(r.bu);
  (TEAM_SAN_MAP[team] ||= []).push(r.ma);
}
for (const sans of Object.values(TEAM_SAN_MAP)) sans.sort();

/* SPDV chuyển sang lib/spdv.mjs để scripts/chup-be.mjs dùng chung được
   bằng node trần. Xuất lại y nguyên tên cũ nên mọi chỗ gọi không phải sửa. */
export { spdvOf, SPDV_VALUE_MAP } from './spdv.mjs';
