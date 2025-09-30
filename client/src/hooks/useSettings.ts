import { useState, useEffect, useCallback } from 'react';
import { settingsApiService, type UserSettings } from '../services/settingsApi';
import { showError, showSuccess } from '../components/ToastManager';

interface UseSettingsReturn {
  settings: UserSettings['settings'] | null;
  isLoading: boolean;
  error: string | null;
  updateSetting: (key: keyof UserSettings['settings'], value: any) => Promise<void>;
  updateSettings: (newSettings: Partial<UserSettings['settings']>) => Promise<void>;
  resetSettings: () => Promise<void>;
  exportSettings: () => Promise<void>;
  importSettings: (file: File) => Promise<void>;
  refreshSettings: () => Promise<void>;
}

export const useSettings = (): UseSettingsReturn => {
  const [settings, setSettings] = useState<UserSettings['settings'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Загрузка настроек
  const loadSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('⚙️ Загружаем настройки пользователя...');
      const userSettings = await settingsApiService.getUserSettings();
      console.log('✅ Настройки загружены:', userSettings);
      
      setSettings(userSettings.settings);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка загрузки настроек';
      setError(errorMessage);
      console.error('❌ Ошибка загрузки настроек:', err);
      
      // Устанавливаем настройки по умолчанию при ошибке
      const defaultSettings = {
        language: 'auto' as const,
        autoLock: false,
        hasPincode: false,
        pincode: null,
        autoCleanup: true,
        cacheLimit: 100,
        notifications: true,
        vibration: true,
        sounds: true,
        photosPerPage: 15,
        autoLoadPhotos: true,
        photoQuality: 'high' as const,
        debugMode: false,
        analytics: true
      };
      
      console.log('🔧 Используем настройки по умолчанию');
      setSettings(defaultSettings);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Обновление конкретной настройки
  const updateSetting = useCallback(async (key: keyof UserSettings['settings'], value: any) => {
    try {
      console.log(`⚙️ Обновляем настройку ${key}:`, value);
      const updatedSettings = await settingsApiService.updateSetting(key, value);
      console.log('✅ Настройка обновлена:', updatedSettings);
      
      setSettings(updatedSettings.settings);
      
      // Применяем настройку немедленно
      applySettingToApp(key, value);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка обновления настройки';
      showError(errorMessage);
      console.error('❌ Ошибка обновления настройки:', err);
    }
  }, []);

  // Обновление нескольких настроек
  const updateSettings = useCallback(async (newSettings: Partial<UserSettings['settings']>) => {
    try {
      console.log('⚙️ Обновляем настройки:', newSettings);
      const updatedSettings = await settingsApiService.updateUserSettings(newSettings);
      console.log('✅ Настройки обновлены:', updatedSettings);
      
      setSettings(updatedSettings.settings);
      
      // Применяем все настройки
      Object.entries(newSettings).forEach(([key, value]) => {
        applySettingToApp(key as keyof UserSettings['settings'], value);
      });
      
      showSuccess('Настройки сохранены');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка обновления настроек';
      showError(errorMessage);
      console.error('❌ Ошибка обновления настроек:', err);
    }
  }, []);

  // Сброс настроек
  const resetSettings = useCallback(async () => {
    try {
      console.log('🔄 Сбрасываем настройки к значениям по умолчанию...');
      const defaultSettings = await settingsApiService.resetSettings();
      console.log('✅ Настройки сброшены:', defaultSettings);
      
      setSettings(defaultSettings.settings);
      
      // Применяем все дефолтные настройки
      Object.entries(defaultSettings.settings).forEach(([key, value]) => {
        applySettingToApp(key as keyof UserSettings['settings'], value);
      });
      
      showSuccess('Настройки сброшены к значениям по умолчанию');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка сброса настроек';
      showError(errorMessage);
      console.error('❌ Ошибка сброса настроек:', err);
    }
  }, []);

  // Экспорт настроек
  const exportSettings = useCallback(async () => {
    try {
      await settingsApiService.exportSettings();
      showSuccess('Настройки экспортированы');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка экспорта настроек';
      showError(errorMessage);
      console.error('Ошибка экспорта настроек:', err);
    }
  }, []);

  // Импорт настроек
  const importSettings = useCallback(async (file: File) => {
    try {
      const importedSettings = await settingsApiService.importSettings(file);
      setSettings(importedSettings.settings);
      
      // Применяем все импортированные настройки
      Object.entries(importedSettings.settings).forEach(([key, value]) => {
        applySettingToApp(key as keyof UserSettings['settings'], value);
      });
      
      showSuccess('Настройки импортированы');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка импорта настроек';
      showError(errorMessage);
      console.error('Ошибка импорта настроек:', err);
    }
  }, []);

  // Обновление настроек
  const refreshSettings = useCallback(async () => {
    console.log('🔄 Обновляем настройки...');
    await loadSettings();
  }, [loadSettings]);

  // Применение настройки к приложению
  const applySettingToApp = useCallback((key: keyof UserSettings['settings'], value: any) => {
    switch (key) {
      case 'language':
        applyLanguage(value);
        break;
      case 'vibration':
        // Сохраняем в localStorage для использования в TelegramAPI
        localStorage.setItem('app_vibration_enabled', value.toString());
        break;
      case 'notifications':
        localStorage.setItem('app_notifications_enabled', value.toString());
        break;
      case 'sounds':
        localStorage.setItem('app_sounds_enabled', value.toString());
        break;
      case 'photosPerPage':
        localStorage.setItem('app_photos_per_page', value.toString());
        break;
      case 'autoLoadPhotos':
        localStorage.setItem('app_auto_load_photos', value.toString());
        break;
      case 'photoQuality':
        localStorage.setItem('app_photo_quality', value);
        break;
      case 'debugMode':
        localStorage.setItem('app_debug_mode', value.toString());
        break;
    }
  }, []);



  // Применение языка
  const applyLanguage = useCallback((language: string) => {
    if (language !== 'auto') {
      localStorage.setItem('user_language_setting', language);
      // Перезагружаем локализацию
      window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang: language } }));
    } else {
      localStorage.removeItem('user_language_setting');
      // Автоопределение языка
      window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang: 'auto' } }));
    }
  }, []);



  // Применение всех настроек при загрузке
  const applyAllSettings = useCallback((settingsData: UserSettings['settings']) => {
    try {
      Object.entries(settingsData).forEach(([key, value]) => {
        applySettingToApp(key as keyof UserSettings['settings'], value);
      });
      console.log('✅ Настройки применены к приложению');
    } catch (error) {
      console.error('❌ Ошибка применения настроек:', error);
    }
  }, [applySettingToApp]);

  // Загрузка настроек при монтировании
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Слушаем событие для обновления настроек извне
  useEffect(() => {
    const handler = () => {
      refreshSettings();
    };
    window.addEventListener('refreshSettings', handler as EventListener);
    return () => window.removeEventListener('refreshSettings', handler as EventListener);
  }, [refreshSettings]);

  // Применение настроек при их загрузке
  useEffect(() => {
    if (settings) {
      applyAllSettings(settings);
    }
  }, [settings, applyAllSettings]);

  return {
    settings,
    isLoading,
    error,
    updateSetting,
    updateSettings,
    resetSettings,
    exportSettings,
    importSettings,
    refreshSettings
  };
};