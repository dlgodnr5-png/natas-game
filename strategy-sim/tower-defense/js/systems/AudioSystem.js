// ============================================
// ЗВУКОВАЯ СИСТЕМА (Web Audio API)
// Процедурная генерация звуков без файлов
// ============================================

class AudioSystem {
    constructor() {
        this.ctx = null;
        this.sfxVolume = 0.7;
        this.musicVolume = 0.5;
        this.muted = false;
    }

    init() {
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API not supported');
        }
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    setVolume(type, value) {
        if (type === 'sfx') this.sfxVolume = value;
        if (type === 'music') this.musicVolume = value;
    }

    toggleMute() {
        this.muted = !this.muted;
        return this.muted;
    }

    // Генерация звуков программно
    play(type) {
        if (this.muted || !this.ctx) return;
        this.resume();

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        gain.gain.value = this.sfxVolume * 0.3;

        switch(type) {
            case 'shoot':
                osc.frequency.setValueAtTime(800, now);
                osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                osc.start(now);
                osc.stop(now + 0.1);
                break;

            case 'hit':
                osc.type = 'square';
                osc.frequency.setValueAtTime(150, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                osc.start(now);
                osc.stop(now + 0.15);
                break;

            case 'explosion':
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(100, now);
                osc.frequency.exponentialRampToValueAtTime(30, now + 0.3);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                osc.start(now);
                osc.stop(now + 0.3);
                break;

            case 'place':
                osc.frequency.setValueAtTime(400, now);
                osc.frequency.setValueAtTime(600, now + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                osc.start(now);
                osc.stop(now + 0.1);
                break;

            case 'upgrade':
                osc.frequency.setValueAtTime(400, now);
                osc.frequency.setValueAtTime(500, now + 0.1);
                osc.frequency.setValueAtTime(700, now + 0.2);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                osc.start(now);
                osc.stop(now + 0.3);
                break;

            case 'sell':
                osc.frequency.setValueAtTime(500, now);
                osc.frequency.exponentialRampToValueAtTime(200, now + 0.15);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                osc.start(now);
                osc.stop(now + 0.15);
                break;

            case 'wave':
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(300, now);
                osc.frequency.setValueAtTime(400, now + 0.1);
                osc.frequency.setValueAtTime(500, now + 0.2);
                osc.frequency.setValueAtTime(600, now + 0.3);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
                osc.start(now);
                osc.stop(now + 0.4);
                break;

            case 'gameover':
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(400, now);
                osc.frequency.exponentialRampToValueAtTime(100, now + 0.5);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
                osc.start(now);
                osc.stop(now + 0.5);
                break;

            case 'victory':
                this.playVictoryFanfare();
                return;

            case 'heroAttack':
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(600, now);
                osc.frequency.exponentialRampToValueAtTime(300, now + 0.15);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                osc.start(now);
                osc.stop(now + 0.15);
                break;

            case 'ability':
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(200, now);
                osc.frequency.exponentialRampToValueAtTime(800, now + 0.2);
                osc.frequency.exponentialRampToValueAtTime(400, now + 0.4);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
                osc.start(now);
                osc.stop(now + 0.5);
                break;

            case 'meteor':
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(60, now);
                osc.frequency.exponentialRampToValueAtTime(30, now + 0.4);
                gain.gain.value = this.sfxVolume * 0.5;
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
                osc.start(now);
                osc.stop(now + 0.4);
                break;

            case 'levelUp':
                this.playLevelUpSound();
                return;

            default:
                osc.frequency.setValueAtTime(440, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                osc.start(now);
                osc.stop(now + 0.1);
        }
    }

    playVictoryFanfare() {
        const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
        notes.forEach((freq, i) => {
            const o = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            o.connect(g);
            g.connect(this.ctx.destination);
            o.frequency.value = freq;
            g.gain.value = this.sfxVolume * 0.2;
            g.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1 * i + 0.3);
            o.start(this.ctx.currentTime + 0.1 * i);
            o.stop(this.ctx.currentTime + 0.1 * i + 0.3);
        });
    }

    playLevelUpSound() {
        // Восходящая мелодия при повышении уровня
        const notes = [392, 523, 659, 784]; // G4, C5, E5, G5
        notes.forEach((freq, i) => {
            const o = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            o.connect(g);
            g.connect(this.ctx.destination);
            o.type = 'triangle';
            o.frequency.value = freq;
            g.gain.value = this.sfxVolume * 0.25;
            g.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08 * i + 0.2);
            o.start(this.ctx.currentTime + 0.08 * i);
            o.stop(this.ctx.currentTime + 0.08 * i + 0.2);
        });
    }
}

// Глобальный экземпляр
const audio = new AudioSystem();
