import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { API_CONFIG } from '../config/api';
import { telegramLogger } from './TelegramLogger';

interface ServerInfo {
  status?: string;
  version?: string;
  environment?: string;
  cors?: {
    origin?: string;
    userAgent?: string;
  };
}

const ServerStatus: React.FC = () => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const checkConnection = async () => {
    setIsChecking(true);
    try {
      telegramLogger.info('🔄 Проверяем подключение к серверу...');
      const connected = await apiService.checkServerConnection();
      setIsConnected(connected);
      setLastCheck(new Date());
      setError(null);
      
      if (connected) {
        try {
          const info = await apiService.healthCheck() as ServerInfo;
          setServerInfo(info);
          telegramLogger.success(`✅ Сервер доступен: ${info.version || 'unknown'}`);
        } catch (e) {
          telegramLogger.warning('⚠️ Сервер доступен, но не удалось получить информацию');
        }
      } else {
        setServerInfo(null);
      }
    } catch (error: any) {
      setIsConnected(false);
      setLastCheck(new Date());
      setError(error.message);
      setServerInfo(null);
      telegramLogger.error(`❌ Ошибка подключения: ${error.message}`);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  const getApiDisplayUrl = () => {
    const url = API_CONFIG.BASE_URL;
    if (url.includes('localhost')) return 'localhost:3001';
    if (url.includes('devtunnels.ms')) return 'DevTunnel';
    if (url.includes('ngrok.io')) return 'Ngrok';
    if (url.includes('loca.lt')) return 'LocalTunnel';
    return url.replace('http://', '').replace('https://', '').split('/')[0];
  };

  const getStatusText = () => {
    if (isChecking) return 'Проверка...';
    if (isConnected === null) return 'Инициализация...';
    if (isConnected) {
      return serverInfo?.environment ? `OK (${serverInfo.environment})` : 'API OK';
    }
    return error ? `Error: ${error.substring(0, 20)}...` : 'API Error';
  };

  const getBackgroundColor = () => {
    if (isChecking || isConnected === null) return '#FF9800';
    return isConnected ? '#4CAF50' : '#f44336';
  };

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      padding: '8px 12px',
      borderRadius: '20px',
      fontSize: '11px',
      fontWeight: 'bold',
      zIndex: 1000,
      backgroundColor: getBackgroundColor(),
      color: 'white',
      cursor: 'pointer',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '2px',
      minWidth: '80px',
      textAlign: 'center'
    }} onClick={checkConnection} title={`API: ${API_CONFIG.BASE_URL}\nПоследняя проверка: ${lastCheck?.toLocaleString() || 'никогда'}`}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {isChecking ? (
          <i className="fas fa-spinner fa-spin"></i>
        ) : (
          <i className={`fas ${isConnected ? 'fa-check-circle' : isConnected === false ? 'fa-exclamation-triangle' : 'fa-question-circle'}`}></i>
        )}
        <span>{getStatusText()}</span>
      </div>
      <div style={{ fontSize: '9px', opacity: 0.8 }}>
        📡 {getApiDisplayUrl()}
        {serverInfo?.version && ` v${serverInfo.version}`}
      </div>
    </div>
  );
};

export default ServerStatus;