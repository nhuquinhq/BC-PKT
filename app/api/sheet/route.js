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
  /* Đã là link xuất CSV rồi thì để nguyên. Phải kể cả dạng gviz (tqx=out:csv):
     không thì đoạn dưới thấy /spreadsheets/d/<id> và viết lại thành /export,
     mà /export của đúng file đó lại trả trang đăng nhập — tức là tự tay đổi
     một đường CHẠY ĐƯỢC thành một đường hỏng. */
  if (url.includes('output=csv') || url.includes('format=csv') || url.includes('tqx=out:csv')) return url;

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
  const gid = searchParams.get('gid');
  /* Nhận NHIỀU url, thử lần lượt tới khi có đường ra. Cùng một tab mà Google
     lúc thì xuất được đường này lúc đường kia — đo ngày 07/09 trên tab tỷ giá:
     bản công bố ra, /export cùng file trả trang đăng nhập, gviz lại ra. */
  const nguon = searchParams.getAll('url').map((u) => toCsvUrl(u, gid)).filter(Boolean);

  if (!nguon.length) {
    return Response.json({ error: 'Link không hợp lệ. Dán link Google Sheet dạng /spreadsheets/d/<ID>/edit#gid=<GID>.' }, { status: 400 });
  }

  const truot = [];
  for (const csvUrl of nguon) {
    try {
      const res = await fetch(csvUrl, { redirect: 'follow', cache: 'no-store' });
      if (!res.ok) {
        truot.push(`mã ${res.status}`);
        continue;
      }
      const text = await res.text();
      if (text.trim().startsWith('<')) {
        truot.push('trang đăng nhập');
        continue;
      }
      if (raw) {
        /* Trả về lưới ô thô (mảng 2 chiều) cho các sheet dạng ma trận như WEEKLY RATE */
        const parsed = Papa.parse(text.trim(), { header: false, skipEmptyLines: false });
        return Response.json({ grid: parsed.data, count: parsed.data.length, csvUrl });
      }
      const parsed = Papa.parse(text.trim(), { header: true, skipEmptyLines: true, transformHeader: (h) => h.trim() });
      return Response.json({ rows: parsed.data, count: parsed.data.length, csvUrl });
    } catch (err) {
      truot.push(err.message);
    }
  }
  return Response.json(
    { error: `Không đọc được Google Sheet sau ${nguon.length} đường (${truot.join(' · ')}). Kiểm tra quyền chia sẻ: Anyone with the link → Viewer, hoặc File → Share → Publish to web.` },
    { status: 400 }
  );
}
