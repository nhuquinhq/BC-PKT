# Báo cáo Phòng Kế Toán — HQ Group (PKT1 → PKT7)

Web app Next.js chứa 7 báo cáo quản trị tài chính của PKT, giao diện nền tối kính mờ viền neon.
Khung KPI, bảng và biểu đồ đã dựng sẵn — chỉ cần nạp dữ liệu.

---

## 1. Đẩy lên GitHub

Chạy trong thư mục dự án:

```bash
git init
git branch -M main
git add .
git commit -m "PKT report system v1 - 7 bao cao PKT1 den PKT7"
git remote add origin https://github.com/<tài-khoản>/hqg-pkt-report.git
git push -u origin main
```

Nếu repo trên GitHub đã có sẵn file README thì đổi lệnh cuối thành:

```bash
git pull origin main --allow-unrelated-histories
git push -u origin main
```

## 2. Deploy lên Vercel

Vào vercel.com → **Add New… → Project** → chọn repo vừa push → **Deploy**.
Không cần cấu hình gì thêm, cũng không cần biến môi trường:

| Mục | Giá trị Vercel tự nhận |
|---|---|
| Framework Preset | Next.js |
| Build Command | `next build` |
| Output Directory | `.next` |
| Install Command | `npm install` |
| Node.js Version | 18.x trở lên |

Từ lần sau, mỗi `git push` lên nhánh `main` là Vercel tự build và cập nhật bản chính thức.

**Cách không qua GitHub:**

```bash
npm i -g vercel
vercel          # bản preview
vercel --prod   # bản chính thức
```

## 3. Chạy thử trên máy

```bash
npm install
npm run dev     # http://localhost:3000
```

---

## Đường dẫn trong app

| URL | Nội dung |
|---|---|
| `/` | Trang chủ: 7 thẻ báo cáo và lịch phát hành theo SLA |
| `/bao-cao/pkt1` … `/bao-cao/pkt7` | Từng báo cáo |
| `/nguon-du-lieu` | Sơ đồ luồng dữ liệu và bảng khai báo cột của toàn hệ |
| `/preview.html` | Bản HTML tĩnh một file, có nút bật số liệu mẫu để demo |

## Cấu trúc thư mục

| Đường dẫn | Vai trò |
|---|---|
| `lib/reports.js` | **File quan trọng nhất.** Khai báo 7 báo cáo: KPI, cột bảng, biểu đồ, kỳ báo cáo, SLA |
| `public/data/pkt1.json … pkt7.json` | Dữ liệu chính thức của từng báo cáo |
| `app/bao-cao/[code]/page.jsx` | Trang hiển thị báo cáo, dùng chung cho cả 7 |
| `app/api/sheet/route.js` | Đọc Google Sheet công khai, tránh lỗi CORS |
| `app/globals.css` | Toàn bộ theme nền tối, đổi màu ở khối `:root` |
| `components/` | Sidebar · KpiStrip · DataTable · ChartBlock · SourcePanel · ReportView |
| `lib/format.js` | Định dạng VND, tỷ/triệu, phần trăm, tỉ giá theo chuẩn Việt Nam |

## Ba cách nạp dữ liệu

1. **Google Sheet** — Share → *Anyone with the link · Viewer* → dán link vào khối “Nguồn dữ liệu” trong báo cáo.
2. **Dán CSV / TSV** — copy vùng dữ liệu kèm dòng tiêu đề từ Sheet hoặc Excel rồi dán vào.
3. **File JSON** — điền `public/data/pktX.json` rồi commit. Đây là bản chính thức.

Thứ tự ưu tiên hiển thị: dữ liệu nạp trên trình duyệt → file JSON → khung rỗng.

```json
{
  "meta":   { "ky": "Tháng 07/2026", "cap_nhat": "2026-08-05", "nguoi_lap": "PKT" },
  "kpis":   { "re": 31650000000, "pl2": 3186000000 },
  "tables": { "pnl_by_dim": [ { "chieu": "BU", "ten": "BU4", "gmv": 9860000000 } ] }
}
```

Bảng nào không khai trong JSON sẽ tự dùng khung mẫu trong `lib/reports.js`.

## Trạng thái dữ liệu

| Mã | Báo cáo | SLA | Kỳ hiển thị | Dữ liệu |
|---|---|---|---|---|
| PKT1 | Tỉ giá | Ngày 1 | Ngày · Tuần · Tháng | 45 ngày tỉ giá thật từ sheet BC.N |
| PKT2 | Kết quả kinh doanh | Ngày 15 | Tháng · Quý · Năm | Khung P&L 22 dòng, chờ số |
| PKT3 | Dòng tiền | Ngày 5 | Tuần · Tháng · Quý | Khung 4 bảng, chờ số |
| PKT4 | Cân đối kế toán | Ngày 5 | Tháng · Quý · Năm | Khung tài sản, nguồn vốn, chỉ số |
| PKT5 | Hàng tồn kho | Ngày 5 | Ngày · Tuần · Tháng | Khung tồn, aging, đối chiếu 3 bên |
| PKT6 | Quản trị CPV | Ngày 5 | Tuần · Tháng · Quý | Khung ma trận Team × SPDV |
| PKT7 | Quản trị tài chính | Ngày 15 | Tháng · Quý · Năm | Khung 16 chỉ số và độ nhạy |

## Thêm chỉ số hoặc bảng mới

Sửa `lib/reports.js`, giao diện tự sinh, không cần đụng component.

```js
{ key: 'ma_moi', code: 'PL3', label: 'Tên hiển thị', type: 'money', tone: 'auto' }
```

`type`: `money` · `num` · `rate` · `pct` · `date` · `text`
`tone`: `auto` (xanh khi dương, đỏ khi âm) · `gain` · `loss` · `warn` · `flip`

## Đổi màu giao diện

Mở `app/globals.css`, sửa khối `:root`:

| Biến | Ý nghĩa |
|---|---|
| `--bg` | Màu nền trang |
| `--v1` `--v2` | Cặp màu gradient tím xanh của nút và tab đang chọn |
| `--cy` | Màu cyan cho mã chỉ số và điểm nhấn Flip |
| `--gain` `--loss` `--warn` | Màu trạng thái lãi, lỗ, cảnh báo |
| `--glass` `--line` | Độ trong và viền của panel kính mờ |

Màu biểu đồ nằm ở mảng `COLORS` đầu file `components/ChartBlock.jsx`.
