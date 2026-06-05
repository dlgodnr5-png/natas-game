// ============================================
// КЛАСС БАШНИ
// ============================================

class Tower {
    constructor(x, y, type) {
        const template = CONFIG.TOWER_TYPES[type];

        this.x = x;
        this.y = y;
        this.type = type;
        this.name = template.name;
        this.icon = template.icon;

        // Характеристики
        this.baseCost = template.cost;
        this.range = template.range;
        this.damage = template.damage;
        this.fireRate = template.fireRate;
        this.color = template.color;

        // Особые свойства
        this.slowAmount = template.slowAmount || 0;
        this.slowDuration = template.slowDuration || 0;
        this.splashRadius = template.splashRadius || 0;

        // Казарма
        this.soldierCount = template.soldierCount || 0;
        this.soldierHp = template.soldierHp || 0;
        this.soldierDamage = template.soldierDamage || 0;
        this.soldiers = [];

        // Уровень и улучшения
        this.level = 1;
        this.maxLevel = 3;
        this.totalSpent = template.cost;

        // Состояние стрельбы
        this.fireCooldown = 0;
        this.target = null;
        this.angle = 0;

        // Для лазера
        this.laserTarget = null;

        // Анимация
        this.shootAnimation = 0;
    }

    update(enemies, projectiles) {
        // Обновление кулдауна
        if (this.fireCooldown > 0) {
            this.fireCooldown--;
        }

        // Обновление анимации
        if (this.shootAnimation > 0) {
            this.shootAnimation--;
        }

        // Казарма: обновление солдат
        if (this.type === 'barracks') {
            this.updateBarracks(enemies);
            return;
        }

        // Поиск цели
        this.target = this.findTarget(enemies);

        if (this.target) {
            // Поворот к цели
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            this.angle = Math.atan2(dy, dx);

            // Лазер — непрерывный урон
            if (this.type === 'laser') {
                this.laserTarget = this.target;
                this.target.takeDamage(this.damage);
            }
            // Обычные башни — стрельба снарядами
            else if (this.fireCooldown <= 0) {
                this.shoot(projectiles);
            }
        } else {
            this.laserTarget = null;
        }
    }

    findTarget(enemies) {
        let bestTarget = null;
        let bestProgress = -1;

        for (const enemy of enemies) {
            if (!enemy.alive) continue;

            // Летающие враги — только определённые башни могут атаковать
            if (enemy.flying && this.type === 'cannon') continue;

            const dx = enemy.x - this.x;
            const dy = enemy.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist <= this.range) {
                const progress = enemy.getProgress();
                if (progress > bestProgress) {
                    bestProgress = progress;
                    bestTarget = enemy;
                }
            }
        }

        return bestTarget;
    }

    shoot(projectiles) {
        if (!this.target) return;

        const projectile = new Projectile(
            this.x,
            this.y,
            this.target,
            this.damage,
            this.type
        );

        // Особые эффекты
        if (this.slowAmount > 0) {
            projectile.slowAmount = this.slowAmount;
            projectile.slowDuration = this.slowDuration;
        }
        if (this.splashRadius > 0) {
            projectile.splashRadius = this.splashRadius;
        }

        projectiles.push(projectile);
        this.fireCooldown = this.fireRate * 60;
        this.shootAnimation = 10;

        audio.play('shoot');
    }

    // Обновление казармы
    updateBarracks(enemies) {
        // Спавн солдат, если нужно
        while (this.soldiers.length < this.soldierCount) {
            const angle = (this.soldiers.length / this.soldierCount) * Math.PI * 2;
            const spawnX = this.x + Math.cos(angle) * 40;
            const spawnY = this.y + Math.sin(angle) * 40;

            const soldier = new Soldier(
                spawnX,
                spawnY,
                this.soldierHp,
                this.soldierDamage,
                this
            );
            this.soldiers.push(soldier);
        }

        // Обновление солдат
        for (const soldier of this.soldiers) {
            soldier.update(enemies);
        }

        // Удаление мёртвых солдат
        this.soldiers = this.soldiers.filter(s => s.alive);
    }

    upgrade() {
        if (this.level >= this.maxLevel) return false;

        const cost = this.getUpgradeCost();
        this.level++;
        this.totalSpent += cost;

        // Улучшение характеристик
        const boost = CONFIG.UPGRADE_STAT_BOOST;
        this.range = Math.floor(this.range * boost);
        this.damage = Math.floor(this.damage * boost);

        if (this.fireRate > 0) {
            this.fireRate *= 0.85; // Быстрее стреляет
        }

        // Казарма: улучшение солдат
        if (this.type === 'barracks') {
            this.soldierHp = Math.floor(this.soldierHp * boost);
            this.soldierDamage = Math.floor(this.soldierDamage * boost);
            if (this.level === 3) {
                this.soldierCount++; // +1 солдат на макс уровне
            }
        }

        audio.play('upgrade');
        return true;
    }

    getUpgradeCost() {
        return Math.floor(this.baseCost * CONFIG.UPGRADE_COSTS[this.level]);
    }

    getSellValue() {
        return Math.floor(this.totalSpent * CONFIG.SELL_RETURN);
    }

    draw(ctx) {
        const x = this.x;
        const y = this.y;

        // Основание башни
        ctx.beginPath();
        ctx.arc(x, y, 22, 0, Math.PI * 2);

        const baseGradient = ctx.createRadialGradient(x, y - 5, 0, x, y, 22);
        baseGradient.addColorStop(0, '#4a4a6a');
        baseGradient.addColorStop(1, '#2a2a4a');
        ctx.fillStyle = baseGradient;
        ctx.fill();

        ctx.strokeStyle = this.color;
        ctx.lineWidth = 3;
        ctx.stroke();

        // Уровень (звёзды)
        if (this.level > 1) {
            ctx.fillStyle = '#ffd43b';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            const stars = '★'.repeat(this.level - 1);
            ctx.fillText(stars, x, y - 28);
        }

        // Пушка (для не-казармы)
        if (this.type !== 'barracks') {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(this.angle);

            // Тело пушки
            const gunLength = 18 + this.shootAnimation;
            ctx.fillStyle = this.color;
            ctx.fillRect(0, -4, gunLength, 8);

            // Дуло
            ctx.fillStyle = '#1a1a2e';
            ctx.fillRect(gunLength - 3, -2, 3, 4);

            ctx.restore();
        }

        // Иконка башни
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.icon, x, y);

        // Лазер
        if (this.type === 'laser' && this.laserTarget) {
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(this.laserTarget.x, this.laserTarget.y);

            ctx.strokeStyle = this.color;
            ctx.lineWidth = 3;
            ctx.stroke();

            ctx.strokeStyle = 'rgba(255, 107, 107, 0.5)';
            ctx.lineWidth = 8;
            ctx.stroke();
        }

        // Отрисовка солдат
        for (const soldier of this.soldiers) {
            soldier.draw(ctx);
        }
    }

    drawRange(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.range, 0, Math.PI * 2);
        ctx.fillStyle = CONFIG.COLORS.rangeIndicator;
        ctx.fill();
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
    }
}
