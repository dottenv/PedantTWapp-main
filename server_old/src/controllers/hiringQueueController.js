import { LoggerUtils } from '../utils/loggerUtils.js';

export class HiringQueueController {
  constructor(hiringQueueService) {
    this.hiringQueueService = hiringQueueService;
  }

  // Добавление кандидата в очередь
  async addToQueue(req, res) {
    const { userId } = req.body;
    LoggerUtils.logInfo(`[HIRING_API] Добавление кандидата в очередь: userId=${userId}`);
    
    try {
      if (!userId) {
        LoggerUtils.logError('[HIRING_API] Отсутствует обязательный параметр userId');
        return res.status(400).json({ error: 'userId обязателен' });
      }
      
      // Добавляем кандидата в общую очередь (без привязки к конкретному работодателю)
      const queueItem = await this.hiringQueueService.addCandidateToGeneralQueue(parseInt(userId));
      
      LoggerUtils.logSuccess(`[HIRING_API] Кандидат ${userId} успешно добавлен в очередь`);
      res.json({
        success: true,
        message: 'Добавлен в очередь найма',
        queueItem: queueItem
      });
    } catch (error) {
      LoggerUtils.logError('[HIRING_API] Ошибка добавления в очередь', error);
      res.status(400).json({ error: error.message });
    }
  }

  // Получение очереди для работодателя
  async getEmployerQueue(req, res) {
    const { employerId } = req.params;
    LoggerUtils.logInfo(`[HIRING_API] Получение очереди для работодателя: ${employerId}`);
    
    try {
      const queue = await this.hiringQueueService.getEmployerQueue(parseInt(employerId));
      LoggerUtils.logSuccess(`[HIRING_API] Очередь для работодателя ${employerId} получена: ${queue.length} кандидатов`);
      res.json(queue);
    } catch (error) {
      LoggerUtils.logError('[HIRING_API] Ошибка получения очереди', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Получение заявок кандидата
  async getCandidateApplications(req, res) {
    try {
      const { candidateId } = req.params;
      const applications = await this.hiringQueueService.getCandidateApplications(parseInt(candidateId));
      res.json(applications);
    } catch (error) {
      console.error('Ошибка получения заявок:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Одобрение кандидата
  async approveCandidate(req, res) {
    try {
      const { queueId } = req.params;
      const { employerId } = req.body;
      
      const result = await this.hiringQueueService.approveCandidate(parseInt(queueId), employerId);
      res.json(result);
    } catch (error) {
      console.error('Ошибка одобрения кандидата:', error);
      res.status(400).json({ error: error.message });
    }
  }

  // Отклонение кандидата
  async rejectCandidate(req, res) {
    try {
      const { queueId } = req.params;
      const { employerId } = req.body;
      
      const result = await this.hiringQueueService.rejectCandidate(parseInt(queueId), employerId);
      res.json(result);
    } catch (error) {
      console.error('Ошибка отклонения кандидата:', error);
      res.status(400).json({ error: error.message });
    }
  }

  // Статистика очереди
  async getQueueStats(req, res) {
    try {
      const { employerId } = req.params;
      const stats = await this.hiringQueueService.getQueueStats(parseInt(employerId));
      res.json(stats);
    } catch (error) {
      console.error('Ошибка получения статистики:', error);
      res.status(500).json({ error: error.message });
    }
  }
}