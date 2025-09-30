import React from 'react';
import { TelegramAPI } from '../utils/telegram-api-core';
import { getApiOrigin } from '../config/api';

interface QRModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: number;
  orderNumber: string;
}

const QRModal: React.FC<QRModalProps> = ({ isOpen, onClose, orderId, orderNumber }) => {
  const [isLoading, setIsLoading] = React.useState(true);
  
  const baseUrl = window.location.origin;
  const apiOrigin = getApiOrigin() || baseUrl;
  // Для gallery.html всегда используем текущий origin, так как страница обслуживается через NGINX
  const orderUrl = `${baseUrl}/gallery.html?order=${orderId}`;
  console.log('[QR] Gallery URL:', orderUrl, 'API Origin:', apiOrigin);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&format=png&margin=10&data=${encodeURIComponent(orderUrl)}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(orderUrl);
      TelegramAPI.vibrate('success');
    } catch (error) {
      console.error('Ошибка копирования:', error);
    }
  };

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
  };

  // Сброс состояния загрузки при открытии модального окна
  React.useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
    }
  }, [isOpen]);
  
  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="bottom-sheet-overlay show" onClick={handleOverlayClick}>
      <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="bottom-sheet-header">
          <h3>QR код для клиента</h3>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="bottom-sheet-content" style={{ textAlign: 'center', padding: '20px' }}>
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '5px' }}>
              Заказ #{orderNumber}
            </div>
            <div style={{ color: 'var(--tg-theme-hint-color)', fontSize: '14px' }}>
              Покажите этот код клиенту
            </div>
          </div>

          <div style={{ 
            background: 'var(--tg-theme-secondary-bg-color)', 
            padding: '20px', 
            borderRadius: '12px',
            marginBottom: '20px',
            position: 'relative',
            minHeight: '300px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {isLoading && (
              <div className="spinner"></div>
            )}
            <img 
              src={qrUrl} 
              alt={`QR код для заказа #${orderNumber}`}
              style={{ 
                width: '100%', 
                maxWidth: '300px', 
                height: 'auto',
                borderRadius: '8px',
                display: isLoading ? 'none' : 'block'
              }}
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          </div>

          <button 
            className="btn btn-primary"
            onClick={copyLink}
            style={{ width: '100%' }}
          >
            <i className="fas fa-copy"></i>
            Скопировать ссылку
          </button>
        </div>
      </div>
    </div>
  );
};

export default QRModal;