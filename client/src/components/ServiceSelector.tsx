import React, { useState, useEffect } from 'react';
import { TelegramAPI } from '../utils/telegram-api-core';
import { useLocalization } from '../hooks/useLocalization';
import { apiService } from '../services/api';
import type { Service } from '../types/service';

interface ServiceSelectorProps {
  userId: number;
  activeServiceId: number | null;
  onServiceChange: (serviceId: number | null) => void;
}

const ServiceSelector: React.FC<ServiceSelectorProps> = ({ 
  userId, 
  activeServiceId, 
  onServiceChange 
}) => {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const { t } = useLocalization();

  useEffect(() => {
    loadUserServices();
  }, [userId]);

  const loadUserServices = async () => {
    try {
      setIsLoading(true);
      
      // Получаем сервисы где пользователь владелец
      const ownedServices = await apiService.request(`/services/owner/${userId}`);
      
      // Получаем сервисы где пользователь сотрудник
      const employeeData = await apiService.request(`/employees/user/${userId}`);
      const employeeServiceIds = employeeData.map((emp: any) => emp.serviceId);
      
      let employeeServices: Service[] = [];
      if (employeeServiceIds.length > 0) {
        employeeServices = await Promise.all(
          employeeServiceIds.map((id: number) => apiService.request(`/services/${id}`))
        );
      }
      
      // Объединяем и убираем дубликаты
      const allServices = [...ownedServices, ...employeeServices];
      const uniqueServices = allServices.filter((service, index, self) => 
        index === self.findIndex(s => s.id === service.id)
      );
      
      setServices(uniqueServices);
    } catch (error) {
      console.error('Ошибка загрузки сервисов:', error);
      setServices([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleServiceSelect = (serviceId: number | null) => {
    TelegramAPI.vibrate('light');
    onServiceChange(serviceId);
    setShowDropdown(false);
  };

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
    TelegramAPI.vibrate('light');
  };

  if (isLoading) {
    return (
      <div className="service-selector">
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (services.length === 0) {
    return null;
  }

  const getSelectedServiceText = () => {
    if (!activeServiceId) {
      return t('vse_servisy', 'Все сервисы');
    }
    const service = services.find(s => s.id === activeServiceId);
    return service ? `#${service.serviceNumber} ${service.name}` : t('vse_servisy', 'Все сервисы');
  };

  return (
    <div className="service-selector">
      <div className="card">
        <div className="card-title">
          <div className="card-title-left">
            <i className="fas fa-building"></i>
            {t('aktivnyy_servis', 'Активный сервис')}
          </div>
          <div className="card-title-right">
            <button 
              className="btn btn-secondary btn-sm"
              onClick={toggleDropdown}
              title="Выбрать сервис"
            >
              <i className={`fas fa-chevron-${showDropdown ? 'up' : 'down'}`}></i>
            </button>
          </div>
        </div>
        <div className="card-content">
          {!showDropdown ? (
            <div className="selected-service">
              {getSelectedServiceText()}
            </div>
          ) : (
            <div className="service-dropdown">
              <div 
                className={`service-option ${!activeServiceId ? 'active' : ''}`}
                onClick={() => handleServiceSelect(null)}
              >
                <i className="fas fa-globe"></i>
                <span>{t('vse_servisy', 'Все сервисы')}</span>
                {!activeServiceId && <i className="fas fa-check"></i>}
              </div>
              {services.map(service => (
                <div 
                  key={service.id}
                  className={`service-option ${activeServiceId === service.id ? 'active' : ''}`}
                  onClick={() => handleServiceSelect(service.id)}
                >
                  <i className="fas fa-building"></i>
                  <span>#{service.serviceNumber} {service.name}</span>
                  {activeServiceId === service.id && <i className="fas fa-check"></i>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ServiceSelector;