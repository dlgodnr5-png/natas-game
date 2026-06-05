// ============================================
// СИСТЕМА МЕНЮ
// ============================================

class MenuSystem {
    constructor() {
        this.screens = {
            mainMenu: document.getElementById('main-menu'),
            heroSelect: document.getElementById('hero-screen'),
            difficulty: document.getElementById('difficulty-screen'),
            settings: document.getElementById('settings-screen'),
            records: document.getElementById('records-screen')
        };

        this.selectedHero = 'knight';

        this.tutorialStep = 0;
        this.tutorialSteps = [
            {
                title: 'Добро пожаловать!',
                content: `<p>Это игра <span class="highlight">Tower Defense</span>.</p>
                         <p>Твоя задача — защитить базу от волн врагов, расставляя башни.</p>`
            },
            {
                title: 'Размещение башен',
                content: `<p>Кликни на свободное место на карте, чтобы поставить башню.</p>
                         <p>Используй клавиши <span class="highlight">1-6</span> для выбора типа башни.</p>`
            },
            {
                title: 'Герой',
                content: `<p>У тебя есть <span class="highlight">Герой</span> — особый юнит!</p>
                         <p><span class="highlight">ПКМ (правый клик)</span> по карте — переместить героя.</p>
                         <p>Герой сам атакует ближайших врагов.</p>`
            },
            {
                title: 'Способности',
                content: `<p>Внизу справа — <span class="highlight">способности</span>:</p>
                         <p>☄️ <b>Огненный дождь</b> — метеоры наносят урон в области</p>
                         <p>🛡️ <b>Подкрепление</b> — призывает солдат</p>
                         <p>Клик по кнопке + клик на карту для активации.</p>`
            },
            {
                title: 'Улучшения',
                content: `<p><span class="highlight">ПКМ</span> по башне открывает меню улучшений.</p>
                         <p>Улучшай башни для увеличения урона и радиуса.</p>
                         <p>Можно продать башню за 60% стоимости.</p>`
            },
            {
                title: 'Удачи!',
                content: `<p>Не дай врагам дойти до конца пути!</p>
                         <p>Зарабатывай деньги, убивая врагов.</p>
                         <p>Пройди все волны, чтобы победить!</p>
                         <p><span class="highlight">⭐ Получи 3 звезды за идеальное прохождение!</span></p>`
            }
        ];

        this.initEventListeners();
    }

    initEventListeners() {
        // Главное меню
        document.getElementById('play-btn').addEventListener('click', () => {
            this.showScreen('heroSelect');
            audio.resume();
        });

        document.getElementById('settings-btn').addEventListener('click', () => {
            this.showScreen('settings');
        });

        document.getElementById('records-btn').addEventListener('click', () => {
            this.showRecords();
        });

        // Выбор героя
        document.querySelectorAll('.hero-card').forEach(card => {
            card.addEventListener('click', () => {
                this.selectedHero = card.dataset.hero;
                document.querySelectorAll('.hero-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
            });
        });

        document.getElementById('hero-continue-btn').addEventListener('click', () => {
            if (typeof game !== 'undefined') {
                game.selectedHeroType = this.selectedHero;
            }
            this.showScreen('difficulty');
        });

        document.getElementById('hero-back-btn').addEventListener('click', () => {
            this.showScreen('mainMenu');
        });

        // Выбор сложности
        document.querySelectorAll('.diff-card').forEach(card => {
            card.addEventListener('click', () => {
                const diff = card.dataset.diff;
                this.startGame(diff);
            });
        });

        document.getElementById('diff-back-btn').addEventListener('click', () => {
            this.showScreen('heroSelect');
        });

        // Настройки
        document.getElementById('settings-back-btn').addEventListener('click', () => {
            this.saveSettings();
            this.showScreen('mainMenu');
        });

        document.getElementById('records-back-btn').addEventListener('click', () => {
            this.showScreen('mainMenu');
        });

        // Загрузка настроек
        this.loadSettings();
    }

    showScreen(name) {
        // Скрыть все экраны
        Object.values(this.screens).forEach(screen => {
            screen.classList.remove('active');
        });

        // Показать нужный
        if (this.screens[name]) {
            this.screens[name].classList.add('active');
        }
    }

    hideAllScreens() {
        Object.values(this.screens).forEach(screen => {
            screen.classList.remove('active');
        });
    }

    startGame(difficulty) {
        this.hideAllScreens();

        // Показать игровой UI
        document.getElementById('ui-panel').style.display = 'flex';
        document.getElementById('gameCanvas').style.display = 'block';
        document.getElementById('bottom-panel').style.display = 'flex';
        document.getElementById('hint').style.display = 'block';

        // Запустить игру
        if (typeof game !== 'undefined') {
            game.start(difficulty);
        }

        // Показать туториал если нужно
        const settings = saveSystem.getSettings();
        if (settings.showTutorial && !saveSystem.isTutorialCompleted()) {
            this.showTutorial();
        }
    }

    showTutorial() {
        this.tutorialStep = 0;
        this.updateTutorialContent();
        document.getElementById('tutorial-overlay').classList.add('active');

        // Кнопки туториала
        document.getElementById('tutorial-skip').onclick = () => this.closeTutorial();
        document.getElementById('tutorial-next').onclick = () => this.nextTutorialStep();
    }

    updateTutorialContent() {
        const step = this.tutorialSteps[this.tutorialStep];
        document.getElementById('tutorial-title').textContent = step.title;
        document.getElementById('tutorial-content').innerHTML = step.content;

        // Точки прогресса
        const dotsContainer = document.getElementById('tutorial-dots');
        dotsContainer.innerHTML = '';
        for (let i = 0; i < this.tutorialSteps.length; i++) {
            const dot = document.createElement('div');
            dot.className = 'tutorial-dot' + (i === this.tutorialStep ? ' active' : '');
            dotsContainer.appendChild(dot);
        }

        // Текст кнопки
        const nextBtn = document.getElementById('tutorial-next');
        if (this.tutorialStep === this.tutorialSteps.length - 1) {
            nextBtn.textContent = 'Начать игру!';
        } else {
            nextBtn.textContent = 'Далее →';
        }
    }

    nextTutorialStep() {
        this.tutorialStep++;
        if (this.tutorialStep >= this.tutorialSteps.length) {
            this.closeTutorial();
        } else {
            this.updateTutorialContent();
        }
    }

    closeTutorial() {
        document.getElementById('tutorial-overlay').classList.remove('active');
        saveSystem.completeTutorial();
    }

    showRecords() {
        const records = saveSystem.getRecords();
        const container = document.getElementById('records-list');
        container.innerHTML = '';

        if (records.length === 0) {
            container.innerHTML = '<p style="color: #6c757d; text-align: center;">Пока нет рекордов</p>';
        } else {
            const medals = ['🥇', '🥈', '🥉'];
            records.forEach((record, i) => {
                const div = document.createElement('div');
                div.className = 'record-item';
                div.innerHTML = `
                    <span class="rank">${medals[i] || (i + 1)}</span>
                    <div class="info">
                        <div>${record.difficulty || 'Нормальный'} • Волна ${record.wave || '?'}</div>
                        <div style="font-size: 11px; color: #6c757d">${record.date || ''}</div>
                    </div>
                    <span class="score">${record.score.toLocaleString()}</span>
                `;
                container.appendChild(div);
            });
        }

        this.showScreen('records');
    }

    loadSettings() {
        const settings = saveSystem.getSettings();

        document.getElementById('sfx-volume').value = settings.sfxVolume;
        document.getElementById('music-volume').value = settings.musicVolume;
        document.getElementById('show-tutorial').checked = settings.showTutorial;
        document.getElementById('auto-wave').checked = settings.autoWave;
        document.getElementById('show-range').checked = settings.showRange;

        // Применить к аудио
        audio.sfxVolume = settings.sfxVolume / 100;
        audio.musicVolume = settings.musicVolume / 100;
    }

    saveSettings() {
        const settings = {
            sfxVolume: parseInt(document.getElementById('sfx-volume').value),
            musicVolume: parseInt(document.getElementById('music-volume').value),
            showTutorial: document.getElementById('show-tutorial').checked,
            autoWave: document.getElementById('auto-wave').checked,
            showRange: document.getElementById('show-range').checked
        };

        saveSystem.saveSettings(settings);

        // Применить к аудио
        audio.sfxVolume = settings.sfxVolume / 100;
        audio.musicVolume = settings.musicVolume / 100;
    }

    showPause() {
        document.getElementById('pause-overlay').classList.add('active');
    }

    hidePause() {
        document.getElementById('pause-overlay').classList.remove('active');
    }

    showResult(victory, stats) {
        const overlay = document.getElementById('result-overlay');
        overlay.classList.remove('victory', 'defeat');
        overlay.classList.add(victory ? 'victory' : 'defeat', 'active');

        document.getElementById('result-title').textContent = victory ? 'ПОБЕДА!' : 'ПОРАЖЕНИЕ';
        document.getElementById('result-subtitle').textContent = victory
            ? `Сложность: ${stats.difficultyName}`
            : `Волна: ${stats.wave}`;

        document.getElementById('result-waves').textContent = stats.wave;
        document.getElementById('result-score').textContent = stats.score.toLocaleString();
        document.getElementById('result-kills').textContent = stats.kills;
        document.getElementById('result-towers').textContent = stats.towersBuilt;

        // Звёзды за прохождение
        if (victory) {
            this.showStars(stats.livesRemaining, stats.startLives);
        }

        // Проверка рекорда
        if (saveSystem.isNewRecord(stats.score)) {
            document.getElementById('new-record').style.display = 'block';
            saveSystem.addRecord({
                score: stats.score,
                wave: stats.wave,
                difficulty: stats.difficultyName
            });
        } else {
            document.getElementById('new-record').style.display = 'none';
        }

        // Обновление статистики
        saveSystem.updateStats({
            kills: stats.kills,
            towersBuilt: stats.towersBuilt,
            wavesCompleted: stats.wave
        });
    }

    showStars(livesRemaining, startLives) {
        const pct = livesRemaining / startLives;
        let stars = 1;
        if (pct >= 1) stars = 3;
        else if (pct >= 0.5) stars = 2;

        const subtitle = document.getElementById('result-subtitle');
        subtitle.innerHTML += `<br><span style="color: #ffd43b; font-size: 24px;">${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}</span>`;
    }

    hideResult() {
        document.getElementById('result-overlay').classList.remove('active');
    }

    showMainMenu() {
        // Скрыть игровой UI
        document.getElementById('ui-panel').style.display = 'none';
        document.getElementById('gameCanvas').style.display = 'none';
        document.getElementById('bottom-panel').style.display = 'none';
        document.getElementById('hint').style.display = 'none';

        this.hideResult();
        this.hidePause();
        this.showScreen('mainMenu');
    }
}

// Глобальный экземпляр
const menuSystem = new MenuSystem();
