import { LoggerUtils } from '../utils/loggerUtils.js';

export class SessionService {
  constructor(db) {
    this.db = db;
    this.SESSION_TIMEOUT = 30 * 60 * 1000; // 30 минут
    this.startCleanupTimer();
  }

  // Создание новой сессии (удаляет старые сессии пользователя)
  async createSession(userId, userAgent, ip) {
    LoggerUtils.logInfo(`[SESSION_SERVICE] Создание новой сессии для пользователя: ${userId}`);
    await this.db.read();
    
    // Удаляем все старые сессии пользователя (1 сессия = 1 пользователь)
    const oldSessionsCount = this.db.data.sessions.filter(s => s.userId === userId).length;
    this.db.data.sessions = this.db.data.sessions.filter(s => s.userId !== userId);
    if (oldSessionsCount > 0) {
      LoggerUtils.logInfo(`[SESSION_SERVICE] Удалено старых сессий: ${oldSessionsCount}`);
    }
    
    const sessionId = `session_${userId}_${Date.now()}`;
    const session = {
      id: sessionId,
      userId: userId,
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      userAgent: userAgent || 'unknown',
      ip: ip || 'unknown',
      isActive: true
    };
    
    this.db.data.sessions.push(session);
    await this.db.write();
    
    LoggerUtils.logSuccess(`[SESSION_SERVICE] Сессия создана: ${sessionId} для пользователя ${userId}`);
    return session;
  }

  // Проверка активности сессии
  async isSessionValid(sessionId) {
    await this.db.read();
    const session = this.db.data.sessions.find(s => s.id === sessionId);
    
    if (!session || !session.isActive) {
      return false;
    }
    
    const lastActivity = new Date(session.lastActivity);
    const now = new Date();
    const timeDiff = now - lastActivity;
    
    if (timeDiff > this.SESSION_TIMEOUT) {
      await this.destroySession(sessionId);
      return false;
    }
    
    return true;
  }

  // Обновление активности сессии
  async updateActivity(sessionId) {
    await this.db.read();
    const sessionIndex = this.db.data.sessions.findIndex(s => s.id === sessionId);
    
    if (sessionIndex !== -1) {
      this.db.data.sessions[sessionIndex].lastActivity = new Date().toISOString();
      await this.db.write();
      return true;
    }
    
    return false;
  }

  // Уничтожение сессии
  async destroySession(sessionId) {
    await this.db.read();
    const sessionIndex = this.db.data.sessions.findIndex(s => s.id === sessionId);
    
    if (sessionIndex !== -1) {
      const session = this.db.data.sessions[sessionIndex];
      this.db.data.sessions.splice(sessionIndex, 1);
      await this.db.write();
      console.log(`[SESSION] Session destroyed: ${sessionId} for user ${session.userId}`);
      return true;
    }
    
    return false;
  }

  // Уничтожение всех сессий пользователя
  async destroyUserSessions(userId) {
    await this.db.read();
    const userSessions = this.db.data.sessions.filter(s => s.userId === userId);
    this.db.data.sessions = this.db.data.sessions.filter(s => s.userId !== userId);
    await this.db.write();
    
    console.log(`[SESSION] Destroyed ${userSessions.length} sessions for user ${userId}`);
    return userSessions.length;
  }

  // Получение сессии пользователя
  async getUserSession(userId) {
    await this.db.read();
    return this.db.data.sessions.find(s => s.userId === userId && s.isActive);
  }

  // Получение сессии по ID
  async getSession(sessionId) {
    await this.db.read();
    return this.db.data.sessions.find(s => s.id === sessionId);
  }

  // Обновление активности сессии (алиас для updateActivity)
  async updateSessionActivity(sessionId) {
    return await this.updateActivity(sessionId);
  }

  // Автоматическая очистка истекших сессий
  startCleanupTimer() {
    setInterval(async () => {
      try {
        await this.cleanupExpiredSessions();
      } catch (error) {
        console.error('[SESSION] Session cleanup error:', error);
      }
    }, 5 * 60 * 1000); // Каждые 5 минут
  }

  async cleanupExpiredSessions() {
    await this.db.read();
    const now = new Date();
    const expiredSessions = [];
    
    this.db.data.sessions = this.db.data.sessions.filter(session => {
      const lastActivity = new Date(session.lastActivity);
      const timeDiff = now - lastActivity;
      
      if (timeDiff > this.SESSION_TIMEOUT) {
        expiredSessions.push(session);
        return false;
      }
      return true;
    });
    
    if (expiredSessions.length > 0) {
      await this.db.write();
      console.log(`[SESSION] Cleaned up ${expiredSessions.length} expired sessions`);
    }
  }

  // Получение статистики сессий
  async getSessionStats() {
    await this.db.read();
    const now = new Date();
    const activeSessions = this.db.data.sessions.filter(session => {
      const lastActivity = new Date(session.lastActivity);
      const timeDiff = now - lastActivity;
      return timeDiff <= this.SESSION_TIMEOUT && session.isActive;
    });
    
    return {
      total: this.db.data.sessions.length,
      active: activeSessions.length,
      expired: this.db.data.sessions.length - activeSessions.length
    };
  }

  // Отслеживание активности найма сотрудников
  async trackHiringActivity(userId, action, data = {}) {
    LoggerUtils.logInfo(`[SESSION_SERVICE] Отслеживание активности найма: userId=${userId}, action=${action}`);
    await this.db.read();
    const sessionIndex = this.db.data.sessions.findIndex(s => s.userId === userId && s.isActive);
    
    if (sessionIndex !== -1) {
      if (!this.db.data.sessions[sessionIndex].hiringActivity) {
        this.db.data.sessions[sessionIndex].hiringActivity = [];
      }
      
      this.db.data.sessions[sessionIndex].hiringActivity.push({
        action,
        data,
        timestamp: new Date().toISOString()
      });
      
      await this.db.write();
      LoggerUtils.logSuccess(`[SESSION_SERVICE] Активность найма отслежена: ${action}`);
      return true;
    }
    
    LoggerUtils.logError(`[SESSION_SERVICE] Активная сессия не найдена для пользователя: ${userId}`);
    return false;
  }
}