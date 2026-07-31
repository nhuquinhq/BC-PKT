/* ============================================================
   Chiều phân tích cho báo cáo CPV BE HQS (PKT8):
   - Team: map từ cột BU của tab Data (theo quy ước PKT).
   - SPDV: lấy theo cột "LOẠI DỊCH VỤ" trên tab Data, map giá trị
     vào 5 nhóm GIFT CARD · CURRENCY · ITEM · TOPUP · ACCOUNT.
   Sửa các bảng dưới đây khi có team / loại dịch vụ mới.
   ============================================================ */

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

/* Sàn → BU dự phòng khi dòng dữ liệu không có cột BU (vd file API G2G) */
export const SAN_BU_MAP = {
  G1: 'BU4',
  G2: 'BU4',
};

const normText = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ')
    .trim();

/* Giá trị cột LOẠI DỊCH VỤ → nhóm SPDV (so khớp sau khi bỏ dấu, thường) */
export const SPDV_VALUE_MAP = {
  'gift card': 'GIFT CARD',
  'giftcard': 'GIFT CARD',
  /* Razer Gold tạm tách nhóm riêng theo yêu cầu PKT (chưa gộp vào GIFT CARD) */
  'razer gold': 'RAZER GOLD',
  'razergold': 'RAZER GOLD',
  'top up': 'TOPUP',
  'topup': 'TOPUP',
  'nap tien': 'TOPUP',
  'robux 120h': 'CURRENCY',
  'robux': 'CURRENCY',
  'gamepass': 'CURRENCY',
  'nick': 'ACCOUNT',
  'acc': 'ACCOUNT',
  'account': 'ACCOUNT',
  'ban item': 'ITEM',
  'item': 'ITEM',
};

/* Dự phòng khi giá trị không có trong bảng map */
const SPDV_RULES = [
  { spdv: 'RAZER GOLD', re: /razer/ },
  { spdv: 'GIFT CARD', re: /gift ?card/ },
  { spdv: 'TOPUP', re: /top ?up|nap tien|welkin|diamond|zem\b|zems/ },
  { spdv: 'ACCOUNT', re: /nick|account|\bacc\b/ },
  { spdv: 'ITEM', re: /\bitem\b|ban item|gold seed/ },
  { spdv: 'CURRENCY', re: /robux|gamepass|rbx|gold|monochrome|lunite|currency/ },
];

/* Ưu tiên cột LOẠI DỊCH VỤ; loại mới chưa map → hiện nguyên tên để PKT xếp nhóm */
export function spdvOf(loaiDichVu, ...fallbackTexts) {
  const v = normText(loaiDichVu);
  if (v) {
    if (SPDV_VALUE_MAP[v]) return SPDV_VALUE_MAP[v];
    for (const r of SPDV_RULES) if (r.re.test(v)) return r.spdv;
    return String(loaiDichVu).trim().toUpperCase();
  }
  const t = normText(fallbackTexts.join(' '));
  if (t) for (const r of SPDV_RULES) if (r.re.test(t)) return r.spdv;
  return 'KHÁC';
}
