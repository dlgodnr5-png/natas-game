// ============================================
// ОСНОВНОЙ ИГРОВОЙ КЛАСС
// ============================================

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        // Состояние игры
        this.state = 'menu'; // menu, playing, paused, gameover
        this.difficulty = 'normal';
        this.diffSettings = null;
        this.selectedHeroType = 'knight';

        // Игровые объекты
        this.enemies = [];
        this.towers = [];
        this.projectiles = [];
        this.particles = [];
        this.meteors = [];
        this.reinforcements = [];
        this.hero = null;

        // Статистика
        this.money = 200;
        this.lives = 20;
        this.wave = 0;
        this.score = 0;
        this.kills = 0;
        this.towersBuilt = 0;

        // Волны
        this.waveInProgress = false;
        this.enemiesSpawned = 0;
        this.enemiesToSpawn = 0;
        this.spawnTimer = 0;
        this.spawnDelay = 40;
        this.waveEnemyTypes = [];

        // Скорость игры
        this.gameSpeed = 1;
        this.speedOptions = [1, 2, 3];
        this.speedIndex = 0;

        // Выбранная башня
        this.selectedTowerType = 'basic';
        this.hoveredTower = null;
        this.selectedTower = null;

        // Способности
        this.abilities = {
            rainOfFire: {
                ready: true,
                cooldown: 0,
                maxCooldown: CONFIG.ABILITIES.rainOfFire.cooldown
            },
            reinforcements: {
                ready: true,
                cooldown: 0,
                maxCooldown: CONFIG.ABILITIES.reinforcements.cooldown
            }
        };
        this.activeAbility = null;

        // Позиция мыши
        this.mouseX = 0;
        this.mouseY = 0;
        this.canvasRect = null;

        // ID игрового цикла для отмены при рестарте
        this.animationFrameId = null;

        // Настройки
        this.settings = saveSystem.getSettings();

        this.initEventListeners();
    }

    initEventListeners() {
        // Движение мыши
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));

        // Клик левой кнопкой
        this.canvas.addEventListener('click', (e) => this.onLeftClick(e));

        // Клик правой кнопкой
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.onRightClick(e);
        });

        // Клавиатура
        document.addEventListener('keydown', (e) => this.onKeyDown(e));

        // Кнопки UI
        document.getElementById('start-wave-btn').addEventListener('click', () => this.startWave());
        document.getElementById('speed-btn').addEventListener('click', () => this.toggleSpeed());
        document.getElementById('pause-btn').addEventListener('click', () => this.togglePause());
        document.getElementById('mute-btn').addEventListener('click', () => this.toggleMute());

        // Кнопки паузы
        document.getElementById('resume-btn').addEventListener('click', () => this.resume());
        document.getElementById('restart-btn').addEventListener('click', () => this.restart());
        document.getElementById('exit-btn').addEventListener('click', () => this.exitToMenu());

        // Кнопки результата
        document.getElementById('result-restart-btn').addEventListener('click', () => this.restart());
        document.getElementById('result-menu-btn').addEventListener('click', () => this.exitToMenu());

        // Кнопки башен
        document.querySelectorAll('.tower-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.selectTowerType(btn.dataset.tower);
            });
        });

        // Меню апгрейда
        document.querySelector('#upgrade-menu .close-btn').addEventListener('click', () => this.closeUpgradeMenu());
        document.getElementById('upgrade-btn').addEventListener('click', () => this.upgradeTower());
        document.getElementById('sell-btn').addEventListener('click', () => this.sellTower());

        // Кнопки способностей
        const abilityFire = document.getElementById('ability-fire');
        const abilityReinforce = document.getElementById('ability-reinforce');
        if (abilityFire) {
            abilityFire.addEventListener('click', (e) => {
                e.stopPropagation();
                this.activateAbility('rainOfFire');
            });
        }
        if (abilityReinforce) {
            abilityReinforce.addEventListener('click', (e) => {
                e.stopPropagation();
                this.activateAbility('reinforcements');
            });
        }
    }

    start(difficulty) {
        // Отменяем предыдущий игровой цикл если он существует
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        this.difficulty = difficulty;
        this.diffSettings = CONFIG.DIFFICULTIES[difficulty];

        // Сброс состояния
        this.state = 'playing';
        this.money = this.diffSettings.startMoney;
        this.lives = this.diffSettings.startLives;
        this.wave = 0;
        this.score = 0;
        this.kills = 0;
        this.towersBuilt = 0;

        this.enemies = [];
        this.towers = [];
        this.projectiles = [];
        this.particles = [];
        this.meteors = [];
        this.reinforcements = [];

        this.waveInProgress = false;

        // Сброс способностей
        this.abilities.rainOfFire.ready = true;
        this.abilities.rainOfFire.cooldown = 0;
        this.abilities.reinforcements.ready = true;
        this.abilities.reinforcements.cooldown = 0;
        this.activeAbility = null;

        // Сброс выбора башни
        this.selectedTowerType = 'basic';
        this.selectedTower = null;

        // Создание героя выбранного типа
        this.hero = new Hero(450, 300, this.selectedHeroType);

        // Обновление UI
        this.updateUI();
        this.updateTowerButtons();
        this.updateAbilityUI();

        // Сброс кнопки волны
        document.getElementById('start-wave-btn').disabled = false;

        // Сброс выделения башен
        document.querySelectorAll('.tower-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        document.querySelector('.tower-btn.basic')?.classList.add('selected');

        // Запуск игрового цикла
        this.canvasRect = this.canvas.getBoundingClientRect();
        this.gameLoop();

        audio.init();
    }

    gameLoop() {
        // Останавливаем цикл если игра завершена или вышли в меню
        if (this.state === 'gameover' || this.state === 'menu') {
            this.animationFrameId = null;
            return;
        }

        try {
            if (this.state === 'playing') {
                for (let i = 0; i < this.gameSpeed; i++) {
                    this.update();
                }
            }

            this.render();
        } catch (error) {
            console.error('Game loop error:', error);
        }

        this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
    }

    update() {
        // Спавн врагов
        if (this.waveInProgress && this.enemiesSpawned < this.enemiesToSpawn) {
            this.spawnTimer--;
            if (this.spawnTimer <= 0) {
                this.spawnEnemy();
                this.spawnTimer = this.spawnDelay;
            }
        }

        // Обновление врагов
        for (const enemy of this.enemies) {
            enemy.update();

            // Лечение (для целителей)
            if (enemy.alive && enemy.healAmount > 0) {
                this.healNearbyEnemies(enemy);
            }
        }

        // Проверка достигших конца
        for (const enemy of this.enemies) {
            if (enemy.reachedEnd) {
                this.lives--;
                this.updateUI();

                if (this.lives <= 0) {
                    this.gameOver(false);
                    return;
                }
            }
        }

        // Удаление мёртвых врагов
        const killedEnemies = this.enemies.filter(e => !e.alive && !e.reachedEnd);
        for (const enemy of killedEnemies) {
            this.money += enemy.reward;
            this.score += Math.floor(enemy.reward * this.diffSettings.scoreMult);
            this.kills++;
            this.createDeathParticles(enemy);

            // Добавляем XP герою
            if (this.hero && this.hero.alive) {
                const xpAmount = CONFIG.HERO_LEVELS.xpPerKill[enemy.type] || 10;
                this.hero.addXP(xpAmount);
            }
        }
        this.enemies = this.enemies.filter(e => e.alive);

        // Обновление башен
        for (const tower of this.towers) {
            tower.update(this.enemies, this.projectiles);
        }

        // Обновление снарядов
        for (const proj of this.projectiles) {
            proj.update(this.enemies, this.particles);
        }
        this.projectiles = this.projectiles.filter(p => p.alive);

        // Обновление частиц
        for (const particle of this.particles) {
            particle.update();
        }
        this.particles = this.particles.filter(p => p.alive);

        // Обновление метеоров
        for (const meteor of this.meteors) {
            meteor.update(this.enemies, this.particles);
        }
        this.meteors = this.meteors.filter(m => m.alive);

        // Обновление солдат подкрепления
        for (const soldier of this.reinforcements) {
            soldier.update(this.enemies);
        }
        this.reinforcements = this.reinforcements.filter(s => s.alive);

        // Обновление героя
        if (this.hero) {
            this.hero.update(this.enemies);
        }

        // Обновление кулдаунов способностей
        this.updateAbilityCooldowns();

        // Проверка конца волны
        if (this.waveInProgress && this.enemies.length === 0 && this.enemiesSpawned >= this.enemiesToSpawn) {
            this.waveInProgress = false;
            document.getElementById('start-wave-btn').disabled = false;

            // Автостарт следующей волны
            if (this.settings.autoWave && this.wave < this.diffSettings.totalWaves) {
                setTimeout(() => this.startWave(), 2000);
            }

            // Проверка победы
            if (this.wave >= this.diffSettings.totalWaves) {
                this.gameOver(true);
            }
        }

        this.updateUI();
    }

    render() {
        const ctx = this.ctx;

        // Очистка
        ctx.fillStyle = CONFIG.COLORS.background;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Сетка
        this.drawGrid();

        // Путь
        this.drawPath();

        // Индикатор места для башни
        this.drawPlacementIndicator();

        // Башни
        for (const tower of this.towers) {
            tower.draw(ctx);
        }

        // Враги
        for (const enemy of this.enemies) {
            enemy.draw(ctx);
        }

        // Снаряды
        for (const proj of this.projectiles) {
            proj.draw(ctx);
        }

        // Метеоры
        for (const meteor of this.meteors) {
            meteor.draw(ctx);
        }

        // Солдаты подкрепления
        for (const soldier of this.reinforcements) {
            soldier.draw(ctx);
        }

        // Частицы
        for (const particle of this.particles) {
            particle.draw(ctx);
        }

        // Герой
        if (this.hero) {
            this.hero.drawMoveIndicator(ctx);
            this.hero.draw(ctx);
        }

        // Индикатор способности
        if (this.activeAbility) {
            this.drawAbilityIndicator();
        }

        // Радиус выбранной башни
        if (this.selectedTower && this.settings.showRange) {
            this.selectedTower.drawRange(ctx);
        }
    }

    drawGrid() {
        const ctx = this.ctx;
        ctx.strokeStyle = CONFIG.COLORS.grid;
        ctx.lineWidth = 1;

        const step = 40;
        for (let x = 0; x < this.canvas.width; x += step) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y < this.canvas.height; y += step) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.canvas.width, y);
            ctx.stroke();
        }
    }

    drawPath() {
        const ctx = this.ctx;
        const path = CONFIG.PATH;

        // Основной путь
        ctx.beginPath();
        ctx.moveTo(path[0].x, path[0].y);
        for (let i = 1; i < path.length; i++) {
            ctx.lineTo(path[i].x, path[i].y);
        }
        ctx.strokeStyle = CONFIG.COLORS.path;
        ctx.lineWidth = 50;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();

        // Обводка
        ctx.strokeStyle = CONFIG.COLORS.pathBorder;
        ctx.lineWidth = 54;
        ctx.stroke();

        // Направляющие стрелки
        for (let i = 0; i < path.length - 1; i++) {
            const midX = (path[i].x + path[i + 1].x) / 2;
            const midY = (path[i].y + path[i + 1].y) / 2;
            const angle = Math.atan2(path[i + 1].y - path[i].y, path[i + 1].x - path[i].x);

            ctx.save();
            ctx.translate(midX, midY);
            ctx.rotate(angle);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.beginPath();
            ctx.moveTo(10, 0);
            ctx.lineTo(-5, -8);
            ctx.lineTo(-5, 8);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
    }

    drawPlacementIndicator() {
        if (!this.isMouseOnCanvas()) return;

        // Не показываем индикатор башни если активна способность
        if (this.activeAbility) return;

        // Не показываем если не выбрана башня
        if (!this.selectedTowerType) return;

        const ctx = this.ctx;
        const towerType = CONFIG.TOWER_TYPES[this.selectedTowerType];
        if (!towerType) return;

        const canPlace = this.canPlaceTower(this.mouseX, this.mouseY);

        // Радиус башни
        if (this.settings.showRange && canPlace) {
            ctx.beginPath();
            ctx.arc(this.mouseX, this.mouseY, towerType.range, 0, Math.PI * 2);
            ctx.fillStyle = CONFIG.COLORS.rangeIndicator;
            ctx.fill();
        }

        // Индикатор позиции
        ctx.beginPath();
        ctx.arc(this.mouseX, this.mouseY, 22, 0, Math.PI * 2);
        ctx.fillStyle = canPlace ? 'rgba(81, 207, 102, 0.3)' : CONFIG.COLORS.invalidPlacement;
        ctx.fill();
        ctx.strokeStyle = canPlace ? '#51cf66' : '#ff6b6b';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    drawAbilityIndicator() {
        const ctx = this.ctx;
        const ability = CONFIG.ABILITIES[this.activeAbility];

        if (!ability || !ability.radius) return;

        ctx.beginPath();
        ctx.arc(this.mouseX, this.mouseY, ability.radius, 0, Math.PI * 2);

        if (this.activeAbility === 'rainOfFire') {
            ctx.fillStyle = 'rgba(255, 107, 107, 0.3)';
            ctx.strokeStyle = '#ff6b6b';
        } else {
            ctx.fillStyle = 'rgba(116, 192, 252, 0.3)';
            ctx.strokeStyle = '#74c0fc';
        }

        ctx.fill();
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    // ===== СОБЫТИЯ =====

    onMouseMove(e) {
        this.canvasRect = this.canvas.getBoundingClientRect();
        this.mouseX = e.clientX - this.canvasRect.left;
        this.mouseY = e.clientY - this.canvasRect.top;
    }

    onLeftClick(e) {
        if (this.state !== 'playing') return;

        // Проверка что клик внутри canvas
        if (this.mouseX < 0 || this.mouseX > this.canvas.width ||
            this.mouseY < 0 || this.mouseY > this.canvas.height) {
            return;
        }

        this.closeUpgradeMenu();

        // Если активна способность
        if (this.activeAbility) {
            this.useAbility(this.mouseX, this.mouseY);
            return;
        }

        // Попытка поставить башню
        if (this.canPlaceTower(this.mouseX, this.mouseY)) {
            this.placeTower(this.mouseX, this.mouseY);
        }
    }

    onRightClick(e) {
        if (this.state !== 'playing') return;

        // Проверка клика по башне
        const tower = this.getTowerAt(this.mouseX, this.mouseY);
        if (tower) {
            this.openUpgradeMenu(tower, e.clientX, e.clientY);
            return;
        }

        // Перемещение героя
        if (this.hero) {
            this.hero.moveTo(this.mouseX, this.mouseY);
        }
    }

    onKeyDown(e) {
        // Выбор башни 1-6
        if (e.key >= '1' && e.key <= '6') {
            const types = ['basic', 'frost', 'sniper', 'cannon', 'laser', 'barracks'];
            const index = parseInt(e.key) - 1;
            if (types[index]) {
                this.selectTowerType(types[index]);
            }
        }

        // Пробел — начать волну
        if (e.key === ' ' && this.state === 'playing') {
            e.preventDefault();
            if (!this.waveInProgress) {
                this.startWave();
            }
        }

        // Escape — пауза
        if (e.key === 'Escape') {
            if (this.state === 'playing') {
                this.pause();
            } else if (this.state === 'paused') {
                this.resume();
            }
        }

        // Q, W — способности
        if (e.key === 'q' || e.key === 'Q' || e.key === 'й' || e.key === 'Й') {
            this.activateAbility('rainOfFire');
        }
        if (e.key === 'w' || e.key === 'W' || e.key === 'ц' || e.key === 'Ц') {
            this.activateAbility('reinforcements');
        }
    }

    // ===== БАШНИ =====

    selectTowerType(type) {
        this.selectedTowerType = type;
        this.activeAbility = null;

        document.querySelectorAll('.tower-btn').forEach(btn => {
            btn.classList.toggle('selected', btn.dataset.tower === type);
        });
    }

    canPlaceTower(x, y) {
        // Если не выбрана башня (например, активна способность)
        if (!this.selectedTowerType) return false;

        const towerType = CONFIG.TOWER_TYPES[this.selectedTowerType];
        if (!towerType) return false;

        const cost = towerType.cost;
        if (this.money < cost) return false;

        // Проверка пути
        if (this.isOnPath(x, y)) return false;

        // Проверка других башен
        for (const tower of this.towers) {
            const dx = tower.x - x;
            const dy = tower.y - y;
            if (Math.sqrt(dx * dx + dy * dy) < 50) return false;
        }

        return true;
    }

    isOnPath(x, y) {
        const path = CONFIG.PATH;
        const threshold = 35;

        for (let i = 0; i < path.length - 1; i++) {
            const dist = this.pointToSegmentDistance(
                x, y,
                path[i].x, path[i].y,
                path[i + 1].x, path[i + 1].y
            );
            if (dist < threshold) return true;
        }
        return false;
    }

    pointToSegmentDistance(px, py, x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len2 = dx * dx + dy * dy;

        if (len2 === 0) {
            return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
        }

        let t = ((px - x1) * dx + (py - y1) * dy) / len2;
        t = Math.max(0, Math.min(1, t));

        const projX = x1 + t * dx;
        const projY = y1 + t * dy;

        return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
    }

    placeTower(x, y) {
        const type = this.selectedTowerType;
        const cost = CONFIG.TOWER_TYPES[type].cost;

        this.money -= cost;
        const tower = new Tower(x, y, type);
        this.towers.push(tower);
        this.towersBuilt++;

        audio.play('place');
        this.updateUI();
        this.updateTowerButtons();
    }

    getTowerAt(x, y) {
        for (const tower of this.towers) {
            const dx = tower.x - x;
            const dy = tower.y - y;
            if (Math.sqrt(dx * dx + dy * dy) < 25) {
                return tower;
            }
        }
        return null;
    }

    openUpgradeMenu(tower, clientX, clientY) {
        this.selectedTower = tower;

        const menu = document.getElementById('upgrade-menu');
        const stats = document.getElementById('upgrade-stats');
        const title = document.getElementById('upgrade-title');
        const stars = document.getElementById('level-stars');
        const upgradeBtn = document.getElementById('upgrade-btn');
        const sellBtn = document.getElementById('sell-btn');

        title.textContent = `${tower.icon} ${tower.name}`;
        stars.textContent = '★'.repeat(tower.level) + '☆'.repeat(tower.maxLevel - tower.level);

        stats.innerHTML = `
            <div>Урон: ${tower.damage}</div>
            <div>Радиус: ${tower.range}</div>
        `;

        if (tower.level < tower.maxLevel) {
            const cost = tower.getUpgradeCost();
            upgradeBtn.textContent = `Улучшить (${cost}$)`;
            upgradeBtn.disabled = this.money < cost;
            upgradeBtn.style.display = 'block';
        } else {
            upgradeBtn.style.display = 'none';
        }

        sellBtn.textContent = `Продать (${tower.getSellValue()}$)`;

        // Позиционирование
        menu.style.display = 'block';
        menu.style.left = clientX + 'px';
        menu.style.top = clientY + 'px';
    }

    closeUpgradeMenu() {
        document.getElementById('upgrade-menu').style.display = 'none';
        this.selectedTower = null;
    }

    upgradeTower() {
        if (!this.selectedTower) return;

        const cost = this.selectedTower.getUpgradeCost();
        if (this.money >= cost) {
            this.money -= cost;
            this.selectedTower.upgrade();
            this.updateUI();
            this.closeUpgradeMenu();
        }
    }

    sellTower() {
        if (!this.selectedTower) return;

        this.money += this.selectedTower.getSellValue();
        this.towers = this.towers.filter(t => t !== this.selectedTower);

        audio.play('sell');
        this.updateUI();
        this.updateTowerButtons();
        this.closeUpgradeMenu();
    }

    // ===== ВОЛНЫ =====

    startWave() {
        if (this.waveInProgress) return;
        if (this.wave >= this.diffSettings.totalWaves) return;

        this.wave++;
        this.waveInProgress = true;
        this.enemiesSpawned = 0;

        // Расчёт количества и типов врагов
        this.enemiesToSpawn = 5 + this.wave * 2;
        this.waveEnemyTypes = this.getWaveEnemyTypes();
        this.spawnDelay = Math.max(20, 50 - this.wave);

        document.getElementById('start-wave-btn').disabled = true;

        audio.play('wave');
        this.updateUI();
    }

    getWaveEnemyTypes() {
        const types = [];

        // Базовые враги всегда
        for (let i = 0; i < this.enemiesToSpawn; i++) {
            types.push('normal');
        }

        // Быстрые с волны 2
        if (this.wave >= 2) {
            const count = Math.floor(this.wave / 2);
            for (let i = 0; i < count; i++) {
                types[Math.floor(Math.random() * types.length)] = 'fast';
            }
        }

        // Танки с волны 4
        if (this.wave >= 4) {
            const count = Math.floor(this.wave / 4);
            for (let i = 0; i < count; i++) {
                types[Math.floor(Math.random() * types.length)] = 'tank';
            }
        }

        // Летающие с волны 5
        if (this.wave >= 5) {
            const count = Math.floor(this.wave / 5);
            for (let i = 0; i < count; i++) {
                types[Math.floor(Math.random() * types.length)] = 'flying';
            }
        }

        // Целители с волны 7
        if (this.wave >= 7) {
            const count = Math.floor((this.wave - 5) / 3);
            for (let i = 0; i < count; i++) {
                types[Math.floor(Math.random() * types.length)] = 'healer';
            }
        }

        // Босс каждые 5 волн
        if (this.wave % 5 === 0) {
            types.push('boss');
        }

        return types;
    }

    spawnEnemy() {
        const type = this.waveEnemyTypes[this.enemiesSpawned] || 'normal';
        const enemy = new Enemy(type, this.wave, this.difficulty);
        this.enemies.push(enemy);
        this.enemiesSpawned++;
    }

    healNearbyEnemies(healer) {
        for (const enemy of this.enemies) {
            if (enemy === healer || !enemy.alive) continue;

            const dx = enemy.x - healer.x;
            const dy = enemy.y - healer.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist <= healer.healRange) {
                enemy.heal(healer.healAmount);
            }
        }
    }

    // ===== СПОСОБНОСТИ =====

    activateAbility(type) {
        // Проверка что игра запущена и способность готова
        if (this.state !== 'playing') return;
        if (!this.abilities[type] || !this.abilities[type].ready) return;

        this.activeAbility = type;
        this.selectedTowerType = null;

        document.querySelectorAll('.tower-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
    }

    useAbility(x, y) {
        const type = this.activeAbility;
        if (!type || !this.abilities[type].ready) return;

        // Проверка что координаты внутри canvas
        if (x < 0 || x > this.canvas.width || y < 0 || y > this.canvas.height) {
            return; // Не тратим способность если клик вне игрового поля
        }

        if (type === 'rainOfFire') {
            this.useRainOfFire(x, y);
        } else if (type === 'reinforcements') {
            this.useReinforcements(x, y);
        }

        this.abilities[type].ready = false;
        this.abilities[type].cooldown = this.abilities[type].maxCooldown;
        this.activeAbility = null;

        audio.play('ability');
        this.updateAbilityUI();
    }

    useRainOfFire(x, y) {
        const cfg = CONFIG.ABILITIES.rainOfFire;

        // Проверка что координаты в пределах canvas
        if (x < 0 || x > this.canvas.width || y < 0 || y > this.canvas.height) {
            return;
        }

        // Создаём несколько метеоров
        const self = this;
        for (let i = 0; i < 5; i++) {
            const offsetX = (Math.random() - 0.5) * cfg.radius;
            const offsetY = (Math.random() - 0.5) * cfg.radius;

            setTimeout(function() {
                if (self.state === 'playing') {
                    self.meteors.push(new Meteor(
                        x + offsetX,
                        y + offsetY,
                        cfg.damage,
                        cfg.radius * 0.5
                    ));
                }
            }, i * 200);
        }
    }

    useReinforcements(x, y) {
        const cfg = CONFIG.ABILITIES.reinforcements;

        for (let i = 0; i < cfg.soldierCount; i++) {
            const angle = (i / cfg.soldierCount) * Math.PI * 2;
            const spawnX = x + Math.cos(angle) * 30;
            const spawnY = y + Math.sin(angle) * 30;

            this.reinforcements.push(new ReinforcementSoldier(
                spawnX,
                spawnY,
                cfg.soldierHp,
                cfg.soldierDamage,
                cfg.duration
            ));
        }
    }

    updateAbilityCooldowns() {
        const dt = 1000 / 60; // ~16ms per frame

        for (const key in this.abilities) {
            const ab = this.abilities[key];
            if (!ab.ready && ab.cooldown > 0) {
                ab.cooldown -= dt;
                if (ab.cooldown <= 0) {
                    ab.cooldown = 0;
                    ab.ready = true;
                }
            }
        }

        this.updateAbilityUI();
    }

    updateAbilityUI() {
        // Огненный дождь
        const fireBtn = document.getElementById('ability-fire');
        const fireCd = document.getElementById('fire-cooldown');
        const ab1 = this.abilities.rainOfFire;

        if (fireBtn && fireCd && ab1) {
            if (ab1.ready) {
                fireBtn.classList.remove('on-cooldown');
                fireCd.style.display = 'none';
            } else {
                fireBtn.classList.add('on-cooldown');
                fireCd.style.display = 'block';
                fireCd.textContent = Math.ceil(ab1.cooldown / 1000) + 's';
            }
        }

        // Подкрепление
        const reBtn = document.getElementById('ability-reinforce');
        const reCd = document.getElementById('reinforce-cooldown');
        const ab2 = this.abilities.reinforcements;

        if (reBtn && reCd && ab2) {
            if (ab2.ready) {
                reBtn.classList.remove('on-cooldown');
                reCd.style.display = 'none';
            } else {
                reBtn.classList.add('on-cooldown');
                reCd.style.display = 'block';
                reCd.textContent = Math.ceil(ab2.cooldown / 1000) + 's';
            }
        }
    }

    // ===== УПРАВЛЕНИЕ =====

    toggleSpeed() {
        this.speedIndex = (this.speedIndex + 1) % this.speedOptions.length;
        this.gameSpeed = this.speedOptions[this.speedIndex];

        document.getElementById('speed-btn').textContent = `▶ x${this.gameSpeed}`;
    }

    togglePause() {
        if (this.state === 'playing') {
            this.pause();
        } else if (this.state === 'paused') {
            this.resume();
        }
    }

    pause() {
        this.state = 'paused';
        menuSystem.showPause();
    }

    resume() {
        this.state = 'playing';
        menuSystem.hidePause();
        this.gameLoop();
    }

    toggleMute() {
        const muted = audio.toggleMute();
        document.getElementById('mute-btn').textContent = muted ? '🔇' : '🔊';
    }

    restart() {
        menuSystem.hidePause();
        menuSystem.hideResult();
        this.start(this.difficulty);
    }

    exitToMenu() {
        this.state = 'menu';
        menuSystem.showMainMenu();
    }

    gameOver(victory) {
        this.state = 'gameover';

        if (victory) {
            audio.play('victory');
        } else {
            audio.play('gameover');
        }

        menuSystem.showResult(victory, {
            wave: this.wave,
            score: this.score,
            kills: this.kills,
            towersBuilt: this.towersBuilt,
            difficultyName: this.diffSettings.name,
            livesRemaining: this.lives,
            startLives: this.diffSettings.startLives
        });
    }

    // ===== UI =====

    updateUI() {
        document.querySelector('#money .value').textContent = this.money;
        document.querySelector('#lives .value').textContent = this.lives;
        document.querySelector('#wave .value').textContent = `${this.wave}/${this.diffSettings?.totalWaves || 20}`;
        document.querySelector('#score .value').textContent = this.score;
    }

    updateTowerButtons() {
        document.querySelectorAll('.tower-btn').forEach(btn => {
            const type = btn.dataset.tower;
            const cost = CONFIG.TOWER_TYPES[type]?.cost || 0;
            btn.classList.toggle('locked', this.money < cost);
        });
    }

    isMouseOnCanvas() {
        return this.mouseX >= 0 && this.mouseX <= this.canvas.width &&
               this.mouseY >= 0 && this.mouseY <= this.canvas.height;
    }

    createDeathParticles(enemy) {
        for (let i = 0; i < 10; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 3;
            this.particles.push(new Particle(
                enemy.x,
                enemy.y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                enemy.color,
                20 + Math.random() * 20
            ));
        }
    }
}

// Глобальный экземпляр игры
const game = new Game();
