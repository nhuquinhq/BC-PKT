/* ============================================================
   Lọc dữ liệu theo phạm vi thời gian (TỪ NGÀY → ĐẾN NGÀY).
   Nhận diện ngày trên từng dòng theo thứ tự ưu tiên:
   - cột `ngay`  : '24/07/2026'
   - cột `tu_ngay` + `den_ngay` (+ `nam`): '27/4' → '2/8' + 2026
   - cột `thang` (+ `nam`): 'T7' | '7' | '07/2026'
   Dòng không nhận ra ngày thì GIỮ LẠI (không âm thầm giấu dữ liệu).
   ============================================================ */

export function parseVNDate(s, yearHint) {
  const t = String(s ?? '').trim();
  if (!t) return null;
  let m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
  m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  m = t.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (m && yearHint) return new Date(+yearHint, +m[2] - 1, +m[1]);
  return null;
}

function monthRange(thang, yearHint) {
  const t = String(thang ?? '').trim();
  let m = t.match(/^(\d{1,2})\/(\d{4})$/) || t.match(/^T?(\d{1,2})[\s/-]*(\d{4})?$/i);
  if (!m) return null;
  const mm = +m[1];
  const yy = m[2] ? +m[2] : yearHint ? +yearHint : null;
  if (!yy || mm < 1 || mm > 12) return null;
  return { a: new Date(yy, mm - 1, 1), b: new Date(yy, mm, 0) };
}

/* Khoảng ngày của một dòng dữ liệu, hoặc null nếu không nhận ra */
export function rowRange(row) {
  if (!row || typeof row !== 'object') return null;
  const year = row.nam || null;

  const d = parseVNDate(row.ngay, year);
  if (d) return { a: d, b: d };

  const a = parseVNDate(row.tu_ngay, year);
  let b = parseVNDate(row.den_ngay, year);
  if (a) {
    if (b && b < a) b = new Date(b.getFullYear() + 1, b.getMonth(), b.getDate()); // tuần vắt qua năm
    return { a, b: b || a };
  }

  return monthRange(row.thang, year);
}

/* Giữ dòng có khoảng ngày GIAO với [from, to]; from/to null = không chặn phía đó */
export function filterRowsByRange(rows, from, to) {
  if (!from && !to) return rows;
  return (rows || []).filter((r) => {
    const rr = rowRange(r);
    if (!rr) return true;
    if (from && rr.b < from) return false;
    if (to && rr.a > to) return false;
    return true;
  });
}

export function overlapsRange(a, b, from, to) {
  if (!a) return true;
  const end = b || a;
  if (from && end < from) return false;
  if (to && a > to) return false;
  return true;
}

export const fmtRangeDate = (d) =>
  d ? `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}` : '';
