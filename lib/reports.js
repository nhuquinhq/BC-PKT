/* ============================================================
   KHUNG 7 BÁO CÁO PHÒNG KẾ TOÁN - HQ GROUP
   Sửa file này để thêm/bớt KPI, cột bảng, biểu đồ.
   Kiểu cột (type): text | num | money | usd | rate | pct | date
   ============================================================ */

/* ============================================================
   TẦNG 3 — BÁO CÁO KINH DOANH RIÊNG TỪNG TEAM (theo BU)
   Dùng chung nguồn đơn hàng BE với PKT8 nhưng lọc đúng Team;
   phân quyền từng team trong Nguồn & Cấu hình (tick mã HQS100…).
   ============================================================ */

/* Tháng ĐANG CHẠY (08/2026) — file chủ đạo đọc live */
const CPV_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR4aNo9LBJ34PRByMwVyyvTxLKcFkh5qg4LNV1WkE-U_LF6zyNDNdNAmcovZrRzT4CdR-NQk8Y1D5O0/pubhtml?gid=0&single=true';
/* Tháng 7 chưa chốt sổ — vẫn đọc live song song; chốt sổ thì chuyển vào datalake */
const CPV_SHEET_T7_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS8v730AMvL4_1VC131-HLHBECPrYMtLmv02TkTtpFuXlQEGtVSPpR1URMQ5sOhB6_LbnATeDwZUk__/pubhtml?gid=0&single=true';
/* Các tháng ĐANG chạy đọc live tại đây; tháng đã chốt sổ được đóng gói
   tĩnh vào lib/data (datalake) và bật qua cờ hist — xem app/api/cpv.
   T5 + T6/2026 đã chuyển vào datalake. Sang tháng mới: thêm { url, gid }
   file tháng đang chạy vào CPV_MAINS; khi chốt sổ thì snapshot lại. */
const CPV_MAINS = [{ url: CPV_SHEET_T7_URL, gid: '0' }];

/* PKT6 — Lịch sử ví HQS10000: tab THVí Tiền của file tháng đang chạy.
   Doanh thu thực nhận về ví (sau phí), chỉ dòng cột Tìm = DT. */
/* File Báo cáo kinh doanh Ritokey (team C300) — nguồn cho PKT12 */
const RITOKEY_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSkiE47m3g4BL1e6qSEfuyg3uKXqWneiLm_zDBfOsr_hWU4slODT0xE9K1bNJpI9afseGjEQ9PZUtRQ/pubhtml';

/* File Báo cáo kinh doanh QLTT (C100 + C200) — nguồn cho PKT21 và PKT20.
   T1–T6 đã chốt trong lib/data/qltt-2026.json; các tháng còn lại đọc trực
   tiếp từ bản công bố này (khuôn tab y hệt bản chốt). */
const QLTT_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR2ufGWQkzgBr-F0hibPVNPwfKehx62qEB4EabwaA1du8-J07iZdkKBGrqAGMnDieFVJb7AhvbmqQGx/pubhtml';
/* Bản công bố của file QLTT đang ở chế độ MỘT TAB nên trang pubhtml không
   có menu để dò gid — khai thẳng gid từng tab. T8 hiện thiếu 2 tab:
   "Doanh thu Minigame T8" (đã dừng) và "Giá vốn Minigame tự động T8"
   (chưa có), thiếu tab nào thì API bỏ qua tab đó chứ không bỏ cả tháng. */
const QLTT_TABS = [
  'Bán nick T7:400765897',
  'Bán nick T8:1993907780',
  'DV Tự động T7:155307356',
  'DV Tự động T8:1292063564',
  'Doanh thu Minigame T7:1843769043',
  'DT - GV DV Thủ công T7:0',
  'DT - GV DV Thủ công T8:251239352',
  'Giá vốn Minigame tự động T7:1052756758',
].join(';');
const QLTT_SHEET = { url: QLTT_SHEET_URL, endpoint: '/api/qltt', qs: { thang: '7,8', tabs: QLTT_TABS } };

/* File Báo cáo TIỀN (bộ 12 tab của PKT) — nguồn cho PKT3 · PKT4 */
const TIEN_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTLTvWG0zTceE2zZ1-f-8EDouwxfQUWj-LBDj0K4qXsbvOO1mdp2pbt7pqvraPj6gfTnq0oQORAIRWb/pubhtml';

/* Tab "Đơn tạo mới" của Báo cáo đơn hàng V3 — nguồn cho PKT11 · PKT15 */
const TAOMOI_SHEET = {
  url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSUiGboCHbRCVwRjkmSAHw5i262tY1oJ9ihAvo9Z4y-p2dfQhbE8QJar0E4udWCnQkGQq8mfWpQUo7u/pubhtml?gid=209599086&single=true',
  gid: '209599086',
  mains: [
    { url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT6q4Xjo6q-t7OphvaD9bet4Wl4BRC6hOqoXBrtf5O-F8LhIp-whTlw0qHMFuu5hQNJuowmxcJhK-oJ/pubhtml?gid=1925426186&single=true', gid: '1925426186' },
  ],
};

const VI_T7_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQumf3iUT9n-lh-sNiJ1TeV24RjqRm1Eo6RTMafFsN9g_Hr6qtKZfyjFzb4gBpo5QhTieMSqU4sJORx/pubhtml?gid=1106881524&single=true';
const VI_T8_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTmigt_mS16GnHQ5qpx2jxv_0F9irT-jJt6c3KyfUrTn2AgbZVZ4d5Q0fBvoINSmnMJHm5GcDU58ai2/pubhtml?gid=1425184209&single=true';
/* Các tháng ví ĐANG CHẠY — mỗi tháng một file riêng. Tab ví chỉ ghi SỐ NGÀY
   trong tháng nên từng file phải kèm month/year. Tháng chốt sổ thì đóng gói
   vào datalake lib/data/vi-*.json (T4–T6 đã chốt) và bỏ khỏi danh sách này. */
const VI_LIVE = {
  url: VI_T8_URL,
  gid: '1425184209',
  qs: { month: '8', year: '2026' },
  mains: [{ url: VI_T7_URL, gid: '1106881524', qs: { month: '7', year: '2026' } }],
  hist: true,
};
/* File API trực tiếp từ sàn — hiện chỉ có G1, G2; được ưu tiên khi trùng Order ID */
const CPV_API_T8_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQvTKIa8hAWjghuGri8nsnk2zFhlHNIKKgGunBFDolf3IyG4lYZ8G9zt6tYrIIxESHQty7cskmUcbIG/pubhtml?gid=0&single=true';
const CPV_API_T7_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTwoaNaItJfQPZDNom-HB06ea0jxglfgeiWZ8Sj-8dWwneE26NCU8NhEQpaXzIAnZc0XI0bbLOzG04i/pubhtml?gid=0&single=true';
const CPV_API = [
  { url: CPV_API_T8_URL, gid: '0' },
  { url: CPV_API_T7_URL, gid: '0' },
];

const cpvTeamReport = (code, bu) => ({
  code,
  slug: code.toLowerCase(),
  name: `Báo cáo kinh doanh ${code}`,
  short: code,
  nav: `${code} (${bu})`,
  tier: 3,
  sla: 'Ngày 5',
  periods: ['day', 'week', 'month'],
  defaultPeriod: 'month',
  source: 'Đơn hàng BE HQS',
  sheet: { url: CPV_SHEET_URL, gid: '0', mains: CPV_MAINS, hist: true, mode: 'order_cpv', teamFilter: code, api: CPV_API, label: `Đơn hàng BE · Team ${code}` },
  /* Kiểu xem thứ 2: CPV theo lịch sử ví (thực nhận sau phí), lọc theo team */
  sheetVi: { ...VI_LIVE, mode: 'order_cpv', endpoint: '/api/vi', teamFilter: code, label: `Lịch sử ví · Team ${code}` },
  purpose: [
    `Doanh thu, giá vốn, lợi nhuận của Team ${code} (${bu}) theo từng ngày đang thế nào?`,
    'Sàn nào của team bán tốt, sàn nào biên mỏng; SPDV nào là chủ lực?',
    'Số đơn thành công, thất bại, hoàn hủy của team trong kỳ là bao nhiêu?',
  ],
  kpis: [
    { key: 'doanh_thu_usd', code: 'USD', label: 'Doanh thu gốc (USD)', type: 'usd' },
    { key: 'gmv', code: 'GMV', label: 'Doanh thu (VND)', type: 'money' },
    { key: 'cogs', code: 'CO', label: 'Giá vốn (VND)', type: 'money', tone: 'loss' },
    { key: 'loi_nhuan', code: 'GP', label: 'Lợi nhuận gộp', type: 'money', tone: 'auto' },
    { key: 'ty_le_co', code: '%CO', label: '% Giá vốn / Doanh thu', type: 'pct', tone: 'warn' },
    { key: 'bien_ln', code: '%GP', label: 'Biên lợi nhuận gộp', type: 'pct', tone: 'auto' },
    { key: 'so_don', code: 'ORD', label: 'Số đơn Hoàn Tất', type: 'num' },
  ],
  tables: [
    {
      id: 'cpv_ngay',
      title: `Doanh thu – Giá vốn theo NGÀY · ${code}`,
      totals: true,
      columns: [
        { key: 'ngay', label: 'Ngày', type: 'text' },
        { key: 'so_don', label: 'Số đơn', type: 'num' },
        { key: 'doanh_thu_usd', label: 'Doanh thu (USD)', type: 'usd' },
        { key: 'thanh_tien', label: 'Doanh thu (VND)', type: 'money' },
        { key: 'gia_von', label: 'Giá vốn (VND)', type: 'money' },
        { key: 'loi_nhuan', label: 'Lợi nhuận', type: 'money' },
        { key: 'ty_le_co', label: '% CO/DT', type: 'pct', totalOf: ['gia_von', 'thanh_tien'] },
        { key: 'bien_ln', label: 'Biên LN', type: 'pct', totalOf: ['loi_nhuan', 'thanh_tien'] },
      ],
    },
    {
      id: 'cpv_san',
      title: `Doanh thu – Giá vốn theo SÀN · ${code}`,
      totals: true,
      columns: [
        { key: 'san', label: 'Sàn', type: 'text' },
        { key: 'so_don', label: 'Số đơn', type: 'num' },
        { key: 'doanh_thu_usd', label: 'Doanh thu (USD)', type: 'usd' },
        { key: 'thanh_tien', label: 'Doanh thu (VND)', type: 'money' },
        { key: 'gia_von', label: 'Giá vốn (VND)', type: 'money' },
        { key: 'loi_nhuan', label: 'Lợi nhuận', type: 'money' },
        { key: 'ty_le_co', label: '% CO/DT', type: 'pct', totalOf: ['gia_von', 'thanh_tien'] },
        { key: 'bien_ln', label: 'Biên LN', type: 'pct', totalOf: ['loi_nhuan', 'thanh_tien'] },
      ],
    },
    {
      id: 'kqkd_spdv',
      title: `Báo cáo theo SPDV · ${code}`,
      totals: true,
      columns: [
        { key: 'spdv', label: 'SPDV', type: 'text' },
        { key: 'so_don', label: 'Số đơn A3', type: 'num' },
        { key: 'gmv', label: 'GMV', type: 'money' },
        { key: 'gia_von', label: 'CO', type: 'money' },
        { key: 'pl1', label: 'PL1', type: 'money' },
        { key: 'pct_pl1', label: '% PL1/GMV', type: 'pct', totalOf: ['pl1', 'gmv'] },
        { key: 'pl2a', label: 'PL2A', type: 'money' },
        { key: 'pct_pl2a', label: '% PL2A/GMV', type: 'pct', totalOf: ['pl2a', 'gmv'] },
        { key: 'arpo', label: 'ARPO', type: 'money', totalOf: ['gmv', 'so_don'] },
      ],
    },
    {
      id: 'don_spdv',
      title: `Báo cáo ĐƠN HÀNG theo SPDV · ${code}`,
      totals: true,
      columns: [
        { key: 'spdv', label: 'SPDV', type: 'text' },
        { key: 'so_don', label: 'Đơn thành công', type: 'num' },
        { key: 'don_fail', label: 'Đơn thất bại', type: 'num' },
        { key: 'ti_le_fail', label: 'Tỉ lệ thất bại', type: 'pct', totalOf: ['don_fail', ['so_don', 'don_fail', 'don_huy']] },
        { key: 'don_huy', label: 'Đơn hoàn hủy', type: 'num' },
        { key: 'ti_le_huy', label: 'Tỉ lệ hoàn hủy', type: 'pct', totalOf: ['don_huy', ['so_don', 'don_fail', 'don_huy']] },
      ],
    },
  ],
  /* Bộ biểu đồ giống hệt PKT8, số liệu đã lọc theo team */
  charts: [
    { id: 'c_ngay', title: `Doanh thu theo ngày = Giá vốn + Lợi nhuận (xếp chồng) & % CO/DT · ${code}`, type: 'bar', table: 'cpv_ngay', x: 'ngay', series: [{ key: 'gia_von', label: 'Giá vốn', stack: true }, { key: 'loi_nhuan', label: 'Lợi nhuận', stack: true }, { key: 'ty_le_co', label: '% CO/DT', kind: 'line' }] },
    { id: 'c_thang', title: `So sánh theo THÁNG (xếp chồng) & % CO/DT · ${code}`, type: 'bar', table: 'cpv_thang', x: 'thang', series: [{ key: 'gia_von', label: 'Giá vốn', stack: true }, { key: 'loi_nhuan', label: 'Lợi nhuận', stack: true }, { key: 'ty_le_co', label: '% CO/DT', kind: 'line' }] },
    { id: 'c_kqkd_thang', title: `GMV – PL1 – PL2A theo THÁNG · ${code}`, type: 'bar', table: 'cpv_thang', x: 'thang', series: [{ key: 'gmv', label: 'GMV' }, { key: 'pl1', label: 'PL1' }, { key: 'pl2a', label: 'PL2A' }, { key: 'pct_pl1', label: '% PL1/GMV', kind: 'line' }, { key: 'pct_pl2a', label: '% PL2A/GMV', kind: 'line' }] },
    { id: 'c_don_thang', title: `Đơn hàng theo THÁNG · ${code}`, type: 'bar', table: 'cpv_thang', x: 'thang', series: [{ key: 'so_don', label: 'Hoàn tất' }, { key: 'don_fail', label: 'Thất bại' }, { key: 'don_huy', label: 'Hoàn hủy' }, { key: 'ti_le_fail', label: 'Tỉ lệ thất bại', kind: 'line' }, { key: 'ti_le_huy', label: 'Tỉ lệ hoàn hủy', kind: 'line' }] },
    { id: 'c_team', title: `GMV – PL1 – PL2A của team · ${code}`, type: 'bar', table: 'kqkd_team', x: 'team', series: [{ key: 'gmv', label: 'GMV' }, { key: 'pl1', label: 'PL1' }, { key: 'pl2a', label: 'PL2A' }, { key: 'pct_pl1', label: '% PL1/GMV', kind: 'line' }, { key: 'pct_pl2a', label: '% PL2A/GMV', kind: 'line' }] },
    { id: 'c_spdv', title: `GMV – PL1 – PL2A theo SPDV · ${code}`, type: 'bar', table: 'kqkd_spdv', x: 'spdv', series: [{ key: 'gmv', label: 'GMV' }, { key: 'pl1', label: 'PL1' }, { key: 'pl2a', label: 'PL2A' }, { key: 'pct_pl1', label: '% PL1/GMV', kind: 'line' }, { key: 'pct_pl2a', label: '% PL2A/GMV', kind: 'line' }] },
    { id: 'c_san', title: `Doanh thu theo Sàn = Giá vốn + Lợi nhuận (xếp chồng) & % CO/DT · ${code}`, type: 'bar', table: 'cpv_san', x: 'san', series: [{ key: 'gia_von', label: 'Giá vốn', stack: true }, { key: 'loi_nhuan', label: 'Lợi nhuận', stack: true }, { key: 'ty_le_co', label: '% CO/DT', kind: 'line' }] },
    { id: 'c_don_bu', title: `Số đơn theo BU · ${code}`, type: 'bar', table: 'cpv_bu', x: 'bu', series: [{ key: 'so_don', label: 'Số đơn Hoàn Tất' }] },
    { id: 'c_don_spdv', title: `Số đơn theo SPDV · ${code}`, type: 'bar', table: 'don_spdv', x: 'spdv', series: [{ key: 'so_don', label: 'Số đơn Hoàn Tất' }] },
  ],
});

/* Hai đơn vị của QLTT — cùng một nguồn, mỗi trang lọc đúng team của mình.
   HQC100 = team VX101 (gồm cả AST) · HQSC200 = team WGG. Tổng hai đơn vị
   nằm ở PKT20 (CPV HQ Holdings). */
const qlttTeamReport = (code, donVi, teamKey) => ({
  code,
  slug: code.toLowerCase(),
  name: `Báo cáo CPV QLTT ${donVi}`,
  short: `CPV ${donVi}`,
  nav: `CPV QLTT — ${donVi} · ${teamKey}`,
  tier: 3,
  sla: 'Ngày 5',
  periods: ['day', 'week', 'month'],
  defaultPeriod: 'month',
  source: 'Báo cáo kinh doanh QLTT · T1–T6 bản chốt, tháng đang chạy đọc trực tiếp',
  sheet: { ...QLTT_SHEET, mode: 'qltt', teamFilter: teamKey, label: `Báo cáo kinh doanh QLTT · ${donVi}` },
  purpose: [
    `${donVi} (team ${teamKey}) đang bán được bao nhiêu, giá vốn ăn bao nhiêu phần doanh thu?`,
    'Nhóm hàng nào là chủ lực — bán nick, dịch vụ tự động, dịch vụ thủ công hay minigame?',
    'Tháng đang chạy đi được tới đâu so với các tháng đã chốt?',
  ],
  kpis: [
    { key: 'gmv', code: 'GMV', label: 'Doanh số (GMV)', type: 'money' },
    { key: 'cogs', code: 'COGS', label: 'Giá vốn + phải trả NCC', type: 'money', tone: 'loss' },
    { key: 'pl1', code: 'PL1', label: 'Lãi gộp (GMV − COGS)', type: 'money', tone: 'auto' },
    { key: 'ty_le_co', code: '%CO', label: '% COGS / GMV', type: 'pct', tone: 'warn' },
    { key: 'bien_pl1', code: '%PL1', label: 'Biên lãi gộp', type: 'pct', tone: 'auto' },
    { key: 'so_don', code: 'ORD', label: 'Số đơn', type: 'num' },
    { key: 'co', code: 'CO', label: 'Giá vốn hàng', type: 'money' },
    { key: 'ar', code: 'AR', label: 'Phải trả CTV ngoài', type: 'money', tone: 'warn' },
  ],
  tables: [
    {
      id: 'qltt_thang',
      title: `Kết quả theo THÁNG · ${donVi}`,
      totals: true,
      hint: `Chỉ lấy đơn của team ${teamKey}${teamKey === 'VX101' ? ' (đã gộp AST)' : ''}. Giá vốn của CTV Ngoài xếp vào AR (phải trả NCC), phần còn lại vào CO; COGS = CO + AR.`,
      columns: [
        { key: 'thang', label: 'Tháng', type: 'text' },
        { key: 'so_don', label: 'Số đơn', type: 'num' },
        { key: 'gmv', label: 'GMV', type: 'money' },
        { key: 'co', label: 'CO', type: 'money' },
        { key: 'ar', label: 'AR', type: 'money' },
        { key: 'cogs', label: 'COGS', type: 'money' },
        { key: 'pl1', label: 'PL1', type: 'money' },
        { key: 'ty_le_co', label: '% COGS/GMV', type: 'pct', totalOf: ['cogs', 'gmv'] },
        { key: 'bien_pl1', label: 'Biên PL1', type: 'pct', totalOf: ['pl1', 'gmv'] },
        { key: 'nguon', label: 'Nguồn', type: 'text' },
      ],
    },
    {
      id: 'qltt_nhom_thang',
      title: 'GMV theo NHÓM HÀNG (từng tháng)',
      totals: true,
      hint: 'Bán nick · Dịch vụ tự động · Dịch vụ thủ công · Minigame — bóc từ chính các tab chi tiết.',
      columns: [
        { key: 'thang', label: 'Tháng', type: 'text' },
        { key: 'gmv_ban_nick', label: 'Bán nick', type: 'money' },
        { key: 'gmv_dv_tu_dong', label: 'DV tự động', type: 'money' },
        { key: 'gmv_dv_thu_cong', label: 'DV thủ công', type: 'money' },
        { key: 'gmv_minigame', label: 'Minigame', type: 'money' },
        { key: 'co_ban_nick', label: 'CO bán nick', type: 'money' },
        { key: 'co_dv_tu_dong', label: 'CO tự động', type: 'money' },
        { key: 'co_dv_thu_cong', label: 'CO thủ công', type: 'money' },
        { key: 'co_minigame', label: 'CO minigame', type: 'money' },
      ],
    },
    {
      id: 'qltt_ngay',
      title: `Chi tiết theo NGÀY · ${donVi}`,
      totals: true,
      columns: [
        { key: 'ngay', label: 'Ngày', type: 'text' },
        { key: 'so_don', label: 'Số đơn', type: 'num' },
        { key: 'gmv', label: 'GMV', type: 'money' },
        { key: 'co', label: 'CO', type: 'money' },
        { key: 'ar', label: 'AR', type: 'money' },
        { key: 'cogs', label: 'COGS', type: 'money' },
        { key: 'pl1', label: 'PL1', type: 'money' },
        { key: 'ty_le_co', label: '% COGS/GMV', type: 'pct', totalOf: ['cogs', 'gmv'] },
        { key: 'nguon', label: 'Nguồn', type: 'text' },
      ],
    },
    {
      id: 'qltt_team',
      title: 'Đối chiếu với đơn vị còn lại',
      totals: true,
      hint: 'Bảng này luôn hiện đủ cả hai đơn vị của QLTT để so sánh, không bị lọc theo trang.',
      columns: [
        { key: 'team', label: 'Đơn vị', type: 'text' },
        { key: 'so_don', label: 'Số đơn', type: 'num' },
        { key: 'gmv', label: 'GMV', type: 'money' },
        { key: 'cogs', label: 'COGS', type: 'money' },
        { key: 'pl1', label: 'PL1', type: 'money' },
        { key: 'ty_le_co', label: '% COGS/GMV', type: 'pct', totalOf: ['cogs', 'gmv'] },
        { key: 'bien_pl1', label: 'Biên PL1', type: 'pct', totalOf: ['pl1', 'gmv'] },
      ],
    },
  ],
  /* Ba biểu đồ đầu dùng chung bảng qltt_auto: chọn một tháng / một tuần thì
     vẽ từng ngày, xem cả năm thì vẽ từng tháng (giống PKT12). */
  charts: [
    { id: 'c_thang', title: 'GMV = COGS + PL1 (xếp chồng)', autoTitle: true, type: 'bar', table: 'qltt_auto', x: 'nhan', series: [{ key: 'cogs', label: 'COGS', stack: true, color: '#189BD8' }, { key: 'pl1', label: 'PL1', stack: true }, { key: 'ty_le_co', label: '% COGS/GMV', kind: 'line' }], tip: [{ key: 'gmv', label: 'GMV' }, { key: 'co', label: 'CO' }, { key: 'ar', label: 'AR' }, { key: 'so_don', label: 'Số đơn', type: 'num' }] },
    { id: 'c_nhom', title: 'GMV theo nhóm hàng', autoTitle: true, type: 'bar', table: 'qltt_auto', x: 'nhan', series: [{ key: 'gmv_ban_nick', label: 'Bán nick', stack: true, color: '#189BD8' }, { key: 'gmv_dv_tu_dong', label: 'DV tự động', stack: true, color: '#7E9C00' }, { key: 'gmv_dv_thu_cong', label: 'DV thủ công', stack: true, color: '#00A99D' }, { key: 'gmv_minigame', label: 'Minigame', stack: true, color: '#D96F00' }], tip: [{ key: 'gmv', label: 'GMV' }, { key: 'so_don', label: 'Số đơn', type: 'num' }] },
    { id: 'c_don', title: 'GMV (cột) & số đơn (đường)', autoTitle: true, type: 'bar', table: 'qltt_auto', x: 'nhan', series: [{ key: 'gmv', label: 'GMV' }, { key: 'so_don', label: 'Số đơn', kind: 'line', num: true, color: '#D96F00' }], tip: [{ key: 'cogs', label: 'COGS' }, { key: 'pl1', label: 'PL1' }] },
    { id: 'c_team', title: 'Đối chiếu hai đơn vị QLTT = COGS + PL1', type: 'bar', table: 'qltt_team', x: 'team', series: [{ key: 'cogs', label: 'COGS', stack: true, color: '#189BD8' }, { key: 'pl1', label: 'PL1', stack: true }, { key: 'ty_le_co', label: '% COGS/GMV', kind: 'line' }], tip: [{ key: 'gmv', label: 'GMV' }, { key: 'so_don', label: 'Số đơn', type: 'num' }] },
  ],
});

const CPV_TEAM_REPORTS = [
  cpvTeamReport('HQS100', 'BU1'),
  cpvTeamReport('HQS200', 'BU2'),
  cpvTeamReport('HQS400', 'BU4'),
  cpvTeamReport('HQS500', 'BU5'),
];

/* ------------------------------------------------------------------
   Tầng lead SÀN: 1 BU có nhiều sàn, mỗi sàn 1 lead phụ trách →
   mỗi sàn 1 trang riêng để admin cấp quyền đúng sàn cho từng lead
   (Cấu hình → phân quyền trang). Sàn mới thì thêm mã vào SAN_LIST. */
const SAN_LIST = [
  'EL1', 'EL2', 'FP1', 'FP2', 'G1', 'G2', 'GB1', 'GF1', 'GF2', 'GO1', 'GS1', 'GS2',
  'IK1', 'KG1', 'PO2', 'PO3', 'PO4', 'PO5', 'PT1', 'U1', 'U2', 'ZX1', 'ZX2', 'ZX3',
];

const cpvSanReport = (san) => ({
  code: `SÀN ${san}`,
  slug: `san-${san.toLowerCase()}`,
  name: `Báo cáo kinh doanh sàn ${san}`,
  short: san,
  nav: `Sàn ${san}`,
  tier: 5,
  sla: 'Ngày',
  periods: ['day', 'week', 'month'],
  defaultPeriod: 'month',
  source: 'Đơn hàng BE HQS',
  sheet: { url: CPV_SHEET_URL, gid: '0', mains: CPV_MAINS, hist: true, mode: 'order_cpv', sanFilter: san, api: CPV_API, label: `Đơn hàng BE · Sàn ${san}` },
  /* Kiểu xem thứ 2: CPV theo lịch sử ví (thực nhận sau phí), lọc theo sàn */
  sheetVi: { ...VI_LIVE, mode: 'order_cpv', endpoint: '/api/vi', sanFilter: san, label: `Lịch sử ví · Sàn ${san}` },
  purpose: [
    `Doanh thu, giá vốn, lợi nhuận của sàn ${san} theo từng ngày đang thế nào?`,
    `SPDV nào của sàn ${san} là chủ lực, biên lợi nhuận ra sao?`,
    `Số đơn thành công, thất bại, hoàn hủy của sàn ${san} trong kỳ là bao nhiêu?`,
  ],
  kpis: [
    { key: 'doanh_thu_usd', code: 'USD', label: 'Doanh thu gốc (USD)', type: 'usd' },
    { key: 'gmv', code: 'GMV', label: 'Doanh thu (VND)', type: 'money' },
    { key: 'cogs', code: 'CO', label: 'Giá vốn (VND)', type: 'money', tone: 'loss' },
    { key: 'loi_nhuan', code: 'GP', label: 'Lợi nhuận gộp', type: 'money', tone: 'auto' },
    { key: 'ty_le_co', code: '%CO', label: '% Giá vốn / Doanh thu', type: 'pct', tone: 'warn' },
    { key: 'bien_ln', code: '%GP', label: 'Biên lợi nhuận gộp', type: 'pct', tone: 'auto' },
    { key: 'so_don', code: 'ORD', label: 'Số đơn Hoàn Tất', type: 'num' },
  ],
  tables: [
    {
      id: 'cpv_ngay',
      title: `Doanh thu – Giá vốn theo NGÀY · Sàn ${san}`,
      totals: true,
      columns: [
        { key: 'ngay', label: 'Ngày', type: 'text' },
        { key: 'so_don', label: 'Số đơn', type: 'num' },
        { key: 'doanh_thu_usd', label: 'Doanh thu (USD)', type: 'usd' },
        { key: 'thanh_tien', label: 'Doanh thu (VND)', type: 'money' },
        { key: 'gia_von', label: 'Giá vốn (VND)', type: 'money' },
        { key: 'loi_nhuan', label: 'Lợi nhuận', type: 'money' },
        { key: 'ty_le_co', label: '% CO/DT', type: 'pct', totalOf: ['gia_von', 'thanh_tien'] },
        { key: 'bien_ln', label: 'Biên LN', type: 'pct', totalOf: ['loi_nhuan', 'thanh_tien'] },
      ],
    },
    {
      id: 'kqkd_spdv',
      title: `Báo cáo theo SPDV · Sàn ${san}`,
      totals: true,
      columns: [
        { key: 'spdv', label: 'SPDV', type: 'text' },
        { key: 'so_don', label: 'Số đơn A3', type: 'num' },
        { key: 'gmv', label: 'GMV', type: 'money' },
        { key: 'gia_von', label: 'CO', type: 'money' },
        { key: 'pl1', label: 'PL1', type: 'money' },
        { key: 'pct_pl1', label: '% PL1/GMV', type: 'pct', totalOf: ['pl1', 'gmv'] },
        { key: 'pl2a', label: 'PL2A', type: 'money' },
        { key: 'pct_pl2a', label: '% PL2A/GMV', type: 'pct', totalOf: ['pl2a', 'gmv'] },
        { key: 'arpo', label: 'ARPO', type: 'money', totalOf: ['gmv', 'so_don'] },
      ],
    },
    {
      id: 'don_spdv',
      title: `Báo cáo ĐƠN HÀNG theo SPDV · Sàn ${san}`,
      totals: true,
      columns: [
        { key: 'spdv', label: 'SPDV', type: 'text' },
        { key: 'so_don', label: 'Đơn thành công', type: 'num' },
        { key: 'don_fail', label: 'Đơn thất bại', type: 'num' },
        { key: 'ti_le_fail', label: 'Tỉ lệ thất bại', type: 'pct', totalOf: ['don_fail', ['so_don', 'don_fail', 'don_huy']] },
        { key: 'don_huy', label: 'Đơn hoàn hủy', type: 'num' },
        { key: 'ti_le_huy', label: 'Tỉ lệ hoàn hủy', type: 'pct', totalOf: ['don_huy', ['so_don', 'don_fail', 'don_huy']] },
      ],
    },
  ],
  /* Bộ biểu đồ như trang team, bỏ các biểu đồ theo sàn/BU vì chỉ còn 1 sàn */
  charts: [
    { id: 'c_ngay', title: `Doanh thu theo ngày = Giá vốn + Lợi nhuận (xếp chồng) & % CO/DT · Sàn ${san}`, type: 'bar', table: 'cpv_ngay', x: 'ngay', series: [{ key: 'gia_von', label: 'Giá vốn', stack: true }, { key: 'loi_nhuan', label: 'Lợi nhuận', stack: true }, { key: 'ty_le_co', label: '% CO/DT', kind: 'line' }] },
    { id: 'c_thang', title: `So sánh theo THÁNG (xếp chồng) & % CO/DT · Sàn ${san}`, type: 'bar', table: 'cpv_thang', x: 'thang', series: [{ key: 'gia_von', label: 'Giá vốn', stack: true }, { key: 'loi_nhuan', label: 'Lợi nhuận', stack: true }, { key: 'ty_le_co', label: '% CO/DT', kind: 'line' }] },
    { id: 'c_kqkd_thang', title: `GMV – PL1 – PL2A theo THÁNG · Sàn ${san}`, type: 'bar', table: 'cpv_thang', x: 'thang', series: [{ key: 'gmv', label: 'GMV' }, { key: 'pl1', label: 'PL1' }, { key: 'pl2a', label: 'PL2A' }, { key: 'pct_pl1', label: '% PL1/GMV', kind: 'line' }, { key: 'pct_pl2a', label: '% PL2A/GMV', kind: 'line' }] },
    { id: 'c_don_thang', title: `Đơn hàng theo THÁNG · Sàn ${san}`, type: 'bar', table: 'cpv_thang', x: 'thang', series: [{ key: 'so_don', label: 'Hoàn tất' }, { key: 'don_fail', label: 'Thất bại' }, { key: 'don_huy', label: 'Hoàn hủy' }, { key: 'ti_le_fail', label: 'Tỉ lệ thất bại', kind: 'line' }, { key: 'ti_le_huy', label: 'Tỉ lệ hoàn hủy', kind: 'line' }] },
    { id: 'c_spdv', title: `GMV – PL1 – PL2A theo SPDV · Sàn ${san}`, type: 'bar', table: 'kqkd_spdv', x: 'spdv', series: [{ key: 'gmv', label: 'GMV' }, { key: 'pl1', label: 'PL1' }, { key: 'pl2a', label: 'PL2A' }, { key: 'pct_pl1', label: '% PL1/GMV', kind: 'line' }, { key: 'pct_pl2a', label: '% PL2A/GMV', kind: 'line' }] },
    { id: 'c_don_spdv', title: `Số đơn theo SPDV · Sàn ${san}`, type: 'bar', table: 'don_spdv', x: 'spdv', series: [{ key: 'so_don', label: 'Số đơn Hoàn Tất' }] },
  ],
});

const CPV_SAN_REPORTS = SAN_LIST.map(cpvSanReport);

export const REPORTS = [
  /* ---------------------------------------------------------- PKT1 */
  {
    code: 'PKT1',
    slug: 'pkt1',
    name: 'Báo cáo TỈ GIÁ',
    short: 'TỈ GIÁ',
    nav: 'Tỉ giá & vị thế ngoại tệ',
    tier: 2,
    sla: 'Ngày 1',
    periods: ['day', 'week', 'month'],
    defaultPeriod: 'day',
    source: 'HQS - BẢNG TỶ GIÁ HÀNG TUẦN',
    /* Đọc trực tiếp Google Sheet (File → Share → Publish to web).
       PKT cập nhật tỉ giá hàng tuần vào file này, web tự đọc — không cần nạp tay. */
    sheet: {
      url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRBzYH7dMHHBU1PhVf368oCNlLhKhGFclc4VuH9nucqShlrk5fxbYtUUBUUAbYXzm7c3nXO6P7Yb9vQ/pubhtml?gid=0&single=true',
      gid: '0',
      mode: 'weekly_matrix',
      table: 'weekly_rate',
      label: 'HQS - BẢNG TỶ GIÁ HÀNG TUẦN · tab WEEKLY RATE',
    },
    purpose: [
      'Hôm nay áp tỷ giá nào để ghi nhận doanh thu, giá vốn, thanh toán ngoại tệ?',
      'Tháng này lãi/lỗ chênh lệch tỷ giá bao nhiêu, ăn vào lợi nhuận bao nhiêu %?',
      'HQ đang giữ bao nhiêu ngoại tệ (USDT/USD/PAYPAL), biến động 1% ảnh hưởng bao nhiêu tiền?',
    ],
    kpis: [
      { key: 'rub_usdt', code: 'ER1', label: 'RUB/USDT — Playerok', type: 'rate', note: 'TB lần rút tuần trước' },
      { key: 'idr_usdt', code: 'ER1', label: 'IDR/USDT — Itemku', type: 'rate', note: 'TB lần rút tuần trước' },
      { key: 'usdt_vnd_co', code: 'ER2-CO', label: 'USDT/VND — Tỉ giá giá vốn', type: 'rate', note: 'Tỉ giá thực' },
      { key: 'usdt_vnd_rev', code: 'ER2-RE', label: 'USDT/VND — Tỉ giá doanh thu', type: 'rate', note: 'CO Rate − 2%' },
      { key: 'bien_dong_7d', code: 'Δ7D', label: 'Biến động USDT/VND 7 ngày', type: 'pct', tone: 'auto', note: 'Ngưỡng cảnh báo 2%' },
      { key: 'so_du_ngoai_te', code: 'FX-POS', label: 'Số dư ngoại tệ quy đổi VND', type: 'money' },
      { key: 'cltg_thang', code: 'FX-P&L', label: 'Lãi/lỗ chênh lệch tỉ giá tháng', type: 'money', tone: 'auto' },
      { key: 'cltg_tren_ln', code: '%LN', label: '% CLTG ăn vào lợi nhuận', type: 'pct', tone: 'warn' },
      { key: 'sensitivity_1pct', code: '±1%', label: 'Ảnh hưởng khi tỉ giá đổi 1%', type: 'money', tone: 'flip' },
    ],
    tables: [
      {
        id: 'weekly_rate',
        title: 'Tỉ giá tuần (WEEKLY RATE) — áp dụng ghi nhận sổ',
        hint: 'Tự đọc từ Google Sheet, mỗi tuần một dòng. Lệch > 2% so tuần trước → dùng tỉ giá thực tế thứ Hai.',
        hidden: true, // đã có bảng ma trận LIVE đọc thẳng từ sheet, không hiển thị bản trùng
        columns: [
          { key: 'nam', label: 'Năm', type: 'text' },
          { key: 'thang', label: 'Tháng', type: 'text' },
          { key: 'tuan', label: 'Tuần', type: 'text' },
          { key: 'tu_ngay', label: 'Từ ngày', type: 'text' },
          { key: 'den_ngay', label: 'Đến ngày', type: 'text' },
          { key: 'rub_usdt', label: 'RUB/USDT', type: 'rate' },
          { key: 'rub_vnd', label: 'RUB/VND', type: 'rate' },
          { key: 'idr_usdt', label: 'IDR/USDT', type: 'rate' },
          { key: 'idr_vnd', label: 'IDR/VND', type: 'rate' },
          { key: 'eur_usdt', label: 'USDT/EUR', type: 'rate' },
          { key: 'usdt_vnd_co', label: 'USDT/VND (CO)', type: 'rate' },
          { key: 'usdt_vnd_rev', label: 'USDT/VND (REV)', type: 'rate' },
          { key: 'usd_vnd', label: 'USD/VND', type: 'rate' },
          { key: 'gap_2_tuan', label: 'Gap 2 tuần', type: 'pct' },
          { key: 'vuot_nguong', label: 'Vượt ngưỡng 2%', type: 'text' },
        ],
      },
      {
        id: 'daily_rate',
        title: 'Tỉ giá ngày (DAILY RATE) — theo dõi thị trường',
        hint: 'Nguồn: sheet BC.N. Dùng để so sánh với tỉ giá nội bộ đang áp.',
        hidden: true, // dữ liệu ngày chỉ hiển thị qua biểu đồ xu hướng, không bày bảng
        columns: [
          { key: 'ngay', label: 'Ngày', type: 'date' },
          { key: 'tuan', label: 'Tuần', type: 'text' },
          { key: 'rub_usdt', label: 'RUB/USDT', type: 'rate' },
          { key: 'rub_vnd', label: 'RUB/VND', type: 'rate' },
          { key: 'idr_usdt', label: 'IDR/USDT', type: 'rate' },
          { key: 'idr_vnd', label: 'IDR/VND', type: 'rate' },
          { key: 'usdt_vnd', label: 'USDT/VND', type: 'rate' },
          { key: 'usd_vnd', label: 'USD/VND', type: 'rate' },
          { key: 'eur_usdt', label: 'EUR/USDT', type: 'rate' },
          { key: 'bd_rub_usdt', label: 'Biến động RUB/USDT', type: 'pct' },
          { key: 'bd_usdt_vnd', label: 'Biến động USDT/VND', type: 'pct' },
        ],
      },
      {
        id: 'fx_position',
        title: 'Vị thế ngoại tệ đang nắm giữ',
        hint: 'Số dư cuối kỳ theo từng ví/sàn. Cột “Ảnh hưởng ±1%” = Quy đổi VND × 1%.',
        hidden: true,
        columns: [
          { key: 'loai_tien', label: 'Loại tiền', type: 'text' },
          { key: 'vi_san', label: 'Ví / Sàn', type: 'text' },
          { key: 'so_du', label: 'Số dư nguyên tệ', type: 'num' },
          { key: 'ty_gia', label: 'Tỉ giá quy đổi', type: 'rate' },
          { key: 'quy_doi_vnd', label: 'Quy đổi VND', type: 'money' },
          { key: 'ti_trong', label: 'Tỉ trọng', type: 'pct' },
          { key: 'anh_huong_1pct', label: 'Ảnh hưởng ±1%', type: 'money' },
        ],
      },
      {
        id: 'fx_pl',
        title: 'Lãi/lỗ chênh lệch tỉ giá theo tháng',
        hidden: true,
        columns: [
          { key: 'thang', label: 'Tháng', type: 'text' },
          { key: 'cltg_thuc_hien', label: 'CLTG đã thực hiện', type: 'money' },
          { key: 'cltg_danh_gia', label: 'CLTG đánh giá lại', type: 'money' },
          { key: 'tong_cltg', label: 'Tổng CLTG', type: 'money' },
          { key: 'pl2', label: 'PL2 tháng', type: 'money' },
          { key: 'ty_le', label: 'CLTG / PL2', type: 'pct' },
        ],
      },
    ],
    charts: [
      { id: 'c_rate', title: 'Xu hướng tỉ giá theo ngày', type: 'line', table: 'daily_rate', x: 'ngay', series: [{ key: 'usdt_vnd', label: 'USDT/VND' }, { key: 'usd_vnd', label: 'USD/VND' }] },
      { id: 'c_rub', title: 'RUB/VND & IDR/VND', type: 'line', table: 'daily_rate', x: 'ngay', series: [{ key: 'rub_vnd', label: 'RUB/VND' }, { key: 'idr_vnd', label: 'IDR/VND' }] },
    ],
  },

  /* ---------------------------------------------------------- PKT2 */
  /* ---------------------- Tầng 1: Điều hành ---------------------- */
  /* --------------------------------------------------------- PKT20 */
  {
    code: 'PKT20',
    slug: 'pkt20',
    name: 'Báo cáo CPV HQ Holdings',
    short: 'CPV HOLDINGS',
    nav: 'CPV HQ Holdings (toàn tập đoàn)',
    tier: 1,
    sla: 'Ngày 5',
    periods: ['day', 'week', 'month'],
    defaultPeriod: 'month',
    source: 'Gộp: đơn hàng BE HQS · lịch sử ví HQS · Daily.Report Ritokey',
    /* Bản BE (mặc định) và bản theo VÍ — nút chuyển nằm ở đầu trang.
       Ritokey chỉ có bản BE nên luôn đọc chung một nguồn. */
    sheet: {
      url: CPV_SHEET_URL,
      gid: '0',
      mains: CPV_MAINS,
      hist: true,
      mode: 'holdings',
      api: CPV_API,
      label: 'HQ Holdings theo BE',
    },
    sheetVi: {
      ...VI_LIVE,
      mode: 'holdings',
      kind: 'vi',
      endpoint: '/api/vi',
      label: 'HQ Holdings theo lịch sử ví',
    },
    sheetRitokey: { url: RITOKEY_SHEET_URL, qs: { gids: '851205159' } },
    sheetQltt: QLTT_SHEET,
    srcLabel: { be: 'HQ theo BE', vi: 'HQ theo ví' },
    purpose: [
      'Cả tập đoàn đang có bao nhiêu GMV, doanh thu (RE) và giá vốn (CO) trong kỳ?',
      'Đơn vị nào — HQS, Ritokey, QLTT, HQ Thailand — đóng góp bao nhiêu phần doanh thu?',
      'So giữa các team: team nào doanh thu lớn, team nào giá vốn ăn mòn biên lãi?',
    ],
    kpis: [
      { key: 're', code: 'RE', label: 'Doanh thu toàn tập đoàn', type: 'money' },
      { key: 'co', code: 'CO', label: 'Giá vốn', type: 'money', tone: 'loss' },
      { key: 'pl1', code: 'PL1', label: 'Lãi gộp (RE − CO)', type: 'money', tone: 'auto' },
      { key: 'ty_le_co', code: '%CO', label: '% Giá vốn / Doanh thu', type: 'pct', tone: 'warn' },
      { key: 'bien_pl1', code: '%PL1', label: 'Biên lãi gộp (PL1/RE)', type: 'pct', tone: 'auto' },
      { key: 'so_don', code: 'ORD', label: 'Số đơn', type: 'num' },
      { key: 'gmv', code: 'GMV', label: 'Doanh số (GMV)', type: 'money' },
    ],
    tables: [
      {
        id: 'hq_don_vi',
        title: 'So sánh theo ĐƠN VỊ',
        totals: true,
        hint: 'GMV = doanh số trên đơn · RE = doanh thu ghi nhận (HQS BE: GMV − phí sàn · bản ví: tiền thực nhận · Ritokey: dòng Doanh thu của file) · CO = giá vốn · PL1 = RE − CO. QLTT và HQ Thailand chưa nối nguồn nên đang bằng 0.',
        columns: [
          { key: 'don_vi', label: 'Đơn vị', type: 'text' },
          { key: 'nguon', label: 'Nguồn số', type: 'text' },
          { key: 'so_don', label: 'Số đơn', type: 'num' },
          { key: 'gmv', label: 'GMV', type: 'money' },
          { key: 're', label: 'RE', type: 'money' },
          { key: 'co', label: 'CO', type: 'money' },
          { key: 'pl1', label: 'PL1', type: 'money' },
          { key: 'ty_le_co', label: '% CO/RE', type: 'pct', totalOf: ['co', 're'] },
          { key: 'bien_pl1', label: 'Biên PL1', type: 'pct', totalOf: ['pl1', 're'] },
          { key: 'ty_trong', label: 'Tỉ trọng RE', type: 'pct', totalOf: ['re', 're'] },
        ],
      },
      {
        id: 'hq_team',
        title: 'So sánh theo TEAM',
        totals: true,
        hint: 'Team của HQS lấy từ BU trên file đơn hàng; Ritokey đứng riêng là C300.',
        columns: [
          { key: 'team', label: 'Team', type: 'text' },
          { key: 'don_vi', label: 'Đơn vị', type: 'text' },
          { key: 'so_don', label: 'Số đơn', type: 'num' },
          { key: 'gmv', label: 'GMV', type: 'money' },
          { key: 're', label: 'RE', type: 'money' },
          { key: 'co', label: 'CO', type: 'money' },
          { key: 'pl1', label: 'PL1', type: 'money' },
          { key: 'ty_le_co', label: '% CO/RE', type: 'pct', totalOf: ['co', 're'] },
          { key: 'bien_pl1', label: 'Biên PL1', type: 'pct', totalOf: ['pl1', 're'] },
          { key: 'ty_trong', label: 'Tỉ trọng RE', type: 'pct', totalOf: ['re', 're'] },
        ],
      },
      {
        id: 'hq_thang',
        title: 'Toàn tập đoàn theo THÁNG',
        totals: true,
        columns: [
          { key: 'thang', label: 'Tháng', type: 'text' },
          { key: 'so_don', label: 'Số đơn', type: 'num' },
          { key: 'gmv', label: 'GMV', type: 'money' },
          { key: 're', label: 'RE', type: 'money' },
          { key: 'co', label: 'CO', type: 'money' },
          { key: 'pl1', label: 'PL1', type: 'money' },
          { key: 'ty_le_co', label: '% CO/RE', type: 'pct', totalOf: ['co', 're'] },
          { key: 'bien_pl1', label: 'Biên PL1', type: 'pct', totalOf: ['pl1', 're'] },
        ],
      },
    ],
    charts: [
      { id: 'c_don_vi', title: 'Doanh thu theo ĐƠN VỊ = Giá vốn + PL1 (xếp chồng)', type: 'bar', table: 'hq_don_vi', x: 'don_vi', series: [{ key: 'co', label: 'Giá vốn', stack: true }, { key: 'pl1', label: 'PL1', stack: true }, { key: 'ty_le_co', label: '% CO/RE', kind: 'line' }], tip: [{ key: 're', label: 'Doanh thu' }, { key: 'gmv', label: 'GMV' }, { key: 'so_don', label: 'Số đơn', type: 'num' }] },
      { id: 'c_team', title: 'Doanh thu theo TEAM = Giá vốn + PL1 (xếp chồng)', type: 'bar', table: 'hq_team', x: 'team', series: [{ key: 'co', label: 'Giá vốn', stack: true }, { key: 'pl1', label: 'PL1', stack: true }, { key: 'ty_le_co', label: '% CO/RE', kind: 'line' }], tip: [{ key: 're', label: 'Doanh thu' }, { key: 'gmv', label: 'GMV' }, { key: 'so_don', label: 'Số đơn', type: 'num' }] },
      { id: 'c_thang', title: 'Toàn tập đoàn theo THÁNG', type: 'bar', table: 'hq_thang', x: 'thang', series: [{ key: 'co', label: 'Giá vốn', stack: true }, { key: 'pl1', label: 'PL1', stack: true }, { key: 'ty_le_co', label: '% CO/RE', kind: 'line' }], tip: [{ key: 're', label: 'Doanh thu' }, { key: 'gmv', label: 'GMV' }, { key: 'so_don', label: 'Số đơn', type: 'num' }] },
      { id: 'c_ty_trong', title: 'Tỉ trọng doanh thu giữa các TEAM', type: 'pie', table: 'hq_team', x: 'team', series: [{ key: 're', label: 'Doanh thu' }] },
    ],
  },

  /* ------------------------------------------------- PKT21 · PKT22 */
  qlttTeamReport('PKT21', 'HQC100', 'VX101'),
  qlttTeamReport('PKT22', 'HQSC200', 'WGG'),

  {
    code: 'PKT2',
    slug: 'pkt2',
    name: 'Báo cáo KQKD (P&L)',
    short: 'KQKD',
    nav: 'KQKD — P&L theo Sàn / BU',
    tier: 1,
    sla: 'Ngày 15',
    periods: ['month', 'quarter', 'year'],
    defaultPeriod: 'month',
    source: '2026 PnL_HQG FINANCIAL REPORT',
    purpose: [
      'Tháng này HQ lãi hay lỗ bao nhiêu, theo từng Sàn / BU / Khối KD / toàn HQGroup?',
      'Lợi nhuận đến từ đâu, mất ở đâu — dòng chi phí nào đang ăn mòn biên?',
      'Số này có tin được không (giá vốn đã map đủ chưa, hoàn hủy & khuyến mại đã trừ chưa)?',
    ],
    kpis: [
      { key: 'gmv', code: 'GMV', label: 'Tổng giá trị giao dịch', type: 'money' },
      { key: 're', code: 'RE', label: 'Doanh thu net (RE1+RE2)', type: 'money' },
      { key: 'cogs', code: 'COGS', label: 'Giá vốn (CO1+CO2+CO3)', type: 'money', tone: 'loss' },
      { key: 'pl1', code: 'PL1', label: 'Lãi sau giá vốn', type: 'money', tone: 'auto' },
      { key: 'pl2a', code: 'PL2A', label: 'Lãi sau phí sàn & phí rút', type: 'money', tone: 'auto' },
      { key: 'pl2', code: 'PL2', label: 'Lãi sau chi phí trực tiếp', type: 'money', tone: 'auto' },
      { key: 'pl7', code: 'PL7', label: 'Lãi sau chi phí gián tiếp', type: 'money', tone: 'auto' },
      { key: 'bien_pl2', code: '%PL2', label: 'Biên PL2 / RE', type: 'pct', tone: 'auto' },
      { key: 'fg', code: 'FG', label: 'Flip Gain', type: 'money', tone: 'flip' },
    ],
    tables: [
      {
        id: 'pnl_main',
        title: 'P&L theo cây khái niệm tài chính HQS',
        hint: 'Giữ nguyên mã chỉ số để đối chiếu với từ điển khái niệm HQS.',
        columns: [
          { key: 'ma', label: 'Mã', type: 'text' },
          { key: 'khoan_muc', label: 'Khoản mục', type: 'text' },
          { key: 'cong_thuc', label: 'Công thức', type: 'text' },
          { key: 'ky_nay', label: 'Kỳ này', type: 'money' },
          { key: 'ky_truoc', label: 'Kỳ trước', type: 'money' },
          { key: 'mom', label: '% MoM', type: 'pct' },
          { key: 'luy_ke', label: 'Lũy kế năm', type: 'money' },
          { key: 'tren_re', label: '% / RE', type: 'pct' },
        ],
        seed: [
          { ma: 'GMV1', khoan_muc: 'GMV mô hình Tự nhập bán', cong_thuc: 'GMV100..104' },
          { ma: 'GMV2', khoan_muc: 'GMV mô hình Flip', cong_thuc: 'GMV200..204' },
          { ma: 'RR', khoan_muc: 'Giảm trừ doanh thu (hoàn hủy)', cong_thuc: 'RR1 + RR2' },
          { ma: 'AR', khoan_muc: 'Phải trả NCC / Sàn Flip', cong_thuc: 'AR1 + AR2' },
          { ma: 'RE', khoan_muc: 'DOANH THU NET', cong_thuc: 'RE1 + RE2' },
          { ma: 'CO1', khoan_muc: 'Giá vốn hàng bán', cong_thuc: 'CO100..104' },
          { ma: 'CO2', khoan_muc: 'Giá vốn cung ứng (nhân sự xử lý đơn)', cong_thuc: 'CO200 + CO201' },
          { ma: 'CO3', khoan_muc: 'Giá vốn die / thất thoát / dự phòng', cong_thuc: 'CO300 + CO301' },
          { ma: 'PL1', khoan_muc: 'LÃI SAU GIÁ VỐN', cong_thuc: 'RE − COGS' },
          { ma: 'SF', khoan_muc: 'Phí sàn', cong_thuc: 'SF1 + SF2' },
          { ma: 'CF', khoan_muc: 'Phí rút tiền (gồm quy đổi USDT)', cong_thuc: 'Phí thực rút + FV × biến phí' },
          { ma: 'PL2A', khoan_muc: 'LÃI SAU PHÍ BÁN HÀNG', cong_thuc: 'PL1 − SF − CF' },
          { ma: 'SE', khoan_muc: 'Chi phí nhân sự bán hàng', cong_thuc: 'SE1 + SE2' },
          { ma: 'ME', khoan_muc: 'Chi phí marketing / ads', cong_thuc: 'ME1 + ME2' },
          { ma: 'OP', khoan_muc: 'Chi phí vận hành trực tiếp', cong_thuc: 'OP1 + OP2' },
          { ma: 'FI', khoan_muc: 'Chi phí tài chính & thuế', cong_thuc: 'FI1 + FI2' },
          { ma: 'FG', khoan_muc: 'Flip Gain', cong_thuc: 'FG1 + FG2' },
          { ma: 'PL2', khoan_muc: 'LÃI SAU CHI PHÍ TRỰC TIẾP', cong_thuc: 'PL201 + PL202 + FG' },
          { ma: 'OV', khoan_muc: 'Chi phí nhân sự gián tiếp (BOD, BO)', cong_thuc: 'OVS+OVC+OVE+OVP+OVD' },
          { ma: 'CA', khoan_muc: 'Chi phí tài sản & khấu hao', cong_thuc: 'CA1 + CA2' },
          { ma: 'OT', khoan_muc: 'Chi phí khác', cong_thuc: '' },
          { ma: 'PL7', khoan_muc: 'LỢI NHUẬN SAU CÙNG', cong_thuc: 'PL2 − OV − CA − OT' },
        ],
      },
      {
        id: 'pnl_by_dim',
        title: 'P&L bóc theo Sàn / BU / Khối kinh doanh',
        hint: 'Mỗi dòng là 1 đối tượng. Cột “Chiều” để lọc: Sàn, BU, Khối, Group.',
        columns: [
          { key: 'chieu', label: 'Chiều', type: 'text' },
          { key: 'ten', label: 'Tên', type: 'text' },
          { key: 'gmv', label: 'GMV', type: 'money' },
          { key: 'rr', label: 'RR', type: 'money' },
          { key: 're', label: 'RE', type: 'money' },
          { key: 'cogs', label: 'COGS', type: 'money' },
          { key: 'pl1', label: 'PL1', type: 'money' },
          { key: 'sf', label: 'SF', type: 'money' },
          { key: 'cf', label: 'CF', type: 'money' },
          { key: 'pl2a', label: 'PL2A', type: 'money' },
          { key: 'se', label: 'SE', type: 'money' },
          { key: 'me', label: 'ME', type: 'money' },
          { key: 'op', label: 'OP', type: 'money' },
          { key: 'fi', label: 'FI', type: 'money' },
          { key: 'fg', label: 'FG', type: 'money' },
          { key: 'pl2', label: 'PL2', type: 'money' },
          { key: 'bien_pl2', label: '% PL2/RE', type: 'pct' },
        ],
      },
      {
        id: 'dq_check',
        title: 'Kiểm tra chất lượng số liệu trước khi chốt',
        hint: 'Theo SOP ghi nhận doanh thu – giá vốn. Đủ 5 dòng xanh mới được phát hành P&L.',
        columns: [
          { key: 'chi_tieu', label: 'Chỉ tiêu kiểm tra', type: 'text' },
          { key: 'so_don', label: 'Số đơn', type: 'num' },
          { key: 'gia_tri', label: 'Giá trị', type: 'money' },
          { key: 'trang_thai', label: 'Trạng thái', type: 'text' },
          { key: 'nguoi_xu_ly', label: 'Người xử lý', type: 'text' },
          { key: 'han', label: 'Hạn xử lý', type: 'date' },
        ],
        seed: [
          { chi_tieu: 'Đơn thiếu ID lô hàng / SKU (chưa map được giá vốn) — case 6c' },
          { chi_tieu: 'Đơn lệch tháng: tiền vào ví T(n), BE confirm T(n+1) — case 6b' },
          { chi_tieu: 'Tiền vào ví nhưng không có BE — case 6a' },
          { chi_tieu: 'BE Hoàn tất nhưng sàn đã hủy/refund — case 6g' },
          { chi_tieu: 'Chênh DT giữa BE và ví (phí sàn / tỉ giá) > $0.05 — case 6f' },
          { chi_tieu: 'Chargeback / khiếu nại chưa đảo bút toán — case 4d' },
          { chi_tieu: 'Đơn freeze U7buy còn treo — case 6e' },
        ],
      },
    ],
    charts: [
      { id: 'c_pl2_dim', title: 'PL2 theo đối tượng', type: 'bar', table: 'pnl_by_dim', x: 'ten', series: [{ key: 'pl2', label: 'PL2' }] },
      { id: 'c_re_cogs', title: 'RE và COGS theo đối tượng', type: 'bar', table: 'pnl_by_dim', x: 'ten', series: [{ key: 're', label: 'RE' }, { key: 'cogs', label: 'COGS' }] },
    ],
  },

  /* ---------------------------------------------------------- PKT3 */
  {
    code: 'PKT3',
    slug: 'pkt3',
    name: 'Báo cáo DÒNG TIỀN',
    short: 'DÒNG TIỀN',
    nav: 'Dòng tiền & dự báo chi trả',
    tier: 1,
    sla: 'Ngày 5',
    periods: ['week', 'month', 'quarter'],
    defaultPeriod: 'month',
    source: 'File Báo cáo TIỀN (MISA T1–T6 · sao kê T7+ · HubPay · Balance)',
    /* Đọc thẳng tab 7_BCLCTT + 0_DASHBOARD của file Báo cáo TIỀN */
    sheet: {
      url: TIEN_SHEET_URL,
      mode: 'cash_flow',
      label: 'Báo cáo TIỀN ver4 · 2026',
      /* Danh sách gid các tab PKT gửi — server tự nhận vai trò từng tab
         theo nội dung nên không cần đúng thứ tự. Thêm tab mới cứ nối vào. */
      qs: { gids: '116298870,959678702,513088085,1068979883,731668787,2029983632' },
    },
    purpose: [
      'Kỳ này tiền vào bao nhiêu, ra bao nhiêu, còn lại bao nhiêu — theo từng loại tiền?',
      'Lợi nhuận trên sổ có biến thành tiền thật không, nếu không thì tiền đang nằm ở đâu (tồn kho / công nợ)?',
      'Tuần/tháng tới có đủ tiền trả NCC, CTV, lương, IDOL không?',
    ],
    kpis: [
      { key: 'tien_dau_ky', code: 'CF-OB', label: 'Tiền đầu kỳ', type: 'money' },
      { key: 'tong_thu', code: 'CF-IN', label: 'Tổng tiền vào', type: 'money', tone: 'gain' },
      { key: 'tong_chi', code: 'CF-OUT', label: 'Tổng tiền ra', type: 'money', tone: 'loss' },
      { key: 'tien_cuoi_ky', code: 'CF-CB', label: 'Tiền cuối kỳ', type: 'money' },
      { key: 'ocf', code: 'OCF', label: 'Dòng tiền hoạt động KD', type: 'money', tone: 'auto' },
      { key: 'gap_ln_tien', code: 'GAP', label: 'Chênh lệch PL2 − OCF', type: 'money', tone: 'warn' },
      { key: 'so_ngay_du_tra', code: 'RUNWAY', label: 'Số ngày tiền đủ chi trả', type: 'num', tone: 'auto' },
      { key: 'tien_bi_chon', code: 'TRAP', label: 'Tiền đang bị chôn (tồn + phải thu)', type: 'money', tone: 'warn' },
    ],
    tables: [
      {
        id: 'cf_thang',
        title: 'BCLCTT theo tháng (B03a-DNN) — đọc trực tiếp từ file Báo cáo TIỀN',
        hint: 'T1–T6 lấy từ sổ MISA · T7 trở đi từ sao kê. Mã 20/30/40 là 3 dòng tiền thuần, mã 70 là tiền cuối kỳ.',
        columns: [
          { key: 'ma', label: 'Mã', type: 'text' },
          { key: 'chi_tieu', label: 'Chỉ tiêu', type: 'text' },
          { key: 't1', label: 'T1', type: 'money' },
          { key: 't2', label: 'T2', type: 'money' },
          { key: 't3', label: 'T3', type: 'money' },
          { key: 't4', label: 'T4', type: 'money' },
          { key: 't5', label: 'T5', type: 'money' },
          { key: 't6', label: 'T6', type: 'money' },
          { key: 't7', label: 'T7', type: 'money' },
          { key: 't8', label: 'T8', type: 'money' },
          { key: 'luy_ke', label: 'Luỹ kế', type: 'money' },
        ],
      },
      {
        id: 'cf_tien',
        title: 'Dòng tiền theo loại tiền — luỹ kế 2026',
        hint: 'Tách từ 2 bản BCLCTT của file: sổ VNĐ và sổ ngoại tệ (đã quy đổi VNĐ theo bảng tỷ giá). Cột Tổng là bản chính thức.',
        columns: [
          { key: 'ma', label: 'Mã', type: 'text' },
          { key: 'chi_tieu', label: 'Chỉ tiêu', type: 'text' },
          { key: 'vnd', label: 'Sổ VNĐ', type: 'money' },
          { key: 'ngoai_te_qd', label: 'Sổ ngoại tệ (quy đổi VNĐ)', type: 'money' },
          { key: 'tong', label: 'Tổng hợp', type: 'money' },
        ],
      },
      {
        id: 'cf_kiem_soat',
        title: 'Khối kiểm soát — phải sạch trước khi phát hành',
        hint: 'Dòng C là chênh lệch giữa biến động tiền theo sổ và BCLCTT; dòng E chỉ hiện OK khi đã gán hết mã B03a.',
        columns: [
          { key: 'chi_tieu', label: 'Chỉ tiêu kiểm soát', type: 'text' },
          { key: 't7', label: 'T7', type: 'money' },
          { key: 't8', label: 'T8', type: 'money' },
          { key: 'luy_ke', label: 'Luỹ kế', type: 'money' },
          { key: 'trang_thai', label: 'Trạng thái', type: 'text' },
        ],
      },
      {
        id: 'viec_ton',
        title: 'Việc tồn đang chặn phát hành báo cáo',
        hint: 'Lấy từ khối G của tab 0_DASHBOARD — mỗi dòng là một việc phải xử lý xong số mới dùng được.',
        columns: [
          { key: 'viec', label: 'Việc', type: 'text' },
          { key: 'so_luong', label: 'Số lượng', type: 'text' },
          { key: 'ai', label: 'Ai làm', type: 'text' },
          { key: 'chan', label: 'Đang chặn', type: 'text' },
        ],
      },
      {
        id: 'cf_summary',
        title: 'Dòng tiền tổng hợp theo loại tiền',
        columns: [
          { key: 'khoan_muc', label: 'Khoản mục', type: 'text' },
          { key: 'ma', label: 'Mã', type: 'text' },
          { key: 'vnd', label: 'VND', type: 'money' },
          { key: 'usdt', label: 'USDT', type: 'num' },
          { key: 'usd', label: 'USD', type: 'num' },
          { key: 'rub', label: 'RUB', type: 'num' },
          { key: 'idr', label: 'IDR', type: 'num' },
          { key: 'paypal', label: 'PayPal', type: 'num' },
          { key: 'quy_doi_vnd', label: 'Quy đổi VND', type: 'money' },
        ],
        seed: [
          { khoan_muc: 'Tiền đầu kỳ', ma: 'OB' },
          { khoan_muc: 'Thu từ bán hàng (về ví sàn)', ma: 'IN-RE' },
          { khoan_muc: 'Thu khác / hoàn tiền / seller reward', ma: 'IN-OT' },
          { khoan_muc: 'Chi mua hàng — NCC', ma: 'OUT-CO' },
          { khoan_muc: 'Chi phí sàn & phí rút', ma: 'OUT-FEE' },
          { khoan_muc: 'Chi lương & CTV & IDOL', ma: 'OUT-SE' },
          { khoan_muc: 'Chi vận hành / marketing', ma: 'OUT-OP' },
          { khoan_muc: 'Chi tài chính, thuế', ma: 'OUT-FI' },
          { khoan_muc: 'Tiền cuối kỳ', ma: 'CB' },
        ],
      },
      {
        id: 'cf_detail',
        title: 'Chi tiết phát sinh tiền',
        hint: 'Đổ từ HubPay / sao kê ví sàn / MISA. Mỗi dòng 1 giao dịch.',
        columns: [
          { key: 'ngay', label: 'Ngày', type: 'date' },
          { key: 'loai', label: 'Thu / Chi', type: 'text' },
          { key: 'nhom', label: 'Nhóm', type: 'text' },
          { key: 'dien_giai', label: 'Diễn giải', type: 'text' },
          { key: 'vi_san', label: 'Ví / Sàn', type: 'text' },
          { key: 'loai_tien', label: 'Loại tiền', type: 'text' },
          { key: 'so_tien', label: 'Số tiền', type: 'num' },
          { key: 'ty_gia', label: 'Tỉ giá', type: 'rate' },
          { key: 'quy_doi_vnd', label: 'Quy đổi VND', type: 'money' },
          { key: 'doi_tuong', label: 'Đối tượng', type: 'text' },
          { key: 'bu', label: 'BU / Team', type: 'text' },
        ],
      },
      {
        id: 'cf_reconcile',
        title: 'Cầu nối Lợi nhuận → Tiền thật',
        hint: 'PL2 (sổ) cộng/trừ các khoản không bằng tiền → OCF (tiền thật).',
        columns: [
          { key: 'khoan_muc', label: 'Khoản mục', type: 'text' },
          { key: 'gia_tri', label: 'Giá trị', type: 'money' },
          { key: 'ghi_chu', label: 'Ghi chú', type: 'text' },
        ],
        seed: [
          { khoan_muc: 'PL2 theo sổ' },
          { khoan_muc: '(+/−) Thay đổi hàng tồn kho' },
          { khoan_muc: '(+/−) Thay đổi phải thu / tiền hold trên sàn' },
          { khoan_muc: '(+/−) Thay đổi phải trả NCC (AR)' },
          { khoan_muc: '(+/−) Trả trước cho NCC' },
          { khoan_muc: '(+) Khấu hao & dự phòng (không bằng tiền)' },
          { khoan_muc: '(+/−) Chênh lệch tỉ giá chưa thực hiện' },
          { khoan_muc: '= Dòng tiền hoạt động kinh doanh (OCF)' },
        ],
      },
      {
        id: 'cf_forecast',
        title: 'Dự báo chi trả 4–8 tuần tới',
        columns: [
          { key: 'tuan', label: 'Tuần', type: 'text' },
          { key: 'tu_ngay', label: 'Từ ngày', type: 'date' },
          { key: 'ncc', label: 'Phải trả NCC', type: 'money' },
          { key: 'ctv', label: 'CTV', type: 'money' },
          { key: 'luong', label: 'Lương', type: 'money' },
          { key: 'idol', label: 'IDOL / KOL', type: 'money' },
          { key: 'khac', label: 'Khác', type: 'money' },
          { key: 'tong_chi', label: 'Tổng chi', type: 'money' },
          { key: 'du_kien_thu', label: 'Dự kiến thu', type: 'money' },
          { key: 'so_du_cuoi', label: 'Số dư dự kiến', type: 'money' },
          { key: 'trang_thai', label: 'Trạng thái', type: 'text' },
        ],
      },
    ],
    charts: [
      { id: 'c_cf', title: 'Thu — Chi — Số dư dự kiến theo tuần', type: 'bar', table: 'cf_forecast', x: 'tuan', series: [{ key: 'du_kien_thu', label: 'Thu' }, { key: 'tong_chi', label: 'Chi' }] },
      { id: 'c_bal', title: 'Số dư tiền dự kiến', type: 'line', table: 'cf_forecast', x: 'tuan', series: [{ key: 'so_du_cuoi', label: 'Số dư cuối tuần' }] },
    ],
  },

  /* ---------------------------------------------------------- PKT4 */
  {
    code: 'PKT4',
    slug: 'pkt4',
    name: 'Báo cáo B/S (Cân đối kế toán)',
    short: 'CÂN ĐỐI KT',
    nav: 'Cân đối kế toán (B/S)',
    tier: 1,
    sla: 'Ngày 5',
    periods: ['month', 'quarter', 'year'],
    defaultPeriod: 'month',
    source: 'MISA · Balance · Bảng kê tồn kho',
    purpose: [
      'Tại thời điểm cuối kỳ, HQ có bao nhiêu tài sản, nợ bao nhiêu, vốn chủ còn bao nhiêu?',
      'Tiền đang nằm ở đâu: tiền mặt · tồn kho · phải thu · trả trước cho NCC?',
      'Cơ cấu tài chính có an toàn không (nợ/vốn chủ), có khả năng thanh toán ngắn hạn không?',
    ],
    kpis: [
      { key: 'tong_tai_san', code: 'TA', label: 'Tổng tài sản', type: 'money' },
      { key: 'no_phai_tra', code: 'TL', label: 'Nợ phải trả', type: 'money', tone: 'loss' },
      { key: 'von_chu', code: 'EQ', label: 'Vốn chủ sở hữu', type: 'money', tone: 'gain' },
      { key: 'no_tren_von', code: 'D/E', label: 'Nợ / Vốn chủ', type: 'num', tone: 'auto' },
      { key: 'current_ratio', code: 'CR', label: 'Thanh toán hiện hành', type: 'num', tone: 'auto', note: 'An toàn ≥ 1.2' },
      { key: 'quick_ratio', code: 'QR', label: 'Thanh toán nhanh', type: 'num', tone: 'auto', note: 'An toàn ≥ 1.0' },
      { key: 'tien_tren_ts', code: '%CASH', label: 'Tiền / Tổng tài sản', type: 'pct' },
      { key: 'ton_tren_ts', code: '%INV', label: 'Tồn kho / Tổng tài sản', type: 'pct', tone: 'warn' },
    ],
    tables: [
      {
        id: 'bs_asset',
        title: 'TÀI SẢN',
        columns: [
          { key: 'ma', label: 'Mã', type: 'text' },
          { key: 'khoan_muc', label: 'Khoản mục', type: 'text' },
          { key: 'dau_ky', label: 'Đầu kỳ', type: 'money' },
          { key: 'cuoi_ky', label: 'Cuối kỳ', type: 'money' },
          { key: 'bien_dong', label: 'Biến động', type: 'money' },
          { key: 'ti_trong', label: 'Tỉ trọng', type: 'pct' },
          { key: 'ghi_chu', label: 'Ghi chú', type: 'text' },
        ],
        seed: [
          { ma: 'A1', khoan_muc: 'Tiền mặt & tiền gửi VND' },
          { ma: 'A2', khoan_muc: 'Số dư ví sàn (USDT/USD/RUB/IDR)' },
          { ma: 'A3', khoan_muc: 'Tiền đang hold trên sàn / pending' },
          { ma: 'A4', khoan_muc: 'Phải thu khách hàng & sàn' },
          { ma: 'A5', khoan_muc: 'Trả trước cho NCC' },
          { ma: 'A6', khoan_muc: 'Hàng tồn kho (theo PKT5)' },
          { ma: 'A7', khoan_muc: 'Dự phòng giảm giá tồn kho (CO301)' },
          { ma: 'A8', khoan_muc: 'Tài sản cố định & công cụ (CA)' },
          { ma: 'A9', khoan_muc: 'Tài sản khác' },
          { ma: 'TA', khoan_muc: 'TỔNG TÀI SẢN' },
        ],
      },
      {
        id: 'bs_liability',
        title: 'NGUỒN VỐN',
        columns: [
          { key: 'ma', label: 'Mã', type: 'text' },
          { key: 'khoan_muc', label: 'Khoản mục', type: 'text' },
          { key: 'dau_ky', label: 'Đầu kỳ', type: 'money' },
          { key: 'cuoi_ky', label: 'Cuối kỳ', type: 'money' },
          { key: 'bien_dong', label: 'Biến động', type: 'money' },
          { key: 'ti_trong', label: 'Tỉ trọng', type: 'pct' },
          { key: 'ghi_chu', label: 'Ghi chú', type: 'text' },
        ],
        seed: [
          { ma: 'L1', khoan_muc: 'Phải trả NCC Flip (AR1)' },
          { ma: 'L2', khoan_muc: 'Phải trả sàn Flip (AR2)' },
          { ma: 'L3', khoan_muc: 'Phải trả lương / CTV / IDOL' },
          { ma: 'L4', khoan_muc: 'Vay & nợ tài chính' },
          { ma: 'L5', khoan_muc: 'Thuế & phải nộp Nhà nước' },
          { ma: 'L6', khoan_muc: 'Phải trả khác' },
          { ma: 'TL', khoan_muc: 'TỔNG NỢ PHẢI TRẢ' },
          { ma: 'E1', khoan_muc: 'Vốn góp chủ sở hữu' },
          { ma: 'E2', khoan_muc: 'Lợi nhuận giữ lại' },
          { ma: 'EQ', khoan_muc: 'TỔNG VỐN CHỦ SỞ HỮU' },
        ],
      },
      {
        id: 'bs_ratio',
        title: 'Chỉ số an toàn tài chính',
        columns: [
          { key: 'chi_so', label: 'Chỉ số', type: 'text' },
          { key: 'cong_thuc', label: 'Công thức', type: 'text' },
          { key: 'ky_nay', label: 'Kỳ này', type: 'num' },
          { key: 'ky_truoc', label: 'Kỳ trước', type: 'num' },
          { key: 'nguong', label: 'Ngưỡng an toàn', type: 'text' },
          { key: 'danh_gia', label: 'Đánh giá', type: 'text' },
        ],
        seed: [
          { chi_so: 'Thanh toán hiện hành', cong_thuc: 'TS ngắn hạn / Nợ ngắn hạn', nguong: '≥ 1.2' },
          { chi_so: 'Thanh toán nhanh', cong_thuc: '(TS ngắn hạn − Tồn kho) / Nợ ngắn hạn', nguong: '≥ 1.0' },
          { chi_so: 'Nợ / Vốn chủ', cong_thuc: 'TL / EQ', nguong: '≤ 1.5' },
          { chi_so: 'Tỉ trọng tồn kho', cong_thuc: 'Tồn kho / Tổng tài sản', nguong: '≤ 30%' },
          { chi_so: 'Vốn lưu động ròng', cong_thuc: 'TS ngắn hạn − Nợ ngắn hạn', nguong: '> 0' },
        ],
      },
    ],
    charts: [
      { id: 'c_asset', title: 'Cơ cấu tài sản cuối kỳ', type: 'pie', table: 'bs_asset', x: 'khoan_muc', series: [{ key: 'cuoi_ky', label: 'Cuối kỳ' }] },
      { id: 'c_de', title: 'Nợ phải trả và Vốn chủ', type: 'bar', table: 'bs_liability', x: 'khoan_muc', series: [{ key: 'cuoi_ky', label: 'Cuối kỳ' }] },
    ],
  },

  /* ---------------------------------------------------------- PKT5 */
  {
    code: 'PKT5',
    slug: 'pkt5',
    name: 'Báo cáo HÀNG TỒN KHO',
    short: 'TỒN KHO',
    nav: 'Tồn kho & tuổi tồn',
    tier: 2,
    sla: 'Ngày 5',
    periods: ['day', 'week', 'month'],
    defaultPeriod: 'week',
    source: 'GoX / Hub · Bảng kê kho PVH-PCU · MISA',
    purpose: [
      'Đang tồn bao nhiêu hàng, trị giá bao nhiêu tiền, ở kho nào, SPDV nào?',
      'Bao nhiêu vốn đang bị chôn trong tồn kho, hàng nào nằm lâu không bán được?',
      'Số kho của PKT có khớp số của PVH/PCU không — có thất thoát không?',
    ],
    kpis: [
      { key: 'gia_tri_ton', code: 'INV', label: 'Giá trị tồn kho', type: 'money' },
      { key: 'sl_ton', code: 'QTY', label: 'Số lượng tồn', type: 'num' },
      { key: 'von_bi_chon', code: 'TRAP', label: 'Vốn bị chôn trong tồn kho', type: 'money', tone: 'warn' },
      { key: 'ton_30', code: '>30D', label: 'Giá trị tồn trên 30 ngày', type: 'money', tone: 'warn' },
      { key: 'ton_60', code: '>60D', label: 'Giá trị tồn trên 60 ngày', type: 'money', tone: 'loss' },
      { key: 'ton_90', code: '>90D', label: 'Giá trị tồn trên 90 ngày', type: 'money', tone: 'loss' },
      { key: 'chenh_lech', code: 'DIFF', label: 'Chênh lệch PKT vs PVH/PCU', type: 'money', tone: 'auto' },
      { key: 'du_phong', code: 'CO301', label: 'Dự phòng giảm giá đề xuất', type: 'money' },
      { key: 'dio', code: 'DIO', label: 'Số ngày tồn kho bình quân', type: 'num' },
    ],
    tables: [
      {
        id: 'inv_stock',
        title: 'Chi tiết tồn kho theo lô',
        columns: [
          { key: 'kho', label: 'Kho', type: 'text' },
          { key: 'spdv', label: 'SPDV', type: 'text' },
          { key: 'sku', label: 'SKU', type: 'text' },
          { key: 'ma_lo', label: 'Mã lô / ID lô hàng', type: 'text' },
          { key: 'sl_ton', label: 'SL tồn', type: 'num' },
          { key: 'don_gia', label: 'Đơn giá vốn', type: 'num' },
          { key: 'gia_tri', label: 'Giá trị tồn (VND)', type: 'money' },
          { key: 'ngay_nhap', label: 'Ngày nhập', type: 'date' },
          { key: 'tuoi_ton', label: 'Tuổi tồn (ngày)', type: 'num' },
          { key: 'nhom_tuoi', label: 'Nhóm tuổi', type: 'text' },
          { key: 'trang_thai', label: 'Trạng thái', type: 'text' },
          { key: 'bu', label: 'BU / Team', type: 'text' },
        ],
      },
      {
        id: 'inv_aging',
        title: 'Phân tích tuổi tồn kho (Aging)',
        columns: [
          { key: 'nhom_tuoi', label: 'Nhóm tuổi', type: 'text' },
          { key: 'sl', label: 'Số lượng', type: 'num' },
          { key: 'gia_tri', label: 'Giá trị', type: 'money' },
          { key: 'ti_trong', label: 'Tỉ trọng', type: 'pct' },
          { key: 'ty_le_du_phong', label: '% dự phòng', type: 'pct' },
          { key: 'du_phong', label: 'Dự phòng đề xuất', type: 'money' },
        ],
        seed: [
          { nhom_tuoi: '0 – 7 ngày' },
          { nhom_tuoi: '8 – 30 ngày' },
          { nhom_tuoi: '31 – 60 ngày' },
          { nhom_tuoi: '61 – 90 ngày' },
          { nhom_tuoi: 'Trên 90 ngày' },
        ],
      },
      {
        id: 'inv_reconcile',
        title: 'Đối chiếu 3 bên PKT — PVH — PCU',
        columns: [
          { key: 'kho', label: 'Kho', type: 'text' },
          { key: 'spdv', label: 'SPDV', type: 'text' },
          { key: 'so_pkt', label: 'Số PKT', type: 'num' },
          { key: 'so_pvh', label: 'Số PVH', type: 'num' },
          { key: 'so_pcu', label: 'Số PCU', type: 'num' },
          { key: 'chenh_lech', label: 'Chênh lệch', type: 'num' },
          { key: 'gia_tri_chenh', label: 'Giá trị chênh', type: 'money' },
          { key: 'nguyen_nhan', label: 'Nguyên nhân', type: 'text' },
          { key: 'xu_ly', label: 'Hướng xử lý', type: 'text' },
        ],
      },
    ],
    charts: [
      { id: 'c_aging', title: 'Giá trị tồn theo tuổi', type: 'bar', table: 'inv_aging', x: 'nhom_tuoi', series: [{ key: 'gia_tri', label: 'Giá trị tồn' }] },
      { id: 'c_inv_pie', title: 'Cơ cấu tồn theo tuổi', type: 'pie', table: 'inv_aging', x: 'nhom_tuoi', series: [{ key: 'gia_tri', label: 'Giá trị' }] },
    ],
  },

  /* ---------------------------------------------------------- PKT6 */
  {
    code: 'PKT6',
    slug: 'pkt6',
    name: 'CPV theo lịch sử ví HQS',
    short: 'CPV LS ví HQS',
    nav: 'CPV theo lịch sử ví HQS',
    tier: 2,
    sla: 'Ngày 5',
    periods: ['day', 'week', 'month'],
    defaultPeriod: 'month',
    source: 'Lịch sử ví sàn HQS10000',
    /* Doanh thu THỰC NHẬN về ví (đã sau phí sàn) — chỉ lấy dòng cột Tìm = DT.
       T7 đọc live tab THVí Tiền; T4–T6 nằm trong datalake (xem /api/vi). */
    sheet: {
      ...VI_LIVE,
      mode: 'order_cpv',
      endpoint: '/api/vi',
      label: 'Lịch sử ví HQS10000 · tab THVí Tiền (T7 + T8)',
    },
    purpose: [
      'Tiền THỰC NHẬN về ví sàn (sau phí) theo từng ngày, từng sàn, từng team là bao nhiêu?',
      '% giá vốn trên doanh thu thực nhận đang ở mức nào, sàn/loại đơn nào biên mỏng?',
      'So các tháng với nhau: tháng nào thực nhận tốt, biên cải thiện hay xấu đi?',
    ],
    kpis: [
      { key: 'doanh_thu_usd', code: 'USD', label: 'Thực nhận gốc (USD)', type: 'usd' },
      { key: 'gmv', code: 'DT', label: 'Thực nhận về ví (VND)', type: 'money' },
      { key: 'cogs', code: 'CO', label: 'Giá vốn (VND)', type: 'money', tone: 'loss' },
      { key: 'loi_nhuan', code: 'GP', label: 'Lợi nhuận gộp', type: 'money', tone: 'auto' },
      { key: 'ty_le_co', code: '%CO', label: '% Giá vốn / Thực nhận', type: 'pct', tone: 'warn' },
      { key: 'bien_ln', code: '%GP', label: 'Biên lợi nhuận gộp', type: 'pct', tone: 'auto' },
      { key: 'so_don', code: 'GD', label: 'Số giao dịch DT', type: 'num' },
    ],
    tables: [
      {
        id: 'cpv_ngay',
        title: 'Thực nhận – Giá vốn theo NGÀY',
        totals: true,
        columns: [
          { key: 'ngay', label: 'Ngày', type: 'text' },
          { key: 'so_don', label: 'Số GD', type: 'num' },
          { key: 'doanh_thu_usd', label: 'Thực nhận (USD)', type: 'usd' },
          { key: 'thanh_tien', label: 'Thực nhận (VND)', type: 'money' },
          { key: 'gia_von', label: 'Giá vốn (VND)', type: 'money' },
          { key: 'loi_nhuan', label: 'Lợi nhuận', type: 'money' },
          { key: 'ty_le_co', label: '% CO/DT', type: 'pct', totalOf: ['gia_von', 'thanh_tien'] },
          { key: 'bien_ln', label: 'Biên LN', type: 'pct', totalOf: ['loi_nhuan', 'thanh_tien'] },
        ],
      },
      {
        id: 'cpv_thang',
        title: 'Thực nhận – Giá vốn theo THÁNG',
        totals: true,
        columns: [
          { key: 'thang', label: 'Tháng', type: 'text' },
          { key: 'so_don', label: 'Số GD', type: 'num' },
          { key: 'doanh_thu_usd', label: 'Thực nhận (USD)', type: 'usd' },
          { key: 'thanh_tien', label: 'Thực nhận (VND)', type: 'money' },
          { key: 'gia_von', label: 'Giá vốn (VND)', type: 'money' },
          { key: 'loi_nhuan', label: 'Lợi nhuận', type: 'money' },
          { key: 'ty_le_co', label: '% CO/DT', type: 'pct', totalOf: ['gia_von', 'thanh_tien'] },
          { key: 'bien_ln', label: 'Biên LN', type: 'pct', totalOf: ['loi_nhuan', 'thanh_tien'] },
        ],
      },
      {
        id: 'cpv_san',
        title: 'Thực nhận – Giá vốn theo SÀN',
        totals: true,
        columns: [
          { key: 'san', label: 'Sàn', type: 'text' },
          { key: 'bu', label: 'BU', type: 'text' },
          { key: 'so_don', label: 'Số GD', type: 'num' },
          { key: 'doanh_thu_usd', label: 'Thực nhận (USD)', type: 'usd' },
          { key: 'thanh_tien', label: 'Thực nhận (VND)', type: 'money' },
          { key: 'gia_von', label: 'Giá vốn (VND)', type: 'money' },
          { key: 'loi_nhuan', label: 'Lợi nhuận', type: 'money' },
          { key: 'ty_le_co', label: '% CO/DT', type: 'pct', totalOf: ['gia_von', 'thanh_tien'] },
          { key: 'bien_ln', label: 'Biên LN', type: 'pct', totalOf: ['loi_nhuan', 'thanh_tien'] },
        ],
      },
      {
        id: 'kqkd_team',
        title: 'KQKD theo TEAM (từ BU trên file ví)',
        totals: true,
        columns: [
          { key: 'team', label: 'Team', type: 'text' },
          { key: 'so_don', label: 'Số GD', type: 'num' },
          { key: 'gmv', label: 'Thực nhận (VND)', type: 'money' },
          { key: 'pl1', label: 'PL1', type: 'money' },
          { key: 'pct_pl1', label: '% PL1/DT', type: 'pct', totalOf: ['pl1', 'gmv'] },
          { key: 'arpo', label: 'Bình quân / GD', type: 'money', totalOf: ['gmv', 'so_don'] },
        ],
      },
      {
        id: 'kqkd_spdv',
        title: 'Thực nhận theo LOẠI ĐƠN',
        totals: true,
        columns: [
          { key: 'spdv', label: 'Loại đơn', type: 'text' },
          { key: 'so_don', label: 'Số GD', type: 'num' },
          { key: 'gmv', label: 'Thực nhận (VND)', type: 'money' },
          { key: 'pl1', label: 'PL1', type: 'money' },
          { key: 'pct_pl1', label: '% PL1/DT', type: 'pct', totalOf: ['pl1', 'gmv'] },
        ],
      },
    ],
    charts: [
      { id: 'c_ngay', title: 'Thực nhận theo ngày = Giá vốn + Lợi nhuận (xếp chồng) & % CO/DT', type: 'bar', table: 'cpv_ngay', x: 'ngay', series: [{ key: 'gia_von', label: 'Giá vốn', stack: true }, { key: 'loi_nhuan', label: 'Lợi nhuận', stack: true }, { key: 'ty_le_co', label: '% CO/DT', kind: 'line' }] },
      { id: 'c_thang', title: 'So sánh theo THÁNG (xếp chồng) & % CO/DT', type: 'bar', table: 'cpv_thang', x: 'thang', series: [{ key: 'gia_von', label: 'Giá vốn', stack: true }, { key: 'loi_nhuan', label: 'Lợi nhuận', stack: true }, { key: 'ty_le_co', label: '% CO/DT', kind: 'line' }] },
      { id: 'c_san', title: 'Thực nhận theo Sàn (xếp chồng) & % CO/DT', type: 'bar', table: 'cpv_san', x: 'san', series: [{ key: 'gia_von', label: 'Giá vốn', stack: true }, { key: 'loi_nhuan', label: 'Lợi nhuận', stack: true }, { key: 'ty_le_co', label: '% CO/DT', kind: 'line' }] },
      { id: 'c_team', title: 'Thực nhận – PL1 theo Team', type: 'bar', table: 'kqkd_team', x: 'team', series: [{ key: 'gmv', label: 'Thực nhận' }, { key: 'pl1', label: 'PL1' }, { key: 'pct_pl1', label: '% PL1/DT', kind: 'line' }] },
      { id: 'c_spdv', title: 'Thực nhận – PL1 theo Loại đơn', type: 'bar', table: 'kqkd_spdv', x: 'spdv', series: [{ key: 'gmv', label: 'Thực nhận' }, { key: 'pl1', label: 'PL1' }, { key: 'pct_pl1', label: '% PL1/DT', kind: 'line' }] },
      { id: 'c_don_thang', title: 'Số giao dịch theo THÁNG', type: 'bar', table: 'cpv_thang', x: 'thang', series: [{ key: 'so_don', label: 'Số giao dịch DT' }] },
    ],
  },

  /* ---------------------------------------------------------- PKT8 */
  {
    code: 'PKT8',
    slug: 'pkt8',
    name: 'Báo cáo CPV BE HQS',
    short: 'CPV BE HQS',
    nav: 'CPV BE HQS (DT – Giá vốn)',
    tier: 2,
    sla: 'Ngày 5',
    periods: ['day', 'week', 'month'],
    defaultPeriod: 'month',
    source: 'Giá Vốn HQS10000 - BE · tab Data (đơn hàng)',
    /* Đọc trực tiếp file đơn hàng publish CSV; server gộp theo Ngày hoàn tất × Sàn */
    sheet: {
      url: CPV_SHEET_URL,
      gid: '0',
      mains: CPV_MAINS,
      hist: true,
      mode: 'order_cpv',
      api: CPV_API,
      label: 'Giá Vốn HQS10000 - BE · tab Data',
    },
    purpose: [
      'Doanh thu và giá vốn của khối BE HQS theo từng ngày (Ngày hoàn tất), từng Sàn, từng BU là bao nhiêu?',
      '% giá vốn / doanh thu đang ở mức nào, sàn/BU nào biên lợi nhuận mỏng hoặc âm?',
      'Đơn Hoàn Tất tăng giảm ra sao, phí sàn ăn bao nhiêu vào doanh thu?',
    ],
    kpis: [
      { key: 'doanh_thu_usd', code: 'USD', label: 'Doanh thu gốc (USD)', type: 'usd' },
      { key: 'gmv', code: 'GMV', label: 'Doanh thu (Thành tiền VND)', type: 'money' },
      { key: 'cogs', code: 'CO', label: 'Giá vốn (VND)', type: 'money', tone: 'loss' },
      { key: 'loi_nhuan', code: 'GP', label: 'Lợi nhuận gộp', type: 'money', tone: 'auto' },
      { key: 'ty_le_co', code: '%CO', label: '% Giá vốn / Doanh thu', type: 'pct', tone: 'warn' },
      { key: 'bien_ln', code: '%GP', label: 'Biên lợi nhuận gộp', type: 'pct', tone: 'auto' },
      { key: 'so_don', code: 'ORD', label: 'Số đơn Hoàn Tất', type: 'num' },
    ],
    tables: [
      {
        id: 'kqkd_team',
        title: 'Báo cáo KQKD theo TEAM',
        totals: true,
        hint: 'Team map từ BU: BU1→HQS100 · BU2→HQS200 · BU4→HQS400 · BU5→HQS500. GMV = Thành tiền · PL1 = GMV − Giá vốn · PL2A = PL1 − phí sàn · ARPO = GMV/đơn A3.',
        columns: [
          { key: 'team', label: 'Team', type: 'text' },
          { key: 'so_don', label: 'Số đơn A3', type: 'num' },
          { key: 'gmv', label: 'GMV', type: 'money' },
          { key: 'gia_von', label: 'CO', type: 'money' },
          { key: 'pl1', label: 'PL1', type: 'money' },
          { key: 'pct_pl1', label: '% PL1/GMV', type: 'pct', totalOf: ['pl1', 'gmv'] },
          { key: 'pl2a', label: 'PL2A', type: 'money' },
          { key: 'pct_pl2a', label: '% PL2A/GMV', type: 'pct', totalOf: ['pl2a', 'gmv'] },
          { key: 'arpo', label: 'ARPO', type: 'money', totalOf: ['gmv', 'so_don'] },
        ],
      },
      {
        id: 'kqkd_spdv',
        title: 'Báo cáo theo SPDV',
        totals: true,
        hint: 'SPDV phân loại từ cột Dịch vụ/Sản phẩm: GIFT CARD · CURRENCY · ITEM · TOPUP · ACCOUNT. Nhóm KHÁC = chưa nhận diện được — báo để bổ sung từ khoá.',
        columns: [
          { key: 'spdv', label: 'SPDV', type: 'text' },
          { key: 'so_don', label: 'Số đơn A3', type: 'num' },
          { key: 'gmv', label: 'GMV', type: 'money' },
          { key: 'gia_von', label: 'CO', type: 'money' },
          { key: 'pl1', label: 'PL1', type: 'money' },
          { key: 'pct_pl1', label: '% PL1/GMV', type: 'pct', totalOf: ['pl1', 'gmv'] },
          { key: 'pl2a', label: 'PL2A', type: 'money' },
          { key: 'pct_pl2a', label: '% PL2A/GMV', type: 'pct', totalOf: ['pl2a', 'gmv'] },
          { key: 'arpo', label: 'ARPO', type: 'money', totalOf: ['gmv', 'so_don'] },
        ],
      },
      {
        id: 'don_team',
        title: 'Báo cáo ĐƠN HÀNG theo Team',
        totals: true,
        hint: 'Thành công = Hoàn Tất · Thất bại/Hoàn hủy đếm theo Trạng thái trên tab Data (đơn chưa giao lấy Ngày tạo). Tỉ lệ tính trên tổng đơn ghi nhận.',
        columns: [
          { key: 'team', label: 'Team', type: 'text' },
          { key: 'so_don', label: 'Đơn thành công', type: 'num' },
          { key: 'don_fail', label: 'Đơn thất bại', type: 'num' },
          { key: 'ti_le_fail', label: 'Tỉ lệ thất bại', type: 'pct', totalOf: ['don_fail', ['so_don', 'don_fail', 'don_huy']] },
          { key: 'don_huy', label: 'Đơn hoàn hủy', type: 'num' },
          { key: 'ti_le_huy', label: 'Tỉ lệ hoàn hủy', type: 'pct', totalOf: ['don_huy', ['so_don', 'don_fail', 'don_huy']] },
        ],
      },
      {
        id: 'don_spdv',
        title: 'Báo cáo ĐƠN HÀNG theo SPDV',
        totals: true,
        columns: [
          { key: 'spdv', label: 'SPDV', type: 'text' },
          { key: 'so_don', label: 'Đơn thành công', type: 'num' },
          { key: 'don_fail', label: 'Đơn thất bại', type: 'num' },
          { key: 'ti_le_fail', label: 'Tỉ lệ thất bại', type: 'pct', totalOf: ['don_fail', ['so_don', 'don_fail', 'don_huy']] },
          { key: 'don_huy', label: 'Đơn hoàn hủy', type: 'num' },
          { key: 'ti_le_huy', label: 'Tỉ lệ hoàn hủy', type: 'pct', totalOf: ['don_huy', ['so_don', 'don_fail', 'don_huy']] },
        ],
      },
      {
        id: 'cpv_ngay',
        title: 'Doanh thu – Giá vốn theo NGÀY (Ngày hoàn tất)',
        totals: true,
        hint: 'Gộp từ đơn Hoàn Tất trên tab Data. Thành tiền = DThu thực nhận × REV Rate · Giá vốn = giá vốn USD × CO Rate.',
        columns: [
          { key: 'ngay', label: 'Ngày', type: 'text' },
          { key: 'so_don', label: 'Số đơn', type: 'num' },
          { key: 'doanh_thu_usd', label: 'Doanh thu (USD)', type: 'usd' },
          { key: 'thanh_tien', label: 'Doanh thu (VND)', type: 'money' },
          { key: 'gia_von', label: 'Giá vốn (VND)', type: 'money' },
          { key: 'loi_nhuan', label: 'Lợi nhuận', type: 'money' },
          { key: 'ty_le_co', label: '% CO/DT', type: 'pct', totalOf: ['gia_von', 'thanh_tien'] },
          { key: 'bien_ln', label: 'Biên LN', type: 'pct', totalOf: ['loi_nhuan', 'thanh_tien'] },
        ],
      },
      {
        id: 'cpv_thang',
        title: 'Doanh thu – Giá vốn theo THÁNG',
        totals: true,
        columns: [
          { key: 'thang', label: 'Tháng', type: 'text' },
          { key: 'so_don', label: 'Đơn Hoàn tất', type: 'num' },
          { key: 'don_fail', label: 'Thất bại', type: 'num' },
          { key: 'don_huy', label: 'Hoàn hủy', type: 'num' },
          { key: 'doanh_thu_usd', label: 'Doanh thu (USD)', type: 'usd' },
          { key: 'thanh_tien', label: 'GMV (VND)', type: 'money' },
          { key: 'gia_von', label: 'Giá vốn (VND)', type: 'money' },
          { key: 'loi_nhuan', label: 'PL1', type: 'money' },
          { key: 'pl2a', label: 'PL2A', type: 'money' },
          { key: 'ty_le_co', label: '% CO/GMV', type: 'pct', totalOf: ['gia_von', 'thanh_tien'] },
          { key: 'pct_pl1', label: '% PL1/GMV', type: 'pct', totalOf: ['loi_nhuan', 'thanh_tien'] },
          { key: 'pct_pl2a', label: '% PL2A/GMV', type: 'pct', totalOf: ['pl2a', 'thanh_tien'] },
          { key: 'arpo', label: 'ARPO', type: 'money', totalOf: ['thanh_tien', 'so_don'] },
        ],
      },
      {
        id: 'cpv_san',
        title: 'Doanh thu – Giá vốn theo SÀN',
        totals: true,
        columns: [
          { key: 'san', label: 'Sàn', type: 'text' },
          { key: 'bu', label: 'BU', type: 'text' },
          { key: 'so_don', label: 'Số đơn', type: 'num' },
          { key: 'doanh_thu_usd', label: 'Doanh thu (USD)', type: 'usd' },
          { key: 'thanh_tien', label: 'Doanh thu (VND)', type: 'money' },
          { key: 'gia_von', label: 'Giá vốn (VND)', type: 'money' },
          { key: 'loi_nhuan', label: 'Lợi nhuận', type: 'money' },
          { key: 'ty_le_co', label: '% CO/DT', type: 'pct', totalOf: ['gia_von', 'thanh_tien'] },
          { key: 'bien_ln', label: 'Biên LN', type: 'pct', totalOf: ['loi_nhuan', 'thanh_tien'] },
        ],
      },
      {
        id: 'cpv_bu',
        title: 'Doanh thu – Giá vốn theo BU',
        hidden: true, // đã có Báo cáo KQKD theo Team (map từ BU)
        columns: [
          { key: 'bu', label: 'BU', type: 'text' },
          { key: 'so_don', label: 'Số đơn', type: 'num' },
          { key: 'thanh_tien', label: 'Doanh thu (VND)', type: 'money' },
          { key: 'gia_von', label: 'Giá vốn (VND)', type: 'money' },
          { key: 'loi_nhuan', label: 'Lợi nhuận', type: 'money' },
          { key: 'ty_le_co', label: '% CO/DT', type: 'pct', totalOf: ['gia_von', 'thanh_tien'] },
          { key: 'bien_ln', label: 'Biên LN', type: 'pct', totalOf: ['loi_nhuan', 'thanh_tien'] },
        ],
      },
      {
        id: 'nguon_module',
        title: 'Doanh thu theo MODULE nguồn dữ liệu',
        hint: 'Số GỐC của từng file theo Ngày hoàn tất. Quản lý đơn hàng: VND lấy sẵn trên file. API sàn: nguyên tệ nhân TỶ GIÁ TUẦN; cột Tỷ giá BQ là tỷ giá bình quân thực áp. Chi tiết đối soát xem PKT9.',
        totals: true,
        columns: [
          { key: 'module', label: 'Module', type: 'text' },
          { key: 'so_don', label: 'Số đơn', type: 'num' },
          { key: 'doanh_thu_usd', label: 'GMV nguyên tệ (USD)', type: 'usd' },
          { key: 'ty_gia', label: 'Tỷ giá BQ', type: 'rate', totalOf: ['thanh_tien', 'dthu_thuc'] },
          { key: 'thanh_tien', label: 'GMV quy VND', type: 'money' },
          { key: 'gia_von', label: 'Giá vốn (VND)', type: 'money' },
          { key: 'loi_nhuan', label: 'Lợi nhuận (PL1)', type: 'money' },
          { key: 'ty_le_co', label: '% CO/GMV', type: 'pct', totalOf: ['gia_von', 'thanh_tien'] },
        ],
      },
      {
        id: 'module_thang',
        title: 'Đối soát NGUYÊN TỆ theo THÁNG × MODULE',
        hint: 'Doanh thu nguyên tệ (USD) theo số GỐC của từng file — dọc là tháng, ngang là 2 module. Dùng để đối soát nhanh với file nguồn.',
        totals: true,
        columns: [
          { key: 'thang', label: 'Tháng', type: 'text' },
          { key: 'usd_dh', label: 'Quản lý đơn hàng (USD)', type: 'usd' },
          { key: 'usd_api', label: 'API sàn (USD)', type: 'usd' },
          { key: 'usd_tong', label: 'Tổng (USD)', type: 'usd' },
        ],
      },
    ],
    charts: [
      { id: 'c_ngay', title: 'Doanh thu theo ngày = Giá vốn + Lợi nhuận (xếp chồng) & % CO/DT', type: 'bar', table: 'cpv_ngay', x: 'ngay', series: [{ key: 'gia_von', label: 'Giá vốn', stack: true }, { key: 'loi_nhuan', label: 'Lợi nhuận', stack: true }, { key: 'ty_le_co', label: '% CO/DT', kind: 'line' }] },
      { id: 'c_thang', title: 'So sánh theo THÁNG = Giá vốn + Lợi nhuận (xếp chồng) & % CO/DT', type: 'bar', table: 'cpv_thang', x: 'thang', series: [{ key: 'gia_von', label: 'Giá vốn', stack: true }, { key: 'loi_nhuan', label: 'Lợi nhuận', stack: true }, { key: 'ty_le_co', label: '% CO/DT', kind: 'line' }] },
      { id: 'c_kqkd_thang', title: 'GMV – PL1 – PL2A theo THÁNG', type: 'bar', table: 'cpv_thang', x: 'thang', series: [{ key: 'gmv', label: 'GMV' }, { key: 'pl1', label: 'PL1' }, { key: 'pl2a', label: 'PL2A' }, { key: 'pct_pl1', label: '% PL1/GMV', kind: 'line' }, { key: 'pct_pl2a', label: '% PL2A/GMV', kind: 'line' }] },
      { id: 'c_don_thang', title: 'Đơn hàng theo THÁNG — Hoàn tất · Thất bại · Hoàn hủy', type: 'bar', table: 'cpv_thang', x: 'thang', series: [{ key: 'so_don', label: 'Hoàn tất' }, { key: 'don_fail', label: 'Thất bại' }, { key: 'don_huy', label: 'Hoàn hủy' }, { key: 'ti_le_fail', label: 'Tỉ lệ thất bại', kind: 'line' }, { key: 'ti_le_huy', label: 'Tỉ lệ hoàn hủy', kind: 'line' }] },
      { id: 'c_team', title: 'GMV – PL1 – PL2A theo Team', type: 'bar', table: 'kqkd_team', x: 'team', series: [{ key: 'gmv', label: 'GMV' }, { key: 'pl1', label: 'PL1' }, { key: 'pl2a', label: 'PL2A' }, { key: 'pct_pl1', label: '% PL1/GMV', kind: 'line' }, { key: 'pct_pl2a', label: '% PL2A/GMV', kind: 'line' }] },
      { id: 'c_spdv', title: 'GMV – PL1 – PL2A theo SPDV', type: 'bar', table: 'kqkd_spdv', x: 'spdv', series: [{ key: 'gmv', label: 'GMV' }, { key: 'pl1', label: 'PL1' }, { key: 'pl2a', label: 'PL2A' }, { key: 'pct_pl1', label: '% PL1/GMV', kind: 'line' }, { key: 'pct_pl2a', label: '% PL2A/GMV', kind: 'line' }] },
      { id: 'c_san', title: 'Doanh thu theo Sàn = Giá vốn + Lợi nhuận (xếp chồng) & % CO/DT', type: 'bar', table: 'cpv_san', x: 'san', series: [{ key: 'gia_von', label: 'Giá vốn', stack: true }, { key: 'loi_nhuan', label: 'Lợi nhuận', stack: true }, { key: 'ty_le_co', label: '% CO/DT', kind: 'line' }] },
      { id: 'c_don_bu', title: 'Số đơn theo BU', type: 'bar', table: 'cpv_bu', x: 'bu', series: [{ key: 'so_don', label: 'Số đơn Hoàn Tất' }] },
      { id: 'c_don_spdv', title: 'Số đơn theo SPDV', type: 'bar', table: 'don_spdv', x: 'spdv', series: [{ key: 'so_don', label: 'Số đơn Hoàn Tất' }] },
    ],
  },

  /* ---------------------------------------------------------- PKT9 · Tầng 4 Đối soát */
  {
    code: 'PKT9',
    slug: 'pkt9',
    name: 'Đối soát lệch đơn (BE ↔ API sàn)',
    short: 'Đối soát đơn',
    nav: 'Đối soát lệch đơn',
    tier: 4,
    sla: 'Hằng ngày',
    periods: ['day', 'week', 'month'],
    defaultPeriod: 'month',
    source: 'Đơn hàng BE HQS ↔ file API sàn (G1/G2)',
    /* Cùng pipeline live với PKT8 — server đọc cả 2 file và trả sẵn phần đối soát */
    sheet: {
      url: CPV_SHEET_URL,
      gid: '0',
      mains: CPV_MAINS,
      hist: true,
      mode: 'order_cpv',
      api: CPV_API,
      label: 'Đối soát đơn BE ↔ API sàn',
    },
    purpose: [
      'Hai module Quản lý đơn hàng và API sàn đang ghi nhận bao nhiêu đơn, GMV mỗi bên là bao nhiêu?',
      'Những đơn nào trùng giữa 2 module, doanh thu hai bên có khớp không, lệch bao nhiêu USD?',
      'Bao nhiêu đơn chỉ có ở file API (thiếu trong Quản lý đơn hàng) đã được bổ sung vào báo cáo?',
    ],
    kpis: [
      { key: 'so_don_dh', code: 'DH', label: 'Số đơn — Quản lý đơn hàng', type: 'num' },
      { key: 'so_don_api_file', code: 'API', label: 'Số đơn — file API sàn', type: 'num' },
      { key: 'don_trung', code: 'DUP', label: 'Đơn trùng 2 module', type: 'num' },
      { key: 'lech_trung_usd', code: 'Δ USD', label: 'Chênh lệch USD (đơn trùng)', type: 'usd', tone: 'auto' },
    ],
    tables: [
      {
        id: 'nguon_module',
        title: 'Doanh thu theo MODULE nguồn dữ liệu',
        hint: 'Số GỐC của từng file theo Ngày hoàn tất — đơn trùng giữa 2 file tính ở cả hai dòng nên tổng 2 module có thể lớn hơn GMV báo cáo (đã khử trùng). Quản lý đơn hàng: VND lấy sẵn trên file. API sàn: nguyên tệ nhân TỶ GIÁ TUẦN; cột Tỷ giá BQ là tỷ giá bình quân thực áp.',
        totals: true,
        columns: [
          { key: 'module', label: 'Module', type: 'text' },
          { key: 'so_don', label: 'Số đơn', type: 'num' },
          { key: 'doanh_thu_usd', label: 'GMV nguyên tệ (USD)', type: 'usd' },
          { key: 'ty_gia', label: 'Tỷ giá BQ', type: 'rate', totalOf: ['thanh_tien', 'dthu_thuc'] },
          { key: 'thanh_tien', label: 'GMV quy VND', type: 'money' },
          { key: 'gia_von', label: 'Giá vốn (VND)', type: 'money' },
          { key: 'loi_nhuan', label: 'Lợi nhuận (PL1)', type: 'money' },
          { key: 'ty_le_co', label: '% CO/GMV', type: 'pct', totalOf: ['gia_von', 'thanh_tien'] },
        ],
      },
      {
        id: 'module_thang',
        title: 'Đối soát NGUYÊN TỆ theo THÁNG × MODULE',
        hint: 'Doanh thu nguyên tệ (USD) theo số GỐC của từng file — dọc là tháng, ngang là 2 module. Dùng để đối soát nhanh với file nguồn.',
        totals: true,
        columns: [
          { key: 'thang', label: 'Tháng', type: 'text' },
          { key: 'usd_dh', label: 'Quản lý đơn hàng (USD)', type: 'usd' },
          { key: 'usd_api', label: 'API sàn (USD)', type: 'usd' },
          { key: 'usd_tong', label: 'Tổng (USD)', type: 'usd' },
        ],
      },
      {
        id: 'dup_don',
        title: 'Đơn trùng giữa 2 module',
        hint: 'Đơn có Order ID xuất hiện ở cả hai file (kể cả khác đuôi -1/-2) — đây là đơn BÙ trả thiếu hàng cho khách, doanh thu VẪN TÍNH ở cả hai module theo quy tắc PKT; bảng này để đối soát theo dõi. Cột chênh lệch = Doanh thu API − Doanh thu BE.',
        totals: true,
        columns: [
          { key: 'order_id', label: 'Order ID (API)', type: 'text' },
          { key: 'order_id_be', label: 'Order ID (BE)', type: 'text' },
          { key: 'san', label: 'Sàn', type: 'text' },
          { key: 'ngay', label: 'Ngày HT (API)', type: 'text' },
          { key: 'ngay_be', label: 'Ngày HT (BE)', type: 'text' },
          { key: 'usd_api', label: 'DThu API (USD)', type: 'usd' },
          { key: 'usd_be', label: 'DThu BE (USD)', type: 'usd' },
          { key: 'lech', label: 'Chênh lệch (USD)', type: 'usd' },
        ],
      },
    ],
    charts: [],
  },

  /* ---------------------------------------------------------- PKT10 · Tầng 4 Đối soát */
  {
    code: 'PKT10',
    slug: 'pkt10',
    name: 'Đơn hàng chưa tìm được giá vốn',
    short: 'Đơn chưa có vốn',
    nav: 'Đơn chưa tìm được giá vốn',
    tier: 4,
    sla: 'Hằng ngày',
    periods: ['day', 'week', 'month'],
    defaultPeriod: 'month',
    source: 'Giá Vốn BE (các tháng đang đọc live)',
    /* Cùng nguồn BE với PKT8, chế độ nocost: chỉ đơn Hoàn Tất có doanh thu
       mà Giá Vốn = 0. Tháng đã chốt trong datalake không soi được từng đơn. */
    sheet: {
      url: CPV_SHEET_URL,
      gid: '0',
      mains: CPV_MAINS,
      mode: 'order_cpv',
      qs: { nocost: '1' },
      label: 'Đơn chưa bóc được giá vốn',
    },
    purpose: [
      'Đang còn bao nhiêu đơn Hoàn Tất có doanh thu nhưng CHƯA bóc được giá vốn?',
      'Số đơn thiếu vốn nằm ở sàn nào, team nào, loại SPDV nào — ai cần xử lý?',
      'GMV đang "treo" chưa có vốn là bao nhiêu — lợi nhuận báo cáo đang tạm cao bao nhiêu?',
    ],
    kpis: [
      { key: 'so_don', code: 'ORD', label: 'Tổng đơn Hoàn Tất', type: 'num' },
      { key: 'gmv', code: 'GMV', label: 'GMV TỔNG (VND)', type: 'money' },
      { key: 'nc_don', code: 'NC', label: 'Đơn chưa có giá vốn', type: 'num', tone: 'loss' },
      { key: 'nc_gmv', code: 'NC-GMV', label: 'GMV chưa bóc vốn (VND)', type: 'money', tone: 'warn' },
      { key: 'ti_le_nc', code: '%NC', label: '% đơn không CO / tổng', type: 'pct', tone: 'loss' },
      { key: 'doanh_thu_usd', code: 'USD', label: 'Doanh thu gốc (USD)', type: 'usd' },
    ],
    tables: [
      {
        id: 'nc_don',
        title: 'Danh sách đơn chưa tìm được giá vốn',
        hint: 'Đơn Hoàn Tất có doanh thu nhưng cột Giá Vốn = 0 trên file BE (các tháng đang đọc live). Bóc vốn xong trên file là đơn tự rời khỏi danh sách.',
        totals: true,
        columns: [
          { key: 'order_id', label: 'Order ID', type: 'text' },
          { key: 'ngay', label: 'Ngày hoàn tất', type: 'text' },
          { key: 'san', label: 'Sàn', type: 'text' },
          { key: 'bu', label: 'BU', type: 'text' },
          { key: 'team', label: 'Team', type: 'text' },
          { key: 'spdv', label: 'SPDV', type: 'text' },
          { key: 'doanh_thu_usd', label: 'Doanh thu (USD)', type: 'usd' },
          { key: 'thanh_tien', label: 'Doanh thu (VND)', type: 'money' },
        ],
      },
      {
        id: 'cpv_san',
        title: 'Tổng đơn vs đơn chưa có vốn theo SÀN',
        totals: true,
        columns: [
          { key: 'san', label: 'Sàn', type: 'text' },
          { key: 'bu', label: 'BU', type: 'text' },
          { key: 'so_don', label: 'Tổng đơn', type: 'num' },
          { key: 'nc_don', label: 'Chưa có vốn', type: 'num' },
          { key: 'ti_le_nc', label: '% không CO', type: 'pct', totalOf: ['nc_don', 'so_don'] },
          { key: 'thanh_tien', label: 'GMV tổng (VND)', type: 'money' },
          { key: 'nc_gmv', label: 'GMV chưa vốn (VND)', type: 'money' },
        ],
      },
      {
        id: 'kqkd_team',
        title: 'Tổng đơn vs đơn chưa có vốn theo TEAM',
        totals: true,
        columns: [
          { key: 'team', label: 'Team', type: 'text' },
          { key: 'so_don', label: 'Tổng đơn', type: 'num' },
          { key: 'nc_don', label: 'Chưa có vốn', type: 'num' },
          { key: 'ti_le_nc', label: '% không CO', type: 'pct', totalOf: ['nc_don', 'so_don'] },
          { key: 'gmv', label: 'GMV tổng (VND)', type: 'money' },
          { key: 'nc_gmv', label: 'GMV chưa vốn (VND)', type: 'money' },
        ],
      },
      {
        id: 'cpv_thang',
        title: 'Tổng đơn vs đơn chưa có vốn theo THÁNG',
        totals: true,
        columns: [
          { key: 'thang', label: 'Tháng', type: 'text' },
          { key: 'so_don', label: 'Tổng đơn', type: 'num' },
          { key: 'nc_don', label: 'Chưa có vốn', type: 'num' },
          { key: 'ti_le_nc', label: '% không CO', type: 'pct', totalOf: ['nc_don', 'so_don'] },
          { key: 'thanh_tien', label: 'GMV tổng (VND)', type: 'money' },
          { key: 'nc_gmv', label: 'GMV chưa vốn (VND)', type: 'money' },
        ],
      },
    ],
    charts: [
      { id: 'c_ngay', title: 'Tổng đơn vs đơn chưa có vốn theo NGÀY & % không CO', type: 'bar', table: 'cpv_ngay', x: 'ngay', series: [{ key: 'so_don', label: 'Tổng đơn' }, { key: 'nc_don', label: 'Chưa có vốn' }, { key: 'ti_le_nc', label: '% không CO', kind: 'line' }] },
      { id: 'c_san', title: 'Tổng đơn vs đơn chưa có vốn theo SÀN & % không CO', type: 'bar', table: 'cpv_san', x: 'san', series: [{ key: 'so_don', label: 'Tổng đơn' }, { key: 'nc_don', label: 'Chưa có vốn' }, { key: 'ti_le_nc', label: '% không CO', kind: 'line' }] },
      { id: 'c_spdv', title: 'Tổng đơn vs đơn chưa có vốn theo SPDV', type: 'bar', table: 'don_spdv', x: 'spdv', series: [{ key: 'so_don', label: 'Tổng đơn' }, { key: 'nc_don', label: 'Chưa có vốn' }, { key: 'ti_le_nc', label: '% không CO', kind: 'line' }] },
    ],
  },

  /* ---------------------------------------------------------- PKT11 · Tầng 4 Đối soát */
  {
    code: 'PKT11',
    slug: 'pkt11',
    name: 'Đơn hàng tạo mới (chưa CF & CO=0)',
    short: 'Đơn tạo mới',
    nav: 'Đơn hàng tạo mới',
    tier: 4,
    sla: 'Hằng ngày',
    periods: ['day', 'week', 'month'],
    defaultPeriod: 'month',
    source: 'Tab Đơn tạo mới · Báo cáo đơn hàng V3 (T7 + T8)',
    /* Đơn đã tạo nhưng chưa hoàn tất: CHƯA CF (Chờ xử lý) + ĐANG XỬ LÝ;
       đơn CO=0 là đơn chưa có giá vốn. Tiền USD, mốc theo NGÀY TẠO đơn. */
    sheet: {
      ...TAOMOI_SHEET,
      mode: 'order_cpv',
      endpoint: '/api/taomoi',
      label: 'Đơn tạo mới V3 · T8 + T7',
    },
    purpose: [
      'Đang có bao nhiêu đơn đã tạo nhưng CHƯA hoàn tất (chưa CF / đang xử lý), giá trị chờ về là bao nhiêu USD?',
      'Bao nhiêu đơn trong số đó CHƯA có giá vốn (CO=0) — tỉ lệ trên tổng đơn tạo mới?',
      'Đơn tạo mới dồn ở sàn nào, ngày nào — chỗ nào cần xử lý gấp?',
    ],
    kpis: [
      { key: 'so_don', code: 'ORD', label: 'Tổng đơn tạo mới', type: 'num' },
      { key: 'doanh_thu_usd', code: 'USD', label: 'Giá trị chờ về (USD)', type: 'usd' },
      { key: 'nc_don', code: 'CO=0', label: 'Đơn chưa có giá vốn', type: 'num', tone: 'loss' },
      { key: 'ti_le_nc', code: '%CO=0', label: '% đơn CO=0 / tổng', type: 'pct', tone: 'warn' },
    ],
    tables: [
      {
        id: 'nc_don',
        title: 'Danh sách đơn tạo mới',
        hint: 'Toàn bộ đơn trên tab Đơn tạo mới (T7 + T8), một dòng một đơn — đơn nhiều code đã gộp doanh thu/giá vốn. Cột CO=0 đánh dấu đơn chưa có giá vốn.',
        totals: true,
        columns: [
          { key: 'order_id', label: 'Order ID', type: 'text' },
          { key: 'ngay', label: 'Ngày tạo', type: 'text' },
          { key: 'san', label: 'Sàn', type: 'text' },
          { key: 'spdv', label: 'Trạng thái', type: 'text' },
          { key: 'loai_don', label: 'Loại đơn', type: 'text' },
          { key: 'nguon_ncc', label: 'Nguồn NCC', type: 'text' },
          { key: 'co0', label: 'CO = 0', type: 'text' },
          { key: 'doanh_thu_usd', label: 'Doanh thu (USD)', type: 'usd' },
          { key: 'gia_von', label: 'Giá vốn (USD)', type: 'usd' },
        ],
      },
      {
        id: 'kqkd_spdv',
        title: 'Đơn tạo mới theo TRẠNG THÁI',
        totals: true,
        columns: [
          { key: 'spdv', label: 'Trạng thái', type: 'text' },
          { key: 'so_don', label: 'Số đơn', type: 'num' },
          { key: 'nc_don', label: 'CO = 0', type: 'num' },
          { key: 'ti_le_nc', label: '% CO=0', type: 'pct', totalOf: ['nc_don', 'so_don'] },
          { key: 'doanh_thu_usd', label: 'Doanh thu (USD)', type: 'usd' },
        ],
      },
      {
        id: 'cpv_san',
        title: 'Đơn tạo mới theo SÀN',
        totals: true,
        columns: [
          { key: 'san', label: 'Sàn', type: 'text' },
          { key: 'so_don', label: 'Số đơn', type: 'num' },
          { key: 'nc_don', label: 'CO = 0', type: 'num' },
          { key: 'ti_le_nc', label: '% CO=0', type: 'pct', totalOf: ['nc_don', 'so_don'] },
          { key: 'doanh_thu_usd', label: 'Doanh thu (USD)', type: 'usd' },
        ],
      },
      {
        id: 'cpv_ngay',
        title: 'Đơn tạo mới theo NGÀY TẠO',
        totals: true,
        columns: [
          { key: 'ngay', label: 'Ngày tạo', type: 'text' },
          { key: 'so_don', label: 'Số đơn', type: 'num' },
          { key: 'nc_don', label: 'CO = 0', type: 'num' },
          { key: 'ti_le_nc', label: '% CO=0', type: 'pct', totalOf: ['nc_don', 'so_don'] },
          { key: 'doanh_thu_usd', label: 'Doanh thu (USD)', type: 'usd' },
        ],
      },
    ],
    charts: [
      { id: 'c_ngay', title: 'Đơn tạo mới theo NGÀY & % CO=0', type: 'bar', table: 'cpv_ngay', x: 'ngay', series: [{ key: 'so_don', label: 'Tổng đơn' }, { key: 'nc_don', label: 'CO = 0' }, { key: 'ti_le_nc', label: '% CO=0', kind: 'line' }] },
      { id: 'c_san', title: 'Đơn tạo mới theo SÀN & % CO=0', type: 'bar', table: 'cpv_san', x: 'san', series: [{ key: 'so_don', label: 'Tổng đơn' }, { key: 'nc_don', label: 'CO = 0' }, { key: 'ti_le_nc', label: '% CO=0', kind: 'line' }] },
      { id: 'c_spdv', title: 'Đơn tạo mới theo TRẠNG THÁI', type: 'bar', table: 'kqkd_spdv', x: 'spdv', series: [{ key: 'so_don', label: 'Số đơn' }, { key: 'nc_don', label: 'CO = 0' }] },
    ],
  },

  /* ---------------------------------------------------------- PKT7 */
  /* --------------------------------------------------------- PKT15 */
  {
    code: 'PKT15',
    slug: 'pkt15',
    name: 'Check kho flip — tra cứu mã đơn',
    short: 'CHECK KHO FLIP',
    nav: 'Check kho flip (tra mã đơn)',
    tier: 4,
    sla: 'Hằng ngày',
    periods: ['day'],
    defaultPeriod: 'day',
    source: 'Đơn hàng BE (Quản lý đơn hàng + API sàn) · tab Đơn tạo mới',
    /* Không tự chạy nền: chỉ tra khi kế toán dán mã vào ô nhập. */
    sheet: {
      url: CPV_SHEET_URL,
      gid: '0',
      mains: CPV_MAINS,
      mode: 'tim_don',
      api: CPV_API,
      label: 'Đơn hàng BE · tháng đang chạy',
    },
    sheetTaoMoi: TAOMOI_SHEET,
    purpose: [
      'Mã đơn flip này có trên backend không, hay mới chỉ nằm ở danh sách Đơn tạo mới?',
      'Đơn đó thuộc tháng nào, sàn nào, trạng thái ra sao — đủ căn cứ duyệt thanh toán chưa?',
      'Đơn đã có giá vốn (đã CF) hay vẫn CO = 0?',
    ],
    kpis: [
      { key: 'tong_ma', code: 'MÃ', label: 'Số mã đã tra', type: 'num' },
      { key: 'thay_be', code: 'BE', label: 'Có trên backend', type: 'num' },
      { key: 'thay_taomoi', code: 'TM', label: 'Chỉ ở Đơn tạo mới', type: 'num', tone: 'warn' },
      { key: 'khong_thay', code: '404', label: 'Không tìm thấy', type: 'num', tone: 'loss' },
      { key: 'chua_cf', code: 'CO=0', label: 'Chưa có giá vốn', type: 'num', tone: 'warn' },
      { key: 'gmv', code: 'GMV', label: 'GMV các đơn tìm thấy', type: 'money' },
      { key: 'gia_von', code: 'CO', label: 'Giá vốn các đơn tìm thấy', type: 'money' },
    ],
    tables: [
      {
        id: 'tim_don',
        title: 'Kết quả tra cứu',
        hint: 'Một dòng một mã, giữ đúng thứ tự đã dán vào. "Có trên backend" là đơn đã lên module Quản lý đơn hàng hoặc file API sàn; "Chỉ ở Đơn tạo mới" là đơn còn nằm ở tab Đơn tạo mới, chưa CF. Chỉ tra được các tháng đang đọc trực tiếp — tháng đã chốt sổ không lưu từng mã đơn.',
        columns: [
          { key: 'ma', label: 'Mã đơn', type: 'text' },
          { key: 'ket_luan', label: 'Kết luận', type: 'text' },
          { key: 'nguon', label: 'Nguồn', type: 'text' },
          { key: 'thang', label: 'Tháng', type: 'text' },
          { key: 'ngay', label: 'Ngày', type: 'text' },
          { key: 'san', label: 'Sàn', type: 'text' },
          { key: 'trang_thai', label: 'Trạng thái', type: 'text' },
          { key: 'cf', label: 'CF / Giá vốn', type: 'text' },
          { key: 'doanh_thu_usd', label: 'Doanh thu (USD)', type: 'usd' },
          { key: 'gmv', label: 'GMV (VND)', type: 'money' },
          { key: 'gia_von', label: 'Giá vốn', type: 'money' },
          { key: 'ghi_chu', label: 'Ghi chú', type: 'text' },
        ],
      },
    ],
    charts: [],
  },

  {
    code: 'PKT7',
    slug: 'pkt7',
    name: 'Báo cáo QUẢN TRỊ TÀI CHÍNH',
    short: 'QUẢN TRỊ TC',
    nav: 'Quản trị tài chính (ROI · CCC)',
    tier: 1,
    sla: 'Ngày 15',
    periods: ['month', 'quarter', 'year'],
    defaultPeriod: 'month',
    source: 'Tổng hợp PKT2 · PKT3 · PKT4 · PKT5',
    purpose: [
      'Sức khỏe tài chính tổng thể của HQ đang tốt hay xấu, xu hướng đi lên hay xuống?',
      'Đồng vốn bỏ ra đang sinh lời bao nhiêu (ROI/ROA/ROE)?',
      'Lợi nhuận nhạy thế nào khi doanh thu thay đổi (đòn bẩy hoạt động) — tăng DT 10% thì LN tăng bao nhiêu %?',
    ],
    kpis: [
      { key: 'roi', code: 'ROI', label: 'Tỉ suất sinh lời trên vốn đầu tư', type: 'pct', tone: 'auto' },
      { key: 'roa', code: 'ROA', label: 'Sinh lời trên tổng tài sản', type: 'pct', tone: 'auto' },
      { key: 'roe', code: 'ROE', label: 'Sinh lời trên vốn chủ', type: 'pct', tone: 'auto' },
      { key: 'dol', code: 'DOL', label: 'Đòn bẩy hoạt động', type: 'num', tone: 'flip' },
      { key: 'ccc', code: 'CCC', label: 'Chu kỳ chuyển đổi tiền mặt (ngày)', type: 'num', tone: 'auto' },
      { key: 'dio', code: 'DIO', label: 'Số ngày tồn kho', type: 'num' },
      { key: 'dso', code: 'DSO', label: 'Số ngày phải thu', type: 'num' },
      { key: 'dpo', code: 'DPO', label: 'Số ngày phải trả', type: 'num' },
      { key: 'diem_suc_khoe', code: 'SCORE', label: 'Điểm sức khỏe tài chính /100', type: 'num', tone: 'auto' },
    ],
    tables: [
      {
        id: 'fin_ratio',
        title: 'Bộ chỉ số quản trị tài chính',
        columns: [
          { key: 'nhom', label: 'Nhóm', type: 'text' },
          { key: 'chi_so', label: 'Chỉ số', type: 'text' },
          { key: 'cong_thuc', label: 'Công thức', type: 'text' },
          { key: 't2', label: 'T−2', type: 'num' },
          { key: 't1', label: 'T−1', type: 'num' },
          { key: 't0', label: 'Kỳ này', type: 'num' },
          { key: 'xu_huong', label: 'Xu hướng', type: 'text' },
          { key: 'nguong', label: 'Ngưỡng mục tiêu', type: 'text' },
        ],
        seed: [
          { nhom: 'Sinh lời', chi_so: 'Biên PL1', cong_thuc: 'PL1 / RE' },
          { nhom: 'Sinh lời', chi_so: 'Biên PL2', cong_thuc: 'PL2 / RE' },
          { nhom: 'Sinh lời', chi_so: 'Biên PL7', cong_thuc: 'PL7 / RE' },
          { nhom: 'Sinh lời', chi_so: 'ROA', cong_thuc: 'PL7 / Tổng tài sản BQ' },
          { nhom: 'Sinh lời', chi_so: 'ROE', cong_thuc: 'PL7 / Vốn chủ BQ' },
          { nhom: 'Hiệu quả', chi_so: 'Vòng quay tồn kho', cong_thuc: 'COGS / Tồn kho BQ' },
          { nhom: 'Hiệu quả', chi_so: 'DIO', cong_thuc: '365 / Vòng quay tồn kho' },
          { nhom: 'Hiệu quả', chi_so: 'DSO', cong_thuc: 'Phải thu BQ / RE × 365' },
          { nhom: 'Hiệu quả', chi_so: 'DPO', cong_thuc: 'AR BQ / COGS × 365' },
          { nhom: 'Hiệu quả', chi_so: 'CCC', cong_thuc: 'DIO + DSO − DPO' },
          { nhom: 'Thanh khoản', chi_so: 'Thanh toán hiện hành', cong_thuc: 'TSNH / Nợ NH' },
          { nhom: 'Thanh khoản', chi_so: 'Số ngày tiền đủ chi', cong_thuc: 'Tiền / Chi bình quân ngày' },
          { nhom: 'Đòn bẩy', chi_so: 'Nợ / Vốn chủ', cong_thuc: 'TL / EQ' },
          { nhom: 'Đòn bẩy', chi_so: 'DOL', cong_thuc: '%Δ PL2 / %Δ RE' },
          { nhom: 'Cấu trúc CP', chi_so: 'COGS / RE', cong_thuc: 'COGS / RE' },
          { nhom: 'Cấu trúc CP', chi_so: 'Chi phí BO / RE', cong_thuc: 'OV / RE' },
        ],
      },
      {
        id: 'fin_trend',
        title: 'Xu hướng 12 tháng',
        columns: [
          { key: 'thang', label: 'Tháng', type: 'text' },
          { key: 're', label: 'RE', type: 'money' },
          { key: 'pl2', label: 'PL2', type: 'money' },
          { key: 'pl7', label: 'PL7', type: 'money' },
          { key: 'bien_pl2', label: '% PL2/RE', type: 'pct' },
          { key: 'roa', label: 'ROA', type: 'pct' },
          { key: 'roe', label: 'ROE', type: 'pct' },
          { key: 'ccc', label: 'CCC (ngày)', type: 'num' },
        ],
      },
      {
        id: 'sensitivity',
        title: 'Phân tích độ nhạy — doanh thu thay đổi thì lợi nhuận đi đâu',
        columns: [
          { key: 'kich_ban', label: 'Kịch bản', type: 'text' },
          { key: 'delta_re', label: 'Δ Doanh thu', type: 'pct' },
          { key: 're', label: 'RE', type: 'money' },
          { key: 'pl2', label: 'PL2', type: 'money' },
          { key: 'pl7', label: 'PL7', type: 'money' },
          { key: 'delta_pl2', label: 'Δ PL2', type: 'pct' },
          { key: 'dol', label: 'DOL', type: 'num' },
        ],
        seed: [
          { kich_ban: 'Xấu nhất', delta_re: -20 },
          { kich_ban: 'Thận trọng', delta_re: -10 },
          { kich_ban: 'Cơ sở', delta_re: 0 },
          { kich_ban: 'Tích cực', delta_re: 10 },
          { kich_ban: 'Tốt nhất', delta_re: 20 },
        ],
      },
    ],
    charts: [
      { id: 'c_trend', title: 'RE — PL2 — PL7 theo tháng', type: 'line', table: 'fin_trend', x: 'thang', series: [{ key: 're', label: 'RE' }, { key: 'pl2', label: 'PL2' }, { key: 'pl7', label: 'PL7' }] },
      { id: 'c_sens', title: 'Độ nhạy lợi nhuận theo doanh thu', type: 'bar', table: 'sensitivity', x: 'kich_ban', series: [{ key: 'pl2', label: 'PL2' }, { key: 'pl7', label: 'PL7' }] },
    ],
  },

  /* ---------------------- Tầng 3: Kinh doanh theo Team ---------------------- */
  /* --------------------------------------------------------- PKT12 */
  {
    code: 'PKT12',
    slug: 'pkt12',
    name: 'Báo cáo CPV Ritokey (C300)',
    short: 'CPV RITOKEY',
    nav: 'CPV Ritokey (C300)',
    tier: 3,
    sla: 'Ngày 5',
    periods: ['day', 'week', 'month'],
    defaultPeriod: 'month',
    source: 'Báo cáo kinh doanh Ritokey 2026',
    /* T1–T7 lấy bản chốt tháng trong datalake; tháng đang chạy đọc trực
       tiếp tab giao dịch đã công bố. */
    sheet: {
      url: RITOKEY_SHEET_URL,
      mode: 'ritokey',
      label: 'Ritokey C300 · 2026',
      /* gid tab Daily.Report của bản công bố */
      qs: { gids: '851205159' },
    },
    purpose: [
      'Doanh số, doanh thu, giá vốn và lãi gộp của team Ritokey (C300) từng tháng đang thế nào?',
      'Nhóm hàng nào là chủ lực — Giftcard, Tiện ích hay Steam — và biên lãi mỗi nhóm ra sao?',
      'Tháng đang chạy bán được bao nhiêu theo từng ngày?',
    ],
    kpis: [
      { key: 're', code: 'RE', label: 'Doanh thu', type: 'money' },
      { key: 'co', code: 'CO', label: 'Giá vốn', type: 'money', tone: 'loss' },
      { key: 'pl1', code: 'PL1', label: 'Lãi gộp (PL1)', type: 'money', tone: 'auto' },
      { key: 'ty_le_co', code: '%CO', label: '% Giá vốn / Doanh thu', type: 'pct', tone: 'warn' },
      { key: 'bien_pl1', code: '%PL1', label: 'Biên lãi gộp (PL1/RE)', type: 'pct', tone: 'auto' },
      { key: 'so_don', code: 'ORD', label: 'Số đơn', type: 'num' },
      { key: 'ar', code: 'AR', label: 'Phải trả CTV', type: 'money', tone: 'warn' },
      { key: 'gmv', code: 'GMV', label: 'Doanh số (gồm cả hoàn hủy)', type: 'money' },
    ],
    tables: [
      {
        id: 'cpv_thang',
        title: 'Kết quả theo THÁNG',
        totals: true,
        hint: 'Cộng lên từ dữ liệu NGÀY của sheet Daily.Report — ngày nào đọc trực tiếp được thì lấy số mới nhất, còn lại giữ bản chốt. GMV của Ritokey bao gồm cả đơn hoàn hủy nên mọi tỉ lệ đều tính trên Doanh thu (RE).',
        columns: [
          { key: 'thang', label: 'Tháng', type: 'text' },
          { key: 're', label: 'Doanh thu', type: 'money' },
          { key: 'co', label: 'Giá vốn', type: 'money' },
          { key: 'pl1', label: 'PL1', type: 'money' },
          { key: 'ty_le_co', label: '% CO/RE', type: 'pct', totalOf: ['co', 're'] },
          { key: 'bien_pl1', label: 'Biên PL1/RE', type: 'pct', totalOf: ['pl1', 're'] },
          { key: 'so_don', label: 'Số đơn', type: 'num' },
          { key: 'gmv', label: 'GMV (gồm hoàn hủy)', type: 'money' },
          { key: 'nguon', label: 'Nguồn', type: 'text' },
        ],
      },
      {
        id: 'cpv_nhom',
        title: 'Cấu phần DOANH THU theo nhóm hàng (Giftcard · Tiện ích · Steam)',
        totals: true,
        hint: 'Bóc theo tháng từ Daily.Report — Ritokey từ T7 gần như chỉ còn Giftcard.',
        columns: [
          { key: 'thang', label: 'Tháng', type: 'text' },
          { key: 're_giftcard', label: 'DT Giftcard', type: 'money' },
          { key: 're_tien_ich', label: 'DT Tiện ích', type: 'money' },
          { key: 're_steam', label: 'DT Steam', type: 'money' },
          { key: 'gmv_giftcard', label: 'GMV Giftcard', type: 'money' },
          { key: 'gmv_tien_ich', label: 'GMV Tiện ích', type: 'money' },
          { key: 'gmv_steam', label: 'GMV Steam', type: 'money' },
          { key: 'don_giftcard', label: 'Đơn Giftcard', type: 'num' },
          { key: 'don_tien_ich', label: 'Đơn Tiện ích', type: 'num' },
          { key: 'don_steam', label: 'Đơn Steam', type: 'num' },
        ],
      },
      {
        id: 'cpv_ngay',
        title: 'Chi tiết theo NGÀY',
        totals: true,
        hint: 'Từ sheet Daily.Report — đủ từ 01/01. Cột Nguồn cho biết ngày đó là bản chốt hay vừa đọc trực tiếp.',
        columns: [
          { key: 'ngay', label: 'Ngày', type: 'text' },
          { key: 're', label: 'Doanh thu', type: 'money' },
          { key: 'co', label: 'Giá vốn', type: 'money' },
          { key: 'pl1', label: 'PL1', type: 'money' },
          { key: 'ty_le_co', label: '% CO/RE', type: 'pct', totalOf: ['co', 're'] },
          { key: 'so_don', label: 'Số đơn', type: 'num' },
          { key: 'gmv', label: 'GMV (gồm hoàn hủy)', type: 'money' },
          { key: 'nguon', label: 'Nguồn', type: 'text' },
        ],
      },
    ],
    charts: [
      /* Ba biểu đồ dùng chung bảng cpv_auto: chọn một tháng / một tuần thì
         vẽ theo từng ngày, xem cả năm thì vẽ theo từng tháng. */
      { id: 'c_thang', title: 'Doanh thu = Giá vốn + PL1 (xếp chồng)', autoTitle: true, type: 'bar', table: 'cpv_auto', x: 'nhan', series: [{ key: 'co', label: 'Giá vốn', stack: true }, { key: 'pl1', label: 'PL1', stack: true }, { key: 'ty_le_co', label: '% CO/RE', kind: 'line' }], tip: [{ key: 're', label: 'Doanh thu' }, { key: 'gmv', label: 'GMV (gồm hoàn hủy)' }, { key: 'so_don', label: 'Số đơn', type: 'num' }] },
      { id: 'c_nhom', title: 'Doanh thu theo nhóm hàng', autoTitle: true, type: 'bar', table: 'cpv_auto', x: 'nhan', series: [{ key: 're_giftcard', label: 'Giftcard', stack: true }, { key: 're_tien_ich', label: 'Tiện ích', stack: true }, { key: 're_steam', label: 'Steam', stack: true }], tip: [{ key: 're', label: 'Doanh thu' }, { key: 'gmv', label: 'GMV (gồm hoàn hủy)' }, { key: 'so_don', label: 'Số đơn', type: 'num' }] },
      { id: 'c_don', title: 'Doanh thu (cột) & số đơn (đường)', autoTitle: true, type: 'bar', table: 'cpv_auto', x: 'nhan', series: [{ key: 're', label: 'Doanh thu' }, { key: 'so_don', label: 'Số đơn', kind: 'line', num: true, color: '#D96F00' }], tip: [{ key: 'gmv', label: 'GMV (gồm hoàn hủy)' }, { key: 'pl1', label: 'PL1' }] },
    ],
  },
  ...CPV_TEAM_REPORTS,
  ...CPV_SAN_REPORTS,
];

export const PERIOD_LABEL = {
  day: 'Ngày',
  week: 'Tuần',
  month: 'Tháng',
  quarter: 'Quý',
  year: 'Năm',
};

/* Phân tầng báo cáo theo người dùng & nhịp xem */
export const TIERS = [
  { id: 1, label: 'Tầng 1 · Điều hành', who: 'CEO · Tháng' },
  { id: 2, label: 'Tầng 2 · Kiểm soát', who: 'Leader · Tuần' },
  { id: 3, label: 'Tầng 3 · Kinh doanh', who: 'Team · BU' },
  { id: 4, label: 'Tầng 4 · Đối soát', who: 'PKT · Ngày' },
  /* Danh sách 24 sàn dài — để cuối cùng cho đỡ chiếm chỗ các tầng chính */
  { id: 5, label: 'Tầng 3B · Kinh doanh theo SÀN', who: 'Lead sàn · Ngày' },
];

export function reportsByTier(tierId) {
  return REPORTS.filter((r) => r.tier === tierId);
}

export function getReport(slug) {
  return REPORTS.find((r) => r.slug === slug);
}
