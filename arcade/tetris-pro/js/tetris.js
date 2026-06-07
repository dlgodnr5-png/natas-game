// Tetris core engine — vanilla, no deps. Exposes window.TetrisPro.
// 10x20 playfield, 7-bag random, SRS-ish rotation with basic wall kicks,
// hold, ghost, next queue, lock delay, scoring, levels.
(function(global){
const CELL = 30;
const COLS = 10;
const ROWS = 20;

const COLORS = {
  I:'#22d3ee', O:'#facc15', T:'#a78bfa',
  S:'#34d399', Z:'#f87171', J:'#60a5fa', L:'#fb923c',
  G:'rgba(255,255,255,.12)'
};

// Tetromino shapes (4 rotation states each), in 4x4 grid coords for I, 3x3 for others
const SHAPES = {
  I: [
    [[0,1],[1,1],[2,1],[3,1]],
    [[2,0],[2,1],[2,2],[2,3]],
    [[0,2],[1,2],[2,2],[3,2]],
    [[1,0],[1,1],[1,2],[1,3]],
  ],
  O: [
    [[1,0],[2,0],[1,1],[2,1]],
    [[1,0],[2,0],[1,1],[2,1]],
    [[1,0],[2,0],[1,1],[2,1]],
    [[1,0],[2,0],[1,1],[2,1]],
  ],
  T: [
    [[1,0],[0,1],[1,1],[2,1]],
    [[1,0],[1,1],[2,1],[1,2]],
    [[0,1],[1,1],[2,1],[1,2]],
    [[1,0],[0,1],[1,1],[1,2]],
  ],
  S: [
    [[1,0],[2,0],[0,1],[1,1]],
    [[1,0],[1,1],[2,1],[2,2]],
    [[1,1],[2,1],[0,2],[1,2]],
    [[0,0],[0,1],[1,1],[1,2]],
  ],
  Z: [
    [[0,0],[1,0],[1,1],[2,1]],
    [[2,0],[1,1],[2,1],[1,2]],
    [[0,1],[1,1],[1,2],[2,2]],
    [[1,0],[0,1],[1,1],[0,2]],
  ],
  J: [
    [[0,0],[0,1],[1,1],[2,1]],
    [[1,0],[2,0],[1,1],[1,2]],
    [[0,1],[1,1],[2,1],[2,2]],
    [[1,0],[1,1],[0,2],[1,2]],
  ],
  L: [
    [[2,0],[0,1],[1,1],[2,1]],
    [[1,0],[1,1],[1,2],[2,2]],
    [[0,1],[1,1],[2,1],[0,2]],
    [[0,0],[1,0],[1,1],[1,2]],
  ],
};

const KICKS = [[0,0],[-1,0],[1,0],[0,-1],[-2,0],[2,0]];

function emptyBoard(){
  return Array.from({length:ROWS},()=>Array(COLS).fill(null));
}

function bag(){
  const arr=['I','O','T','S','Z','J','L'];
  for(let i=arr.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]]=[arr[j],arr[i]];
  }
  return arr;
}

class Tetris{
  constructor(canvas, nextCanvas, holdCanvas, listeners){
    this.ctx = canvas.getContext('2d');
    this.nextCtx = nextCanvas.getContext('2d');
    this.holdCtx = holdCanvas.getContext('2d');
    this.listeners = listeners || {};
    this.reset();
  }

  reset(){
    this.board = emptyBoard();
    this.queue = [...bag(), ...bag()];
    this.hold = null;
    this.holdUsed = false;
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.gravityMs = 800;
    this.lastTick = 0;
    this.lockTimer = 0;
    this.running = false;
    this.paused = false;
    this.over = false;
    this.startedAt = 0;
    this.elapsedMs = 0;
    this.spawn();
    this.emit('stats');
  }

  start(){
    this.running = true;
    this.paused = false;
    this.startedAt = performance.now();
    this.lastTick = this.startedAt;
  }

  pause(){
    if(!this.running || this.over) return;
    this.paused = !this.paused;
    if(!this.paused) this.lastTick = performance.now();
  }

  emit(ev, payload){
    if(this.listeners[ev]) this.listeners[ev](payload, this);
  }

  spawn(){
    const type = this.queue.shift();
    if(this.queue.length < 7) this.queue.push(...bag());
    this.cur = { type, rot:0, x: type==='O'?4:3, y:-1 };
    if(this.collide(this.cur)){
      this.over = true;
      this.running = false;
      this.emit('over');
    }
    this.holdUsed = false;
  }

  cells(piece){
    return SHAPES[piece.type][piece.rot].map(([x,y])=>[piece.x+x, piece.y+y]);
  }

  collide(piece){
    for(const [x,y] of this.cells(piece)){
      if(x<0||x>=COLS||y>=ROWS) return true;
      if(y>=0 && this.board[y][x]) return true;
    }
    return false;
  }

  move(dx,dy){
    const next = {...this.cur, x:this.cur.x+dx, y:this.cur.y+dy};
    if(!this.collide(next)){
      this.cur = next;
      if(dy>0) this.score += 1; // soft drop point
      this.lockTimer = 0;
      return true;
    }
    return false;
  }

  rotate(dir){
    if(this.cur.type==='O') return;
    const nextRot = (this.cur.rot + (dir>0?1:3)) % 4;
    for(const [kx,ky] of KICKS){
      const next = {...this.cur, rot:nextRot, x:this.cur.x+kx, y:this.cur.y+ky};
      if(!this.collide(next)){
        this.cur = next;
        this.lockTimer = 0;
        return;
      }
    }
  }

  hardDrop(){
    let d=0;
    while(this.move(0,1)) d++;
    this.score += d*2;
    this.lock();
  }

  doHold(){
    if(this.holdUsed) return;
    const prev = this.hold;
    this.hold = this.cur.type;
    if(prev){
      this.cur = { type:prev, rot:0, x: prev==='O'?4:3, y:-1 };
    } else {
      this.spawn();
    }
    this.holdUsed = true;
  }

  lock(){
    for(const [x,y] of this.cells(this.cur)){
      if(y<0){ this.over=true; this.running=false; this.emit('over'); return; }
      this.board[y][x] = this.cur.type;
    }
    // clear lines
    let cleared = 0;
    for(let y=ROWS-1; y>=0; y--){
      if(this.board[y].every(c=>c)){
        this.board.splice(y,1);
        this.board.unshift(Array(COLS).fill(null));
        cleared++;
        y++;
      }
    }
    if(cleared){
      const base = [0,40,100,300,1200][cleared];
      this.score += base * this.level;
      this.lines += cleared;
      const newLevel = Math.floor(this.lines/10) + 1;
      if(newLevel !== this.level){
        this.level = newLevel;
        this.gravityMs = Math.max(80, 800 - (this.level-1)*60);
      }
      this.emit('clear', cleared);
    }
    this.emit('stats');
    this.spawn();
  }

  tick(now){
    if(!this.running || this.paused || this.over) return;
    this.elapsedMs += now - this.lastTick;
    const dt = now - this.lastTick;
    this.lastTick = now;

    // gravity
    this._grav = (this._grav||0) + dt;
    if(this._grav >= this.gravityMs){
      this._grav = 0;
      const moved = this.move(0,1);
      if(!moved){
        this.lockTimer += this.gravityMs;
        if(this.lockTimer >= 500) this.lock();
      } else {
        this.lockTimer = 0;
      }
    }
    this.emit('tick');
  }

  // rendering
  render(){
    const ctx = this.ctx;
    ctx.clearRect(0,0,COLS*CELL,ROWS*CELL);
    // grid
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for(let x=1;x<COLS;x++){
      ctx.beginPath();ctx.moveTo(x*CELL,0);ctx.lineTo(x*CELL,ROWS*CELL);ctx.stroke();
    }
    for(let y=1;y<ROWS;y++){
      ctx.beginPath();ctx.moveTo(0,y*CELL);ctx.lineTo(COLS*CELL,y*CELL);ctx.stroke();
    }
    // board
    for(let y=0;y<ROWS;y++){
      for(let x=0;x<COLS;x++){
        if(this.board[y][x]) this._cell(ctx, x, y, COLORS[this.board[y][x]]);
      }
    }
    // ghost
    if(this.cur && !this.over){
      const g = {...this.cur};
      while(true){
        const n = {...g, y:g.y+1};
        if(this.collide(n)) break;
        g.y = n.y;
      }
      for(const [x,y] of this.cells(g)){
        if(y>=0) this._cell(ctx, x, y, COLORS.G, true);
      }
      for(const [x,y] of this.cells(this.cur)){
        if(y>=0) this._cell(ctx, x, y, COLORS[this.cur.type]);
      }
    }
    // next preview
    this._renderPreview(this.nextCtx, this.queue.slice(0,3));
    // hold preview
    this._renderPreview(this.holdCtx, this.hold?[this.hold]:[]);
  }

  _cell(ctx, x, y, color, ghost=false){
    const px = x*CELL, py = y*CELL;
    ctx.fillStyle = color;
    if(ghost){
      ctx.fillRect(px+2, py+2, CELL-4, CELL-4);
    } else {
      ctx.fillRect(px, py, CELL, CELL);
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(px, py, CELL, 4);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(px, py+CELL-4, CELL, 4);
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 1;
      ctx.strokeRect(px+0.5, py+0.5, CELL-1, CELL-1);
    }
  }

  _renderPreview(ctx, types){
    const cell = 24;
    ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);
    types.forEach((type, i)=>{
      const offY = i*4*cell + 8;
      const shape = SHAPES[type][0];
      const minX = Math.min(...shape.map(([x])=>x));
      const maxX = Math.max(...shape.map(([x])=>x));
      const w = (maxX-minX+1)*cell;
      const offX = (ctx.canvas.width - w)/2 - minX*cell;
      for(const [x,y] of shape){
        ctx.fillStyle = COLORS[type];
        ctx.fillRect(offX + x*cell, offY + y*cell, cell-1, cell-1);
      }
    });
  }
}

global.TetrisPro = global.TetrisPro || {};
global.TetrisPro.Tetris = Tetris;
global.TetrisPro.CELL = CELL;
global.TetrisPro.COLS = COLS;
global.TetrisPro.ROWS = ROWS;
})(window);
