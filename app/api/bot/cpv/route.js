/* ============================================================
   BOT bắn CPV theo BE qua Telegram — lịch gọi đặt ở GitHub Actions
   (.github/workflows/bot-cpv.yml, 10h · 15h · 18h · 21h · 23h giờ VN;
   không dùng Vercel Cron vì gói Hobby chỉ cho chạy 1 lần/ngày).
   Nội dung: GMV hôm nay và lũy kế tháng, kèm ảnh biểu đồ so sánh các
   sàn (cột = doanh thu USD, đường = số đơn; vẽ qua quickchart.io —
   Telegram tự tải URL ảnh nên server này không cần thư viện vẽ;
   ảnh lỗi thì lùi về tin chữ).

   Cấu hình env trên Vercel:
   - TELEGRAM_BOT_TOKEN: token bot từ @BotFather
   - TELEGRAM_CHAT_ID:   chat id nhóm/kênh nhận tin
   - CRON_SECRET (tuỳ chọn): khoá bảo vệ endpoint
   Chưa có env Telegram thì endpoint trả bản xem trước (không gửi).
   Gọi tay để thử: /api/bot/cpv?preview=1
   ============================================================ */

import { getReport } from '@/lib/reports';

export const dynamic = 'force-dynamic';

const fmtVnd = (v) => {
  const n = Math.abs(v);
  if (n >= 1e9) return `${(v / 1e9).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} tỷ`;
  if (n >= 1e6) return `${(v / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tr`;
  return `${Math.round(v).toLocaleString('vi-VN')} đ`;
};

/* Ngày hiện tại theo giờ VN (UTC+7) */
function vnNow() {
  const d = new Date(Date.now() + 7 * 3600 * 1000);
  return {
    ngay: `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`,
    thang: `${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`,
    gio: `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`,
  };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const preview = searchParams.get('preview') === '1';

  /* Bảo vệ endpoint khi đặt CRON_SECRET (Vercel Cron tự gửi Bearer) */
  const secret = process.env.CRON_SECRET;
  if (secret && !preview) {
    const auth = request.headers.get('authorization') || '';
    if (auth !== `Bearer ${secret}` && searchParams.get('key') !== secret) {
      return Response.json({ error: 'Sai khoá' }, { status: 401 });
    }
  }

  /* Lấy số liệu từ chính /api/cpv của deployment này, cấu hình theo PKT8 */
  const cfg = getReport('pkt8')?.sheet;
  if (!cfg) return Response.json({ error: 'Thiếu cấu hình PKT8' }, { status: 500 });
  const qs = new URLSearchParams();
  qs.append('url', cfg.url);
  qs.append('gid', cfg.gid || '0');
  for (const m of cfg.mains || []) {
    qs.append('url', m.url);
    qs.append('gid', m.gid || '0');
  }
  for (const a of Array.isArray(cfg.api) ? cfg.api : cfg.api?.url ? [cfg.api] : []) {
    qs.append('url2', a.url);
    qs.append('gid2', a.gid || '0');
  }
  if (cfg.hist) qs.set('hist', '1');

  const origin = new URL(request.url).origin;
  let detail;
  try {
    const res = await fetch(`${origin}/api/cpv?${qs}`, { cache: 'no-store' });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
    detail = json.detail;
  } catch (e) {
    return Response.json({ error: `Không đọc được số liệu: ${e.message}` }, { status: 502 });
  }

  const now = vnNow();
  const ngay = searchParams.get('date') || now.ngay; // ?date=dd/mm/yyyy để thử
  const thang = ngay.slice(3);

  const homNay = detail.filter((r) => r.ngay === ngay);
  const trongThang = detail.filter((r) => r.ngay.slice(3) === thang);
  const sum = (rows, k) => rows.reduce((t, r) => t + (r[k] || 0), 0);

  const fmtUsd = (v) => `$${v.toLocaleString('vi-VN', { maximumFractionDigits: 0 })}`;
  const gmvNgay = sum(homNay, 'thanh_tien');
  const usdNgay = sum(homNay, 'doanh_thu_usd');
  const netNgay = sum(homNay, 'dthu_thuc');
  const donNgay = sum(homNay, 'so_don');
  const gmvThang = sum(trongThang, 'thanh_tien');
  const usdThang = sum(trongThang, 'doanh_thu_usd');
  const netThang = sum(trongThang, 'dthu_thuc');
  const donThang = sum(trongThang, 'so_don');
  /* Tỷ giá USDT/VND đang áp = Thành tiền ÷ DThu thực nhận (tỷ giá tuần trên file BE) */
  const tyGia = netNgay > 0 ? gmvNgay / netNgay : netThang > 0 ? gmvThang / netThang : 0;

  const lines = [
    `🤖 <b>Báo cáo CPV theo BE</b> — ${now.gio} ${ngay}`,
    '',
    `📅 <b>Hôm nay ${ngay.slice(0, 5)}:</b>`,
    `GMV ($): <b>${fmtUsd(usdNgay)}</b>`,
    `GMV (VND): <b>${fmtVnd(gmvNgay)}</b>`,
    `Số đơn: <b>${donNgay.toLocaleString('vi-VN')} đơn</b>`,
  ];
  if (tyGia > 0) lines.push(`💱 Tỷ giá quy đổi: <b>${Math.round(tyGia).toLocaleString('vi-VN')} đ/USDT</b>`);
  lines.push('');
  lines.push(`📈 <b>Lũy kế tháng ${thang}:</b>`);
  lines.push(`GMV ($): <b>${fmtUsd(usdThang)}</b>`);
  lines.push(`GMV (VND): <b>${fmtVnd(gmvThang)}</b>`);
  lines.push(`Số đơn: <b>${donThang.toLocaleString('vi-VN')} đơn</b>`);
  lines.push(`🔗 bc-pkt.vercel.app/bao-cao/pkt8`);
  const text = lines.join('\n');

  /* Ảnh biểu đồ: so sánh các sàn xếp theo doanh thu USD giảm dần —
     cột xanh HQ = doanh thu USD (trục trái), đường cam = số đơn (trục phải).
     Hôm nay chưa có số thì vẽ theo lũy kế tháng. */
  const scopeRows = homNay.length ? homNay : trongThang;
  const scopeLabel = homNay.length ? `hôm nay ${ngay.slice(0, 5)}` : `lũy kế tháng ${thang}`;
  const bySan = new Map();
  for (const r of scopeRows) {
    const cur = bySan.get(r.san) || { usd: 0, don: 0 };
    cur.usd += r.doanh_thu_usd || 0;
    cur.don += r.so_don || 0;
    bySan.set(r.san, cur);
  }
  const sanRows = [...bySan.entries()]
    .filter(([, v]) => v.usd > 0 || v.don > 0)
    .sort((a, b) => b[1].usd - a[1].usd);
  /* Cấu hình gửi QuickChart ở dạng JS (không phải JSON) để nhúng được hàm:
     nhãn tiền chỉ hiện trên 5 sàn doanh thu cao nhất (danh sách đã xếp giảm dần). */
  const chartCfgStr = `{
    type: 'bar',
    data: {
      labels: ${JSON.stringify(sanRows.map(([san]) => san))},
      datasets: [
        {
          label: 'Doanh thu (USD)',
          data: ${JSON.stringify(sanRows.map(([, v]) => Math.round(v.usd)))},
          backgroundColor: '#189BD8',
          yAxisID: 'A',
          datalabels: {
            display: (c) => c.dataIndex < 5,
            anchor: 'end', align: 'top', color: '#1B75BB',
            font: { weight: 'bold', size: 12 },
            formatter: (v) => '$' + String(v).replace(/\\B(?=(\\d{3})+(?!\\d))/g, '.'),
          },
        },
        {
          type: 'line', label: 'Số đơn',
          data: ${JSON.stringify(sanRows.map(([, v]) => v.don))},
          borderColor: '#D96F00', pointBackgroundColor: '#D96F00',
          fill: false, lineTension: 0, yAxisID: 'B',
          datalabels: { display: false },
        },
      ],
    },
    options: {
      layout: { padding: { top: 28 } },
      title: { display: true, text: ${JSON.stringify(`Doanh thu USD & số đơn theo sàn — ${scopeLabel}`)}, fontSize: 16 },
      legend: { display: true, position: 'bottom' },
      scales: {
        yAxes: [
          { id: 'A', position: 'left', ticks: { beginAtZero: true } },
          { id: 'B', position: 'right', ticks: { beginAtZero: true }, gridLines: { drawOnChartArea: false } },
        ],
      },
    },
  }`;
  /* Đổi sang link ngắn qua QuickChart (URL dài dễ vượt giới hạn của Telegram);
     tạo link ngắn lỗi thì vẫn dùng URL dài. */
  let chartUrl = `https://quickchart.io/chart?w=900&h=420&format=png&bkg=white&c=${encodeURIComponent(chartCfgStr)}`;
  try {
    const qc = await fetch('https://quickchart.io/chart/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chart: chartCfgStr, width: 900, height: 420, format: 'png', backgroundColor: 'white' }),
    });
    const qcJson = await qc.json();
    if (qcJson?.success && qcJson.url) chartUrl = qcJson.url;
  } catch {}

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId || preview) {
    return Response.json({
      sent: false,
      reason: preview ? 'preview' : 'Chưa cấu hình TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID trên Vercel',
      message: text,
      chart_url: chartUrl,
    });
  }

  const sendTg = async (method, payload) => {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, ...payload }),
    });
    return res.json();
  };

  try {
    /* Ưu tiên gửi ảnh kèm caption (Telegram giới hạn caption 1024 ký tự);
       ảnh/caption không gửi được thì lùi về tin nhắn chữ như cũ. */
    let anh = false;
    if (sanRows.length && text.length <= 1000) {
      anh = (await sendTg('sendPhoto', { photo: chartUrl, caption: text, parse_mode: 'HTML' })).ok === true;
    }
    if (!anh) {
      const tgJson = await sendTg('sendMessage', { text, parse_mode: 'HTML', disable_web_page_preview: true });
      if (!tgJson.ok) throw new Error(tgJson.description || 'Telegram từ chối');
      if (sanRows.length && text.length > 1000) {
        anh = (await sendTg('sendPhoto', { photo: chartUrl, caption: `📊 GMV theo ngày — tháng ${thang}` })).ok === true;
      }
    }
    return Response.json({ sent: true, anh });
  } catch (e) {
    return Response.json({ error: `Gửi Telegram lỗi: ${e.message}`, message: text }, { status: 502 });
  }
}
