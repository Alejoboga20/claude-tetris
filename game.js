'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

function drawBlockRetro(context, x, y, colorIndex, size, alpha) {
  const color = THEMES.retro.colors[colorIndex];
  context.globalAlpha = alpha;
  context.fillStyle = color;
  context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  // highlight
  context.fillStyle = 'rgba(255,255,255,0.12)';
  context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
  context.globalAlpha = 1;
}

function drawBlockNeon(context, x, y, colorIndex, size, alpha) {
  const color = THEMES.neon.colors[colorIndex];
  const px = x * size + 2;
  const py = y * size + 2;
  const s = size - 4;
  context.globalAlpha = alpha;
  context.shadowColor = color;
  context.shadowBlur = size * 0.6;
  context.fillStyle = color;
  context.fillRect(px, py, s, s);
  // reset glow before the crisp outline so it doesn't blur too
  context.shadowBlur = 0;
  context.shadowColor = 'transparent';
  context.strokeStyle = 'rgba(255,255,255,0.55)';
  context.lineWidth = 1;
  context.strokeRect(px + 0.5, py + 0.5, s - 1, s - 1);
  context.globalAlpha = 1;
}

function drawBlockPastel(context, x, y, colorIndex, size, alpha) {
  const color = THEMES.pastel.colors[colorIndex];
  const px = x * size + 2;
  const py = y * size + 2;
  const s = size - 4;
  const radius = Math.min(6, s / 2);
  context.globalAlpha = alpha;
  context.fillStyle = color;
  if (typeof context.roundRect === 'function') {
    context.beginPath();
    context.roundRect(px, py, s, s, radius);
    context.fill();
  } else {
    // fallback: simulate rounded corners by trimming the block slightly
    context.fillRect(px + 1, py, s - 2, s);
    context.fillRect(px, py + 1, s, s - 2);
  }
  context.fillStyle = 'rgba(255,255,255,0.25)';
  if (typeof context.roundRect === 'function') {
    context.beginPath();
    context.roundRect(px, py, s, s / 3, radius);
    context.fill();
  } else {
    context.fillRect(px + 1, py, s - 2, s / 3);
  }
  context.globalAlpha = 1;
}

function drawBlockPixel(context, x, y, colorIndex, size, alpha) {
  const color = THEMES.pixel.colors[colorIndex];
  const px = x * size + 1;
  const py = y * size + 1;
  const s = size - 2;
  context.globalAlpha = alpha;
  context.fillStyle = color;
  context.fillRect(px, py, s, s);
  // 4x4 dithering pattern for a pixelated texture
  const cell = s / 4;
  context.fillStyle = 'rgba(0,0,0,0.15)';
  for (let ry = 0; ry < 4; ry++) {
    for (let rx = 0; rx < 4; rx++) {
      if ((rx + ry) % 2 === 0) {
        context.fillRect(px + rx * cell, py + ry * cell, cell, cell);
      }
    }
  }
  context.fillStyle = 'rgba(255,255,255,0.18)';
  context.fillRect(px, py, s, 2);
  context.fillStyle = 'rgba(0,0,0,0.35)';
  context.fillRect(px, py + s - 2, s, 2);
  context.globalAlpha = 1;
}

// Retro y Pixel Art comparten la misma paleta base; solo cambia el dibujo del bloque.
const CLASSIC_COLORS = [null, '#4dd0e1', '#ffd54f', '#ba68c8', '#81c784', '#e57373', '#42a5f5', '#ffb74d'];

const THEMES = {
  retro: {
    label: 'Retro',
    gridColor: '#22222e',
    colors: CLASSIC_COLORS,
    drawBlock: drawBlockRetro,
  },
  neon: {
    label: 'Neon',
    gridColor: '#0a0a0a',
    colors: [null, '#00e5ff', '#faff00', '#e040fb', '#00ff6e', '#ff2e63', '#2979ff', '#ff9100'],
    drawBlock: drawBlockNeon,
  },
  pastel: {
    label: 'Pastel',
    gridColor: '#3a3440',
    colors: [null, '#a8dadc', '#ffe8a3', '#d8b4e2', '#b8e2c8', '#f4b6b6', '#a9c6e8', '#f6c99b'],
    drawBlock: drawBlockPastel,
  },
  pixel: {
    label: 'Pixel Art',
    gridColor: '#26221a',
    colors: CLASSIC_COLORS,
    drawBlock: drawBlockPixel,
  },
};

const THEME_STORAGE_KEY = 'tetris.theme';

function loadStoredTheme() {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored && THEMES[stored]) return stored;
  } catch (e) {
    // localStorage no disponible (modo privado, etc.) — usar el tema por defecto
  }
  return 'retro';
}

let theme = loadStoredTheme();

const PIECES = [
  null,
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
  [[2,2],[2,2]],                               // O
  [[0,3,0],[3,3,3],[0,0,0]],                  // T
  [[0,4,4],[4,4,0],[0,0,0]],                  // S
  [[5,5,0],[0,5,5],[0,0,0]],                  // Z
  [[6,0,0],[6,6,6],[0,0,0]],                  // J
  [[0,0,7],[7,7,7],[0,0,0]],                  // L
];

const LINE_SCORES = [0, 100, 300, 500, 800];

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const restartBtn = document.getElementById('restart-btn');
const saveRecordSection = document.getElementById('save-record-section');
const nameInput = document.getElementById('name-input');
const saveRecordBtn = document.getElementById('save-record-btn');
const overlayRecordsBody = document.getElementById('overlay-records-body');
const overlayRecordsEmpty = document.getElementById('overlay-records-empty');
const overlayResetBtn = document.getElementById('overlay-reset-btn');

const startScreen = document.getElementById('start-screen');
const startRecordsBody = document.getElementById('start-records-body');
const startRecordsEmpty = document.getElementById('start-records-empty');
const startBestCombo = document.getElementById('start-best-combo');
const startMaxLines = document.getElementById('start-max-lines');
const playBtn = document.getElementById('play-btn');
const startResetBtn = document.getElementById('start-reset-btn');

const RECORDS_KEY = 'tetris.records';
const MAX_RECORDS = 5;

const themeSelect = document.getElementById('theme-select');

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId;
let combo, bestCombo, maxLines, gameStarted;

/* ---- Records (localStorage) ---- */

function loadRecords() {
  try {
    const raw = localStorage.getItem(RECORDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(e => e && typeof e.score === 'number' && !Number.isNaN(e.score))
      .sort((a, b) => b.score - a.score);
  } catch (err) {
    return [];
  }
}

function persistRecords(records) {
  try {
    localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
  } catch (err) {
    // localStorage no disponible (modo privado, cuota llena, etc.) - degradamos sin romper el juego
  }
}

function qualifiesForTop(candidateScore, records) {
  const list = records ?? loadRecords();
  if (list.length < MAX_RECORDS) return true;
  const lowest = list[list.length - 1];
  return candidateScore > lowest.score;
}

function saveRecord(entry) {
  const records = loadRecords();
  records.push(entry);
  records.sort((a, b) => b.score - a.score);
  const truncated = records.slice(0, MAX_RECORDS);
  persistRecords(truncated);
  return truncated;
}

function resetRecords() {
  persistRecords([]);
}

function computeGlobalStats(records) {
  let bestComboAll = 0;
  let maxLinesAll = 0;
  for (const r of records) {
    if (typeof r.bestCombo === 'number') bestComboAll = Math.max(bestComboAll, r.bestCombo);
    if (typeof r.maxLines === 'number') maxLinesAll = Math.max(maxLinesAll, r.maxLines);
  }
  return { bestComboAll, maxLinesAll };
}

function addCell(tr, text) {
  const td = document.createElement('td');
  td.textContent = text;
  tr.appendChild(td);
}

function renderRecordsTable(tbody, emptyEl, records, highlightIndex) {
  tbody.innerHTML = '';
  if (!records.length) {
    if (emptyEl) emptyEl.classList.remove('hidden');
    return;
  }
  if (emptyEl) emptyEl.classList.add('hidden');
  records.forEach((r, i) => {
    const tr = document.createElement('tr');
    if (i === highlightIndex) tr.classList.add('record-new');
    addCell(tr, String(i + 1));
    addCell(tr, r.name || '---');
    addCell(tr, r.score.toLocaleString());
    addCell(tr, r.level ?? '');
    addCell(tr, r.lines ?? '');
    tbody.appendChild(tr);
  });
}

function renderStartScreen() {
  const records = loadRecords();
  renderRecordsTable(startRecordsBody, startRecordsEmpty, records, -1);
  const { bestComboAll, maxLinesAll } = computeGlobalStats(records);
  startBestCombo.textContent = bestComboAll;
  startMaxLines.textContent = maxLinesAll;
}

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function randomPiece() {
  const type = Math.floor(Math.random() * 7) + 1;
  const shape = PIECES[type].map(row => [...row]);
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
}

function collide(shape, ox, oy) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function rotateCW(shape) {
  const rows = shape.length, cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[c][rows - 1 - r] = shape[r][c];
  return result;
}

function tryRotate() {
  const rotated = rotateCW(current.shape);
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collide(rotated, current.x + kick, current.y)) {
      current.shape = rotated;
      current.x += kick;
      return;
    }
  }
}

function merge() {
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        board[current.y + r][current.x + c] = current.shape[r][c];
}

function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(v => v !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  if (cleared) {
    combo++;
    bestCombo = Math.max(bestCombo, combo);
    maxLines = Math.max(maxLines, cleared);
    lines += cleared;
    score += (LINE_SCORES[cleared] || 0) * level;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    updateHUD();
  } else {
    combo = 0;
  }
}

function ghostY() {
  let gy = current.y;
  while (!collide(current.shape, current.x, gy + 1)) gy++;
  return gy;
}

function hardDrop() {
  const gy = ghostY();
  score += (gy - current.y) * 2;
  current.y = gy;
  lockPiece();
}

function softDrop() {
  if (!collide(current.shape, current.x, current.y + 1)) {
    current.y++;
    score += 1;
    updateHUD();
  } else {
    lockPiece();
  }
}

function lockPiece() {
  if (gameOver) return;
  merge();
  clearLines();
  spawn();
}

function spawn() {
  current = next;
  next = randomPiece();
  if (collide(current.shape, current.x, current.y)) {
    endGame();
    return;
  }
  drawNext();
}

function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;
}

function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  THEMES[theme].drawBlock(context, x, y, colorIndex, size, alpha ?? 1);
  // no dejar glow/alpha del tema filtrándose al próximo draw call
  context.shadowBlur = 0;
  context.shadowColor = 'transparent';
  context.globalAlpha = 1;
}

function drawGrid() {
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = THEMES[theme].gridColor;
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * BLOCK, 0);
    ctx.lineTo(c * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * BLOCK);
    ctx.lineTo(COLS * BLOCK, r * BLOCK);
    ctx.stroke();
  }
}

function draw() {
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';
  ctx.globalAlpha = 1;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  // board
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      drawBlock(ctx, c, r, board[r][c], BLOCK);

  // ghost
  const gy = ghostY();
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);

  // current piece
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);
}

function drawNext() {
  const NB = 30;
  nextCtx.shadowBlur = 0;
  nextCtx.shadowColor = 'transparent';
  nextCtx.globalAlpha = 1;
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  const shape = next.shape;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(nextCtx, offX + c, offY + r, shape[r][c], NB);
}

function populateThemeSelect() {
  themeSelect.innerHTML = '';
  Object.keys(THEMES).forEach(name => {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = THEMES[name].label;
    themeSelect.appendChild(option);
  });
}

function applyThemeBodyClass() {
  Object.keys(THEMES).forEach(name => document.body.classList.remove(`theme-${name}`));
  document.body.classList.add(`theme-${theme}`);
}

function setTheme(newTheme) {
  if (!THEMES[newTheme] || newTheme === theme) return;
  theme = newTheme;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (e) {
    // localStorage no disponible — el tema no persiste entre sesiones
  }
  applyThemeBodyClass();
  // feedback inmediato aunque el juego esté pausado
  if (current) draw();
  if (next) drawNext();
}

function endGame() {
  gameOver = true;
  cancelAnimationFrame(animId);
  animId = null;
  overlayTitle.textContent = 'GAME OVER';
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()}`;
  overlay.classList.add('game-over');
  overlay.classList.remove('hidden');

  const records = loadRecords();
  renderRecordsTable(overlayRecordsBody, overlayRecordsEmpty, records, -1);

  if (qualifiesForTop(score, records)) {
    saveRecordSection.classList.remove('hidden');
    nameInput.value = '';
    saveRecordBtn.onclick = () => {
      const name = nameInput.value.trim() || 'Jugador';
      const entry = { name, score, lines, level, bestCombo, maxLines, date: new Date().toISOString() };
      const updated = saveRecord(entry);
      const idx = updated.indexOf(entry);
      renderRecordsTable(overlayRecordsBody, overlayRecordsEmpty, updated, idx);
      saveRecordSection.classList.add('hidden');
    };
    nameInput.focus();
  } else {
    saveRecordSection.classList.add('hidden');
  }
}

function togglePause() {
  if (!gameStarted || gameOver) return;
  paused = !paused;
  if (!paused) {
    lastTime = performance.now();
    loop(lastTime);
  } else {
    cancelAnimationFrame(animId);
    overlayTitle.textContent = 'PAUSA';
    overlayScore.textContent = '';
    overlay.classList.remove('game-over');
    overlay.classList.remove('hidden');
  }
}

function loop(ts) {
  if (gameOver || paused) return;
  const dt = ts - lastTime;
  lastTime = ts;
  dropAccum += dt;
  if (dropAccum >= dropInterval) {
    dropAccum = 0;
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
    } else {
      lockPiece();
    }
  }
  draw();
  animId = requestAnimationFrame(loop);
}

function init() {
  board = createBoard();
  score = 0;
  lines = 0;
  level = 1;
  paused = false;
  gameOver = false;
  dropInterval = 1000;
  dropAccum = 0;
  combo = 0;
  bestCombo = 0;
  maxLines = 0;
  gameStarted = true;
  lastTime = performance.now();
  next = randomPiece();
  spawn();
  updateHUD();
  startScreen.classList.add('hidden');
  saveRecordSection.classList.add('hidden');
  overlay.classList.remove('game-over');
  overlay.classList.add('hidden');
  cancelAnimationFrame(animId);
  if (!gameOver) animId = requestAnimationFrame(loop);
}

document.addEventListener('keydown', e => {
  if (!gameStarted) return;
  if (e.target === themeSelect) return; // no interferir con el selector de tema
  if (e.code === 'KeyP') { togglePause(); return; }
  if (paused || gameOver) return;
  switch (e.code) {
    case 'ArrowLeft':
      if (!collide(current.shape, current.x - 1, current.y)) current.x--;
      break;
    case 'ArrowRight':
      if (!collide(current.shape, current.x + 1, current.y)) current.x++;
      break;
    case 'ArrowDown':
      softDrop();
      break;
    case 'ArrowUp':
    case 'KeyX':
      tryRotate();
      break;
    case 'Space':
      e.preventDefault();
      hardDrop();
      break;
  }
  updateHUD();
});

restartBtn.addEventListener('click', init);

playBtn.addEventListener('click', init);

nameInput.addEventListener('keydown', e => {
  if (e.code === 'Enter') saveRecordBtn.click();
});

function handleResetRecords(afterReset) {
  if (!confirm('¿Seguro que querés borrar todos los records?')) return;
  resetRecords();
  afterReset();
}

startResetBtn.addEventListener('click', () => handleResetRecords(renderStartScreen));

overlayResetBtn.addEventListener('click', () => {
  handleResetRecords(() => {
    renderRecordsTable(overlayRecordsBody, overlayRecordsEmpty, [], -1);
    if (gameOver && qualifiesForTop(score)) {
      saveRecordSection.classList.remove('hidden');
    }
  });
});

populateThemeSelect();
themeSelect.value = theme;
applyThemeBodyClass();
themeSelect.addEventListener('change', e => setTheme(e.target.value));

renderStartScreen();
