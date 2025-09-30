import React, { useState, useEffect, useRef } from 'react';
import { TelegramAPI } from '../utils/telegram-api-core';

interface ToastItem {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration: number;
}

let toastId = 0;
let showToastFunction: ((message: string, type: 'success' | 'error' | 'info' | 'warning', duration?: number) => void) | null = null;

export const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', duration = 3000) => {
  if (showToastFunction) {
    showToastFunction(message, type, duration);
  }
};

export const showSuccess = (message: string) => showToast(message, 'success');
export const showError = (message: string) => showToast(message, 'error');
export const showWarning = (message: string) => showToast(message, 'warning');
export const showInfo = (message: string) => showToast(message, 'info');

interface ServerLogMessage {
  type: 'success' | 'error' | 'info' | 'warning' | 'debug' | 'connected';
  message: string;
  data?: any;
  timestamp: string;
}

const ToastManager: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);

  const addToast = (message: string, type: 'success' | 'error' | 'info' | 'warning', duration = 3000) => {
    const id = ++toastId;
    const newToast: ToastItem = { id, message, type, duration };
    
    setToasts(prev => [...prev, newToast]);
    
    // Вибрация в зависимости от типа
    switch (type) {
      case 'success':
        TelegramAPI.vibrate('success');
        break;
      case 'error':
        TelegramAPI.vibrate('error');
        break;
      case 'warning':
        TelegramAPI.vibrate('warning');
        break;
      default:
        TelegramAPI.vibrate('light');
    }
    
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, duration);
  };

  useEffect(() => {
    showToastFunction = addToast;

    // Подключаемся к серверным логам
    const getApiBaseUrl = () => {
      if (typeof window === 'undefined') return '';
      
      const hostname = window.location.hostname;
      const protocol = window.location.protocol;
      
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return `${protocol}//localhost:3001/api`;
      }
      
      return `${protocol}//${hostname}/api`;
    };

    const connectToLogStream = () => {
      const apiBaseUrl = getApiBaseUrl();
      const eventSource = new EventSource(`${apiBaseUrl}/logs/stream`);
      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        try {
          const logMessage: ServerLogMessage = JSON.parse(event.data);
          
          if (logMessage.type !== 'debug' && logMessage.type !== 'connected') {
            const duration = logMessage.type === 'error' ? 5000 : 3000;
            // Используем setTimeout чтобы избежать обновления состояния во время рендера
            setTimeout(() => {
              addToast(logMessage.message, logMessage.type, duration);
            }, 0);
          }
        } catch (error) {
          console.error('Ошибка парсинга лога:', error);
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        setTimeout(connectToLogStream, 5000);
      };
    };

    connectToLogStream();

    return () => {
      showToastFunction = null;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return 'fas fa-check-circle';
      case 'error': return 'fas fa-exclamation-circle';
      case 'warning': return 'fas fa-exclamation-triangle';
      default: return 'fas fa-info-circle';
    }
  };

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <div key={toast.id} className={`toast toast-${toast.type} toast-show`}>
          <div className="toast-content">
            <i className={getIcon(toast.type)}></i>
            <span>{toast.message}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ToastManager;