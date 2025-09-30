import { telegramLogger } from '../components/TelegramLogger';

export const TelegramDebug = {
  logEnvironment() {
    telegramLogger.info('Telegram WebApp Environment Check', 'TelegramDebug');
    telegramLogger.debug(`window.Telegram: ${!!window.Telegram}`, 'TelegramDebug');
    telegramLogger.debug(`window.Telegram.WebApp: ${!!window.Telegram?.WebApp}`, 'TelegramDebug');
    telegramLogger.debug(`initData: ${window.Telegram?.WebApp?.initData ? 'present' : 'missing'}`, 'TelegramDebug');
    telegramLogger.debug(`platform: ${window.Telegram?.WebApp?.platform || 'unknown'}`, 'TelegramDebug');
    telegramLogger.debug(`version: ${window.Telegram?.WebApp?.version || 'unknown'}`, 'TelegramDebug');
    telegramLogger.debug(`API_BASE_URL: ${import.meta.env.VITE_API_BASE_URL}`, 'TelegramDebug');
    telegramLogger.debug(`User Agent: ${navigator.userAgent}`, 'TelegramDebug');
  },

  async testAPI() {
    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
    telegramLogger.info(`Testing API: ${API_BASE}`, 'TelegramDebug');
    
    try {
      const response = await fetch(`${API_BASE}/health`);
      telegramLogger.success(`API Response: ${response.status} ${response.statusText}`, 'TelegramDebug');
      const data = await response.json();
      telegramLogger.debug(`API Data: ${JSON.stringify(data)}`, 'TelegramDebug');
    } catch (error) {
      telegramLogger.error(`API Error: ${error}`, 'TelegramDebug');
    }
  }
};

if (window.Telegram?.WebApp) {
  TelegramDebug.logEnvironment();
  TelegramDebug.testAPI();
}