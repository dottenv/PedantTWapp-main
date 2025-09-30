import { TelegramAPI } from './telegram-api-core';

interface SwipeHandler {
  id: string;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  priority: number;
  enabled: boolean;
}

interface SwipeConfig {
  minDistance: number;
  maxTime: number;
  preventVerticalSwipes: boolean;
}

class SwipeManager {
  private handlers: SwipeHandler[] = [];
  private config: SwipeConfig = {
    minDistance: 50,
    maxTime: 300,
    preventVerticalSwipes: true
  };
  
  private touchStartX = 0;
  private touchStartY = 0;
  private touchStartTime = 0;
  private isInitialized = false;

  /**
   * Инициализация системы свайпов
   */
  init() {
    if (this.isInitialized) return;
    
    // Отключаем вертикальные свайпы в Telegram для закрытия WebApp
    if (TelegramAPI.isAvailable()) {
      const disabled = TelegramAPI.disableVerticalSwipes();
      console.log(`🚫 Вертикальные свайпы ${disabled ? 'отключены' : 'не удалось отключить'}`);
    }
    
    // Добавляем класс для CSS блокировки
    document.body.classList.add('swipe-navigation-active');
    
    // Добавляем обработчики touch событий
    document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
    
    this.isInitialized = true;
    console.log('👆 SwipeManager инициализирован');
  }

  /**
   * Регистрирует обработчик свайпов
   */
  register(
    id: string, 
    handlers: {
      onSwipeLeft?: () => void;
      onSwipeRight?: () => void;
      onSwipeUp?: () => void;
      onSwipeDown?: () => void;
    },
    priority: number = 0
  ) {
    // Удаляем существующий обработчик
    this.unregister(id);
    
    // Добавляем новый
    this.handlers.push({
      id,
      ...handlers,
      priority,
      enabled: true
    });
    
    // Сортируем по приоритету
    this.handlers.sort((a, b) => b.priority - a.priority);
    
    console.log(`👆 SwipeManager: зарегистрирован '${id}' (приоритет: ${priority})`);
  }

  /**
   * Удаляет обработчик свайпов
   */
  unregister(id: string) {
    const initialLength = this.handlers.length;
    this.handlers = this.handlers.filter(h => h.id !== id);
    
    if (this.handlers.length !== initialLength) {
      console.log(`👆 SwipeManager: удален '${id}'`);
    }
  }

  /**
   * Включает/отключает обработчик
   */
  setEnabled(id: string, enabled: boolean) {
    const handler = this.handlers.find(h => h.id === id);
    if (handler) {
      handler.enabled = enabled;
      console.log(`👆 SwipeManager: '${id}' ${enabled ? 'включен' : 'отключен'}`);
    }
  }

  /**
   * Обработка начала касания
   */
  private handleTouchStart(e: TouchEvent) {
    if (e.touches.length !== 1) return;
    
    const touch = e.touches[0];
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
    this.touchStartTime = Date.now();
  }

  /**
   * Обработка окончания касания
   */
  private handleTouchEnd(e: TouchEvent) {
    if (e.changedTouches.length !== 1) return;
    
    const touch = e.changedTouches[0];
    const endX = touch.clientX;
    const endY = touch.clientY;
    const endTime = Date.now();
    
    const deltaX = endX - this.touchStartX;
    const deltaY = endY - this.touchStartY;
    const deltaTime = endTime - this.touchStartTime;
    
    // Проверяем условия для свайпа
    if (deltaTime > this.config.maxTime) return;
    
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    
    if (absX < this.config.minDistance && absY < this.config.minDistance) return;
    
    // Определяем направление свайпа
    let direction: 'left' | 'right' | 'up' | 'down';
    
    if (absX > absY) {
      // Горизонтальный свайп
      direction = deltaX > 0 ? 'right' : 'left';
    } else {
      // Вертикальный свайп
      direction = deltaY > 0 ? 'down' : 'up';
      
      // Блокируем вертикальные свайпы если настроено
      if (this.config.preventVerticalSwipes) {
        e.preventDefault();
        return;
      }
    }
    
    // Вызываем обработчик с наивысшим приоритетом
    this.handleSwipe(direction, e);
  }

  /**
   * Обработка свайпа
   */
  private handleSwipe(direction: 'left' | 'right' | 'up' | 'down', e: TouchEvent) {
    for (const handler of this.handlers) {
      if (!handler.enabled) continue;
      
      let swipeHandler: (() => void) | undefined;
      
      switch (direction) {
        case 'left':
          swipeHandler = handler.onSwipeLeft;
          break;
        case 'right':
          swipeHandler = handler.onSwipeRight;
          break;
        case 'up':
          swipeHandler = handler.onSwipeUp;
          break;
        case 'down':
          swipeHandler = handler.onSwipeDown;
          break;
      }
      
      if (swipeHandler) {
        console.log(`👆 SwipeManager: обработан ${direction} свайп через '${handler.id}'`);
        e.preventDefault();
        
        // Отправляем событие для индикатора
        window.dispatchEvent(new CustomEvent('swipe-indicator', {
          detail: { direction }
        }));
        
        // Добавляем вибрацию для обратной связи
        TelegramAPI.vibrate('selection');
        
        swipeHandler();
        return; // Останавливаемся на первом обработчике
      }
    }
  }

  /**
   * Настройка конфигурации свайпов
   */
  configure(config: Partial<SwipeConfig>) {
    this.config = { ...this.config, ...config };
    console.log('👆 SwipeManager: конфигурация обновлена', this.config);
  }

  /**
   * Получает список активных обработчиков
   */
  getActiveHandlers(): string[] {
    return this.handlers
      .filter(h => h.enabled)
      .map(h => `${h.id} (${h.priority})`);
  }

  /**
   * Очищает все обработчики
   */
  clear() {
    this.handlers = [];
    console.log('👆 SwipeManager: очищены все обработчики');
  }

  /**
   * Деинициализация
   */
  destroy() {
    if (!this.isInitialized) return;
    
    document.removeEventListener('touchstart', this.handleTouchStart.bind(this));
    document.removeEventListener('touchend', this.handleTouchEnd.bind(this));
    
    // Включаем обратно вертикальные свайпы в Telegram
    if (TelegramAPI.isAvailable()) {
      TelegramAPI.enableVerticalSwipes();
    }
    
    // Удаляем класс блокировки
    document.body.classList.remove('swipe-navigation-active');
    
    this.clear();
    this.isInitialized = false;
    console.log('👆 SwipeManager деинициализирован');
  }
}

export const swipeManager = new SwipeManager();