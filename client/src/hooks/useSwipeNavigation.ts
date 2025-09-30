import { useEffect, useRef } from 'react';
import { swipeManager } from '../utils/SwipeManager';

interface UseSwipeNavigationOptions {
  enabled?: boolean;
  priority?: number;
  id?: string;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

export const useSwipeNavigation = (options: UseSwipeNavigationOptions = {}) => {
  const handlerIdRef = useRef<string>('');
  
  const {
    enabled = true,
    priority = 0,
    id,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown
  } = options;
  
  useEffect(() => {
    if (!enabled) return;
    
    // Генерируем уникальный ID
    const handlerId = id || `swipe-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    handlerIdRef.current = handlerId;
    
    // Регистрируем обработчики свайпов
    swipeManager.register(
      handlerId,
      {
        onSwipeLeft,
        onSwipeRight,
        onSwipeUp,
        onSwipeDown
      },
      priority
    );
    
    return () => {
      swipeManager.unregister(handlerId);
    };
  }, [enabled, priority, id, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown]);
  
  return {
    handlerId: handlerIdRef.current,
    setEnabled: (isEnabled: boolean) => {
      if (handlerIdRef.current) {
        swipeManager.setEnabled(handlerIdRef.current, isEnabled);
      }
    }
  };
};