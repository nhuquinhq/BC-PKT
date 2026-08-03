/* ============================================================
   BOT bắn CPV theo BE qua Telegram — chạy theo lịch Vercel Cron
   (10h · 15h · 18h · 21h · 23h giờ VN, khai báo trong vercel.json).
   Nội dung: GMV hôm nay (tổng + theo sàn) và lũy kế tháng.

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

  const gmvNgay = sum(homNay, 'thanh_tien');
  const donNgay = sum(homNay, 'so_don');
  const gmvThang = sum(trongThang, 'thanh_tien');
  const donThang = sum(trongThang, 'so_don');

  const bySan = new Map();
  for (const r of homNay) bySan.set(r.san, (bySan.get(r.san) || 0) + (r.thanh_tien || 0));
  const sanLines = [...bySan.entries()]
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([san, v]) => `  • ${san}: ${fmtVnd(v)}`);

  const lines = [
    `🤖 <b>CPV theo BE</b> — ${now.gio} ${ngay}`,
    '',
    `📅 <b>Hôm nay ${ngay.slice(0, 5)}</b>: GMV <b>${fmtVnd(gmvNgay)}</b> · ${donNgay.toLocaleString('vi-VN')} đơn`,
  ];
  if (sanLines.length) {
    lines.push('🏪 GMV theo sàn:');
    lines.push(...sanLines);
  } else {
    lines.push('🏪 Chưa ghi nhận GMV trong hôm nay.');
  }
  lines.push('');
  lines.push(`📈 <b>Lũy kế tháng ${thang}</b>: GMV <b>${fmtVnd(gmvThang)}</b> · ${donThang.toLocaleString('vi-VN')} đơn`);
  lines.push(`🔗 bc-pkt.vercel.app/bao-cao/pkt8`);
  const text = lines.join('\n');

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId || preview) {
    return Response.json({
      sent: false,
      reason: preview ? 'preview' : 'Chưa cấu hình TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID trên Vercel',
      message: text,
    });
  }

  try {
    const tg = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
    });
    const tgJson = await tg.json();
    if (!tgJson.ok) throw new Error(tgJson.description || 'Telegram từ chối');
    return Response.json({ sent: true });
  } catch (e) {
    return Response.json({ error: `Gửi Telegram lỗi: ${e.message}`, message: text }, { status: 502 });
  }
}
