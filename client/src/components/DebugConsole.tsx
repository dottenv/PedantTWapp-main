import React, { useState, useEffect } from 'react';

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}

const DebugConsole: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Перехватываем console.log
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    const addLog = (level: 'info' | 'warn' | 'error', ...args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      
      // Фильтруем только сообщения локализации
      if (message.includes('[LOCALIZATION]') || message.includes('[TRANSLATOR]')) {
        const timestamp = new Date().toLocaleTimeString();
        setLogs(prev => [...prev.slice(-19), { timestamp, level, message }]);
      }
    };

    console.log = (...args) => {
      originalLog(...args);
      addLog('info', ...args);
    };

    console.warn = (...args) => {
      originalWarn(...args);
      addLog('warn', ...args);
    };

    console.error = (...args) => {
      originalError(...args);
      addLog('error', ...args);
    };

    // Показываем консоль при первом логе
    if (logs.length > 0 && !isVisible) {
      setIsVisible(true);
    }

    return () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
    };
  }, [logs.length, isVisible]);

  if (!isVisible || logs.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      left: '10px',
      right: '10px',
      maxHeight: '200px',
      backgroundColor: 'rgba(0,0,0,0.9)',
      color: '#00ff00',
      fontSize: '11px',
      fontFamily: 'monospace',
      padding: '8px',
      borderRadius: '4px',
      overflowY: 'auto',
      zIndex: 9999,
      border: '1px solid #333'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '4px',
        borderBottom: '1px solid #333',
        paddingBottom: '4px'
      }}>
        <span style={{ color: '#fff', fontWeight: 'bold' }}>Debug Console</span>
        <button 
          onClick={() => setIsVisible(false)}
          style={{
            background: 'none',
            border: 'none',
            color: '#ff4444',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          ✕
        </button>
      </div>
      {logs.map((log, index) => (
        <div key={index} style={{
          color: log.level === 'error' ? '#ff4444' : 
                log.level === 'warn' ? '#ffaa00' : '#00ff00',
          marginBottom: '2px',
          wordBreak: 'break-word'
        }}>
          <span style={{ color: '#888' }}>[{log.timestamp}]</span> {log.message}
        </div>
      ))}
    </div>
  );
};

export default DebugConsole;