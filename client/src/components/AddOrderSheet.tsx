import React, { useState, useEffect, useRef } from 'react';
import { TelegramAPI } from '../utils/telegram-api-core';
import { useLocalization } from '../hooks/useLocalization';
import { showSuccess, showError } from './ToastManager';
import { OrderValidationUtils } from '../utils/orderValidation';
import { apiService } from '../services/api';

interface AddOrderSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (orderData: { orderNumber: string; comment: string; photos: File[]; serviceId?: number }) => void;
  userId: number;
}

const AddOrderSheet: React.FC<AddOrderSheetProps> = ({ isOpen, onClose, onSubmit, userId }) => {
  const [orderNumber, setOrderNumber] = useState('');
  const [comment, setComment] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderNumberError, setOrderNumberError] = useState<string>('');
  const [isGeneratingNumber, setIsGeneratingNumber] = useState(false);
  const [availableServices, setAvailableServices] = useState<any[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const { t } = useLocalization();

  const [showOverlay, setShowOverlay] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [startY, setStartY] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);


  // Загрузка доступных сервисов
  const loadAvailableServices = async () => {
    try {
      // Получаем сервисы где пользователь владелец
      const ownedServices = await apiService.request(`/services/owner/${userId}`);
      
      // Получаем сервисы где пользователь сотрудник
      const employeeData = await apiService.request(`/employees/user/${userId}`);
      const employeeServiceIds = employeeData.map((emp: any) => emp.serviceId);
      
      let employeeServices: any[] = [];
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
      
      setAvailableServices(uniqueServices);
      
      // Автоматически выбираем первый сервис если есть
      if (uniqueServices.length > 0 && !selectedServiceId) {
        setSelectedServiceId(uniqueServices[0].id);
      }
    } catch (error) {
      console.error('Ошибка загрузки сервисов:', error);
      setAvailableServices([]);
    }
  };

  // Генерация номера заказа
  const generateOrderNumber = async () => {
    if (!selectedServiceId) {
      setOrderNumberError('Выберите сервис для создания заказа');
      return;
    }
    
    try {
      setIsGeneratingNumber(true);
      const service = availableServices.find(s => s.id === selectedServiceId);
      if (!service) {
        setOrderNumberError('Сервис не найден');
        return;
      }
      
      const nextNumber = await apiService.request(`/orders/next-number/${service.serviceNumber}`);
      setOrderNumber(nextNumber);
      setOrderNumberError('');
    } catch (error) {
      console.error('Ошибка генерации номера:', error);
      setOrderNumberError('Ошибка генерации номера заказа');
    } finally {
      setIsGeneratingNumber(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open');
      TelegramAPI.vibrate('light');
      // Запрещаем закрытие приложения свайпом
      TelegramAPI.disableClosingConfirmation();
      // Загружаем доступные сервисы
      loadAvailableServices();
      // Задержка появления как у MainButton
      const timer = setTimeout(() => {
        setShowOverlay(true);
      }, 50);
      return () => clearTimeout(timer);
    } else {
      document.body.classList.remove('modal-open');
      // Возвращаем закрытие приложения
      TelegramAPI.enableClosingConfirmation();
      // Очищаем форму при закрытии
      setTimeout(() => {
        setOrderNumber('');
        setComment('');
        setPhotos([]);
        setDragY(0);
        setIsSubmitting(false);
        setOrderNumberError('');
        setIsGeneratingNumber(false);
        setAvailableServices([]);
        setSelectedServiceId(null);
        // Очищаем URL превью
        previewUrls.forEach(url => URL.revokeObjectURL(url));
        setPreviewUrls([]);
      }, 400);
    }
  }, [isOpen, userId, previewUrls]);

  // Глобальные обработчики для drag
  useEffect(() => {
    if (isDragging) {
      const handleGlobalMove = (e: TouchEvent | MouseEvent) => {
        e.preventDefault();
        handleDragMove(e as any);
      };
      
      const handleGlobalEnd = () => {
        handleDragEnd();
      };
      
      document.addEventListener('touchmove', handleGlobalMove, { passive: false });
      document.addEventListener('touchend', handleGlobalEnd);
      document.addEventListener('mousemove', handleGlobalMove);
      document.addEventListener('mouseup', handleGlobalEnd);
      
      return () => {
        document.removeEventListener('touchmove', handleGlobalMove);
        document.removeEventListener('touchend', handleGlobalEnd);
        document.removeEventListener('mousemove', handleGlobalMove);
        document.removeEventListener('mouseup', handleGlobalEnd);
      };
    }
  }, [isDragging, startY]);

  const handleShowPhotoPicker = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
    TelegramAPI.vibrate('light');
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      handlePhotosSelected(files);
    }
  };

  const handlePhotosSelected = async (files: File[]) => {
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    
    console.log(`📷 Сжимаем ${files.length} фото...`);
    
    try {
      const { ImageUtils } = await import('../utils/imageUtils');
      const compressedFiles = await ImageUtils.compressImages(files);
      
      const newPreviewUrls = compressedFiles.map(file => URL.createObjectURL(file));
      
      setPhotos(compressedFiles);
      setPreviewUrls(newPreviewUrls);
    } catch (error) {
      console.error('❌ Ошибка сжатия:', error);
      const newPreviewUrls = files.map(file => URL.createObjectURL(file));
      setPhotos(files);
      setPreviewUrls(newPreviewUrls);
    }
  };

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    const newPreviewUrls = previewUrls.filter((_, i) => i !== index);
    
    // Освобождаем URL
    URL.revokeObjectURL(previewUrls[index]);
    
    setPhotos(newPhotos);
    setPreviewUrls(newPreviewUrls);
    TelegramAPI.vibrate('light');
  };

  const openPhotoPreview = (url: string) => {
    // TODO: открыть полноэкранный просмотр
    TelegramAPI.vibrate('light');
    console.log('Открыть превью:', url);
  };

  const handleSubmit = async () => {
    // Проверка выбранного сервиса
    if (!selectedServiceId) {
      setOrderNumberError('Выберите сервис для создания заказа');
      showError('Выберите сервис для создания заказа');
      return;
    }

    // Валидация номера заказа
    const validation = OrderValidationUtils.validateOrderNumber(orderNumber);
    if (!validation.isValid) {
      setOrderNumberError(validation.error!);
      showError(validation.error!);
      return;
    }

    // Проверка принадлежности номера к выбранному сервису
    const service = availableServices.find(s => s.id === selectedServiceId);
    if (!service) {
      setOrderNumberError('Сервис не найден');
      showError('Сервис не найден');
      return;
    }
    
    if (!OrderValidationUtils.belongsToService(orderNumber, service.serviceNumber)) {
      setOrderNumberError(`Номер заказа должен начинаться с ${service.serviceNumber}-`);
      showError(`Номер заказа должен начинаться с ${service.serviceNumber}-`);
      return;
    }

    if (isSubmitting) return;

    console.log('📝 AddOrderSheet: Отправляем данные заказа:', {
      orderNumber: orderNumber.trim(),
      comment: comment.trim(),
      photosCount: photos.length
    });
    
    try {
      setIsSubmitting(true);
      
      // Показываем оригинальный Telegram прогресс-бар
      if (TelegramAPI.isAvailable()) {
        TelegramAPI.tg?.MainButton.showProgress();
      }
      
      await onSubmit({
        orderNumber: orderNumber.trim(),
        comment: comment.trim(),
        photos: photos,
        serviceId: selectedServiceId || undefined
      });
      
      onClose();
    } catch (error) {
      console.error('Ошибка создания заказа:', error);
    } finally {
      setIsSubmitting(false);
      // Скрываем Telegram прогресс-бар
      if (TelegramAPI.isAvailable()) {
        TelegramAPI.tg?.MainButton.hideProgress();
      }
    }
  };

  const handleClose = () => {
    TelegramAPI.vibrate('light');
    setShowOverlay(false);
    setTimeout(() => {
      onClose();
    }, 400);
  };

  const handleDragStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setIsDragging(true);
    setStartY(clientY);
    setDragY(0);
  };

  const handleDragMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging) return;
    
    e.preventDefault();
    e.stopPropagation();
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const deltaY = Math.max(0, clientY - startY);
    setDragY(deltaY);
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    
    setIsDragging(false);
    
    if (dragY > 100) {
      handleClose();
    } else {
      setDragY(0);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className={`bottom-sheet-overlay ${showOverlay ? 'show' : ''}`} onClick={handleClose}>
        <div 
          className="bottom-sheet"
          style={{
            transform: `translateY(${dragY}px)`,
            transition: isDragging ? 'none' : 'all 0.4s cubic-bezier(0.23, 1, 0.32, 1)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div 
            className="bottom-sheet-handle"
            onTouchStart={handleDragStart}
            onTouchMove={handleDragMove}
            onTouchEnd={handleDragEnd}
            onMouseDown={handleDragStart}
            onMouseMove={handleDragMove}
            onMouseUp={handleDragEnd}
          ></div>
          
          <div className="bottom-sheet-header">
            <h3>{t('novyy_zakaz', 'Новый заказ')}</h3>
          </div>

          <div className="bottom-sheet-content">
          <div className="form-group">
            <label className="form-label">Сервис</label>
            <select 
              className="form-select"
              value={selectedServiceId || ''}
              onChange={(e) => {
                const serviceId = e.target.value ? parseInt(e.target.value) : null;
                setSelectedServiceId(serviceId);
                // Очищаем номер заказа при смене сервиса
                setOrderNumber('');
                setOrderNumberError('');
              }}
            >
              <option value="">Выберите сервис</option>
              {availableServices.map(service => (
                <option key={service.id} value={service.id}>
                  #{service.serviceNumber} {service.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">{t('nomer_zakaza', 'Номер заказа')}</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <input
                type="text"
                className={`form-input ${orderNumberError ? 'error' : ''}`}
                placeholder="Например: 667-00001"
                value={orderNumber}
                onChange={(e) => {
                  const value = e.target.value;
                  setOrderNumber(value);
                  // Очищаем ошибку при вводе
                  if (orderNumberError) {
                    setOrderNumberError('');
                  }
                  // Валидация в реальном времени
                  if (value.trim()) {
                    const validation = OrderValidationUtils.validateOrderNumber(value);
                    if (!validation.isValid) {
                      setOrderNumberError(validation.error!);
                    }
                  }
                }}
                disabled={isGeneratingNumber}
                style={{ flex: 1 }}
              />
              <button 
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={generateOrderNumber}
                disabled={isGeneratingNumber || !selectedServiceId}
                title="Сгенерировать номер"
                style={{ flexShrink: 0 }}
              >
                <i className={`fas ${isGeneratingNumber ? 'fa-spinner fa-spin' : 'fa-sync-alt'}`}></i>
              </button>
            </div>
            {availableServices.length === 0 && (
              <div className="form-error">
                <i className="fas fa-exclamation-triangle"></i>
                У вас нет доступных сервисов для создания заказов
              </div>
            )}
            {orderNumberError && (
              <div className="form-error">
                <i className="fas fa-exclamation-triangle"></i>
                {orderNumberError}
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">{t('kommentariy_neobyzatelno', 'Комментарий (необязательно)')}</label>
            <textarea
              className="form-input"
              placeholder={t('dobavte_kommentariy', 'Добавьте комментарий...')}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t('fotografii', 'Фотографии')}</label>
            <div className="photo-upload-container">
              <button 
                type="button"
                className="photo-upload-btn"
                onClick={handleShowPhotoPicker}
              >
                <i className="fas fa-camera"></i>
                {t('dobavit_foto', 'Добавить фото')}
              </button>
            </div>
            
            {previewUrls.length > 0 && (
              <div className="photo-preview-grid">
                {previewUrls.map((url, index) => (
                  <div key={index} className="photo-preview-item">
                    <img 
                      src={url} 
                      alt={t('prevyu', 'Превью') + ` ${index + 1}`}
                      onClick={() => openPhotoPreview(url)}
                    />
                    <button 
                      className="photo-remove-btn"
                      onClick={() => removePhoto(index)}
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

            <div className="bottom-sheet-actions">
              <button className="btn btn-secondary" onClick={handleClose} disabled={isSubmitting}>
                {t('otmenit', 'Отмена')}
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                <i className="fas fa-plus"></i>
                {t('sozdat_zakaz', 'Создать заказ')}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Скрытый input для выбора файлов - вне overlay */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />
      

    </>
  );
};

export default AddOrderSheet;