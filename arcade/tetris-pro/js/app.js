// Wires UI ↔ Tetris engine. 구독(또는 운영자)이 아니면 awm-gate.js 하드 게이트가 게임 실행을 차단한다.
(function(){
const { Tetris, Music, Backdrop } = window.TetrisPro;

const $ = (id) => document.getElementById(id);

const board = $('board');
const next  = $('next');
const hold  = $('hold');

const ui = {
  score:$('score'), lines:$('lines'), level:$('level'), timer:$('timer'),
  overlay:$('overlay'), overlayTitle:$('overlayTitle'), overlayMsg:$('overlayMsg'), overlayBtn:$('overlayBtn'),
};

let runStartedAt = 0;

const game = new Tetris(board, next, hold, {
  stats(_, g){
    ui.score.textContent = g.score;
    ui.lines.textContent = g.lines;
    ui.level.textContent = g.level;
  },
  clear(n){
    document.body.classList.add('flash');
    setTimeout(()=>document.body.classList.remove('flash'), 320);
    Music.clearSfx(n);
  },
  over(_, g){
    showOverlay('GAME OVER', `점수 ${g.score} · 라인 ${g.lines}`, '다시 시작');
    Music.stop();
    Music.gameOverSfx();
  }
});

// ---------- main loop ----------
function loop(now){
  game.tick(now);
  if(game.running && !game.paused && !game.over){
    ui.timer.textContent = fmtTime(now - runStartedAt);
  }
  game.render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

function fmtTime(ms){
  const s = Math.floor(ms/1000);
  return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
}

function showOverlay(title, msg, btnLabel='시작', onClick){
  ui.overlay.style.display='flex';
  ui.overlayTitle.textContent = title;
  ui.overlayMsg.textContent = msg;
  ui.overlayBtn.textContent = btnLabel;
  ui.overlayBtn.onclick = onClick || startGame;
}
function hideOverlay(){ ui.overlay.style.display='none'; }

function startGame(){
  // 구독 하드 게이트 — 구독(또는 운영자) 아니면 게임을 시작하지 않고 게이트를 띄운다.
  if(window.awmAuth && !window.awmAuth.isSubscribed()){
    if(window.__awmApplyAuth) window.__awmApplyAuth();
    return;
  }
  game.reset();
  game.start();
  runStartedAt = performance.now();
  hideOverlay();
  Backdrop.next();
  Music.start();
}

// ---------- input ----------
const keymap = {
  ArrowLeft:  ()=>game.move(-1,0),
  ArrowRight: ()=>game.move(1,0),
  ArrowDown:  ()=>game.move(0,1),
  ArrowUp:    ()=>game.rotate(+1),
  x:          ()=>game.rotate(+1),
  X:          ()=>game.rotate(+1),
  z:          ()=>game.rotate(-1),
  Z:          ()=>game.rotate(-1),
  Control:    ()=>game.rotate(-1),
  ' ':        ()=>game.hardDrop(),
  Shift:      ()=>game.doHold(),
  c:          ()=>game.doHold(),
  C:          ()=>game.doHold(),
  p:          ()=>togglePause(),
  P:          ()=>togglePause(),
  Escape:     ()=>togglePause(),
};

window.addEventListener('keydown', (e)=>{
  if(e.repeat && [' ','Shift','c','C','x','X','z','Z','p','P','Escape','ArrowUp','Control'].includes(e.key)) return;
  if(e.key === 'Enter'){
    e.preventDefault();
    if(!game.running || game.over) startGame();
    return;
  }
  const fn = keymap[e.key];
  if(fn){
    if(!game.running || game.over) return;
    // 일시정지 중에는 일시정지/재개 키(P·Esc)만 통과 — 나머지 조작키는 차단.
    const isPauseKey = (e.key === 'p' || e.key === 'P' || e.key === 'Escape');
    if(game.paused && !isPauseKey) return;
    e.preventDefault();
    fn();
  }
});

// ---------- 모바일 터치 조작 (보드 위 제스처) ----------
// 가로 드래그 = 좌우 이동 · 아래 드래그 = 소프트드롭 · 빠른 아래 플릭 = 하드드롭 · 탭 = 회전.
// touch-action:none 으로 페이지 스크롤/줌을 막아 화면이 움직이지 않게 한다.
(function setupTetrisTouch(){
  const board = document.getElementById('board');
  if(!board) return;
  board.style.touchAction = 'none';
  const STEP_X = 26, STEP_Y = 30;
  let startX=0, startY=0, lastX=0, lastY=0, startT=0, active=false;

  const playable = ()=> game.running && !game.over && !game.paused;

  board.addEventListener('touchstart', (e)=>{
    const t = e.changedTouches[0];
    startX = lastX = t.clientX; startY = lastY = t.clientY;
    startT = performance.now(); active = true;
    e.preventDefault();
  }, {passive:false});

  board.addEventListener('touchmove', (e)=>{
    if(!active) return;
    e.preventDefault();
    if(!playable()) return;
    const t = e.changedTouches[0];
    let dx = t.clientX - lastX, dy = t.clientY - lastY;
    while(dx >= STEP_X){ game.move(1,0); dx -= STEP_X; lastX += STEP_X; }
    while(dx <= -STEP_X){ game.move(-1,0); dx += STEP_X; lastX -= STEP_X; }
    while(dy >= STEP_Y){ game.move(0,1); dy -= STEP_Y; lastY += STEP_Y; } // 아래 드래그=소프트드롭
  }, {passive:false});

  const endTouch = (e)=>{
    if(!active) return; active = false;
    e.preventDefault();
    if(!playable()) return;
    const t = e.changedTouches[0];
    const dt = performance.now() - startT;
    const dx = t.clientX - startX, dy = t.clientY - startY;
    if(dy > 60 && dy > Math.abs(dx)*1.5 && dt < 300){ game.hardDrop(); return; } // 빠른 아래 플릭
    if(Math.abs(dx) + Math.abs(dy) < 16 && dt < 300){ game.rotate(+1); }          // 탭=회전
  };
  board.addEventListener('touchend', endTouch, {passive:false});
  board.addEventListener('touchcancel', ()=>{ active = false; }, {passive:false});
})();

function togglePause(){
  if(!game.running || game.over) return;
  game.pause();
  if(game.paused){
    Music.stop();  // 음악 즉시 정지 (stop()이 스케줄된 음표까지 취소)
    showOverlay('일시정지', 'P 또는 Esc로 재개', '재개', togglePause); // 재개 버튼 = 동일 토글
  } else {
    hideOverlay();
    Music.start();  // 재개 시 음악 재시작 — stop()이 이전 루프를 정리했으므로 2중 겹침 없음
  }
}

// ---------- help modal wiring ----------
const helpModal = $('helpModal');
$('btnHelp').onclick = ()=> helpModal.hidden = false;
$('helpClose').onclick = ()=> helpModal.hidden = true;

// ---------- 게임 컨트롤 바 (일시정지 / 나가기) ----------
// 로그인·구독계정은 AWM 표준 헤더(awm-login-btn / awm-subscribe-btn)가 담당 (awm-gate.js).
const AWM_GAMES = 'https://aiworldmaker.happygold.shop/games'; // 나가기 → 게임 목록

// 가시 일시정지 버튼 — 키보드 P/Esc 와 동일 동작.
$('btnPause').onclick = ()=> togglePause();

// 나가기 — 진행 중이면 먼저 일시정지 후 확인. 취소 시 게임 유지.
$('btnExit').onclick = ()=>{
  if(game.running && !game.paused && !game.over) togglePause();
  if(confirm('게임을 종료하고 AI WORLD MAKER 게임 목록으로 나가시겠습니까?')){
    window.location.href = AWM_GAMES;
  }
};

// 세션 만료 등으로 구독 상태가 풀리면 음악 정지 (게이트는 awm-gate.js 가 표시).
window.__awmOnAuthChange = (subscribed)=>{ if(!subscribed) Music.stop(); };

// mute toggle
const btnMute = $('btnMute');
const MUTE_KEY = 'tetrispro.muted';
function applyMute(m){
  Music.setMuted(m);
  btnMute.textContent = m ? '🔇' : '🔊';
  btnMute.setAttribute('aria-pressed', String(m));
  try{ localStorage.setItem(MUTE_KEY, m ? '1' : '0'); }catch{}
}
btnMute.onclick = ()=> applyMute(!Music.muted);
applyMute(localStorage.getItem(MUTE_KEY) === '1');

// Update hardDrop to play SFX
const origHardDrop = game.hardDrop.bind(game);
game.hardDrop = function(){
  origHardDrop();
  Music.dropSfx();
};

// initial overlay + preload first backdrop
Backdrop.next();
showOverlay('PRESS ENTER', '엔터 키로 게임을 시작합니다.', '시작');

// auto-year copyright (AI WORLD MAKER standard)
document.getElementById('copyright').textContent =
  `Copyright © ${new Date().getFullYear()} AI WORLD MAKER. All Rights Reserved.`;

console.log('[TetrisPro] ready — press Enter or click 시작');
})();
