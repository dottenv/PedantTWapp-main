import React, { useState, useEffect } from 'react';
import { TelegramAPI } from '../utils/telegram-api-core';
import { useBackButton } from '../hooks/useBackButton';
import { useLocalization } from '../hooks/useLocalization';
import { apiService } from '../services/api';
import type { Service } from '../types/service';
import { showSuccess, showError } from './ToastManager';
import QRScanner from './QRScanner';

interface InviteEmployeeProps {
  onBack: () => void;
  userId: number;
}

const InviteEmployee: React.FC<InviteEmployeeProps> = ({ onBack, userId }) => {
  const [services, setServices] = useState<Service[]>([]);
  const [formData, setFormData] = useState({
    serviceId: '',
    employeeId: '',
    role: 'employee'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentMode, setCurrentMode] = useState<'menu' | 'qr' | 'manual' | 'queue'>('menu');
  const [hiringQueue, setHiringQueue] = useState<any[]>([]);
  const { t } = useLocalization();

  useBackButton(onBack);

  useEffect(() => {
    loadServices();
    loadHiringQueue();
  }, [userId]);

  const loadServices = async () => {
    try {
      setIsLoading(true);
      const data = await apiService.getServicesByOwner(userId);
      setServices(data);
      
      if (data.length > 0) {
        setFormData(prev => ({ ...prev, serviceId: data[0].id.toString() }));
      }
    } catch (error) {
      console.error('Ошибка загрузки сервисов:', error);
      setServices([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadHiringQueue = async () => {
    try {
      // Загружаем очередь для работодателя
      const data = await apiService.getHiringQueue(userId);
      console.log('Очередь найма:', data);
      setHiringQueue(data);
    } catch (error) {
      console.error('Ошибка загрузки очереди:', error);
      setHiringQueue([]);
    }
  };

  const handleApproveCandidate = async (queueId: number) => {
    try {
      await apiService.approveCandidate(queueId, userId);
      showSuccess('Кандидат одобрен');
      loadHiringQueue();
    } catch (error: any) {
      showError(error.message || 'Ошибка одобрения');
    }
  };

  const handleRejectCandidate = async (queueId: number) => {
    try {
      await apiService.rejectCandidate(queueId, userId);
      showSuccess('Кандидат отклонен');
      loadHiringQueue();
    } catch (error: any) {
      showError(error.message || 'Ошибка отклонения');
    }
  };

  const handleInviteEmployee = async () => {
    if (!formData.serviceId || !formData.employeeId.trim()) {
      showError('Заполните все поля');
      return;
    }

    const employeeId = parseInt(formData.employeeId.trim());
    if (isNaN(employeeId)) {
      showError('Telegram ID должен быть числом');
      return;
    }

    if (employeeId === userId) {
      showError('Нельзя пригласить самого себя');
      return;
    }

    try {
      setIsSubmitting(true);
      
      const employeeData = {
        serviceId: parseInt(formData.serviceId),
        userId: employeeId,
        role: formData.role,
        invitedBy: userId
      };

      await apiService.hireEmployee({
        userId: employeeId,
        serviceId: parseInt(formData.serviceId),
        ownerId: userId
      });

      showSuccess('Сотрудник добавлен');
      setFormData({
        serviceId: services.length > 0 ? services[0].id.toString() : '',
        employeeId: '',
        role: 'employee'
      });
      TelegramAPI.vibrate('success');
    } catch (error: any) {
      console.error('Ошибка приглашения сотрудника:', error);
      showError(error.message || 'Ошибка приглашения сотрудника');
      TelegramAPI.vibrate('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="fade-in">
        <div className="card">
          <div className="card-content">
            <div className="loading-spinner">
              <div className="spinner"></div>
              Загрузка...
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="fade-in">
        <div className="card">
          <div className="card-title">
            <i className="fas fa-user-plus"></i>
            Найм сотрудников
          </div>
          <div className="card-content">
            <div className="empty-state">
              <i className="fas fa-building" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}></i>
              <div>Сначала создайте сервис</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // QR сканер
  if (currentMode === 'qr') {
    return (
      <QRScanner 
        onBack={() => setCurrentMode('menu')}
        userId={userId}
      />
    );
  }

  // Ручной ввод
  if (currentMode === 'manual') {
    return (
      <div className="fade-in">
        <div className="card">
          <div className="card-title">
            <i className="fas fa-keyboard"></i>
            Ручной ввод ID
          </div>
          <div className="card-content">
            <div className="form-group">
              <label className="form-label">Сервис *</label>
              <select
                className="form-select"
                value={formData.serviceId}
                onChange={(e) => setFormData({...formData, serviceId: e.target.value})}
              >
                {services.map(service => (
                  <option key={service.id} value={service.id}>
                    #{service.serviceNumber} {service.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label className="form-label">Telegram ID сотрудника *</label>
              <input
                type="text"
                className="form-input"
                placeholder="123456789"
                value={formData.employeeId}
                onChange={(e) => setFormData({...formData, employeeId: e.target.value})}
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Роль</label>
              <select
                className="form-select"
                value={formData.role}
                onChange={(e) => setFormData({...formData, role: e.target.value})}
              >
                <option value="employee">Сотрудник</option>
                <option value="manager">Менеджер</option>
              </select>
            </div>
            
            <div className="form-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => setCurrentMode('menu')}
                disabled={isSubmitting}
              >
                Назад
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleInviteEmployee}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Приглашение...' : 'Пригласить'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Очередь кандидатов
  if (currentMode === 'queue') {
    return (
      <div className="fade-in">
        <div className="card">
          <div className="card-title">
            <i className="fas fa-users"></i>
            Очередь кандидатов
          </div>
          <div className="card-content">
            {hiringQueue.length === 0 ? (
              <div className="empty-state">
                <i className="fas fa-user-clock" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}></i>
                <div>Очередь пуста</div>
              </div>
            ) : (
              <div className="hiring-queue">
                {hiringQueue.map(candidate => (
                  <div key={candidate.id} className="user-item">
                    <div className="user-avatar">
                      <div className="avatar-placeholder">
                        {candidate.qrData?.firstName?.charAt(0) || 'U'}
                      </div>
                    </div>
                    <div className="user-info">
                      <div className="user-name">
                        {candidate.qrData?.firstName} {candidate.qrData?.lastName}
                      </div>
                      <div className="user-details">
                        ID: {candidate.candidateUserId} | Роль: {candidate.role}
                      </div>
                      <div className="user-meta">
                        <span className="order-meta">
                          {new Date(candidate.scannedAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    {(candidate.status === 'pending' || candidate.status === 'waiting_for_hire') ? (
                      <div className="user-actions">
                        <button 
                          className="btn btn-sm btn-success"
                          onClick={() => handleApproveCandidate(candidate.id)}
                        >
                          <i className="fas fa-check"></i>
                        </button>
                        <button 
                          className="btn btn-sm btn-danger"
                          onClick={() => handleRejectCandidate(candidate.id)}
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                    ) : (
                      <div className={`status-badge status-${candidate.status}`}>
                        {candidate.status === 'approved' ? 'Одобрен' : 
                         candidate.status === 'rejected' ? 'Отклонен' : 
                         candidate.status === 'waiting_for_hire' ? 'Ожидает' :
                         candidate.status}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            <button 
              className="btn btn-secondary btn-full"
              onClick={() => setCurrentMode('menu')}
              style={{ marginTop: '16px' }}
            >
              <i className="fas fa-arrow-left"></i>
              Назад
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Меню выбора способа найма
  return (
    <div className="fade-in">
      <div className="card">
        <div className="card-title">
          <i className="fas fa-user-plus"></i>
          Найм сотрудников
        </div>
        <div className="card-content">
          <div className="hiring-methods" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button 
              className="btn btn-primary btn-full"
              onClick={() => setCurrentMode('qr')}
            >
              <i className="fas fa-qrcode"></i>
              Сканировать QR-код
            </button>
            
            <button 
              className="btn btn-secondary btn-full"
              onClick={() => setCurrentMode('manual')}
            >
              <i className="fas fa-keyboard"></i>
              Ввести ID вручную
            </button>
            
            <button 
              className="btn btn-info btn-full"
              onClick={() => setCurrentMode('queue')}
            >
              <i className="fas fa-users"></i>
              Очередь кандидатов ({hiringQueue.filter(c => c.status === 'pending' || c.status === 'waiting_for_hire').length})
            </button>
          </div>
        </div>
      </div>
      
      <div className="card">
        <div className="card-title">
          <i className="fas fa-info-circle"></i>
          Рекомендации
        </div>
        <div className="card-content">
          <div className="info-steps">
            <div className="info-step">
              <div className="step-number">1</div>
              <div className="step-text">
                <strong>QR-код</strong> - самый быстрый способ. Кандидат показывает свой QR-код
              </div>
            </div>
            <div className="info-step">
              <div className="step-number">2</div>
              <div className="step-text">
                <strong>Ручной ввод</strong> - для случаев, когда знаете Telegram ID
              </div>
            </div>
            <div className="info-step">
              <div className="step-number">3</div>
              <div className="step-text">
                <strong>Очередь</strong> - просмотр и обработка заявок кандидатов
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InviteEmployee;