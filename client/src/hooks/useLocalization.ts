/**
 * React хук для локализации с автообновлением UI
 */

import { useState, useEffect } from 'react';
import { t, getCurrentLanguage, setLanguage, refreshLocalization, getAvailableLanguages, isAutoLanguageMode } from '../locales';

export const useLocalization = () => {
  const [currentLang, setCurrentLang] = useState(getCurrentLanguage());
  const [, forceUpdate] = useState({});

  useEffect(() => {
    const handleLanguageChange = (event: CustomEvent) => {
      setCurrentLang(event.detail.lang);
      forceUpdate({}); // Принудительное обновление
    };

    const handleForceRerender = () => {
      forceUpdate({}); // Перерисовка компонента
    };

    // Проверяем смену языка каждые 2 секунды
    const interval = setInterval(async () => {
      await refreshLocalization();
    }, 2000);

    window.addEventListener('languageChanged', handleLanguageChange as EventListener);
    window.addEventListener('forceRerender', handleForceRerender as EventListener);

    return () => {
      clearInterval(interval);
      window.removeEventListener('languageChanged', handleLanguageChange as EventListener);
      window.removeEventListener('forceRerender', handleForceRerender as EventListener);
    };
  }, []);

  const changeLanguage = async (lang: string) => {
    await setLanguage(lang);
  };

  return {
    t,
    currentLang,
    changeLanguage,
    availableLanguages: getAvailableLanguages(),
    isAutoMode: isAutoLanguageMode()
  };
};