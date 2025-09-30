import { apiService } from './api';

export interface UserSettings {
  id: number;
  userId: number;
  settings: {
    // Интерфейс
    language: 'auto' | 'ru' | 'en';
    
    // Безопасность
    autoLock: boolean;
    hasPincode: boolean;
    pincode: string | null;
    
    // Хранилище
    autoCleanup: boolean;
    cacheLimit: number;
    
    // Уведомления
    notifications: boolean;
    vibration: boolean;
    sounds: boolean;
    
    // Галерея
    photosPerPage: number;
    autoLoadPhotos: boolean;
    photoQuality: 'low' | 'medium' | 'high';
    
    // Дополнительные
    debugMode: boolean;
    analytics: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

class SettingsApiService {
  private baseUrl = '/settings';

  // Получить настройки пользователя
  async getUserSettings(): Promise<UserSettings> {
    const response = await apiService.request(this.baseUrl, {
      method: 'GET'
    });
    return response.data || response;
  }
  
  private getCurrentUserId(): number | null {
    // Получаем ID пользователя из localStorage или сессии
    const sessionData = localStorage.getItem('app_session');
    if (sessionData) {
      try {
        const session = JSON.parse(sessionData);
        return session.userId;
      } catch (e) {
        console.error('Ошибка парсинга сессии:', e);
      }
    }
    return null;
  }

  // Обновить настройки пользователя
  async updateUserSettings(settings: Partial<UserSettings['settings']>): Promise<UserSettings> {
    const response = await apiService.request(this.baseUrl, {
      method: 'PUT',
      body: JSON.stringify({ settings })
    });
    return response.data || response;
  }

  // Обновить конкретную настройку
  async updateSetting(key: keyof UserSettings['settings'], value: any): Promise<UserSettings> {
    const response = await apiService.request(`${this.baseUrl}/setting`, {
      method: 'PATCH',
      body: JSON.stringify({ key, value })
    });
    return response.data || response;
  }

  // Получить конкретную настройку
  async getSetting(key: keyof UserSettings['settings']): Promise<{ key: string; value: any }> {
    const response = await apiService.request(`${this.baseUrl}/setting/${key}`, {
      method: 'GET'
    });
    return response.data || response;
  }

  // Сбросить настройки к значениям по умолчанию
  async resetSettings(): Promise<UserSettings> {
    const response = await apiService.request(`${this.baseUrl}/reset`, {
      method: 'POST'
    });
    return response.data || response;
  }

  // Экспорт настроек
  async exportSettings(): Promise<void> {
    try {
      const response = await fetch(`${apiService.getBaseUrl()}${this.baseUrl}/export`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`,
        }
      });
      
      if (!response.ok) {
        throw new Error('Ошибка экспорта настроек');
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `settings_${Date.now()}.json`;
      link.click();
      
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Ошибка экспорта:', error);
      throw error;
    }
  }

  // Импорт настроек
  async importSettings(file: File): Promise<UserSettings> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const importData = JSON.parse(e.target?.result as string);
          const response = await apiService.request(`${this.baseUrl}/import`, {
            method: 'POST',
            body: JSON.stringify(importData)
          });
          resolve(response.data || response);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Ошибка чтения файла'));
      reader.readAsText(file);
    });
  }
}

export const settingsApiService = new SettingsApiService();