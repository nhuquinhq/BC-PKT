# Dữ liệu SOP — cách thêm một quy trình mới

Nguồn hiện tại là **dữ liệu tĩnh trong repo này**, không đọc Google Sheet.
Đã cân nhắc đổi sang đọc sheet `SOP_PHÒNG_KẾ_TOÁN_VER1.2026` nhưng giữ nguyên,
vì sheet mới có 8 quy trình trong khi web đang có 15, và sheet không có dữ liệu
để vẽ nhánh rẽ (không có cột nối mũi tên, RACI, điểm bàn giao).

| File | Nội dung |
|---|---|
| `noi-bo.js` | `ORG`, `LANE`, `SOPS_NB` — 9 SOP nội bộ Phòng Kế toán |
| `lien-phong-ban.js` | `SOPS_LP` — 6 SOP liên phòng ban, cùng các bảng bổ trợ |
| `bpmn.js` | Bộ vẽ sơ đồ, xuất SVG. **Không sửa** — chép từ repo `sop-pkt` |

Trang hiển thị: `components/SopBoard.jsx` → PKT30 (tầng 1) và PKT31 (tầng 3).

## Khuôn một SOP

```js
{
  id: 'ma-ngan-khong-dau',      // duy nhất, dùng làm khoá React
  scope: 'nb',                   // 'nb' nội bộ · 'lp' liên phòng ban
  code: 'NB 10.0',
  name: 'Tên quy trình',
  tagline: 'Chu kỳ · hệ thống chính',
  status: 'Done',                // khác 'Done' thì thẻ hiện màu vàng "Chờ bổ sung"
  position: 'Kế toán Doanh thu', // vị trí phụ trách
  owner: 'Kế toán Doanh thu — chị Ninh',
  trigger: 'Khi nào quy trình chạy',
  cycle: 'Hàng ngày.',
  systems: 'balance.hqwg.pro · HubPay',
  use: 'Dùng để làm gì',
  meaning: 'Ý nghĩa với cả luồng',

  lanes: [LANE.dt, LANE.tien],   // lấy từ LANE trong noi-bo.js

  // nodes[].lane là CHỈ SỐ trong mảng lanes ở trên (0, 1, 2…)
  // col là thứ tự trái sang phải — cùng col thì vẽ cùng một cột dọc
  nodes: [
    { id: 's',  lane: 0, col: 0, type: 'start', label: 'Đầu ngày\nlàm việc' },
    { id: 'a1', lane: 0, col: 1, type: 'task',  label: 'Kiểm tra số dư' },
    { id: 'g1', lane: 0, col: 2, type: 'gateway', gw: 'x', label: 'Đủ ngưỡng?' },
    { id: 'e',  lane: 1, col: 3, type: 'end',   label: 'Xong' },
  ],
  edges: [
    { from: 's', to: 'a1' },
    { from: 'a1', to: 'g1' },
    { from: 'g1', to: 'e', label: 'Đạt' },
    { from: 'g1', to: 'a1', type: 'back', label: 'Chưa đạt' },
  ],

  raci: {
    roles: ['Kế toán Doanh thu', 'Kế toán Dòng tiền'],
    rows: [{ task: 'Kiểm tra số dư', v: ['R/A', '-'] }],
  },
  handoffs: [
    { from: 'KT Doanh thu', to: 'KT Dòng tiền', data: 'Thông báo giao dịch rút', when: 'Ngay sau khi rút' },
  ],
  controls: ['Chỉ rút khi số dư đạt ngưỡng và tỷ giá đáp ứng điều kiện.'],
}
```

## Quy tắc để sơ đồ vẽ ra đúng

- **`lane` là chỉ số, không phải tên.** Trỏ ra ngoài mảng `lanes` thì nút đó biến mất
  khỏi sơ đồ. `SopBoard` đã bọc `try/catch` nên trang không vỡ, nhưng vẫn là lỗi dữ liệu.
- **`col` quyết định thứ tự trái → phải.** Hai nút cùng `col` xếp cùng cột dọc,
  dùng khi hai vị trí làm song song.
- **`type`**: `start` · `task` · `gateway` · `end`. Gateway thêm `gw: 'x'` (rẽ nhánh)
  hoặc `gw: 'parallel'` (làm song song).
- **Nhánh quay lại** đặt `type: 'back'` ở edge — vẽ nét đứt màu đỏ vòng dưới.
- **`label` xuống dòng bằng `\n`**, mỗi dòng nên dưới 22 ký tự cho vừa ô.
- Thêm lane mới thì khai trong `LANE` (`noi-bo.js`) và bổ sung màu tương ứng
  ở cuối `app/globals.css` — các lớp `.lane--<key>` và `.node--<key> .accent`.

## Kiểm tra trước khi đẩy lên

```bash
node --input-type=module -e "
const b = await import('./lib/sop/bpmn.js');
const n = await import('./lib/sop/noi-bo.js');
const l = await import('./lib/sop/lien-phong-ban.js');
for (const s of [...n.SOPS_NB, ...l.SOPS_LP]) {
  const xau = (s.nodes||[]).filter(x => !s.lanes?.[x.lane]);
  if (xau.length) console.log(s.code, 'node trỏ sai lane:', xau.map(x=>x.id).join(','));
  try { b.renderBPMN(s); } catch (e) { console.log(s.code, 'lỗi vẽ:', e.message); }
}
console.log('xong');
"
```
