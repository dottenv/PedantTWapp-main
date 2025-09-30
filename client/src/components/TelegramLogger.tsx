import React, { useState, useEffect } from 'react';

interface LogEntry {
  id: number;
  timestamp: string;
  level: 'info' | 'error' | 'success' | 'warning' | 'debug';
  message: string;
  source?: string;
  group?: string;
  expanded?: boolean;
}

interface LogGroup {
  level: 'info' | 'error' | 'success' | 'warning' | 'debug';
  logs: LogEntry[];
  expanded: boolean;
}

class TelegramLogger {
  private static instance: TelegramLogger;
  private logs: LogEntry[] = [];
  private listeners: ((logs: LogEntry[]) => void)[] = [];
  private logId = 0;

  static getInstance(): TelegramLogger {
    if (!TelegramLogger.instance) {
      TelegramLogger.instance = new TelegramLogger();
      TelegramLogger.instance.interceptConsole();
    }
    return TelegramLogger.instance;
  }

  private interceptConsole() {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalInfo = console.info;

    console.log = (...args) => {
      originalLog(...args);
      this.log('debug', this.formatMessage(args), 'console');
    };

    console.error = (...args) => {
      originalError(...args);
      this.log('error', this.formatMessage(args), 'console');
    };

    console.warn = (...args) => {
      originalWarn(...args);
      this.log('warning', this.formatMessage(args), 'console');
    };

    console.info = (...args) => {
      originalInfo(...args);
      this.log('info', this.formatMessage(args), 'console');
    };
  }

  private formatMessage(args: any[]): string {
    return args.map(arg => {
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg, null, 2);
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    }).join(' ').replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '');
  }

  log(level: 'info' | 'error' | 'success' | 'warning' | 'debug', message: string, source?: string, group?: string) {
    const entry: LogEntry = {
      id: ++this.logId,
      timestamp: new Date().toLocaleTimeString('ru-RU'),
      level,
      message: this.formatMessage([message]),
      source,
      group
    };
    
    this.logs.unshift(entry);
    if (this.logs.length > 200) {
      this.logs = this.logs.slice(0, 200);
    }
    
    this.notifyListeners();
  }

  info(message: string, source?: string, group?: string) { this.log('info', message, source, group); }
  error(message: string, source?: string, group?: string) { this.log('error', message, source, group); }
  success(message: string, source?: string, group?: string) { this.log('success', message, source, group); }
  warning(message: string, source?: string, group?: string) { this.log('warning', message, source, group); }
  debug(message: string, source?: string, group?: string) { this.log('debug', message, source, group); }
  
  // Группировка логов
  startGroup(title: string, level: 'info' | 'error' | 'success' | 'warning' | 'debug' = 'info') {
    this.log(level, `=== ${title} ===`, 'GROUP_START', title);
  }
  
  endGroup(title: string) {
    this.log('info', `=== END ${title} ===`, 'GROUP_END', title);
  }
  
  getGroupedLogs(): LogGroup[] {
    const groups: { [key: string]: LogGroup } = {
      error: { level: 'error', logs: [], expanded: false },
      warning: { level: 'warning', logs: [], expanded: false },
      success: { level: 'success', logs: [], expanded: false },
      info: { level: 'info', logs: [], expanded: false },
      debug: { level: 'debug', logs: [], expanded: false }
    };
    
    this.logs.forEach(log => {
      groups[log.level].logs.push(log);
    });
    
    return Object.values(groups).filter(group => group.logs.length > 0);
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  subscribe(listener: (logs: LogEntry[]) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener([...this.logs]));
  }

  clear() {
    this.logs = [];
    this.notifyListeners();
  }
}

const copyLogToClipboard = async (log: LogEntry) => {
  const logText = `[${log.timestamp}] ${log.level.toUpperCase()}${log.source ? ` (${log.source})` : ''}: ${log.message}`;
  try {
    await navigator.clipboard.writeText(logText);
    // Показываем краткое уведомление без импорта toast
    console.log('Log copied to clipboard');
  } catch (error) {
    console.error('Failed to copy log:', error);
  }
};

export const telegramLogger = TelegramLogger.getInstance();

const TelegramLoggerComponent: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [groupedLogs, setGroupedLogs] = useState<LogGroup[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    const unsubscribe = telegramLogger.subscribe((newLogs) => {
      setLogs(newLogs);
      setGroupedLogs(telegramLogger.getGroupedLogs());
    });
    return unsubscribe;
  }, []);
  
  const toggleGroup = (level: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(level)) {
      newExpanded.delete(level);
    } else {
      newExpanded.add(level);
    }
    setExpandedGroups(newExpanded);
  };
  
  const copyAllLogsToClipboard = async () => {
    const allLogsText = logs.map(log => 
      `[${log.timestamp}] ${log.level.toUpperCase()}${log.source ? ` (${log.source})` : ''}${log.group ? ` [${log.group}]` : ''}: ${log.message}`
    ).join('\n');
    
    try {
      await navigator.clipboard.writeText(allLogsText);
      telegramLogger.success('All logs copied to clipboard', 'Logger');
    } catch (error) {
      telegramLogger.error('Failed to copy logs', 'Logger');
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'var(--tg-theme-destructive-text-color, #ff3b30)';
      case 'success': return 'var(--tg-theme-accent-text-color, #007aff)';
      case 'warning': return 'var(--tg-theme-secondary-bg-color, #ff9500)';
      case 'debug': return 'var(--tg-theme-hint-color, #8e8e93)';
      default: return 'var(--tg-theme-text-color, #000000)';
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error': return 'ERR';
      case 'success': return 'OK';
      case 'warning': return 'WARN';
      case 'debug': return 'DBG';
      default: return 'INFO';
    }
  };

  if (!isVisible) {
    return (
      <div 
        className="debug-toggle-btn"
        onClick={() => setIsVisible(true)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 9999,
          width: '48px',
          height: '48px',
          backgroundColor: 'var(--tg-theme-button-color, #007aff)',
          color: 'var(--tg-theme-button-text-color, #ffffff)',
          borderRadius: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(0, 122, 255, 0.3)',
          border: 'none',
          fontSize: '16px',
          transition: 'all 0.2s ease'
        }}
      >
        <i className="fas fa-bug"></i>
        {logs.length > 0 && (
          <div style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            backgroundColor: 'var(--tg-theme-destructive-text-color, #ff3b30)',
            color: 'white',
            borderRadius: '10px',
            minWidth: '20px',
            height: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px',
            fontWeight: '600'
          }}>
            {logs.length > 99 ? '99+' : logs.length}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="debug-console" style={{
      position: 'fixed',
      bottom: '0',
      left: '0',
      right: '0',
      height: '70vh',
      backgroundColor: 'var(--tg-theme-bg-color, #ffffff)',
      color: 'var(--tg-theme-text-color, #000000)',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'SF Pro Text, -apple-system, BlinkMacSystemFont, Roboto, sans-serif',
      borderRadius: '16px 16px 0 0',
      boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
      border: '1px solid var(--tg-theme-separator-color, #c6c6c8)',
      borderBottom: 'none'
    }}>
      <div className="card-title" style={{
        padding: '16px 20px',
        backgroundColor: 'var(--tg-theme-bg-color, #ffffff)',
        borderBottom: '1px solid var(--tg-theme-separator-color, #c6c6c8)',
        borderRadius: '16px 16px 0 0'
      }}>
        <div className="card-title-left">
          <i className="fas fa-bug"></i>
          Debug Console
        </div>
        <div className="card-title-right">
          <span style={{ 
            fontSize: '12px', 
            color: 'var(--tg-theme-hint-color, #8e8e93)',
            marginRight: '12px'
          }}>{logs.length} logs</span>

          <button 
            className="btn btn-secondary btn-sm"
            onClick={copyAllLogsToClipboard}
            title="Copy all logs"
          >
            <i className="fas fa-copy"></i>
          </button>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => telegramLogger.clear()}
            title="Clear logs"
          >
            <i className="fas fa-trash"></i>
          </button>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => setIsVisible(false)}
            title="Close"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
      </div>
      
      <div className="card-content" style={{
        flex: 1,
        overflow: 'auto',
        padding: '0'
      }}>
        {groupedLogs.map(group => (
          <div key={group.level} className="card" style={{ marginBottom: '12px' }}>
            <div 
              className="card-title"
              onClick={() => toggleGroup(group.level)}
              style={{ cursor: 'pointer' }}
            >
              <div className="card-title-left">
                <i className={`fas fa-chevron-${expandedGroups.has(group.level) ? 'down' : 'right'}`} style={{ marginRight: '8px' }}></i>
                <div className="avatar-placeholder" style={{
                  background: getLevelColor(group.level),
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: '600',
                  width: '24px',
                  height: '24px',
                  marginRight: '8px'
                }}>
                  {getLevelIcon(group.level)}
                </div>
                {group.level.toUpperCase()} ({group.logs.length})
              </div>
              <div className="card-title-right">
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    const groupLogsText = group.logs.map(log => 
                      `[${log.timestamp}] ${log.level.toUpperCase()}${log.source ? ` (${log.source})` : ''}: ${log.message}`
                    ).join('\n');
                    navigator.clipboard.writeText(groupLogsText);
                    telegramLogger.success(`Copied ${group.logs.length} ${group.level} logs`, 'Logger');
                  }}
                  title="Copy group logs"
                >
                  <i className="fas fa-copy"></i>
                </button>
              </div>
            </div>
            {expandedGroups.has(group.level) && (
              <div className="card-content">
                <div className="users-list-container">
                  <div className="users-list">
                    {group.logs.map(log => (
                      <div 
                        key={log.id}
                        className="user-item"
                        onClick={() => copyLogToClipboard(log)}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="user-avatar">
                          <div className="avatar-placeholder" style={{
                            background: getLevelColor(log.level),
                            color: 'white',
                            fontSize: '10px',
                            fontWeight: '600',
                            width: '32px',
                            height: '32px'
                          }}>
                            {log.timestamp.split(':')[2]?.split('.')[0] || 'T'}
                          </div>
                        </div>
                        <div className="user-info">
                          <div className="user-name">
                            {log.source || 'System'}
                            <span style={{
                              fontSize: '11px',
                              color: 'var(--tg-theme-hint-color, #8e8e93)',
                              marginLeft: '8px'
                            }}>{log.timestamp}</span>
                          </div>
                          <div className="user-details" style={{
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            fontSize: '13px'
                          }}>
                            {log.message}
                          </div>
                        </div>
                        <div className="user-actions">
                          <button 
                            className="btn btn-sm btn-secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyLogToClipboard(log);
                            }}
                            title="Copy log"
                          >
                            <i className="fas fa-copy"></i>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
        {logs.length === 0 && (
          <div className="card">
            <div className="card-content">
              <div className="empty-state">
                <i className="fas fa-bug" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}></i>
                <div>No debug messages</div>
                <div style={{ fontSize: '13px', marginTop: '8px', opacity: 0.7 }}>Debug information will appear here</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TelegramLoggerComponent;