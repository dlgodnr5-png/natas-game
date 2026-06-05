// ============================================
// КОНФИГУРАЦИЯ ИГРЫ
// Все настраиваемые параметры в одном месте
// ============================================

const CONFIG = {
    // Размеры
    CANVAS_WIDTH: 900,
    CANVAS_HEIGHT: 560,

    // Сложности
    DIFFICULTIES: {
        easy: {
            name: 'Лёгкий',
            startMoney: 300,
            startLives: 30,
            enemyHpMult: 0.7,
            enemySpeedMult: 0.8,
            rewardMult: 1.3,
            scoreMult: 0.5,
            totalWaves: 15
        },
        normal: {
            name: 'Нормальный',
            startMoney: 200,
            startLives: 20,
            enemyHpMult: 1.0,
            enemySpeedMult: 1.0,
            rewardMult: 1.0,
            scoreMult: 1.0,
            totalWaves: 20
        },
        hard: {
            name: 'Сложный',
            startMoney: 150,
            startLives: 15,
            enemyHpMult: 1.3,
            enemySpeedMult: 1.2,
            rewardMult: 0.8,
            scoreMult: 1.5,
            totalWaves: 25
        },
        nightmare: {
            name: 'Кошмар',
            startMoney: 100,
            startLives: 10,
            enemyHpMult: 1.6,
            enemySpeedMult: 1.4,
            rewardMult: 0.6,
            scoreMult: 2.5,
            totalWaves: 30
        }
    },

    // Типы башен
    TOWER_TYPES: {
        basic: {
            name: 'Пулемёт',
            icon: '🔫',
            cost: 50,
            range: 120,
            damage: 15,
            fireRate: 0.5,
            color: '#74c0fc',
            description: 'Базовая башня. Быстро стреляет.'
        },
        frost: {
            name: 'Заморозка',
            icon: '❄️',
            cost: 75,
            range: 100,
            damage: 8,
            fireRate: 0.8,
            slowAmount: 0.5,
            slowDuration: 60,
            color: '#66d9e8',
            description: 'Замедляет врагов на 50%.'
        },
        sniper: {
            name: 'Снайпер',
            icon: '🎯',
            cost: 100,
            range: 200,
            damage: 50,
            fireRate: 1.5,
            color: '#da77f2',
            description: 'Большой радиус, высокий урон.'
        },
        cannon: {
            name: 'Пушка',
            icon: '💥',
            cost: 125,
            range: 110,
            damage: 35,
            fireRate: 1.2,
            splashRadius: 50,
            color: '#ffa94d',
            description: 'Урон по площади.'
        },
        laser: {
            name: 'Лазер',
            icon: '⚡',
            cost: 200,
            range: 150,
            damage: 2,
            fireRate: 0,
            color: '#ff6b6b',
            description: 'Непрерывный луч урона.'
        },
        barracks: {
            name: 'Казарма',
            icon: '⚔️',
            cost: 70,
            range: 80,
            damage: 0,
            fireRate: 0,
            soldierCount: 2,
            soldierHp: 50,
            soldierDamage: 10,
            color: '#95d5b2',
            description: 'Выпускает солдат для блокировки врагов.'
        }
    },

    // Стоимость улучшений (множитель от базовой цены)
    UPGRADE_COSTS: [1.0, 0.6, 0.8, 1.0],
    UPGRADE_STAT_BOOST: 1.3, // +30% к характеристикам за уровень
    SELL_RETURN: 0.6, // 60% от потраченных денег

    // Типы врагов
    ENEMY_TYPES: {
        normal: {
            name: 'Обычный',
            hp: 100,
            speed: 1.5,
            reward: 15,
            color: '#e74c3c',
            radius: 12
        },
        fast: {
            name: 'Быстрый',
            hp: 60,
            speed: 3,
            reward: 20,
            color: '#f39c12',
            radius: 9
        },
        tank: {
            name: 'Танк',
            hp: 400,
            speed: 0.8,
            reward: 40,
            color: '#8e44ad',
            radius: 18
        },
        flying: {
            name: 'Летающий',
            hp: 80,
            speed: 2,
            reward: 25,
            color: '#3498db',
            radius: 10,
            flying: true
        },
        healer: {
            name: 'Целитель',
            hp: 120,
            speed: 1.2,
            reward: 35,
            color: '#2ecc71',
            radius: 11,
            healAmount: 2,
            healRange: 60
        },
        boss: {
            name: 'Босс',
            hp: 2000,
            speed: 0.6,
            reward: 200,
            color: '#c0392b',
            radius: 25,
            isBoss: true
        }
    },

    // Способности героя
    ABILITIES: {
        rainOfFire: {
            name: 'Огненный дождь',
            icon: '☄️',
            cooldown: 30000, // 30 секунд
            damage: 100,
            radius: 80,
            duration: 3000
        },
        reinforcements: {
            name: 'Подкрепление',
            icon: '🛡️',
            cooldown: 45000, // 45 секунд
            radius: 60,
            soldierCount: 3,
            soldierHp: 80,
            soldierDamage: 15,
            duration: 15000
        }
    },

    // Типы героев
    HEROES: {
        knight: {
            name: 'Рыцарь',
            icon: '🛡️',
            description: 'Крепкий воин. Много здоровья, сильные атаки.',
            color: '#4dabf7',
            hp: 250,
            damage: 25,
            attackSpeed: 1.0,
            speed: 2.5,
            range: 50,
            respawnTime: 8000,
            // Статы для отображения (1-5)
            stats: { hp: 5, attack: 4, speed: 2, range: 2 }
        },
        archer: {
            name: 'Лучница',
            icon: '🏹',
            description: 'Быстрая и ловкая. Бьёт издалека.',
            color: '#69db7c',
            hp: 150,
            damage: 18,
            attackSpeed: 0.6,
            speed: 3.5,
            range: 100,
            respawnTime: 6000,
            stats: { hp: 2, attack: 3, speed: 4, range: 5 }
        },
        mage: {
            name: 'Маг',
            icon: '🧙',
            description: 'Мощные заклинания. Урон по области.',
            color: '#da77f2',
            hp: 120,
            damage: 35,
            attackSpeed: 1.5,
            speed: 2.8,
            range: 80,
            respawnTime: 10000,
            splashRadius: 40,
            stats: { hp: 1, attack: 5, speed: 3, range: 4 }
        }
    },

    // XP и уровни героя
    HERO_LEVELS: {
        maxLevel: 5,
        xpPerLevel: [0, 50, 120, 220, 350], // XP для каждого уровня
        statBoostPerLevel: 0.15, // +15% к характеристикам за уровень
        xpPerKill: {
            normal: 10,
            fast: 12,
            tank: 25,
            flying: 15,
            healer: 20,
            boss: 100
        }
    },

    // Параметры героя (устаревшее, для совместимости)
    HERO: {
        hp: 200,
        damage: 20,
        attackSpeed: 1.0,
        speed: 3,
        range: 60,
        respawnTime: 10000
    },

    // Путь врагов (наземный)
    PATH: [
        { x: -30, y: 280 },
        { x: 150, y: 280 },
        { x: 150, y: 150 },
        { x: 350, y: 150 },
        { x: 350, y: 400 },
        { x: 550, y: 400 },
        { x: 550, y: 200 },
        { x: 750, y: 200 },
        { x: 750, y: 350 },
        { x: 930, y: 350 }
    ],

    // Путь летающих (прямой)
    FLYING_PATH: [
        { x: -30, y: 280 },
        { x: 930, y: 280 }
    ],

    // Цвета
    COLORS: {
        background: '#1a1a2e',
        path: '#2d2d44',
        pathBorder: '#3d3d5c',
        grid: 'rgba(255, 255, 255, 0.03)',
        rangeIndicator: 'rgba(116, 192, 252, 0.2)',
        invalidPlacement: 'rgba(255, 0, 0, 0.3)'
    }
};

// Экспортируем для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
