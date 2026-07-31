'use client';

/* Bộ lọc thời gian kiểu Trung tâm PVH:
   TỪ NGÀY / ĐẾN NGÀY + nút nhanh 7N · 30N · Tháng này · Cả kỳ + Làm mới */

const toISO = (d) =>
  d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : '';

const fromISO = (s) => {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export default function FilterBar({ range, onChange }) {
  const setPreset = (key) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const day = (n) => new Date(today.getFullYear(), today.getMonth(), today.getDate() + n);
    if (key === '7d') onChange({ from: day(-6), to: today, preset: key });
    else if (key === '30d') onChange({ from: day(-29), to: today, preset: key });
    else if (key === 'month') onChange({ from: new Date(today.getFullYear(), today.getMonth(), 1), to: today, preset: key });
    else if (key === 'year') onChange({ from: new Date(today.getFullYear(), 0, 1), to: new Date(today.getFullYear(), 11, 31), preset: key });
    else onChange({ from: null, to: null, preset: 'all' });
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
        <label>Nhanh</label>
        <div className="quick">
          {[['7d', '7N'], ['30d', '30N'], ['month', 'Tháng này'], ['year', 'Cả năm'], ['all', 'Cả kỳ']].map(([key, label]) => (
            <button key={key} className={`qbtn${range.preset === key ? ' on' : ''}`} onClick={() => setPreset(key)}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <button className="btn" onClick={() => window.location.reload()}>↻ Làm mới</button>
    </div>
  );
}
