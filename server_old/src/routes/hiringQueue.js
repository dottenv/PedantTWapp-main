import express from 'express';

export const createHiringQueueRouter = (hiringQueueController) => {
  const router = express.Router();

  // Добавление кандидата в очередь
  router.post('/', (req, res) => {
    hiringQueueController.addToQueue(req, res);
  });

  // Получение очереди для работодателя
  router.get('/employer/:employerId', (req, res) => {
    hiringQueueController.getEmployerQueue(req, res);
  });

  // Получение заявок кандидата
  router.get('/candidate/:candidateId', (req, res) => {
    hiringQueueController.getCandidateApplications(req, res);
  });

  // Одобрение кандидата
  router.post('/:queueId/approve', (req, res) => {
    hiringQueueController.approveCandidate(req, res);
  });

  // Отклонение кандидата
  router.post('/:queueId/reject', (req, res) => {
    hiringQueueController.rejectCandidate(req, res);
  });

  // Статистика очереди
  router.get('/stats/:employerId', (req, res) => {
    hiringQueueController.getQueueStats(req, res);
  });

  return router;
};