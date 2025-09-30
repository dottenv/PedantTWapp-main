import React, { useState, useEffect } from 'react';
import { TelegramAPI } from '../utils/telegram-api-core';
import { useBackButton } from '../hooks/useBackButton';
import { apiService } from '../services/api';
import { telegramLogger } from './TelegramLogger';
import { showSuccess, showError } from './ToastManager';

interface DebugPageProps {
  onBack: () => void;
}

interface ServerInfo {
  status: string;
  version: string;
  environment: string;
  timestamp: string;
  cors: {
    origin: string;
    userAgent: string;
  };
}

const DebugPage: React.FC<DebugPageProps> = ({ onBack }) => {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [systemInfo, setSystemInfo] = useState<any>({});
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [isServerOnline, setIsServerOnline] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dbStats, setDbStats] = useState<any>(null);

  useBackButton(onBack);

  useEffect(() => {
    loadDebugInfo();
    checkServerStatus();
  }, []);

  const loadDebugInfo = () => {
    const tgDebug = TelegramAPI.getDebugInfo();
    const user = TelegramAPI.getUser();
    
    setDebugInfo({
      telegram: tgDebug,
      user: user,
      timestamp: new Date().toISOString()
    });

    setSystemInfo({
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      screenWidth: screen.width,
      screenHeight: screen.height,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      memory: (navigator as any).deviceMemory || 'N/A',
      connection: (navigator as any).connection?.effectiveType || 'N/A'
    });
  };

  const checkServerStatus = async () => {
    setIsLoading(true);
    try {
      const connected = await apiService.checkServerConnection();
      setIsServerOnline(connected);
      
      if (connected) {
        const info = await apiService.healthCheck() as ServerInfo;
        setServerInfo(info);
        await loadDbStats();
        telegramLogger.success('Server connection verified', 'DebugPage');
      } else {
        setServerInfo(null);
        setDbStats(null);
        telegramLogger.error('Server connection failed', 'DebugPage');
      }
    } catch (error: any) {
      setIsServerOnline(false);
      setServerInfo(null);
      setDbStats(null);
      telegramLogger.error(`Server check error: ${error.message}`, 'DebugPage');
    } finally {
      setIsLoading(false);
    }
  };

  const loadDbStats = async () => {
    try {
      const [users, orders] = await Promise.all([
        apiService.get('/users'),
        apiService.get('/orders')
      ]);
      
      setDbStats({
        users: users.length,
        orders: orders.length,
        activeUsers: users.filter((u: any) => u.status === 'active').length,
        activeOrders: orders.filter((o: any) => o.status === 'active').length
      });
    } catch (error: any) {
      telegramLogger.warning(`Failed to load DB stats: ${error.message}`, 'DebugPage');
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      TelegramAPI.vibrate('success');
      showSuccess('Copied to clipboard');
      telegramLogger.info('Debug data copied to clipboard', 'DebugPage');
    } catch (error) {
      showError('Failed to copy');
      telegramLogger.error('Failed to copy to clipboard', 'DebugPage');
    }
  };

  const testVibration = (type: string) => {
    TelegramAPI.vibrate(type as any);
    telegramLogger.info(`Vibration test: ${type}`, 'DebugPage');
  };

  const clearLogs = () => {
    telegramLogger.clear();
    showSuccess('Debug logs cleared');
  };

  const testApiEndpoint = async (endpoint: string) => {
    setIsLoading(true);
    try {
      const result = await apiService.get(endpoint);
      telegramLogger.success(`API test ${endpoint}: ${JSON.stringify(result).substring(0, 100)}...`, 'DebugPage');
      showSuccess(`API ${endpoint} OK`);
    } catch (error: any) {
      telegramLogger.error(`API test ${endpoint} failed: ${error.message}`, 'DebugPage');
      showError(`API ${endpoint} failed`);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshData = () => {
    loadDebugInfo();
    checkServerStatus();
    telegramLogger.info('Debug data refreshed', 'DebugPage');
  };

  const exportDebugData = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      debugInfo,
      systemInfo,
      serverInfo,
      dbStats,
      logs: telegramLogger.getLogs()
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `debug-export-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    showSuccess('Debug data exported');
    telegramLogger.info('Debug data exported to file', 'DebugPage');
  };

  return (
    <div className="fade-in">
      {/* Server Status Card */}
      <div className="card">
        <div className="card-title">
          <div className="card-title-left">
            <i className="fas fa-server"></i>
            Server Status
          </div>
          <div className="card-title-right">
            <button 
              className="btn btn-sm btn-secondary" 
              onClick={checkServerStatus}
              disabled={isLoading}
            >
              {isLoading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-sync"></i>}
              Refresh
            </button>
          </div>
        </div>
        <div className="card-content">
          <div className="data-item">
            <div className="data-icon">
              <i className={`fas ${isServerOnline ? 'fa-check-circle' : 'fa-times-circle'}`} 
                 style={{ color: isServerOnline ? '#34c759' : '#ff3b30' }}></i>
            </div>
            <div className="data-info">
              <div className="data-title">Connection</div>
              <div className="data-subtitle">{isServerOnline ? 'Online' : 'Offline'}</div>
            </div>
          </div>
          
          {serverInfo && (
            <>
              <div className="data-item">
                <div className="data-icon">
                  <i className="fas fa-code-branch"></i>
                </div>
                <div className="data-info">
                  <div className="data-title">Version</div>
                  <div className="data-subtitle">{serverInfo.version}</div>
                </div>
              </div>
              
              <div className="data-item">
                <div className="data-icon">
                  <i className="fas fa-cog"></i>
                </div>
                <div className="data-info">
                  <div className="data-title">Environment</div>
                  <div className="data-subtitle">{serverInfo.environment}</div>
                </div>
              </div>
            </>
          )}
          
          {dbStats && (
            <div className="stats-grid" style={{ marginTop: '16px' }}>
              <div className="stat-card">
                <div className="stat-icon">
                  <i className="fas fa-users"></i>
                </div>
                <div className="stat-info">
                  <div className="stat-value">{dbStats.users}</div>
                  <div className="stat-label">Users</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">
                  <i className="fas fa-box"></i>
                </div>
                <div className="stat-info">
                  <div className="stat-value">{dbStats.orders}</div>
                  <div className="stat-label">Orders</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Telegram WebApp Info */}
      <div className="card">
        <div className="card-title">
          <i className="fas fa-telegram"></i>
          Telegram WebApp
        </div>
        <div className="card-content">
          <div className="data-item">
            <div className="data-icon">
              <i className="fas fa-check-circle" style={{ color: debugInfo.telegram?.available ? '#34c759' : '#ff3b30' }}></i>
            </div>
            <div className="data-info">
              <div className="data-title">Status</div>
              <div className="data-subtitle">{debugInfo.telegram?.available ? 'Available' : 'Unavailable'}</div>
            </div>
          </div>

          <div className="data-item">
            <div className="data-icon">
              <i className="fas fa-code-branch"></i>
            </div>
            <div className="data-info">
              <div className="data-title">Version</div>
              <div className="data-subtitle">{debugInfo.telegram?.version || 'N/A'}</div>
            </div>
          </div>

          <div className="data-item">
            <div className="data-icon">
              <i className="fas fa-mobile-alt"></i>
            </div>
            <div className="data-info">
              <div className="data-title">Platform</div>
              <div className="data-subtitle">{debugInfo.telegram?.platform || 'N/A'}</div>
            </div>
          </div>

          <div className="data-item">
            <div className="data-icon">
              <i className="fas fa-palette"></i>
            </div>
            <div className="data-info">
              <div className="data-title">Theme</div>
              <div className="data-subtitle">{debugInfo.telegram?.colorScheme || 'N/A'}</div>
            </div>
          </div>

          <div className="data-item">
            <div className="data-icon">
              <i className="fas fa-expand"></i>
            </div>
            <div className="data-info">
              <div className="data-title">Expanded</div>
              <div className="data-subtitle">{debugInfo.telegram?.isExpanded ? 'Yes' : 'No'}</div>
            </div>
          </div>

          <div className="data-item">
            <div className="data-icon">
              <i className="fas fa-arrows-alt-v"></i>
            </div>
            <div className="data-info">
              <div className="data-title">Viewport Height</div>
              <div className="data-subtitle">{debugInfo.telegram?.viewportHeight || 'N/A'}px</div>
            </div>
          </div>
        </div>
      </div>

      {/* User Info */}
      {debugInfo.user && (
        <div className="card">
          <div className="card-title">
            <i className="fas fa-user"></i>
            User
          </div>
          <div className="card-content">
            <div className="data-item">
              <div className="data-icon">
                <i className="fas fa-id-badge"></i>
              </div>
              <div className="data-info">
                <div className="data-title">ID</div>
                <div className="data-subtitle">{debugInfo.user.id}</div>
              </div>
            </div>

            <div className="data-item">
              <div className="data-icon">
                <i className="fas fa-user"></i>
              </div>
              <div className="data-info">
                <div className="data-title">Name</div>
                <div className="data-subtitle">{debugInfo.user.first_name} {debugInfo.user.last_name || ''}</div>
              </div>
            </div>

            <div className="data-item">
              <div className="data-icon">
                <i className="fas fa-at"></i>
              </div>
              <div className="data-info">
                <div className="data-title">Username</div>
                <div className="data-subtitle">{debugInfo.user.username || 'N/A'}</div>
              </div>
            </div>

            <div className="data-item">
              <div className="data-icon">
                <i className="fas fa-language"></i>
              </div>
              <div className="data-info">
                <div className="data-title">Language</div>
                <div className="data-subtitle">{debugInfo.user.language_code || 'N/A'}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* System Info */}
      <div className="card">
        <div className="card-title">
          <i className="fas fa-desktop"></i>
          System
        </div>
        <div className="card-content">
          <div className="data-item">
            <div className="data-icon">
              <i className="fas fa-mobile-alt"></i>
            </div>
            <div className="data-info">
              <div className="data-title">Platform</div>
              <div className="data-subtitle">{systemInfo.platform}</div>
            </div>
          </div>

          <div className="data-item">
            <div className="data-icon">
              <i className="fas fa-language"></i>
            </div>
            <div className="data-info">
              <div className="data-title">Language</div>
              <div className="data-subtitle">{systemInfo.language}</div>
            </div>
          </div>

          <div className="data-item">
            <div className="data-icon">
              <i className="fas fa-expand-arrows-alt"></i>
            </div>
            <div className="data-info">
              <div className="data-title">Screen Resolution</div>
              <div className="data-subtitle">{systemInfo.screenWidth}x{systemInfo.screenHeight}</div>
            </div>
          </div>

          <div className="data-item">
            <div className="data-icon">
              <i className="fas fa-window-maximize"></i>
            </div>
            <div className="data-info">
              <div className="data-title">Window Size</div>
              <div className="data-subtitle">{systemInfo.windowWidth}x{systemInfo.windowHeight}</div>
            </div>
          </div>

          <div className="data-item">
            <div className="data-icon">
              <i className="fas fa-wifi"></i>
            </div>
            <div className="data-info">
              <div className="data-title">Connection</div>
              <div className="data-subtitle">{systemInfo.onLine ? 'Online' : 'Offline'} ({systemInfo.connection})</div>
            </div>
          </div>

          <div className="data-item">
            <div className="data-icon">
              <i className="fas fa-memory"></i>
            </div>
            <div className="data-info">
              <div className="data-title">Device Memory</div>
              <div className="data-subtitle">{systemInfo.memory} GB</div>
            </div>
          </div>
        </div>
      </div>

      {/* Employee Management Diagnostics */}
      <div className="card">
        <div className="card-title">
          <i className="fas fa-users-cog"></i>
          Employee Management Diagnostics
        </div>
        <div className="card-content">
          <div className="action-buttons">
            <button 
              className="btn btn-info" 
              onClick={async () => {
                try {
                  const response = await fetch('/api/debug/all-data');
                  if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                  }
                  const data = await response.json();
                  telegramLogger.info(`DB Data: Users=${data.users?.length || 0}, Services=${data.services?.length || 0}, ServiceEmployees=${data.serviceEmployees?.length || 0}`, 'EmployeeDiag');
                  showSuccess(`DB: ${data.users?.length || 0} users, ${data.serviceEmployees?.length || 0} employees`);
                } catch (e: any) {
                  telegramLogger.error(`DB check failed: ${e.message}`, 'EmployeeDiag');
                  showError(`DB check failed: ${e.message}`);
                }
              }}
              disabled={isLoading}
            >
              <i className="fas fa-database"></i>
              Check DB Data
            </button>
            <button 
              className="btn btn-info" 
              onClick={async () => {
                try {
                  const serviceId = 1758985587809;
                  const data = await fetch(`/api/debug/service/${serviceId}`).then(r => r.json());
                  telegramLogger.info(`Service ${serviceId}: ${data.service?.name || 'not found'}, Employees: ${data.employeeCount}`, 'EmployeeDiag');
                  showSuccess(`Service: ${data.service?.name}, ${data.employeeCount} employees`);
                } catch (e: any) {
                  telegramLogger.error(`Service check failed: ${e.message}`, 'EmployeeDiag');
                }
              }}
              disabled={isLoading}
            >
              <i className="fas fa-building"></i>
              Check Service
            </button>
            <button 
              className="btn btn-info" 
              onClick={async () => {
                try {
                  const userId = 665852999;
                  const services = await apiService.getServicesByOwner(userId);
                  telegramLogger.info(`User ${userId} owns ${services.length} services: ${services.map((s: any) => s.name).join(', ')}`, 'EmployeeDiag');
                  
                  for (const service of services) {
                    const employees = await apiService.getEmployeesByService(service.id);
                    telegramLogger.info(`Service ${service.name} (${service.id}) has ${employees.length} employees`, 'EmployeeDiag');
                  }
                  showSuccess(`Checked ${services.length} services`);
                } catch (e: any) {
                  telegramLogger.error(`Employee API check failed: ${e.message}`, 'EmployeeDiag');
                }
              }}
              disabled={isLoading}
            >
              <i className="fas fa-user-friends"></i>
              Test Employee API
            </button>
          </div>
        </div>
      </div>

      {/* API Tests */}
      <div className="card">
        <div className="card-title">
          <i className="fas fa-flask"></i>
          API Tests
        </div>
        <div className="card-content">
          <div className="action-buttons">
            <button 
              className="btn btn-secondary" 
              onClick={() => testApiEndpoint('/health')}
              disabled={isLoading}
            >
              <i className="fas fa-heartbeat"></i>
              Health Check
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={() => testApiEndpoint('/users')}
              disabled={isLoading}
            >
              <i className="fas fa-users"></i>
              Users API
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={() => testApiEndpoint('/orders')}
              disabled={isLoading}
            >
              <i className="fas fa-box"></i>
              Orders API
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={() => testApiEndpoint('/services')}
              disabled={isLoading}
            >
              <i className="fas fa-building"></i>
              Services API
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={() => testApiEndpoint('/employees/service/1758985587809')}
              disabled={isLoading}
            >
              <i className="fas fa-user-friends"></i>
              Employees API
            </button>
          </div>
        </div>
      </div>

      {/* Telegram Tests */}
      <div className="card">
        <div className="card-title">
          <i className="fas fa-telegram"></i>
          Telegram Tests
        </div>
        <div className="card-content">
          <div className="action-buttons">
            <button className="btn btn-secondary" onClick={() => testVibration('light')}>
              <i className="fas fa-mobile-alt"></i>
              Light Vibration
            </button>
            <button className="btn btn-secondary" onClick={() => testVibration('success')}>
              <i className="fas fa-check"></i>
              Success Vibration
            </button>
            <button className="btn btn-secondary" onClick={() => testVibration('error')}>
              <i className="fas fa-times"></i>
              Error Vibration
            </button>
          </div>
        </div>
      </div>

      {/* Debug Actions */}
      <div className="card">
        <div className="card-title">
          <i className="fas fa-tools"></i>
          Debug Actions
        </div>
        <div className="card-content">
          <div className="action-buttons">
            <button className="btn btn-secondary" onClick={refreshData}>
              <i className="fas fa-sync"></i>
              Refresh All Data
            </button>
            <button className="btn btn-secondary" onClick={clearLogs}>
              <i className="fas fa-trash"></i>
              Clear Logs
            </button>
            <button className="btn btn-secondary" onClick={() => copyToClipboard(JSON.stringify({ debugInfo, systemInfo, serverInfo }, null, 2))}>
              <i className="fas fa-copy"></i>
              Copy Debug Data
            </button>
            <button className="btn btn-primary" onClick={exportDebugData}>
              <i className="fas fa-download"></i>
              Export Debug Data
            </button>
          </div>
        </div>
      </div>

      {/* Raw Data */}
      <div className="card">
        <div className="card-title">
          <i className="fas fa-code"></i>
          Raw Data
        </div>
        <div className="card-content">
          <pre style={{ 
            fontSize: '10px', 
            overflow: 'auto', 
            background: 'var(--tg-theme-secondary-bg-color)', 
            padding: '12px', 
            borderRadius: '8px',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all'
          }}>
            {JSON.stringify({ debugInfo, systemInfo, serverInfo, dbStats }, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default DebugPage;