// ============================================
// КЛАСС ГЕРОЯ (Kingdom Rush стиль)
// С системой уровней и XP
// ============================================

class Hero {
    constructor(x, y, heroType = 'knight') {
        this.x = x;
        this.y = y;
        this.targetX = x;
        this.targetY = y;
        this.type = heroType;

        // Загружаем характеристики выбранного героя
        const cfg = CONFIG.HEROES[heroType] || CONFIG.HEROES.knight;
        this.baseCfg = cfg;

        // Базовые характеристики (до прокачки)
        this.baseMaxHp = cfg.hp;
        this.baseDamage = cfg.damage;
        this.baseAttackSpeed = cfg.attackSpeed;
        this.baseSpeed = cfg.speed;
        this.baseRange = cfg.range;
        this.respawnTime = cfg.respawnTime;
        this.splashRadius = cfg.splashRadius || 0;

        // Система уровней
        this.level = 1;
        this.xp = 0;
        this.xpToNextLevel = CONFIG.HERO_LEVELS.xpPerLevel[1] || 50;

        // Применяем характеристики текущего уровня
        this.applyLevelStats();

        // Состояние
        this.hp = this.maxHp;
        this.alive = true;
        this.respawnTimer = 0;
        this.attackCooldown = 0;

        // Цель
        this.target = null;

        // Анимация
        this.attackAnimation = 0;
        this.walkAnimation = 0;
        this.levelUpAnimation = 0;

        // Внешний вид
        this.radius = 14;
        this.color = cfg.color || '#ffd43b';
        this.icon = cfg.icon || '🦸';
    }

    applyLevelStats() {
        const boost = 1 + (this.level - 1) * CONFIG.HERO_LEVELS.statBoostPerLevel;
        this.maxHp = Math.floor(this.baseMaxHp * boost);
        this.damage = Math.floor(this.baseDamage * boost);
        this.attackSpeed = this.baseAttackSpeed / boost; // Меньше = быстрее
        this.speed = this.baseSpeed * (1 + (this.level - 1) * 0.05); // +5% скорости за уровень
        this.range = this.baseRange + (this.level - 1) * 5; // +5 радиуса за уровень
    }

    addXP(amount) {
        if (this.level >= CONFIG.HERO_LEVELS.maxLevel) return;

        this.xp += amount;

        // Проверка повышения уровня
        while (this.xp >= this.xpToNextLevel && this.level < CONFIG.HERO_LEVELS.maxLevel) {
            this.levelUp();
        }
    }

    levelUp() {
        this.level++;
        this.xp -= this.xpToNextLevel;

        // Обновляем требование XP для следующего уровня
        if (this.level < CONFIG.HERO_LEVELS.maxLevel) {
            this.xpToNextLevel = CONFIG.HERO_LEVELS.xpPerLevel[this.level] || this.xpToNextLevel * 1.5;
        } else {
            this.xpToNextLevel = 0;
            this.xp = 0;
        }

        // Применяем новые характеристики
        this.applyLevelStats();

        // Восстанавливаем здоровье при повышении уровня
        this.hp = this.maxHp;

        // Запускаем анимацию
        this.levelUpAnimation = 60;

        // Звук
        if (typeof audio !== 'undefined') {
            audio.play('levelUp');
        }
    }

    update(enemies) {
        // Респавн
        if (!this.alive) {
            this.respawnTimer--;
            if (this.respawnTimer <= 0) {
                this.respawn();
            }
            return;
        }

        // Обновление кулдаунов
        if (this.attackCooldown > 0) {
            this.attackCooldown--;
        }

        if (this.attackAnimation > 0) {
            this.attackAnimation--;
        }

        if (this.levelUpAnimation > 0) {
            this.levelUpAnimation--;
        }

        // Движение к точке назначения
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const distToTarget = Math.sqrt(dx * dx + dy * dy);

        if (distToTarget > 5) {
            this.x += (dx / distToTarget) * this.speed;
            this.y += (dy / distToTarget) * this.speed;
            this.walkAnimation = (this.walkAnimation + 1) % 20;
        }

        // Поиск цели для атаки
        this.target = this.findTarget(enemies);

        if (this.target && this.attackCooldown <= 0) {
            const distToEnemy = Math.sqrt(
                (this.target.x - this.x) ** 2 +
                (this.target.y - this.y) ** 2
            );

            if (distToEnemy <= this.range) {
                this.attack(enemies);
            }
        }
    }

    findTarget(enemies) {
        let bestTarget = null;
        let bestDist = Infinity;

        for (const enemy of enemies) {
            if (!enemy.alive) continue;

            const dx = enemy.x - this.x;
            const dy = enemy.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist <= this.range * 2 && dist < bestDist) {
                bestDist = dist;
                bestTarget = enemy;
            }
        }

        return bestTarget;
    }

    attack(enemies) {
        if (!this.target || !this.target.alive) return;

        // Урон основной цели
        const killed = this.target.takeDamage(this.damage);

        // Урон по площади для мага
        if (this.splashRadius > 0) {
            for (const enemy of enemies) {
                if (enemy === this.target || !enemy.alive) continue;

                const dx = enemy.x - this.target.x;
                const dy = enemy.y - this.target.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist <= this.splashRadius) {
                    enemy.takeDamage(this.damage * 0.5); // 50% урона по области
                }
            }
        }

        this.attackCooldown = this.attackSpeed * 60;
        this.attackAnimation = 15;

        if (typeof audio !== 'undefined') {
            audio.play('heroAttack');
        }

        return killed;
    }

    moveTo(x, y) {
        this.targetX = x;
        this.targetY = y;
    }

    takeDamage(amount) {
        this.hp -= amount;
        if (this.hp <= 0) {
            this.die();
            return true;
        }
        return false;
    }

    die() {
        this.alive = false;
        this.respawnTimer = this.respawnTime / (1000 / 60);
    }

    respawn() {
        this.alive = true;
        this.hp = this.maxHp;
        this.x = this.targetX;
        this.y = this.targetY;
    }

    draw(ctx) {
        // Если мёртв — показываем таймер респавна
        if (!this.alive) {
            this.drawRespawnIndicator(ctx);
            return;
        }

        const x = this.x;
        const y = this.y;
        const r = this.radius;

        // Эффект повышения уровня
        if (this.levelUpAnimation > 0) {
            const progress = this.levelUpAnimation / 60;
            ctx.beginPath();
            ctx.arc(x, y, r * 3 * (1 - progress), 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, 215, 0, ${progress})`;
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        // Тень
        ctx.beginPath();
        ctx.ellipse(x, y + r, r * 0.8, r * 0.3, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fill();

        // Индикатор радиуса атаки
        ctx.beginPath();
        ctx.arc(x, y, this.range, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${this.hexToRgb(this.color)}, 0.2)`;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Тело героя
        const bounce = Math.sin(this.walkAnimation * 0.3) * 2;
        ctx.beginPath();
        ctx.arc(x, y - bounce, r + this.attackAnimation * 0.3, 0, Math.PI * 2);

        const gradient = ctx.createRadialGradient(x - 3, y - 3 - bounce, 0, x, y - bounce, r);
        gradient.addColorStop(0, this.lightenColor(this.color, 30));
        gradient.addColorStop(1, this.color);
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.strokeStyle = this.darkenColor(this.color, 20);
        ctx.lineWidth = 3;
        ctx.stroke();

        // Уровень над головой
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffd700';
        ctx.fillText(`Lv.${this.level}`, x, y - r - 22);

        // Иконка героя
        ctx.font = '16px Arial';
        ctx.fillText(this.icon, x, y - bounce);

        // Полоска здоровья
        const hpWidth = r * 2.5;
        const hpHeight = 5;
        const hpX = x - hpWidth / 2;
        const hpY = y - r - 14;

        // Фон
        ctx.fillStyle = '#333';
        ctx.fillRect(hpX, hpY, hpWidth, hpHeight);

        // Здоровье
        const hpPercent = this.hp / this.maxHp;
        const hpColor = hpPercent > 0.5 ? '#51cf66' : hpPercent > 0.25 ? '#fcc419' : '#ff6b6b';
        ctx.fillStyle = hpColor;
        ctx.fillRect(hpX, hpY, hpWidth * hpPercent, hpHeight);

        // Рамка
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 1;
        ctx.strokeRect(hpX, hpY, hpWidth, hpHeight);

        // XP бар (под полоской здоровья)
        if (this.level < CONFIG.HERO_LEVELS.maxLevel) {
            const xpWidth = r * 2.5;
            const xpHeight = 3;
            const xpX = x - xpWidth / 2;
            const xpY = y - r - 8;

            ctx.fillStyle = '#222';
            ctx.fillRect(xpX, xpY, xpWidth, xpHeight);

            const xpPercent = this.xp / this.xpToNextLevel;
            ctx.fillStyle = '#9775fa';
            ctx.fillRect(xpX, xpY, xpWidth * xpPercent, xpHeight);
        }
    }

    drawRespawnIndicator(ctx) {
        const x = this.targetX;
        const y = this.targetY;

        // Пульсирующий круг
        const pulse = Math.sin(Date.now() / 200) * 5 + 20;
        ctx.beginPath();
        ctx.arc(x, y, pulse, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${this.hexToRgb(this.color)}, 0.2)`;
        ctx.fill();
        ctx.strokeStyle = `rgba(${this.hexToRgb(this.color)}, 0.5)`;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Таймер
        const seconds = Math.ceil(this.respawnTimer / 60);
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = this.color;
        ctx.fillText(`${this.icon} ${seconds}s`, x, y);
    }

    drawMoveIndicator(ctx) {
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 5) {
            ctx.beginPath();
            ctx.arc(this.targetX, this.targetY, 8, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(${this.hexToRgb(this.color)}, 0.5)`;
            ctx.lineWidth = 2;
            ctx.setLineDash([3, 3]);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }

    // Утилиты для цветов
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (result) {
            return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
        }
        return '255, 212, 59';
    }

    lightenColor(hex, percent) {
        const num = parseInt(hex.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.min(255, (num >> 16) + amt);
        const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
        const B = Math.min(255, (num & 0x0000FF) + amt);
        return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`;
    }

    darkenColor(hex, percent) {
        const num = parseInt(hex.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.max(0, (num >> 16) - amt);
        const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
        const B = Math.max(0, (num & 0x0000FF) - amt);
        return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`;
    }
}
