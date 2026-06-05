// ============================================
// КЛАСС СНАРЯДА
// ============================================

class Projectile {
    constructor(x, y, target, damage, type) {
        this.x = x;
        this.y = y;
        this.target = target;
        this.damage = damage;
        this.type = type;

        this.speed = this.getSpeedByType(type);
        this.radius = this.getRadiusByType(type);
        this.color = this.getColorByType(type);

        // Особые эффекты
        this.slowAmount = 0;
        this.slowDuration = 0;
        this.splashRadius = 0;

        this.alive = true;
    }

    getSpeedByType(type) {
        const speeds = {
            basic: 8,
            frost: 6,
            sniper: 15,
            cannon: 5
        };
        return speeds[type] || 8;
    }

    getRadiusByType(type) {
        const radii = {
            basic: 4,
            frost: 5,
            sniper: 3,
            cannon: 8
        };
        return radii[type] || 4;
    }

    getColorByType(type) {
        return CONFIG.TOWER_TYPES[type]?.color || '#fff';
    }

    update(enemies, particles) {
        if (!this.alive) return;

        // Если цель мертва или исчезла
        if (!this.target || !this.target.alive) {
            this.alive = false;
            return;
        }

        // Движение к цели
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < this.speed) {
            // Попадание!
            this.hit(enemies, particles);
        } else {
            this.x += (dx / dist) * this.speed;
            this.y += (dy / dist) * this.speed;
        }
    }

    hit(enemies, particles) {
        this.alive = false;

        // Splash урон
        if (this.splashRadius > 0) {
            for (const enemy of enemies) {
                if (!enemy.alive) continue;

                const dx = enemy.x - this.x;
                const dy = enemy.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist <= this.splashRadius) {
                    // Урон уменьшается от центра
                    const dmgMult = 1 - (dist / this.splashRadius) * 0.5;
                    enemy.takeDamage(Math.floor(this.damage * dmgMult));
                }
            }

            // Эффект взрыва
            this.createExplosion(particles);
            audio.play('explosion');
        } else {
            // Обычное попадание
            if (this.target && this.target.alive) {
                this.target.takeDamage(this.damage);

                // Замедление
                if (this.slowAmount > 0) {
                    this.target.applySlow(this.slowAmount, this.slowDuration);
                }

                // Частицы попадания
                this.createHitParticles(particles);
            }

            audio.play('hit');
        }
    }

    createExplosion(particles) {
        for (let i = 0; i < 15; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 3;
            particles.push(new Particle(
                this.x,
                this.y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                this.color,
                20 + Math.random() * 20
            ));
        }
    }

    createHitParticles(particles) {
        for (let i = 0; i < 5; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.5 + Math.random() * 2;
            particles.push(new Particle(
                this.x,
                this.y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                this.color,
                10 + Math.random() * 10
            ));
        }
    }

    draw(ctx) {
        if (!this.alive) return;

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);

        // Свечение
        const gradient = ctx.createRadialGradient(
            this.x, this.y, 0,
            this.x, this.y, this.radius * 2
        );
        gradient.addColorStop(0, this.color);
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.fill();

        // Ядро
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();
    }
}
