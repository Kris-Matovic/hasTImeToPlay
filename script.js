const grid = document.getElementById('lineGrid');
const CELL = 66;

// Each line tracks its own state so a quick mouse-out can't cut the
// forward rotation short. The reverse only starts once the forward
// animation has fully finished (and vice versa on rapid re-entry).
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

  cell.addEventListener('mouseenter', () => {
    if (state === 'idle') {
      startForward();
    } else if (state === 'to0') {
      pendingEnter = true;
    } else if (state === 'to90') {
      pendingLeave = false;
    } else if (state === 'at90') {
      pendingLeave = false;
    }
  });

  cell.addEventListener('mouseleave', () => {
    if (state === 'at90') {
      startReverse();
    } else if (state === 'to90') {
      pendingLeave = true;
    } else if (state === 'to0') {
      pendingEnter = false;
    }
  });

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
}

function buildGrid() {
  grid.innerHTML = '';
  const cols = Math.ceil(window.innerWidth / CELL) + 1;
  const rows = Math.ceil(window.innerHeight / CELL) + 1;
  for (let i = 0; i < cols * rows; i++) {
    const cell = document.createElement('div');
    cell.className = 'line-cell';
    const line = document.createElement('div');
    line.className = 'line';
    cell.appendChild(line);
    grid.appendChild(cell);
    wireLine(cell, line);
  }
}

buildGrid();

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(buildGrid, 150);
});
