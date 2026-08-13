/* ============================================================
   CHÉP TỪ REPO nhuquinhq/sop-pkt — assets/js/data-noibo.js
   Sửa SOP thì sửa ở repo gốc rồi chép lại sang đây, đừng sửa tay
   hai nơi. Chỉ thêm dòng export ở cuối, phần dữ liệu giữ nguyên.

   HQ GROUP — SOP PHÒNG KẾ TOÁN | Dữ liệu nguồn
   Nguồn: SOP_KE_TOAN_DRAFT.xlsx (v1.0 — Phòng Kế toán)
   Dùng chung cho 2 bản: SOP Nội bộ và SOP Liên phòng ban.
   ============================================================ */

const ORG = {
  company: "HQ GROUP",
  title: "SOP PHÒNG KẾ TOÁN",
  version: "Ver 1.0 — 2026",
  goal: "Chuẩn hoá quy trình nghiệp vụ kế toán theo đúng công việc thực tế của từng vị trí (Doanh thu, Dòng tiền, Kho, Thuế, Tài chính), thể hiện rõ điểm kết nối và kiểm soát giữa các vị trí.",
  meaning: "Giúp mỗi vị trí nắm rõ quy trình của mình, đồng thời hiểu được vị trí của mình trong toàn bộ luồng vận hành kế toán để phối hợp và bàn giao chính xác."
};

/* ---------------- Lane dùng chung ---------------- */
const LANE = {
  dt:    { name: "Kế toán Doanh thu (Ninh)",      short: "KT DT",   key: "dt" },
  tien:  { name: "Kế toán Dòng tiền (Hạnh)",      short: "KT TIỀN", key: "tien" },
  kho:   { name: "Kế toán Kho (Huyền)",           short: "KT KHO",  key: "kho" },
  thue:  { name: "Kế toán Thuế",                  short: "KT THUẾ", key: "thue" },
  tc:    { name: "Kế toán Tài chính (Linh)",      short: "KT TC",   key: "tc" },
  cfo:   { name: "CFO (chị Thảo)",                short: "CFO",     key: "bod" },
  ceo:   { name: "CEO (chị Quỳnh)",               short: "CEO",     key: "bod" },
  bod:   { name: "Cấp phê duyệt (CFO / CEO)",     short: "DUYỆT",   key: "bod" },
  pkd:   { name: "Phòng Kinh doanh / BU",         short: "PKD",     key: "pkd" },
  pcu:   { name: "Phòng Cung ứng (PCU)",          short: "PCU",     key: "pcu" },
  ncc:   { name: "Nhà cung cấp / Đối tác",        short: "NCC",     key: "ext" },
  vi:    { name: "Chủ ví (Ms. Quỳnh / Sếp Quân / Ninh)", short: "CHỦ VÍ", key: "ext" },
  sanx:  { name: "Sàn giao dịch / Hệ thống",      short: "SÀN",     key: "sys" },
  ktt:   { name: "Kế toán thanh toán",            short: "KT TT",   key: "tien" },
  dnghi: { name: "Bộ phận đề nghị",               short: "ĐỀ NGHỊ", key: "pkd" }
};

/* ============================================================
   PHẦN A — SOP NỘI BỘ PHÒNG KẾ TOÁN
   ============================================================ */
const SOPS_NB = [

/* ---------------- NB 1.0 — Số dư & rút tiền sàn ---------------- */
{
  id: "sodu-ruttien",
  scope: "nb",
  code: "NB 1.0",
  name: "Theo dõi số dư & rút tiền sàn",
  tagline: "Hàng ngày · balance.hqwg.pro",
  status: "Done",
  position: "Kế toán Doanh thu",
  use: "Theo dõi số dư của từng sàn kinh doanh, xác định điều kiện rút tiền và đưa tiền về công ty.",
  meaning: "Đây là điểm khởi đầu của dòng tiền vào công ty. Rút đúng thời điểm và đúng loại tiền giúp tối ưu tỷ giá, đảm bảo nguồn tiền cho nhu cầu chi và tạo căn cứ đối chiếu doanh thu về sau.",
  owner: "Kế toán Doanh thu — chị Ninh",
  trigger: "Đầu mỗi ngày làm việc, hoặc khi có nhu cầu dòng tiền phát sinh.",
  cycle: "Hàng ngày.",
  systems: "balance.hqwg.pro · HubPay · Box rút tiền từng sàn",
  lanes: [LANE.dt, LANE.sanx, LANE.tien],
  nodes: [
    { id:"s", lane:0, col:0, type:"start", label:"Đầu ngày\nlàm việc" },
    { id:"a1", lane:0, col:1, type:"task", label:"Kiểm tra số dư\ncác sàn", tag:"Bước 1", owner:"KT Doanh thu",
      input:"Tài khoản balance.hqwg.pro, danh sách sàn đang vận hành",
      action:"Đăng nhập balance.hqwg.pro kiểm tra số dư từng sàn, ghi nhận số dư hiện tại, xác định sàn đủ điều kiện rút và theo dõi nhu cầu sử dụng tiền của công ty.",
      output:"Bảng số dư theo sàn + nhu cầu tiền trong ngày",
      control:"Kiểm tra đủ toàn bộ sàn, không bỏ sót sàn ít phát sinh",
      risk:"Bỏ sót sàn → tiền tồn trên sàn không được rút về, thiếu nguồn chi" },
    { id:"a2", lane:0, col:2, type:"task", label:"Kiểm tra điều kiện\nrút tiền", tag:"Bước 2", owner:"KT Doanh thu",
      input:"Số dư thực tế, ngưỡng rút theo quy định, tỷ giá thời điểm",
      action:"Đối chiếu số dư với ngưỡng rút, kiểm tra tỷ giá tại thời điểm dự kiến rút và xác định hình thức tiền cần rút phù hợp nhu cầu sử dụng.",
      output:"Danh sách sàn đủ điều kiện rút + số tiền và loại tiền",
      control:"Chỉ rút khi số dư và tỷ giá cùng đáp ứng điều kiện",
      risk:"Rút khi tỷ giá bất lợi → thiệt hại chênh lệch tỷ giá" },
    { id:"g1", lane:0, col:3, type:"gateway", label:"Đủ điều\nkiện rút?", owner:"KT Doanh thu",
      input:"Kết quả kiểm tra số dư và tỷ giá",
      action:"Quyết định thực hiện rút hay tiếp tục theo dõi sang ngày kế tiếp.",
      output:"Rút → thực hiện lệnh; Chưa đủ → theo dõi tiếp",
      control:"Ghi nhận lý do khi không rút để phục vụ rà soát",
      risk:"Rút dưới ngưỡng → phát sinh phí không cần thiết" },
    { id:"a3", lane:1, col:4, type:"task", label:"Thực hiện lệnh rút\ntrên từng sàn", tag:"Bước 3", owner:"KT Doanh thu trên hệ thống sàn",
      input:"Danh sách sàn đủ điều kiện, thông tin tài khoản/ví nhận",
      action:"Đăng nhập từng sàn, kiểm tra lại số dư và thông tin ví nhận trước khi thực hiện lệnh rút. Riêng Itemku thực hiện theo 2 luồng: rút USDT hoặc rút IDR (Rp) phục vụ nạp NCC Flip.",
      output:"Lệnh rút đã đặt trên sàn",
      control:"Kiểm tra lại ví nhận trước khi bấm xác nhận",
      risk:"Sai ví nhận → mất tiền, không thu hồi được" },
    { id:"a4", lane:0, col:5, type:"task", label:"Chụp ảnh giao dịch\n+ gửi box từng sàn", tag:"Bước 4", owner:"KT Doanh thu",
      input:"Chứng từ giao dịch rút",
      action:"Chụp ảnh/xác nhận giao dịch và gửi vào đúng box rút tiền của từng sàn, gồm tối thiểu: tên sàn, số tiền, loại tiền, thời gian rút, tài khoản/ví nhận, ảnh giao dịch.",
      output:"Thông báo giao dịch trên box của sàn",
      control:"Gửi đúng box của từng sàn, không gửi gộp",
      risk:"Gửi nhầm box → không đối chiếu được tiền về" },
    { id:"a5", lane:2, col:6, type:"task", label:"Theo dõi & đối chiếu\ntiền về", tag:"Bước 5", owner:"KT Dòng tiền (Hạnh)",
      input:"Thông báo giao dịch rút trên box",
      action:"Kiểm tra trạng thái giao dịch trên sàn, đối chiếu số tiền thực nhận với số đã rút và xác nhận giao dịch hoàn tất.",
      output:"Xác nhận tiền về hoặc danh sách giao dịch chênh lệch",
      control:"Giao dịch chưa về hoặc lệch phải ghi nhận theo dõi riêng",
      risk:"Không theo dõi → tiền treo trên sàn nhiều ngày" },
    { id:"a6", lane:0, col:7, type:"task", label:"Xử lý tiền IDR\ncho NCC Flip", tag:"Bước 6", owner:"KT Doanh thu",
      input:"Nhu cầu nạp tiền NCC Flip từ PCU/Kinh doanh",
      action:"Đối chiếu khoản rút IDR với nhu cầu nạp NCC Flip, thực hiện nạp và tích trạng thái Hoàn tất trên HubPay.",
      output:"Giao dịch nạp NCC Flip hoàn tất trên HubPay",
      control:"Chuỗi truy vết: Sàn → Rút IDR → Nạp NCC Flip → Hoàn tất HubPay",
      risk:"Không tích HubPay → PCU không biết đã nạp, đề nghị nạp trùng" },
    { id:"a7", lane:0, col:8, type:"task", label:"Đối chiếu & chốt\ndữ liệu rút tiền", tag:"Bước 7", owner:"KT Doanh thu",
      input:"Tổng số tiền đã rút, số dư giảm thực tế trên sàn",
      action:"Đối chiếu tổng rút với mức giảm số dư, rà các giao dịch đã thông báo nhưng chưa hoàn tất, cập nhật trạng thái và lưu chứng từ.",
      output:"Bảng theo dõi rút tiền đã chốt + bộ chứng từ",
      control:"Chứng từ lưu đủ để đối chiếu dòng tiền cuối kỳ",
      risk:"Thiếu chứng từ → không đối chiếu được với sao kê ngân hàng" },
    { id:"e", lane:0, col:9, type:"end", label:"Chốt ngày" }
  ],
  edges: [
    {from:"s",to:"a1"},{from:"a1",to:"a2"},{from:"a2",to:"g1"},
    {from:"g1",to:"a3",label:"Đủ"},{from:"g1",to:"a1",label:"Chưa đủ",type:"back"},
    {from:"a3",to:"a4"},{from:"a4",to:"a5"},{from:"a5",to:"a6"},{from:"a6",to:"a7"},{from:"a7",to:"e"}
  ],
  raci: {
    roles: ["Kế toán Doanh thu (Ninh)", "Kế toán Dòng tiền (Hạnh)", "PCU / Kinh doanh"],
    rows: [
      { task:"Kiểm tra số dư các sàn", v:["R/A","-","-"] },
      { task:"Kiểm tra điều kiện & tỷ giá rút tiền", v:["R/A","C","-"] },
      { task:"Thực hiện lệnh rút trên sàn", v:["R/A","-","-"] },
      { task:"Gửi thông báo giao dịch vào box sàn", v:["R/A","I","-"] },
      { task:"Theo dõi & đối chiếu tiền về", v:["C","R/A","-"] },
      { task:"Nạp tiền NCC Flip & tích HubPay", v:["R/A","I","C"] },
      { task:"Đối chiếu & chốt dữ liệu rút tiền", v:["R/A","C","-"] }
    ]
  },
  handoffs: [
    { from:"KT Doanh thu", to:"KT Dòng tiền", data:"Thông báo giao dịch rút trên box từng sàn", when:"Ngay sau khi rút" },
    { from:"PCU / Kinh doanh", to:"KT Doanh thu", data:"Nhu cầu nạp tiền cho NCC Flip", when:"Trước khi rút IDR" }
  ],
  controls: [
    "Chỉ thực hiện rút khi số dư đạt ngưỡng và tỷ giá đáp ứng điều kiện.",
    "Mọi giao dịch rút phải gửi đúng box của từng sàn kèm ảnh chứng từ.",
    "Khoản nạp NCC Flip phải được tích trạng thái Hoàn tất trên HubPay để tránh nạp trùng."
  ]
},

/* ---------------- NB 2.0 — Tỷ giá & đổi ngoại tệ ---------------- */
{
  id: "tygia-ngoaite",
  scope: "nb",
  code: "NB 2.0",
  name: "Tỷ giá & đổi ngoại tệ về VND",
  tagline: "4–5 lần/tháng",
  status: "Done",
  position: "Kế toán Doanh thu",
  use: "Tham khảo tỷ giá thị trường, chốt tỷ giá và thực hiện đổi ngoại tệ về VND vào tài khoản công ty.",
  meaning: "Chênh lệch tỷ giá tác động trực tiếp đến lợi nhuận. Quy trình chốt tỷ giá qua nhiều đối tác và có người duyệt giúp đảm bảo mức tỷ giá tốt nhất và minh bạch trong giao dịch ngoại tệ.",
  owner: "Kế toán Doanh thu — chị Ninh",
  trigger: "Kế toán Dòng tiền (Hạnh) phát sinh nhu cầu VND cho hoạt động chi.",
  cycle: "Khoảng 4–5 lần/tháng, tuỳ nhu cầu và dòng tiền.",
  systems: "Bảng tỷ giá kế toán · Sao kê ngân hàng · Ví ngoại tệ",
  lanes: [LANE.tien, LANE.dt, LANE.bod, LANE.vi, LANE.ncc],
  nodes: [
    { id:"s", lane:0, col:0, type:"start", label:"Phát sinh\nnhu cầu VND" },
    { id:"b1", lane:0, col:1, type:"task", label:"Gửi yêu cầu\nđổi ngoại tệ", tag:"Bước 1", owner:"KT Dòng tiền (Hạnh)",
      input:"Kế hoạch chi tiền, số dư ngoại tệ hiện có",
      action:"Xác định số tiền cần đổi, loại ngoại tệ và thời điểm cần nhận VND, gửi yêu cầu cho Kế toán Doanh thu.",
      output:"Yêu cầu đổi ngoại tệ",
      control:"Yêu cầu nêu rõ số tiền, loại tiền và thời hạn cần VND",
      risk:"Yêu cầu gấp → không đủ thời gian so tỷ giá, phải chấp nhận giá xấu" },
    { id:"b2", lane:1, col:2, type:"task", label:"Tham khảo & so sánh\ntỷ giá đối tác", tag:"Bước 2", owner:"KT Doanh thu",
      input:"Yêu cầu đổi ngoại tệ, danh sách đối tác đang giao dịch",
      action:"Tham khảo tỷ giá thị trường từ các đối tác, so sánh để chọn mức phù hợp và tổng hợp báo tỷ giá.",
      output:"Bảng so sánh tỷ giá các đối tác",
      control:"So tối thiểu 2 đối tác trở lên trước khi trình chốt",
      risk:"Chỉ hỏi 1 đối tác → không có căn cứ chứng minh tỷ giá tốt" },
    { id:"b3", lane:2, col:3, type:"task", label:"Chốt tỷ giá\nthực hiện", tag:"Bước 2", owner:"Chị Dung Thanh",
      input:"Bảng so sánh tỷ giá",
      action:"Xem xét bảng tỷ giá và chốt mức tỷ giá thực hiện cho giao dịch.",
      output:"Tỷ giá đã chốt",
      control:"Tỷ giá chốt phải được ghi nhận lại làm căn cứ đối chiếu",
      risk:"Chốt miệng không lưu vết → tranh cãi khi tiền về lệch" },
    { id:"b4", lane:1, col:4, type:"task", label:"Xác nhận giao dịch\nvới đối tác", tag:"Bước 3", owner:"KT Doanh thu",
      input:"Tỷ giá đã chốt",
      action:"Xin thông tin nhận ngoại tệ của đối tác và xác nhận lại: loại ngoại tệ, số tiền, tỷ giá, số VND dự kiến nhận, thông tin tài khoản/ví nhận.",
      output:"Thông tin giao dịch đã xác nhận",
      control:"Xác nhận đủ 5 thông tin trước khi chuyển tiền",
      risk:"Thiếu thông tin ví nhận → chuyển sai địa chỉ" },
    { id:"b5", lane:3, col:5, type:"task", label:"Chủ ví chuyển\nngoại tệ", tag:"Bước 4", owner:"Chủ ví (Ms. Quỳnh / Sếp Quân / Ninh)",
      input:"Thông tin giao dịch đã chốt",
      action:"Chủ ví kiểm tra kỹ số tiền và thông tin người nhận rồi thực hiện chuyển ngoại tệ cho đối tác.",
      output:"Giao dịch chuyển ngoại tệ + chứng từ",
      control:"Chủ ví tự kiểm tra lại trước khi chuyển, không chuyển theo trí nhớ",
      risk:"Chuyển nhầm ví đối tác → mất tiền" },
    { id:"b6", lane:4, col:6, type:"task", label:"Đối tác xác nhận\n+ chuyển VND", tag:"Bước 5", owner:"Đối tác đổi tiền",
      input:"Chứng từ chuyển ngoại tệ",
      action:"Đối tác xác nhận đã nhận ngoại tệ và chuyển số tiền VND tương ứng về tài khoản công ty.",
      output:"VND về tài khoản công ty",
      control:"Theo dõi đến khi đối tác xác nhận, không kết thúc ở bước chuyển đi",
      risk:"Đối tác chậm chuyển VND → thiếu tiền cho kỳ chi" },
    { id:"b7", lane:0, col:7, type:"task", label:"Kiểm tra sao kê\n+ đối chiếu VND về", tag:"Bước 6", owner:"KT Dòng tiền (Hạnh)",
      input:"Sao kê ngân hàng, tỷ giá đã chốt",
      action:"Kiểm tra sao kê, đối chiếu số VND thực nhận với số dự kiến theo tỷ giá đã chốt.",
      output:"Xác nhận giao dịch hoàn tất",
      control:"Chênh lệch phải truy lại tỷ giá, phí hoặc thông tin giao dịch",
      risk:"Không đối chiếu → thất thoát chênh lệch không ai phát hiện" },
    { id:"b8", lane:1, col:8, type:"task", label:"Lưu & đối chiếu\ngiao dịch", tag:"Bước 7", owner:"KT Doanh thu",
      input:"Toàn bộ chứng từ giao dịch",
      action:"Lưu thông tin: ngày, loại ngoại tệ, số ngoại tệ chuyển, tỷ giá thực hiện, số VND nhận, đối tác, chủ ví thực hiện, chứng từ. Đối chiếu với dòng tiền ngân hàng và ví ngoại tệ.",
      output:"Sổ theo dõi giao dịch đổi ngoại tệ",
      control:"Đủ 8 trường thông tin cho mỗi giao dịch",
      risk:"Thiếu dữ liệu → không đối chiếu được ví ngoại tệ cuối kỳ" },
    { id:"e", lane:1, col:9, type:"end", label:"Hoàn tất\ngiao dịch" }
  ],
  edges: [
    {from:"s",to:"b1"},{from:"b1",to:"b2"},{from:"b2",to:"b3"},{from:"b3",to:"b4"},
    {from:"b4",to:"b5"},{from:"b5",to:"b6"},{from:"b6",to:"b7"},{from:"b7",to:"b8"},{from:"b8",to:"e"}
  ],
  raci: {
    roles: ["Kế toán Doanh thu (Ninh)", "Kế toán Dòng tiền (Hạnh)", "Chị Dung Thanh", "Chủ ví", "Đối tác"],
    rows: [
      { task:"Gửi yêu cầu đổi ngoại tệ", v:["I","R/A","-","-","-"] },
      { task:"Tham khảo & so sánh tỷ giá", v:["R/A","C","I","-","C"] },
      { task:"Chốt tỷ giá thực hiện", v:["R","C","A","-","-"] },
      { task:"Xác nhận thông tin giao dịch với đối tác", v:["R/A","I","-","I","C"] },
      { task:"Chuyển ngoại tệ cho đối tác", v:["C","I","-","R/A","I"] },
      { task:"Đối tác chuyển VND về công ty", v:["C","C","-","-","R/A"] },
      { task:"Kiểm tra sao kê & đối chiếu VND", v:["C","R/A","-","-","-"] },
      { task:"Lưu chứng từ & đối chiếu giao dịch", v:["R/A","C","-","-","-"] }
    ]
  },
  handoffs: [
    { from:"KT Dòng tiền", to:"KT Doanh thu", data:"Yêu cầu đổi ngoại tệ: số tiền, loại tiền, thời hạn", when:"Khi phát sinh nhu cầu VND" },
    { from:"KT Doanh thu", to:"Chị Dung Thanh", data:"Bảng so sánh tỷ giá các đối tác", when:"Trước khi chuyển tiền" },
    { from:"KT Doanh thu", to:"Chủ ví", data:"Thông tin giao dịch đã chốt: số tiền, ví nhận", when:"Sau khi chốt tỷ giá" },
    { from:"Chủ ví", to:"KT Doanh thu", data:"Chứng từ chuyển ngoại tệ", when:"Ngay sau khi chuyển" }
  ],
  controls: [
    "Không chuyển ngoại tệ khi tỷ giá chưa được chị Dung Thanh chốt.",
    "Chủ ví phải tự kiểm tra số tiền và ví nhận trước khi thực hiện chuyển.",
    "Mỗi giao dịch lưu đủ 8 trường thông tin để đối chiếu ví ngoại tệ cuối kỳ."
  ]
},

/* ---------------- NB 3.0 — Đối soát hàng nhập & doanh thu xuất ---------------- */
{
  id: "doisoat-nhap-xuat",
  scope: "nb",
  code: "NB 3.0",
  name: "Đối soát hàng nhập & doanh thu xuất",
  tagline: "Thứ 2 & Thứ 5 hàng tuần",
  status: "Done",
  position: "Kế toán Doanh thu × Kế toán Kho",
  use: "Đối soát dữ liệu doanh thu xuất bán với dữ liệu hàng nhập kho để xác định giá vốn và lợi nhuận.",
  meaning: "Đây là điểm nối giữa hai vị trí Doanh thu và Kho. Nếu đối soát không kịp hoặc sai, toàn bộ báo cáo lợi nhuận theo BU sẽ sai theo và không thể truy ngược nguyên nhân.",
  owner: "Kế toán Doanh thu (Ninh) — phối hợp Kế toán Kho (Huyền)",
  trigger: "Đến lịch đối soát định kỳ Thứ 2 và Thứ 5 hàng tuần.",
  cycle: "Thứ 2 và Thứ 5 hàng tuần.",
  systems: "File sao kê hệ thống · BE · Dữ liệu kho · Bảng tỷ giá kế toán",
  lanes: [LANE.dt, LANE.kho],
  nodes: [
    { id:"s", lane:0, col:0, type:"start", label:"Đến lịch\nđối soát" },
    { id:"c1", lane:0, col:1, type:"task", label:"Thu thập dữ liệu\ndoanh thu", tag:"Bước 1", owner:"KT Doanh thu",
      input:"File sao kê hệ thống, dữ liệu BE các sàn chưa tự động hoá",
      action:"Nhận dữ liệu sao kê từ các file hệ thống; với sàn chưa tự động hoá thì tải trực tiếp từ BE. Kiểm tra dữ liệu bị thiếu, trùng hoặc sai.",
      output:"Bộ dữ liệu doanh thu thô",
      control:"Rà thiếu/trùng/sai ngay khi nhận, không để đến bước sau",
      risk:"Dữ liệu thiếu → doanh thu ghi nhận sót" },
    { id:"c2", lane:0, col:2, type:"task", label:"Chuẩn hoá\ndoanh thu", tag:"Bước 2", owner:"KT Doanh thu",
      input:"Dữ liệu doanh thu thô, bảng tỷ giá",
      action:"Chuẩn hoá tên sàn, ID sàn, trạng thái giao dịch; lọc theo ngày/tuần; lấy tỷ giá tương ứng và quy đổi doanh thu ngoại tệ về USD/VND theo quy định.",
      output:"Dữ liệu doanh thu đã chuẩn hoá",
      control:"Tỷ giá phải lấy đúng tuần của giao dịch",
      risk:"Sai tỷ giá → sai doanh thu quy đổi toàn kỳ" },
    { id:"c3", lane:0, col:3, type:"task", label:"Xác định doanh thu\nhợp lệ", tag:"Bước 3", owner:"KT Doanh thu",
      input:"Dữ liệu đã chuẩn hoá, danh mục trạng thái hợp lệ",
      action:"Chỉ ghi nhận giao dịch đáp ứng điều kiện trạng thái quy định. Xử lý riêng 4 trường hợp: đơn CO = 0 nhưng có SKU, đơn không tìm thấy trên BE, đơn bị trùng, đơn chưa xác định được giá vốn.",
      output:"Danh sách doanh thu hợp lệ + danh sách ngoại lệ",
      control:"Ngoại lệ tách riêng, không trộn vào doanh thu chính",
      risk:"Ghi nhận đơn không hợp lệ → doanh thu ảo" },
    { id:"c4", lane:0, col:4, type:"task", label:"Xác định giá vốn\ntheo SKU", tag:"Bước 4", owner:"KT Doanh thu",
      input:"Doanh thu hợp lệ, dữ liệu kho/BE",
      action:"Đối chiếu doanh thu với SKU, tìm SKU tương ứng trong dữ liệu kho/BE, xác định giá vốn theo SKU và kho.",
      output:"Doanh thu đã gắn giá vốn",
      control:"SKU không khớp phải chuyển sang danh sách kiểm tra",
      risk:"Gán sai SKU → sai giá vốn, sai lợi nhuận BU" },
    { id:"g1", lane:0, col:5, type:"gateway", label:"Tìm được\ngiá vốn?", owner:"KT Doanh thu",
      input:"Kết quả đối chiếu SKU",
      action:"Phân luồng đơn đã có giá vốn và đơn chưa xác định được giá vốn.",
      output:"Có → tổng hợp; Chưa có → chuyển Kế toán Kho",
      control:"Danh sách chưa có giá vốn lập riêng theo kỳ",
      risk:"Bỏ qua đơn thiếu giá vốn → lợi nhuận bị thổi phồng" },
    { id:"c5", lane:1, col:6, type:"task", label:"KT Kho kiểm tra\n+ phản hồi giá vốn", tag:"Bước 4", owner:"Kế toán Kho (Huyền)",
      input:"Danh sách đơn chưa xác định được giá vốn",
      action:"Kế toán Kho kiểm tra dữ liệu nhập kho, xác định giá vốn tương ứng và phản hồi lại Kế toán Doanh thu.",
      output:"Giá vốn được xác nhận hoặc lý do chưa xác định",
      control:"Phản hồi trong kỳ đối soát, không để tồn sang kỳ sau",
      risk:"Phản hồi chậm → đơn tồn giá vốn tích luỹ qua nhiều kỳ" },
    { id:"c6", lane:0, col:7, type:"task", label:"Cập nhật lại\ngiá vốn", tag:"Bước 4", owner:"KT Doanh thu",
      input:"Phản hồi từ Kế toán Kho",
      action:"Cập nhật giá vốn đã được xác nhận vào dữ liệu doanh thu.",
      output:"Dữ liệu doanh thu — giá vốn đầy đủ",
      control:"Chỉ cập nhật khi có căn cứ xác nhận từ Kho",
      risk:"Cập nhật theo phỏng đoán → sai số liệu kế toán" },
    { id:"c7", lane:0, col:8, type:"task", label:"Tổng hợp\nbáo cáo", tag:"Bước 5", owner:"KT Doanh thu",
      input:"Dữ liệu doanh thu và giá vốn đã hoàn thiện",
      action:"Tổng hợp Doanh thu · Giá vốn · Lợi nhuận theo ngày, theo BU và theo loại doanh thu.",
      output:"Báo cáo đối soát kỳ",
      control:"Số tổng khớp với dữ liệu nguồn trước khi phát hành",
      risk:"Báo cáo lệch nguồn → mất niềm tin số liệu" },
    { id:"e", lane:0, col:9, type:"end", label:"Chốt kỳ\nđối soát" }
  ],
  edges: [
    {from:"s",to:"c1"},{from:"c1",to:"c2"},{from:"c2",to:"c3"},{from:"c3",to:"c4"},{from:"c4",to:"g1"},
    {from:"g1",to:"c7",label:"Có"},{from:"g1",to:"c5",label:"Chưa có"},
    {from:"c5",to:"c6"},{from:"c6",to:"c7"},{from:"c7",to:"e"}
  ],
  raci: {
    roles: ["Kế toán Doanh thu (Ninh)", "Kế toán Kho (Huyền)"],
    rows: [
      { task:"Thu thập dữ liệu doanh thu", v:["R/A","-"] },
      { task:"Chuẩn hoá & quy đổi tỷ giá", v:["R/A","-"] },
      { task:"Xác định doanh thu hợp lệ & ngoại lệ", v:["R/A","C"] },
      { task:"Xác định giá vốn theo SKU và kho", v:["R/A","C"] },
      { task:"Kiểm tra & phản hồi đơn chưa có giá vốn", v:["C","R/A"] },
      { task:"Cập nhật lại giá vốn sau phản hồi", v:["R/A","C"] },
      { task:"Tổng hợp báo cáo Doanh thu – Giá vốn – Lợi nhuận", v:["R/A","I"] }
    ]
  },
  handoffs: [
    { from:"KT Doanh thu", to:"KT Kho", data:"Danh sách đơn chưa xác định được giá vốn", when:"Thứ 2 & Thứ 5" },
    { from:"KT Kho", to:"KT Doanh thu", data:"Giá vốn xác nhận theo SKU/kho", when:"Trong kỳ đối soát" }
  ],
  controls: [
    "Chỉ ghi nhận giao dịch có trạng thái nằm trong danh mục hợp lệ.",
    "4 nhóm ngoại lệ phải tách riêng và theo dõi, không trộn vào doanh thu chính.",
    "Không cập nhật giá vốn khi chưa có xác nhận từ Kế toán Kho."
  ]
},

/* ---------------- NB 4.0 — Hoá đơn bán hàng ---------------- */
{
  id: "hoadon-banhang",
  scope: "nb",
  code: "NB 4.0",
  name: "Hoá đơn bán hàng theo kỳ",
  tagline: "Kỳ 17:01 N-1 → 17:00 N",
  status: "Done",
  position: "Kế toán Thuế",
  use: "Xuất hoá đơn bán hàng cho khách theo kỳ dữ liệu lấy từ hệ thống Octa.",
  meaning: "Xuất hoá đơn đúng kỳ và đúng số liệu là nghĩa vụ pháp lý bắt buộc; sai sót ở khâu này dẫn tới rủi ro bị xử phạt thuế và phải điều chỉnh hoá đơn về sau.",
  owner: "Kế toán Thuế",
  trigger: "Đến mốc chốt kỳ dữ liệu bán hàng trên Octa.",
  cycle: "Theo kỳ: 17:01 ngày N-1 đến 17:00 ngày N.",
  systems: "Octa · Phần mềm hoá đơn điện tử",
  lanes: [LANE.thue, LANE.sanx],
  nodes: [
    { id:"s", lane:1, col:0, type:"start", label:"Đến mốc\nchốt kỳ" },
    { id:"d1", lane:0, col:1, type:"task", label:"Nhận dữ liệu\nbán hàng từ Octa", tag:"Bước 1", owner:"Kế toán Thuế",
      input:"Hệ thống Octa",
      action:"Nhận dữ liệu bán hàng phát sinh trong kỳ từ Octa.",
      output:"Dữ liệu bán hàng thô",
      control:"Kiểm tra dữ liệu có đầy đủ toàn kỳ",
      risk:"Thiếu dữ liệu → sót hoá đơn phải xuất" },
    { id:"d2", lane:0, col:2, type:"task", label:"Lấy dữ liệu\nđúng kỳ", tag:"Bước 2", owner:"Kế toán Thuế",
      input:"Dữ liệu bán hàng",
      action:"Lọc dữ liệu theo kỳ từ 17:01 ngày N-1 đến 17:00 ngày N.",
      output:"Dữ liệu bán hàng theo kỳ",
      control:"Mốc giờ cắt kỳ phải chính xác đến phút",
      risk:"Cắt kỳ sai → trùng hoặc sót giao dịch giữa hai kỳ" },
    { id:"d3", lane:0, col:3, type:"task", label:"Kiểm tra doanh thu\n& số lượng", tag:"Bước 3", owner:"Kế toán Thuế",
      input:"Dữ liệu theo kỳ",
      action:"Kiểm tra doanh thu và số lượng trước khi phát hành hoá đơn.",
      output:"Dữ liệu đã kiểm tra",
      control:"Đối chiếu tổng doanh thu kỳ với hệ thống nguồn",
      risk:"Xuất hoá đơn sai số → phải điều chỉnh, giải trình thuế" },
    { id:"d4", lane:0, col:4, type:"task", label:"Xuất hoá đơn\ncho khách hàng", tag:"Bước 4", owner:"Kế toán Thuế",
      input:"Dữ liệu đã kiểm tra",
      action:"Phát hành hoá đơn điện tử cho khách hàng theo dữ liệu kỳ.",
      output:"Hoá đơn đã phát hành",
      control:"Kiểm tra thông tin người mua trước khi phát hành",
      risk:"Sai thông tin người mua → phải huỷ và xuất lại" },
    { id:"d5", lane:0, col:5, type:"task", label:"Lưu dữ liệu\n& hoá đơn", tag:"Bước 5", owner:"Kế toán Thuế",
      input:"Hoá đơn đã phát hành",
      action:"Lưu trữ dữ liệu bán hàng và hoá đơn phục vụ khai thuế và đối chiếu.",
      output:"Bộ hồ sơ hoá đơn theo kỳ",
      control:"Lưu theo kỳ, dễ truy xuất khi khai thuế quý",
      risk:"Thiếu hồ sơ lưu → khó giải trình khi quyết toán" },
    { id:"e", lane:0, col:6, type:"end", label:"Hoàn tất kỳ" }
  ],
  edges: [
    {from:"s",to:"d1"},{from:"d1",to:"d2"},{from:"d2",to:"d3"},{from:"d3",to:"d4"},{from:"d4",to:"d5"},{from:"d5",to:"e"}
  ],
  raci: {
    roles: ["Kế toán Thuế", "Kế toán Doanh thu", "Kế toán Tài chính"],
    rows: [
      { task:"Nhận dữ liệu bán hàng từ Octa", v:["R/A","C","-"] },
      { task:"Lấy dữ liệu đúng kỳ 17:01 N-1 → 17:00 N", v:["R/A","-","-"] },
      { task:"Kiểm tra doanh thu & số lượng", v:["R/A","C","I"] },
      { task:"Xuất hoá đơn cho khách hàng", v:["R/A","-","-"] },
      { task:"Lưu dữ liệu và hoá đơn", v:["R/A","-","I"] }
    ]
  },
  handoffs: [
    { from:"Octa", to:"Kế toán Thuế", data:"Dữ liệu bán hàng theo kỳ", when:"17:00 hàng ngày" },
    { from:"Kế toán Thuế", to:"Kế toán Tài chính", data:"Dữ liệu hoá đơn đã phát hành", when:"Cuối kỳ" }
  ],
  controls: [
    "Mốc cắt kỳ 17:01 N-1 → 17:00 N là cố định, không tự điều chỉnh.",
    "Kiểm tra doanh thu và số lượng trước khi phát hành, không phát hành rồi sửa.",
    "Hồ sơ hoá đơn lưu theo kỳ để phục vụ khai thuế quý và quyết toán năm."
  ]
},

/* ---------------- NB 5.0 — Hoá đơn cho thuê văn phòng ---------------- */
{
  id: "hoadon-thuevp",
  scope: "nb",
  code: "NB 5.0",
  name: "Hoá đơn cho thuê văn phòng",
  tagline: "Cuối tháng",
  status: "Done",
  position: "Kế toán Thuế",
  use: "Tổng hợp tiền thuê và tiền điện, xuất hoá đơn cho các bên thuê văn phòng.",
  meaning: "Khoản cho thuê văn phòng là nguồn thu ngoài hoạt động kinh doanh chính; xuất hoá đơn đúng hạn giúp thu hồi công nợ đúng kỳ và ghi nhận đủ doanh thu chịu thuế.",
  owner: "Kế toán Thuế",
  trigger: "Kết thúc tháng, có số liệu tiền thuê và tiền điện.",
  cycle: "Cuối tháng.",
  systems: "Bảng theo dõi cho thuê · Phần mềm hoá đơn điện tử",
  lanes: [LANE.thue, LANE.ncc],
  nodes: [
    { id:"s", lane:0, col:0, type:"start", label:"Cuối tháng" },
    { id:"f1", lane:0, col:1, type:"task", label:"Tổng hợp tiền thuê\n+ tiền điện", tag:"Bước 1", owner:"Kế toán Thuế",
      input:"Hợp đồng thuê, chỉ số điện, bảng theo dõi",
      action:"Tổng hợp tiền thuê văn phòng và tiền điện phát sinh của từng bên thuê trong tháng.",
      output:"Bảng tổng hợp tiền thuê và tiền điện",
      control:"Đối chiếu chỉ số điện với số liệu thực tế đo được",
      risk:"Sai chỉ số → xuất hoá đơn sai, phải điều chỉnh" },
    { id:"f2", lane:0, col:2, type:"task", label:"Kiểm tra\nsố liệu", tag:"Bước 2", owner:"Kế toán Thuế",
      input:"Bảng tổng hợp",
      action:"Kiểm tra lại số liệu tiền thuê và tiền điện trước khi phát hành hoá đơn.",
      output:"Số liệu đã kiểm tra",
      control:"Đối chiếu với điều khoản hợp đồng thuê",
      risk:"Tính sai đơn giá thuê → tranh chấp với bên thuê" },
    { id:"f3", lane:0, col:3, type:"task", label:"Xuất hoá đơn\ncho các bên thuê", tag:"Bước 3", owner:"Kế toán Thuế",
      input:"Số liệu đã kiểm tra",
      action:"Phát hành hoá đơn cho từng bên thuê theo số liệu đã xác nhận.",
      output:"Hoá đơn cho thuê đã phát hành",
      control:"Mỗi bên thuê một hoá đơn riêng",
      risk:"Gộp hoá đơn → bên thuê không hạch toán được" },
    { id:"f4", lane:1, col:4, type:"task", label:"Bên thuê\nnhận hoá đơn", tag:"Bước 4", owner:"Bên thuê văn phòng",
      input:"Hoá đơn đã phát hành",
      action:"Gửi hoá đơn cho bên liên quan và theo dõi việc nhận.",
      output:"Xác nhận đã nhận hoá đơn",
      control:"Gửi trong tháng để bên thuê kịp hạch toán đúng kỳ",
      risk:"Gửi muộn → bên thuê ghi nhận sai kỳ, chậm thanh toán" },
    { id:"e", lane:1, col:5, type:"end", label:"Hoàn tất" }
  ],
  edges: [
    {from:"s",to:"f1"},{from:"f1",to:"f2"},{from:"f2",to:"f3"},{from:"f3",to:"f4"},{from:"f4",to:"e"}
  ],
  raci: {
    roles: ["Kế toán Thuế", "Kế toán Tài chính", "Bên thuê văn phòng"],
    rows: [
      { task:"Tổng hợp tiền thuê và tiền điện", v:["R/A","C","-"] },
      { task:"Kiểm tra số liệu", v:["R/A","C","-"] },
      { task:"Xuất hoá đơn cho các bên thuê", v:["R/A","I","I"] },
      { task:"Gửi hoá đơn cho bên liên quan", v:["R/A","-","R"] }
    ]
  },
  handoffs: [
    { from:"Kế toán Thuế", to:"Bên thuê văn phòng", data:"Hoá đơn tiền thuê và tiền điện", when:"Cuối tháng" },
    { from:"Kế toán Thuế", to:"Kế toán Tài chính", data:"Doanh thu cho thuê ghi nhận trong kỳ", when:"Cuối tháng" }
  ],
  controls: [
    "Chỉ số điện phải được đối chiếu với số đo thực tế trước khi tính.",
    "Mỗi bên thuê xuất một hoá đơn riêng để phục vụ hạch toán hai bên.",
    "Hoá đơn gửi trong tháng phát sinh để bên thuê ghi nhận đúng kỳ."
  ]
},

/* ---------------- NB 6.0 — Khai thuế GTGT & TNCN ---------------- */
{
  id: "khai-thue",
  scope: "nb",
  code: "NB 6.0",
  name: "Khai thuế GTGT & TNCN",
  tagline: "Hàng quý",
  status: "Done",
  position: "Kế toán Thuế",
  use: "Lập và nộp tờ khai thuế GTGT, TNCN theo quý và thực hiện nghĩa vụ nộp thuế.",
  meaning: "Khai thuế là nghĩa vụ có thời hạn pháp lý cứng. Nộp muộn hoặc khai sai dẫn tới tiền phạt, tiền chậm nộp và rủi ro bị thanh tra thuế.",
  owner: "Kế toán Thuế",
  trigger: "Kết thúc quý, đến hạn khai thuế theo quy định.",
  cycle: "Hàng quý.",
  systems: "Misa · Hệ thống khai thuế điện tử · Ngân hàng",
  lanes: [LANE.thue, LANE.tc, LANE.tien],
  nodes: [
    { id:"s", lane:0, col:0, type:"start", label:"Kết thúc quý" },
    { id:"g1n", lane:0, col:1, type:"task", label:"Thu thập\ndữ liệu", tag:"Bước 1", owner:"Kế toán Thuế",
      input:"Hoá đơn đầu ra, hoá đơn đầu vào, dữ liệu lương",
      action:"Thu thập toàn bộ dữ liệu phát sinh trong quý phục vụ khai thuế GTGT và TNCN.",
      output:"Bộ dữ liệu khai thuế quý",
      control:"Đủ dữ liệu 3 tháng của quý",
      risk:"Thiếu dữ liệu → khai thiếu, phải khai bổ sung" },
    { id:"g2n", lane:0, col:2, type:"task", label:"Kiểm tra\nhoá đơn", tag:"Bước 2", owner:"Kế toán Thuế",
      input:"Hoá đơn đầu vào và đầu ra",
      action:"Kiểm tra tính hợp lệ của hoá đơn. Với hoá đơn đầu vào cần kiểm tra điều kiện khấu trừ; hoá đơn giá trị lớn phải đối chiếu với chứng từ thanh toán qua ngân hàng.",
      output:"Danh sách hoá đơn đủ điều kiện khấu trừ",
      control:"Hoá đơn giá trị lớn bắt buộc có chứng từ thanh toán qua ngân hàng",
      risk:"Khấu trừ hoá đơn không đủ điều kiện → bị loại khi thanh tra" },
    { id:"g3n", lane:1, col:3, type:"task", label:"Đối chiếu\nMisa", tag:"Bước 3", owner:"Kế toán Thuế × Kế toán Tài chính",
      input:"Dữ liệu hạch toán trên Misa",
      action:"Đối chiếu số liệu hoá đơn với dữ liệu hạch toán trên Misa để đảm bảo khớp.",
      output:"Số liệu khai thuế đã đối chiếu",
      control:"Chênh lệch phải giải trình được trước khi lập tờ khai",
      risk:"Tờ khai lệch sổ kế toán → rủi ro khi quyết toán" },
    { id:"g4n", lane:0, col:4, type:"task", label:"Lập\ntờ khai", tag:"Bước 4", owner:"Kế toán Thuế",
      input:"Số liệu đã đối chiếu",
      action:"Lập tờ khai thuế GTGT và TNCN của quý.",
      output:"Tờ khai thuế",
      control:"Lập trước hạn nộp tối thiểu vài ngày làm việc",
      risk:"Lập sát hạn → không kịp xử lý khi phát hiện sai" },
    { id:"g5n", lane:0, col:5, type:"gateway", label:"Kiểm tra\nđạt?", owner:"Kế toán Thuế",
      input:"Tờ khai đã lập",
      action:"Rà soát lại tờ khai trước khi nộp.",
      output:"Đạt → nộp tờ khai; Chưa đạt → lập lại",
      control:"Kiểm tra chéo trước khi nộp",
      risk:"Nộp tờ khai sai → phải khai bổ sung, ảnh hưởng hồ sơ thuế" },
    { id:"g6n", lane:0, col:6, type:"task", label:"Nộp\ntờ khai", tag:"Bước 6", owner:"Kế toán Thuế",
      input:"Tờ khai đã kiểm tra",
      action:"Nộp tờ khai qua hệ thống khai thuế điện tử trước hạn.",
      output:"Tờ khai đã nộp + biên nhận",
      control:"Lưu biên nhận nộp tờ khai",
      risk:"Nộp trễ hạn → bị phạt hành chính" },
    { id:"g7n", lane:2, col:7, type:"task", label:"Nộp\ntiền thuế", tag:"Bước 7", owner:"Kế toán Dòng tiền",
      input:"Số thuế phải nộp theo tờ khai",
      action:"Thực hiện nộp tiền thuế vào ngân sách theo số liệu tờ khai.",
      output:"Chứng từ nộp thuế",
      control:"Nộp trong hạn để tránh tiền chậm nộp",
      risk:"Nộp trễ → phát sinh tiền chậm nộp" },
    { id:"g8n", lane:0, col:8, type:"task", label:"Lưu\nhồ sơ", tag:"Bước 8", owner:"Kế toán Thuế",
      input:"Tờ khai, biên nhận, chứng từ nộp thuế",
      action:"Lưu trữ bộ hồ sơ khai và nộp thuế của quý.",
      output:"Hồ sơ thuế quý",
      control:"Lưu đủ tờ khai + biên nhận + chứng từ nộp",
      risk:"Thiếu hồ sơ → không chứng minh được khi thanh tra" },
    { id:"e", lane:0, col:9, type:"end", label:"Hoàn tất quý" }
  ],
  edges: [
    {from:"s",to:"g1n"},{from:"g1n",to:"g2n"},{from:"g2n",to:"g3n"},{from:"g3n",to:"g4n"},{from:"g4n",to:"g5n"},
    {from:"g5n",to:"g6n",label:"Đạt"},{from:"g5n",to:"g4n",label:"Chưa đạt",type:"back"},
    {from:"g6n",to:"g7n"},{from:"g7n",to:"g8n"},{from:"g8n",to:"e"}
  ],
  raci: {
    roles: ["Kế toán Thuế", "Kế toán Tài chính", "Kế toán Dòng tiền"],
    rows: [
      { task:"Thu thập dữ liệu khai thuế", v:["R/A","C","C"] },
      { task:"Kiểm tra điều kiện khấu trừ hoá đơn đầu vào", v:["R/A","C","C"] },
      { task:"Đối chiếu số liệu với Misa", v:["R","A","-"] },
      { task:"Lập tờ khai GTGT & TNCN", v:["R/A","C","-"] },
      { task:"Nộp tờ khai", v:["R/A","I","I"] },
      { task:"Nộp tiền thuế", v:["C","I","R/A"] },
      { task:"Lưu hồ sơ thuế", v:["R/A","I","-"] }
    ]
  },
  handoffs: [
    { from:"Kế toán Tài chính", to:"Kế toán Thuế", data:"Số liệu hạch toán trên Misa để đối chiếu", when:"Đầu kỳ khai thuế" },
    { from:"Kế toán Thuế", to:"Kế toán Dòng tiền", data:"Số thuế phải nộp theo tờ khai", when:"Sau khi nộp tờ khai" }
  ],
  controls: [
    "Hoá đơn đầu vào giá trị lớn bắt buộc đối chiếu chứng từ thanh toán qua ngân hàng.",
    "Không lập tờ khai khi số liệu chưa khớp với Misa.",
    "Tờ khai và tiền thuế phải nộp trong hạn quy định, lưu đủ biên nhận."
  ]
},

/* ---------------- NB 7.0 — Quyết toán thuế năm ---------------- */
{
  id: "quyettoan-thue",
  scope: "nb",
  code: "NB 7.0",
  name: "Quyết toán thuế năm",
  tagline: "Hàng năm",
  status: "Done",
  position: "Kế toán Thuế",
  use: "Tổng hợp số liệu cả năm, đối chiếu Misa và hồ sơ thuế để chuẩn bị quyết toán.",
  meaning: "Quyết toán năm là kỳ rà soát toàn bộ nghĩa vụ thuế. Số liệu chuẩn bị kỹ giúp giảm rủi ro điều chỉnh, truy thu và phạt khi cơ quan thuế kiểm tra.",
  owner: "Kế toán Thuế",
  trigger: "Kết thúc năm tài chính.",
  cycle: "Hàng năm.",
  systems: "Misa · Hồ sơ thuế các quý",
  lanes: [LANE.thue, LANE.tc],
  nodes: [
    { id:"s", lane:0, col:0, type:"start", label:"Kết thúc\nnăm tài chính" },
    { id:"h1", lane:0, col:1, type:"task", label:"Tổng hợp\nsố liệu năm", tag:"Bước 1", owner:"Kế toán Thuế",
      input:"Hồ sơ thuế 4 quý, dữ liệu kế toán năm",
      action:"Tổng hợp toàn bộ số liệu thuế phát sinh trong năm.",
      output:"Bảng tổng hợp số liệu năm",
      control:"Đủ 4 quý, không sót kỳ khai bổ sung",
      risk:"Sót kỳ → số quyết toán lệch với tờ khai đã nộp" },
    { id:"h2", lane:1, col:2, type:"task", label:"Đối chiếu Misa\n& hồ sơ thuế", tag:"Bước 2", owner:"Kế toán Thuế × Kế toán Tài chính",
      input:"Số liệu Misa, hồ sơ thuế các quý",
      action:"Đối chiếu số liệu hạch toán trên Misa với hồ sơ thuế đã nộp trong năm.",
      output:"Bảng đối chiếu và danh sách chênh lệch",
      control:"Mọi chênh lệch phải xác định nguyên nhân",
      risk:"Chênh lệch không giải trình → rủi ro truy thu" },
    { id:"h3", lane:0, col:3, type:"task", label:"Chuẩn bị số liệu\nquyết toán", tag:"Bước 3", owner:"Kế toán Thuế",
      input:"Bảng đối chiếu",
      action:"Chuẩn bị bộ số liệu phục vụ quyết toán thuế năm.",
      output:"Bộ số liệu quyết toán",
      control:"Số liệu đã xử lý hết chênh lệch mới đưa vào quyết toán",
      risk:"Đưa số chưa xử lý → phải điều chỉnh giữa chừng" },
    { id:"h4", lane:0, col:4, type:"gateway", label:"Kiểm tra\nđạt?", owner:"Kế toán Thuế",
      input:"Bộ số liệu quyết toán",
      action:"Rà soát lần cuối trước khi bàn giao.",
      output:"Đạt → bàn giao; Chưa đạt → xử lý lại",
      control:"Kiểm tra chéo với Kế toán Tài chính",
      risk:"Bỏ qua rà soát → sai số liệu quyết toán năm" },
    { id:"h5", lane:1, col:5, type:"task", label:"Bàn giao số liệu\ncho người lập báo cáo", tag:"Bước 5", owner:"Kế toán Tài chính",
      input:"Bộ số liệu quyết toán đã kiểm tra",
      action:"Bàn giao số liệu cho người phụ trách lập báo cáo/quyết toán.",
      output:"Biên bản bàn giao số liệu quyết toán",
      control:"Bàn giao có xác nhận, ghi rõ phạm vi số liệu",
      risk:"Bàn giao không rõ ràng → không xác định được trách nhiệm số liệu" },
    { id:"e", lane:1, col:6, type:"end", label:"Hoàn tất\nquyết toán" }
  ],
  edges: [
    {from:"s",to:"h1"},{from:"h1",to:"h2"},{from:"h2",to:"h3"},{from:"h3",to:"h4"},
    {from:"h4",to:"h5",label:"Đạt"},{from:"h4",to:"h2",label:"Chưa đạt",type:"back"},
    {from:"h5",to:"e"}
  ],
  raci: {
    roles: ["Kế toán Thuế", "Kế toán Tài chính", "Trưởng phòng Kế toán"],
    rows: [
      { task:"Tổng hợp số liệu thuế năm", v:["R/A","C","I"] },
      { task:"Đối chiếu Misa và hồ sơ thuế", v:["R","A","I"] },
      { task:"Chuẩn bị số liệu quyết toán", v:["R/A","C","I"] },
      { task:"Kiểm tra số liệu", v:["R","C","A"] },
      { task:"Bàn giao số liệu quyết toán", v:["R","R/A","A"] }
    ]
  },
  handoffs: [
    { from:"Kế toán Tài chính", to:"Kế toán Thuế", data:"Số liệu Misa cả năm", when:"Đầu kỳ quyết toán" },
    { from:"Kế toán Thuế", to:"Người lập báo cáo quyết toán", data:"Bộ số liệu quyết toán đã kiểm tra", when:"Sau khi rà soát" }
  ],
  controls: [
    "Mọi chênh lệch giữa Misa và hồ sơ thuế phải xác định nguyên nhân trước khi quyết toán.",
    "Số liệu bàn giao phải có xác nhận và ghi rõ phạm vi.",
    "Không bàn giao khi còn chênh lệch chưa xử lý."
  ]
},

/* ---------------- NB 8.0 — Báo cáo tài chính quản trị ---------------- */
{
  id: "bctc-quantri",
  scope: "nb",
  code: "NB 8.0",
  name: "Báo cáo tài chính quản trị",
  tagline: "Theo kỳ · Cần rà soát",
  status: "Cần rà soát",
  position: "Kế toán Tài chính",
  use: "Tổng hợp doanh thu — giá vốn — chi phí từ các vị trí khác thành báo cáo tài chính quản trị theo kỳ.",
  meaning: "Đây là điểm hội tụ cuối cùng của toàn bộ chuỗi kế toán. Báo cáo chỉ đáng tin khi số liệu đầu vào đã được đối soát ở từng vị trí trước, không lấy số thô từ hệ thống vận hành.",
  owner: "Kế toán Tài chính — chị Linh",
  trigger: "Kết thúc kỳ báo cáo hoặc theo yêu cầu của Trưởng phòng Kế toán/CPO.",
  cycle: "Theo kỳ yêu cầu.",
  systems: "Misa · Dữ liệu đối soát từ các vị trí",
  note: "Hiện trạng vị trí Tài chính trong bảng thu thập ban đầu chưa có đủ các bước chi tiết. Quy trình dưới đây được chuẩn hoá thành đầu ra kỳ vọng, cần Kế toán Tài chính rà soát và bổ sung cho khớp thực tế công việc.",
  lanes: [LANE.dt, LANE.kho, LANE.tien, LANE.tc, LANE.bod],
  nodes: [
    { id:"s", lane:3, col:0, type:"start", label:"Kết thúc\nkỳ báo cáo" },
    { id:"i0", lane:3, col:1, type:"gateway", gw:"parallel", label:"Gom\nđầu vào", owner:"Kế toán Tài chính",
      input:"Lịch chốt số của từng vị trí",
      action:"Kích hoạt thu thập song song 3 nguồn dữ liệu: doanh thu, giá vốn, chi phí.",
      output:"3 luồng đầu vào được kích hoạt",
      control:"Đủ 3 nguồn mới được tổng hợp",
      risk:"Thiếu một nguồn → báo cáo lệch, phải làm lại" },
    { id:"i1", lane:0, col:2, type:"task", label:"Dữ liệu\ndoanh thu", tag:"Đầu vào", owner:"Kế toán Doanh thu",
      input:"Báo cáo doanh thu đã đối soát",
      action:"Cung cấp dữ liệu doanh thu đã đối soát theo kỳ, theo BU và loại doanh thu.",
      output:"Dữ liệu doanh thu kỳ",
      control:"Chỉ nộp số đã đối soát, không nộp số thô",
      risk:"Nộp số thô → báo cáo sai lợi nhuận" },
    { id:"i2", lane:1, col:3, type:"task", label:"Dữ liệu\ngiá vốn", tag:"Đầu vào", owner:"Kế toán Kho",
      input:"Dữ liệu nhập kho, giá vốn theo SKU",
      action:"Cung cấp dữ liệu giá vốn đã xác nhận theo kỳ.",
      output:"Dữ liệu giá vốn kỳ",
      control:"Giá vốn đã xử lý hết đơn tồn hoặc nêu rõ phần còn tồn",
      risk:"Còn đơn tồn giá vốn → lợi nhuận bị thổi phồng" },
    { id:"i3", lane:2, col:4, type:"task", label:"Dữ liệu\nchi phí", tag:"Đầu vào", owner:"Kế toán Dòng tiền",
      input:"Dữ liệu chi phí đã thanh toán và ghi nhận",
      action:"Cung cấp dữ liệu chi phí theo kỳ, phân loại theo nhóm khoản chi.",
      output:"Dữ liệu chi phí kỳ",
      control:"Chi phí ghi nhận đúng kỳ phát sinh",
      risk:"Ghi nhận sai kỳ → lợi nhuận kỳ này/kỳ sau đều sai" },
    { id:"i4", lane:3, col:5, type:"gateway", gw:"parallel", label:"Hợp\nluồng", owner:"Kế toán Tài chính",
      input:"3 nguồn dữ liệu",
      action:"Kiểm tra đủ 3 nguồn trước khi chuẩn hoá.",
      output:"Dữ liệu sẵn sàng tổng hợp",
      control:"Thiếu nguồn nào thì đôn đốc đầu mối tương ứng",
      risk:"Tổng hợp thiếu → báo cáo phải phát hành lại" },
    { id:"i5", lane:3, col:6, type:"task", label:"Chuẩn hoá\n& đối chiếu", tag:"Bước 2–3", owner:"Kế toán Tài chính",
      input:"Dữ liệu 3 nguồn + dữ liệu các BU",
      action:"Chuẩn hoá dữ liệu và đối chiếu doanh thu — giá vốn — chi phí với nhau.",
      output:"Dữ liệu đã chuẩn hoá và đối chiếu",
      control:"Đối chiếu chéo 3 chiều trước khi phân loại",
      risk:"Không đối chiếu → sai lệch không phát hiện được" },
    { id:"i6", lane:3, col:7, type:"task", label:"Phân loại\ntheo BU/team", tag:"Bước 4", owner:"Kế toán Tài chính",
      input:"Dữ liệu đã đối chiếu",
      action:"Phân loại số liệu theo từng BU và team.",
      output:"Số liệu theo BU",
      control:"Tổng các BU phải bằng tổng toàn công ty",
      risk:"Phân loại sai → đánh giá sai hiệu quả từng BU" },
    { id:"i7", lane:3, col:8, type:"task", label:"Tổng hợp\n+ soát bất thường", tag:"Bước 5–6", owner:"Kế toán Tài chính",
      input:"Số liệu theo BU",
      action:"Tổng hợp số liệu và kiểm tra các khoản bất thường trước khi lập báo cáo.",
      output:"Số liệu đã soát",
      control:"Khoản bất thường phải giải trình được nguồn gốc",
      risk:"Bỏ qua bất thường → báo cáo mất tin cậy" },
    { id:"i8", lane:3, col:9, type:"task", label:"Lập báo cáo\ntài chính quản trị", tag:"Bước 7", owner:"Kế toán Tài chính",
      input:"Số liệu đã soát",
      action:"Lập báo cáo theo chuỗi: Doanh thu → Giá vốn → Lợi nhuận gộp → Chi phí → Lợi nhuận.",
      output:"Báo cáo tài chính quản trị kỳ",
      control:"Báo cáo có thuyết minh khoản bất thường",
      risk:"Báo cáo thiếu thuyết minh → BOD hiểu sai tình hình" },
    { id:"i9", lane:4, col:10, type:"task", label:"Gửi Trưởng phòng KT\n/ CPO", tag:"Đầu ra", owner:"Kế toán Tài chính",
      input:"Báo cáo hoàn chỉnh",
      action:"Gửi báo cáo cho Trưởng phòng Kế toán/CPO theo kỳ yêu cầu.",
      output:"Báo cáo đã phát hành",
      control:"Gửi đúng kỳ yêu cầu",
      risk:"Gửi muộn → BOD ra quyết định trên số liệu cũ" },
    { id:"e", lane:4, col:11, type:"end", label:"Chốt kỳ\nbáo cáo" }
  ],
  edges: [
    {from:"s",to:"i0"},
    {from:"i0",to:"i1"},{from:"i0",to:"i2"},{from:"i0",to:"i3"},
    {from:"i1",to:"i4"},{from:"i2",to:"i4"},{from:"i3",to:"i4"},
    {from:"i4",to:"i5"},{from:"i5",to:"i6"},{from:"i6",to:"i7"},{from:"i7",to:"i8"},{from:"i8",to:"i9"},{from:"i9",to:"e"}
  ],
  raci: {
    roles: ["Kế toán Tài chính (Linh)", "Kế toán Doanh thu", "Kế toán Kho", "Kế toán Dòng tiền", "TP Kế toán / CPO"],
    rows: [
      { task:"Cung cấp dữ liệu doanh thu đã đối soát", v:["C","R/A","-","-","I"] },
      { task:"Cung cấp dữ liệu giá vốn", v:["C","C","R/A","-","I"] },
      { task:"Cung cấp dữ liệu chi phí", v:["C","-","-","R/A","I"] },
      { task:"Chuẩn hoá & đối chiếu dữ liệu", v:["R/A","C","C","C","-"] },
      { task:"Phân loại theo BU/team", v:["R/A","C","-","-","-"] },
      { task:"Kiểm tra khoản bất thường", v:["R/A","C","C","C","I"] },
      { task:"Lập báo cáo tài chính quản trị", v:["R/A","-","-","-","A"] },
      { task:"Gửi báo cáo theo kỳ", v:["R/A","-","-","-","I"] }
    ]
  },
  handoffs: [
    { from:"Kế toán Doanh thu", to:"Kế toán Tài chính", data:"Doanh thu, giá vốn, lợi nhuận đã đối soát", when:"Sau khi chốt kỳ đối soát" },
    { from:"Kế toán Kho", to:"Kế toán Tài chính", data:"Giá vốn theo SKU/kho", when:"Sau kiểm kê cuối tháng" },
    { from:"Kế toán Dòng tiền", to:"Kế toán Tài chính", data:"Chi phí đã thanh toán theo nhóm", when:"Cuối kỳ" },
    { from:"Kế toán Tài chính", to:"TP Kế toán / CPO", data:"Báo cáo tài chính quản trị", when:"Theo kỳ yêu cầu" }
  ],
  controls: [
    "Chỉ tổng hợp số liệu đã được đối soát ở vị trí trước, không lấy số thô từ hệ thống vận hành.",
    "Tổng số liệu các BU phải bằng tổng toàn công ty.",
    "Khoản bất thường phải được giải trình trước khi phát hành báo cáo."
  ]
},

/* ---------------- NB 9.0 — Ghi nhận dòng tiền các ví (chờ bổ sung) ---------------- */
{
  id: "ghinhan-dongtien",
  scope: "nb",
  code: "NB 9.0",
  name: "Ghi nhận & đối soát dòng tiền các ví",
  tagline: "Chờ Phòng Kế toán bổ sung",
  status: "Chờ bổ sung",
  position: "Kế toán Dòng tiền",
  draft: true,
  use: "Ghi nhận dòng tiền phát sinh ở các ví/sàn, theo dõi và đối soát số dư ví theo kỳ.",
  meaning: "Đây là quy trình được nêu tên trong bảng phần hành (mục 5.0 — Tiền, phụ trách: chị Hạnh) nhưng phần nội dung chi tiết chưa được cung cấp trong file nguồn. Khung dưới đây là chỗ để Phòng Kế toán điền vào, không phải quy trình đã ban hành.",
  owner: "Kế toán Dòng tiền — chị Hạnh",
  trigger: "Chưa xác định — cần Phòng Kế toán bổ sung.",
  cycle: "Chưa xác định — cần Phòng Kế toán bổ sung.",
  systems: "Chưa xác định",
  lanes: [LANE.tien, LANE.dt],
  nodes: [
    { id:"s", lane:0, col:0, type:"start", label:"Chờ\nbổ sung" },
    { id:"j1", lane:0, col:1, type:"task", label:"Ghi nhận dòng tiền\nthu các ví", tag:"Chờ bổ sung", owner:"Kế toán Dòng tiền (Hạnh)",
      input:"Chưa có thông tin trong file nguồn",
      action:"Bảng phần hành ghi: ghi nhận dòng tiền thu các ví. Chi tiết các bước chưa được cung cấp.",
      output:"Chưa xác định",
      control:"Cần Phòng Kế toán bổ sung",
      risk:"Chưa có SOP chuẩn → mỗi kỳ làm một cách, khó bàn giao" },
    { id:"j2", lane:1, col:2, type:"task", label:"Đối soát dòng tiền\nvới doanh thu", tag:"Chờ bổ sung", owner:"Kế toán Dòng tiền (Hạnh)",
      input:"Chưa có thông tin trong file nguồn",
      action:"Bảng phần hành ghi: quy trình đối soát. Chi tiết các bước chưa được cung cấp.",
      output:"Chưa xác định",
      control:"Cần Phòng Kế toán bổ sung",
      risk:"Không có điểm đối soát → chênh lệch ví không được phát hiện" },
    { id:"e", lane:1, col:3, type:"end", label:"Chờ\nban hành" }
  ],
  edges: [{from:"s",to:"j1"},{from:"j1",to:"j2"},{from:"j2",to:"e"}],
  raci: {
    roles: ["Kế toán Dòng tiền (Hạnh)", "Kế toán Doanh thu"],
    rows: [
      { task:"Ghi nhận dòng tiền thu các ví", v:["R/A","C"] },
      { task:"Đối soát dòng tiền", v:["R/A","C"] }
    ]
  },
  handoffs: [
    { from:"Kế toán Dòng tiền", to:"Kế toán Doanh thu", data:"Chưa xác định — cần bổ sung", when:"Chưa xác định" }
  ],
  controls: [
    "Quy trình chưa được ban hành — cần chị Hạnh mô tả các bước thực tế đang làm.",
    "Cần xác định rõ tần suất ghi nhận và mốc đối soát số dư ví.",
    "Cần xác định điểm nối với quy trình Theo dõi số dư & rút tiền sàn của Kế toán Doanh thu."
  ]
}
];


export { ORG, LANE, SOPS_NB };
