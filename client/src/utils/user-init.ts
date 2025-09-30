import { TelegramAPI } from './telegram-api-core';
import { apiService } from '../services/api';
import { telegramLogger } from '../components/TelegramLogger';

// Автоматическая перезагрузка при получении уведомления о регистрации
export const setupAutoReload = () => {
  if (TelegramAPI.tg) {
    // Проверяем статус пользователя каждые 5 секунд
    const checkRegistrationStatus = async () => {
      try {
        const user = getTelegramUser();
        if (!user) return;
        
        const response = await apiService.request(`/users/${user.id}`);
        const userData = await response.json();
        
        // Если статус изменился на employee, перезагружаем
        const currentStatus = localStorage.getItem('userRegistrationStatus');
        if (currentStatus === 'unregistered' && userData.registrationStatus === 'employee') {
          telegramLogger.success('🎉 Вы были приняты на работу! Перезагружаем приложение...');
          
          // Обновляем статус в localStorage
          localStorage.setItem('userRegistrationStatus', userData.registrationStatus);
          
          // Перезагружаем через 2 секунды
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        } else {
          // Обновляем статус в localStorage
          localStorage.setItem('userRegistrationStatus', userData.registrationStatus);
        }
      } catch (error) {
        // Молчаливо игнорируем ошибки проверки
      }
    };
    
    // Запускаем проверку каждые 5 секунд
    setInterval(checkRegistrationStatus, 5000);
  }
};

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export const createTestUser = (): TelegramUser => ({
  id: 999999999,
  first_name: 'Тестовый',
  last_name: 'Пользователь',
  username: 'testuser',
  language_code: 'ru'
});

export const getTelegramUser = (): TelegramUser | null => {
  if (TelegramAPI.tg?.initDataUnsafe?.user) {
    return TelegramAPI.tg.initDataUnsafe.user;
  }
  return null;
};

export const initializeUser = async (isTelegramAvailable: boolean): Promise<any> => {
  try {
    const userToCreate = isTelegramAvailable 
      ? getTelegramUser() || createTestUser()
      : createTestUser();

    telegramLogger.info(`👤 Инициализация: ${userToCreate.first_name}`);
    
    const result: any = await apiService.initUser(userToCreate);
    telegramLogger.success(`✅ Пользователь инициализирован: ${result.user?.id}`);
    if (result.session) {
      telegramLogger.success(`🔑 Сессия создана: ${result.session?.id}`);
    }
    
    // Сохраняем информацию о пользователе/сессии в localStorage
    try {
      localStorage.setItem('telegram_user', JSON.stringify(result.user));
      if (result.session) {
        localStorage.setItem('app_session', JSON.stringify({ userId: result.user.id, sessionId: result.session.id }));
      } else {
        localStorage.setItem('app_session', JSON.stringify({ userId: result.user.id }));
      }
      telegramLogger.info('🔐 Локальная сессия сохранена');
    } catch (e) {
      console.warn('Не удалось сохранить сессию в localStorage:', e);
    }

    // Сохраняем статус регистрации в localStorage
    localStorage.setItem('userRegistrationStatus', result.user.registrationStatus);
    
    // Запускаем автоматическую проверку статуса регистрации
    setupAutoReload();
    
    return result;
  } catch (error: any) {
    telegramLogger.error(`❌ Ошибка инициализации: ${error.message}`);
    throw error;
  }
};