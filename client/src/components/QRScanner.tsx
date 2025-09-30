import React, { useState, useEffect } from 'react';
import { TelegramAPI } from '../utils/telegram-api-core';
import { useBackButton } from '../hooks/useBackButton';
import { useLocalization } from '../hooks/useLocalization';
import { apiService } from '../services/api';
import type { Service } from '../types/service';
import { showSuccess, showError } from './ToastManager';

interface QRScannerProps {
  onBack: () => void;
  userId: number;
}

interface QRData {
  type: string;
  version: string;
  userId: number;
  firstName: string;
  lastName: string;
  username: string;
  languageCode: string;
  timestamp: number;
  expires: number;
}

const QRScanner: React.FC<QRScannerProps> = ({ onBack, userId }) => {
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('employee');
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState<QRData | null>(null);
  const { t } = useLocalization();

  useBackButton(onBack);

  useEffect(() => {
    loadServices();
  }, [userId]);

  const loadServices = async () => {
    try {
      setIsLoading(true);
      const data = await apiService.getServicesByOwner(userId);
      setServices(data);
      
      if (data.length > 0) {
        setSelectedServiceId(data[0].id.toString());
      }
    } catch (error) {
      console.error('Ошибка загрузки сервисов:', error);
      setServices([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScanQR = async () => {
    try {
      setIsScanning(true);
      
      // Используем Telegram QR Scanner API
      if (TelegramAPI.tg?.showScanQrPopup) {
        TelegramAPI.tg.showScanQrPopup({
          text: 'Отсканируйте QR-код сотрудника'
        }, (qrText: string) => {
          handleQRScanned(qrText);
          return true; // Закрываем сканер
        });
      } else {
        // Fallback для браузера - показываем инструкцию
        showError('QR-сканер доступен только в Telegram');
      }
    } catch (error) {
      console.error('Ошибка сканирования QR:', error);
      showError('Ошибка запуска сканера');
    } finally {
      setIsScanning(false);
    }
  };

  const handleQRScanned = (qrText: string) => {
    try {
      console.log('Отсканированный QR:', qrText);
      
      // Пытаемся распарсить JSON
      let qrData: QRData;
      try {
        qrData = JSON.parse(qrText);
      } catch {
        // Если не JSON, пытаемся парсить старый формат
        const match = qrText.match(/hire:(\d+):(\d+)/);
        if (match) {
          qrData = {
            type: 'employee_hire',
            version: '1.0',
            userId: parseInt(match[1]),
            firstName: '',
            lastName: '',
            username: '',
            languageCode: 'ru',
            timestamp: parseInt(match[2]),
            expires: parseInt(match[2]) + (24 * 60 * 60 * 1000)
          };
        } else {
          throw new Error('Неверный формат QR-кода');
        }
      }

      // Валидация QR-кода
      if (qrData.type !== 'employee_hire') {
        throw new Error('Это не QR-код для найма сотрудника');
      }

      if (qrData.userId === userId) {
        throw new Error('Нельзя нанять самого себя');
      }

      if (Date.now() > qrData.expires) {
        throw new Error('QR-код истек. Попросите сотрудника создать новый');
      }

      setScannedData(qrData);
      showSuccess('QR-код успешно отсканирован');
    } catch (error: any) {
      console.error('Ошибка обработки QR:', error);
      showError(error.message || 'Ошибка обработки QR-кода');
    }
  };

  const handleHireEmployee = async () => {
    if (!scannedData || !selectedServiceId) {
      showError('Выберите сервис');
      return;
    }

    try {
      setIsScanning(true);
      
      const employeeData = {
        serviceId: parseInt(selectedServiceId),
        userId: scannedData.userId,
        role: selectedRole,
        invitedBy: userId
      };

      await apiService.hireEmployee({
        userId: scannedData.userId,
        serviceId: parseInt(selectedServiceId),
        ownerId: userId
      });

      showSuccess(`Сотрудник ${scannedData.firstName} ${scannedData.lastName} добавлен`);
      setScannedData(null);
      TelegramAPI.vibrate('success');
    } catch (error: any) {
      console.error('Ошибка найма сотрудника:', error);
      showError(error.message || 'Ошибка найма сотрудника');
      TelegramAPI.vibrate('error');
    } finally {
      setIsScanning(false);
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
            <i className="fas fa-qrcode"></i>
            Сканер QR-кодов
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

  return (
    <div className="fade-in">
      <div className="card">
        <div className="card-title">
          <i className="fas fa-qrcode"></i>
          Сканер QR-кодов
        </div>
        <div className="card-content">
          <div className="form-group">
            <label className="form-label">Сервис для найма *</label>
            <select
              className="form-select"
              value={selectedServiceId}
              onChange={(e) => setSelectedServiceId(e.target.value)}
            >
              {services.map(service => (
                <option key={service.id} value={service.id}>
                  #{service.serviceNumber} {service.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Роль сотрудника</label>
            <select
              className="form-select"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
            >
              <option value="employee">Сотрудник</option>
              <option value="manager">Менеджер</option>
            </select>
          </div>

          <button 
            className="btn btn-primary btn-full"
            onClick={handleScanQR}
            disabled={isScanning || !selectedServiceId}
          >
            <i className="fas fa-qrcode"></i>
            {isScanning ? 'Сканирование...' : 'Сканировать QR-код'}
          </button>
        </div>
      </div>

      {scannedData && (
        <div className="card">
          <div className="card-title">
            <i className="fas fa-user-check"></i>
            Данные сотрудника
          </div>
          <div className="card-content">
            <div className="data-item">
              <div className="data-icon">
                <i className="fas fa-user"></i>
              </div>
              <div className="data-info">
                <div className="data-title">
                  {scannedData.firstName} {scannedData.lastName}
                </div>
                <div className="data-subtitle">
                  @{scannedData.username || 'без username'}
                </div>
              </div>
            </div>

            <div className="data-item">
              <div className="data-icon">
                <i className="fas fa-id-card"></i>
              </div>
              <div className="data-info">
                <div className="data-title">ID: {scannedData.userId}</div>
                <div className="data-subtitle">
                  Язык: {scannedData.languageCode}
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => setScannedData(null)}
                disabled={isScanning}
              >
                Отмена
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleHireEmployee}
                disabled={isScanning}
              >
                {isScanning ? 'Найм...' : 'Нанять сотрудника'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-title">
          <i className="fas fa-info-circle"></i>
          Инструкция
        </div>
        <div className="card-content">
          <div className="info-steps">
            <div className="info-step">
              <div className="step-number">1</div>
              <div className="step-text">
                Попросите кандидата открыть приложение
              </div>
            </div>
            <div className="info-step">
              <div className="step-number">2</div>
              <div className="step-text">
                Кандидат показывает свой QR-код
              </div>
            </div>
            <div className="info-step">
              <div className="step-number">3</div>
              <div className="step-text">
                Нажмите "Сканировать QR-код" и наведите камеру
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRScanner;