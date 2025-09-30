import React, { useState, useEffect } from 'react';
import { useLocalization } from '../hooks/useLocalization';
import { useBackButton } from '../hooks/useBackButton';
import { TelegramAPI } from '../utils/telegram-api-core';

interface LanguageSelectorProps {
  onBack: () => void;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ onBack }) => {
  const { t, currentLang, changeLanguage, availableLanguages } = useLocalization();
  const [selectedLang, setSelectedLang] = useState(currentLang);
  
  useBackButton(onBack);

  // Языковые настройки с автоматическим определением
  const languageOptions = [
    { code: 'auto', name: t('avtomaticheski', 'Автоматически'), flag: '🌐' },
    { code: 'ru', name: t('russkiy', 'Русский'), flag: '🇷🇺' },
    { code: 'en', name: t('angliyskiy', 'English'), flag: '🇺🇸' }
  ];

  useEffect(() => {
    // Проверяем, установлен ли автоматический режим
    const userSetting = localStorage.getItem('user_language_setting');
    setSelectedLang(userSetting || 'auto');
  }, []);

  const handleLanguageChange = async (langCode: string) => {
    setSelectedLang(langCode);
    TelegramAPI.vibrate('light');

    if (langCode === 'auto') {
      // Автоматический режим - удаляем пользовательскую настройку
      localStorage.removeItem('app_language');
      localStorage.setItem('user_language_setting', 'auto');
      
      // Определяем язык автоматически
      const tgUser = TelegramAPI.getUser();
      const autoLang = tgUser?.language_code?.split('-')[0] || 'ru';
      await changeLanguage(autoLang);
    } else {
      // Ручной выбор языка
      localStorage.setItem('user_language_setting', langCode);
      await changeLanguage(langCode);
    }
  };

  return (
    <div className="fade-in">
      <div className="card">
        <div className="card-title">
          <i className="fas fa-language"></i>
          {t('yazyk_interfeysa', 'Язык интерфейса')}
        </div>
        <div className="card-content">
          {languageOptions.map((option) => (
            <div 
              key={option.code}
              className={`user-item ${selectedLang === option.code ? 'selected' : ''}`}
              onClick={() => handleLanguageChange(option.code)}
            >
              <div className="user-avatar">
                <div className="avatar-placeholder">
                  <span style={{ fontSize: '20px' }}>{option.flag}</span>
                </div>
              </div>
              <div className="user-info">
                <div className="user-name">{option.name}</div>
                {option.code === 'auto' && (
                  <div className="user-details">
                    {t('opredelyaetsya_avtomaticheski', 'Определяется автоматически из Telegram')}
                  </div>
                )}
                {selectedLang === option.code && currentLang === option.code && (
                  <div className="user-details">
                    <i className="fas fa-check" style={{ color: 'var(--tg-theme-link-color)' }}></i>
                    {' '}{t('aktivnyy', 'Активный')}
                  </div>
                )}
              </div>
              <div className="user-actions">
                {selectedLang === option.code && (
                  <i className="fas fa-check-circle" style={{ color: 'var(--tg-theme-link-color)' }}></i>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-title">
          <i className="fas fa-info-circle"></i>
          {t('informatsiya', 'Информация')}
        </div>
        <div className="card-content">
          <div className="data-item">
            <div className="data-icon">
              <i className="fas fa-globe"></i>
            </div>
            <div className="data-info">
              <div className="data-title">{t('tekushchiy_yazyk', 'Текущий язык')}</div>
              <div className="data-subtitle">
                {languageOptions.find(opt => opt.code === currentLang)?.name || currentLang}
              </div>
            </div>
          </div>
          
          <div className="data-item">
            <div className="data-icon">
              <i className="fas fa-cog"></i>
            </div>
            <div className="data-info">
              <div className="data-title">{t('rezhim', 'Режим')}</div>
              <div className="data-subtitle">
                {selectedLang === 'auto' 
                  ? t('avtomaticheskiy', 'Автоматический')
                  : t('ruchnoy', 'Ручной')
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LanguageSelector;