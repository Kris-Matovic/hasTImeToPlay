/* ==========================================================
   Sway grid background
   Each tile corner eases right and back on its own clock.
   Columns start COL_DELAY apart, rows ROW_DELAY apart.
   The pointer drags nearby corners like a mesh.
   ========================================================== */

(() => {
  const canvas = document.getElementById('swayGrid');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Settings ---------- */
  const COL_DELAY = 0.1;   // seconds between neighbouring columns starting
  const ROW_DELAY = 0.3;   // seconds between neighbouring rows starting
  const DURATION  = 2;     // seconds for one move (right, or back left)
  const SWAY      = 2;     // sway distance, in tile widths
  const TILE_W    = 24;    // px
  const ROW_H     = 88;    // px, height of the top row
  const GROWTH    = 0.37;  // each row is 37% taller than the one above
  const DRAG      = 2;     // pointer pull strength, 0 = off
  const SPRING    = 60;    // how hard dragged points pull back
  const DAMPING   = 9;     // how quickly they stop wobbling

  // KAM-26-Pattern-01, in swatch order. Fills tiles left to right, top to bottom.
  const COLOURS = [
    'rgb(240,231,221)', 'rgb(254,251,243)', 'rgb(230,221,213)', 'rgb(249,241,221)',
    'rgb(192,169,251)', 'rgb(245,245,237)', 'rgb(240,234,228)', 'rgb(193,210,174)',
    'rgb(220,237,205)', 'rgb(207,255,179)', 'rgb(235,230,237)', 'rgb(218,214,255)'
  ];

  /* ---------- Motion ---------- */
  // Strong ease in-out: starts at rest, ramps up, lands at rest.
  const ease = (p) => (p < 0.5 ? 16 * p ** 5 : 1 - (-2 * p + 2) ** 5 / 2);

  // Offset for a point whose clock started `tau` seconds ago: right, then back, repeat.
  function sway(tau, amp) {
    if (tau <= 0) return 0;
    const p = (tau % (2 * DURATION)) / DURATION;
    return p < 1 ? amp * ease(p) : amp * (1 - ease(p - 1));
  }

  /* ---------- Grid ---------- */
  let W = 0, H = 0, dpr = 1, cols = 0, rows = 0, pad = 0;
  let baseX = [], baseY = [], pts = [], out = [];

  function build() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);

    pad = Math.ceil(SWAY) + 1;   // spare columns each side so the edges never show a gap
    cols = Math.ceil(W / TILE_W) + pad * 2;
    baseX = Array.from({ length: cols + 1 }, (_, c) => (c - pad) * TILE_W);

    baseY = [0];
    for (let y = 0, r = 0; y < H + 40; r++) {
      y += ROW_H * (1 + GROWTH) ** r;
      baseY.push(y);
    }
    rows = baseY.length - 1;

    pts = [];
    out = [];
    for (let r = 0; r <= rows; r++) {
      pts.push(Array.from({ length: cols + 1 }, () => ({ dx: 0, dy: 0, vx: 0, vy: 0 })));
      out.push([]);
    }
  }

  /* ---------- Pointer ---------- */
  const pointer = { x: 0, y: 0, vx: 0, vy: 0, active: false };

  function pointerAt(e) {
    const rect = canvas.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top];
  }

  canvas.addEventListener('pointerdown', (e) => {
    [pointer.x, pointer.y] = pointerAt(e);   // fresh touch: no jump from the last finger position
    pointer.active = true;
  });

  canvas.addEventListener('pointermove', (e) => {
    const [x, y] = pointerAt(e);
    if (pointer.active) { pointer.vx += x - pointer.x; pointer.vy += y - pointer.y; }
    pointer.x = x;
    pointer.y = y;
    pointer.active = true;
    start();
  });

  const release = () => { pointer.active = false; };
  canvas.addEventListener('pointerleave', release);
  canvas.addEventListener('pointercancel', release);

  /* ---------- Loop ---------- */
  let running = false, visible = true, last = 0;
  const t0 = performance.now();

  function start() {
    if (running || !visible) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(frame);
  }

  function frame(now) {
    if (!visible) { running = false; return; }

    const dt = Math.min((now - last) / 1000, 1 / 30);
    last = now;
    const t = (now - t0) / 1000;
    const amp = reduceMotion ? 0 : SWAY * TILE_W;
    const reach = Math.max(90, TILE_W * 5);
    const mvx = pointer.vx, mvy = pointer.vy;
    pointer.vx = pointer.vy = 0;
    let settling = false;

    for (let r = 0; r <= rows; r++) {
      for (let c = 0; c <= cols; c++) {
        const p = pts[r][c];
        const x = baseX[c] + sway(t - ((c - pad) * COL_DELAY + r * ROW_DELAY), amp);
        const y = baseY[r];

        if (DRAG && (mvx || mvy)) {
          const d = Math.hypot(x + p.dx - pointer.x, y + p.dy - pointer.y);
          if (d < reach) {
            const f = (1 - d / reach) ** 2 * DRAG * 7.2;
            p.vx += mvx * f;
            p.vy += mvy * f;
          }
        }

        p.vx += (-SPRING * p.dx - DAMPING * p.vx) * dt;
        p.vy += (-SPRING * p.dy - DAMPING * p.vy) * dt;
        p.dx += p.vx * dt;
        p.dy += p.vy * dt;
        if (Math.abs(p.vx) + Math.abs(p.vy) > 0.05) settling = true;

        // Top edge stays pinned vertically so the frame stays clean.
        out[r][c] = [x + p.dx, r === 0 ? y : y + p.dy];
      }
    }

    draw();

    // Reduced motion: only animate while the mesh is settling after a drag.
    if (!reduceMotion || settling) requestAnimationFrame(frame);
    else running = false;
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = COLOURS[0];
    ctx.fillRect(0, 0, W, H);

    const n = COLOURS.length;
    const perRow = cols - pad * 2;
    ctx.lineWidth = 0.6;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const colour = COLOURS[(((r * perRow + c - pad) % n) + n) % n];
        const a = out[r][c], b = out[r][c + 1], d = out[r + 1][c + 1], e = out[r + 1][c];
        ctx.fillStyle = colour;
        ctx.strokeStyle = colour;   // stroke hides hairline seams between tiles
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        ctx.lineTo(d[0], d[1]);
        ctx.lineTo(e[0], e[1]);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }
  }

  /* ---------- Start, resize, pause off-screen ---------- */
  build();
  start();

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { build(); start(); }, 150);
  });

  // Only animate while the home section is on screen.
  const home = document.getElementById('home');
  if (home && 'IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      start();
    }).observe(home);
  }
})();