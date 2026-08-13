/* ============================================================
   CHÉP TỪ REPO nhuquinhq/sop-pkt — assets/js/bpmn.js
   Bộ vẽ sơ đồ BPMN swimlane, xuất SVG thuần, không cần thư viện ngoài.
   Sửa thì sửa ở repo gốc rồi chép lại. Chỉ thêm dòng export ở cuối,
   phần vẽ giữ nguyên để hai nơi ra cùng một hình.
   ============================================================ */

const BP = {
  PAD_L: 12, LANE_LABEL_W: 40, PAD_T: 14, PAD_B: 18, PAD_R: 40,
  COL_W: 190, COL_GAP: 56, LANE_H: 132,
  NODE_W: 178, NODE_H: 66, GW: 46, EP: 18, R: 9
};

function bpGeom(n) {
  const left = BP.PAD_L + BP.LANE_LABEL_W + n.col * (BP.COL_W + BP.COL_GAP);
  const cx = left + BP.COL_W / 2;
  const cy = BP.PAD_T + n.lane * BP.LANE_H + BP.LANE_H / 2;
  let hw, hh;
  if (n.type === "task") { hw = BP.NODE_W / 2; hh = BP.NODE_H / 2; }
  else if (n.type === "gateway") { hw = BP.GW / 2; hh = BP.GW / 2; }
  else { hw = BP.EP / 2 + 9; hh = BP.EP / 2 + 9; }
  return { cx, cy, hw, hh };
}

/* Dựng path có bo góc từ danh sách điểm */
function bpPath(pts, r) {
  r = r || 10;
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i], a = pts[i - 1], b = pts[i + 1];
    const d1 = Math.hypot(p.x - a.x, p.y - a.y), d2 = Math.hypot(b.x - p.x, b.y - p.y);
    const rr = Math.max(0, Math.min(r, d1 / 2, d2 / 2));
    const u1 = { x: (a.x - p.x) / (d1 || 1), y: (a.y - p.y) / (d1 || 1) };
    const u2 = { x: (b.x - p.x) / (d2 || 1), y: (b.y - p.y) / (d2 || 1) };
    d += ` L ${(p.x + u1.x * rr).toFixed(1)} ${(p.y + u1.y * rr).toFixed(1)}`;
    d += ` Q ${p.x} ${p.y} ${(p.x + u2.x * rr).toFixed(1)} ${(p.y + u2.y * rr).toFixed(1)}`;
  }
  const last = pts[pts.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

function bpRoute(a, b) {
  const A = bpGeom(a), B = bpGeom(b);
  const forward = B.cx - B.hw > A.cx + A.hw + 8;
  if (forward) {
    const sx = A.cx + A.hw, sy = A.cy, ex = B.cx - B.hw, ey = B.cy;
    if (Math.abs(sy - ey) < 2) return { pts: [{ x: sx, y: sy }, { x: ex, y: ey }], lx: sx + 16, ly: sy - 9 };
    const mx = Math.max(sx + 26, Math.min(ex - 26, (sx + ex) / 2));
    return {
      pts: [{ x: sx, y: sy }, { x: mx, y: sy }, { x: mx, y: ey }, { x: ex, y: ey }],
      lx: sx + 14, ly: sy - 9
    };
  }
  /* Đường quay lại (rework) — chạy vòng dưới lane nguồn */
  const yb = A.cy + A.hh + (a.type === "gateway" || a.type === "start" || a.type === "end" ? 48 : 30);
  return {
    pts: [{ x: A.cx, y: A.cy + A.hh }, { x: A.cx, y: yb }, { x: B.cx, y: yb }, { x: B.cx, y: B.cy + B.hh }],
    lx: (A.cx + B.cx) / 2, ly: yb - 8, back: true
  };
}

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function bpLabelLines(n) {
  return String(n.label || "").split("\n");
}

function renderBPMN(sop) {
  const maxCol = Math.max(...sop.nodes.map(n => n.col));
  const W = BP.PAD_L + BP.LANE_LABEL_W + (maxCol + 1) * (BP.COL_W + BP.COL_GAP) - BP.COL_GAP + BP.PAD_R;
  const H = BP.PAD_T + sop.lanes.length * BP.LANE_H + BP.PAD_B;
  const byId = {}; sop.nodes.forEach(n => byId[n.id] = n);

  let s = `<svg class="bpmn" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Sơ đồ BPMN ${esc(sop.name)}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0,1 L9,5 L0,9 z" class="arrow"/>
    </marker>
  </defs>`;

  /* Lanes */
  sop.lanes.forEach((ln, i) => {
    const y = BP.PAD_T + i * BP.LANE_H;
    s += `<g class="lane lane--${ln.key}">
      <rect class="lane-band" x="${BP.PAD_L}" y="${y}" width="${W - BP.PAD_L - 8}" height="${BP.LANE_H}"/>
      <rect class="lane-tab" x="${BP.PAD_L}" y="${y}" width="${BP.LANE_LABEL_W}" height="${BP.LANE_H}"/>
      <text class="lane-text" transform="translate(${BP.PAD_L + BP.LANE_LABEL_W / 2 + 5},${y + BP.LANE_H / 2}) rotate(-90)">${esc(ln.short)}</text>
      <title>${esc(ln.name)}</title>
    </g>`;
  });

  /* Edges */
  const outIdx = {};
  sop.edges.forEach(e => {
    const a = byId[e.from], b = byId[e.to];
    if (!a || !b) return;
    const k = (outIdx[e.from] = (outIdx[e.from] || 0) + 1) - 1;
    const r = bpRoute(a, b);
    if (!r.back && k > 0) r.ly += k * 17;
    const cls = "edge" + (e.type === "back" ? " edge--back" : "") + (e.type === "msg" ? " edge--msg" : "");
    s += `<path class="${cls}" d="${bpPath(r.pts, BP.R)}" marker-end="url(#ah)"/>`;
    if (e.label) {
      const w = e.label.length * 6.2 + 12;
      s += `<g class="edge-label"><rect x="${(r.lx - 4).toFixed(1)}" y="${(r.ly - 11).toFixed(1)}" width="${w.toFixed(0)}" height="16" rx="4"/><text x="${(r.lx + 2).toFixed(1)}" y="${(r.ly + 1).toFixed(1)}">${esc(e.label)}</text></g>`;
    }
  });

  /* Nodes */
  sop.nodes.forEach(n => {
    const g = bpGeom(n);
    const laneKey = sop.lanes[n.lane].key;
    const clickable = n.type === "task" || n.type === "gateway";
    const attrs = `class="node node--${n.type} node--${laneKey}${clickable ? " is-clickable" : ""}" data-node="${n.id}"${clickable ? ' tabindex="0" role="button"' : ""}`;
    s += `<g ${attrs}>`;
    const lines = bpLabelLines(n);

    if (n.type === "task") {
      s += `<rect class="shape" x="${g.cx - g.hw}" y="${g.cy - g.hh}" width="${BP.NODE_W}" height="${BP.NODE_H}" rx="10"/>`;
      s += `<rect class="accent" x="${g.cx - g.hw + 1}" y="${g.cy - g.hh + 11}" width="4" height="${BP.NODE_H - 22}" rx="2"/>`;
      const hasTag = !!n.tag;
      const lh = 14;
      const blockH = lines.length * lh + (hasTag ? 15 : 0);
      let ty = g.cy - blockH / 2 + 11;
      lines.forEach(t => { s += `<text class="n-label" x="${g.cx + 2}" y="${ty}">${esc(t)}</text>`; ty += lh; });
      if (hasTag) s += `<text class="n-tag" x="${g.cx + 2}" y="${ty + 2}">${esc(n.tag)}</text>`;
      s += `<circle class="dot" cx="${g.cx + g.hw - 12}" cy="${g.cy - g.hh + 12}" r="2.5"/>`;
    } else if (n.type === "gateway") {
      s += `<rect class="shape" x="${g.cx - 17}" y="${g.cy - 17}" width="34" height="34" rx="5" transform="rotate(45 ${g.cx} ${g.cy})"/>`;
      s += `<text class="g-mark" x="${g.cx}" y="${g.cy + 5}">${n.gw === "parallel" ? "+" : "×"}</text>`;
      let ty = g.cy + g.hh + 15;
      lines.forEach(t => { s += `<text class="g-label" x="${g.cx}" y="${ty}">${esc(t)}</text>`; ty += 12; });
    } else {
      s += `<circle class="shape" cx="${g.cx}" cy="${g.cy}" r="${BP.EP}"/>`;
      let ty = g.cy + BP.EP + 15;
      lines.forEach(t => { s += `<text class="g-label" x="${g.cx}" y="${ty}">${esc(t)}</text>`; ty += 12; });
    }
    if (clickable) s += `<title>${esc(n.label.replace(/\n/g, " "))} — bấm để xem chi tiết</title>`;
    s += `</g>`;
  });

  s += `</svg>`;
  return s;
}


export { renderBPMN };
