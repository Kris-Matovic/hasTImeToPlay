const grid = document.getElementById('lineGrid');
const CELL = 36;

// How far the ripple spreads (in grid cells) and how much delay per
// cell of distance. Tweak these two numbers to taste.
const RIPPLE_RADIUS = 2;      // 0 = off, 1 = touches immediate neighbors, 2 = wider ripple
const RIPPLE_DELAY_MS = 30;   // delay added per cell of distance

let cellsGrid = []; // 2D array: cellsGrid[row][col] = { cell, line, api }

// Wires up one line's state machine and returns an "api" object so the
// ripple logic can trigger this line's enter/leave programmatically,
// exactly as if the mouse were really over it.
function wireLine(cell, line) {
  let state = 'idle'; // idle -> to90 -> at90 -> to0 -> idle
  let pendingLeave = false;
  let pendingEnter = false;

  function startForward() {
    state = 'to90';
    line.classList.add('rotated');
  }
  function startReverse() {
    state = 'to0';
    line.classList.remove('rotated');
  }

  function enter() {
    if (state === 'idle') {
      startForward();
    } else if (state === 'to0') {
      pendingEnter = true;
    } else if (state === 'to90') {
      pendingLeave = false;
    } else if (state === 'at90') {
      pendingLeave = false;
    }
  }

  function leave() {
    if (state === 'at90') {
      startReverse();
    } else if (state === 'to90') {
      pendingLeave = true;
    } else if (state === 'to0') {
      pendingEnter = false;
    }
  }

  line.addEventListener('transitionend', (e) => {
    if (e.propertyName !== 'transform') return;
    if (state === 'to90') {
      state = 'at90';
      if (pendingLeave) {
        pendingLeave = false;
        startReverse();
      }
    } else if (state === 'to0') {
      state = 'idle';
      if (pendingEnter) {
        pendingEnter = false;
        startForward();
      }
    }
  });

  return { enter, leave };
}

// Finds every cell within RIPPLE_RADIUS of (row, col) and schedules
// enter()/leave() on each, delayed proportionally to distance so the
// effect visibly radiates outward from the hovered line.
function rippleTimers(row, col, trigger) {
  const timers = [];
  for (let r = row - RIPPLE_RADIUS; r <= row + RIPPLE_RADIUS; r++) {
    for (let c = col - RIPPLE_RADIUS; c <= col + RIPPLE_RADIUS; c++) {
      if (r === row && c === col) continue; // the hovered line itself is handled separately
      const rowArr = cellsGrid[r];
      if (!rowArr || !rowArr[c]) continue;
      const distance = Math.sqrt((r - row) ** 2 + (c - col) ** 2);
      if (distance > RIPPLE_RADIUS) continue;
      const delay = distance * RIPPLE_DELAY_MS;
      const id = setTimeout(() => trigger(rowArr[c].api), delay);
      timers.push(id);
    }
  }
  return timers;
}

function buildGrid() {
  grid.innerHTML = '';
  const cols = Math.ceil(window.innerWidth / CELL) + 1;
  const rows = Math.ceil(window.innerHeight / CELL) + 1;

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

      const api = wireLine(cell, line);
      rowArr.push({ cell, line, api });
    }
    cellsGrid.push(rowArr);
  }

  // Wire up real mouse events, now that the full grid (and neighbor
  // lookups) exists.
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const { cell, api } = cellsGrid[row][col];
      let activeTimers = [];

      cell.addEventListener('mouseenter', () => {
        activeTimers.forEach(clearTimeout);
        api.enter();
        activeTimers = rippleTimers(row, col, (neighborApi) => neighborApi.enter());
      });

      cell.addEventListener('mouseleave', () => {
        activeTimers.forEach(clearTimeout);
        api.leave();
        activeTimers = rippleTimers(row, col, (neighborApi) => neighborApi.leave());
      });
    }
  }
}

buildGrid();

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(buildGrid, 150);
});
