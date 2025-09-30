import React, { useState, useEffect } from 'react';
import { TelegramAPI } from '../utils/telegram-api-core';
import { useBackButton } from '../hooks/useBackButton';
import { useLocalization } from '../hooks/useLocalization';
import ServiceSelector from './ServiceSelector';
import { getTelegramUser } from '../utils/user-init';
import { ConditionalRender } from './ProtectedRoute';
import { RoleUtils } from '../utils/roleUtils';

interface SettingsProps {
  onBack: () => void;
  onNavigate: (page: string) => void;
  currentUser?: any;
}

const Settings: React.FC<SettingsProps> = ({ onBack, onNavigate, currentUser: propCurrentUser }) => {
  const [clickCount, setClickCount] = useState(0);
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const [activeServiceId, setActiveServiceId] = useState<number | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { t } = useLocalization();

  useBackButton(onBack, { priority: 1, id: 'settings' });

  useEffect(() => {
    // Приоритет полным данным из App.tsx
    const user = propCurrentUser || getTelegramUser();
    if (user) {
      setCurrentUser(user);
      setActiveServiceId(user.activeServiceId || null);
    }
  }, [propCurrentUser]);

  const handleServiceChange = (serviceId: number | null) => {
    setActiveServiceId(serviceId);
    // TODO: Сохранить активный сервис в профиле пользователя
    console.log('Выбран сервис:', serviceId);
  };

  const handleVersionClick = () => {
    const newCount = clickCount + 1;
    console.log(`Version click: ${newCount}/5`);
    setClickCount(newCount);
    TelegramAPI.vibrate('light');

    if (newCount >= 5) {
      setShowAdminMenu(true);
      TelegramAPI.vibrate('heavy');
      console.log('Admin menu unlocked!');
    }
  };


  const settingsSections = [
    {
      title: t('profil', 'Профиль'),
      icon: 'fas fa-user',
      description: t('profil_opisanie', 'Профиль и настройки интерфейса'),
      page: 'profile-settings'
    },
    {
      title: t('bezopasnost', 'Безопасность'),
      icon: 'fas fa-shield-alt',
      description: t('bezopasnost_opisanie', 'Пароли и конфиденциальность'),
      page: 'security-settings'
    },
    {
      title: t('hranilische', 'Хранилище'),
      icon: 'fas fa-database',
      description: t('hranilische_opisanie', 'Управление данными и кэшем'),
      page: 'storage-settings'
    }
  ];

  const businessSections = [
    {
      title: 'Управление сервисами',
      icon: 'fas fa-building',
      description: 'Создание и настройка сервисов',
      page: 'service-management'
    },
    {
      title: 'Управление сотрудниками',
      icon: 'fas fa-users',
      description: 'Приглашение и управление персоналом',
      page: 'employee-management'
    },
    {
      title: 'Пригласить сотрудника',
      icon: 'fas fa-user-plus',
      description: 'Добавить нового сотрудника в сервис',
      page: 'invite-employee'
    }
  ];

  return (
    <div className="fade-in">
      {/* Селектор сервиса */}
      {currentUser && (
        <ServiceSelector
          userId={currentUser.id}
          activeServiceId={activeServiceId}
          onServiceChange={handleServiceChange}
        />
      )}

      {/* Бизнес настройки - только для зарегистрированных */}
      <ConditionalRender user={currentUser}>
        {RoleUtils.isRegistered(currentUser) && (
          <div className="card">
            <div className="card-title">
              <i className="fas fa-briefcase"></i>
              Бизнес
            </div>
            <div className="card-content">
              {businessSections.map((section, index) => {
                // Проверяем доступ к каждой секции
                let hasAccess = true;
                
                if (section.page === 'service-management' || section.page === 'employee-management' || section.page === 'invite-employee') {
                  hasAccess = RoleUtils.canCreateServices(currentUser) || 
                             (currentUser?.ownedServices && currentUser.ownedServices.length > 0);
                }
                
                if (!hasAccess) return null;
                
                return (
                  <div 
                    key={index}
                    className="user-item"
                    onClick={() => {
                      TelegramAPI.vibrate('light');
                      onNavigate(section.page);
                    }}
                  >
                    <div className="user-avatar">
                      <div className="avatar-placeholder">
                        <i className={section.icon}></i>
                      </div>
                    </div>
                    <div className="user-info">
                      <div className="user-name">{section.title}</div>
                      <div className="user-details">{section.description}</div>
                    </div>
                    <div className="user-actions">
                      <i className="fas fa-chevron-right"></i>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </ConditionalRender>

      {/* Основные настройки */}
      <div className="card">
        <div className="card-title">
          <i className="fas fa-cog"></i>
          {t('nastroyki', 'Настройки')}
        </div>
        <div className="card-content">
          {settingsSections.map((section, index) => (
            <div 
              key={index}
              className="settings-section"
              onClick={() => {
                TelegramAPI.vibrate('light');
                onNavigate(section.page);
              }}
            >
              <div className="section-item">
                <div className="section-icon">
                  <i className={section.icon}></i>
                </div>
                <div className="section-info">
                  <div className="section-title">{section.title}</div>
                  <div className="section-subtitle">{section.description}</div>
                </div>
                <div className="section-arrow">
                  <i className="fas fa-chevron-right"></i>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Дополнительные настройки */}
      <div className="card">
        <div className="card-title">
          <i className="fas fa-tools"></i>
          {t('dopolnitelno', 'Дополнительно')}
        </div>
        <div className="card-content">
          <div 
            className="settings-section"
            onClick={() => {
              TelegramAPI.vibrate('light');
              onNavigate('debug-page');
            }}
          >
            <div className="section-item">
              <div className="section-icon">
                <i className="fas fa-bug"></i>
              </div>
              <div className="section-info">
                <div className="section-title">{t('otladka', 'Отладка')}</div>
                <div className="section-subtitle">{t('otladka_opisanie', 'Логи и диагностика')}</div>
              </div>
              <div className="section-arrow">
                <i className="fas fa-chevron-right"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Скрытое админ меню - только для админов */}
      <ConditionalRender user={currentUser} requiredRole="admin">
        {showAdminMenu && (
          <div className="card">
            <div className="card-title">
              <i className="fas fa-user-shield"></i>
              {t('admin_panel', 'Админ панель')}
            </div>
            <div className="card-content">
              <div 
                className="user-item"
                onClick={() => {
                  TelegramAPI.vibrate('light');
                  onNavigate('admin-panel');
                }}
              >
                <div className="user-avatar">
                  <div className="avatar-placeholder">
                    <i className="fas fa-crown"></i>
                  </div>
                </div>
                <div className="user-info">
                  <div className="user-name">{t('admin_panel', 'Админ панель')}</div>
                  <div className="user-details">{t('upravlenie_sistemoy', 'Управление системой')}</div>
                </div>
                <div className="user-actions">
                  <i className="fas fa-chevron-right"></i>
                </div>
              </div>

              <div 
                className="user-item"
                onClick={() => {
                  TelegramAPI.vibrate('light');
                  onNavigate('debug-page');
                }}
              >
                <div className="user-avatar">
                  <div className="avatar-placeholder">
                    <i className="fas fa-bug"></i>
                  </div>
                </div>
                <div className="user-info">
                  <div className="user-name">{t('otladka', 'Debug страница')}</div>
                  <div className="user-details">{t('otladochnaya_informatsiya', 'Отладочная информация')}</div>
                </div>
                <div className="user-actions">
                  <i className="fas fa-chevron-right"></i>
                </div>
              </div>
            </div>
          </div>
        )}
      </ConditionalRender>

      {/* Информация о приложении */}
      <div className="card">
        <div className="card-title">
          <i className="fas fa-info-circle"></i>
          {t('o_prilozhenii', 'О приложении')}
        </div>
        <div className="card-content">
          <div className="data-item">
            <div className="data-icon">
              <i className="fas fa-mobile-alt"></i>
            </div>
            <div className="data-info">
              <div className="data-title">PedantTW App</div>
              <div className="data-subtitle">{t('galereya_zakazov', 'Галерея заказов')}</div>
            </div>
          </div>

          <div className="data-item" onClick={handleVersionClick}>
            <div className="data-icon">
              <i className="fas fa-code-branch"></i>
            </div>
            <div className="data-info">
              <div className="data-title">{t('versiya', 'Версия')}</div>
              <div className="data-subtitle">1.0.0 {clickCount > 0 && `(${clickCount}/5)`}</div>
            </div>
          </div>

          <div className="data-item">
            <div className="data-icon">
              <i className="fas fa-calendar"></i>
            </div>
            <div className="data-info">
              <div className="data-title">{t('posledneye_obnovleniye', 'Последнее обновление')}</div>
              <div className="data-subtitle">{new Date().toLocaleDateString('ru-RU')}</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Версия приложения */}
      <div className="app-version">
        <div className="version-text">PedantTW App v1.0.0</div>
      </div>
    </div>
  );
};

export default Settings;