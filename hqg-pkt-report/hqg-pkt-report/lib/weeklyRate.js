/* ============================================================
   Parser tab WEEKLY RATE — file "HQS - BẢNG TỶ GIÁ HÀNG TUẦN"
   (Google Sheet publish to web, đọc qua /api/sheet?raw=1).

   Cấu trúc sheet dạng ma trận:
   - Dòng YEAR / MONTH / WEEK / WEEKDAY / DAYS: mỗi tuần chiếm
     7 cột (thứ 2 → CN), bắt đầu từ cột thứ 5 (index 4).
   - Giá trị của tuần nằm ở ô ĐẦU block 7 cột (ô merge cả tuần).
   - Cột B: nhóm (ER1/ER2 hoặc tên khu vực), cột C: cặp tiền,
     cột D: chỉ số (CO Rate, REV Rate, Gap...).
   - Sheet có 3 khu: RATE THIS WEEK (tổng hợp) → ER1 (chi tiết
     đầu tuần) → ER2 (chi tiết USDT/VND).
   ============================================================ */

const DATA_COL_START = 4;

const norm = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
const packed = (s) => norm(s).replace(/\s/g, '').toUpperCase();

/* Số định dạng VN: "83,21" → 83.21 · "17.975" → 17975 · "0,48%" → {n:0.48, pct:true} */
export function parseViNum(raw) {
  let s = String(raw ?? '').trim();
  if (!s) return null;
  const pct = s.endsWith('%');
  if (pct) s = s.slice(0, -1);
  s = s.replace(/\s/g, '');
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  const n = parseFloat(s);
  if (isNaN(n)) return null;
  return { n, pct };
}

export function parseWeeklyRate(grid) {
  const headRow = (name) => grid.find((r) => norm(r?.[1]).toUpperCase() === name);
  const weekRow = headRow('WEEK');
  const daysRow = headRow('DAYS');
  const yearRow = headRow('YEAR');
  const monthRow = headRow('MONTH');
  if (!weekRow || !daysRow) {
    throw new Error('Không nhận ra cấu trúc tab WEEKLY RATE (thiếu dòng WEEK / DAYS). Kiểm tra lại GID của tab.');
  }

  /* ---------- Block tuần ---------- */
  const blocks = [];
  for (let c = DATA_COL_START; c < weekRow.length; c++) {
    if (norm(weekRow[c])) blocks.push({ week: norm(weekRow[c]), start: c });
  }
  blocks.forEach((b, i) => { b.end = (blocks[i + 1]?.start ?? weekRow.length) - 1; });

  let year = '';
  let month = '';
  blocks.forEach((b) => {
    year = norm(yearRow?.[b.start]) || year;
    month = norm(monthRow?.[b.start]) || month;
    b.year = year;
    b.month = month;
    const days = [];
    for (let c = b.start; c <= b.end; c++) if (norm(daysRow[c])) days.push(norm(daysRow[c]));
    b.from = days[0] || '';
    b.to = days[days.length - 1] || '';
  });

  /* ---------- Quét các dòng chỉ số ---------- */
  const daysIdx = grid.indexOf(daysRow);
  const rows = [];
  let section = '';
  let currency = '';

  for (let i = daysIdx + 1; i < grid.length; i++) {
    const r = grid[i] || [];
    const g = norm(r[1]);
    const cur = norm(r[2]);
    const kind = norm(r[3]);
    const isGap = /gap/i.test(kind) || /gap/i.test(cur);

    const cells = blocks.map((b) => {
      let raw = '';
      for (let c = b.start; c <= b.end; c++) {
        if (norm(r[c])) { raw = norm(r[c]); break; }
      }
      if (!raw) return null;
      const v = parseViNum(raw);
      if (!v) return { raw, n: null, pct: false };
      /* Lọc rác công thức: gap -100% khi tuần kế chưa có số, rate = 0 ở tuần tương lai */
      if (isGap && v.pct && v.n === -100) return null;
      if (!isGap && v.n === 0) return null;
      /* Ô định dạng nhầm % trên sheet (vd USD/VND "2639200,00%" thực chất là 26392) */
      if (!isGap && v.pct && Math.abs(v.n) >= 10000) return { raw, n: v.n / 100, pct: false };
      return { raw, n: v.n, pct: v.pct };
    });

    /* Dòng chỉ có nhãn ở cột B, không có số → mốc chuyển khu vực */
    if (g && !cur && !kind && cells.every((x) => !x)) { section = g; currency = ''; continue; }
    if (cur) currency = cur;
    if (cells.every((x) => !x)) continue;

    rows.push({
      section,
      currency: packed(currency),
      kind,
      main: Boolean(cur),
      label: (cur || kind).replace(/\s*=.*$/, '').trim(),
      isGap,
      cells,
    });
  }

  /* Chỉ giữ tuần đã có ít nhất một chỉ số tỉ giá (không tính gap) */
  const keep = [];
  blocks.forEach((b, i) => {
    if (rows.some((row) => !row.isGap && row.cells[i]?.n != null)) keep.push(i);
  });
  const weeks = keep.map((i) => blocks[i]);
  const outRows = rows
    .map((row) => ({ ...row, cells: keep.map((i) => row.cells[i]) }))
    .filter((row) => row.cells.some(Boolean));

  /* ---------- Bảng tidy cho weekly_rate + KPI ---------- */
  const summary = outRows.filter((r) => packed(r.section) === 'RATETHISWEEK');
  const find = (fn) => summary.find(fn) || null;
  const rowRub = find((r) => r.main && r.currency === 'RUB/USDT');
  const rowRubVnd = find((r) => !r.main && packed(r.kind).startsWith('RUB/VND'));
  const rowIdr = find((r) => r.main && r.currency === 'IDR/USDT');
  const rowIdrVnd = find((r) => !r.main && packed(r.kind).startsWith('IDR/VND'));
  const rowEur = find((r) => r.main && r.currency === 'USDT/EUR');
  const rowCo = find((r) => r.currency === 'USDT/VND' && packed(r.kind) === 'CORATE');
  const rowRev = find((r) => r.currency === 'USDT/VND' && packed(r.kind) === 'REVRATE');
  const rowGapUsdt = find((r) => packed(r.kind).startsWith('GAPUSDT'));
  const rowUsd = find((r) => r.main && r.currency === 'USD/VND');

  const val = (row, i) => (row ? row.cells[i]?.n ?? null : null);
  const tidy = weeks.map((b, i) => {
    const gap = val(rowGapUsdt, i);
    return {
      nam: b.year,
      thang: b.month,
      tuan: b.week,
      tu_ngay: b.from,
      den_ngay: b.to,
      rub_usdt: val(rowRub, i),
      rub_vnd: val(rowRubVnd, i),
      idr_usdt: val(rowIdr, i),
      idr_vnd: val(rowIdrVnd, i),
      eur_usdt: val(rowEur, i),
      usdt_vnd_co: val(rowCo, i),
      usdt_vnd_rev: val(rowRev, i),
      usd_vnd: val(rowUsd, i),
      gap_2_tuan: gap,
      vuot_nguong: gap == null ? '' : Math.abs(gap) > 2 ? 'CÓ' : '—',
    };
  });

  const last = tidy[tidy.length - 1] || {};
  const kpis = {};
  if (last.rub_usdt != null) kpis.rub_usdt = last.rub_usdt;
  if (last.idr_usdt != null) kpis.idr_usdt = last.idr_usdt;
  if (last.usdt_vnd_co != null) kpis.usdt_vnd_co = last.usdt_vnd_co;
  if (last.usdt_vnd_rev != null) kpis.usdt_vnd_rev = last.usdt_vnd_rev;
  if (last.gap_2_tuan != null) kpis.bien_dong_7d = last.gap_2_tuan;

  return { weeks, rows: outRows, tidy, kpis };
}

/* Định dạng ô hiển thị trên ma trận */
export function fmtMatrixCell(cell, isGap) {
  if (!cell) return '';
  if (cell.n == null) return cell.raw;
  if (isGap || cell.pct) return `${cell.n.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}%`;
  const abs = Math.abs(cell.n);
  const d = abs >= 1000 ? 0 : abs >= 10 ? 2 : 4;
  return cell.n.toLocaleString('vi-VN', { maximumFractionDigits: d });
}
