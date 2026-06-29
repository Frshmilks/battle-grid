/* STATE */
let currentTheme = "galaxy";

const themes = {
  galaxy:  { title: "Space Galaxy",   x: "🚀", o: "🪐" },
  knight:  { title: "Knight Kingdom", x: "🛡️", o: "🐉" },
  sakura:  { title: "Sakura Garden",  x: "🌸", o: "🍁" },
  element: { title: "Element Arena",  x: "🔥", o: "💧" },
  fruit:   { title: "Fruit Punch",    x: "🍒", o: "🍉" },
  animal:  { title: "Animal Zoo",     x: "🦉", o: "🐸" },
};

const WIN_PATTERNS = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6]
];

let board         = Array(9).fill('');
let currentPlayer = 'X';
let mode          = '';
let difficulty    = 'medium';
let scores        = { x: 0, o: 0, draw: 0 };
let gameActive    = false;
let botTimer      = null;
let lastMove      = -1;
let themePickerFromGame = false;

const getXIcon = () => themes[currentTheme].x;
const getOIcon = () => themes[currentTheme].o;

/* GAME LOGIC */
function calcWinner(b) {
  for (const [a, bi, c] of WIN_PATTERNS) {
    if (b[a] && b[a] === b[bi] && b[a] === b[c]) return { winner: b[a], line: [a, bi, c] };
  }
  return null;
}
function emptyIndices(b) { return b.map((c, i) => c === '' ? i : -1).filter(i => i >= 0); }

function minimax(b, isBotTurn) {
  const win = calcWinner(b);
  if (win?.winner === 'O') return 10;
  if (win?.winner === 'X') return -10;
  if (emptyIndices(b).length === 0) return 0;
  const s = [];
  for (const i of emptyIndices(b)) {
    const next = [...b]; next[i] = isBotTurn ? 'O' : 'X';
    s.push(minimax(next, !isBotTurn));
  }
  return isBotTurn ? Math.max(...s) : Math.min(...s);
}
function bestMove(b) {
  let best = -Infinity, move = emptyIndices(b)[0];
  for (const i of emptyIndices(b)) {
    const next = [...b]; next[i] = 'O';
    const score = minimax(next, false);
    if (score > best) { best = score; move = i; }
  }
  return move;
}
function findWinningMove(b, player) {
  for (const i of emptyIndices(b)) {
    const next = [...b]; next[i] = player;
    if (calcWinner(next)?.winner === player) return i;
  }
  return null;
}
function pickBotMove(b, diff) {
  const empty = emptyIndices(b);
  if (!empty.length) return -1;
  if (diff === 'easy') return empty[Math.floor(Math.random() * empty.length)];
  if (diff === 'medium') {
    const win = findWinningMove(b, 'O'); if (win !== null) return win;
    const block = findWinningMove(b, 'X'); if (block !== null) return block;
    if (b[4] === '') return 4;
    const corners = [0,2,6,8].filter(i => b[i] === '');
    if (corners.length && Math.random() < 0.6) return corners[Math.floor(Math.random() * corners.length)];
    return empty[Math.floor(Math.random() * empty.length)];
  }
  return bestMove(b);
}

/* LABELS */
function xLabel() {
  const icon = getXIcon();
  return mode === "bot" ? "Kamu " + icon : "Player 1 " + icon;
}
function oLabel() {
  const icon = getOIcon();
  return mode === "bot" ? "Bot " + icon : "Player 2 " + icon;
}

/* UI */
function updateStatus() {
  const el = document.getElementById('status');
  const result = calcWinner(board);
  const isDraw = !result && board.every(c => c !== '');

  if (!mode)  { el.textContent = 'Pilih Mode Permainan'; return; }
  if (result) { el.textContent = `${result.winner === 'X' ? xLabel() : oLabel()} Menang!`; return; }
  if (isDraw) { el.textContent = 'Permainan Seri!'; return; }

  if (mode === 'bot') {
    el.textContent = currentPlayer === 'X' ? 'Giliranmu...' : 'Giliran Bot...';
  } else {
    el.textContent = `Giliran ${currentPlayer === 'X' ? xLabel() : oLabel()}`;
  }
}

function updateScoreLabels() {
  document.getElementById('label-x').textContent    = xLabel();
  document.getElementById('label-o').textContent    = oLabel();
  document.getElementById('score-x').textContent    = scores.x;
  document.getElementById('score-draw').textContent = scores.draw;
  document.getElementById('score-o').textContent    = scores.o;
}

function renderBoard() {
  const cells = document.querySelectorAll('#board .cell-base');
  const result = calcWinner(board);
  cells.forEach((cell, i) => {
    const val = board[i];
    cell.className = 'cell-base';
    cell.innerHTML = '';
    if (val) {
      cell.classList.add(val === 'X' ? 'cell-x' : 'cell-o');
      if (result?.line.includes(i)) cell.classList.add('animate-pulse-glow');
      const span = document.createElement('span');
      span.className   = i === lastMove ? 'animate-pop' : '';
      span.textContent = val === 'X' ? getXIcon() : getOIcon();
      cell.appendChild(span);
    }
  });
  document.getElementById('board').classList.toggle('disabled', !mode);
}

function showPopup(text, isWin) {
  document.getElementById('popup-icon').textContent  = isWin ? '🏆' : '';
  document.getElementById('popup-title').textContent = text;
  document.getElementById('popup-overlay').classList.add('visible');
}
function closePopup() {
  document.getElementById('popup-overlay').classList.remove('visible');
}

/* SCREENS */
function startGame() {
  document.getElementById("splash").style.display = "none";
  document.getElementById("theme-screen").style.display = "flex";
  themePickerFromGame = false;
  document.getElementById("theme-back-row").style.display = "none";
}

function openThemePicker() {
  themePickerFromGame = true;
  document.getElementById("game").style.display = "none";
  document.getElementById("theme-screen").style.display = "flex";
  document.getElementById("theme-back-row").style.display = "block";
}

function closeThemePicker() {
  document.getElementById("theme-screen").style.display = "none";
  document.getElementById("game").style.display = "flex";
}

function selectTheme(theme) {
  currentTheme = theme;
  // strip prior theme-* class then apply
  document.body.className = document.body.className
    .split(/\s+/).filter(c => !c.startsWith('theme-')).join(' ');
  document.body.classList.add("theme-" + theme);

  document.getElementById("theme-screen").style.display = "none";
  document.getElementById("game").style.display = "flex";
  themePickerFromGame = false;
  document.getElementById("theme-back-row").style.display = "none";

  updateTheme();
}

function updateTheme() {
  const t = themes[currentTheme];
  document.querySelector(".game-title").textContent = t.title;
  document.querySelector(".splash-title").textContent = t.title;
  updateScoreLabels();
  renderBoard();
  updateStatus();
}

/* MODES */
function setMode(m) {
  mode = m;
  clearTimeout(botTimer);
  document.getElementById('btn-player').classList.toggle('btn-mode-active', m === 'player');
  document.getElementById('btn-bot').classList.toggle('btn-mode-active', m === 'bot');
  const diffSection = document.getElementById('difficulty-section');
  diffSection.style.display = m === 'bot' ? 'block' : 'none';
  diffSection.className     = m === 'bot' ? 'animate-float-in' : '';
  updateScoreLabels();
  resetBoardOnly();
}

function setDifficulty(d) {
  difficulty = d;
  clearTimeout(botTimer);
  ['easy','medium','hard'].forEach(name => {
    const btn = document.getElementById(`diff-${name}`);
    btn.className = 'btn-ghost';
    if (name === d) btn.classList.add(`btn-diff-${name}`);
  });
  resetBoardOnly();
}

function resetBoardOnly() {
  clearTimeout(botTimer);
  board         = Array(9).fill('');
  currentPlayer = 'X';
  gameActive    = !!mode;
  renderBoard();
  updateStatus();
}
function resetBoard() { closePopup(); resetBoardOnly(); }
function resetAll()   { scores = { x:0, o:0, draw:0 }; updateScoreLabels(); resetBoard(); }

function handleClick(i) {
  if (!gameActive || board[i] !== '') return;
  if (mode === 'bot' && currentPlayer !== 'X') return;
  board[i]      = currentPlayer;
  lastMove      = i;
  currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
  renderBoard();
  checkGameEnd();
  if (gameActive && mode === 'bot' && currentPlayer === 'O') scheduleBotMove();
}

function checkGameEnd() {
  const result = calcWinner(board);
  const isDraw = !result && board.every(c => c !== '');
  if (result) {
    gameActive = false;
    if (result.winner === 'X') scores.x++; else scores.o++;
    updateScoreLabels(); updateStatus();
    const label = result.winner === 'X' ? xLabel() : oLabel();
    setTimeout(() => showPopup(` ${label} Menang!`, true), 450);
  } else if (isDraw) {
    gameActive = false; scores.draw++;
    updateScoreLabels(); updateStatus();
    setTimeout(() => showPopup('Pertandingan Seri!', false), 300);
  } else {
    updateStatus();
  }
}

function scheduleBotMove() {
  const delay = difficulty === 'hard' ? 700 : difficulty === 'medium' ? 550 : 400;
  clearTimeout(botTimer);
  botTimer = setTimeout(() => {
    if (!gameActive || currentPlayer !== 'O') return;
    const choice = pickBotMove(board, difficulty);
    if (choice < 0) return;
    board[choice] = 'O';
    lastMove = choice;
    currentPlayer = 'X';
    renderBoard();
    checkGameEnd();
  }, delay);
}

/* INIT */
document.getElementById('diff-medium').classList.add('btn-diff-medium');
