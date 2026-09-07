/* ============================================================
   Dựng query cho các API đọc Google Sheet (/api/cpv · /api/vi ·
   /api/taomoi · /api/ritokey).

   Mỗi FILE live là một bộ (url, gid) và có thể kèm month/year riêng —
   tab lịch sử ví chỉ ghi SỐ NGÀY trong tháng chứ không có ngày đầy đủ,
   nên mỗi file ví phải nói rõ nó là tháng nào. Vì thế month/year được
   APPEND theo từng file để server ghép đúng cặp, còn các tham số chung
   (vd gids của Ritokey) thì SET một lần.
   ============================================================ */

export function sheetQuery(cfg) {
  const qs = new URLSearchParams();
  /* Cấu hình CHỈ CÓ hist (không file live nào) vẫn phải dựng được query:
     tháng nào Google không xuất nổi thì nằm sẵn trong datalake. */
  if (!cfg?.url && !cfg?.hist) return qs;

  const themFile = (f) => {
    qs.append('url', f.url);
    qs.append('gid', f.gid || '0');
    /* duong: để trống là đường mặc định (bản công bố / export). 'gviz' dành
       cho file Google không còn xuất nổi bằng hai đường kia. Phải append
       theo từng file để server ghép đúng cặp với url. */
    qs.append('duong', f.duong || '');
    if (f.qs?.month) {
      qs.append('month', String(f.qs.month));
      qs.append('year', String(f.qs.year || ''));
    }
  };
  if (cfg.url) themFile(cfg);
  for (const m of cfg.mains || []) themFile(m);

  if (cfg.hist) qs.set('hist', '1');
  for (const [k, v] of Object.entries(cfg.qs || {})) {
    if (k === 'month' || k === 'year') continue; /* đã gắn theo từng file */
    qs.set(k, v);
  }

  for (const a of Array.isArray(cfg.api) ? cfg.api : cfg.api?.url ? [cfg.api] : []) {
    qs.append('url2', a.url);
    qs.append('gid2', a.gid || '0');
    if (a.san) qs.set('san2', a.san);
  }
  return qs;
}
