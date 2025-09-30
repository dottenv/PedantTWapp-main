import React, { useState } from 'react';
import { TelegramAPI } from '../utils/telegram-api-core';
import { showSuccess } from './ToastManager';
import { useBackButton } from '../hooks/useBackButton';
import { useSettings } from '../hooks/useSettings';

interface SecuritySettingsProps {
  onBack: () => void;
  onShowPinSetup?: () => void;
  onShowPinVerify?: () => void;
}

const SecuritySettings: React.FC<SecuritySettingsProps> = ({ onBack, onShowPinSetup, onShowPinVerify }) => {
  const { settings, isLoading, updateSetting } = useSettings();

  useBackButton(onBack);

  const handleAutoLockToggle = async () => {
    if (settings) {
      await updateSetting('autoLock', !settings.autoLock);
      TelegramAPI.vibrate('light');
    }
  };
  


  const handleSetupPin = () => {
    onShowPinSetup?.();
    TelegramAPI.vibrate('light');
  };

  const handleChangePin = () => {
    onShowPinSetup?.(); // Для смены тоже используем setup
    TelegramAPI.vibrate('light');
  };

  if (isLoading || !settings) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Загрузка настроек...</p>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="card">
        <div className="card-title">
          <i className="fas fa-shield-alt"></i>
          Безопасность
        </div>
        <div className="card-content">
          <div className="toggle" onClick={handleAutoLockToggle}>
            <div>
              <div style={{fontWeight: '500'}}>Автоблокировка</div>
              <div style={{fontSize: '14px', color: 'var(--tg-theme-hint-color)'}}>Блокировать приложение при неактивности</div>
            </div>
            <button className={`toggle-switch ${settings.autoLock ? 'active' : ''}`}></button>
          </div>


          <div className="pin-section">
            <div className="pin-info">
              <div className="pin-title">PIN-код</div>
              <div className="pin-status">
                <i className={`fas ${settings.hasPincode ? 'fa-check-circle text-success' : 'fa-times-circle text-destructive'}`}></i>
                {settings.hasPincode ? 'Установлен' : 'Не установлен'}
              </div>
            </div>
            <div className="pin-actions">
              {!settings.hasPincode ? (
                <button className="pin-btn pin-btn-setup" onClick={handleSetupPin}>
                  <i className="fas fa-plus"></i>
                  Установить
                </button>
              ) : (
                <button className="pin-btn pin-btn-change" onClick={handleChangePin}>
                  <i className="fas fa-edit"></i>
                  Изменить
                </button>
              )}
            </div>
          </div>



        </div>
      </div>
    </div>
  );
};

export default SecuritySettings;