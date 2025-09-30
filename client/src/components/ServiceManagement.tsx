import React, { useState, useEffect } from 'react';
import { TelegramAPI } from '../utils/telegram-api-core';
import { useBackButton } from '../hooks/useBackButton';
import { useLocalization } from '../hooks/useLocalization';
import { apiService } from '../services/api';
import type { Service } from '../types/service';
import { showSuccess, showError } from './ToastManager';

interface ServiceManagementProps {
  onBack: () => void;
  userId: number;
}

const ServiceManagement: React.FC<ServiceManagementProps> = ({ onBack, userId }) => {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    serviceNumber: '',
    name: '',
    address: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t } = useLocalization();

  useBackButton(onBack);

  useEffect(() => {
    loadServices();
  }, [userId]);

  const loadServices = async () => {
    try {
      setIsLoading(true);
      const data = await apiService.request(`/services/owner/${userId}`);
      setServices(data);
    } catch (error) {
      console.error('Ошибка загрузки сервисов:', error);
      setServices([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateService = async () => {
    if (!formData.serviceNumber.trim() || !formData.name.trim()) {
      showError('Заполните обязательные поля');
      return;
    }

    try {
      setIsSubmitting(true);
      
      const serviceData = {
        serviceNumber: formData.serviceNumber.trim(),
        name: formData.name.trim(),
        address: formData.address.trim(),
        ownerId: userId
      };

      await apiService.request('/services', {
        method: 'POST',
        body: JSON.stringify(serviceData)
      });

      showSuccess('Сервис создан');
      setShowCreateForm(false);
      setFormData({ serviceNumber: '', name: '', address: '' });
      await loadServices();
      TelegramAPI.vibrate('success');
    } catch (error: any) {
      console.error('Ошибка создания сервиса:', error);
      showError(error.message || 'Ошибка создания сервиса');
      TelegramAPI.vibrate('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteService = async (serviceId: number, serviceName: string) => {
    if (!confirm(`Удалить сервис "${serviceName}"?`)) {
      return;
    }

    try {
      await apiService.request(`/services/${serviceId}`, {
        method: 'DELETE'
      });

      showSuccess('Сервис удален');
      await loadServices();
      TelegramAPI.vibrate('success');
    } catch (error: any) {
      console.error('Ошибка удаления сервиса:', error);
      showError(error.message || 'Ошибка удаления сервиса');
      TelegramAPI.vibrate('error');
    }
  };

  return (
    <div className="fade-in">
      <div className="card">
        <div className="card-title">
          <i className="fas fa-building"></i>
          {t('upravlenie_servisami', 'Управление сервисами')}
        </div>
        <div className="card-content">
          {!showCreateForm ? (
            <button 
              className="btn btn-primary btn-full"
              onClick={() => {
                setShowCreateForm(true);
                TelegramAPI.vibrate('light');
              }}
            >
              <i className="fas fa-plus"></i>
              {t('sozdat_servis', 'Создать сервис')}
            </button>
          ) : (
            <div className="create-service-form">
              <div className="form-group">
                <label className="form-label">Номер сервиса *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="667"
                  value={formData.serviceNumber}
                  onChange={(e) => setFormData({...formData, serviceNumber: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Название *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Автосервис на Ленина"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Адрес</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="ул. Ленина, 123"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                />
              </div>
              
              <div className="form-actions">
                <button 
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowCreateForm(false);
                    setFormData({ serviceNumber: '', name: '', address: '' });
                    TelegramAPI.vibrate('light');
                  }}
                  disabled={isSubmitting}
                >
                  Отмена
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={handleCreateService}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Создание...' : 'Создать'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="loading-skeleton">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton-item">
              <div className="skeleton-avatar"></div>
              <div className="skeleton-content">
                <div className="skeleton-line skeleton-title"></div>
                <div className="skeleton-line skeleton-subtitle"></div>
              </div>
            </div>
          ))}
        </div>
      ) : services.length === 0 ? (
        <div className="card">
          <div className="card-content">
            <div className="empty-state">
              <i className="fas fa-building" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}></i>
              <div>У вас пока нет сервисов</div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">
                <i className="fas fa-building"></i>
              </div>
              <div className="stat-info">
                <div className="stat-value">{services.length}</div>
                <div className="stat-label">Сервисов</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <i className="fas fa-check-circle"></i>
              </div>
              <div className="stat-info">
                <div className="stat-value">{services.filter(s => s.status === 'active').length}</div>
                <div className="stat-label">Активных</div>
              </div>
            </div>
          </div>

          <div className="services-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
            {services.map(service => (
              <div key={service.id} className="card">
                <div className="card-content">
                  <div className="service-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div className="service-number" style={{ 
                      background: 'var(--tg-theme-button-color)', 
                      color: 'var(--tg-theme-button-text-color)', 
                      padding: '4px 8px', 
                      borderRadius: '6px', 
                      fontSize: '12px', 
                      fontWeight: '600' 
                    }}>
                      #{service.serviceNumber}
                    </div>
                    <div className={`status-badge status-${service.status}`}>
                      {service.status === 'active' ? 'Активен' : 'Неактивен'}
                    </div>
                  </div>
                  
                  <div className="service-info">
                    <div className="service-name" style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
                      {service.name}
                    </div>
                    <div className="service-address" style={{ fontSize: '14px', color: 'var(--tg-theme-hint-color)', marginBottom: '12px' }}>
                      <i className="fas fa-map-marker-alt" style={{ marginRight: '6px' }}></i>
                      {service.address || 'Адрес не указан'}
                    </div>
                    <div className="service-meta" style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color)', marginBottom: '12px' }}>
                      Создан: {new Date(service.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <div className="service-actions" style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      className="btn btn-sm btn-secondary"
                      style={{ flex: 1 }}
                      onClick={() => {
                        // TODO: Открыть редактирование
                      }}
                    >
                      <i className="fas fa-edit"></i>
                      Редактировать
                    </button>
                    <button 
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDeleteService(service.id, service.name)}
                      title="Удалить сервис"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ServiceManagement;