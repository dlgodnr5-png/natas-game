// ============================================
// КЛАСС СОЛДАТА (для казармы)
// ============================================

class Soldier {
    constructor(x, y, hp, damage, parentTower) {
        this.x = x;
        this.y = y;
        this.maxHp = hp;
        this.hp = hp;
        this.damage = damage;
        this.parentTower = parentTower;

        this.homeX = x;
        this.homeY = y;

        this.target = null;
        this.attackCooldown = 0;
        this.attackRate = 60; // 1 атака в секунду

        this.speed = 2;
        this.range = 25;
        this.aggroRange = 60;

        this.alive = true;

        // Анимация
        this.attackAnimation = 0;
    }

    update(enemies) {
        if (!this.alive) return;

        // Обновление кулдауна
        if (this.attackCooldown > 0) {
            this.attackCooldown--;
        }

        // Обновление анимации
        if (this.attackAnimation > 0) {
            this.attackAnimation--;
        }

        // Поиск цели
        this.target = this.findTarget(enemies);

        if (this.target) {
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Движение к цели
            if (dist > this.range) {
                this.x += (dx / dist) * this.speed;
                this.y += (dy / dist) * this.speed;
            }
            // Атака
            else if (this.attackCooldown <= 0) {
                this.attack();
            }
        } else {
            // Возврат к позиции около башни
            const dx = this.homeX - this.x;
            const dy = this.homeY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 5) {
                this.x += (dx / dist) * this.speed;
                this.y += (dy / dist) * this.speed;
            }
        }
    }

    findTarget(enemies) {
        let bestTarget = null;
        let bestDist = Infinity;

        for (const enemy of enemies) {
            if (!enemy.alive || enemy.flying) continue;

            const dx = enemy.x - this.x;
            const dy = enemy.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist <= this.aggroRange && dist < bestDist) {
                bestDist = dist;
                bestTarget = enemy;
            }
        }

        return bestTarget;
    }

    attack() {
        if (!this.target || !this.target.alive) return;

        // Блокируем врага
        this.target.blockedBy = this;

        // Наносим урон
        this.target.takeDamage(this.damage);
        this.attackCooldown = this.attackRate;
        this.attackAnimation = 10;

        audio.play('hit');
    }

    takeDamage(amount) {
        this.hp -= amount;
        if (this.hp <= 0) {
            this.hp = 0;
            this.alive = false;
            return true;
        }
        return false;
    }

    draw(ctx) {
        if (!this.alive) return;

        const x = this.x;
        const y = this.y;
        const r = 8 + this.attackAnimation * 0.5;

        // Тень
        ctx.beginPath();
        ctx.ellipse(x, y + 6, 6, 3, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fill();

        // Тело солдата
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);

        const gradient = ctx.createRadialGradient(x - 2, y - 2, 0, x, y, r);
        gradient.addColorStop(0, '#a8d5ba');
        gradient.addColorStop(1, '#95d5b2');
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.strokeStyle = '#74c69d';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Иконка
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⚔️', x, y);

        // Полоска здоровья
        const hpWidth = 16;
        const hpHeight = 3;
        const hpX = x - hpWidth / 2;
        const hpY = y - r - 5;

        ctx.fillStyle = '#333';
        ctx.fillRect(hpX, hpY, hpWidth, hpHeight);

        const hpPercent = this.hp / this.maxHp;
        ctx.fillStyle = hpPercent > 0.5 ? '#2ecc71' : hpPercent > 0.25 ? '#f39c12' : '#e74c3c';
        ctx.fillRect(hpX, hpY, hpWidth * hpPercent, hpHeight);
    }
}
