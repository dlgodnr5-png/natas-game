// ============================================
// КЛАСС ВРАГА
// ============================================

class Enemy {
    constructor(type, waveNumber, difficulty) {
        const template = CONFIG.ENEMY_TYPES[type];
        const diffSettings = CONFIG.DIFFICULTIES[difficulty];

        this.type = type;
        this.name = template.name;

        // Характеристики с учётом волны и сложности
        const waveScale = 1 + (waveNumber - 1) * 0.15;
        this.maxHp = Math.floor(template.hp * waveScale * diffSettings.enemyHpMult);
        this.hp = this.maxHp;
        this.speed = template.speed * diffSettings.enemySpeedMult;
        this.baseSpeed = this.speed;
        this.reward = Math.floor(template.reward * diffSettings.rewardMult);

        // Внешний вид
        this.color = template.color;
        this.radius = template.radius;

        // Особые свойства
        this.flying = template.flying || false;
        this.isBoss = template.isBoss || false;
        this.healAmount = template.healAmount || 0;
        this.healRange = template.healRange || 0;

        // Позиция и движение
        this.path = this.flying ? CONFIG.FLYING_PATH : CONFIG.PATH;
        this.pathIndex = 0;
        this.x = this.path[0].x;
        this.y = this.path[0].y;

        // Эффекты
        this.slowTimer = 0;
        this.slowAmount = 1;

        // Состояние
        this.alive = true;
        this.reachedEnd = false;

        // Блокировка солдатами
        this.blockedBy = null;
        this.blockTimer = 0;
    }

    update() {
        if (!this.alive) return;

        // Обновление замедления
        if (this.slowTimer > 0) {
            this.slowTimer--;
            if (this.slowTimer <= 0) {
                this.slowAmount = 1;
            }
        }

        // Если заблокирован солдатом, не двигаемся
        if (this.blockedBy && this.blockedBy.alive) {
            this.blockTimer++;
            return;
        } else {
            this.blockedBy = null;
            this.blockTimer = 0;
        }

        // Движение по пути
        if (this.pathIndex < this.path.length - 1) {
            const target = this.path[this.pathIndex + 1];
            const dx = target.x - this.x;
            const dy = target.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            const currentSpeed = this.speed * this.slowAmount;

            if (dist < currentSpeed) {
                this.pathIndex++;
            } else {
                this.x += (dx / dist) * currentSpeed;
                this.y += (dy / dist) * currentSpeed;
            }
        } else {
            // Достиг конца
            this.reachedEnd = true;
            this.alive = false;
        }
    }

    takeDamage(amount) {
        this.hp -= amount;
        if (this.hp <= 0) {
            this.hp = 0;
            this.alive = false;
            return true; // Враг убит
        }
        return false;
    }

    applySlow(amount, duration) {
        this.slowAmount = Math.min(this.slowAmount, amount);
        this.slowTimer = Math.max(this.slowTimer, duration);
    }

    heal(amount) {
        this.hp = Math.min(this.hp + amount, this.maxHp);
    }

    // Получить прогресс по пути (0-1)
    getProgress() {
        let totalDist = 0;
        let coveredDist = 0;

        for (let i = 0; i < this.path.length - 1; i++) {
            const dx = this.path[i + 1].x - this.path[i].x;
            const dy = this.path[i + 1].y - this.path[i].y;
            const segmentDist = Math.sqrt(dx * dx + dy * dy);
            totalDist += segmentDist;

            if (i < this.pathIndex) {
                coveredDist += segmentDist;
            } else if (i === this.pathIndex) {
                const dx2 = this.x - this.path[i].x;
                const dy2 = this.y - this.path[i].y;
                coveredDist += Math.sqrt(dx2 * dx2 + dy2 * dy2);
            }
        }

        return totalDist > 0 ? coveredDist / totalDist : 0;
    }

    draw(ctx) {
        if (!this.alive) return;

        const x = this.x;
        const y = this.y;
        const r = this.radius;

        // Тень
        ctx.beginPath();
        ctx.ellipse(x, y + r * 0.8, r * 0.8, r * 0.3, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fill();

        // Летающие враги выше
        const drawY = this.flying ? y - 15 : y;

        // Тело врага
        ctx.beginPath();
        ctx.arc(x, drawY, r, 0, Math.PI * 2);

        // Градиент
        const gradient = ctx.createRadialGradient(x - r * 0.3, drawY - r * 0.3, 0, x, drawY, r);
        gradient.addColorStop(0, this.lightenColor(this.color, 30));
        gradient.addColorStop(1, this.color);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Обводка
        ctx.strokeStyle = this.darkenColor(this.color, 30);
        ctx.lineWidth = 2;
        ctx.stroke();

        // Индикатор замедления
        if (this.slowTimer > 0) {
            ctx.beginPath();
            ctx.arc(x, drawY, r + 3, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(102, 217, 232, 0.5)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Иконка для особых врагов
        ctx.font = `${r}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (this.flying) {
            ctx.fillStyle = 'white';
            ctx.fillText('🦅', x, drawY);
        } else if (this.healAmount > 0) {
            ctx.fillStyle = 'white';
            ctx.fillText('➕', x, drawY);
        } else if (this.isBoss) {
            ctx.fillStyle = 'white';
            ctx.fillText('💀', x, drawY);
        }

        // Полоска здоровья
        const hpWidth = r * 2;
        const hpHeight = 4;
        const hpX = x - r;
        const hpY = drawY - r - 8;

        // Фон полоски
        ctx.fillStyle = '#333';
        ctx.fillRect(hpX, hpY, hpWidth, hpHeight);

        // Здоровье
        const hpPercent = this.hp / this.maxHp;
        const hpColor = hpPercent > 0.5 ? '#2ecc71' : hpPercent > 0.25 ? '#f39c12' : '#e74c3c';
        ctx.fillStyle = hpColor;
        ctx.fillRect(hpX, hpY, hpWidth * hpPercent, hpHeight);

        // Рамка
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.strokeRect(hpX, hpY, hpWidth, hpHeight);
    }

    lightenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.min(255, (num >> 16) + amt);
        const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
        const B = Math.min(255, (num & 0x0000FF) + amt);
        return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
    }

    darkenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.max(0, (num >> 16) - amt);
        const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
        const B = Math.max(0, (num & 0x0000FF) - amt);
        return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
    }
}
