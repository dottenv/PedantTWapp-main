import { HiringQueue } from '../models/HiringQueue.js';
import { LoggerUtils } from '../utils/loggerUtils.js';

export class HiringQueueService {
  constructor(db, userService, sessionService) {
    this.db = db;
    this.userService = userService;
    this.sessionService = sessionService;
    this.startCleanupTimer();
  }

  // Добавление кандидата в очередь
  async addToQueue(candidateUserId, employerUserId, serviceId, role, qrData) {
    LoggerUtils.logInfo(`[HIRING_SERVICE] Добавление кандидата в очередь: candidateId=${candidateUserId}, employerId=${employerUserId}, serviceId=${serviceId}`);
    await this.db.read();

    try {
      // Проверяем, нет ли уже активной заявки от этого кандидата к этому работодателю
      const existingQueue = this.db.data.hiringQueue?.find(q => 
        q.candidateUserId === candidateUserId && 
        q.employerUserId === employerUserId &&
        q.status === 'pending' &&
        !new HiringQueue(q).isExpired()
      );

      if (existingQueue) {
        LoggerUtils.logError('[HIRING_SERVICE] Заявка от этого кандидата уже существует');
        throw new Error('Заявка от этого кандидата уже существует');
      }

      const queueItem = new HiringQueue({
        candidateUserId,
        employerUserId,
        serviceId,
        role,
        qrData,
        scannedAt: new Date().toISOString()
      });

      if (!this.db.data.hiringQueue) {
        this.db.data.hiringQueue = [];
        LoggerUtils.logInfo('[HIRING_SERVICE] Инициализирован массив hiringQueue');
      }

      this.db.data.hiringQueue.push(queueItem.toJSON());
      await this.db.write();
      LoggerUtils.logSuccess(`[HIRING_SERVICE] Кандидат ${candidateUserId} добавлен в очередь для работодателя ${employerUserId}`);

      // Отслеживаем активность
      if (this.sessionService && employerUserId) {
        await this.sessionService.trackHiringActivity(employerUserId, 'candidate_added', {
          candidateId: candidateUserId,
          serviceId,
          role
        });
        LoggerUtils.logInfo('[HIRING_SERVICE] Активность найма отслежена');
      }

      return queueItem;
    } catch (error) {
      LoggerUtils.logError('[HIRING_SERVICE] Ошибка добавления кандидата в очередь', error);
      throw error;
    }
  }

  // Добавление кандидата в общую очередь (без конкретного работодателя)
  async addCandidateToGeneralQueue(candidateUserId) {
    LoggerUtils.logInfo(`[HIRING_SERVICE] Добавление кандидата в общую очередь: candidateId=${candidateUserId}`);
    await this.db.read();

    try {
      // Проверяем, нет ли уже активной заявки от этого кандидата
      const existingQueue = this.db.data.hiringQueue?.find(q => 
        q.candidateUserId === candidateUserId && 
        q.status === 'waiting_for_hire' &&
        !new HiringQueue(q).isExpired()
      );

      if (existingQueue) {
        LoggerUtils.logError('[HIRING_SERVICE] Кандидат уже в очереди найма');
        throw new Error('Вы уже в очереди найма');
      }

      // Получаем данные пользователя
      const user = await this.userService.getUserById(candidateUserId);
      LoggerUtils.logInfo(`[HIRING_SERVICE] Данные пользователя получены: ${user ? 'найден' : 'не найден'}`);
      const qrData = user ? {
        firstName: user.first_name,
        lastName: user.last_name,
        username: user.username
      } : null;

      const queueItem = new HiringQueue({
        candidateUserId,
        employerUserId: null, // Общая очередь
        serviceId: null,
        role: 'employee',
        qrData,
        status: 'waiting_for_hire',
        scannedAt: new Date().toISOString()
      });

      if (!this.db.data.hiringQueue) {
        this.db.data.hiringQueue = [];
        LoggerUtils.logInfo('[HIRING_SERVICE] Инициализирован массив hiringQueue');
      }

      this.db.data.hiringQueue.push(queueItem.toJSON());
      LoggerUtils.logSuccess('[HIRING_SERVICE] Кандидат добавлен в общую очередь');
      
      // Обновляем статус пользователя
      if (this.userService) {
        await this.userService.updateUser(candidateUserId, {
          registrationStatus: 'waiting_for_hire'
        });
        LoggerUtils.logSuccess('[HIRING_SERVICE] Статус пользователя обновлен на waiting_for_hire');
      }
      
      await this.db.write();
      LoggerUtils.logSuccess('[HIRING_SERVICE] Данные сохранены в БД');

      return queueItem;
    } catch (error) {
      LoggerUtils.logError('[HIRING_SERVICE] Ошибка добавления кандидата в общую очередь', error);
      throw error;
    }
  }

  // Получение очереди для работодателя
  async getEmployerQueue(employerUserId) {
    await this.db.read();
    
    if (!this.db.data.hiringQueue) {
      return [];
    }

    // Возвращаем всех кандидатов в общей очереди (employerUserId = null) 
    // и конкретные заявки к этому работодателю
    const queue = this.db.data.hiringQueue
      .filter(q => q.employerUserId === employerUserId || 
                  (q.employerUserId === null && q.status === 'waiting_for_hire'))
      .map(q => new HiringQueue(q))
      .filter(q => !q.isExpired())
      .sort((a, b) => new Date(b.scannedAt) - new Date(a.scannedAt));

    console.log(`[HIRING] Found ${queue.length} candidates for employer ${employerUserId}`);
    return queue;
  }

  // Получение заявок кандидата
  async getCandidateApplications(candidateUserId) {
    await this.db.read();
    
    if (!this.db.data.hiringQueue) {
      return [];
    }

    const applications = this.db.data.hiringQueue
      .filter(q => q.candidateUserId === candidateUserId)
      .map(q => new HiringQueue(q))
      .sort((a, b) => new Date(b.scannedAt) - new Date(a.scannedAt));

    return applications;
  }

  // Одобрение кандидата
  async approveCandidate(queueId, employerUserId) {
    LoggerUtils.logInfo(`[HIRING_SERVICE] Одобрение кандидата: queueId=${queueId}, employerId=${employerUserId}`);
    await this.db.read();
    
    try {
      const queueIndex = this.db.data.hiringQueue?.findIndex(q => 
        q.id === queueId && (q.employerUserId === employerUserId || q.employerUserId === null)
      );

      if (queueIndex === -1) {
        LoggerUtils.logError('[HIRING_SERVICE] Заявка не найдена');
        throw new Error('Заявка не найдена');
      }

      const queueItem = new HiringQueue(this.db.data.hiringQueue[queueIndex]);
      
      if (queueItem.isExpired()) {
        LoggerUtils.logError('[HIRING_SERVICE] Заявка истекла');
        throw new Error('Заявка истекла');
      }

      if (queueItem.status !== 'pending' && queueItem.status !== 'waiting_for_hire') {
        LoggerUtils.logError(`[HIRING_SERVICE] Заявка уже обработана, статус: ${queueItem.status}`);
        throw new Error('Заявка уже обработана');
      }

      // Обновляем статус
      queueItem.updateStatus('approved');
      queueItem.employerUserId = employerUserId; // Привязываем к работодателю
      this.db.data.hiringQueue[queueIndex] = queueItem.toJSON();
      await this.db.write();
      LoggerUtils.logSuccess(`[HIRING_SERVICE] Кандидат ${queueItem.candidateUserId} одобрен работодателем ${employerUserId}`);

      // Отслеживаем активность
      if (this.sessionService) {
        await this.sessionService.trackHiringActivity(employerUserId, 'candidate_approved', {
          candidateId: queueItem.candidateUserId,
          queueId: queueId
        });
        LoggerUtils.logInfo('[HIRING_SERVICE] Активность одобрения отслежена');
      }

      return queueItem;
    } catch (error) {
      LoggerUtils.logError('[HIRING_SERVICE] Ошибка одобрения кандидата', error);
      throw error;
    }
  }

  // Отклонение кандидата
  async rejectCandidate(queueId, employerUserId) {
    await this.db.read();
    
    const queueIndex = this.db.data.hiringQueue?.findIndex(q => 
      q.id === queueId && (q.employerUserId === employerUserId || q.employerUserId === null)
    );

    if (queueIndex === -1) {
      throw new Error('Заявка не найдена');
    }

    const queueItem = new HiringQueue(this.db.data.hiringQueue[queueIndex]);
    
    if (queueItem.status !== 'pending' && queueItem.status !== 'waiting_for_hire') {
      throw new Error('Заявка уже обработана');
    }

    // Обновляем статус
    queueItem.updateStatus('rejected');
    queueItem.employerUserId = employerUserId; // Привязываем к работодателю
    this.db.data.hiringQueue[queueIndex] = queueItem.toJSON();
    await this.db.write();

    // Отслеживаем активность
    if (this.sessionService) {
      await this.sessionService.trackHiringActivity(employerUserId, 'candidate_rejected', {
        candidateId: queueItem.candidateUserId,
        queueId: queueId
      });
    }

    console.log(`[HIRING] Candidate ${queueItem.candidateUserId} rejected by ${employerUserId}`);
    return queueItem;
  }

  // Получение статистики очереди
  async getQueueStats(employerUserId) {
    const queue = await this.getEmployerQueue(employerUserId);
    
    return {
      total: queue.length,
      pending: queue.filter(q => q.status === 'pending').length,
      approved: queue.filter(q => q.status === 'approved').length,
      rejected: queue.filter(q => q.status === 'rejected').length
    };
  }

  // Автоматическая очистка истекших заявок
  startCleanupTimer() {
    setInterval(async () => {
      try {
        await this.cleanupExpiredQueue();
      } catch (error) {
        console.error('[HIRING] Queue cleanup error:', error);
      }
    }, 60 * 60 * 1000); // Каждый час
  }

  async cleanupExpiredQueue() {
    await this.db.read();
    
    if (!this.db.data.hiringQueue) {
      return;
    }

    const expiredCount = this.db.data.hiringQueue.filter(q => {
      const queueItem = new HiringQueue(q);
      return queueItem.isExpired() && q.status === 'pending';
    }).length;

    // Помечаем истекшие как expired
    this.db.data.hiringQueue = this.db.data.hiringQueue.map(q => {
      const queueItem = new HiringQueue(q);
      if (queueItem.isExpired() && q.status === 'pending') {
        queueItem.updateStatus('expired');
        return queueItem.toJSON();
      }
      return q;
    });

    if (expiredCount > 0) {
      await this.db.write();
      console.log(`[HIRING] Marked ${expiredCount} queue items as expired`);
    }
  }
}