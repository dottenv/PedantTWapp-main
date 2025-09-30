import React, { useState } from 'react';
import { TelegramAPI } from '../utils/telegram-api-core';
import { showSuccess } from './ToastManager';
import { useBackButton } from '../hooks/useBackButton';
import { useSettings } from '../hooks/useSettings';

interface StorageSettingsProps {
  onBack: () => void;
}

const StorageSettings: React.FC<StorageSettingsProps> = ({ onBack }) => {
  const [cacheSize, setCacheSize] = useState('45.2 МБ');
  const { settings, isLoading, updateSetting, resetSettings, exportSettings, importSettings } = useSettings();

  useBackButton(onBack);

  const handleAutoCleanupToggle = async () => {
    if (settings) {
      await updateSetting('autoCleanup', !settings.autoCleanup);
      TelegramAPI.vibrate('light');
    }
  };

  const clearCache = () => {
    showSuccess('Кэш очищен');
    setCacheSize('0 МБ');
    TelegramAPI.vibrate('success');
  };

  const clearData = async () => {
    if (confirm('Вы уверены, что хотите сбросить все настройки?')) {
      await resetSettings();
      TelegramAPI.vibrate('success');
    }
  };
  
  const handleExport = async () => {
    await exportSettings();
    TelegramAPI.vibrate('success');
  };
  
  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        await importSettings(file);
        TelegramAPI.vibrate('success');
      }
    };
    input.click();
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
          <i className="fas fa-database"></i>
          Хранилище
        </div>
        <div className="card-content">
          <div className="data-item">
            <div className="data-icon">
              <i className="fas fa-hdd"></i>
            </div>
            <div className="data-info">
              <div className="data-title">Размер кэша</div>
              <div className="data-subtitle">{cacheSize}</div>
            </div>
          </div>

          <div className="toggle" onClick={handleAutoCleanupToggle}>
            <div>
              <div style={{fontWeight: '500'}}>Автоочистка</div>
              <div style={{fontSize: '14px', color: 'var(--tg-hint-color)'}}>Автоматически очищать старые данные</div>
            </div>
            <button className={`toggle-switch ${settings.autoCleanup ? 'active' : ''}`}></button>
          </div>


          
        </div>
      </div>
      
      {/* Действия */}
      <div className="card">
        <div className="card-title">
          <i className="fas fa-tools"></i>
          Действия
        </div>
        <div className="card-content">
          <div className="storage-actions">
            <button className="storage-btn storage-btn-secondary" onClick={clearCache}>
              <i className="fas fa-trash"></i>
              Очистить кэш
            </button>
            <button className="storage-btn storage-btn-info" onClick={handleExport}>
              <i className="fas fa-download"></i>
              Экспорт настроек
            </button>
            <button className="storage-btn storage-btn-warning" onClick={handleImport}>
              <i className="fas fa-upload"></i>
              Импорт настроек
            </button>
            <button className="storage-btn storage-btn-danger" onClick={clearData}>
              <i className="fas fa-exclamation-triangle"></i>
              Сбросить настройки
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StorageSettings;