import React, { useState, useEffect } from 'react';
import { useBackButton } from '../hooks/useBackButton';
import { useLocalization } from '../hooks/useLocalization';
import { TelegramAPI } from '../utils/telegram-api-core';
import { apiService } from '../services/api';
import { showSuccess, showError } from './ToastManager';
import { DateUtils } from '../utils/dateUtils';
import PhotoGallery from './PhotoGallery';
import { getApiOrigin } from '../config/api';
import QRModal from './QRModal';

interface Order {
  id: number;
  orderNumber?: string;
  created_at: string;
  photos_count: number;
  created_by: string;
  comment?: string;
  photos?: Array<{
    filename: string;
    savedAs: string;
    path: string;
    size: number;
    mimetype: string;
  }>;
}

interface OrderDetailsProps {
  order: Order;
  onBack: () => void;
  onEdit: () => void;
}

const OrderDetails: React.FC<OrderDetailsProps> = ({ order, onBack, onEdit }) => {
  const [fullOrder, setFullOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showQRModal, setShowQRModal] = useState(false);
  const { t } = useLocalization();
  useBackButton(onBack, { priority: 5, id: 'order-details' });

  useEffect(() => {
    const loadFullOrder = async () => {
      try {
        setIsLoading(true);
        const orderData = await apiService.getOrderById(order.id);
        setFullOrder(orderData);
      } catch (error) {
        console.error('Ошибка загрузки заказа:', error);
        setFullOrder(order);
      } finally {
        setIsLoading(false);
      }
    };

    loadFullOrder();
  }, [order.id]);

  const handleShare = () => {
    setShowQRModal(true);
    TelegramAPI.vibrate('light');
  };

  const handleAddPhotos = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = async (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      if (files.length > 0) {
        try {
          console.log(`📷 Сжимаем и добавляем ${files.length} фото к заказу #${order.id}`);
          
          const { ImageUtils } = await import('../utils/imageUtils');
          const compressedFiles = await ImageUtils.compressImages(files);
          
          const result = await apiService.updateOrderWithPhotos(order.id, {
            photos: compressedFiles
          });
          
          if (result.success) {
            showSuccess(result.message || `Добавлено ${files.length} фото`);
            TelegramAPI.vibrate('success');
            const updatedOrder = await apiService.getOrderById(order.id);
            setFullOrder(updatedOrder);
          } else {
            throw new Error(result.error || 'Неизвестная ошибка');
          }
        } catch (error: any) {
          console.error('❌ Ошибка добавления фото:', error);
          const errorMessage = error.message || error.error || 'Ошибка добавления фото';
          showError(errorMessage);
          TelegramAPI.vibrate('error');
        }
      }
    };
    input.click();
    TelegramAPI.vibrate('light');
  };

  const handleDownloadAll = async () => {
    if (!fullOrder?.photos || fullOrder.photos.length === 0) {
      showError('Нет фото для скачивания');
      return;
    }

    try {
      TelegramAPI.vibrate('light');
      showSuccess('Начало скачивания...');
      
      for (let i = 0; i < fullOrder.photos.length; i++) {
        const photo = fullOrder.photos[i];
        const fetchUrl = photo.path && photo.path.startsWith('/uploads') ? `${getApiOrigin()}${photo.path}` : photo.path;
        const response = await fetch(fetchUrl);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = photo.filename || `photo_${i + 1}.jpg`;
        link.click();
        
        URL.revokeObjectURL(url);
        
        // Пауза между скачиваниями
        if (i < fullOrder.photos.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      showSuccess(`Скачано ${fullOrder.photos.length} фото`);
      TelegramAPI.vibrate('success');
    } catch (error) {
      console.error('Ошибка скачивания:', error);
      showError('Ошибка скачивания');
      TelegramAPI.vibrate('error');
    }
  };

  const handleDelete = async () => {
    if (confirm('Вы уверены, что хотите удалить этот заказ?')) {
      try {
        await apiService.deleteOrder(order.id);
        showSuccess('Заказ удален');
        TelegramAPI.vibrate('success');
        onBack();
      } catch (error) {
        console.error('Ошибка удаления заказа:', error);
        showError('Ошибка удаления');
        TelegramAPI.vibrate('error');
      }
    }
  };



  return (
    <div className="fade-in">
      {/* Информация о заказе */}
      <div className="card">
        <div className="card-title">
          <i className="fas fa-info-circle"></i>
          {t('informatsiya_o_zakaze', 'Информация о заказе')}
        </div>
        <div className="card-content">
          <div className="data-grid">
            <div className="data-item">
              <div className="data-icon">
                <i className="fas fa-hashtag"></i>
              </div>
              <div className="data-info">
                <div className="data-title">{t('nomer_zakaza', 'Номер заказа')}</div>
                <div className="data-subtitle">#{fullOrder?.orderNumber || order.id}</div>
              </div>
            </div>
            
            <div className="data-item">
              <div className="data-icon">
                <i className="fas fa-user"></i>
              </div>
              <div className="data-info">
                <div className="data-title">{t('sozdatel', 'Создатель')}</div>
                <div className="data-subtitle">{order.created_by}</div>
              </div>
            </div>
            
            <div className="data-item">
              <div className="data-icon">
                <i className="fas fa-calendar"></i>
              </div>
              <div className="data-info">
                <div className="data-title">{t('data_sozdaniya', 'Дата создания')}</div>
                <div className="data-subtitle">{DateUtils.formatDate(order.created_at)}</div>
              </div>
            </div>
            
            <div className="data-item">
              <div className="data-icon">
                <i className="fas fa-camera"></i>
              </div>
              <div className="data-info">
                <div className="data-title">{t('kolichestvo_foto', 'Количество фото')}</div>
                <div className="data-subtitle">{order.photos_count} {t('sht', 'шт.')}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Галерея фотографий */}
      <div className="card">
        <div className="card-title">
          <div className="card-title-left">
            <i className="fas fa-images"></i>
            {t('fotografii', 'Фотографии')}
          </div>
          {order.photos_count > 6 && (
            <div className="card-title-right">
              <span className="photos-count">{order.photos_count} {t('sht', 'шт.')}</span>
            </div>
          )}
        </div>
        <div className="card-content">
          {isLoading ? (
            <div className="loading-spinner">
              <div className="spinner"></div>
            </div>
          ) : (
            <PhotoGallery 
              photos={fullOrder?.photos || []} 
              maxVisible={6}
              compact={true}
            />
          )}
        </div>
      </div>

      {/* Действия */}
      <div className="card">
        <div className="card-title">
          <i className="fas fa-cogs"></i>
          {t('deystviya', 'Действия')}
        </div>
        <div className="card-content">
          <div className="action-buttons">
            <button className="btn btn-primary" onClick={onEdit}>
              <i className="fas fa-edit"></i>
              {t('redaktirovat', 'Редактировать')}
            </button>
            <button className="btn btn-secondary" onClick={handleShare}>
              <i className="fas fa-qrcode"></i>
              {t('podelitsya', 'Поделиться')}
            </button>
            <button className="btn btn-secondary" onClick={handleAddPhotos}>
              <i className="fas fa-plus"></i>
              {t('dobavit_foto', 'Добавить фото')}
            </button>
            <button className="btn btn-secondary" onClick={handleDownloadAll}>
              <i className="fas fa-download"></i>
              {t('skachat_vse', 'Скачать все')}
            </button>
            <button className="btn btn-danger" onClick={handleDelete}>
              <i className="fas fa-trash"></i>
              {t('udalit', 'Удалить')}
            </button>
          </div>
        </div>
      </div>


      <QRModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        orderId={order.id}
        orderNumber={fullOrder?.orderNumber || order.orderNumber || order.id.toString()}
      />
    </div>
  );
};

export default OrderDetails;