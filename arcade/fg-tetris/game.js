/* =========================================================================
 * FG TETRIS — Web Edition
 * HTML5 Canvas + Vanilla JS. No build step, deployable as a static site.
 * Ported in spirit from the original PYTRIS / FG_TETRIS pygame project.
 * ========================================================================= */
'use strict';

/* ---------- Board constants ---------- */
const COLS = 10;
const ROWS = 20;
const HIDDEN = 2;          // hidden spawn rows above the visible field
const TOTAL_ROWS = ROWS + HIDDEN;

/* ---------- Colors (match original block_images palette) ---------- */
// index: 1=I 2=J 3=L 4=O 5=S 6=T 7=Z
const COLORS = {
  1: '#22d3ee', // I - cyan
  2: '#3b82f6', // J - blue
  3: '#f97316', // L - orange
  4: '#facc15', // O - yellow
  5: '#22c55e', // S - green
  6: '#a855f7', // T - purple
  7: '#ef4444', // Z - red
  G: 'rgba(255,255,255,0.12)', // ghost
};

/* ---------- Tetromino spawn shapes (value = color index) ---------- */
const SHAPES = {
  I: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
  J: [[2,0,0],[2,2,2],[0,0,0]],
  L: [[0,0,3],[3,3,3],[0,0,0]],
  O: [[4,4],[4,4]],
  S: [[0,5,5],[5,5,0],[0,0,0]],
  T: [[0,6,0],[6,6,6],[0,0,0]],
  Z: [[7,7,0],[0,7,7],[0,0,0]],
};
const PIECE_KEYS = ['I','J','L','O','S','T','Z'];

/* ---------- Mode tuning ---------- */
// gravity = frames-per-step base; lower = faster. Speed scales with level.
const MODES = {
  easy:     { label: 'EASY',     startLevel: 1, gravityBase: 52, accel: 3.2, timeAttack: 0,  endless: false },
  hard:     { label: 'HARD',     startLevel: 4, gravityBase: 30, accel: 2.4, timeAttack: 0,  endless: false },
  training: { label: 'TRAINING', startLevel: 1, gravityBase: 60, accel: 0.0, timeAttack: 0,  endless: true  },
};

/* ---------- Scoring (per cleared lines, multiplied by level) ---------- */
const LINE_SCORE = { 1: 100, 2: 300, 3: 500, 4: 800 };
const SOFT_DROP_PT = 1;
const HARD_DROP_PT = 2;

/* =========================================================================
 * Audio — SFX (small mp3, instant) + BGM (looped, per mode)
 * ========================================================================= */
const Sfx = {
  enabled: true,
  musicEnabled: true,
  buffers: {},
  bgm: null,
  paths: {
    move:     'web/audio/SFX_PieceMoveLR.mp3',
    drop:     'web/audio/SFX_PieceHardDrop.mp3',
    fall:     'web/audio/SFX_Fall.mp3',
    line1:    'web/audio/SFX_SpecialLineClearSingle.mp3',
    line2:    'web/audio/SFX_SpecialLineClearDouble.mp3',
    line3:    'web/audio/SFX_SpecialLineClearTriple.mp3',
    tetris:   'web/audio/SFX_SpecialTetris.mp3',
    break:    'web/audio/SFX_Break.mp3',
    levelup:  'web/audio/SFX_LevelUp.mp3',
    gameover: 'web/audio/SFX_GameOver.mp3',
    button:   'web/audio/SFX_ButtonUp.mp3',
  },
  bgmPaths: {
    easy:     'web/audio/BGM1.mp3',
    hard:     'web/audio/BGM2.mp3',
    training: 'web/audio/BGM3.mp3',
    multi:    'web/audio/SFX_BattleMusic.mp3',
  },
  preload() {
    this.enabled = localStorage.getItem('fg_sfx') !== '0';
    this.musicEnabled = localStorage.getItem('fg_music') !== '0';
    for (const [k, p] of Object.entries(this.paths)) {
      const a = new Audio(p);
      a.preload = 'auto';
      this.buffers[k] = a;
    }
  },
  play(name, vol = 0.5) {
    if (!this.enabled) return;
    const base = this.buffers[name];
    if (!base) return;
    try {
      const a = base.cloneNode(true);
      a.volume = vol;
      const pr = a.play();
      if (pr && pr.catch) pr.catch(() => {});
    } catch (_) { /* ignore */ }
  },
  startBgm(modeKey) {
    this.stopBgm();
    if (!this.musicEnabled) return;
    const p = this.bgmPaths[modeKey] || this.bgmPaths.easy;
    const a = new Audio(p);
    a.loop = true;
    a.volume = 0.32;
    const pr = a.play();
    if (pr && pr.catch) pr.catch(() => {});
    this.bgm = a;
  },
  stopBgm() {
    if (this.bgm) { try { this.bgm.pause(); } catch (_) {} this.bgm = null; }
  },
  setSfx(on) { this.enabled = on; localStorage.setItem('fg_sfx', on ? '1' : '0'); },
  setMusic(on) {
    this.musicEnabled = on;
    localStorage.setItem('fg_music', on ? '1' : '0');
    if (!on) this.stopBgm();
    else if (Game.running) this.startBgm(Game.multi ? 'multi' : Game.modeKey);
  },
};

/* =========================================================================
 * Utility
 * ========================================================================= */
function rotateCW(m) {
  const n = m.length;
  const r = Array.from({ length: n }, () => Array(n).fill(0));
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) r[x][n - 1 - y] = m[y][x];
  return r;
}
function deepCopy(m) { return m.map(row => row.slice()); }

/* 7-bag randomizer */
function makeBag() {
  const bag = PIECE_KEYS.slice();
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}

/* =========================================================================
 * Piece
 * ========================================================================= */
class Piece {
  constructor(key) {
    this.key = key;
    this.matrix = deepCopy(SHAPES[key]);
    this.size = this.matrix.length;
    // spawn near top-center, inside the hidden rows
    this.x = Math.floor((COLS - this.size) / 2);
    this.y = (key === 'I') ? HIDDEN - 2 : HIDDEN - 1;
  }
  clone() {
    const p = new Piece(this.key);
    p.matrix = deepCopy(this.matrix);
    p.x = this.x; p.y = this.y; p.size = this.size;
    return p;
  }
  cells(matrix = this.matrix) {
    const out = [];
    for (let y = 0; y < matrix.length; y++)
      for (let x = 0; x < matrix.length; x++)
        if (matrix[y][x]) out.push([this.x + x, this.y + y, matrix[y][x]]);
    return out;
  }
}

/* =========================================================================
 * Player board (one per player; Multi uses two)
 * ========================================================================= */
class Board {
  constructor(canvas, opts) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cell = opts.cell;
    this.nextCanvas = opts.nextCanvas || null;
    this.holdCanvas = opts.holdCanvas || null;
    this.reset();
  }

  reset() {
    this.grid = Array.from({ length: TOTAL_ROWS }, () => Array(COLS).fill(0));
    this.bag = [];
    this.queue = [];
    this.fillQueue();
    this.current = null;
    this.hold = null;
    this.holdUsed = false;
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.dropFrames = 0;
    this.gravity = 48;
    this.alive = true;
    this.spawn();
  }

  fillQueue() {
    while (this.queue.length < 6) {
      if (this.bag.length === 0) this.bag = makeBag();
      this.queue.push(this.bag.shift());
    }
  }

  spawn(key) {
    this.fillQueue();
    const k = key || this.queue.shift();
    this.fillQueue();
    this.current = new Piece(k);
    this.holdUsed = false;
    if (this.collide(this.current.matrix, this.current.x, this.current.y)) {
      this.alive = false;
    }
  }

  collide(matrix, px, py) {
    for (let y = 0; y < matrix.length; y++) {
      for (let x = 0; x < matrix.length; x++) {
        if (!matrix[y][x]) continue;
        const gx = px + x, gy = py + y;
        if (gx < 0 || gx >= COLS || gy >= TOTAL_ROWS) return true;
        if (gy >= 0 && this.grid[gy][gx]) return true;
      }
    }
    return false;
  }

  move(dx) {
    const p = this.current;
    if (!this.collide(p.matrix, p.x + dx, p.y)) { p.x += dx; Sfx.play('move', 0.3); return true; }
    return false;
  }

  rotate(dir = 1) {
    const p = this.current;
    if (p.key === 'O') return true;
    let m = p.matrix;
    for (let i = 0; i < (dir > 0 ? 1 : 3); i++) m = rotateCW(m);
    // wall kicks: try a set of offsets
    const kicks = [0, -1, 1, -2, 2];
    for (const kx of kicks) {
      for (const ky of [0, -1, 1]) {
        if (!this.collide(m, p.x + kx, p.y + ky)) {
          p.matrix = m; p.x += kx; p.y += ky; Sfx.play('move', 0.35); return true;
        }
      }
    }
    return false;
  }

  softDrop() {
    const p = this.current;
    if (!this.collide(p.matrix, p.x, p.y + 1)) {
      p.y += 1; this.score += SOFT_DROP_PT; return true;
    }
    this.lock();
    return false;
  }

  hardDrop() {
    const p = this.current;
    let dist = 0;
    while (!this.collide(p.matrix, p.x, p.y + 1)) { p.y += 1; dist++; }
    this.score += dist * HARD_DROP_PT;
    Sfx.play('drop', 0.5);
    this.lock();
  }

  holdPiece() {
    if (this.holdUsed) return;
    const cur = this.current.key;
    if (this.hold) {
      const h = this.hold;
      this.hold = cur;
      this.spawn(h);
    } else {
      this.hold = cur;
      this.spawn();
    }
    this.holdUsed = true;
  }

  ghostY() {
    const p = this.current;
    let gy = p.y;
    while (!this.collide(p.matrix, p.x, gy + 1)) gy++;
    return gy;
  }

  lock() {
    const p = this.current;
    for (const [gx, gy, c] of p.cells()) {
      if (gy >= 0) this.grid[gy][gx] = c;
    }
    Sfx.play('fall', 0.4);
    this.clearLines();
    this.spawn();
  }

  clearLines() {
    let cleared = 0;
    for (let y = TOTAL_ROWS - 1; y >= 0; y--) {
      if (this.grid[y].every(v => v !== 0)) {
        this.grid.splice(y, 1);
        this.grid.unshift(Array(COLS).fill(0));
        cleared++;
        y++; // recheck same row index
      }
    }
    if (cleared > 0) {
      const prevLevel = this.level;
      this.lines += cleared;
      this.score += (LINE_SCORE[cleared] || 0) * this.level;
      this.level = (Game.mode ? Game.mode.startLevel : 1) + Math.floor(this.lines / 10);
      // line-clear sfx
      if (cleared >= 4) { Sfx.play('tetris', 0.6); Sfx.play('break', 0.5); }
      else Sfx.play('line' + cleared, 0.55);
      if (this.level > prevLevel) Sfx.play('levelup', 0.55);
      return cleared;
    }
    return 0;
  }

  /* ---------- Rendering ---------- */
  drawCell(ctx, x, y, color, alpha = 1) {
    const cell = this.cell;
    const px = x * cell, py = y * cell;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillRect(px, py, cell, cell);
    // bevel
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(px, py, cell, cell * 0.18);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(px, py + cell * 0.82, cell, cell * 0.18);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(px + 0.5, py + 0.5, cell - 1, cell - 1);
    ctx.globalAlpha = 1;
  }

  render() {
    const ctx = this.ctx, cell = this.cell;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    // background grid
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    for (let y = 0; y < ROWS; y++)
      for (let x = 0; x < COLS; x++)
        if ((x + y) % 2 === 0)
          ctx.fillRect(x * cell, y * cell, cell, cell);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    for (let x = 0; x <= COLS; x++) {
      ctx.beginPath(); ctx.moveTo(x * cell, 0); ctx.lineTo(x * cell, ROWS * cell); ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
      ctx.beginPath(); ctx.moveTo(0, y * cell); ctx.lineTo(COLS * cell, y * cell); ctx.stroke();
    }
    // settled blocks
    for (let y = HIDDEN; y < TOTAL_ROWS; y++)
      for (let x = 0; x < COLS; x++)
        if (this.grid[y][x])
          this.drawCell(ctx, x, y - HIDDEN, COLORS[this.grid[y][x]]);

    if (this.current && this.alive) {
      // ghost
      const gy = this.ghostY();
      const p = this.current;
      for (let y = 0; y < p.matrix.length; y++)
        for (let x = 0; x < p.matrix.length; x++)
          if (p.matrix[y][x]) {
            const ry = gy + y - HIDDEN;
            if (ry >= 0) this.drawCell(ctx, p.x + x, ry, COLORS[p.matrix[y][x]], 0.22);
          }
      // current
      for (const [cx, cy, c] of p.cells()) {
        const ry = cy - HIDDEN;
        if (ry >= 0) this.drawCell(ctx, cx, ry, COLORS[c]);
      }
    }
    this.renderPreview();
  }

  renderMini(canvas, key) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!key) return;
    const m = SHAPES[key];
    const n = m.length;
    const cell = Math.floor(Math.min(canvas.width, canvas.height) / 4.5);
    // compute bounds for centering
    let minX = n, maxX = -1, minY = n, maxY = -1;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (m[y][x]) {
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
    const w = (maxX - minX + 1) * cell, h = (maxY - minY + 1) * cell;
    const ox = (canvas.width - w) / 2 - minX * cell;
    const oy = (canvas.height - h) / 2 - minY * cell;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (m[y][x]) {
      const px = ox + x * cell, py = oy + y * cell;
      ctx.fillStyle = COLORS[m[y][x]];
      ctx.fillRect(px, py, cell, cell);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(px, py, cell, cell * 0.18);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.strokeRect(px + 0.5, py + 0.5, cell - 1, cell - 1);
    }
  }

  renderPreview() {
    if (this.nextCanvas) this.renderMini(this.nextCanvas, this.queue[0]);
    if (this.holdCanvas) this.renderMini(this.holdCanvas, this.hold);
  }
}

/* =========================================================================
 * Game controller
 * ========================================================================= */
const Game = {
  mode: null,
  modeKey: 'easy',
  multi: false,
  boards: [],
  running: false,
  paused: false,
  rafId: null,
  lastTime: 0,
  acc: 0,
  winner: null,

  start(modeKey, multi = false) {
    this.modeKey = multi ? 'easy' : modeKey;
    this.mode = MODES[this.modeKey];
    this.multi = multi;
    this.winner = null;
    this.paused = false;

    const cfgs = multi
      ? [
          { canvas: 'board1', next: 'next1', hold: 'hold1' },
          { canvas: 'board2', next: 'next2', hold: 'hold2' },
        ]
      : [{ canvas: 'board1', next: 'next1', hold: 'hold1' }];

    this.boards = cfgs.map(c => {
      const canvas = document.getElementById(c.canvas);
      const cell = canvas.width / COLS;
      const b = new Board(canvas, {
        cell,
        nextCanvas: document.getElementById(c.next),
        holdCanvas: document.getElementById(c.hold),
      });
      b.level = this.mode.startLevel;
      b.gravity = this.computeGravity(b.level);
      return b;
    });

    this.running = true;
    this.lastTime = performance.now();
    this.acc = 0;
    UI.showGame(multi);
    Sfx.startBgm(multi ? 'multi' : this.modeKey);
    this.loop = this.loop.bind(this);
    cancelAnimationFrame(this.rafId);
    this.rafId = requestAnimationFrame(this.loop);
  },

  computeGravity(level) {
    const g = this.mode.gravityBase - (level - 1) * this.mode.accel;
    return Math.max(4, g); // never faster than 4 frames/step
  },

  loop(now) {
    if (!this.running) return;
    const dt = now - this.lastTime;
    this.lastTime = now;
    if (!this.paused) {
      this.acc += dt;
      const frame = 1000 / 60;
      while (this.acc >= frame) {
        this.tick();
        this.acc -= frame;
      }
    }
    this.boards.forEach(b => b.render());
    UI.updateHUD();
    this.rafId = requestAnimationFrame(this.loop);
  },

  tick() {
    for (const b of this.boards) {
      if (!b.alive) continue;
      b.gravity = this.computeGravity(b.level);
      b.dropFrames++;
      if (b.dropFrames >= b.gravity) {
        b.dropFrames = 0;
        if (!this.mode.endless || b.alive) {
          if (this.collideDown(b)) b.lock(); else b.current.y++;
        }
      }
    }
    this.checkEnd();
  },

  collideDown(b) {
    return b.collide(b.current.matrix, b.current.x, b.current.y + 1);
  },

  checkEnd() {
    if (this.mode.endless) {
      // training never ends; auto-revive if topped out
      for (const b of this.boards) if (!b.alive) b.reset();
      return;
    }
    if (this.multi) {
      const dead = this.boards.map(b => !b.alive);
      if (dead[0] || dead[1]) {
        this.winner = dead[0] && dead[1]
          ? (this.boards[0].score >= this.boards[1].score ? 1 : 2)
          : (dead[0] ? 2 : 1);
        this.end();
      }
    } else {
      if (!this.boards[0].alive) this.end();
    }
  },

  end() {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    Sfx.stopBgm();
    Sfx.play('gameover', 0.6);
    UI.showGameOver();
  },

  togglePause() {
    if (!this.running) return;
    this.paused = !this.paused;
    if (Sfx.bgm) { try { this.paused ? Sfx.bgm.pause() : Sfx.bgm.play().catch(() => {}); } catch (_) {} }
    UI.setPaused(this.paused);
  },

  quitToMenu() {
    this.running = false;
    this.paused = false;
    cancelAnimationFrame(this.rafId);
    Sfx.stopBgm();
    UI.showMenu();
  },
};

/* =========================================================================
 * Input
 * ========================================================================= */
const Keys = {
  // single player + P1
  p1: {
    left: ['ArrowLeft'], right: ['ArrowRight'], down: ['ArrowDown'],
    rotCW: ['ArrowUp', 'KeyX'], rotCCW: ['KeyZ', 'ControlLeft'],
    hard: ['Space'], hold: ['KeyC', 'ShiftLeft'],
  },
  // P2 (multi) — left hand side keys
  p2: {
    left: ['KeyA'], right: ['KeyD'], down: ['KeyS'],
    rotCW: ['KeyW'], rotCCW: ['KeyQ'],
    hard: ['KeyE'], hold: ['Tab'],
  },
};

function handleAction(board, map, code) {
  if (!board.alive) return false;
  if (map.left.includes(code)) { board.move(-1); return true; }
  if (map.right.includes(code)) { board.move(1); return true; }
  if (map.down.includes(code)) { board.softDrop(); return true; }
  if (map.rotCW.includes(code)) { board.rotate(1); return true; }
  if (map.rotCCW.includes(code)) { board.rotate(-1); return true; }
  if (map.hard.includes(code)) { board.hardDrop(); return true; }
  if (map.hold.includes(code)) { board.holdPiece(); return true; }
  return false;
}

window.addEventListener('keydown', (e) => {
  if (!Game.running) return;
  const code = e.code;

  if (code === 'KeyP' || code === 'Escape') {
    e.preventDefault();
    Game.togglePause();
    return;
  }
  if (Game.paused) return;

  let used = false;
  if (Game.multi) {
    // P1 = arrows, P2 = WASD/QWE
    used = handleAction(Game.boards[0], Keys.p1, code) || used;
    used = handleAction(Game.boards[1], Keys.p2, code) || used;
  } else {
    used = handleAction(Game.boards[0], Keys.p1, code) || used;
  }
  // prevent scrolling / tab switching
  if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Tab'].includes(code) || used) {
    e.preventDefault();
  }
});

/* ---------- On-screen touch controls (mobile, single player) ---------- */
function bindTouch() {
  const map = {
    'btn-left':  b => b.move(-1),
    'btn-right': b => b.move(1),
    'btn-down':  b => b.softDrop(),
    'btn-rotate':b => b.rotate(1),
    'btn-drop':  b => b.hardDrop(),
    'btn-hold':  b => b.holdPiece(),
  };
  Object.entries(map).forEach(([id, fn]) => {
    const el = document.getElementById(id);
    if (!el) return;
    const act = (e) => {
      e.preventDefault();
      if (Game.running && !Game.paused && !Game.multi && Game.boards[0]?.alive) fn(Game.boards[0]);
    };
    el.addEventListener('touchstart', act, { passive: false });
    el.addEventListener('mousedown', act);
  });
}

/* =========================================================================
 * Leaderboard (localStorage)
 * ========================================================================= */
const Leaderboard = {
  key: 'fg_tetris_leaderboard_v1',
  load() {
    try { return JSON.parse(localStorage.getItem(this.key)) || {}; }
    catch { return {}; }
  },
  save(data) { localStorage.setItem(this.key, JSON.stringify(data)); },
  top(mode, n = 10) {
    const all = this.load();
    return (all[mode] || []).slice().sort((a, b) => b.score - a.score).slice(0, n);
  },
  qualifies(mode, score) {
    if (score <= 0) return false;
    const list = this.top(mode, 10);
    return list.length < 10 || score > list[list.length - 1].score;
  },
  add(mode, name, score, lines) {
    const all = this.load();
    if (!all[mode]) all[mode] = [];
    all[mode].push({ name: (name || 'AAA').slice(0, 8), score, lines, date: new Date().toISOString().slice(0, 10) });
    all[mode] = all[mode].sort((a, b) => b.score - a.score).slice(0, 20);
    this.save(all);
  },
};

/* =========================================================================
 * UI wiring
 * ========================================================================= */
const UI = {
  init() {
    Sfx.preload();
    // menu buttons
    document.querySelectorAll('[data-mode]').forEach(btn => {
      btn.addEventListener('click', () => {
        Sfx.play('button', 0.5);
        const m = btn.dataset.mode;
        if (m === 'multi') Game.start('easy', true);
        else Game.start(m, false);
      });
    });
    this.initSound();
    document.getElementById('btn-leaderboard').addEventListener('click', () => this.showLeaderboard());
    document.getElementById('lb-back').addEventListener('click', () => this.showMenu());
    document.getElementById('btn-pause').addEventListener('click', () => Game.togglePause());
    document.getElementById('btn-quit').addEventListener('click', () => Game.quitToMenu());
    document.getElementById('resume-btn').addEventListener('click', () => Game.togglePause());
    document.getElementById('pause-quit-btn').addEventListener('click', () => Game.quitToMenu());

    // game over actions
    document.getElementById('go-retry').addEventListener('click', () => {
      const score = document.getElementById('score-form');
      this.maybeSaveScore();
      Game.start(Game.modeKey, Game.multi);
    });
    document.getElementById('go-menu').addEventListener('click', () => {
      this.maybeSaveScore();
      this.showMenu();
    });

    // leaderboard mode tabs
    document.querySelectorAll('[data-lbmode]').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('[data-lbmode]').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.renderLeaderboard(tab.dataset.lbmode);
      });
    });

    bindTouch();
    this.showMenu();
  },

  initSound() {
    const sfxBtn = document.getElementById('btn-sfx');
    const musicBtn = document.getElementById('btn-music');
    const soundBtn = document.getElementById('btn-sound');
    const refresh = () => {
      if (sfxBtn) { sfxBtn.classList.toggle('off', !Sfx.enabled); sfxBtn.textContent = (Sfx.enabled ? '🔊' : '🔈') + ' 효과음'; }
      if (musicBtn) { musicBtn.classList.toggle('off', !Sfx.musicEnabled); musicBtn.textContent = (Sfx.musicEnabled ? '🎵' : '🔇') + ' 음악'; }
      if (soundBtn) soundBtn.textContent = (Sfx.enabled || Sfx.musicEnabled) ? '🔊' : '🔇';
    };
    if (sfxBtn) sfxBtn.addEventListener('click', () => { Sfx.setSfx(!Sfx.enabled); if (Sfx.enabled) Sfx.play('button', 0.5); refresh(); });
    if (musicBtn) musicBtn.addEventListener('click', () => { Sfx.setMusic(!Sfx.musicEnabled); refresh(); });
    if (soundBtn) soundBtn.addEventListener('click', () => {
      const anyOn = Sfx.enabled || Sfx.musicEnabled;
      Sfx.setSfx(!anyOn); Sfx.setMusic(!anyOn); refresh();
    });
    this._refreshSound = refresh;
    refresh();
  },

  setBg(name) {
    const layer = document.getElementById('bg-layer');
    if (layer) layer.style.backgroundImage = `url('web/img/${name}.jpg')`;
  },

  screens: ['menu', 'game', 'leaderboard'],
  show(id) {
    this.screens.forEach(s => {
      document.getElementById('screen-' + s).classList.toggle('hidden', s !== id);
    });
  },

  showMenu() {
    this.show('menu');
    document.getElementById('overlay-pause').classList.add('hidden');
    this.setBg('background_uk');
    if (this._refreshSound) this._refreshSound();
  },

  bgForMode: { easy: 'background_nyc', hard: 'background_hongkong', training: 'background_uk' },

  showGame(multi) {
    this.show('game');
    this.setBg(multi ? 'background_image' : (this.bgForMode[Game.modeKey] || 'background_uk'));
    document.getElementById('game-wrap').classList.toggle('multi', multi);
    document.getElementById('overlay-pause').classList.add('hidden');
    document.getElementById('overlay-gameover').classList.add('hidden');
    document.getElementById('p2-panel').classList.toggle('hidden', !multi);
    document.getElementById('touch-controls').classList.toggle('hidden', multi);
    document.getElementById('mode-tag').textContent = multi ? 'MULTI (2P)' : MODES[Game.modeKey].label;
  },

  setPaused(paused) {
    document.getElementById('overlay-pause').classList.toggle('hidden', !paused);
  },

  showGameOver() {
    const ov = document.getElementById('overlay-gameover');
    ov.classList.remove('hidden');
    const title = document.getElementById('go-title');
    const detail = document.getElementById('go-detail');
    const form = document.getElementById('score-form');

    if (Game.multi) {
      title.textContent = `PLAYER ${Game.winner} WINS!`;
      detail.innerHTML =
        `P1: <b>${Game.boards[0].score.toLocaleString()}</b> &nbsp;·&nbsp; P2: <b>${Game.boards[1].score.toLocaleString()}</b>`;
      form.classList.add('hidden');
      this._pendingScore = null;
    } else {
      const b = Game.boards[0];
      title.textContent = 'GAME OVER';
      detail.innerHTML =
        `SCORE <b>${b.score.toLocaleString()}</b> &nbsp;·&nbsp; LINES <b>${b.lines}</b> &nbsp;·&nbsp; LV <b>${b.level}</b>`;
      if (Leaderboard.qualifies(Game.modeKey, b.score)) {
        form.classList.remove('hidden');
        const input = document.getElementById('score-name');
        input.value = '';
        setTimeout(() => input.focus(), 50);
        this._pendingScore = { mode: Game.modeKey, score: b.score, lines: b.lines };
      } else {
        form.classList.add('hidden');
        this._pendingScore = null;
      }
    }
  },

  maybeSaveScore() {
    if (this._pendingScore) {
      const name = (document.getElementById('score-name').value || 'AAA').toUpperCase();
      Leaderboard.add(this._pendingScore.mode, name, this._pendingScore.score, this._pendingScore.lines);
      this._pendingScore = null;
    }
  },

  showLeaderboard() {
    this.show('leaderboard');
    const first = document.querySelector('[data-lbmode]');
    document.querySelectorAll('[data-lbmode]').forEach(t => t.classList.remove('active'));
    first.classList.add('active');
    this.renderLeaderboard(first.dataset.lbmode);
  },

  renderLeaderboard(mode) {
    const list = Leaderboard.top(mode, 10);
    const tbody = document.getElementById('lb-body');
    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="lb-empty">아직 기록이 없습니다. 게임을 플레이해 보세요!</td></tr>`;
      return;
    }
    tbody.innerHTML = list.map((r, i) => `
      <tr class="${i < 3 ? 'top' + (i + 1) : ''}">
        <td class="rank">${i + 1}</td>
        <td class="name">${escapeHtml(r.name)}</td>
        <td class="score">${r.score.toLocaleString()}</td>
        <td class="lines">${r.lines ?? '-'}</td>
      </tr>`).join('');
  },

  updateHUD() {
    const b = Game.boards[0];
    if (!b) return;
    document.getElementById('hud-score').textContent = b.score.toLocaleString();
    document.getElementById('hud-lines').textContent = b.lines;
    document.getElementById('hud-level').textContent = b.level;
    if (Game.multi && Game.boards[1]) {
      const b2 = Game.boards[1];
      document.getElementById('hud2-score').textContent = b2.score.toLocaleString();
      document.getElementById('hud2-lines').textContent = b2.lines;
      document.getElementById('hud2-level').textContent = b2.level;
    }
  },
};

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ---------- boot ---------- */
window.addEventListener('DOMContentLoaded', () => UI.init());
