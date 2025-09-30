import { clientLogger } from './clientLogger.js';

export class LoggerUtils {
  static logRequest(req, res, next) {
    const timestamp = new Date().toISOString();
    const userAgent = req.headers['user-agent'] || 'unknown';
    const isTelegramRequest = userAgent.includes('TelegramBot') || req.headers['x-telegram-user'];
    
    console.log(`[${timestamp}] ${req.method} ${req.path}`);
    console.log(`  Origin: ${req.headers.origin || 'no-origin'}`);
    console.log(`  User-Agent: ${userAgent.substring(0, 50)}`);
    console.log(`  Telegram: ${isTelegramRequest ? 'YES' : 'NO'}`);
    
    next();
  }

  static logHealthCheck(req) {
    const healthData = {
      status: 'ok', 
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      cors: {
        origin: req.headers.origin || null,
        userAgent: req.headers['user-agent']?.substring(0, 50) || null
      }
    };
    
    console.log('[HEALTH] Health check:', JSON.stringify(healthData));
    return healthData;
  }

  static logUserInit(telegramUser) {
    console.log('[USER] User initialization:', JSON.stringify(telegramUser));
  }

  static logUserInitSuccess(userId) {
    console.log(`[USER] User successfully initialized: ${userId}`);
  }

  static logError(message, error) {
    const logMessage = `[ERROR] ${message}: ${error?.message || error}`;
    console.error(logMessage, error);
    clientLogger.logError(message, error);
  }

  static logSuccess(message, data = null) {
    const logMessage = data ? `[SUCCESS] ${message}: ${JSON.stringify(data)}` : `[SUCCESS] ${message}`;
    console.log(logMessage);
    clientLogger.logSuccess(message, data);
  }

  static logInfo(message, data = null) {
    const logMessage = data ? `[INFO] ${message}: ${JSON.stringify(data)}` : `[INFO] ${message}`;
    console.log(logMessage);
    clientLogger.logInfo(message, data);
  }

  static logDebug(message, data = null) {
    const logMessage = data ? `[DEBUG] ${message}: ${JSON.stringify(data)}` : `[DEBUG] ${message}`;
    console.log(logMessage);
    clientLogger.logDebug(message, data);
  }

  static logWarning(message, data = null) {
    const logMessage = data ? `[WARNING] ${message}: ${JSON.stringify(data)}` : `[WARNING] ${message}`;
    console.warn(logMessage);
    clientLogger.logWarning(message, data);
  }
}