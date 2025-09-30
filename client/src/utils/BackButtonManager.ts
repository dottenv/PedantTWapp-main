import { TelegramAPI } from './telegram-api-core';

interface NavigationHandler {
  id: string;
  handler: () => void;
  priority: number;
}

class BackButtonManager {
  private handlers: NavigationHandler[] = [];
  private isVisible = false;
  private currentHandler: (() => void) | null = null;

  /**
   * Регистрирует обработчик back button с приоритетом
   * @param id - уникальный идентификатор обработчика
   * @param handler - функция обработчик
   * @param priority - приоритет (больше = выше приоритет)
   */
  register(id: string, handler: () => void, priority: number = 0) {
    // Удаляем существующий обработчик с таким же ID
    this.unregister(id);
    
    // Добавляем новый обработчик
    this.handlers.push({ id, handler, priority });
    
    // Сортируем по приоритету (больше = выше)
    this.handlers.sort((a, b) => b.priority - a.priority);
    
    // Обновляем активный обработчик
    this.updateActiveHandler();
    
    console.log(`🔙 BackButton: зарегистрирован '${id}' (приоритет: ${priority})`);
  }

  /**
   * Удаляет обработчик по ID
   */
  unregister(id: string) {
    const initialLength = this.handlers.length;
    this.handlers = this.handlers.filter(h => h.id !== id);
    
    if (this.handlers.length !== initialLength) {
      console.log(`🔙 BackButton: удален '${id}'`);
      this.updateActiveHandler();
    }
  }

  /**
   * Обновляет активный обработчик (с наивысшим приоритетом)
   */
  private updateActiveHandler() {
    const topHandler = this.handlers[0];
    
    if (topHandler) {
      this.show(topHandler.handler);
      console.log(`🔙 BackButton: активен '${topHandler.id}' (приоритет: ${topHandler.priority})`);
    } else {
      this.hide();
      console.log('🔙 BackButton: скрыт (нет обработчиков)');
    }
  }

  /**
   * Показывает back button с обработчиком
   */
  private show(handler: () => void) {
    // Очищаем предыдущий обработчик
    if (this.currentHandler && TelegramAPI.tg?.BackButton) {
      // Удаляем старый обработчик (если API поддерживает)
      try {
        TelegramAPI.tg.BackButton.onClick(() => {});
      } catch (e) {
        // Игнорируем ошибки очистки
      }
    }
    
    this.currentHandler = handler;
    this.isVisible = true;
    
    if (TelegramAPI.tg?.BackButton) {
      TelegramAPI.tg.BackButton.onClick(handler);
      TelegramAPI.tg.BackButton.show();
    }
  }

  /**
   * Скрывает back button
   */
  private hide() {
    if (this.isVisible && TelegramAPI.tg?.BackButton) {
      TelegramAPI.tg.BackButton.hide();
    }
    this.currentHandler = null;
    this.isVisible = false;
  }

  /**
   * Проверяет, показан ли back button
   */
  isShown(): boolean {
    return this.isVisible;
  }

  /**
   * Получает список активных обработчиков (для отладки)
   */
  getActiveHandlers(): string[] {
    return this.handlers.map(h => `${h.id} (${h.priority})`);
  }

  /**
   * Очищает все обработчики
   */
  clear() {
    this.handlers = [];
    this.hide();
    console.log('🔙 BackButton: очищены все обработчики');
  }
}

export const backButtonManager = new BackButtonManager();