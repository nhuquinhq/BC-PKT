/* ============================================================
   BOT bắn CPV theo BE qua Telegram. Ba khung 12h · 18h · 23h giờ VN,
   mỗi khung 1 lần (khóa KV chống trùng). Mỗi cửa sổ rộng NGUYÊN GIỜ
   (12:00–12:59 · 18:00–18:59 · 23:00–23:59) vì Vercel Cron gói Hobby
   không nổ đúng phút hẹn mà nổ đâu đó trong giờ đó. Đồng hồ gọi ?auto=1:
   - Vercel Cron (vercel.json): 2 chuyến/ngày — khung 12h và 23h.
     Gói Hobby chỉ cho mỗi cron chạy 1 lần/ngày nên tối đa 2 khung.
   - GitHub Actions (.github/workflows/bot-cpv.yml): ping dự phòng —
     lịch của GitHub hay bị bỏ chuyến nên chỉ coi là lớp đỡ.
   - Google Apps Script bên tài khoản PKT (nếu đã cài): gọi mỗi 10
     phút, đây mới là đồng hồ phủ đủ cả 3 khung.
   Mỗi lần bắn 2 tin, mỗi tin kèm 1 ảnh biểu đồ:
   1) CPV tổng: số hôm nay + lũy kế tháng; ảnh GMV theo ngày (cột)
      và đường lũy kế trong tháng.
   2) CPV theo sàn: top 5 sàn GMV hôm nay; ảnh so sánh GMV USD các
      sàn lũy kế tháng (nhãn tiền trên 5 sàn cao nhất).
   Ảnh vẽ qua quickchart.io (Telegram tự tải URL ảnh nên server
   không cần thư viện vẽ; ảnh lỗi thì lùi về tin chữ).

   Cấu hình env trên Vercel:
   - TELEGRAM_BOT_TOKEN: token bot từ @BotFather
   - TELEGRAM_CHAT_ID:   chat id nhóm/kênh nhận tin
   - CRON_SECRET (tuỳ chọn): khoá bảo vệ endpoint
   Chưa có env Telegram thì endpoint trả bản xem trước (không gửi).
   Gọi tay để thử: /api/bot/cpv?preview=1
   ============================================================ */

import { getReport } from '@/lib/reports';
import { GET as docSoLieu } from '@/app/api/cpv/route';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

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

  /* auto=1 — chế độ lịch: GitHub Actions gọi mỗi 15 phút (cron của GitHub
     hay bị trễ/bỏ chuyến nên gọi dày rồi server tự chọn thời điểm).
     Chỉ bắn đúng khung 10·15·18·21·23h VN, mỗi khung 1 lần — khóa chống
     gửi trùng đặt ở Upstash KV (cùng store với phân quyền). */
  const nowVN = vnNow();
  let autoKv = null; /* khóa khung giờ đã giành — chốt cả ngày sau khi gửi xong */

  /* Ghi VẾT kết quả của chuyến gọi này theo giờ, để ?trangthai=1 nói được
     bot đã làm gì: không đồng hồ nào gọi · gọi nhưng ngoài khung · đọc số
     lỗi · Telegram từ chối · đã gửi. Phải await, nếu không Vercel cắt
     request là mất luôn dấu vết. */
  const kvU = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
  const kvT = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
  const ghiVet = async (txt) => {
    if (!kvU || !kvT) return;
    try {
      await fetch(kvU, {
        method: 'POST',
        headers: { Authorization: `Bearer ${kvT}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(['SET', `pkt:bot:${nowVN.ngay}:vet:${nowVN.gio.slice(0, 2)}`, `${nowVN.gio} · ${txt}`, 'EX', 172800]),
        cache: 'no-store',
      });
    } catch { /* mất dấu vết thì thôi, không được chặn việc gửi */ }
  };

  /* ?trangthai=1 — tra xem hôm nay khung nào đã bắn (đọc khoá trên KV),
     không gửi gì cả. Dùng để kiểm tra lịch mà không tạo tin trùng. */
  if (searchParams.get('trangthai') === '1') {
    const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
    const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
    const ngayTra = searchParams.get('date') || nowVN.ngay;
    if (!kvUrl || !kvToken) return Response.json({ error: 'Chưa nối KV nên không tra được' }, { status: 500 });
    const khung = ['12h', '18h', '23h30'];
    const da = {};
    for (const k of khung) {
      try {
        const r = await fetch(kvUrl, {
          method: 'POST',
          headers: { Authorization: `Bearer ${kvToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(['GET', `pkt:bot:${ngayTra}:${k}`]),
          cache: 'no-store',
        });
        da[k] = (await r.json()).result ? 'đã bắn' : 'chưa bắn';
      } catch (e) {
        da[k] = `lỗi đọc KV: ${e.message}`;
      }
    }
    /* Giờ nào trong ngày có đồng hồ gọi tới (?auto=1) */
    let ping = 'không đọc được';
    try {
      const keys = Array.from({ length: 24 }, (_, h) => `pkt:bot:${ngayTra}:ping:${String(h).padStart(2, '0')}`);
      const r = await fetch(kvUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${kvToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(['MGET', ...keys]),
        cache: 'no-store',
      });
      const kq = (await r.json()).result || [];
      ping = kq.map((v, h) => (v ? `${String(h).padStart(2, '0')}h (${v})` : null)).filter(Boolean);
      if (!ping.length) ping = 'CHƯA CÓ ĐỒNG HỒ NÀO GỌI hôm nay';
    } catch (e) {
      ping = `lỗi đọc KV: ${e.message}`;
    }
    let vet = 'không đọc được';
    try {
      const keys = Array.from({ length: 24 }, (_, h) => `pkt:bot:${ngayTra}:vet:${String(h).padStart(2, '0')}`);
      const r = await fetch(kvUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${kvToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(['MGET', ...keys]),
        cache: 'no-store',
      });
      vet = ((await r.json()).result || []).filter(Boolean);
      if (!vet.length) vet = 'chưa có chuyến gọi nào được ghi nhận';
    } catch (e) {
      vet = `lỗi đọc KV: ${e.message}`;
    }
    return Response.json({ ngay: ngayTra, gio_hien_tai: nowVN.gio, khung: da, dong_ho_goi: ping, dien_bien: vet });
  }
  if (searchParams.get('auto') === '1') {
    const phutVN = Number(nowVN.gio.slice(0, 2)) * 60 + Number(nowVN.gio.slice(3, 5));
    /* Đánh dấu ĐỒNG HỒ CÓ GỌI trong giờ này */
    if (kvU && kvT) {
      await fetch(kvU, {
        method: 'POST',
        headers: { Authorization: `Bearer ${kvT}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(['SET', `pkt:bot:${nowVN.ngay}:ping:${nowVN.gio.slice(0, 2)}`, nowVN.gio, 'EX', 172800]),
        cache: 'no-store',
      }).catch(() => {});
    }
    /* Khung bắn 12h · 18h · 23h30 — cửa sổ chờ đến hết giờ đó
       (23h30 → 23h59), lần gọi đầu rơi vào cửa sổ sẽ bắn. */
    /* Cửa sổ rộng NGUYÊN GIỜ. Lý do: Vercel Cron gói Hobby không nổ đúng
       phút hẹn mà nổ đâu đó TRONG GIỜ đó — cron 30 16 * * * (UTC) có thể
       rơi vào bất kỳ phút nào của 23h VN. Cửa sổ cũ 23:30–23:59 nên chuyến
       nổ lúc 23:0x bị coi là "ngoài khung" và mất luôn khung cuối ngày. */
    const SLOTS = [
      { key: '12h', a: 12 * 60, b: 12 * 60 + 59 },
      { key: '18h', a: 18 * 60, b: 18 * 60 + 59 },
      { key: '23h30', a: 23 * 60, b: 23 * 60 + 59 },
    ];
    const slot = SLOTS.find((s) => phutVN >= s.a && phutVN <= s.b);
    if (!slot) {
      await ghiVet('có gọi nhưng ngoài khung giờ bắn');
      return Response.json({ sent: false, skip: `ngoài khung giờ bắn (hiện ${nowVN.gio} VN)` });
    }
    const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
    const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
    if (kvUrl && kvToken) {
      try {
        /* Giành lượt bằng khóa TẠM 3 phút — chốt khóa cả ngày chỉ sau khi
           GỬI THÀNH CÔNG (cuối hàm); server chết giữa chừng thì khóa tạm
           hết hạn và chuyến ping sau tự bắn lại, không mất khung. Để 10
           phút vì đọc file + dựng biểu đồ + gửi 2 tin có thể lâu hơn 3
           phút, khoá ngắn quá thì chuyến ping kế tiếp bắn trùng. */
        const r = await fetch(kvUrl, {
          method: 'POST',
          headers: { Authorization: `Bearer ${kvToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(['SET', `pkt:bot:${nowVN.ngay}:${slot.key}`, '1', 'NX', 'EX', 600]),
          cache: 'no-store',
        });
        const j = await r.json();
        if (j.result === null) {
          await ghiVet(`khung ${slot.key} đã có chuyến khác giữ lượt`);
          return Response.json({ sent: false, skip: `khung ${slot.key} hôm nay đã gửi rồi (hoặc đang gửi)` });
        }
        autoKv = { url: kvUrl, token: kvToken, key: `pkt:bot:${nowVN.ngay}:${slot.key}` };
      } catch { /* KV lỗi thì vẫn gửi — thà trùng còn hơn sót */ }
    } else if (phutVN - slot.a > 20) {
      /* chưa nối KV: chỉ cho lần gọi đầu cửa sổ đi qua để không gửi trùng */
      return Response.json({ sent: false, skip: 'chưa nối KV — chỉ gửi lần gọi đầu khung' });
    }
  }

  /* Số liệu lấy theo cấu hình PKT8, nhưng CHỈ THÁNG ĐANG CHẠY:
     bỏ file các tháng trước (cfg.mains) và datalake (hist) — bot chỉ cần
     hôm nay + lũy kế tháng, đọc ít file thì kịp trong hạn 60s của Vercel. */
  const cfg = getReport('pkt8')?.sheet;
  if (!cfg) return Response.json({ error: 'Thiếu cấu hình PKT8' }, { status: 500 });
  const qs = new URLSearchParams();
  qs.append('url', cfg.url);
  qs.append('gid', cfg.gid || '0');
  const apis = Array.isArray(cfg.api) ? cfg.api : cfg.api?.url ? [cfg.api] : [];
  if (apis[0]) {
    qs.append('url2', apis[0].url);
    qs.append('gid2', apis[0].gid || '0');
  }

  /* Gọi thẳng hàm xử lý của /api/cpv (không đi qua HTTP) — tự gọi lại
     chính deployment dễ nghẽn và tốn thêm một vòng mạng. */
  const origin = new URL(request.url).origin;
  let detail;
  try {
    const res = await docSoLieu(new Request(`${origin}/api/cpv?${qs}`));
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
    detail = json.detail;
  } catch (e) {
    await ghiVet(`ĐỌC SỐ LỖI: ${e.message}`);
    /* Đọc hụt thì TRẢ LẠI LƯỢT ngay, đừng ôm khoá 10 phút — chuyến ping kế
       tiếp trong cùng khung giờ còn cơ hội thử lại khi Google đỡ ì. */
    if (autoKv) {
      await fetch(autoKv.url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${autoKv.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(['DEL', autoKv.key]),
        cache: 'no-store',
      }).catch(() => {});
    }
    return Response.json({ error: `Không đọc được số liệu: ${e.message}` }, { status: 502 });
  }

  const now = nowVN;
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

  /* ---------- Tin 1: Báo cáo CPV tổng ---------- */
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
  const text1 = lines.join('\n');

  /* Ảnh 1: GMV theo ngày (cột) + đường lũy kế trong tháng (triệu đ) */
  const byDay = new Map();
  for (const r of trongThang) byDay.set(r.ngay, (byDay.get(r.ngay) || 0) + (r.thanh_tien || 0));
  const dayKeys = [...byDay.keys()].sort(); /* cùng 1 tháng nên so chuỗi dd/mm/yyyy là đúng thứ tự */
  const gmvTheoNgay = dayKeys.map((d) => Math.round(byDay.get(d) / 1e6));
  let luyKe = 0;
  const luyKeTheoNgay = gmvTheoNgay.map((v) => (luyKe += v));
  const chart1Cfg = {
    type: 'bar',
    data: {
      labels: dayKeys.map((d) => d.slice(0, 5)),
      datasets: [
        { label: 'GMV ngày (triệu đ)', data: gmvTheoNgay, backgroundColor: '#189BD8', yAxisID: 'A' },
        { type: 'line', label: 'Lũy kế (triệu đ)', data: luyKeTheoNgay, borderColor: '#00A651', pointBackgroundColor: '#00A651', fill: false, lineTension: 0, yAxisID: 'B' },
      ],
    },
    options: {
      title: { display: true, text: `GMV theo ngày & lũy kế — tháng ${thang} (triệu đ)`, fontSize: 16 },
      legend: { display: true, position: 'bottom' },
      scales: {
        yAxes: [
          { id: 'A', position: 'left', ticks: { beginAtZero: true } },
          { id: 'B', position: 'right', ticks: { beginAtZero: true }, gridLines: { drawOnChartArea: false } },
        ],
      },
    },
  };

  /* ---------- Tin 2: Báo cáo CPV theo sàn ---------- */
  const gomTheoSan = (rows) => {
    const m = new Map();
    for (const r of rows) {
      const cur = m.get(r.san) || { usd: 0, don: 0 };
      cur.usd += r.doanh_thu_usd || 0;
      cur.don += r.so_don || 0;
      m.set(r.san, cur);
    }
    return [...m.entries()].filter(([, v]) => v.usd > 0 || v.don > 0).sort((a, b) => b[1].usd - a[1].usd);
  };
  const sanNgay = gomTheoSan(homNay);
  const sanThang = gomTheoSan(trongThang);

  const lines2 = [`🏪 <b>Báo cáo CPV theo sàn</b> — ${now.gio} ${ngay}`, ''];
  if (sanNgay.length) {
    lines2.push(`🏆 <b>Top 5 sàn GMV hôm nay ${ngay.slice(0, 5)}:</b>`);
    sanNgay.slice(0, 5).forEach(([san, v], i) => {
      lines2.push(`${i + 1}. ${san}: <b>${fmtUsd(v.usd)}</b> · ${v.don.toLocaleString('vi-VN')} đơn`);
    });
  } else {
    lines2.push('Chưa ghi nhận GMV trong hôm nay.');
  }
  const text2 = lines2.join('\n');

  /* Ảnh 2: GMV USD các sàn lũy kế tháng — cấu hình gửi QuickChart ở dạng JS
     (không phải JSON) để nhúng được hàm: nhãn tiền chỉ hiện trên 5 sàn cao nhất. */
  const chart2CfgStr = `{
    type: 'bar',
    data: {
      labels: ${JSON.stringify(sanThang.map(([san]) => san))},
      datasets: [
        {
          label: 'GMV tháng (USD)',
          data: ${JSON.stringify(sanThang.map(([, v]) => Math.round(v.usd)))},
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
          type: 'line', label: 'Số đơn tháng',
          data: ${JSON.stringify(sanThang.map(([, v]) => v.don))},
          borderColor: '#D96F00', pointBackgroundColor: '#D96F00',
          fill: false, lineTension: 0, yAxisID: 'B',
          datalabels: { display: false },
        },
      ],
    },
    options: {
      layout: { padding: { top: 28 } },
      title: { display: true, text: ${JSON.stringify(`GMV USD theo sàn — lũy kế tháng ${thang}`)}, fontSize: 16 },
      legend: { display: true, position: 'bottom' },
      scales: {
        yAxes: [
          { id: 'A', position: 'left', ticks: { beginAtZero: true } },
          { id: 'B', position: 'right', ticks: { beginAtZero: true }, gridLines: { drawOnChartArea: false } },
        ],
      },
    },
  }`;

  /* Link ảnh: ưu tiên link ngắn của QuickChart (URL dài dễ vượt giới hạn Telegram);
     tạo link ngắn lỗi thì vẫn dùng URL dài. */
  const toChartUrl = async (cfg) => {
    const chart = typeof cfg === 'string' ? cfg : JSON.stringify(cfg);
    let url = `https://quickchart.io/chart?w=900&h=420&format=png&bkg=white&c=${encodeURIComponent(chart)}`;
    try {
      const qc = await fetch('https://quickchart.io/chart/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chart, width: 900, height: 420, format: 'png', backgroundColor: 'white' }),
      });
      const qcJson = await qc.json();
      if (qcJson?.success && qcJson.url) url = qcJson.url;
    } catch {}
    return url;
  };
  const chart1Url = dayKeys.length ? await toChartUrl(chart1Cfg) : null;
  const chart2Url = sanThang.length ? await toChartUrl(chart2CfgStr) : null;

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId || preview) {
    return Response.json({
      sent: false,
      reason: preview ? 'preview' : 'Chưa cấu hình TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID trên Vercel',
      message: text1,
      message2: text2,
      chart_url: chart1Url,
      chart2_url: chart2Url,
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

  /* Gửi 1 tin: ưu tiên ảnh kèm caption (Telegram giới hạn caption 1024 ký tự);
     ảnh lỗi thì lùi về tin chữ, caption quá dài thì gửi chữ trước ảnh sau. */
  const guiTin = async (text, chartUrl, tenAnh) => {
    if (chartUrl && text.length <= 1000) {
      const r = await sendTg('sendPhoto', { photo: chartUrl, caption: text, parse_mode: 'HTML' });
      if (r.ok) return { ok: true, anh: true };
    }
    const r2 = await sendTg('sendMessage', { text, parse_mode: 'HTML', disable_web_page_preview: true });
    if (!r2.ok) return { ok: false, loi: r2.description || 'Telegram từ chối' };
    if (chartUrl && text.length > 1000) {
      const r3 = await sendTg('sendPhoto', { photo: chartUrl, caption: tenAnh });
      return { ok: true, anh: r3.ok === true };
    }
    return { ok: true, anh: false };
  };

  try {
    const tin1 = await guiTin(text1, chart1Url, `📊 GMV theo ngày & lũy kế — tháng ${thang}`);
    const tin2 = await guiTin(text2, chart2Url, `📊 GMV USD theo sàn — tháng ${thang}`);
    if (!tin1.ok || !tin2.ok) throw new Error(tin1.loi || tin2.loi || 'Telegram từ chối');
    /* Gửi xong mới chốt khóa khung giờ cả ngày (đè khóa tạm 3 phút) */
    if (autoKv) {
      await fetch(autoKv.url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${autoKv.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(['SET', autoKv.key, '1', 'EX', 86400]),
        cache: 'no-store',
      }).catch(() => {});
    }
    await ghiVet('ĐÃ GỬI 2 tin');
    return Response.json({ sent: true, tin1, tin2 });
  } catch (e) {
    await ghiVet(`GỬI TELEGRAM LỖI: ${e.message}`);
    return Response.json({ error: `Gửi Telegram lỗi: ${e.message}`, message: text1 }, { status: 502 });
  }
}
