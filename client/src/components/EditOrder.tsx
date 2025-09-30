import React, { useState, useRef, useEffect } from 'react';
import { TelegramAPI } from '../utils/telegram-api-core';
import { showSuccess, showError } from './ToastManager';
import { useBackButton } from '../hooks/useBackButton';
import { useSaveButton } from '../hooks/useSaveButton';
import { useLocalization } from '../hooks/useLocalization';
import { apiService } from '../services/api';
import PhotoGallery from './PhotoGallery';

interface Order {
  id: number;
  orderNumber?: string;
  created_at: string;
  photos_count: number;
  created_by: string;
  comment?: string;
  photos?: any[];
  status?: string;
  updated_at?: string;
}

interface EditOrderProps {
  order: Order;
  onBack: () => void;
  onSave: (orderData: { orderNumber: string; comment: string }) => void;
}

const EditOrder: React.FC<EditOrderProps> = ({ order, onBack, onSave }) => {
  const [orderNumber, setOrderNumber] = useState(order.orderNumber || order.id.toString());
  const [comment, setComment] = useState(order.comment || '');
  const [fullOrder, setFullOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [photos, setPhotos] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [existingPhotos, setExistingPhotos] = useState(order.photos || []);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initialValues = { orderNumber: order.orderNumber || order.id.toString(), comment: order.comment || '', photos: [] };
  const { t } = useLocalization();

  useBackButton(onBack, { priority: 10, id: 'edit-order' });

  useEffect(() => {
    const loadFullOrder = async () => {
      try {
        setIsLoading(true);
        const orderData = await apiService.getOrderById(order.id);
        setFullOrder(orderData);
        setOrderNumber(orderData.orderNumber || orderData.id.toString());
        setComment(orderData.comment || '');
      } catch (error) {
        console.error('Ошибка загрузки заказа:', error);
        setFullOrder(order);
      } finally {
        setIsLoading(false);
      }
    };

    loadFullOrder();
  }, [order.id]);



  const handleSave = async () => {
    if (!orderNumber.trim()) {
      showError(t('vvedite_nomer', 'Введите номер заказа'));
      return;
    }

    try {
      console.log(`💾 Сохраняем заказ #${order.id}:`, {
        orderNumber: orderNumber.trim(),
        comment: comment.trim()
      });
      
      // Если есть новые фото - добавляем их к существующим
      const result = photos.length > 0 
        ? await apiService.updateOrderWithPhotos(order.id, { 
            orderNumber: orderNumber.trim(),
            comment: comment.trim(),
            photos: photos
          })
        : await apiService.updateOrder(order.id, {
            orderNumber: orderNumber.trim(),
            comment: comment.trim()
          });
      
      if (result.success) {
        showSuccess(`Заказ #${orderNumber.trim()} обновлен!`);
        TelegramAPI.vibrate('success');
        
        setTimeout(() => {
          onSave({
            orderNumber: orderNumber.trim(),
            comment: comment.trim()
          });
        }, 500);
      } else {
        throw new Error(result.error || 'Неизвестная ошибка');
      }
    } catch (error: any) {
      console.error('❌ Ошибка обновления заказа:', error);
      const errorMessage = error.message || error.error || 'Ошибка сохранения';
      showError(errorMessage);
      TelegramAPI.vibrate('error');
    }
  };

  useSaveButton(initialValues, { orderNumber, comment, photos }, handleSave, t('sohranit_izmeneniya', 'Сохранить изменения'));

  const handleShowPhotoPicker = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const newPhotos = [...photos, ...files];
    setPhotos(newPhotos);

    // Создаем превью для новых фото
    const newPreviewUrls = files.map(file => URL.createObjectURL(file));
    setPreviewUrls(prev => [...prev, ...newPreviewUrls]);

    // Очищаем input
    event.target.value = '';
  };

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    const newPreviewUrls = previewUrls.filter((_, i) => i !== index);
    
    // Освобождаем память от URL
    URL.revokeObjectURL(previewUrls[index]);
    
    setPhotos(newPhotos);
    setPreviewUrls(newPreviewUrls);
  };

  // Очистка URL при размонтировании компонента
  useEffect(() => {
    return () => {
      previewUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Неизвестно';
    }
  };

  return (
    <div className="fade-in">
      {/* Компактная информация о заказе */}
      <div className="card">
        <div className="card-title">
          <div className="card-title-left">
            <i className="fas fa-edit"></i>
            Заказ #{order.id}
          </div>
          <div className="card-title-right">
            <span className="order-meta">{order.created_by} • {formatDate(order.created_at)}</span>
          </div>
        </div>
        
        <div className="card-content">
          {/* Форма в одной карточке */}
          <div className="form-group">
            <label className="form-label">Номер заказа</label>
            <input
              type="text"
              className="form-input"
              placeholder="Например: 1011"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Комментарий</label>
            <textarea
              className="form-input"
              placeholder="Добавьте комментарий..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
            />
          </div>

          {/* Компактная секция фотографий */}
          <div className="form-group">
            <div className="form-label-with-action">
              <label className="form-label">Новые фото</label>
              <button 
                type="button"
                className="btn-add-photo"
                onClick={handleShowPhotoPicker}
              >
                <i className="fas fa-plus"></i>
                Добавить
              </button>
            </div>
            
            {/* Новые фото */}
            {previewUrls.length > 0 && (
              <div className="photo-preview-grid">
                {previewUrls.map((url, index) => (
                  <div key={index} className="photo-preview-item">
                    <img src={url} alt={`Превью ${index + 1}`} />
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

            {/* Просмотр существующих фотографий */}
            {(fullOrder?.photos?.length > 0 || order.photos_count > 0) && (
              <>
                {fullOrder && fullOrder.photos && fullOrder.photos.length > 0 ? (
                  <div className="existing-photos-section">
                    <div className="existing-photos-info">
                      <i className="fas fa-images"></i>
                      <span>Загружено: {fullOrder.photos.length} фото</span>
                      {fullOrder.photos.length > 6 && (
                        <button 
                          className="btn-toggle-photos"
                          onClick={() => setShowAllPhotos(!showAllPhotos)}
                        >
                          <i className={`fas ${showAllPhotos ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                          {showAllPhotos ? 'Скрыть' : 'Показать'}
                        </button>
                      )}
                    </div>
                    {isLoading ? (
                      <div className="loading-spinner">
                        <div className="spinner"></div>
                      </div>
                    ) : (
                      <PhotoGallery 
                        photos={fullOrder.photos} 
                        maxVisible={showAllPhotos ? fullOrder.photos.length : 6}
                        compact={true}
                      />
                    )}
                  </div>
                ) : (
                  <div className="existing-photos-info">
                    <i className="fas fa-images"></i>
                    <span>Загружено: {order.photos_count} фото</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Скрытый input для выбора файлов */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />
    </div>
  );
};

export default EditOrder;