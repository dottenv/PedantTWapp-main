import React, { useState, useEffect } from 'react';

interface NavigationIndicatorProps {
  currentPage: string;
  navigationHistory: string[];
  showBreadcrumb?: boolean;
}

const NavigationIndicator: React.FC<NavigationIndicatorProps> = ({ 
  currentPage, 
  navigationHistory, 
  showBreadcrumb = false 
}) => {
  const [showLeftIndicator, setShowLeftIndicator] = useState(false);
  const [showRightIndicator, setShowRightIndicator] = useState(false);
  const [showBreadcrumbVisible, setShowBreadcrumbVisible] = useState(false);

  const getPageTitle = (page: string): string => {
    const titles: Record<string, string> = {
      'orders': 'Галерея',
      'order-details': 'Детали',
      'edit-order': 'Редактирование',
      'settings': 'Настройки',
      'profile-settings': 'Профиль',
      'security-settings': 'Безопасность',
      'storage-settings': 'Хранилище',
      'debug-page': 'Отладка',

      'language-selector': 'Язык'
    };
    return titles[page] || page;
  };

  const showSwipeIndicator = (direction: 'left' | 'right') => {
    if (direction === 'left') {
      setShowLeftIndicator(true);
      setTimeout(() => setShowLeftIndicator(false), 300);
    } else {
      setShowRightIndicator(true);
      setTimeout(() => setShowRightIndicator(false), 300);
    }
  };

  const showBreadcrumbTemporary = () => {
    setShowBreadcrumbVisible(true);
    setTimeout(() => setShowBreadcrumbVisible(false), 2000);
  };

  useEffect(() => {
    // Показываем breadcrumb при изменении страницы
    if (showBreadcrumb && navigationHistory.length > 1) {
      showBreadcrumbTemporary();
    }
  }, [currentPage, showBreadcrumb]);

  // Добавляем глобальные обработчики для индикаторов свайпов
  useEffect(() => {
    const handleSwipeIndicator = (event: CustomEvent) => {
      showSwipeIndicator(event.detail.direction);
    };

    window.addEventListener('swipe-indicator' as any, handleSwipeIndicator);
    
    return () => {
      window.removeEventListener('swipe-indicator' as any, handleSwipeIndicator);
    };
  }, []);

  const breadcrumbPath = navigationHistory
    .slice(-3) // Показываем только последние 3 страницы
    .map(getPageTitle)
    .join(' → ');

  return (
    <>
      {/* Индикаторы свайпов */}
      <div className={`swipe-indicator left ${showLeftIndicator ? 'active' : ''}`}>
        <i className="fas fa-chevron-left"></i>
      </div>
      
      <div className={`swipe-indicator right ${showRightIndicator ? 'active' : ''}`}>
        <i className="fas fa-chevron-right"></i>
      </div>

      {/* Breadcrumb навигации */}
      {showBreadcrumb && (
        <div className={`navigation-breadcrumb ${showBreadcrumbVisible ? 'visible' : ''}`}>
          {breadcrumbPath}
        </div>
      )}
    </>
  );
};

export default NavigationIndicator;