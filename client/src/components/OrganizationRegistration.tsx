import React, { useState } from 'react';
import { TelegramAPI } from '../utils/telegram-api-core';
import { useBackButton } from '../hooks/useBackButton';
import { useLocalization } from '../hooks/useLocalization';
import { apiService } from '../services/api';
import { showSuccess, showError } from './ToastManager';

interface OrganizationRegistrationProps {
  onBack: () => void;
  onComplete: () => void;
  userId: number;
}

const OrganizationRegistration: React.FC<OrganizationRegistrationProps> = ({ 
  onBack, 
  onComplete, 
  userId 
}) => {
  const [formData, setFormData] = useState({
    organizationName: '',
    serviceNumber: '',
    serviceName: '',
    serviceAddress: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t } = useLocalization();

  useBackButton(onBack);

  const handleSubmit = async () => {
    // Валидация
    if (!formData.organizationName.trim()) {
      showError('Введите название организации');
      return;
    }
    
    if (!formData.serviceNumber.trim()) {
      showError('Введите номер сервиса');
      return;
    }
    
    if (!formData.serviceName.trim()) {
      showError('Введите название сервиса');
      return;
    }

    try {
      setIsSubmitting(true);
      TelegramAPI.vibrate('light');

      // 1. Обновляем пользователя
      await apiService.request(`/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({
          registrationStatus: 'registered',
          organizationName: formData.organizationName.trim()
        })
      });

      // 2. Создаем первый сервис
      const serviceData = {
        serviceNumber: formData.serviceNumber.trim(),
        name: formData.serviceName.trim(),
        address: formData.serviceAddress.trim(),
        ownerId: userId
      };

      await apiService.request('/services', {
        method: 'POST',
        body: JSON.stringify(serviceData)
      });

      showSuccess('Организация создана!');
      TelegramAPI.vibrate('success');
      
      // Переходим к основному интерфейсу
      setTimeout(() => {
        onComplete();
      }, 1000);

    } catch (error: any) {
      console.error('Ошибка регистрации:', error);
      showError(error.message || 'Ошибка создания организации');
      TelegramAPI.vibrate('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="organization-registration">
      <div className="registration-header">
        <div className="registration-icon">
          <i className="fas fa-building"></i>
        </div>
        <h1 className="registration-title">Создание организации</h1>
        <p className="registration-subtitle">Заполните данные для регистрации вашего бизнеса</p>
      </div>

      <div className="registration-form">
        <div className="card">
          <div className="card-content">
            <div className="form-group">
              <label className="form-label">Название организации *</label>
              <input
                type="text"
                className="form-input"
                placeholder="Например: ИП Голубев"
                value={formData.organizationName}
                onChange={(e) => setFormData({...formData, organizationName: e.target.value})}
                disabled={isSubmitting}
              />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-content">
            <div className="form-group">
              <label className="form-label">Номер сервиса *</label>
              <input
                type="text"
                className="form-input"
                placeholder="667"
                value={formData.serviceNumber}
                onChange={(e) => setFormData({...formData, serviceNumber: e.target.value})}
                disabled={isSubmitting}
              />
              <div className="form-hint">
                Уникальный номер для ваших заказов (1-4 цифры)
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Название сервиса *</label>
              <input
                type="text"
                className="form-input"
                placeholder="Автосервис на Ленина"
                value={formData.serviceName}
                onChange={(e) => setFormData({...formData, serviceName: e.target.value})}
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Адрес</label>
              <input
                type="text"
                className="form-input"
                placeholder="ул. Ленина, 123"
                value={formData.serviceAddress}
                onChange={(e) => setFormData({...formData, serviceAddress: e.target.value})}
                disabled={isSubmitting}
              />
            </div>
          </div>
        </div>

        <div className="registration-actions">
          <button 
            className="btn btn-secondary"
            onClick={onBack}
            disabled={isSubmitting}
          >
            Назад
          </button>
          <button 
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Создание...' : 'Создать организацию'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrganizationRegistration;