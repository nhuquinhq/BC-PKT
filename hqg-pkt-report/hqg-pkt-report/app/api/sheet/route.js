import Papa from 'papaparse';

export const dynamic = 'force-dynamic';

/* Chuyển link Google Sheet bất kỳ về link xuất CSV.
   Chấp nhận:
   - https://docs.google.com/spreadsheets/d/<ID>/edit#gid=<GID>
   - https://docs.google.com/spreadsheets/d/e/<PUB_ID>/pubhtml
   - link đã là .../export?format=csv
*/
function toCsvUrl(raw, gidParam) {
  const url = String(raw || '').trim();
  if (!url) return null;
  if (url.includes('output=csv') || url.includes('format=csv')) return url;

  const pub = url.match(/\/spreadsheets\/d\/e\/([^/]+)/);
  if (pub) {
    const gid = gidParam || (url.match(/[?#&]gid=(\d+)/) || [])[1];
    return `https://docs.google.com/spreadsheets/d/e/${pub[1]}/pub?output=csv${gid ? `&gid=${gid}` : ''}`;
  }

  const m = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!m) return null;
  const gid = gidParam || (url.match(/[?#&]gid=(\d+)/) || [])[1] || '0';
  return `https://docs.google.com/spreadsheets/d/${m[1]}/export?format=csv&gid=${gid}`;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get('raw') === '1';
  const csvUrl = toCsvUrl(searchParams.get('url'), searchParams.get('gid'));

  if (!csvUrl) {
    return Response.json({ error: 'Link không hợp lệ. Dán link Google Sheet dạng /spreadsheets/d/<ID>/edit#gid=<GID>.' }, { status: 400 });
  }

  try {
    const res = await fetch(csvUrl, { redirect: 'follow', cache: 'no-store' });
    if (!res.ok) {
      return Response.json({ error: `Google Sheet trả về mã ${res.status}. Kiểm tra quyền chia sẻ: Anyone with the link → Viewer, hoặc File → Share → Publish to web.` }, { status: 400 });
    }
    const text = await res.text();
    if (text.trim().startsWith('<')) {
      return Response.json({ error: 'Sheet chưa mở quyền xem công khai nên Google trả về trang đăng nhập.' }, { status: 400 });
    }
    if (raw) {
      /* Trả về lưới ô thô (mảng 2 chiều) cho các sheet dạng ma trận như WEEKLY RATE */
      const parsed = Papa.parse(text.trim(), { header: false, skipEmptyLines: false });
      return Response.json({ grid: parsed.data, count: parsed.data.length, csvUrl });
    }
    const parsed = Papa.parse(text.trim(), { header: true, skipEmptyLines: true, transformHeader: (h) => h.trim() });
    return Response.json({ rows: parsed.data, count: parsed.data.length, csvUrl });
  } catch (err) {
    return Response.json({ error: `Không kết nối được Google Sheet: ${err.message}` }, { status: 500 });
  }
}
