// Web Audio chiptune player — synthesizes Korobeiniki (Tetris Type A, Russian folk, public domain).
// No external assets, no API keys. Square wave + simple envelope, ~80 lines.
(function(global){

// note name -> frequency (Hz)
const NOTE = (n => {
  const names = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const out = {};
  for(let octave=2; octave<=6; octave++){
    names.forEach((nm, i)=>{
      const midi = 12*(octave+1) + i;
      out[nm + octave] = 440 * Math.pow(2, (midi-69)/12);
    });
  }
  return out;
})();

// Korobeiniki, in Em — simplified arrangement, ~30s loop.
// [note, beats] — beat = quarter note. Use 'R' for rest.
const MELODY = [
  ['E5',1],['B4',0.5],['C5',0.5],['D5',1],['C5',0.5],['B4',0.5],
  ['A4',1],['A4',0.5],['C5',0.5],['E5',1],['D5',0.5],['C5',0.5],
  ['B4',1.5],['C5',0.5],['D5',1],['E5',1],
  ['C5',1],['A4',1],['A4',1],['R',1],
  ['D5',1],['F5',0.5],['A5',1],['G5',0.5],['F5',0.5],
  ['E5',1.5],['C5',0.5],['E5',1],['D5',0.5],['C5',0.5],
  ['B4',1],['B4',0.5],['C5',0.5],['D5',1],['E5',1],
  ['C5',1],['A4',1],['A4',1],['R',1],
];

const BASS = [
  ['E3',2],['E3',2],['A3',2],['A3',2],
  ['G#3',2],['E3',2],['A3',2],['A3',2],
  ['D3',2],['D3',2],['C3',2],['B2',2],
  ['E3',2],['E3',2],['A3',2],['A3',2],
];

class Music {
  constructor(){
    this.ctx = null;
    this.master = null;
    this.playing = false;
    this.muted = false;
    this.bpm = 144;
    this.timer = null;
    this.voices = []; // 현재 스케줄된 오실레이터 추적 (stop 시 즉시 중단용)
  }
  _ensure(){
    if(this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.18;
    this.master.connect(this.ctx.destination);
  }
  setMuted(m){
    this.muted = !!m;
    if(this.master) this.master.gain.value = this.muted ? 0 : 0.18;
  }
  start(){
    this._ensure();
    if(this.ctx.state === 'suspended') this.ctx.resume();
    if(this.playing) return;
    this.playing = true;
    this._loop();
  }
  stop(){
    this.playing = false;
    if(this.timer){ clearTimeout(this.timer); this.timer = null; }
    // 이미 스케줄된 오실레이터를 즉시 중단. 안 하면 pause 후에도 ~30초 멜로디가
    // 계속 울리고, resume 시 새 루프가 겹쳐 음악이 2중으로 들린다.
    const now = this.ctx ? this.ctx.currentTime : 0;
    for(const osc of this.voices.splice(0)){
      try { osc.stop(now); } catch {}
      try { osc.disconnect(); } catch {}
    }
  }
  _loop(){
    if(!this.playing) return;
    const beatSec = 60 / this.bpm;
    const t0 = this.ctx.currentTime + 0.05;
    let t = t0;
    for(const [note, beats] of MELODY){
      if(note !== 'R') this._tone(NOTE[note], t, beats*beatSec, 'square', 0.18);
      t += beats * beatSec;
    }
    // bass beneath (looped to match melody length)
    let tb = t0;
    const melodyDur = t - t0;
    let bassDur = 0;
    while(bassDur < melodyDur - 0.001){
      for(const [note, beats] of BASS){
        if(bassDur >= melodyDur) break;
        const d = Math.min(beats*beatSec, melodyDur - bassDur);
        if(note !== 'R') this._tone(NOTE[note], tb, d, 'triangle', 0.14);
        tb += d; bassDur += d;
      }
    }
    const loopMs = melodyDur * 1000;
    this.timer = setTimeout(()=>this._loop(), loopMs);
  }
  _tone(freq, when, dur, type, vol){
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(vol, when + 0.01);
    g.gain.setValueAtTime(vol, when + Math.max(0, dur - 0.06));
    g.gain.exponentialRampToValueAtTime(0.001, when + dur);
    osc.connect(g).connect(this.master);
    osc.start(when);
    osc.stop(when + dur + 0.02);
    // 추적 + 종료 시 목록에서 제거 (stop()이 이 목록으로 일괄 중단)
    this.voices.push(osc);
    osc.onended = () => {
      try { osc.disconnect(); g.disconnect(); } catch {}
      const i = this.voices.indexOf(osc);
      if(i >= 0) this.voices.splice(i, 1);
    };
  }
  // SFX
  clearSfx(lines){
    this._ensure();
    if(this.muted) return;
    const t = this.ctx.currentTime;
    const notes = lines>=4 ? ['E5','G5','B5','E6'] : ['C5','E5','G5'];
    notes.forEach((n,i)=> this._tone(NOTE[n], t + i*0.06, 0.18, 'square', 0.22));
  }
  dropSfx(){
    this._ensure();
    if(this.muted) return;
    const t = this.ctx.currentTime;
    this._tone(NOTE['A3'], t, 0.06, 'square', 0.18);
    this._tone(NOTE['E3'], t+0.04, 0.08, 'square', 0.16);
  }
  gameOverSfx(){
    this._ensure();
    if(this.muted) return;
    const t = this.ctx.currentTime;
    ['E5','D5','C5','B4','A4','G4','F4','E4'].forEach((n,i)=>
      this._tone(NOTE[n], t + i*0.09, 0.15, 'sawtooth', 0.18)
    );
  }
}

global.TetrisPro = global.TetrisPro || {};
global.TetrisPro.Music = new Music();
})(window);
