/* ============================================================
   API Lịch sử ví HQS10000 cho PKT6:
   - Doanh thu THỰC NHẬN về ví sàn (đã sau phí) — chỉ lấy các dòng
     có cột "Tìm" = DT (trống là giao dịch khác, bỏ qua).
   - Tháng đang chạy đọc live tab THVí Tiền (url + gid + month/year
     vì trên tab chỉ có số NGÀY trong tháng, không có ngày đầy đủ).
   - Tháng đã chốt nằm trong datalake lib/data/vi-*.json.
   Trả về cùng khuôn dữ liệu với /api/cpv để dùng chung CpvBoard.
   ============================================================ */

import Papa from 'papaparse';
import histT4 from '@/lib/data/vi-2026-04.json';
import histT5 from '@/lib/data/vi-2026-05.json';
import histT6 from '@/lib/data/vi-2026-06.json';
import histT7 from '@/lib/data/vi-2026-07.json';
/* T9 CHƯA chốt sổ — file này do .github/workflows/chup-vi.yml chụp lại mỗi 2
   tiếng, vì Google không xuất nổi file ví T9 theo yêu cầu (đo 07/09: bản công
   bố 0/2 lượt, export 0/3, gviz 1/5 và mất 38–44s). Tháng nào đọc live được
   thì bản chụp của tháng đó bị bỏ qua ở dưới, không cộng dồn hai lần. */
/* T8 chốt ngày 07/09 bằng chính chup-vi.yml, chạy tay với kiểu 'pub'.
   File ví T8 vẫn xuất bản được nên chụp thẳng từ bản live, không cần file
   tải tay — file chị Quinh gửi là bản ver2.072026, tab của nó dừng ở Tháng 7
   còn 'Trang tính5' thì 24.927 dòng nhưng DT VND, Giá Vốn, Tỷ giá đều #REF!. */
import histT8 from '@/lib/data/vi-2026-08.json';
import histT9 from '@/lib/data/vi-2026-09.json';
import { nhoDocFile } from '@/lib/boNho';
/* .mjs chứ không phải .js: scripts/chup-vi.mjs chạy bằng node trần, mà
   package.json không đặt type:module nên node đọc .js là CommonJS. */
import { parseWallet } from '@/lib/viParse.mjs';

const HIST = [histT4, histT5, histT6, histT7, histT8, histT9];

export const dynamic = 'force-dynamic';

function toCsvUrl(sheetUrl, gid, duong) {
  try {
    const u = new URL(sheetUrl);
    if (!u.hostname.includes('docs.google.com')) return null;
    const id = (u.pathname.match(/\/spreadsheets\/d\/(?!e\/)([^/]+)/) || [])[1];
    /* Đường gviz — dùng khi hai đường kia đã chết. Đo ngày 07/09 trên file ví
       T9: bản công bố 0/2 lượt và export 0/3 lượt, lượt nào cũng HTTP 307 rỗng
       sau 110s; riêng gviz thì ra, tuy chỉ 1/5 lượt và mất 38–44s.
       headers=5 là BẮT BUỘC: để mặc định thì gviz bỏ trống tên mọi cột kiểu
       số (Số Tiền · Tỷ giá tuần · DT VND · Giá Vốn · Lợi Nhuận) nên không dò
       nổi dòng tiêu đề. Đổi lại nó dán 5 dòng tiêu đề vào nhau — lib/viParse
       khớp theo hậu tố để đọc được cả hai dạng. */
    if (duong === 'gviz' && id) {
      return `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&gid=${gid || '0'}&headers=5`;
    }
    const pub = u.pathname.match(/\/spreadsheets\/d\/e\/([^/]+)/);
    /* single=true là BẮT BUỘC: thiếu nó Google hiểu là xuất CẢ WORKBOOK chứ
       không phải một tab, nên với file nhiều tab lớn thì trả HTTP 500 hoặc
       treo quá 90s. Đã đo được đúng lỗi này ở file BE T8 và file ví T8. */
    if (pub) return `https://docs.google.com/spreadsheets/d/e/${pub[1]}/pub?gid=${gid || u.searchParams.get('gid') || '0'}&single=true&output=csv`;
    if (id) return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid || '0'}`;
    return null;
  } catch {
    return sheetUrl; // URL CSV trực tiếp (mock/test)
  }
}

/* Google xuất file nặng theo kiểu HÊN XUI TỪNG LƯỢT chứ không hỏng hẳn — đo
   trên file ví T9 ngày 07/09: gviz ra ở lượt 5 và lượt 6, các lượt trước đều
   trượt. Nên hết giờ chỉ là MỘT LƯỢT TRƯỢT, không phải lý do bỏ cuộc; bản cũ
   thấy TimeoutError là ném ra ngay, tức tự cắt mất các lượt còn lại.
   Hạn chờ ngắn trước rồi nới dần, tổng vẫn dưới maxDuration 300s. */
const HAN_CHO = [45000, 45000, 60000, 60000, 60000];
/* Có nhớ: file ví tháng đang chạy khá nặng, mà PKT6 và PKT20 đọc chung —
   xem lib/boNho.js */
async function loadGrid(url, gid, duong) {
  const csvUrl = toCsvUrl(url, gid, duong) || url;
  const { val } = await nhoDocFile(`vi|${csvUrl}`, async () => {
    const daTruot = [];
    for (let i = 0; i < HAN_CHO.length; i++) {
      if (i) await new Promise((ok) => setTimeout(ok, 1500));
      try {
        const res = await fetch(csvUrl, { redirect: 'follow', cache: 'no-store', signal: AbortSignal.timeout(HAN_CHO[i]) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        /* HTML = file chưa mở quyền xem cho người có link, hoặc sai GID. Thử
           lại bao nhiêu lượt cũng vậy nên dừng luôn. */
        if (text.trim().startsWith('<')) {
          throw Object.assign(new Error('Nhận về HTML thay vì CSV — kiểm tra Publish to web và GID.'), { batDau: true });
        }
        return text;
      } catch (e) {
        if (e.batDau) throw e;
        daTruot.push(e.name === 'TimeoutError' ? `quá ${HAN_CHO[i] / 1000}s` : e.message);
      }
    }
    throw new Error(`Google không xuất được file sau ${HAN_CHO.length} lượt (${daTruot.join(' · ')})`);
  });
  return Papa.parse(val, { header: false, skipEmptyLines: false }).data;
}

export const maxDuration = 300;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  /* Mỗi tháng đang chạy là MỘT file ví riêng, nên nhận nhiều bộ
     (url, gid, month, year) ghép theo thứ tự. */
  const urls = searchParams.getAll('url');
  const gids = searchParams.getAll('gid');
  const duongs = searchParams.getAll('duong');
  const months = searchParams.getAll('month');
  const years = searchParams.getAll('year');
  const useHist = searchParams.get('hist') === '1';
  /* Không có file live vẫn chạy được nếu bật hist: tháng nào Google không
     xuất nổi thì nằm sẵn trong datalake (xem chup-vi.yml chụp định kỳ). */
  if (!urls.length && !useHist) return Response.json({ error: 'Thiếu url' }, { status: 400 });
  if (urls.length && !months.length) return Response.json({ error: 'Thiếu month/year cho tab ví' }, { status: 400 });

  const live = { detail: [], ok: 0 };
  const loi = [];
  const daDoc = await Promise.all(
    urls.map((u, i) =>
      loadGrid(u, gids[i] || '0', duongs[i] || '')
        .then((grid) => ({ grid, i }))
        .catch((e) => ({ err: e, i }))
    )
  );
  for (const kq of daDoc) {
    const thang = parseInt(months[kq.i] || months[0] || '0', 10);
    const nam = parseInt(years[kq.i] || years[0] || '0', 10);
    if (kq.err) { loi.push(`file ${kq.i + 1} (tháng ${thang || '?'}): ${kq.err.message}`); continue; }
    if (!thang || !nam) { loi.push(`file ${kq.i + 1}: thiếu tháng/năm`); continue; }
    try {
      const r = parseWallet(kq.grid, { month: thang, year: nam });
      live.detail = live.detail.concat(r.detail);
      live.ok += r.ok;
    } catch (e) {
      loi.push(`file ${kq.i + 1} (tháng ${thang}): ${e.message}`);
    }
  }
  let detail = live.detail.sort((x, y) => (x.sortKey < y.sortKey ? -1 : x.sortKey > y.sortKey ? 1 : x.san.localeCompare(y.san)));
  let histOk = 0;
  if (useHist) {
    /* Tháng nào đọc live được thì BỎ bản trong datalake của tháng đó, không
       thì hai nguồn cùng một tháng cộng dồn thành gấp đôi. Ảnh chụp định kỳ
       chỉ là bản sàn để trang còn số khi Google không xuất nổi. */
    const daCoLive = new Set(live.detail.map((r) => r.sortKey.slice(0, 6)));
    const histRows = HIST.flatMap((h) => h.detail).filter((r) => !daCoLive.has(r.sortKey.slice(0, 6)));
    detail = histRows
      .concat(detail)
      .sort((x, y) => (x.sortKey < y.sortKey ? -1 : x.sortKey > y.sortKey ? 1 : x.san.localeCompare(y.san)));
    for (const h of HIST) {
      const thangH = h.detail?.[0]?.sortKey?.slice(0, 6) || '';
      if (!daCoLive.has(thangH)) histOk += h.counts?.ok || 0;
    }
  }
  /* Không còn dòng nào thì mới báo lỗi hẳn; hụt một file mà datalake còn số
     thì vẫn trả, kèm main_error để trang hiện cảnh báo thay vì âm thầm
     thiếu một tháng. */
  if (!detail.length) {
    return Response.json({ error: `Tab THVí Tiền: ${loi.join(' · ') || 'không có dữ liệu'}` }, { status: 502 });
  }
  const dates = detail.map((x) => x.ngay);

  return Response.json({
    detail,
    meta: {
      gia_von_found: true,
      rows_used: live.ok + histOk,
      main_used: live.ok + histOk,
      don_fail: 0,
      don_huy: 0,
      api_used: 0,
      api_no_cost: 0,
      api_error: null,
      main_files: urls.length,
      main_error: loi.length ? loi.join(' · ') : null,
      dedup_removed: 0,
      api_out_of_range: 0,
      from: dates[0] || '',
      to: dates[dates.length - 1] || '',
    },
  });
}
