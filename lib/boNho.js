/* ============================================================
   BỘ NHỚ ĐỆM CHO CÁC API ĐỌC GOOGLE SHEET

   Vì sao cần: mỗi lượt mở trang, server phải tải lại vài file CSV nặng
   dăm bảy MB từ Google, mất hàng chục giây — mở PKT8 rồi PKT20 là đọc
   lại đúng những file đó thêm một lần nữa. Các tháng đã chốt sổ nằm sẵn
   trong lib/data nên không tốn gì; chỗ tốn thời gian là tháng đang chạy,
   mà trong vòng vài phút thì số gần như không đổi.

   Hai tầng:
   - RAM: giữ nguyên object trong tiến trình, nhanh nhất, nhưng mất khi
     Vercel dựng máy chủ mới.
   - KV (Upstash): bản nén gzip + base64, để máy chủ vừa dựng cũng có số
     ngay thay vì bắt người xem đợi thêm một lượt đọc Google.

   Ngoài ra:
   - Gộp các lượt gọi trùng nhau đang chạy song song (nhiều tab, nhiều
     trang cùng đọc một file thì chỉ đọc Google một lần).
   - Bản cũ vẫn được trả ngay và làm mới ở nền, người xem không phải chờ.
   - Google lỗi thì trả bản lưu gần nhất thay vì để trang trắng.
   ============================================================ */

import { gzipSync, gunzipSync } from 'zlib';

/* Còn tươi thì dùng thẳng; quá hạn này thì trả ngay bản cũ rồi đọc lại ở
   nền. Trang tự làm mới 5 phút một lần nên gần như luôn rơi vào vùng tươi. */
const SONG = 300000;
/* Quá hạn này thì bản cũ coi như không dùng được nữa, phải đọc mới. */
const HAN_CU = 21600000;
/* Chỉ cất lên KV khi bản nén còn nhỏ — file CSV thô nén xong vẫn 1–2 MB,
   đẩy lên KV vừa chậm vừa dễ chạm giới hạn bản ghi. */
const TRAN_KV = 700000;

/* Nguồn hỏng thì nhớ luôn cái hỏng trong ngần này, khỏi mỗi lượt mở trang lại
   ngồi đợi Google hết giờ thêm một lần nữa. Hết hạn thì tự thử lại. */
const SONG_LOI = 300000;

const ram = new Map();
const loiGanDay = new Map();
const dangChay = new Map();

const KV_URL = () => process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const KV_TOKEN = () => process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';

async function kv(cmd, han = 4000) {
  if (!KV_URL() || !KV_TOKEN()) return null;
  const r = await fetch(KV_URL(), {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
    cache: 'no-store',
    signal: AbortSignal.timeout(han),
  });
  if (!r.ok) throw new Error(`KV HTTP ${r.status}`);
  return (await r.json()).result;
}

const nen = (val) => gzipSync(Buffer.from(JSON.stringify(val)), { level: 6 }).toString('base64');
const giaiNen = (s) => JSON.parse(gunzipSync(Buffer.from(s, 'base64')).toString());

async function docKV(khoa) {
  try {
    const raw = await kv(['GET', `pkt:cache:${khoa}`]);
    if (!raw) return null;
    const o = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!o?.z || !o?.t) return null;
    return { val: giaiNen(o.z), luc: o.t };
  } catch {
    return null;
  }
}

async function ghiKV(khoa, val, luc) {
  try {
    const z = nen(val);
    if (z.length > TRAN_KV) return;
    await kv(['SET', `pkt:cache:${khoa}`, JSON.stringify({ z, t: luc }), 'EX', String(Math.round(HAN_CU / 1000))]);
  } catch {
    /* KV hỏng thì thôi, RAM vẫn chạy */
  }
}

/* Gộp lượt gọi trùng: cùng một khoá thì mọi người chờ chung một promise */
function motLan(khoa, tao) {
  const co = dangChay.get(khoa);
  if (co) return co;
  const p = (async () => tao())().finally(() => dangChay.delete(khoa));
  dangChay.set(khoa, p);
  return p;
}

async function banLuu(khoa, dungKV) {
  const r = ram.get(khoa);
  if (r) return r;
  if (!dungKV) return null;
  const k = await docKV(khoa);
  if (k) ram.set(khoa, k);
  return k;
}

/* Đọc có nhớ.
   khoa : chuỗi định danh nguồn (nên gồm cả url + gid)
   tao  : hàm async đọc thật khi không còn bản dùng được
   Trả về { val, tuoi, dangLamMoi } — tuoi tính bằng mili giây, 0 là vừa đọc. */
export async function nhoDoc(khoa, tao, { song = SONG, hanCu = HAN_CU, kv: dungKV = true, moi = false, songLoi = SONG_LOI } = {}) {
  const luu = moi ? null : await banLuu(khoa, dungKV);
  const tuoi = luu ? Date.now() - luu.luc : Infinity;

  if (luu && tuoi < song) return { val: luu.val, tuoi, dangLamMoi: false };

  /* Vừa hỏng xong mà cũng chẳng có bản cũ nào để hiện: báo lỗi luôn. Ngồi đợi
     Google hết giờ thêm lượt nữa chỉ tổ treo trang. */
  const loiCu = loiGanDay.get(khoa);
  if (!luu && loiCu && Date.now() - loiCu.luc < songLoi) throw new Error(loiCu.msg);

  const docThat = () =>
    motLan(khoa, async () => {
      let val;
      try {
        val = await tao();
      } catch (e) {
        loiGanDay.set(khoa, { msg: e.message, luc: Date.now() });
        throw e;
      }
      const luc = Date.now();
      loiGanDay.delete(khoa);
      ram.set(khoa, { val, luc });
      if (dungKV) await ghiKV(khoa, val, luc);
      return val;
    });

  /* Còn bản cũ trong hạn: trả ngay cho người xem, đọc lại ở nền để lượt sau
     có số mới. Nếu tiến trình bị đóng băng trước khi đọc xong thì cũng không
     sao — trình duyệt sẽ hỏi lại một lượt nữa (tham số moi=1). */
  if (luu && tuoi < hanCu) {
    /* Nguồn vừa hỏng thì đừng đâm đầu đọc lại ngay — chờ hết hạn nhớ lỗi. */
    const vuaHong = loiCu && Date.now() - loiCu.luc < songLoi;
    if (!vuaHong) docThat().catch(() => {});
    return { val: luu.val, tuoi, dangLamMoi: !vuaHong, loi: vuaHong ? loiCu.msg : undefined };
  }

  try {
    return { val: await docThat(), tuoi: 0, dangLamMoi: false };
  } catch (e) {
    if (luu) return { val: luu.val, tuoi, dangLamMoi: false, loi: e.message };
    throw e;
  }
}

/* Bản dùng cho từng FILE CSV: chỉ giữ trong RAM (bản nén vẫn quá to cho KV),
   nhưng đủ để mọi trang trong cùng một máy chủ dùng chung một lượt tải. */
export function nhoDocFile(khoa, tao, opts = {}) {
  return nhoDoc(khoa, tao, { kv: false, ...opts });
}
