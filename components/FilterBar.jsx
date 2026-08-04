'use client';

/* Bộ lọc thời gian kiểu Trung tâm PVH:
   TỪ NGÀY / ĐẾN NGÀY + dropdown THÁNG (từng tháng / Cả năm) +
   dropdown TUẦN trong năm (thứ 2 → chủ nhật) + Làm mới */

const toISO = (d) =>
  d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : '';

const fromISO = (s) => {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export default function FilterBar({ range, onChange }) {
  const today = new Date();
  /* Danh sách tháng chọn nhanh: từ tháng hiện tại lùi về Tháng 1 năm nay */
  const monthOpts = Array.from({ length: today.getMonth() + 1 }, (_, i) => {
    const m = today.getMonth() - i + 1;
    return { val: `${today.getFullYear()}-${String(m).padStart(2, '0')}`, label: `Tháng ${m}` };
  });
  /* Chọn tháng = lấy trọn từ mùng 1 đến ngày cuối tháng; Cả năm = trọn năm nay */
  const setMonth = (val) => {
    if (!val) return;
    if (val === 'year') {
      onChange({ from: new Date(today.getFullYear(), 0, 1), to: new Date(today.getFullYear(), 11, 31), preset: 'year' });
      return;
    }
    const [y, m] = val.split('-').map(Number);
    onChange({ from: new Date(y, m - 1, 1), to: new Date(y, m, 0), preset: `m${val}` });
  };

  /* Tuần trong năm: tuần 1 là tuần chứa ngày 01/01, tính từ thứ 2 → chủ nhật;
     liệt kê đến tuần hiện tại, tuần mới nhất trên đầu. */
  const weekOpts = (() => {
    const jan1 = new Date(today.getFullYear(), 0, 1);
    const start = new Date(jan1);
    start.setDate(jan1.getDate() - ((jan1.getDay() + 6) % 7));
    const dd = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    const out = [];
    for (let i = 0; ; i++) {
      const a = new Date(start);
      a.setDate(start.getDate() + i * 7);
      if (a > today) break;
      const b = new Date(a);
      b.setDate(a.getDate() + 6);
      out.push({ val: String(i + 1), label: `Tuần ${i + 1} (${dd(a)} – ${dd(b)})`, a, b });
    }
    return out.reverse();
  })();
  const setWeek = (val) => {
    const w = weekOpts.find((o) => o.val === val);
    if (!w) return;
    onChange({ from: w.a, to: w.b, preset: `w${val}` });
  };

  return (
    <div className="filter-bar">
      <div className="fdate">
        <label>Từ ngày</label>
        <input
          type="date"
          value={toISO(range.from)}
          onChange={(e) => onChange({ ...range, from: fromISO(e.target.value), preset: null })}
        />
      </div>
      <div className="fdate">
        <label>Đến ngày</label>
        <input
          type="date"
          value={toISO(range.to)}
          onChange={(e) => onChange({ ...range, to: fromISO(e.target.value), preset: null })}
        />
      </div>
      <div className="fdate">
        <label>Tháng</label>
        <select
          value={range.preset === 'year' ? 'year' : typeof range.preset === 'string' && range.preset.startsWith('m') ? range.preset.slice(1) : ''}
          onChange={(e) => setMonth(e.target.value)}
        >
          <option value="">— Chọn —</option>
          <option value="year">Cả năm</option>
          {monthOpts.map((o) => (
            <option key={o.val} value={o.val}>{o.label}</option>
          ))}
        </select>
      </div>
      <div className="fdate">
        <label>Tuần</label>
        <select
          value={typeof range.preset === 'string' && range.preset.startsWith('w') ? range.preset.slice(1) : ''}
          onChange={(e) => setWeek(e.target.value)}
        >
          <option value="">— Chọn —</option>
          {weekOpts.map((o) => (
            <option key={o.val} value={o.val}>{o.label}</option>
          ))}
        </select>
      </div>
      <button className="btn" onClick={() => window.location.reload()}>↻ Làm mới</button>
    </div>
  );
}
