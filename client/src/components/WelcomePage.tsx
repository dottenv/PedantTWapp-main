import React, { useState, useEffect } from 'react';
import { TelegramAPI } from '../utils/telegram-api-core';
import { useLocalization } from '../hooks/useLocalization';
import QRGenerator from './QRGenerator';

interface WelcomePageProps {
  onNavigate: (page: string) => void;
  userId: number;
}

const WelcomePage: React.FC<WelcomePageProps> = ({ onNavigate, userId }) => {
  const [userStatus, setUserStatus] = useState<string | null>(null);
  const { t } = useLocalization();

  useEffect(() => {
    // Получаем статус пользователя
    const fetchUserStatus = async () => {
      try {
        const { apiService } = await import('../services/api');
        const user = await apiService.getUserById(userId);
        if (user) {
          setUserStatus(user.registrationStatus);
        }
      } catch (error) {
        console.error('Ошибка получения статуса пользователя:', error);
      }
    };
    
    fetchUserStatus();
  }, [userId]);

  useEffect(() => {
    // Скрываем MainButton на странице приветствия
    TelegramAPI.hideMainButton();
  }, []);

  const handleCreateOrganization = () => {
    TelegramAPI.vibrate('light');
    onNavigate('organization-registration');
  };



  return (
    <div className="welcome-page">
      {/* Заголовок */}
      <div className="welcome-header">
        <div className="welcome-logo">
          <i className="fas fa-tools"></i>
        </div>
        <h1 className="welcome-title">PedantTW</h1>
        <p className="welcome-subtitle">Система фотомониторинга и отзывов</p>
      </div>

      {/* Основные действия */}
      <div className="welcome-actions">
        {userStatus === 'waiting_for_hire' ? (
          <div className="card">
            <div className="card-content" style={{paddingTop: '24px'}}>
              <div className="action-item">
                <div className="action-icon">
                  <i className="fas fa-clock" style={{color: 'var(--tg-theme-accent-text-color)'}}></i>
                </div>
                <div className="action-info">
                  <div className="action-title">Вы в очереди найма</div>
                  <div className="action-desc">Ожидайте, пока работодатель рассмотрит вашу заявку</div>
                </div>
              </div>
              
              <div className="qr-section">
                <QRGenerator userId={userId} />
                <p style={{textAlign: 'center', marginTop: '12px', fontSize: '14px', color: 'var(--tg-theme-hint-color)'}}>
                  Покажите этот QR-код работодателю
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="card">
              <div className="card-content" style={{paddingTop: '24px'}}>
                <div className="action-item">
                  <div className="action-icon">
                    <i className="fas fa-building"></i>
                  </div>
                  <div className="action-info">
                    <div className="action-title">Создать организацию</div>
                    <div className="action-desc">Зарегистрируйте свой бизнес и начните управлять заказами</div>
                  </div>
                </div>
                <button 
                  className="btn btn-primary btn-full"
                  onClick={handleCreateOrganization}
                >
                  Создать организацию
                </button>
              </div>
            </div>

            <div className="card">
              <div className="card-content" style={{paddingTop: '24px'}}>
                <div className="action-item">
                  <div className="action-icon">
                    <i className="fas fa-users"></i>
                  </div>
                  <div className="action-info">
                    <div className="action-title">Устроиться на работу</div>
                    <div className="action-desc">Покажите этот QR-код работодателю для трудоустройства</div>
                  </div>
                </div>
                
                <div className="qr-section">
                  <QRGenerator userId={userId} />
                </div>
                
                <button 
                  className="btn btn-secondary btn-full"
                  onClick={async () => {
                    try {
                      TelegramAPI.vibrate('light');
                      // Добавляем пользователя в очередь найма
                      const { apiService } = await import('../services/api');
                      await apiService.addToHiringQueue(userId);
                      TelegramAPI.vibrate('success');
                      setUserStatus('waiting_for_hire');
                    } catch (error) {
                      console.error('Ошибка добавления в очередь:', error);
                      TelegramAPI.vibrate('error');
                    }
                  }}
                >
                  Хочу устроиться на работу
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Информация */}
      <div className="welcome-info">
        <div className="info-card">
          <div className="info-icon">
            <i className="fas fa-info-circle"></i>
          </div>
          <div className="info-text">
            <strong>Для владельцев бизнеса:</strong> Создайте организацию и управляйте заказами, сотрудниками и сервисами.
          </div>
        </div>
        
        <div className="info-card">
          <div className="info-icon">
            <i className="fas fa-user-tie"></i>
          </div>
          <div className="info-text">
            <strong>Для сотрудников:</strong> Покажите QR-код работодателю, и он добавит вас в свою команду.
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomePage;