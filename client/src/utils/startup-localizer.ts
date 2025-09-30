/**
 * Стартовый локализатор - запускается при открытии WebApp
 * Автоматически сканирует, извлекает и заменяет тексты
 */

import { LocaleScanner } from './locale-scanner';
import { TelegramAPI } from './telegram-api-core';

export class StartupLocalizer {
  private scanner = new LocaleScanner();
  private isProcessed = false;

  // Автоматический запуск при старте приложения
  async autoRun(): Promise<void> {
    try {
      console.log('🔍 Запуск автоматического локализатора...');
      
      // Проверяем, есть ли уже локали
      const ruLocale = localStorage.getItem('app_locales_ru');
      const enLocale = localStorage.getItem('app_locales_en');
      
      if (!ruLocale || !enLocale || Object.keys(JSON.parse(ruLocale || '{}')).length === 0) {
        console.log('📝 Локали отсутствуют, запускаю массовое сканирование...');
        await this.runMassScanning();
      } else {
        console.log('✅ Локали уже существуют');
      }

      this.isProcessed = true;

    } catch (error) {
      console.warn('⚠️ Ошибка автоматического локализатора:', error);
    }
  }

  // Определение языка пользователя
  private detectUserLanguage(): string {
    // 1. Настройки (приоритет)
    const saved = localStorage.getItem('app_language');
    if (saved) return saved;

    // 2. Telegram
    const tgUser = TelegramAPI.getUser();
    if (tgUser?.language_code) {
      return tgUser.language_code.split('-')[0];
    }

    // 3. Браузер
    return navigator.language.split('-')[0] || 'ru';
  }

  // Запуск массового сканирования
  private async runMassScanning(): Promise<void> {
    try {
      const { massLocalizer } = await import('./mass-localizer');
      await massLocalizer.scanAllComponents();
      console.log('✅ Массовое сканирование завершено');
    } catch (error) {
      console.error('❌ Ошибка массового сканирования:', error);
    }
  }

  // Проверка, нужно ли запускать локализатор
  shouldRun(): boolean {
    const ruLocale = localStorage.getItem('app_locales_ru');
    return !ruLocale || Object.keys(JSON.parse(ruLocale || '{}')).length === 0;
  }
}

// Глобальный экземпляр
export const startupLocalizer = new StartupLocalizer();