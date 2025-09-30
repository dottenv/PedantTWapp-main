import React, { useState, useEffect } from 'react';
import { TelegramAPI } from '../utils/telegram-api-core';
import { useLocalization } from '../hooks/useLocalization';
import { showSuccess } from './ToastManager';
import { useBackButton } from '../hooks/useBackButton';
import { useSettings } from '../hooks/useSettings';

interface ProfileSettingsProps {
  onBack: () => void;
  onNavigate: (page: string) => void;
  onShowPinSetup?: () => void;
}

const ProfileSettings: React.FC<ProfileSettingsProps> = ({ onBack, onNavigate, onShowPinSetup }) => {
  const [user, setUser] = useState<any>(null);
  const { t } = useLocalization();
  const { settings, isLoading, updateSetting, updateSettings } = useSettings();

  useBackButton(onBack);

  useEffect(() => {
    const telegramUser = TelegramAPI.getUser();
    if (telegramUser) {
      setUser(telegramUser);
    }
  }, []);


  


  const copyUsername = () => {
    if (user?.username) {
      navigator.clipboard.writeText(`@${user.username}`);
      showSuccess(t('username_skopirovan', 'Username скопирован'));
      TelegramAPI.vibrate('light');
    }
  };

  if (!user || isLoading || !settings) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>{t('zagruzka_profilya', 'Загрузка профиля...')}</p>
      </div>
    );
  }

  return (
    <div className="fade-in">
      {/* Профиль пользователя */}
      <div className="profile-section">
        <div className="profile-avatar">
          {user.photo_url ? (
            <img src={user.photo_url} alt={t('avatar', 'Аватар')} />
          ) : (
            <div className="avatar-placeholder">
              <i className="fas fa-user"></i>
            </div>
          )}
        </div>
        <div className="profile-name">
          {user.first_name} {user.last_name || ''}
        </div>
        {user.username && (
          <div className="profile-username" onClick={copyUsername}>
            <span>@{user.username}</span>
            <i className="fas fa-copy"></i>
          </div>
        )}
        <div className="profile-id">ID: {user.id}</div>
      </div>

      {/* Настройки интерфейса */}
      <div className="card">
        <div className="card-title">
          <i className="fas fa-palette"></i>
          {t('nastroyki_interfeysa', 'Настройки интерфейса')}
        </div>
        <div className="card-content">


          <div 
            className="user-item"
            onClick={() => {
              TelegramAPI.vibrate('light');
              onNavigate('language-selector');
            }}
          >
            <div className="user-avatar">
              <div className="avatar-placeholder">
                <i className="fas fa-language"></i>
              </div>
            </div>
            <div className="user-info">
              <div className="user-name">{t('yazyk_interfeysa', 'Язык интерфейса')}</div>
              <div className="user-details">{t('vybor_yazyka_prilozheniya', 'Выбор языка приложения')}</div>
            </div>
            <div className="user-actions">
              <i className="fas fa-chevron-right"></i>
            </div>
          </div>


        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;