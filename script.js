/* ==========================================================
   1. Interactive line grid   2. Menu toggle   3. Fade in on scroll
   ========================================================== */

const grid = document.getElementById('lineGrid');

// Cell size comes from --cell in styles.css, so there's one place to change it.
const CELL = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--cell'), 10) || 36;

// Ripple: how far it spreads (in cells) and the delay per cell of distance.
const RIPPLE_RADIUS = 2;      // 0 = off
const RIPPLE_DELAY_MS = 90;

let cellsGrid = [];           // cellsGrid[row][col] = { cell, line, api }

// One state machine per line: idle -> to90 -> at90 -> to0 -> idle.
// A line always finishes its full rotation before reversing.
function wireLine(line) {
  let state = 'idle';
  let pendingLeave = false;
  let pendingEnter = false;

  const startForward = () => { state = 'to90'; line.classList.add('rotated'); };
  const startReverse = () => { state = 'to0';  line.classList.remove('rotated'); };

  function enter() {
    if (state === 'idle') startForward();
    else if (state === 'to0') pendingEnter = true;
    else pendingLeave = false;
  }

  function leave() {
    if (state === 'at90') startReverse();
    else if (state === 'to90') pendingLeave = true;
    else if (state === 'to0') pendingEnter = false;
  }

  line.addEventListener('transitionend', (e) => {
    if (e.propertyName !== 'transform') return;
    if (state === 'to90') {
      state = 'at90';
      if (pendingLeave) { pendingLeave = false; startReverse(); }
    } else if (state === 'to0') {
      state = 'idle';
      if (pendingEnter) { pendingEnter = false; startForward(); }
    }
  });

  return { enter, leave };
}

// Schedule `trigger` on every neighbour within RIPPLE_RADIUS, delayed by distance.
function rippleTimers(row, col, trigger) {
  const timers = [];
  for (let r = row - RIPPLE_RADIUS; r <= row + RIPPLE_RADIUS; r++) {
    for (let c = col - RIPPLE_RADIUS; c <= col + RIPPLE_RADIUS; c++) {
      if (r === row && c === col) continue;
      const target = cellsGrid[r] && cellsGrid[r][c];
      if (!target) continue;
      const distance = Math.hypot(r - row, c - col);
      if (distance > RIPPLE_RADIUS) continue;
      timers.push(setTimeout(() => trigger(target.api), distance * RIPPLE_DELAY_MS));
    }
  }
  return timers;
}

function buildGrid() {
  if (!grid) return;
  grid.innerHTML = '';

  const cols = Math.ceil(window.innerWidth / CELL) + 1;
  const rows = Math.ceil(window.innerHeight / CELL) + 1;

  // Force the exact grid so row/col maths matches what's on screen.
  grid.style.gridTemplateColumns = `repeat(${cols}, ${CELL}px)`;
  grid.style.gridTemplateRows = `repeat(${rows}, ${CELL}px)`;

  cellsGrid = [];
  for (let row = 0; row < rows; row++) {
    const rowArr = [];
    for (let col = 0; col < cols; col++) {
      const cell = document.createElement('div');
      cell.className = 'line-cell';
      const line = document.createElement('div');
      line.className = 'line';
      cell.appendChild(line);
      grid.appendChild(cell);
      rowArr.push({ cell, line, api: wireLine(line) });
    }
    cellsGrid.push(rowArr);
  }

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const { cell, api } = cellsGrid[row][col];
      let timers = [];

      const on = () => {
        timers.forEach(clearTimeout);
        api.enter();
        timers = rippleTimers(row, col, (n) => n.enter());
      };
      const off = () => {
        timers.forEach(clearTimeout);
        api.leave();
        timers = rippleTimers(row, col, (n) => n.leave());
      };

      cell.addEventListener('mouseenter', on);
      cell.addEventListener('mouseleave', off);

      // Touch: finger down = hover, finger up = leave.
      // No preventDefault here, or the grid would block page scrolling.
      cell.addEventListener('touchstart', on,  { passive: true });
      cell.addEventListener('touchend',   off, { passive: true });
    }
  }
}

buildGrid();

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(buildGrid, 150);
});

/* ---------- Menu toggle ---------- */
const menuToggle = document.getElementById('menuToggle');
const menuOverlay = document.getElementById('menuOverlay');

if (menuToggle && menuOverlay) {
  const setMenu = (open) => {
    menuOverlay.classList.toggle('is-open', open);
    menuToggle.classList.toggle('is-open', open);
    menuToggle.textContent = open ? 'Close' : 'Menu';
  };

  menuToggle.addEventListener('click', () => setMenu(!menuOverlay.classList.contains('is-open')));
  menuOverlay.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
}

/* ---------- Fade in on scroll ---------- */
// Add or remove selectors here to change what animates.
const REVEAL = [
  '.home-title', '.home-intro',
  '.section-light .col', '.section-light .label', '.project-thumb',
  '.project-hero', '.project-text', '.project-side', '.project-tree',
  '.footer-top', '.footer-title'
];

const revealEls = document.querySelectorAll(REVEAL.join(','));

if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      io.unobserve(entry.target);          // animate once only
    });
  }, { threshold: 0.15 });

  revealEls.forEach((el) => {
    // Small stagger between siblings, e.g. left column then right column
    const i = Array.from(el.parentElement.children).indexOf(el);
    el.style.setProperty('--delay', `${Math.min(i, 3) * 0.12}s`);
    el.classList.add('reveal');
    io.observe(el);
  });

  // Fast scrolls or menu jumps can skip past an element without the observer
  // noticing, so anything above the viewport is revealed too.
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      revealEls.forEach((el) => {
        if (el.getBoundingClientRect().top < 0) el.classList.add('is-visible');
      });
      ticking = false;
    });
  }, { passive: true });
}