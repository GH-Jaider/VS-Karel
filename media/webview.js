/**
 * Karel World Webview Client Script
 * Handles UI interactions and world rendering
 */

const vscode = acquireVsCodeApi();
const canvas = document.getElementById('worldCanvas');
const ctx = canvas.getContext('2d');

// World state
let world = null;
const CELL_SIZE = 40;
const WALL_WIDTH = 4;
const AXIS_MARGIN = 25; // Space for axis labels

// UI Elements
const runBtn = document.getElementById('runBtn');
const stepBtn = document.getElementById('stepBtn');
const stopBtn = document.getElementById('stopBtn');
const resetBtn = document.getElementById('resetBtn');
const changeProgramBtn = document.getElementById('changeProgramBtn');
const statusEl = document.getElementById('status');
const speedSlider = document.getElementById('speed');
const speedValue = document.getElementById('speedValue');

// Button handlers
runBtn.addEventListener('click', () => vscode.postMessage({ command: 'run' }));
stepBtn.addEventListener('click', () => vscode.postMessage({ command: 'step' }));
stopBtn.addEventListener('click', () => vscode.postMessage({ command: 'stop' }));
resetBtn.addEventListener('click', () => vscode.postMessage({ command: 'reset' }));
changeProgramBtn.addEventListener('click', () => vscode.postMessage({ command: 'changeProgram' }));

speedSlider.addEventListener('input', (e) => {
  const speed = parseInt(e.target.value);
  speedValue.textContent = speed + 'ms';
  vscode.postMessage({ command: 'speedChange', data: speed });
});

// Handle messages from extension
window.addEventListener('message', (event) => {
  const message = event.data;

  switch (message.type) {
    case 'updateWorld':
      world = message.data;
      render();
      updateInfoPanel();
      updateModifiedIndicator(message.isModified);
      break;
    case 'status':
      setStatus(message.status, message.message);
      break;
    case 'highlightLine':
      // Could highlight line number in info panel
      break;
  }
});

function setStatus(status, message) {
  statusEl.className = 'status ' + status;
  statusEl.textContent = message || status.charAt(0).toUpperCase() + status.slice(1);

  const isRunning = status === 'running';
  runBtn.disabled = isRunning;
  stepBtn.disabled = isRunning;
  stopBtn.disabled = !isRunning;
}

function updateModifiedIndicator(isModified) {
  if (isModified) {
    runBtn.classList.add('modified');
    runBtn.title = 'Run (⚠️ World Modified - will show confirmation)';
  } else {
    runBtn.classList.remove('modified');
    runBtn.title = 'Run (Ctrl+Shift+R)';
  }
}

function updateInfoPanel() {
  if (!world) return;

  document.getElementById('position').textContent =
    '(' + world.karel.x + ', ' + world.karel.y + ')';

  const directions = ['North', 'West', 'South', 'East'];
  document.getElementById('facing').textContent = directions[world.karel.facing];

  document.getElementById('beepers').textContent = world.karel.beepers.toString();
}

function render() {
  if (!world) return;

  const { width, height } = world.dimensions;

  // Resize canvas with space for axis labels (left and bottom)
  canvas.width = AXIS_MARGIN + width * CELL_SIZE + WALL_WIDTH * 2;
  canvas.height = AXIS_MARGIN + height * CELL_SIZE + WALL_WIDTH * 2;

  // Grid starts after the axis margin
  const gridOffsetX = AXIS_MARGIN;
  const gridOffsetY = 0;

  // Clear
  ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--cell-bg') || '#1e1e1e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw axis labels
  ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--fg-color') || '#ccc';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // X-axis labels (bottom) - centered under each cell
  for (let x = 1; x <= width; x++) {
    const labelX = gridOffsetX + WALL_WIDTH + (x - 0.5) * CELL_SIZE;
    const labelY = canvas.height - AXIS_MARGIN / 2;
    ctx.fillText(x.toString(), labelX, labelY);
  }

  // Y-axis labels (left) - centered next to each row
  for (let y = 1; y <= height; y++) {
    const labelX = AXIS_MARGIN / 2;
    const labelY = gridOffsetY + WALL_WIDTH + (height - y + 0.5) * CELL_SIZE;
    ctx.fillText(y.toString(), labelX, labelY);
  }

  // Draw grid
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1;

  for (let x = 0; x <= width; x++) {
    ctx.beginPath();
    ctx.moveTo(gridOffsetX + WALL_WIDTH + x * CELL_SIZE, gridOffsetY + WALL_WIDTH);
    ctx.lineTo(gridOffsetX + WALL_WIDTH + x * CELL_SIZE, gridOffsetY + WALL_WIDTH + height * CELL_SIZE);
    ctx.stroke();
  }

  for (let y = 0; y <= height; y++) {
    ctx.beginPath();
    ctx.moveTo(gridOffsetX + WALL_WIDTH, gridOffsetY + WALL_WIDTH + y * CELL_SIZE);
    ctx.lineTo(gridOffsetX + WALL_WIDTH + width * CELL_SIZE, gridOffsetY + WALL_WIDTH + y * CELL_SIZE);
    ctx.stroke();
  }

  // Draw beepers
  ctx.fillStyle = '#f0c040';
  for (const beeper of world.beepers) {
    const cx = gridOffsetX + WALL_WIDTH + (beeper.x - 0.5) * CELL_SIZE;
    const cy = gridOffsetY + WALL_WIDTH + (height - beeper.y + 0.5) * CELL_SIZE;

    ctx.beginPath();
    ctx.arc(cx, cy, CELL_SIZE / 4, 0, Math.PI * 2);
    ctx.fill();

    // Show count if > 1
    if (beeper.count > 1) {
      ctx.fillStyle = '#000';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(beeper.count.toString(), cx, cy);
      ctx.fillStyle = '#f0c040';
    }
  }

  // Draw walls
  ctx.strokeStyle = '#888';
  ctx.lineWidth = WALL_WIDTH;
  ctx.lineCap = 'round';

  for (const wall of world.walls) {
    const { from, to } = wall;

    // Wall is drawn on the shared edge between from and to cells
    // Calculate the grid line position where the wall should be drawn
    ctx.beginPath();
    if (from.x === to.x) {
      // Cells are vertically adjacent (same x, different y)
      // Wall is horizontal, drawn between the two cells
      const wallY = Math.max(from.y, to.y); // The y coordinate of the upper cell
      const screenX = gridOffsetX + WALL_WIDTH + (from.x - 1) * CELL_SIZE;
      const screenY = gridOffsetY + WALL_WIDTH + (height - wallY + 1) * CELL_SIZE;
      ctx.moveTo(screenX, screenY);
      ctx.lineTo(screenX + CELL_SIZE, screenY);
    } else {
      // Cells are horizontally adjacent (same y, different x)
      // Wall is vertical, drawn between the two cells
      const wallX = Math.max(from.x, to.x); // The x coordinate of the right cell
      const screenX = gridOffsetX + WALL_WIDTH + (wallX - 1) * CELL_SIZE;
      const screenY = gridOffsetY + WALL_WIDTH + (height - from.y) * CELL_SIZE;
      ctx.moveTo(screenX, screenY);
      ctx.lineTo(screenX, screenY + CELL_SIZE);
    }
    ctx.stroke();
  }

  // Draw border walls
  ctx.strokeStyle = '#666';
  ctx.lineWidth = WALL_WIDTH;
  ctx.strokeRect(
    gridOffsetX + WALL_WIDTH / 2,
    gridOffsetY + WALL_WIDTH / 2,
    width * CELL_SIZE + WALL_WIDTH,
    height * CELL_SIZE + WALL_WIDTH
  );

  // Draw Karel
  drawKarel(world.karel, height, gridOffsetX, gridOffsetY);
}

function drawKarel(karel, worldHeight, gridOffsetX, gridOffsetY) {
  const cx = gridOffsetX + WALL_WIDTH + (karel.x - 0.5) * CELL_SIZE;
  const cy = gridOffsetY + WALL_WIDTH + (worldHeight - karel.y + 0.5) * CELL_SIZE;
  const size = CELL_SIZE * 0.7;

  ctx.save();
  ctx.translate(cx, cy);

  // Rotate based on facing direction
  // Canvas rotation is clockwise for positive values
  // N=0°, W=-90° (or 270°), S=180°, E=90°
  const rotations = [0, -Math.PI / 2, Math.PI, Math.PI / 2]; // N, W, S, E
  ctx.rotate(rotations[karel.facing]);

  // Draw Karel as a triangle pointing up (north)
  ctx.fillStyle = '#4080f0';
  ctx.beginPath();
  ctx.moveTo(0, -size / 2);
  ctx.lineTo(-size / 3, size / 3);
  ctx.lineTo(size / 3, size / 3);
  ctx.closePath();
  ctx.fill();

  // Draw outline
  ctx.strokeStyle = '#2060d0';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.restore();
}

// Initial render with empty world
render();
