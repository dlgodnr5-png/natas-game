// ============================================
// КЛАСС ЧАСТИЦЫ
// ============================================

class Particle {
    constructor(x, y, vx, vy, color, lifetime) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.lifetime = lifetime;
        this.maxLifetime = lifetime;
        this.alive = true;
        this.size = 3 + Math.random() * 3;
    }

    update() {
        if (!this.alive) return;

        this.x += this.vx;
        this.y += this.vy;

        // Замедление
        this.vx *= 0.98;
        this.vy *= 0.98;

        // Гравитация (опционально)
        this.vy += 0.05;

        this.lifetime--;
        if (this.lifetime <= 0) {
            this.alive = false;
        }
    }

    draw(ctx) {
        if (!this.alive) return;

        const alpha = this.lifetime / this.maxLifetime;
        const size = this.size * alpha;

        ctx.beginPath();
        ctx.arc(this.x, this.y, size, 0, Math.PI * 2);

        // Парсим цвет для добавления альфы
        ctx.fillStyle = this.colorWithAlpha(this.color, alpha);
        ctx.fill();
    }

    colorWithAlpha(color, alpha) {
        // Если это hex цвет
        if (color.startsWith('#')) {
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
        return color;
    }
}

// ============================================
// КЛАСС МЕТЕОРА (для способности Rain of Fire)
// ============================================

class Meteor {
    constructor(x, y, damage, radius) {
        // Метеор падает сверху
        this.targetX = x;
        this.targetY = y;
        this.x = x + (Math.random() - 0.5) * 50;
        this.y = -50;

        this.damage = damage;
        this.radius = radius;

        this.speed = 8 + Math.random() * 4;
        this.alive = true;
        this.exploded = false;

        this.size = 15 + Math.random() * 10;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.3;
    }

    update(enemies, particles) {
        if (!this.alive) return;

        // Движение вниз к цели
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < this.speed) {
            // Удар!
            this.explode(enemies, particles);
        } else {
            this.x += (dx / dist) * this.speed;
            this.y += (dy / dist) * this.speed;
            this.rotation += this.rotationSpeed;

            // След
            if (Math.random() > 0.5) {
                particles.push(new Particle(
                    this.x + (Math.random() - 0.5) * 10,
                    this.y + (Math.random() - 0.5) * 10,
                    (Math.random() - 0.5) * 2,
                    Math.random() * 2,
                    '#ff6b6b',
                    15
                ));
            }
        }
    }

    explode(enemies, particles) {
        this.alive = false;
        this.exploded = true;

        // Урон врагам в радиусе
        for (const enemy of enemies) {
            if (!enemy.alive) continue;

            const dx = enemy.x - this.targetX;
            const dy = enemy.y - this.targetY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist <= this.radius) {
                const dmgMult = 1 - (dist / this.radius) * 0.5;
                enemy.takeDamage(Math.floor(this.damage * dmgMult));
            }
        }

        // Эффект взрыва
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 4;
            particles.push(new Particle(
                this.targetX,
                this.targetY,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                Math.random() > 0.5 ? '#ff6b6b' : '#ffa94d',
                30 + Math.random() * 20
            ));
        }

        audio.play('meteor');
    }

    draw(ctx) {
        if (!this.alive) return;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        // Свечение
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size * 1.5);
        gradient.addColorStop(0, 'rgba(255, 200, 100, 0.8)');
        gradient.addColorStop(0.5, 'rgba(255, 107, 107, 0.5)');
        gradient.addColorStop(1, 'rgba(255, 107, 107, 0)');

        ctx.beginPath();
        ctx.arc(0, 0, this.size * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Ядро метеора
        ctx.beginPath();
        ctx.arc(0, 0, this.size * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = '#ffd43b';
        ctx.fill();

        ctx.restore();
    }
}

// ============================================
// КЛАСС СОЛДАТА-ПОДКРЕПЛЕНИЯ (для способности)
// ============================================

class ReinforcementSoldier {
    constructor(x, y, hp, damage, duration) {
        this.x = x;
        this.y = y;
        this.maxHp = hp;
        this.hp = hp;
        this.damage = damage;

        this.lifetime = duration / (1000 / 60); // Конвертация в кадры
        this.maxLifetime = this.lifetime;

        this.target = null;
        this.attackCooldown = 0;
        this.attackRate = 45; // Быстрее обычных солдат

        this.speed = 2.5;
        this.range = 30;
        this.aggroRange = 100;

        this.alive = true;
        this.attackAnimation = 0;
    }

    update(enemies) {
        if (!this.alive) return;

        // Время жизни
        this.lifetime--;
        if (this.lifetime <= 0) {
            this.alive = false;
            return;
        }

        // Обновление кулдауна
        if (this.attackCooldown > 0) {
            this.attackCooldown--;
        }

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

        this.target.blockedBy = this;
        this.target.takeDamage(this.damage);
        this.attackCooldown = this.attackRate;
        this.attackAnimation = 10;

        audio.play('hit');
    }

    draw(ctx) {
        if (!this.alive) return;

        const x = this.x;
        const y = this.y;
        const r = 10 + this.attackAnimation * 0.5;

        // Тень
        ctx.beginPath();
        ctx.ellipse(x, y + 8, 8, 4, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fill();

        // Тело солдата
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);

        const gradient = ctx.createRadialGradient(x - 2, y - 2, 0, x, y, r);
        gradient.addColorStop(0, '#74c0fc');
        gradient.addColorStop(1, '#4dabf7');
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.strokeStyle = '#339af0';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Иконка щита
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🛡️', x, y);

        // Полоска здоровья
        const hpWidth = 18;
        const hpHeight = 4;
        const hpX = x - hpWidth / 2;
        const hpY = y - r - 6;

        ctx.fillStyle = '#333';
        ctx.fillRect(hpX, hpY, hpWidth, hpHeight);

        const hpPercent = this.hp / this.maxHp;
        ctx.fillStyle = hpPercent > 0.5 ? '#51cf66' : hpPercent > 0.25 ? '#fcc419' : '#ff6b6b';
        ctx.fillRect(hpX, hpY, hpWidth * hpPercent, hpHeight);

        // Таймер оставшегося времени
        const lifePct = this.lifetime / this.maxLifetime;
        ctx.fillStyle = `rgba(116, 192, 252, ${0.3 + lifePct * 0.4})`;
        ctx.beginPath();
        ctx.arc(x, y, r + 3, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * lifePct);
        ctx.stroke();
    }
}
