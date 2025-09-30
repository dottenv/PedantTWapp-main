/**
 * Утилиты для работы с датами
 */
export class DateUtils {
  /**
   * Форматирует дату в локальном формате
   */
  static formatDate(dateStr: string, locale: string = 'ru-RU'): string {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(locale, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Неизвестно';
    }
  }

  /**
   * Форматирует дату в короткий формат
   */
  static formatShortDate(dateStr: string, locale: string = 'ru-RU'): string {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(locale, {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit'
      });
    } catch {
      return 'Неизвестно';
    }
  }

  /**
   * Форматирует время
   */
  static formatTime(dateStr: string, locale: string = 'ru-RU'): string {
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Неизвестно';
    }
  }

  /**
   * Возвращает относительное время (например, "2 часа назад")
   */
  static getRelativeTime(dateStr: string, locale: string = 'ru-RU'): string {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMinutes < 1) return 'только что';
      if (diffMinutes < 60) return `${diffMinutes} мин назад`;
      if (diffHours < 24) return `${diffHours} ч назад`;
      if (diffDays < 7) return `${diffDays} дн назад`;
      
      return DateUtils.formatShortDate(dateStr, locale);
    } catch {
      return 'Неизвестно';
    }
  }
}