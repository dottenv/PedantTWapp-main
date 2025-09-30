import { apiService } from '../services/api';
import { TelegramAPI } from './telegram-api-core';

interface SessionData {
  id: string;
  userId: number;
  createdAt: string;
  lastActivity: string;
}

class SessionManager {
  private sessionId: string | null = null;
  private userId: number | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private isClosing = false;

  // Инициализация сессии
  async initSession(sessionData: SessionData) {
    this.sessionId = sessionData.id;
    this.userId = sessionData.userId;
    
    console.log('🔑 Сессия инициализирована:', this.sessionId);
    
    // Запускаем ping каждые 5 минут
    this.startPing();
    
    // Отслеживаем закрытие WebApp
    this.setupCloseHandlers();
  }

  // Периодический ping для поддержания сессии
  private startPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    
    this.pingInterval = setInterval(async () => {
      if (this.sessionId && !this.isClosing) {
        try {
          // Просто проверяем доступность сервера
          await apiService.checkServerConnection();
        } catch (error) {
          console.error('❌ Ошибка проверки сессии:', error);
        }
      }
    }, 5 * 60 * 1000); // 5 минут
  }

  // Настройка обработчиков закрытия
  private setupCloseHandlers() {
    // Telegram WebApp события
    if (TelegramAPI.isAvailable()) {
      // Обработчик закрытия WebApp
      TelegramAPI.tg?.onEvent('webAppClose', () => {
        console.log('📱 WebApp закрывается');
        this.closeSession();
      });
      
      // Обработчик изменения видимости
      TelegramAPI.tg?.onEvent('viewportChanged', (data: any) => {
        if (data.isStateStable && !data.isExpanded) {
          console.log('📱 WebApp свернуто');
          // Не закрываем сессию при сворачивании, только при полном закрытии
        }
      });
    }

    // Браузерные события
    window.addEventListener('beforeunload', () => {
      console.log('🌐 Страница закрывается');
      this.closeSession();
    });

    window.addEventListener('unload', () => {
      console.log('🌐 Страница выгружается');
      this.closeSession();
    });

    // Обработчик потери фокуса (для мобильных браузеров)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        console.log('👁️ Приложение скрыто');
        // Не закрываем сессию при скрытии, только при полном закрытии
      } else {
        console.log('👁️ Приложение показано');
        // Проверяем валидность сессии при возвращении
        this.checkSessionValidity();
      }
    });

    // Обработчик для мобильных устройств (pagehide более надежен чем beforeunload)
    window.addEventListener('pagehide', () => {
      console.log('📱 Страница скрыта (мобильное устройство)');
      this.closeSession();
    });
  }

  // Проверка валидности сессии
  private async checkSessionValidity() {
    if (this.sessionId && !this.isClosing) {
      try {
        // Просто проверяем доступность сервера
        await apiService.checkServerConnection();
      } catch (error) {
        console.error('❌ Ошибка проверки сессии:', error);
      }
    }
  }

  // Обработка недействительной сессии
  private handleInvalidSession() {
    console.warn('🚫 Сессия недействительна');
    this.cleanup();
    
    // Можно показать уведомление пользователю
    if (TelegramAPI.isAvailable()) {
      TelegramAPI.showAlert('Сессия истекла. Перезапустите приложение.');
    }
  }

  // Закрытие сессии
  async closeSession() {
    if (this.isClosing || !this.sessionId) {
      return;
    }
    
    this.isClosing = true;
    console.log('🔒 Закрываем сессию:', this.sessionId);
    
    try {
      // Просто очищаем локальные данные
      console.log('✅ Сессия закрыта');
    } finally {
      this.cleanup();
    }
  }

  // Очистка локальных данных
  private cleanup() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    this.sessionId = null;
    this.userId = null;
    this.isClosing = false;
  }

  // Получение текущей сессии
  getSessionId(): string | null {
    return this.sessionId;
  }

  getUserId(): number | null {
    return this.userId;
  }

  // Проверка активности сессии
  isActive(): boolean {
    return this.sessionId !== null && !this.isClosing;
  }
}

// Экспортируем синглтон
export const sessionManager = new SessionManager();