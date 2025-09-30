import React, { useState, useEffect } from 'react';
import { TelegramAPI } from '../utils/telegram-api-core';
import { useLocalization } from '../hooks/useLocalization';
import AddOrderSheet from './AddOrderSheet';
import { apiService } from '../services/api';
import { getTelegramUser } from '../utils/user-init';
import { useEffect as useEffectOnce } from 'react';
import { showSuccess, showError } from './ToastManager';

interface Order {
  id: number;
  orderNumber: string;
  created_at: string;
  photos_count: number;
  created_by: string;
  comment?: string;
  photos?: any[];
  status?: string;
  updated_at?: string;
}

interface OrdersListProps {
  onOrderSelect: (order: Order) => void;
  onOrderEdit: (order: Order) => void;
}

const OrdersList: React.FC<OrdersListProps> = ({ onOrderSelect, onOrderEdit }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [selectedOrders, setSelectedOrders] = useState<Set<number>>(new Set());
  const [massOperationsMode, setMassOperationsMode] = useState(false);
  const [visibleCount, setVisibleCount] = useState(15);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [isLoading, setIsLoading] = useState(true);


  const { t } = useLocalization();

  // Загрузка заказов с сервера
  const loadOrders = async () => {
    try {
      setIsLoading(true);
      
      console.log('📋 Загружаем заказы с сервера...');
      const ordersData = await apiService.getOrders();
      console.log('✅ Заказы загружены:', ordersData);
      
      if (Array.isArray(ordersData)) {
        setOrders(ordersData);
        setFilteredOrders(ordersData);
      } else {
        console.error('❌ Ответ API не является массивом:', ordersData);
        setOrders([]);
        setFilteredOrders([]);
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки заказов:', error);
      setOrders([]);
      setFilteredOrders([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    loadOrders();

  }, []);

  useEffect(() => {
    const filtered = orders.filter(order => {
      if (searchQuery) {
        const searchTerm = searchQuery.toLowerCase();
        const orderNumber = (order.orderNumber || order.id.toString()).toLowerCase();
        return orderNumber.includes(searchTerm);
      }
      return true;
    });
    setFilteredOrders(filtered);
  }, [orders, searchQuery]);

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return 'Неизвестно';
    }
  };

  const toggleMassOperations = () => {
    setMassOperationsMode(!massOperationsMode);
    setSelectedOrders(new Set());
    TelegramAPI.vibrate('light');
  };

  const toggleOrderSelection = (orderId: number) => {
    const newSelected = new Set(selectedOrders);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelectedOrders(newSelected);
    TelegramAPI.vibrate('light');
  };

  const selectAll = () => {
    const visibleOrders = filteredOrders.slice(0, visibleCount);
    const newSelected = new Set(selectedOrders);
    visibleOrders.forEach(order => newSelected.add(order.id));
    setSelectedOrders(newSelected);
    TelegramAPI.vibrate('light');
  };

  const clearSelection = () => {
    setSelectedOrders(new Set());
    TelegramAPI.vibrate('light');
  };

  const loadMore = () => {
    setVisibleCount(prev => prev + 15);
    TelegramAPI.vibrate('light');
  };

  const viewOrderDetails = (orderId: number) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    
    TelegramAPI.vibrate('light');
    onOrderSelect(order);
  };

  useEffect(() => {
    // Показываем MainButton с задержкой после загрузки
    const timer = setTimeout(() => {
      if (!showSearch) {
        TelegramAPI.showMainButton(t('dobavit_zakaz', 'Добавить заказ'), () => {
          setShowAddSheet(true);
        });
      }
    }, 800);
    
    return () => {
      clearTimeout(timer);
      TelegramAPI.hideMainButton();
    };
  }, []);

  // Управление MainButton при поиске и открытой форме
  useEffect(() => {
    if (showSearch || showAddSheet) {
      TelegramAPI.hideMainButton();
    } else {
      TelegramAPI.showMainButton(t('dobavit_zakaz', 'Добавить заказ'), () => {
        setShowAddSheet(true);
      });
    }
  }, [showSearch, showAddSheet]);

  const toggleSearch = () => {
    setShowSearch(!showSearch);
    if (showSearch) {
      setSearchQuery('');
    }
    TelegramAPI.vibrate('light');
  };

  const visibleOrders = filteredOrders.slice(0, visibleCount);

  const handleMassDelete = async () => {
    if (selectedOrders.size === 0) return;
    
    const count = selectedOrders.size;
    if (!confirm(`Вы уверены, что хотите удалить ${count} заказов?`)) {
      return;
    }
    
    try {
      let deleted = 0;
      for (const orderId of selectedOrders) {
        try {
          await apiService.deleteOrder(orderId);
          deleted++;
        } catch (error) {
          console.error(`Ошибка удаления заказа ${orderId}:`, error);
        }
      }
      
      if (deleted > 0) {
        showSuccess(`Удалено ${deleted} заказов`);
        TelegramAPI.vibrate('success');
        await loadOrders();
        setSelectedOrders(new Set());
      }
      
      if (deleted < count) {
        showError(`Не удалось удалить ${count - deleted} заказов`);
      }
    } catch (error) {
      console.error('Ошибка массового удаления:', error);
      showError('Ошибка удаления');
      TelegramAPI.vibrate('error');
    }
  };

  const handleMassDownload = async () => {
    if (selectedOrders.size === 0) return;
    
    try {
      const selectedOrdersList = orders.filter(order => selectedOrders.has(order.id));
      const allPhotos: Array<{path: string, filename: string}> = [];
      
      // Собираем все фото из выбранных заказов
      for (const order of selectedOrdersList) {
        if (order.photos && order.photos.length > 0) {
          order.photos.forEach((photo: any, index: number) => {
            allPhotos.push({
              path: photo.path,
              filename: `${order.orderNumber || order.id}_${photo.filename || `photo_${index + 1}.jpg`}`
            });
          });
        }
      }
      
      if (allPhotos.length === 0) {
        showError('В выбранных заказах нет фото');
        return;
      }
      
      showSuccess(`Начинаем скачивание ${allPhotos.length} фото...`);
      TelegramAPI.vibrate('light');
      
      for (let i = 0; i < allPhotos.length; i++) {
        const photo = allPhotos[i];
        try {
          const response = await fetch(`${window.location.origin}${photo.path}`);
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          
          const link = document.createElement('a');
          link.href = url;
          link.download = photo.filename;
          link.click();
          
          URL.revokeObjectURL(url);
          
          // Пауза между скачиваниями
          if (i < allPhotos.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        } catch (error) {
          console.error(`Ошибка скачивания ${photo.filename}:`, error);
        }
      }
      
      showSuccess(`Скачано ${allPhotos.length} фото`);
      TelegramAPI.vibrate('success');
    } catch (error) {
      console.error('Ошибка массового скачивания:', error);
      showError('Ошибка скачивания');
      TelegramAPI.vibrate('error');
    }
  };

  const handleAddOrder = async (orderData: { orderNumber: string; comment: string; photos: File[]; serviceId?: number }) => {
    try {
      console.log('📝 Создаем новый заказ:', orderData);
      
      // Получаем текущего пользователя
      const currentUser = TelegramAPI.getUser();
      const userName = currentUser ? 
        `${currentUser.first_name} ${currentUser.last_name || ''}`.trim() || currentUser.username || `User ${currentUser.id}` :
        'Тестовый пользователь';
      
      const telegramId = currentUser?.id || 999999999; // Тестовый ID
      
      const newOrderData = {
        orderNumber: orderData.orderNumber,
        created_by: userName,
        created_by_id: telegramId,
        comment: orderData.comment,
        photos: orderData.photos,
        photos_count: orderData.photos.length,
        serviceId: orderData.serviceId
      };
      
      console.log('📤 Отправляем данные заказа на сервер:', newOrderData);
      const result = await apiService.createOrder(newOrderData);
      console.log('✅ Заказ создан на сервере:', result);
      
      // Перезагружаем список
      console.log('🔄 Перезагружаем список заказов...');
      await loadOrders();
      
      // Показываем успех ТОЛЬКО после успешного создания
      showSuccess(t('zakaz_sozdan', `Заказ #${orderData.orderNumber} создан!`));
      TelegramAPI.vibrate('success');
    } catch (error) {
      console.error('❌ Ошибка создания заказа:', error);
      
      // Показываем ошибку ТОЛЬКО при ошибке
      showError('Ошибка создания заказа');
      TelegramAPI.vibrate('error');
      throw error;
    }
  };

  return (
    <div className="orders-container">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon"><i className="fas fa-images"></i></div>
          <div className="stat-info">
            <div className="stat-value">{filteredOrders.length}</div>
            <div className="stat-label">{t('zakazov', 'Заказов')}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><i className="fas fa-camera"></i></div>
          <div className="stat-info">
            <div className="stat-value">{filteredOrders.reduce((sum, order) => sum + order.photos_count, 0)}</div>
            <div className="stat-label">{t('foto', 'Фото')}</div>
          </div>
        </div>
      </div>
      
      <div className="card">
      <div className="card-title">
        {!showSearch ? (
          <>
            <div className="card-title-left">
              <i className="fas fa-images"></i>
              {t('galereya', 'Галерея')}
            </div>
            <div className="card-title-right">
              <button 
                className="btn btn-secondary btn-sm" 
                onClick={toggleMassOperations}
                title="Массовые операции"
              >
                <i className="fas fa-check-square"></i>
              </button>
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => loadOrders()}
                title="Обновить"
              >
                <i className="fas fa-sync-alt"></i>
              </button>
              <button 
                className={`btn btn-sm ${searchQuery ? 'btn-primary' : 'btn-secondary'}`}
                onClick={toggleSearch}
                title="Поиск"
              >
                <i className="fas fa-search"></i>
              </button>
            </div>
          </>
        ) : (
          <div className="search-container">
            <input 
              type="text" 
              className="search-input"
              placeholder={t('nomer_zakaza', 'Номер заказа') + '...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            <button className="btn btn-secondary btn-sm" onClick={toggleSearch}>
              <i className="fas fa-times"></i>
            </button>
          </div>
        )}
      </div>
      <div className="card-content">
        {/* Панель массовых операций */}
        {massOperationsMode && (
          <div className="mass-operations-panel" style={{ marginBottom: '16px' }}>
            <div className="mass-operations-header">
              <span>{t('vybrano', 'Выбрано')}: {selectedOrders.size}</span>
              <div className="mass-operations-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button 
                  className="btn btn-sm btn-danger" 
                  onClick={handleMassDelete}
                  disabled={selectedOrders.size === 0}
                  title="Удалить выбранные"
                >
                  <i className="fas fa-trash"></i>
                </button>
                <button 
                  className="btn btn-sm btn-info" 
                  onClick={handleMassDownload}
                  disabled={selectedOrders.size === 0}
                  title="Скачать фото выбранных"
                >
                  <i className="fas fa-download"></i>
                </button>
                <button className="btn btn-sm btn-secondary" onClick={selectAll} title="Выбрать всех">
                  <i className="fas fa-check-double"></i>
                </button>
                <button className="btn btn-sm btn-secondary" onClick={clearSelection} title="Очистить выбор">
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Список заказов */}
        <div className="users-list-container">
          <div className="users-list">
            {isLoading ? (
              <div className="loading-skeleton">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="skeleton-item">
                    <div className="skeleton-avatar"></div>
                    <div className="skeleton-content">
                      <div className="skeleton-line skeleton-title"></div>
                      <div className="skeleton-line skeleton-subtitle"></div>
                      <div className="skeleton-badges">
                        <div className="skeleton-badge"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : visibleOrders.length === 0 ? (
              <div className="empty-state">
                <i className="fas fa-images" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}></i>
                <div>{t('fotografii_ne_naydeny', 'Фотографии не найдены')}</div>
                <button 
                  className="btn btn-primary btn-sm"
                  onClick={() => loadOrders()}
                  style={{ marginTop: '16px' }}
                >
                  <i className="fas fa-sync-alt"></i> Обновить
                </button>
              </div>
            ) : (
              <>
                {visibleOrders.map(order => (
                  <div 
                    key={order.id}
                    className={`user-item ${massOperationsMode ? 'mass-mode' : ''}`}
                    onClick={() => massOperationsMode ? toggleOrderSelection(order.id) : viewOrderDetails(order.id)}
                  >
                    {massOperationsMode && (
                      <div className="user-checkbox">
                        <input 
                          type="checkbox" 
                          checked={selectedOrders.has(order.id)}
                          onChange={() => toggleOrderSelection(order.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    )}
                    <div className="user-avatar">
                      <div className="avatar-placeholder">
                        <i className="fas fa-camera"></i>
                      </div>
                    </div>
                    <div className="user-info">
                      <div className="user-name">{t('zakaz', 'Заказ')} #{order.orderNumber || order.id}</div>
                      <div className="user-details">
                        {order.created_by} • {formatDate(order.created_at)}
                      </div>
                      <div className="user-meta">
                        <span className="photos-badge">
                          <i className="fas fa-camera"></i> {order.photos_count}
                        </span>
                      </div>
                    </div>
                    <div className="user-actions">
                      <button 
                        className="btn btn-sm btn-secondary" 
                        onClick={(e) => {
                          e.stopPropagation();
                          TelegramAPI.vibrate('light');
                          onOrderEdit(order);
                        }}
                        title="Редактировать"
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                    </div>
                  </div>
                ))}
                {filteredOrders.length > visibleOrders.length && (
                  <div className="load-more" onClick={loadMore}>
                    <i className="fas fa-chevron-down"></i> {t('pokazat_esche', 'Показать ещё')} ({filteredOrders.length - visibleOrders.length})
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      
      </div>
      
      <AddOrderSheet
        isOpen={showAddSheet}
        onClose={() => setShowAddSheet(false)}
        onSubmit={handleAddOrder}
        userId={TelegramAPI.getUser()?.id || 999999999}
      />
    </div>
  )
};

export default OrdersList;