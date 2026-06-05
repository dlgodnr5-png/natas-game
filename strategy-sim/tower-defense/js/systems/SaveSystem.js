// ============================================
// СИСТЕМА СОХРАНЕНИЯ (localStorage)
// ============================================

class SaveSystem {
    constructor() {
        this.storageKey = 'towerDefensePro';
    }

    // Получить все данные
    getData() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : this.getDefaultData();
        } catch (e) {
            return this.getDefaultData();
        }
    }

    // Сохранить все данные
    saveData(data) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(data));
        } catch (e) {
            console.warn('Не удалось сохранить данные');
        }
    }

    // Данные по умолчанию
    getDefaultData() {
        return {
            settings: {
                sfxVolume: 70,
                musicVolume: 50,
                showTutorial: true,
                autoWave: false,
                showRange: true
            },
            records: [],
            stats: {
                gamesPlayed: 0,
                totalKills: 0,
                totalTowersBuilt: 0,
                totalWavesCompleted: 0
            },
            tutorialCompleted: false
        };
    }

    // Получить настройки
    getSettings() {
        return this.getData().settings;
    }

    // Сохранить настройки
    saveSettings(settings) {
        const data = this.getData();
        data.settings = { ...data.settings, ...settings };
        this.saveData(data);
    }

    // Получить рекорды
    getRecords() {
        return this.getData().records || [];
    }

    // Добавить рекорд
    addRecord(record) {
        const data = this.getData();
        data.records = data.records || [];

        // Добавляем запись
        data.records.push({
            ...record,
            date: new Date().toLocaleDateString('ru-RU')
        });

        // Сортируем по очкам (от большего к меньшему)
        data.records.sort((a, b) => b.score - a.score);

        // Оставляем только топ-10
        data.records = data.records.slice(0, 10);

        this.saveData(data);

        // Возвращаем позицию в таблице (0 = первое место)
        return data.records.findIndex(r => r.score === record.score && r.date === record.date);
    }

    // Проверить, является ли счёт рекордом
    isNewRecord(score) {
        const records = this.getRecords();
        if (records.length < 10) return true;
        return score > records[records.length - 1].score;
    }

    // Обновить статистику
    updateStats(gameStats) {
        const data = this.getData();
        data.stats = data.stats || {};
        data.stats.gamesPlayed = (data.stats.gamesPlayed || 0) + 1;
        data.stats.totalKills = (data.stats.totalKills || 0) + (gameStats.kills || 0);
        data.stats.totalTowersBuilt = (data.stats.totalTowersBuilt || 0) + (gameStats.towersBuilt || 0);
        data.stats.totalWavesCompleted = (data.stats.totalWavesCompleted || 0) + (gameStats.wavesCompleted || 0);
        this.saveData(data);
    }

    // Пометить туториал пройденным
    completeTutorial() {
        const data = this.getData();
        data.tutorialCompleted = true;
        this.saveData(data);
    }

    // Проверить, пройден ли туториал
    isTutorialCompleted() {
        return this.getData().tutorialCompleted || false;
    }

    // Очистить все данные
    clearAll() {
        localStorage.removeItem(this.storageKey);
    }
}

// Глобальный экземпляр
const saveSystem = new SaveSystem();
