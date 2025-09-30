import { useEffect, useRef } from 'react';
import { backButtonManager } from '../utils/BackButtonManager';

interface UseBackButtonOptions {
  enabled?: boolean;
  priority?: number;
  id?: string;
}

export const useBackButton = (
  handler: () => void, 
  options: UseBackButtonOptions | boolean = true
) => {
  const handlerIdRef = useRef<string>('');
  
  // Поддержка старого API (boolean)
  const config = typeof options === 'boolean' 
    ? { enabled: options, priority: 0 } 
    : { enabled: true, priority: 0, ...options };
  
  useEffect(() => {
    if (!config.enabled) return;
    
    // Генерируем уникальный ID для обработчика
    const handlerId = config.id || `handler-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    handlerIdRef.current = handlerId;
    
    // Регистрируем обработчик
    backButtonManager.register(handlerId, handler, config.priority);
    
    return () => {
      // Удаляем обработчик при размонтировании
      backButtonManager.unregister(handlerId);
    };
  }, [handler, config.enabled, config.priority, config.id]);
  
  return {
    handlerId: handlerIdRef.current
  };
};