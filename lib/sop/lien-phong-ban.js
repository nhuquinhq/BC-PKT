/* ============================================================
   CHÉP TỪ REPO nhuquinhq/sop-pkt — assets/js/data-lienphong.js
   LANE dùng chung với bản nội bộ nên import sang thay vì chép đôi.
   ============================================================ */

import { LANE } from './noi-bo';

/* ============================================================
   HQ GROUP — SOP PHÒNG KẾ TOÁN | PHẦN B: SOP LIÊN PHÒNG BAN
   ============================================================ */

const SOPS_LP = [

/* ---------------- LP 1.0 — Đối soát doanh thu & giá vốn HQS10000 ---------------- */
{
  id: "doisoat-hqs10000",
  scope: "lp",
  code: "LP 1.0",
  name: "Đối soát doanh thu & giá vốn HQS10000",
  tagline: "Hàng ngày + chốt tháng",
  status: "Done",
  position: "Kế toán Doanh thu",
  partners: "Phòng Kinh doanh",
  use: "Đối soát toàn bộ doanh thu thực nhận và giá vốn của HQS10000 từ 10 file sao kê, phân loại doanh thu Flip và Dịch vụ.",
  meaning: "Đây là quy trình xương sống của báo cáo lợi nhuận HQS10000. Doanh thu chỉ được ghi nhận khi tiền thực tế đã vào ví, và mỗi đơn hàng phải gắn được giá vốn thì lợi nhuận theo BU mới phản ánh đúng thực tế.",
  owner: "Kế toán Doanh thu — chị Ninh",
  trigger: "Có dữ liệu sao kê mới trong ngày; chốt tổng hợp cuối tháng.",
  cycle: "Hàng ngày và chốt tổng hợp theo tháng.",
  systems: "10 file sao kê Dev · BE · Google Sheet TH · Bảng tỷ giá tuần",
  lanes: [LANE.dt, LANE.kho, LANE.pkd],
  nodes: [
    { id:"s", lane:0, col:0, type:"start", label:"Có dữ liệu\nsao kê mới" },
    { id:"a1", lane:0, col:1, type:"task", label:"Thu thập dữ liệu\nsao kê", tag:"Bước 1", owner:"KT Doanh thu",
      input:"10 file sao kê Dev (08 file tự động cào, 02 file Zeusx & Funpay tải từ BE)",
      action:"Lấy dữ liệu thô từ 10 file sao kê Dev về Google Sheet. Với Zeusx và Funpay thì tải trực tiếp từ BE và cập nhật vào file. Kiểm tra dữ liệu sau khi nhận để đảm bảo không thiếu và không lỗi khi cào.",
      output:"Dữ liệu sao kê thô đầy đủ 10 nguồn",
      control:"Kiểm tra đủ 10 nguồn, phát hiện lỗi cào dữ liệu ngay",
      risk:"Thiếu file → doanh thu ghi nhận sót, phát hiện muộn ở kỳ chốt tháng" },
    { id:"a2", lane:0, col:2, type:"task", label:"Chuẩn hoá\n+ quy đổi tỷ giá", tag:"Bước 2", owner:"KT Doanh thu",
      input:"Dữ liệu sao kê thô, bảng tỷ giá tuần của Kế toán",
      action:"Lọc dữ liệu theo ngày/tuần báo cáo, lấy tỷ giá tuần và quy đổi toàn bộ khoản thu ngoại tệ về USD. Kiểm tra các trường hợp sai tỷ giá, thiếu tỷ giá hoặc sai ngày ghi nhận.",
      output:"Dữ liệu đã quy đổi về USD",
      control:"Tỷ giá phải đúng tuần của giao dịch",
      risk:"Sai tỷ giá → sai doanh thu toàn tuần" },
    { id:"a3", lane:0, col:3, type:"task", label:"Tổng hợp\ndữ liệu các ví", tag:"Bước 3", owner:"KT Doanh thu",
      input:"Dữ liệu từng ví/sàn đã quy đổi",
      action:"Chuẩn hoá và tổng hợp về một file chung gồm: tên sàn, ID sàn, trạng thái giao dịch, số tiền (USD), ngày tiền về ví và các thông tin định danh đơn hàng cần để đối chiếu.",
      output:"File tổng hợp ví",
      control:"Đủ trường định danh để đối chiếu ngược về đơn hàng",
      risk:"Thiếu ID đơn → không gắn được giá vốn về sau" },
    { id:"a4", lane:0, col:4, type:"task", label:"Xác định doanh thu\nthực nhận", tag:"Bước 4", owner:"KT Doanh thu",
      input:"File tổng hợp ví, tỷ giá tuần, danh mục trạng thái hợp lệ",
      action:"Tại sheet TH, lọc theo tuần báo cáo, quy đổi doanh thu về VND. Chỉ ghi nhận giao dịch có trạng thái thể hiện tiền thực tế đã hoàn tất và vào ví: SaleIncome, G2G Sell Order, SELL, MANUAL_BALANCE_INCREASE, Completed, Orders seller reward, Sales Proceeds, cộng tiền, income, Earning, CONFIRMED, Order settlement.",
      output:"Doanh thu thực nhận theo tuần (VND)",
      control:"Giao dịch ngoài danh mục trạng thái đưa vào danh sách kiểm tra riêng",
      risk:"Ghi nhận trạng thái chưa hoàn tất → doanh thu ảo" },
    { id:"a5", lane:0, col:5, type:"task", label:"Xác định giá vốn\ntheo SKU & kho", tag:"Bước 5", owner:"KT Doanh thu",
      input:"Dữ liệu BE từ T12/2025 đến tháng báo cáo +1, dữ liệu kho",
      action:"Copy dữ liệu BE đủ dải thời gian, tìm SKU tương ứng từng đơn, đối chiếu SKU với dữ liệu kho để xác định giá vốn theo SKU và kho. Giá vốn ngoại tệ quy đổi theo tỷ giá từng tuần từ T05/2026.",
      output:"Đơn hàng đã gắn giá vốn",
      control:"Đủ dải dữ liệu BE để không sót đơn cũ",
      risk:"Dải dữ liệu ngắn → nhiều đơn không tìm thấy giá vốn" },
    { id:"a6", lane:0, col:6, type:"task", label:"Phân loại doanh thu\nFlip / Dịch vụ", tag:"Bước 6", owner:"KT Doanh thu",
      input:"Đơn hàng đã gắn giá vốn, các link BE/kho liên quan",
      action:"Tại file TH, đối chiếu giá vốn từ toàn bộ link BE/kho, xác định nguồn phát sinh của từng đơn và phân loại doanh thu thành Doanh thu Flip hoặc Doanh thu Dịch vụ.",
      output:"Doanh thu đã phân loại",
      control:"Mỗi đơn phải xác định đúng doanh thu, SKU và giá vốn trước khi vào báo cáo",
      risk:"Phân loại sai → sai cơ cấu doanh thu theo mô hình kinh doanh" },
    { id:"g1", lane:0, col:7, type:"gateway", label:"Có\ngiá vốn?", owner:"KT Doanh thu",
      input:"Kết quả đối chiếu giá vốn",
      action:"Tách các đơn chưa xác định được giá vốn ra xử lý riêng.",
      output:"Có → tổng hợp báo cáo; Chưa có → chuyển sang luồng bổ sung",
      control:"Danh sách đơn thiếu giá vốn lập thành file riêng",
      risk:"Bỏ qua đơn thiếu giá vốn → lợi nhuận bị thổi phồng" },
    { id:"a7", lane:1, col:8, type:"task", label:"Huyền chuyển\ndanh sách cho PKD", tag:"Bước 7", owner:"Kế toán Kho (Huyền)",
      input:"File đơn chưa tìm được giá vốn",
      action:"Nhận danh sách từ Ninh và chuyển/đối chiếu với Phòng Kinh doanh.",
      output:"Danh sách đã gửi PKD",
      control:"Chuyển đúng đầu mối từng BU",
      risk:"Gửi sai đầu mối → không ai xử lý, đơn tồn kéo dài" },
    { id:"a8", lane:2, col:9, type:"task", label:"PKD kiểm tra\n+ bổ sung giá vốn", tag:"Bước 7", owner:"Phòng Kinh doanh",
      input:"Danh sách đơn thiếu giá vốn/SKU/kho",
      action:"PKD kiểm tra và bổ sung thông tin giá vốn, SKU, kho cho các đơn thuộc phạm vi phụ trách.",
      output:"Thông tin giá vốn được bổ sung",
      control:"Đơn chưa bổ sung được phải ghi rõ lý do",
      risk:"Không phản hồi → đơn tiếp tục treo sang kỳ sau" },
    { id:"a9", lane:0, col:10, type:"task", label:"Ninh cập nhật lại\ndữ liệu giá vốn", tag:"Bước 7", owner:"KT Doanh thu (Ninh)",
      input:"Thông tin PKD xác nhận",
      action:"Cập nhật lại dữ liệu giá vốn vào file tổng hợp. Đơn chưa có phản hồi tiếp tục theo dõi ở kỳ tiếp theo.",
      output:"File tổng hợp đã cập nhật",
      control:"Chỉ cập nhật khi có xác nhận từ PKD",
      risk:"Cập nhật không căn cứ → sai giá vốn, sai lợi nhuận BU" },
    { id:"a10", lane:0, col:11, type:"task", label:"Xử lý\ntrường hợp ngoại lệ", tag:"Bước 8", owner:"KT Doanh thu",
      input:"Danh sách đơn bất thường",
      action:"Đơn CO = 0 nhưng có SKU: vẫn ghi nhận doanh thu nếu đáp ứng điều kiện ghi nhận. Đơn không tìm thấy trên BE: loại khỏi doanh thu tháng của Team và đưa vào danh sách theo dõi riêng. Các bất thường khác phải đánh dấu và kiểm tra trước khi chốt.",
      output:"Danh sách ngoại lệ đã xử lý",
      control:"Mọi ngoại lệ phải được đánh dấu trước khi chốt báo cáo",
      risk:"Ngoại lệ trộn vào số chính → không truy được nguyên nhân lệch" },
    { id:"a11", lane:0, col:12, type:"task", label:"Tổng hợp\nbáo cáo tháng", tag:"Bước 9", owner:"KT Doanh thu",
      input:"Dữ liệu doanh thu và giá vốn hoàn chỉnh",
      action:"Đưa dữ liệu sang Báo cáo tổng tháng, báo cáo chi tiết theo: ngày, BU, sàn, loại doanh thu, doanh thu, giá vốn, lợi nhuận. Kết thúc tháng: copy cố định dữ liệu phần ví của tháng đã chốt và bổ sung ký tự đặc biệt vào ID đơn hàng theo quy ước để tránh trùng ID.",
      output:"Báo cáo doanh thu — giá vốn — lợi nhuận tháng",
      control:"Copy cố định dữ liệu ví sau khi chốt tháng",
      risk:"Không cố định dữ liệu → số tháng cũ thay đổi khi cào lại" },
    { id:"e", lane:0, col:13, type:"end", label:"Chốt\nbáo cáo tháng" }
  ],
  edges: [
    {from:"s",to:"a1"},{from:"a1",to:"a2"},{from:"a2",to:"a3"},{from:"a3",to:"a4"},{from:"a4",to:"a5"},
    {from:"a5",to:"a6"},{from:"a6",to:"g1"},
    {from:"g1",to:"a10",label:"Có"},{from:"g1",to:"a7",label:"Chưa có"},
    {from:"a7",to:"a8"},{from:"a8",to:"a9"},{from:"a9",to:"a10"},{from:"a10",to:"a11"},{from:"a11",to:"e"}
  ],
  raci: {
    roles: ["Kế toán Doanh thu (Ninh)", "Kế toán Kho (Huyền)", "Phòng Kinh doanh / BU"],
    rows: [
      { task:"Thu thập dữ liệu sao kê từ 10 nguồn", v:["R/A","-","-"] },
      { task:"Chuẩn hoá & quy đổi tỷ giá", v:["R/A","-","-"] },
      { task:"Tổng hợp dữ liệu các ví", v:["R/A","-","-"] },
      { task:"Xác định doanh thu thực nhận theo trạng thái hợp lệ", v:["R/A","C","I"] },
      { task:"Xác định giá vốn theo SKU và kho", v:["R/A","C","-"] },
      { task:"Phân loại doanh thu Flip / Dịch vụ", v:["R/A","C","C"] },
      { task:"Chuyển danh sách đơn thiếu giá vốn cho PKD", v:["C","R/A","I"] },
      { task:"Kiểm tra & bổ sung giá vốn", v:["C","C","R/A"] },
      { task:"Cập nhật lại dữ liệu giá vốn", v:["R/A","C","I"] },
      { task:"Xử lý trường hợp ngoại lệ", v:["R/A","C","C"] },
      { task:"Tổng hợp báo cáo tháng", v:["R/A","I","I"] }
    ]
  },
  handoffs: [
    { from:"Kế toán Doanh thu", to:"Kế toán Kho", data:"File đơn chưa xác định được giá vốn", when:"Trong kỳ đối soát" },
    { from:"Kế toán Kho", to:"Phòng Kinh doanh", data:"Danh sách đơn cần bổ sung giá vốn/SKU/kho", when:"Trong kỳ đối soát" },
    { from:"Phòng Kinh doanh", to:"Kế toán Doanh thu", data:"Giá vốn/SKU/kho đã bổ sung", when:"Theo thời hạn quy định" },
    { from:"Kế toán Doanh thu", to:"Kế toán Tài chính", data:"Báo cáo doanh thu — giá vốn — lợi nhuận tháng", when:"Sau khi chốt tháng" }
  ],
  controls: [
    "Chỉ ghi nhận doanh thu khi trạng thái giao dịch thể hiện tiền thực tế đã vào ví.",
    "Đơn không tìm thấy trên BE bị loại khỏi doanh thu tháng của Team, đưa vào danh sách theo dõi riêng.",
    "Sau khi chốt tháng phải copy cố định dữ liệu ví và thêm ký tự đặc biệt vào ID đơn để tránh trùng."
  ]
},

/* ---------------- LP 2.0 — Duyệt thanh toán hàng hoá (trực tiếp) ---------------- */
{
  id: "duyet-tt-tructiep",
  scope: "lp",
  code: "LP 2.0",
  name: "Duyệt thanh toán hàng hoá — Thanh toán trực tiếp",
  tagline: "Khi phát sinh ĐNTT",
  status: "Done",
  position: "Kế toán thanh toán × Kế toán Kho",
  partners: "PCU · Phòng Kinh doanh",
  use: "Kiểm tra và duyệt thanh toán cho các khoản mua hàng thanh toán trực tiếp cho nhà cung cấp.",
  meaning: "Đây là gate kiểm soát tiền ra lớn nhất của công ty. Mỗi đồng chi ra phải truy được về một đơn hàng có thật, đã nhập kho và có xác nhận của nhà cung cấp.",
  owner: "Kế toán thanh toán — phối hợp Kế toán Kho",
  trigger: "Bộ phận đề nghị gửi Đề nghị thanh toán (ĐNTT).",
  cycle: "Thực hiện khi phát sinh ĐNTT.",
  systems: "Sổ nhập kho · BE · HubPay",
  lanes: [LANE.dnghi, LANE.kho, LANE.ktt],
  nodes: [
    { id:"s", lane:0, col:0, type:"start", label:"Phát sinh\nnhu cầu TT" },
    { id:"b0", lane:0, col:1, type:"task", label:"Gửi Đề nghị\nthanh toán (ĐNTT)", tag:"Đầu vào", owner:"Bộ phận đề nghị",
      input:"Đơn mua hàng, thông tin NCC",
      action:"Lập và gửi ĐNTT kèm thông tin đơn hàng cho Phòng Kế toán.",
      output:"ĐNTT",
      control:"ĐNTT phải có đủ thông tin đơn hàng và NCC",
      risk:"ĐNTT thiếu thông tin → kế toán trả lại, chậm thanh toán NCC" },
    { id:"b1", lane:1, col:2, type:"task", label:"Tiếp nhận & đối chiếu\nvới Sổ nhập kho", tag:"Bước 1", owner:"Kế toán Kho",
      input:"ĐNTT, Sổ nhập kho",
      action:"Đối chiếu ĐNTT với Sổ nhập kho, kiểm tra đủ 11 thông tin: ngày nhập, tên game, mã sản phẩm, số lượng, đơn giá, thành tiền, NCC, mã đơn mua NCC, ID đơn hàng, trạng thái đơn hàng, ID HubPay. Kiểm tra tính đầy đủ và hợp lý của số lượng, đơn giá, thành tiền.",
      output:"Kết quả đối chiếu ĐNTT ↔ Sổ nhập",
      control:"Đủ 11 trường thông tin mới xử lý tiếp",
      risk:"Thiếu ID HubPay hoặc mã đơn NCC → không truy xuất được giao dịch" },
    { id:"b2", lane:1, col:3, type:"task", label:"Đối chiếu đơn hàng\ntrên hệ thống BE", tag:"Bước 2", owner:"Kế toán Kho",
      input:"Danh sách đơn trong ĐNTT, dữ liệu BE",
      action:"Kiểm tra đơn hàng tồn tại trong danh sách đơn tạo mới và danh sách đơn hoàn tất trên BE. Đối chiếu ID đơn hàng, sản phẩm, số lượng và trạng thái.",
      output:"Xác nhận đơn hàng tồn tại và đúng trạng thái",
      control:"Đơn không tìm thấy hoặc sai trạng thái phải kiểm tra lại trước khi thanh toán",
      risk:"Thanh toán cho đơn không tồn tại trên BE → thất thoát" },
    { id:"b3", lane:1, col:4, type:"task", label:"Đối chiếu\nhàng hoá & NCC", tag:"Bước 3", owner:"Kế toán Kho",
      input:"ĐNTT, Sổ nhập kho, thông tin NCC",
      action:"Đối chiếu thông tin hàng hoá với Sổ nhập kho, đối chiếu NCC và mã đơn mua NCC, kiểm tra sản phẩm, số lượng và đơn giá phù hợp giao dịch thực tế.",
      output:"Xác nhận hàng hoá có căn cứ nhập kho",
      control:"Hàng hoá phải truy xuất được nguồn gốc giao dịch",
      risk:"Không truy được nguồn gốc → rủi ro chi khống" },
    { id:"b4", lane:2, col:5, type:"task", label:"Đối chiếu\nsố tiền thanh toán", tag:"Bước 4", owner:"Kế toán thanh toán",
      input:"ĐNTT, ID HubPay",
      action:"Kiểm tra thành tiền = số lượng × đơn giá, đối chiếu số tiền đề nghị với giao dịch thực tế, kiểm tra ID HubPay để đảm bảo khoản chi truy xuất được.",
      output:"Số tiền thanh toán đã xác nhận",
      control:"Chênh lệch tiền/thiếu thông tin phải xử lý trước khi duyệt",
      risk:"Chi sai số tiền → khó thu hồi từ NCC" },
    { id:"g1", lane:2, col:6, type:"gateway", label:"Đủ 5 điều\nkiện?", owner:"Kế toán thanh toán",
      input:"Kết quả đối chiếu các bước trên",
      action:"Xác nhận đủ 5 điều kiện: ĐNTT khớp Sổ nhập kho; đơn hàng tồn tại và phù hợp BE; hàng hoá, NCC và mã đơn mua truy xuất được; số lượng, đơn giá, thành tiền hợp lý; số tiền phù hợp giao dịch thực tế.",
      output:"Đủ → duyệt thanh toán; Thiếu → trả lại xử lý",
      control:"Thiếu bất kỳ điều kiện nào đều không được duyệt",
      risk:"Duyệt khi chưa đủ điều kiện → mất quyền kiểm soát chi" },
    { id:"b5", lane:2, col:7, type:"task", label:"Duyệt\nthanh toán", tag:"Bước 6", owner:"Phòng Kế toán",
      input:"Hồ sơ đã đối chiếu đủ điều kiện",
      action:"Thực hiện duyệt thanh toán và lưu lại căn cứ, thông tin thanh toán để phục vụ đối chiếu, kiểm tra và truy xuất sau này.",
      output:"ĐNTT đã duyệt + hồ sơ lưu",
      control:"Lưu đủ căn cứ duyệt cho mỗi khoản chi",
      risk:"Không lưu căn cứ → không giải trình được khi kiểm tra" },
    { id:"e", lane:2, col:8, type:"end", label:"Chuyển\nthanh toán" }
  ],
  edges: [
    {from:"s",to:"b0"},{from:"b0",to:"b1"},{from:"b1",to:"b2"},{from:"b2",to:"b3"},{from:"b3",to:"b4"},{from:"b4",to:"g1"},
    {from:"g1",to:"b5",label:"Đủ"},{from:"g1",to:"b0",label:"Thiếu / sai lệch",type:"back"},
    {from:"b5",to:"e"}
  ],
  raci: {
    roles: ["Bộ phận đề nghị (PCU/PKD)", "Kế toán Kho (Huyền)", "Kế toán thanh toán", "Phòng Kế toán"],
    rows: [
      { task:"Lập và gửi ĐNTT", v:["R/A","I","I","-"] },
      { task:"Đối chiếu ĐNTT với Sổ nhập kho", v:["C","R/A","C","-"] },
      { task:"Đối chiếu đơn hàng trên BE", v:["C","R/A","C","-"] },
      { task:"Đối chiếu hàng hoá và NCC", v:["C","R/A","C","-"] },
      { task:"Đối chiếu số tiền thanh toán", v:["I","C","R/A","-"] },
      { task:"Xác nhận đủ 5 điều kiện thanh toán", v:["I","C","R","A"] },
      { task:"Duyệt thanh toán & lưu căn cứ", v:["I","I","R","A"] }
    ]
  },
  handoffs: [
    { from:"PCU / PKD", to:"Phòng Kế toán", data:"ĐNTT kèm thông tin đơn hàng và NCC", when:"Khi phát sinh nhu cầu" },
    { from:"Kế toán Kho", to:"Kế toán thanh toán", data:"Kết quả đối chiếu Sổ nhập kho, BE, NCC", when:"Trước khi duyệt" },
    { from:"Phòng Kế toán", to:"Bộ phận đề nghị", data:"Kết quả duyệt hoặc yêu cầu bổ sung", when:"Sau đối chiếu" }
  ],
  controls: [
    "Chỉ duyệt thanh toán khi đủ đồng thời 5 điều kiện đối chiếu.",
    "Sổ nhập kho phải đủ 11 trường thông tin, trong đó bắt buộc có ID HubPay và mã đơn mua NCC.",
    "Mọi khoản đã duyệt phải lưu căn cứ để truy xuất khi kiểm tra."
  ]
},

/* ---------------- LP 3.0 — Duyệt thanh toán Topup / Tạm ứng ---------------- */
{
  id: "duyet-tt-tamung",
  scope: "lp",
  code: "LP 3.0",
  name: "Duyệt thanh toán — Topup ví & Tạm ứng",
  tagline: "Khi phát sinh ĐNTT tạm ứng",
  status: "Done",
  position: "Kế toán thanh toán × Kế toán Kho",
  partners: "PCU · Phòng Kinh doanh · BU",
  use: "Kiểm soát khoản tạm ứng và Topup tiền vào ví, đảm bảo không ứng trùng, ứng vượt và theo dõi được hoàn ứng theo từng BU.",
  meaning: "Tạm ứng là khoản tiền công ty giao trước khi có hàng. Nếu không kiểm soát được vòng Tạm ứng → Sử dụng → Hoàn ứng → Số dư theo từng BU thì tiền sẽ tồn đọng trong ví mà không ai chịu trách nhiệm.",
  owner: "Kế toán thanh toán — phối hợp Kế toán Kho",
  trigger: "Bộ phận đề nghị gửi ĐNTT tạm ứng/Topup ví.",
  cycle: "Thực hiện khi phát sinh ĐNTT tạm ứng.",
  systems: "File theo dõi tạm ứng – hoàn ứng · BE · HubPay · Ví các BU",
  lanes: [LANE.dnghi, LANE.ktt, LANE.bod],
  nodes: [
    { id:"s", lane:0, col:0, type:"start", label:"Phát sinh\nnhu cầu ứng" },
    { id:"c0", lane:0, col:1, type:"task", label:"Gửi ĐNTT\ntạm ứng", tag:"Bước 1", owner:"Bộ phận đề nghị",
      input:"Nhu cầu Topup ví, mục đích sử dụng",
      action:"Lập ĐNTT tạm ứng nêu rõ mục đích sử dụng và số tiền đề nghị Topup vào ví.",
      output:"ĐNTT tạm ứng",
      control:"Nêu rõ mục đích và BU sử dụng",
      risk:"Không rõ BU → không tách được dòng tiền khi ví dùng chung" },
    { id:"c1", lane:1, col:2, type:"task", label:"Kiểm tra tình trạng\ntạm ứng hiện tại", tag:"Bước 2", owner:"Kế toán thanh toán",
      input:"File theo dõi tạm ứng – hoàn ứng",
      action:"Trước khi duyệt khoản mới, kiểm tra 6 chỉ tiêu: số đã tạm ứng trước đó, số đã sử dụng, các đơn hàng đã dùng tiền ứng, số đã hoàn ứng, số dư tạm ứng còn lại, số tiền đề nghị ứng tiếp.",
      output:"Số tiền thực tế cần Topup",
      control:"Xác định đủ 6 chỉ tiêu trước khi duyệt",
      risk:"Bỏ qua → ứng trùng hoặc ứng vượt nhu cầu" },
    { id:"c2", lane:1, col:3, type:"task", label:"Đối chiếu File\ntạm ứng – hoàn ứng", tag:"Bước 3", owner:"Kế toán thanh toán",
      input:"ĐNTT, lịch sử Topup/sử dụng/hoàn ứng",
      action:"Đối chiếu ĐNTT với File theo dõi, kiểm tra lịch sử các lần Topup, sử dụng và hoàn ứng; xác định khoản còn treo và nguyên nhân. Với BU dùng chung ví phải xác định rõ khoản ứng thuộc BU nào.",
      output:"Bảng đối chiếu tạm ứng theo BU",
      control:"Ví dùng chung: Eris-VN tách theo từng BU; Gamota tách BU1 và BU4",
      risk:"Không tách BU → không quy được trách nhiệm khoản treo" },
    { id:"c3", lane:1, col:4, type:"task", label:"Kiểm tra căn cứ\nsử dụng tiền", tag:"Bước 4", owner:"Kế toán thanh toán",
      input:"Đơn hàng đã sử dụng tiền ứng, dữ liệu BE, số dư ví",
      action:"Đối chiếu đơn hàng đã sử dụng với dữ liệu BE (đơn tạo mới hoặc hoàn tất), đối chiếu số tiền sử dụng với giao dịch thực tế, kiểm tra và chụp số dư ví tại thời điểm kiểm tra. Theo dõi được luồng: Topup USD → Quy đổi VNĐ → Mua hàng → Số dư ví giảm → Hoàn ứng phần chưa sử dụng.",
      output:"Xác nhận căn cứ sử dụng tiền ứng",
      control:"Chụp số dư ví làm căn cứ đối chiếu",
      risk:"Không có ảnh số dư → không chứng minh được tại thời điểm kiểm tra" },
    { id:"g1", lane:1, col:5, type:"gateway", label:"Còn khoản\ntreo?", owner:"Kế toán thanh toán",
      input:"Kết quả đối chiếu tạm ứng",
      action:"Xác định còn khoản tạm ứng chưa giải trình/hoàn ứng hay không trước khi trình duyệt.",
      output:"Không treo → trình duyệt; Còn treo → yêu cầu giải trình",
      control:"Khoản treo phải được xác định trước khi tiếp tục ứng",
      risk:"Tiếp tục ứng khi còn treo → tiền tồn đọng nhiều kỳ" },
    { id:"c4", lane:2, col:6, type:"task", label:"Phê duyệt\nĐNTT tạm ứng", tag:"Bước 5", owner:"Cấp phê duyệt (CFO → CEO)",
      input:"Hồ sơ tạm ứng đã kiểm tra",
      action:"Thực hiện luồng phê duyệt ĐNTT tạm ứng theo quy định. Chỉ trình duyệt khi số đề nghị ứng có căn cứ và phù hợp nhu cầu sử dụng thực tế.",
      output:"ĐNTT đã phê duyệt",
      control:"Phê duyệt theo đúng cấp thẩm quyền",
      risk:"Duyệt vượt thẩm quyền → không hợp lệ về kiểm soát nội bộ" },
    { id:"c5", lane:1, col:7, type:"task", label:"Thực hiện Topup\n+ ghi ID HubPay", tag:"Bước 6", owner:"Kế toán thanh toán",
      input:"ĐNTT đã duyệt",
      action:"Thực hiện Topup tiền vào ví, kiểm tra số thực tế Topup so với số đã duyệt, ghi nhận giao dịch và ID HubPay vào File theo dõi, chụp số dư ví sau Topup.",
      output:"Giao dịch Topup hoàn tất + chứng từ",
      control:"Số Topup không được vượt số đã duyệt",
      risk:"Topup vượt duyệt → vượt ngân sách, khó quyết toán" },
    { id:"c6", lane:1, col:8, type:"task", label:"Cập nhật File\ntheo dõi tạm ứng", tag:"Bước 7", owner:"Kế toán thanh toán",
      input:"Giao dịch Topup",
      action:"Cập nhật đầy đủ: số tạm ứng mới, tổng lũy kế, số đã sử dụng, đơn hàng đã dùng tiền, số đã hoàn ứng, số dư còn lại, ID HubPay và thông tin giao dịch.",
      output:"File theo dõi phản ánh đủ vòng Tạm ứng → Sử dụng → Hoàn ứng → Số dư",
      control:"Cập nhật ngay sau mỗi lần Topup",
      risk:"Cập nhật muộn → kỳ sau kiểm tra sai tình trạng ứng" },
    { id:"c7", lane:1, col:9, type:"task", label:"Kiểm tra & chốt\ntạm ứng định kỳ", tag:"Bước 8", owner:"Kế toán thanh toán",
      input:"File theo dõi, số dư ví thực tế",
      action:"Định kỳ đối chiếu số dư tạm ứng trên File với số dư thực tế trên ví; rà khoản đã sử dụng chưa hoàn ứng và khoản hoàn ứng chưa cập nhật; lập danh sách khoản còn treo để theo dõi.",
      output:"Danh sách tạm ứng còn treo",
      control:"Không chỉ kiểm soát tổng số dư ví mà phải xác định số ứng, số đã dùng, số hoàn ứng và số dư còn lại theo từng BU",
      risk:"Chỉ nhìn tổng ví → không phát hiện được BU nào đang treo tiền" },
    { id:"e", lane:1, col:10, type:"end", label:"Chốt kỳ\ntạm ứng" }
  ],
  edges: [
    {from:"s",to:"c0"},{from:"c0",to:"c1"},{from:"c1",to:"c2"},{from:"c2",to:"c3"},{from:"c3",to:"g1"},
    {from:"g1",to:"c4",label:"Không treo"},{from:"g1",to:"c0",label:"Còn treo",type:"back"},
    {from:"c4",to:"c5"},{from:"c5",to:"c6"},{from:"c6",to:"c7"},{from:"c7",to:"e"}
  ],
  raci: {
    roles: ["Bộ phận đề nghị (PCU/PKD/BU)", "Kế toán thanh toán", "Kế toán Kho", "Cấp phê duyệt (CFO/CEO)"],
    rows: [
      { task:"Lập ĐNTT tạm ứng", v:["R/A","I","-","-"] },
      { task:"Kiểm tra tình trạng tạm ứng hiện tại", v:["C","R/A","C","-"] },
      { task:"Đối chiếu File tạm ứng – hoàn ứng theo BU", v:["C","R/A","C","-"] },
      { task:"Kiểm tra căn cứ sử dụng tiền trên BE", v:["C","R/A","C","-"] },
      { task:"Phê duyệt ĐNTT tạm ứng", v:["I","R","C","A"] },
      { task:"Thực hiện Topup vào ví", v:["I","R/A","-","I"] },
      { task:"Cập nhật File theo dõi tạm ứng", v:["I","R/A","C","-"] },
      { task:"Kiểm tra & chốt tạm ứng định kỳ", v:["C","R/A","C","I"] }
    ]
  },
  handoffs: [
    { from:"PCU / PKD / BU", to:"Kế toán thanh toán", data:"ĐNTT tạm ứng, mục đích và số tiền Topup", when:"Khi phát sinh nhu cầu" },
    { from:"Kế toán thanh toán", to:"Cấp phê duyệt", data:"Hồ sơ tạm ứng đã đối chiếu", when:"Sau khi kiểm tra" },
    { from:"Kế toán thanh toán", to:"BU sử dụng ví", data:"Xác nhận đã Topup + số dư ví sau Topup", when:"Ngay sau Topup" }
  ],
  controls: [
    "Không chỉ kiểm soát tổng số dư ví — phải xác định số ứng, số đã dùng, số hoàn ứng và số dư còn lại theo từng BU.",
    "Ví dùng chung: Eris-VN tách theo từng BU, Gamota tách BU1 và BU4.",
    "Còn khoản tạm ứng chưa giải trình/hoàn ứng thì phải xác định xong trước khi tiếp tục ứng."
  ]
},

/* ---------------- LP 4.0 — Bổ sung giá vốn ---------------- */
{
  id: "bosung-giavon",
  scope: "lp",
  code: "LP 4.0",
  name: "Bổ sung giá vốn vào các đơn hàng",
  tagline: "Thứ 2 & Thứ 5 hàng tuần",
  status: "Done",
  position: "Phòng Kế toán",
  partners: "Phòng Kinh doanh (các BU)",
  use: "Rà soát định kỳ các đơn hàng chưa có giá vốn và phối hợp với BU để bổ sung.",
  meaning: "Đơn thiếu giá vốn làm lợi nhuận báo cáo cao hơn thực tế. Chu kỳ rà soát 2 lần/tuần giúp xử lý dứt điểm trong kỳ thay vì dồn đến cuối tháng khi không còn ai nhớ đơn hàng đó.",
  owner: "Phòng Kế toán — phối hợp các BU thuộc PKD",
  trigger: "Đến lịch rà soát định kỳ Thứ 2 và Thứ 5.",
  cycle: "Thứ 2 và Thứ 5 hàng tuần.",
  systems: "File theo dõi giá vốn của PKT · Dữ liệu BE",
  notice: {
    title: "THÔNG BÁO — V/v Rà soát và bổ sung giá vốn các đơn hàng vào Thứ 2 & Thứ 5 hàng tuần",
    body: [
      "Để đảm bảo việc đối soát doanh thu – giá vốn được đầy đủ, kịp thời và chính xác, từ thời điểm hiện tại sẽ thực hiện rà soát định kỳ các đơn hàng chưa có giá vốn hoặc chưa được cập nhật đầy đủ giá vốn.",
      "1. Đối tượng thực hiện: Các bạn PKD có trách nhiệm kiểm tra và bổ sung giá vốn đối với các đơn hàng thuộc phạm vi phụ trách.",
      "2. Cách thức thực hiện: Hàng tuần, PKT tổng hợp danh sách các đơn hàng chưa có giá vốn trên file theo dõi. Thứ 2 và Thứ 5 hàng tuần, PKD chủ động vào file tổng hợp của PKT để kiểm tra các đơn thuộc team mình và bổ sung đầy đủ thông tin giá vốn của các đơn còn thiếu.",
      "Trường hợp đơn hàng chưa thể cập nhật giá vốn do chưa xác định được nguyên nhân hoặc đang chờ xử lý, cần ghi rõ lý do/trạng thái để PKT phối hợp kiểm tra.",
      "Mong các bạn PKD phối hợp thực hiện đầy đủ để file doanh thu – giá vốn được đồng bộ, hạn chế tối đa các đơn bị sót giá vốn và đảm bảo số liệu được cập nhật kịp thời."
    ],
    status: "Đã thông báo"
  },
  lanes: [LANE.kho, LANE.pkd],
  nodes: [
    { id:"s", lane:0, col:0, type:"start", label:"Đến lịch\nT2 / T5" },
    { id:"d1", lane:0, col:1, type:"task", label:"Tổng hợp danh sách\nđơn thiếu giá vốn", tag:"Bước 1", owner:"Phòng Kế toán",
      input:"Dữ liệu doanh thu đã kiểm tra",
      action:"Tổng hợp đơn chưa xác định được CO/giá vốn, phân loại 4 nhóm: đơn CO = 0 nhưng có SKU; đơn có SKU chưa xác định CO; đơn không tìm thấy dữ liệu giá vốn; đơn phát sinh chưa có thông tin kho/giá vốn. Loại bỏ đơn trùng hoặc đã cập nhật trước đó.",
      output:"Danh sách theo từng BU",
      control:"Loại đơn trùng trước khi gửi để tránh làm phiền BU",
      risk:"Gửi trùng → BU mất niềm tin, bỏ qua danh sách" },
    { id:"d2", lane:0, col:2, type:"task", label:"Gửi danh sách\ncho các BU", tag:"Bước 2", owner:"Phòng Kế toán",
      input:"Danh sách theo BU",
      action:"Gửi danh sách vào Thứ 2 và Thứ 5, thể hiện tối thiểu: BU, ngày đơn, sàn, ID đơn hàng, SKU/mã sản phẩm, tên sản phẩm, số lượng, CO hiện tại, nội dung cần bổ sung/xác nhận.",
      output:"Danh sách đã gửi BU",
      control:"Đủ 9 trường thông tin trong danh sách gửi",
      risk:"Thiếu trường → BU không đủ dữ kiện để tra cứu" },
    { id:"d3", lane:1, col:3, type:"task", label:"BU kiểm tra\n+ bổ sung giá vốn", tag:"Bước 3", owner:"Phòng Kinh doanh / BU",
      input:"Danh sách đơn cần bổ sung",
      action:"BU đối chiếu đơn hàng với dữ liệu thực tế, xác định CO/giá vốn cho từng đơn và bổ sung vào file được Kế toán cung cấp. Đơn chưa xác định được CO phải ghi rõ nguyên nhân và tình trạng xử lý. Không tự ý thay đổi thông tin khác ngoài phần được yêu cầu.",
      output:"CO/giá vốn đã bổ sung",
      control:"Không sửa thông tin ngoài phạm vi yêu cầu",
      risk:"Sửa dữ liệu khác → sai lệch dữ liệu gốc của Kế toán" },
    { id:"d4", lane:1, col:4, type:"task", label:"BU hoàn tất\n+ phản hồi", tag:"Bước 4", owner:"Phòng Kinh doanh / BU",
      input:"File đã bổ sung",
      action:"Hoàn tất bổ sung theo thời hạn quy định, kiểm tra lại danh sách trước khi phản hồi. Đơn chưa bổ sung được phải ghi rõ lý do.",
      output:"Phản hồi chính thức từ BU",
      control:"Phản hồi trong hạn của kỳ rà soát",
      risk:"Phản hồi muộn → đơn chuyển sang danh sách tồn giá vốn" },
    { id:"d5", lane:0, col:5, type:"task", label:"Kế toán kiểm tra\ndữ liệu BU", tag:"Bước 5", owner:"Phòng Kế toán",
      input:"Dữ liệu BU cập nhật",
      action:"Đối chiếu CO được bổ sung với ID đơn hàng, SKU và số lượng. Phân loại: CO đầy đủ; CO không hợp lệ hoặc không khớp đơn; CO vẫn bằng 0; đơn chưa được BU xử lý; đơn cần BU giải trình thêm.",
      output:"Kết quả kiểm tra dữ liệu BU",
      control:"Dữ liệu chưa phù hợp phải trả lại BU",
      risk:"Nhận CO sai → cập nhật sai giá vốn vào báo cáo" },
    { id:"g1", lane:0, col:6, type:"gateway", label:"CO\nhợp lệ?", owner:"Phòng Kế toán",
      input:"Kết quả kiểm tra",
      action:"Xác định CO đủ điều kiện cập nhật hay phải trả lại BU.",
      output:"Hợp lệ → cập nhật; Không hợp lệ → trả lại BU",
      control:"Không cập nhật CO chưa có căn cứ xác nhận",
      risk:"Cập nhật CO không hợp lệ → sai số liệu kế toán" },
    { id:"d6", lane:0, col:7, type:"task", label:"Cập nhật giá vốn\nvào dữ liệu doanh thu", tag:"Bước 6", owner:"Phòng Kế toán",
      input:"CO đã xác nhận hợp lệ",
      action:"Cập nhật giá vốn vào dữ liệu doanh thu, gắn đúng theo ID đơn hàng/SKU/BU. Đơn nhiều SKU phải phân bổ đúng giá vốn theo từng SKU.",
      output:"Dữ liệu doanh thu đã có giá vốn",
      control:"Gắn đúng ID đơn hàng / SKU / BU",
      risk:"Gắn sai BU → sai lợi nhuận từng đơn vị kinh doanh" },
    { id:"d7", lane:0, col:8, type:"task", label:"Chốt dữ liệu\ngiá vốn", tag:"Bước 7", owner:"Phòng Kế toán",
      input:"Dữ liệu đã cập nhật",
      action:"Tổng hợp danh sách đơn đã bổ sung CO, đối chiếu số đơn chưa có CO trước và sau khi BU cập nhật, phân loại: đã bổ sung → hoàn tất; chưa bổ sung → theo dõi tiếp; không xác định được → ghi nhận nguyên nhân. Cập nhật trạng thái để tránh gửi trùng kỳ sau.",
      output:"Danh sách tồn giá vốn của kỳ",
      control:"Cập nhật trạng thái xử lý sau mỗi kỳ",
      risk:"Không cập nhật trạng thái → gửi trùng, BU phản ứng" },
    { id:"d8", lane:0, col:9, type:"task", label:"Tổng hợp\nbáo cáo", tag:"Bước 8", owner:"Phòng Kế toán",
      input:"Dữ liệu đã chốt",
      action:"Tổng hợp Doanh thu → Giá vốn → Lợi nhuận theo ngày/tuần, BU, sàn, loại doanh thu và trạng thái đơn hàng. Đơn chưa xác định CO sau thời hạn đưa vào danh sách tồn giá vốn để tiếp tục theo dõi ở kỳ T2/T5 tiếp theo.",
      output:"Báo cáo kỳ + danh sách tồn giá vốn",
      control:"Danh sách tồn được chuyển tiếp sang kỳ sau",
      risk:"Không chuyển tiếp → đơn tồn bị lãng quên" },
    { id:"e", lane:0, col:10, type:"end", label:"Chốt kỳ\nrà soát" }
  ],
  edges: [
    {from:"s",to:"d1"},{from:"d1",to:"d2"},{from:"d2",to:"d3"},{from:"d3",to:"d4"},{from:"d4",to:"d5"},{from:"d5",to:"g1"},
    {from:"g1",to:"d6",label:"Hợp lệ"},{from:"g1",to:"d3",label:"Không hợp lệ",type:"back"},
    {from:"d6",to:"d7"},{from:"d7",to:"d8"},{from:"d8",to:"e"}
  ],
  raci: {
    roles: ["Phòng Kế toán", "Phòng Kinh doanh / BU", "Kế toán Doanh thu"],
    rows: [
      { task:"Tổng hợp danh sách đơn thiếu giá vốn", v:["R/A","I","C"] },
      { task:"Gửi danh sách cho các BU (T2 & T5)", v:["R/A","I","C"] },
      { task:"Kiểm tra & bổ sung CO/giá vốn", v:["C","R/A","-"] },
      { task:"Hoàn tất & phản hồi dữ liệu", v:["C","R/A","-"] },
      { task:"Kiểm tra dữ liệu BU bổ sung", v:["R/A","C","C"] },
      { task:"Cập nhật giá vốn vào dữ liệu doanh thu", v:["R/A","I","R"] },
      { task:"Chốt dữ liệu giá vốn & cập nhật trạng thái", v:["R/A","I","C"] },
      { task:"Tổng hợp báo cáo Doanh thu – Giá vốn – Lợi nhuận", v:["R/A","I","R"] }
    ]
  },
  handoffs: [
    { from:"Phòng Kế toán", to:"Phòng Kinh doanh / BU", data:"Danh sách đơn thiếu giá vốn (9 trường thông tin)", when:"Thứ 2 & Thứ 5 hàng tuần" },
    { from:"Phòng Kinh doanh / BU", to:"Phòng Kế toán", data:"CO/giá vốn đã bổ sung hoặc lý do chưa bổ sung", when:"Theo thời hạn quy định của kỳ" }
  ],
  controls: [
    "BU không tự ý thay đổi thông tin đơn hàng ngoài phần được yêu cầu bổ sung.",
    "Không cập nhật giá vốn cho đơn chưa có căn cứ xác nhận từ BU.",
    "Đơn chưa xác định CO sau thời hạn chuyển vào danh sách tồn giá vốn, theo dõi tiếp ở kỳ T2/T5 sau."
  ]
},

/* ---------------- LP 5.0 — Kiểm kê kho & công nợ NCC ---------------- */
{
  id: "kiemke-congno",
  scope: "lp",
  code: "LP 5.0",
  name: "Kiểm kê kho & đối chiếu công nợ NCC",
  tagline: "Cuối tháng",
  status: "Done",
  position: "Kế toán Kho",
  partners: "PCU · Phòng Kinh doanh · Nhà cung cấp",
  use: "Kiểm kê tồn kho thực tế, xử lý chênh lệch và đối chiếu công nợ phải trả nhà cung cấp cuối tháng.",
  meaning: "Kiểm kê là lần duy nhất trong tháng đối chiếu được số trên sổ với hàng thật. Chênh lệch không xử lý sẽ tích luỹ qua các kỳ và làm sai cả giá vốn lẫn công nợ phải trả.",
  owner: "Kế toán Kho — chị Huyền",
  trigger: "Kết thúc tháng.",
  cycle: "Hàng tháng — thực hiện vào cuối tháng.",
  systems: "Sổ kho · Misa · Dữ liệu NCC · Dữ liệu NCC Flip",
  lanes: [LANE.kho, LANE.pcu, LANE.ncc],
  nodes: [
    { id:"s", lane:0, col:0, type:"start", label:"Cuối tháng" },
    { id:"e1", lane:0, col:1, type:"task", label:"Chốt dữ liệu kho\ncuối tháng", tag:"Bước 1", owner:"Kế toán Kho",
      input:"Dữ liệu nhập – xuất kho trong kỳ",
      action:"Phối hợp các bộ phận chốt dữ liệu nhập – xuất kho đến thời điểm cuối tháng, thu thập số liệu tồn kho trên sổ/hệ thống. Kho có tồn thực tế phải xác nhận số lượng tại thời điểm chốt, lưu hình ảnh/chứng từ khi cần.",
      output:"Số liệu tồn kho trên sổ tại thời điểm chốt",
      control:"Có xác nhận số lượng tồn tại thời điểm chốt",
      risk:"Chốt số khi còn nghiệp vụ chưa ghi nhận → chênh lệch giả" },
    { id:"e2", lane:1, col:2, type:"task", label:"Kiểm kê\ntồn kho thực tế", tag:"Bước 2", owner:"PCU / bộ phận giữ kho",
      input:"Danh mục kho, SKU, sản phẩm",
      action:"Đối chiếu tồn thực tế với tồn trên sổ kho/hệ thống theo từng kho, SKU, tên sản phẩm và số lượng. Xác định chênh lệch.",
      output:"Bảng kiểm kê tồn thực tế + chênh lệch",
      control:"Kiểm theo từng kho và từng SKU, không kiểm gộp",
      risk:"Kiểm gộp → không xác định được SKU nào lệch" },
    { id:"e3", lane:0, col:3, type:"task", label:"Đối chiếu\nnhập – xuất", tag:"Bước 3", owner:"Kế toán Kho",
      input:"Phát sinh nhập kho và xuất kho trong kỳ",
      action:"Kiểm tra toàn bộ phát sinh nhập/xuất, đối chiếu với tồn cuối kỳ; rà 6 trường hợp: tồn âm, nhập thiếu, xuất sai, SKU sai, đơn chưa ghi nhận nhập/xuất, ghi nhận trùng hoặc sai số lượng.",
      output:"Danh sách nghiệp vụ bất thường",
      control:"Rà đủ 6 nhóm trường hợp",
      risk:"Bỏ sót tồn âm → sai giá vốn xuất kho" },
    { id:"e4", lane:0, col:4, type:"task", label:"Xác định nguyên nhân\nchênh lệch", tag:"Bước 4", owner:"Kế toán Kho",
      input:"Bảng chênh lệch",
      action:"Phân loại nguyên nhân: thiếu hàng (thực tế < hệ thống), thừa hàng (thực tế > hệ thống), tồn âm, nhập thiếu, xuất sai, SKU sai.",
      output:"Bảng phân loại nguyên nhân",
      control:"Mỗi chênh lệch phải quy được về một nhóm nguyên nhân",
      risk:"Không phân loại → không xử lý dứt điểm, lặp lại kỳ sau" },
    { id:"e5", lane:1, col:5, type:"task", label:"Bộ phận kho kiểm tra\n+ bổ sung chứng từ", tag:"Bước 5", owner:"PCU / bộ phận kho",
      input:"Danh sách chênh lệch",
      action:"Kiểm tra danh sách chênh lệch, bổ sung chứng từ/dữ liệu còn thiếu.",
      output:"Chứng từ bổ sung",
      control:"Phản hồi trong kỳ chốt sổ",
      risk:"Chậm phản hồi → không chốt được số liệu tháng" },
    { id:"e6", lane:0, col:6, type:"task", label:"Điều chỉnh\nsố liệu kho", tag:"Bước 5", owner:"Kế toán Kho",
      input:"Chứng từ bổ sung",
      action:"Điều chỉnh lại nhập – xuất – tồn với các trường hợp đã xác định nguyên nhân. Trường hợp không xác định được nguyên nhân ghi nhận riêng để xử lý theo quy định.",
      output:"Số liệu kho đã điều chỉnh",
      control:"Trường hợp không rõ nguyên nhân phải ghi nhận riêng",
      risk:"Điều chỉnh không căn cứ → mất dấu vết kiểm soát" },
    { id:"e7", lane:2, col:7, type:"task", label:"Đối chiếu công nợ\nNCC hàng hoá", tag:"Bước 6", owner:"Kế toán Kho × NCC",
      input:"Giao dịch nhập hàng theo từng NCC",
      action:"Tổng hợp giao dịch nhập hàng theo NCC, đối chiếu 7 trường: mã đơn mua NCC, ID đơn hàng, số lượng, đơn giá, thành tiền, số tiền đã thanh toán, số còn phải thanh toán. Xác định khoản công nợ còn treo hoặc chênh lệch.",
      output:"Bảng công nợ NCC hàng hoá",
      control:"Đối chiếu đủ 7 trường cho mỗi NCC",
      risk:"Đối chiếu thiếu → công nợ treo không phát hiện" },
    { id:"e8", lane:2, col:8, type:"task", label:"Đối chiếu công nợ\nNCC Flip", tag:"Bước 7", owner:"Kế toán Kho × NCC Flip",
      input:"Giao dịch với NCC Flip",
      action:"Tổng hợp riêng giao dịch NCC Flip, đối chiếu dữ liệu nhập kho với danh sách đơn hàng/đơn mua, kiểm tra số lượng đã nhận, giá trị hàng hoá và số đã thanh toán. Xác định: công nợ phải trả, khoản đã thanh toán, khoản còn phải trả, khoản chênh lệch/chưa xác định.",
      output:"Bảng công nợ NCC Flip",
      control:"NCC Flip theo dõi tách riêng do đặc thù thanh toán IDR",
      risk:"Gộp chung NCC Flip → không kiểm soát được dòng tiền IDR" },
    { id:"e9", lane:0, col:9, type:"task", label:"Xác nhận số liệu\ncuối tháng", tag:"Bước 8", owner:"Kế toán Kho",
      input:"Kết quả kiểm kê và đối chiếu công nợ",
      action:"Tổng hợp kết quả kiểm kê tồn kho và đối chiếu công nợ NCC, xác nhận tồn kho cuối tháng sau khi xử lý chênh lệch, xác nhận công nợ phải trả theo từng NCC và lập danh sách vấn đề chưa xử lý kèm người phụ trách.",
      output:"Tồn kho và công nợ NCC đã xác nhận + danh sách tồn đọng",
      control:"Danh sách chưa xử lý phải ghi rõ người/bộ phận phụ trách",
      risk:"Không gán người phụ trách → vấn đề tồn qua nhiều tháng" },
    { id:"e", lane:0, col:10, type:"end", label:"Chốt\nsố liệu tháng" }
  ],
  edges: [
    {from:"s",to:"e1"},{from:"e1",to:"e2"},{from:"e2",to:"e3"},{from:"e3",to:"e4"},{from:"e4",to:"e5"},
    {from:"e5",to:"e6"},{from:"e6",to:"e7"},{from:"e7",to:"e8"},{from:"e8",to:"e9"},{from:"e9",to:"e"}
  ],
  raci: {
    roles: ["Kế toán Kho (Huyền)", "PCU / bộ phận kho", "Phòng Kinh doanh", "Nhà cung cấp"],
    rows: [
      { task:"Chốt dữ liệu kho cuối tháng", v:["R/A","C","I","-"] },
      { task:"Kiểm kê tồn kho thực tế", v:["A","R","C","-"] },
      { task:"Đối chiếu dữ liệu nhập – xuất", v:["R/A","C","C","-"] },
      { task:"Xác định nguyên nhân chênh lệch", v:["R/A","C","C","-"] },
      { task:"Bổ sung chứng từ & điều chỉnh số liệu", v:["R/A","R","C","-"] },
      { task:"Đối chiếu công nợ NCC hàng hoá", v:["R/A","C","-","C"] },
      { task:"Đối chiếu công nợ NCC Flip", v:["R/A","C","C","C"] },
      { task:"Xác nhận số liệu cuối tháng", v:["R/A","C","I","I"] }
    ]
  },
  handoffs: [
    { from:"Kế toán Kho", to:"PCU / bộ phận kho", data:"Danh sách chênh lệch tồn kho cần kiểm tra", when:"Sau kiểm kê" },
    { from:"PCU", to:"Kế toán Kho", data:"Chứng từ bổ sung và giải trình chênh lệch", when:"Trong kỳ chốt sổ" },
    { from:"Kế toán Kho", to:"Nhà cung cấp", data:"Bảng đối chiếu công nợ theo đơn mua", when:"Cuối tháng" },
    { from:"Kế toán Kho", to:"Kế toán Tài chính", data:"Tồn kho và công nợ NCC đã xác nhận", when:"Sau khi chốt tháng" }
  ],
  controls: [
    "Kiểm kê theo từng kho và từng SKU, không kiểm gộp.",
    "NCC Flip theo dõi công nợ tách riêng do đặc thù thanh toán bằng IDR.",
    "Danh sách vấn đề chưa xử lý phải ghi rõ người/bộ phận phụ trách."
  ]
},

/* ---------------- LP 6.0 — Thanh toán nhập hàng / mua hàng ---------------- */
{
  id: "thanhtoan-nhaphang",
  scope: "lp",
  code: "LP 6.0",
  name: "Thanh toán nhập hàng / mua hàng",
  tagline: "Nhóm 1 — Dòng tiền",
  status: "Done",
  position: "Kế toán Dòng tiền",
  partners: "PCU · Phòng Kinh doanh · Nhà cung cấp",
  use: "Thực hiện thanh toán cho các khoản nhập hàng đã được phê duyệt, gồm nhập Account, nhập Robux và các khoản nhập hàng khác.",
  meaning: "Đây là bước cuối cùng biến một đề nghị thành tiền ra khỏi công ty. Sau khi chi, việc cập nhật trạng thái và lưu bill quyết định khả năng đối chiếu công nợ NCC ở cuối tháng.",
  owner: "Kế toán Dòng tiền — chị Hạnh",
  trigger: "ĐNTT/lệnh thanh toán đã hoàn tất các cấp phê duyệt.",
  cycle: "Theo lịch thanh toán được phê duyệt.",
  systems: "Sổ nhập hàng · Hub / Daily · Tồn kho · Ngân hàng / ví",
  scopeNote: "Phạm vi: gộp các khoản thanh toán Nhập Account, Nhập Robux và các khoản nhập hàng khác như MLBB, MIR4, TFT, CF, Valorant...",
  lanes: [LANE.tien, LANE.kho, LANE.ncc],
  nodes: [
    { id:"s", lane:0, col:0, type:"start", label:"ĐNTT\nđã duyệt" },
    { id:"f1", lane:0, col:1, type:"task", label:"Tiếp nhận ĐNTT\n/ lệnh thanh toán", tag:"Bước 1", owner:"Kế toán Dòng tiền",
      input:"ĐNTT/lệnh thanh toán đã qua các cấp phê duyệt",
      action:"Kiểm tra trạng thái phê duyệt trước khi đưa vào danh sách thanh toán, tổng hợp các ĐNTT đủ điều kiện để thanh toán theo lô hoặc từng lệnh.",
      output:"Danh sách ĐNTT đủ điều kiện thanh toán",
      control:"Chỉ nhận ĐNTT đã hoàn tất phê duyệt",
      risk:"Chi cho ĐNTT chưa duyệt đủ cấp → vi phạm kiểm soát nội bộ" },
    { id:"f2", lane:0, col:2, type:"task", label:"Kiểm tra\nthông tin đơn hàng", tag:"Bước 2", owner:"Kế toán Dòng tiền",
      input:"ĐNTT",
      action:"Kiểm tra 7 thông tin chính: ID Hub/ID đơn hàng, NCC, sản phẩm/nội dung hàng hoá, số lượng, đơn giá, tổng số tiền, thông tin tài khoản/ví nhận của NCC.",
      output:"Thông tin đơn hàng đã kiểm tra",
      control:"Đủ 7 trường thông tin trước khi đối chiếu",
      risk:"Thiếu ví nhận → chuyển sai địa chỉ NCC" },
    { id:"f3", lane:1, col:3, type:"task", label:"Đối chiếu 4 nguồn\ncăn cứ nhập hàng", tag:"Bước 3", owner:"Kế toán Kho × Kế toán Dòng tiền",
      input:"Sổ nhập hàng, xác nhận NCC, dữ liệu Hub/Daily, tồn kho",
      action:"Đối chiếu ĐNTT với 4 nguồn: Sổ nhập hàng (đơn hàng, sản phẩm, số lượng, giá trị, NCC); xác nhận với NCC; dữ liệu Hub/Daily (ID đơn, trạng thái); tồn kho khi cần thiết.",
      output:"Xác nhận căn cứ nhập hàng",
      control:"Đối chiếu đủ 4 nguồn với khoản giá trị lớn",
      risk:"Chỉ dựa 1 nguồn → không phát hiện đơn khống" },
    { id:"f4", lane:0, col:4, type:"task", label:"Xác nhận\nsố tiền thanh toán", tag:"Bước 4", owner:"Kế toán Dòng tiền",
      input:"ĐNTT, chứng từ đối chiếu",
      action:"Đối chiếu số lượng × đơn giá với thành tiền, kiểm tra số tiền khớp chứng từ và giao dịch thực tế. Xử lý chênh lệch, sai thông tin hoặc thiếu căn cứ trước khi thanh toán.",
      output:"Số tiền thanh toán đã xác nhận",
      control:"Chỉ thanh toán khi thông tin đã xác nhận đầy đủ",
      risk:"Chi khi còn chênh lệch → khó thu hồi" },
    { id:"g1", lane:0, col:5, type:"gateway", label:"Đủ căn\ncứ chi?", owner:"Kế toán Dòng tiền",
      input:"Kết quả đối chiếu",
      action:"Quyết định thực hiện thanh toán hay trả lại xử lý.",
      output:"Đủ → thanh toán; Chưa đủ → trả lại bổ sung",
      control:"Chưa đủ căn cứ thì dừng, không chi trước bổ sung sau",
      risk:"Chi trước bổ sung sau → mất kiểm soát chứng từ" },
    { id:"f5", lane:0, col:6, type:"task", label:"Thực hiện\nthanh toán", tag:"Bước 5", owner:"Kế toán Dòng tiền",
      input:"Hồ sơ đủ điều kiện",
      action:"Thanh toán theo lô hoặc từng lệnh tuỳ phương thức. Kiểm tra lại thông tin người nhận, số tiền và nội dung chuyển khoản trước khi xác nhận giao dịch.",
      output:"Giao dịch thanh toán hoàn tất",
      control:"Số thực chi đúng với số đã phê duyệt",
      risk:"Chi vượt duyệt → vượt ngân sách kỳ" },
    { id:"f6", lane:2, col:7, type:"task", label:"NCC nhận tiền\n+ xác nhận", tag:"Bước 6", owner:"Nhà cung cấp",
      input:"Xác nhận thanh toán từ kế toán",
      action:"NCC nhận tiền và xác nhận đã nhận thanh toán.",
      output:"Xác nhận từ NCC",
      control:"Lưu xác nhận làm căn cứ đối chiếu công nợ",
      risk:"Không có xác nhận → tranh chấp công nợ cuối tháng" },
    { id:"f7", lane:0, col:8, type:"task", label:"Cập nhật\nsau thanh toán", tag:"Bước 6", owner:"Kế toán Dòng tiền",
      input:"Chứng từ giao dịch",
      action:"Chụp/lưu bill hoặc chứng từ, gửi xác nhận thanh toán cho NCC/bộ phận liên quan, tick trạng thái Đã thanh toán trên hệ thống quản lý. Với lô Account/Robux và lô quản lý trên hệ thống, cập nhật trạng thái theo quy định.",
      output:"Bill lưu + trạng thái Đã thanh toán",
      control:"Tick trạng thái ngay sau khi chi",
      risk:"Không tick → đề nghị thanh toán lại cùng một đơn" },
    { id:"f8", lane:0, col:9, type:"task", label:"Đối chiếu\n& theo dõi", tag:"Bước 7", owner:"Kế toán Dòng tiền",
      input:"Danh sách đã thanh toán",
      action:"Đối chiếu số thực chi với ĐNTT/lệnh thanh toán, rà các lệnh đã chi nhưng chưa cập nhật trạng thái, lập danh sách khoản chưa hoàn tất do thiếu chứng từ, chưa xác nhận hoặc chênh lệch.",
      output:"Danh sách khoản chưa hoàn tất",
      control:"Rà soát định kỳ danh sách chưa hoàn tất",
      risk:"Khoản treo tích luỹ → sai công nợ NCC" },
    { id:"e", lane:0, col:10, type:"end", label:"Hoàn tất\nthanh toán" }
  ],
  edges: [
    {from:"s",to:"f1"},{from:"f1",to:"f2"},{from:"f2",to:"f3"},{from:"f3",to:"f4"},{from:"f4",to:"g1"},
    {from:"g1",to:"f5",label:"Đủ"},{from:"g1",to:"f2",label:"Chưa đủ",type:"back"},
    {from:"f5",to:"f6"},{from:"f6",to:"f7"},{from:"f7",to:"f8"},{from:"f8",to:"e"}
  ],
  raci: {
    roles: ["Kế toán Dòng tiền (Hạnh)", "Kế toán Kho (Huyền)", "PCU / Kinh doanh", "Nhà cung cấp"],
    rows: [
      { task:"Tiếp nhận ĐNTT/lệnh đã phê duyệt", v:["R/A","C","I","-"] },
      { task:"Kiểm tra thông tin đơn hàng", v:["R/A","C","C","-"] },
      { task:"Đối chiếu Sổ nhập/NCC/Hub-Daily/Tồn kho", v:["R","R/A","C","C"] },
      { task:"Xác nhận số tiền thanh toán", v:["R/A","C","I","C"] },
      { task:"Thực hiện thanh toán", v:["R/A","I","I","I"] },
      { task:"Lưu bill & gửi xác nhận cho NCC", v:["R/A","I","I","C"] },
      { task:"Tick trạng thái Đã thanh toán", v:["R/A","C","I","-"] },
      { task:"Đối chiếu & theo dõi khoản chưa hoàn tất", v:["R/A","C","I","C"] }
    ]
  },
  handoffs: [
    { from:"PCU / PKD", to:"Kế toán Dòng tiền", data:"ĐNTT/lệnh thanh toán đã hoàn tất phê duyệt", when:"Theo lịch thanh toán" },
    { from:"Kế toán Kho", to:"Kế toán Dòng tiền", data:"Xác nhận Sổ nhập hàng và tồn kho", when:"Trước khi chi" },
    { from:"Kế toán Dòng tiền", to:"Nhà cung cấp", data:"Xác nhận thanh toán + bill", when:"Ngay sau khi chi" },
    { from:"Kế toán Dòng tiền", to:"Kế toán Kho", data:"Trạng thái Đã thanh toán để đối chiếu công nợ", when:"Sau khi chi" }
  ],
  controls: [
    "Chỉ thanh toán khi ĐNTT đã hoàn tất đầy đủ các cấp phê duyệt.",
    "Đối chiếu đủ 4 nguồn căn cứ: Sổ nhập hàng, xác nhận NCC, Hub/Daily, tồn kho.",
    "Tick trạng thái Đã thanh toán ngay sau khi chi để tránh đề nghị thanh toán trùng."
  ]
}
];

/* ============================================================
   9 NHÓM KHOẢN CHI CỦA KẾ TOÁN DÒNG TIỀN
   Nhóm 1 đã có SOP (LP 6.0). 8 nhóm còn lại chờ Phòng Kế toán bổ sung.
   ============================================================ */
const NHOM_CHI = {
  note: "Sheet INDEX của file nguồn nêu Kế toán Dòng tiền xử lý 9 nhóm khoản chi, nhưng file mới mô tả chi tiết Nhóm 1. 8 nhóm còn lại là khung chờ Phòng Kế toán điền vào — chưa phải quy trình đã ban hành.",
  rule: "Nguyên tắc chung áp dụng cho mọi nhóm: Đề nghị → Kiểm tra chứng từ → Đối chiếu số tiền → Phê duyệt (KT phụ trách → CFO → CEO) → Thanh toán → Kiểm tra sau thanh toán → Lưu chứng từ.",
  items: [
    { no:1, name:"Nhập hàng / mua hàng", desc:"Nhập Account, nhập Robux và các khoản nhập hàng khác: MLBB, MIR4, TFT, CF, Valorant...", status:"Đã có SOP", sop:"thanhtoan-nhaphang", partner:"PCU · PKD · NCC" },
    { no:2, name:"Nạp ví / nạp sàn", desc:"Chờ Phòng Kế toán mô tả: phạm vi, tần suất, căn cứ đối chiếu và cách cập nhật sau nạp.", status:"Chờ bổ sung", partner:"PCU · PKD" },
    { no:3, name:"Chi trả CTV (QLTT / Affiliate / Daily)", desc:"3 nhóm cộng tác viên được công ty chi trả hoa hồng/thù lao, không bao gồm CTV bên NTN. Chờ mô tả quy trình duyệt rút tiền CTV trên Hub/Daily.", status:"Chờ bổ sung", partner:"PKD · CTV" },
    { no:4, name:"Hoàn tiền khách hàng", desc:"Chờ Phòng Kế toán mô tả: căn cứ hoàn, cấp duyệt, thời hạn xử lý và cách ghi nhận giảm doanh thu.", status:"Chờ bổ sung", partner:"PKD · CSKH" },
    { no:5, name:"Tạm ứng", desc:"Đã có quy trình duyệt tại LP 3.0 (Topup ví & Tạm ứng). Phần thực hiện chi và hoàn ứng của Kế toán Dòng tiền cần bổ sung.", status:"Một phần", sop:"duyet-tt-tamung", partner:"PCU · PKD · BU" },
    { no:6, name:"Chi phí vận hành định kỳ", desc:"Có thêm bước Quản lý (CEO) duyệt trước khi vào luồng kế toán. Chi tiết các bước chờ bổ sung.", status:"Chờ bổ sung", partner:"Các phòng ban · CEO" },
    { no:7, name:"Chi phí nhân sự", desc:"Lương, BHXH và các khoản chi phí nhân sự. Đầu vào từ Phòng Nhân sự theo SOP 4.0 của PNS. Chi tiết chờ bổ sung.", status:"Chờ bổ sung", partner:"Phòng Nhân sự" },
    { no:8, name:"Nghĩa vụ nộp theo kỳ", desc:"Thuế GTGT, TNCN và các nghĩa vụ nộp ngân sách. Số liệu từ Kế toán Thuế (NB 6.0). Chi tiết chờ bổ sung.", status:"Chờ bổ sung", partner:"Kế toán Thuế · Cơ quan thuế" },
    { no:9, name:"Nạp Octa", desc:"Octa vừa là hệ thống ghi nhận doanh thu vừa là ví/quỹ cần nạp tiền định kỳ. Chi tiết chờ bổ sung.", status:"Chờ bổ sung", partner:"PKD" }
  ]
};

/* ============================================================
   CHUỖI BÀN GIAO GIỮA 5 VỊ TRÍ KẾ TOÁN
   ============================================================ */
const CHAIN = {
  intro: "Đây là phần quan trọng nhất để chuyển từ hiện trạng từng vị trí riêng lẻ sang một quy trình vận hành chuẩn, xuyên suốt toàn bộ dòng nghiệp vụ.",
  steps: [
    { id:"pkd", name:"PKD / PCU", key:"pkd", role:"Phát sinh nghiệp vụ mua hàng, tạo Sổ nhập hàng", out:"Sổ nhập hàng" },
    { id:"kho", name:"Kế toán Kho — Huyền", key:"kho", role:"Kiểm tra hàng nhập, tồn kho, giá vốn", out:"Hàng nhập / tồn / giá vốn đã xác nhận" },
    { id:"tien", name:"Kế toán Dòng tiền — Hạnh", key:"tien", role:"Kiểm tra ĐNTT, chứng từ, số tiền → Phê duyệt → Thanh toán → Đối chiếu ngân hàng/ví/sàn", out:"Xác nhận đã thanh toán" },
    { id:"dt", name:"Kế toán Doanh thu — Ninh", key:"dt", role:"Đối soát đơn bán, doanh thu và giá vốn", out:"Doanh thu – giá vốn – lợi nhuận đã đối soát" },
    { id:"tc", name:"Kế toán Tài chính — Linh", key:"tc", role:"Tổng hợp Doanh thu – Giá vốn – Chi phí – Lợi nhuận", out:"Báo cáo tài chính quản trị" },
    { id:"thue", name:"Kế toán Thuế", key:"thue", role:"Đối chiếu số liệu kế toán và thực hiện nghĩa vụ thuế", out:"Tờ khai và nghĩa vụ thuế đã nộp" }
  ],
  gates: [
    { from:"PKD/PCU → Kế toán Kho", data:"Sổ nhập hàng", control:"Đối chiếu số lượng, SKU, giá trị trước khi khoá sổ N-1." },
    { from:"Kế toán Kho → Kế toán Dòng tiền", data:"Hàng nhập / tồn / giá vốn đã xác nhận", control:"Chỉ thanh toán khi hàng đã được xác nhận nhập kho hợp lệ." },
    { from:"Kế toán Dòng tiền → Kế toán Doanh thu", data:"Xác nhận đã thanh toán + đối chiếu ngân hàng/ví/sàn", control:"Doanh thu chỉ đối soát giá vốn khi khoản chi tương ứng đã được xác nhận thanh toán." },
    { from:"Kế toán Doanh thu → Kế toán Tài chính", data:"Doanh thu, giá vốn, lợi nhuận đã đối soát", control:"Tài chính chỉ tổng hợp số liệu đã được đối soát, không lấy số thô." },
    { from:"Kế toán Tài chính → Kế toán Thuế", data:"Số liệu Doanh thu – Giá vốn – Chi phí – Lợi nhuận", control:"Thuế đối chiếu số liệu kế toán trước khi thực hiện nghĩa vụ thuế." }
  ],
  meanings: [
    "Mỗi vị trí là một điểm kiểm soát (gate) của vị trí trước — Kho xác nhận hàng/giá vốn trước khi Dòng tiền thanh toán; Dòng tiền xác nhận đã thanh toán trước khi Doanh thu đối soát; Doanh thu chốt số trước khi Tài chính tổng hợp; Tài chính chốt số trước khi Thuế thực hiện nghĩa vụ thuế.",
    "Nếu một vị trí ghi nhận sai hoặc chậm, toàn bộ chuỗi phía sau sẽ bị ảnh hưởng — do đó mỗi vị trí phải hoàn tất đúng hạn theo tần suất quy định tại SOP của vị trí đó.",
    "Khi phát sinh chênh lệch ở bất kỳ khâu nào, cần truy ngược theo chiều mũi tên để xác định vị trí phát sinh sai lệch trước khi điều chỉnh số liệu."
  ]
};

/* ============================================================
   VAI TRÒ & LUỒNG PHÊ DUYỆT
   ============================================================ */
const ROLES = {
  positions: [
    { pos:"Kế toán Doanh thu", who:"chị Ninh", scope:"Theo dõi số dư & rút tiền sàn, đổi ngoại tệ, thu tiền về công ty, đối soát doanh thu — giá vốn." },
    { pos:"Kế toán Dòng tiền", who:"chị Hạnh", scope:"Kiểm tra ĐNTT, chứng từ, đối chiếu số tiền và thực hiện thanh toán cho 9 nhóm khoản chi." },
    { pos:"Kế toán Kho", who:"chị Huyền", scope:"Khoá sổ nhập hàng, nhập kho lên Misa, đối chiếu công nợ NCC, kiểm kê tồn kho." },
    { pos:"Kế toán Thuế", who:"Cần xác nhận", scope:"Xuất hoá đơn bán hàng & cho thuê VP, khai thuế GTGT/TNCN hàng quý, quyết toán thuế năm." },
    { pos:"Kế toán Tài chính", who:"chị Linh", scope:"Tổng hợp doanh thu — giá vốn — chi phí thành báo cáo tài chính quản trị theo kỳ." },
    { pos:"CFO", who:"chị Thảo / Kế toán thanh toán", scope:"Phê duyệt cấp CFO cho các khoản thanh toán trước khi trình CEO." },
    { pos:"CEO", who:"chị Quỳnh", scope:"Phê duyệt cấp cao nhất; đồng thời là cấp Quản lý duyệt một số khoản chi phí vận hành, lương, BHXH." }
  ],
  approvalFlow: [
    "Đề nghị thanh toán", "Kiểm tra chứng từ", "Đối chiếu số tiền",
    "Phê duyệt: KT phụ trách → CFO → CEO", "Thanh toán", "Kiểm tra sau thanh toán", "Lưu chứng từ"
  ],
  approvalNote: "Áp dụng cho toàn bộ 9 nhóm thanh toán của Kế toán Dòng tiền. Riêng nhóm 6 (chi phí vận hành định kỳ) có thêm bước Quản lý (CEO) duyệt trước khi vào luồng kế toán.",
  principles: [
    { no:1, name:"Mỗi vị trí là một điểm kiểm soát", detail:"Vị trí sau chỉ xử lý khi vị trí trước đã xác nhận đúng, đủ." },
    { no:2, name:"Luồng chuẩn cho mọi khoản chi", detail:"Đề nghị → Kiểm tra chứng từ → Đối chiếu số tiền → Phê duyệt → Thanh toán → Kiểm tra sau thanh toán → Lưu chứng từ." },
    { no:3, name:"Ghi nhận đúng kỳ, đúng số liệu đã đối soát", detail:"Báo cáo Tài chính và Thuế chỉ sử dụng số liệu đã đối soát ở vị trí trước, không lấy số thô từ hệ thống vận hành." },
    { no:4, name:"Chứng từ đầy đủ trước khi hạch toán/thanh toán", detail:"Không hạch toán, không chi tiền khi thiếu chứng từ hợp lệ (ảnh xác nhận NCC, hoá đơn, bill, deal...)." },
    { no:5, name:"Khoá sổ theo ngày (N-1)", detail:"Sổ nhập hàng phải được khoá hàng ngày theo số liệu N-1 làm căn cứ tính giá vốn và đối soát doanh thu." },
    { no:6, name:"Chặn thanh toán khi thiếu chứng từ", detail:"Chặn thanh toán và tạm ứng: nếu không bổ sung phiếu thanh toán thì không thanh toán tiếp." }
  ]
};

/* ============================================================
   BẢN ĐỒ LIÊN PHÒNG BAN
   ============================================================ */
const UNITS = [
  { id:"pkt",  name:"Phòng Kế toán",   sub:"5 vị trí kế toán",     key:"dt",   x:400, y:210, r:66 },
  { id:"pkd",  name:"Phòng Kinh doanh", sub:"Các BU",              key:"pkd",  x:110, y:120, r:56 },
  { id:"pcu",  name:"Phòng Cung ứng",   sub:"PCU",                 key:"pcu",  x:110, y:320, r:54 },
  { id:"bod",  name:"CFO / CEO",        sub:"Cấp phê duyệt",       key:"bod",  x:400, y:52,  r:48 },
  { id:"ncc",  name:"Nhà cung cấp",     sub:"NCC hàng hoá & Flip", key:"ext",  x:700, y:120, r:52 },
  { id:"san",  name:"Sàn giao dịch",    sub:"10 sàn · Octa · Hub", key:"sys",  x:700, y:320, r:54 },
  { id:"pns",  name:"Phòng Nhân sự",    sub:"Chi phí nhân sự",     key:"tc",   x:400, y:380, r:46 }
];

const FLOWS = [
  { from:"pkd", to:"pkt", label:"ĐNTT, bổ sung giá vốn/SKU, dữ liệu đơn hàng", sop:["duyet-tt-tructiep","bosung-giavon","doisoat-hqs10000"] },
  { from:"pkt", to:"pkd", label:"Danh sách đơn thiếu giá vốn, báo cáo lợi nhuận theo BU", sop:["bosung-giavon","doisoat-hqs10000"] },
  { from:"pcu", to:"pkt", label:"Sổ nhập hàng, ĐNTT nhập hàng, ĐNTT tạm ứng", sop:["duyet-tt-tructiep","duyet-tt-tamung","thanhtoan-nhaphang"] },
  { from:"pkt", to:"pcu", label:"Kết quả duyệt, danh sách chênh lệch tồn kho", sop:["kiemke-congno","duyet-tt-tructiep"] },
  { from:"pkt", to:"bod", label:"Hồ sơ trình duyệt thanh toán và tạm ứng", sop:["duyet-tt-tamung","thanhtoan-nhaphang"] },
  { from:"bod", to:"pkt", label:"Phê duyệt CFO → CEO theo thẩm quyền", sop:["duyet-tt-tamung"] },
  { from:"pkt", to:"ncc", label:"Thanh toán, bill, đối chiếu công nợ", sop:["thanhtoan-nhaphang","kiemke-congno"] },
  { from:"ncc", to:"pkt", label:"Xác nhận đơn hàng, xác nhận đã nhận tiền", sop:["thanhtoan-nhaphang","kiemke-congno"] },
  { from:"san", to:"pkt", label:"Sao kê, số dư ví, dữ liệu BE", sop:["doisoat-hqs10000"] },
  { from:"pkt", to:"san", label:"Lệnh rút tiền, nạp ví, tick trạng thái HubPay", sop:["doisoat-hqs10000"] },
  { from:"pns", to:"pkt", label:"File thanh toán lương, dữ liệu BHXH", sop:[] }
];

const HANDOFF_TABLE = [
  { point:"Sổ nhập hàng", from:"PKD / PCU", to:"Kế toán Kho", data:"Sổ nhập hàng đủ 11 trường thông tin", sla:"Khoá sổ hàng ngày theo N-1", sop:"duyet-tt-tructiep", risk:"Khoá sổ trễ → không tính được giá vốn, chặn cả chuỗi" },
  { point:"ĐNTT nhập hàng", from:"PCU / PKD", to:"Kế toán Kho → Kế toán thanh toán", data:"ĐNTT + đơn mua NCC + ID HubPay", sla:"Khi phát sinh", sop:"duyet-tt-tructiep", risk:"Thiếu thông tin → trả lại, chậm thanh toán NCC" },
  { point:"ĐNTT tạm ứng", from:"PCU / PKD / BU", to:"Kế toán thanh toán", data:"ĐNTT tạm ứng, mục đích và BU sử dụng", sla:"Khi phát sinh", sop:"duyet-tt-tamung", risk:"Không rõ BU → không tách được dòng tiền ví dùng chung" },
  { point:"Phê duyệt thanh toán", from:"Phòng Kế toán", to:"CFO → CEO", data:"Hồ sơ ĐNTT đã đối chiếu", sla:"Theo lịch thanh toán", sop:"thanhtoan-nhaphang", risk:"Duyệt vượt thẩm quyền → không hợp lệ kiểm soát nội bộ" },
  { point:"Bổ sung giá vốn", from:"Phòng Kế toán", to:"PKD / các BU", data:"Danh sách đơn thiếu giá vốn (9 trường)", sla:"Thứ 2 & Thứ 5 hàng tuần", sop:"bosung-giavon", risk:"BU không phản hồi → tồn giá vốn, lợi nhuận sai" },
  { point:"Phản hồi giá vốn", from:"PKD / các BU", to:"Phòng Kế toán", data:"CO/SKU/kho đã bổ sung hoặc lý do", sla:"Trong kỳ T2/T5", sop:"bosung-giavon", risk:"Phản hồi sai → cập nhật sai giá vốn" },
  { point:"Kiểm kê tồn kho", from:"PCU / bộ phận kho", to:"Kế toán Kho", data:"Tồn thực tế theo kho và SKU", sla:"Cuối tháng", sop:"kiemke-congno", risk:"Chênh lệch không xử lý → tích luỹ qua các kỳ" },
  { point:"Đối chiếu công nợ NCC", from:"Kế toán Kho", to:"Nhà cung cấp", data:"Bảng đối chiếu 7 trường theo đơn mua", sla:"Cuối tháng", sop:"kiemke-congno", risk:"Công nợ treo → tranh chấp với NCC" },
  { point:"Xác nhận thanh toán", from:"Kế toán Dòng tiền", to:"NCC + Kế toán Kho", data:"Bill + trạng thái Đã thanh toán", sla:"Ngay sau khi chi", sop:"thanhtoan-nhaphang", risk:"Không tick → đề nghị thanh toán trùng" },
  { point:"Dữ liệu sao kê sàn", from:"Sàn / hệ thống BE", to:"Kế toán Doanh thu", data:"10 file sao kê + dữ liệu BE", sla:"Hàng ngày", sop:"doisoat-hqs10000", risk:"Thiếu file → doanh thu ghi nhận sót" },
  { point:"Nhu cầu nạp NCC Flip", from:"PCU / Kinh doanh", to:"Kế toán Doanh thu", data:"Nhu cầu nạp tiền IDR cho NCC Flip", sla:"Trước khi rút IDR", sop:"doisoat-hqs10000", risk:"Không có nhu cầu rõ → rút thừa/thiếu IDR" },
  { point:"Chi phí nhân sự", from:"Phòng Nhân sự", to:"Kế toán Dòng tiền", data:"File thanh toán lương, dữ liệu BHXH", sla:"Ngày 10 (theo SOP PNS)", sop:"", risk:"Trễ → không kịp chi lương ngày 12" }
];

/* ============================================================
   LỊCH VẬN HÀNH KẾ TOÁN
   ============================================================ */
const CALENDAR = {
  note: "Lịch dưới đây tổng hợp các mốc có tần suất cố định trong file SOP. Các quy trình chạy theo phát sinh (duyệt thanh toán, tạm ứng) không có mốc ngày nên không thể hiện trên trục này.",
  cols: ["Hàng ngày", "Thứ 2 & Thứ 5", "Cuối tháng", "Hàng quý", "Hàng năm"],
  rows: [
    { owner:"Kế toán Doanh thu (Ninh)", key:"dt", cells:[
      [{label:"Theo dõi số dư & rút tiền sàn", sop:"sodu-ruttien"},{label:"Đối soát doanh thu & giá vốn HQS10000", sop:"doisoat-hqs10000"}],
      [{label:"Đối soát hàng nhập & doanh thu xuất", sop:"doisoat-nhap-xuat"}],
      [{label:"Chốt tổng hợp doanh thu tháng", sop:"doisoat-hqs10000"}],
      [], []
    ]},
    { owner:"Kế toán Doanh thu — Ngoại tệ", key:"dt", cells:[
      [], [], [{label:"Đổi ngoại tệ về VND (4–5 lần/tháng)", sop:"tygia-ngoaite"}], [], []
    ]},
    { owner:"Kế toán Kho (Huyền)", key:"kho", cells:[
      [{label:"Khoá sổ nhập hàng theo N-1", sop:"duyet-tt-tructiep"}],
      [{label:"Bổ sung giá vốn cùng PKD", sop:"bosung-giavon"}],
      [{label:"Kiểm kê kho & đối chiếu công nợ NCC", sop:"kiemke-congno"}],
      [], []
    ]},
    { owner:"Kế toán Dòng tiền (Hạnh)", key:"tien", cells:[
      [{label:"Theo dõi tiền về từ các sàn", sop:"sodu-ruttien"}],
      [], [{label:"Chốt tạm ứng & khoản treo", sop:"duyet-tt-tamung"}],
      [{label:"Nộp tiền thuế theo tờ khai", sop:"khai-thue"}], []
    ]},
    { owner:"Kế toán Thuế", key:"thue", cells:[
      [{label:"Xuất hoá đơn bán hàng theo kỳ", sop:"hoadon-banhang"}],
      [], [{label:"Hoá đơn cho thuê văn phòng", sop:"hoadon-thuevp"}],
      [{label:"Khai thuế GTGT & TNCN", sop:"khai-thue"}],
      [{label:"Quyết toán thuế năm", sop:"quyettoan-thue"}]
    ]},
    { owner:"Kế toán Tài chính (Linh)", key:"tc", cells:[
      [], [], [{label:"Báo cáo tài chính quản trị", sop:"bctc-quantri"}],
      [{label:"Đối chiếu Misa phục vụ khai thuế", sop:"khai-thue"}],
      [{label:"Đối chiếu số liệu quyết toán", sop:"quyettoan-thue"}]
    ]},
    { owner:"PKD / các BU", key:"pkd", cells:[
      [], [{label:"Bổ sung giá vốn các đơn hàng", sop:"bosung-giavon"}], [], [], []
    ]},
    { owner:"PCU / bộ phận kho", key:"pcu", cells:[
      [], [], [{label:"Kiểm kê tồn kho thực tế", sop:"kiemke-congno"}], [], []
    ]}
  ]
};

/* ============================================================
   TỪ ĐIỂN THUẬT NGỮ
   ============================================================ */
const GLOSSARY = [
  { term:"ĐNTT", def:"Đề nghị thanh toán", detail:"Hồ sơ đề xuất chi tiền, chỉ được giải ngân sau khi đủ chứng từ và đúng thẩm quyền phê duyệt." },
  { term:"HubPay", def:"Hệ thống quản lý luồng thanh toán nội bộ", detail:"Nơi tạo/duyệt ĐNTT tích hợp, xác nhận hoàn tất giao dịch thanh toán." },
  { term:"BE", def:"Hệ thống Back-end quản lý đơn hàng", detail:"Nguồn dữ liệu đối chiếu đơn hàng, doanh thu, trạng thái giao dịch." },
  { term:"Hub / Daily", def:"Hệ thống quản trị lô hàng / CTV", detail:"hub.hqwg.pro, daily.tichhop.pro — nơi kiểm tra lô hàng, duyệt rút tiền CTV, tick trạng thái đã thanh toán." },
  { term:"Misa", def:"Phần mềm kế toán", detail:"Dữ liệu nhập kho, công nợ, giá vốn được nhập và đối chiếu trên Misa." },
  { term:"SKU", def:"Mã định danh sản phẩm/hàng hoá", detail:"Dùng để đối chiếu giữa doanh thu, sổ nhập kho và giá vốn." },
  { term:"Octa", def:"Hệ thống bán hàng / ghi nhận doanh thu chính", detail:"Nguồn dữ liệu xuất hoá đơn bán hàng theo kỳ; cũng là ví/quỹ cần nạp tiền định kỳ (Nhóm 9 — Dòng tiền)." },
  { term:"Itemku", def:"Một sàn giao dịch công ty theo dõi số dư và rút tiền", detail:"Áp dụng trong quy trình Theo dõi số dư & rút tiền của Kế toán Doanh thu; rút được USDT hoặc IDR." },
  { term:"NCC Flip", def:"Nhà cung cấp thanh toán bằng IDR", detail:"Cần xác định nguồn tiền rút từ Itemku để đáp ứng nhu cầu nạp cho NCC Flip." },
  { term:"BU", def:"Business Unit — Đơn vị kinh doanh", detail:"Đơn vị vận hành độc lập; doanh thu, chi phí, lợi nhuận được tổng hợp và báo cáo theo từng BU." },
  { term:"Đơn CO = 0", def:"Đơn có giá trị hoa hồng/chiết khấu bằng 0 nhưng vẫn có SKU", detail:"Trường hợp ngoại lệ cần xử lý riêng khi xác định doanh thu hợp lệ." },
  { term:"N-1", def:"Số liệu tính đến hết ngày liền trước ngày hiện tại", detail:"Mốc chuẩn để khoá sổ nhập hàng hàng ngày của Kế toán Kho." },
  { term:"QLTT / Affiliate / Daily", def:"3 nhóm cộng tác viên được chi trả hoa hồng/thù lao", detail:"Thanh toán theo Nhóm 3 của Kế toán Dòng tiền; không bao gồm CTV bên NTN." },
  { term:"Balance", def:"Số dư trên hệ thống theo dõi của từng sàn", detail:"Kiểm tra hàng ngày tại balance.hqwg.pro làm căn cứ quyết định rút tiền về công ty." }
];

/* ============================================================
   GHI CHÚ RÀ SOÁT FILE GỐC
   ============================================================ */
const REVIEW_NOTES = [
  { level:"Thiếu", text:"Sheet INDEX nêu Kế toán Dòng tiền xử lý 9 nhóm khoản chi, nhưng file chỉ mô tả Nhóm 1 (nhập hàng/mua hàng). 8 nhóm còn lại đã được dựng khung chờ Phòng Kế toán bổ sung." },
  { level:"Thiếu", text:"Phần SOP nội bộ của sheet Dòng tiền để trống hoàn toàn, chỉ có nhãn. Bảng phần hành nêu 2 quy trình của chị Hạnh (ghi nhận dòng tiền các ví, đối soát) — đã dựng khung tại NB 9.0." },
  { level:"Cần xác nhận", text:"Sheet 06 Tài chính được chuẩn hoá từ đầu ra kỳ vọng do hiện trạng thu thập chưa đầy đủ — cần chị Linh rà soát và điều chỉnh cho khớp thực tế." },
  { level:"Cần xác nhận", text:"Vị trí Kế toán Thuế chưa có người phụ trách, file để trống [Cần xác nhận]." },
  { level:"Đã xử lý", text:"Danh sách SOP nội bộ / liên phòng ban ở sheet INDEX (dòng 20–43) để trống — bản web đã phân loại đầy đủ 9 SOP nội bộ và 6 SOP liên phòng ban." },
  { level:"Đã hợp nhất", text:"Sheet 'Quy trình ver2' là bảng phần hành nháp, thiếu người phụ trách ở mục Xuất kho và 3 dòng Dòng tiền — đã đối chiếu và hợp nhất vào các SOP tương ứng." },
  { level:"Đã bổ sung", text:"Rule cứng ghi rời trong ô ẩn của sheet Tổng quan: 'Chặn thanh toán và tạm ứng, nếu không bổ sung phiếu thanh toán thì không thanh toán tiếp' — đã đưa vào bộ nguyên tắc nền." }
];


export { SOPS_LP, NHOM_CHI, CHAIN, ROLES, UNITS, FLOWS, HANDOFF_TABLE, CALENDAR, GLOSSARY, REVIEW_NOTES };
