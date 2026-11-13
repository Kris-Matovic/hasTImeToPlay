/* ==========================================================
   Strip sun (About page header)
   A circle made of horizontal strips on springs.
   At rest, a gentle band scans top to bottom on a loop.
   The pointer pulls strips out to it, or pushes them in
   when it is inside the circle.
   ========================================================== */

(() => {
  const canvas = document.getElementById('stripSun');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Settings ---------- */
  const STRIPS     = 22;     // number of strips in the circle
  const BAND       = 2.2;    // thickness of the scan / pointer band, in strips
  const SCAN_TIME  = 5;      // seconds for one top-to-bottom pass
  const SCAN_REACH = 0.22;   // how far the scan stretches strips (0–1)
  const EXAGGERATE = 0.15;   // how hard the pointer pushes and pulls
  const WOBBLE     = 0.65;   // 0 = settles cleanly, 1 = jelly
  const SIZE       = 0.4;    // circle radius as a share of the header height
  const DROP       = 0.55;   // circle centre, as a share of the header height (above 0.5 sits lower, clear of the nav)

  // Lavender at rest, lime at full stretch
  const REST    = [204, 204, 236];
  const STRETCH = [207, 255, 179];

  /* ---------- Colour: blend in OKLab so the middle stays clean ---------- */
  const toLin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const toSrgb = (c) => Math.round(255 * Math.min(1, Math.max(0, c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)));

  function toOklab([r, g, b]) {
    r = toLin(r); g = toLin(g); b = toLin(b);
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
            1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
            0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s];
  }

  function toRgb([L, a, b]) {
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
    return `rgb(${toSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s)},` +
           `${toSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s)},` +
           `${toSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s)})`;
  }

  const A = toOklab(REST), B = toOklab(STRETCH);
  const RAMP = Array.from({ length: 65 }, (_, i) => toRgb(A.map((v, k) => v + (B[k] - v) * (i / 64))));
  const colourAt = (t) => RAMP[Math.round(Math.min(1, Math.max(0, t)) * 64)];

  /* ---------- Geometry ---------- */
  let W = 0, H = 0, dpr = 1, cx = 0, cy = 0, R = 0;
  const strips = Array.from({ length: STRIPS }, () => ({ l: 0, r: 0, vl: 0, vr: 0 }));

  function build() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    cx = W / 2;
    cy = H * DROP;
    R = Math.min(W * 0.32, H * SIZE);
  }

  const chord = (y) => { const d = Math.abs(y - cy); return d >= R ? 0 : Math.sqrt(R * R - d * d); };

  /* ---------- Pointer ---------- */
  const P = { x: 0, y: 0, active: false, energy: 0 };

  function pointerAt(e) {
    const rect = canvas.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top];
  }

  canvas.addEventListener('pointerdown', (e) => {
    [P.x, P.y] = pointerAt(e);
    P.active = true;
    P.energy = 0.6;
  });

  canvas.addEventListener('pointermove', (e) => {
    const [x, y] = pointerAt(e);
    if (P.active) P.energy = Math.min(1.5, P.energy + Math.hypot(x - P.x, y - P.y) / 90);  // fast moves react harder
    P.x = x;
    P.y = y;
    P.active = true;
  });

  const release = () => { P.active = false; };
  canvas.addEventListener('pointerleave', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') release(); });

  /* ---------- Loop ---------- */
  let visible = true, running = false, last = 0;
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
    const h = (2 * R) / STRIPS;
    const maxEdge = W / 2 + 4;

    const k = 70;                                         // spring stiffness
    const damp = 2 * Math.sqrt(k) * (1 - WOBBLE * 0.85);

    // Gentle scan: enters above the circle, exits below, starts again at the top.
    const scanPos = -0.2 + ((t % SCAN_TIME) / SCAN_TIME) * 1.4;
    const scanAmt = reduceMotion ? 0 : SCAN_REACH * (P.active ? 0.2 : 1);
    P.energy *= Math.exp(-dt * 1.2);
    const gain = 1 + EXAGGERATE * (0.3 + 0.7 * P.energy);
    const sig = BAND / STRIPS;

    for (let i = 0; i < STRIPS; i++) {
      const s = strips[i];
      const ym = cy - R + (i + 0.5) * h;
      const w0 = chord(ym);
      const room = maxEdge - w0;

      const d = (i + 0.5) / STRIPS - scanPos;
      const scan = room * scanAmt * Math.exp(-(d * d) / (2 * sig * sig));
      let tl = scan, tr = scan;

      if (P.active) {
        const sigma = h * BAND * (1 + 0.6 * P.energy);
        const g = Math.exp(-((ym - P.y) ** 2) / (2 * sigma * sigma));
        // Positive: pointer is outside the strip, pull out to it. Negative: inside, push the edge in.
        let move = (Math.abs(P.x - cx) - w0) * g * gain;
        move = Math.max(-w0 * 0.85, Math.min(room * 1.2, move));
        const other = -move * 0.3 * EXAGGERATE;           // far side gives way
        if (P.x > cx) { tr += move; tl += other; } else { tl += move; tr += other; }
      }

      s.vl += (k * (tl - s.l) - damp * s.vl) * dt;  s.l += s.vl * dt;
      s.vr += (k * (tr - s.r) - damp * s.vr) * dt;  s.r += s.vr * dt;
    }

    draw(maxEdge, h);
    requestAnimationFrame(frame);
  }

  function draw(maxEdge, h) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);                          // header background shows through
    ctx.lineWidth = 0.6;

    for (let i = 0; i < STRIPS; i++) {
      const s = strips[i];
      const y0 = cy - R + i * h;
      const w0 = chord(y0 + h / 2);
      const stretch = Math.max(0, s.l, s.r) / Math.max(1, maxEdge - w0);
      const colour = colourAt(stretch * 1.15);
      ctx.fillStyle = colour;
      ctx.strokeStyle = colour;                         // hides hairline seams

      // Each strip keeps the circle's curve, shifted out (or in) by its stretch.
      const edge = (y) => {
        let r = chord(y) + s.r, l = chord(y) + s.l;
        if (r + l < 1) { const m = (r - l) / 2; r = m + 0.5; l = 0.5 - m; }   // never turn inside out
        return [r, l];
      };

      ctx.beginPath();
      for (let j = 0; j <= 6; j++) { const y = y0 + (h * j) / 6; ctx.lineTo(cx + edge(y)[0], y); }
      for (let j = 6; j >= 0; j--) { const y = y0 + (h * j) / 6; ctx.lineTo(cx - edge(y)[1], y); }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  /* ---------- Start, resize, pause off-screen ---------- */
  build();
  start();

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(build, 150);
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      start();
    }).observe(canvas);
  }
})();