import express from 'express';
import { requireRegistration } from '../middleware/registrationCheck.js';
import { requireOwner, requireServiceAccess } from '../middleware/roleCheck.js';

export function createServicesRouter(servicesController) {
  const router = express.Router();

  // GET /api/services - получить все сервисы (только для зарегистрированных)
  router.get('/', requireRegistration, (req, res) => servicesController.getAllServices(req, res));

  // GET /api/services/:id - получить сервис по ID (только с доступом к сервису)
  router.get('/:id', requireRegistration, requireServiceAccess, (req, res) => servicesController.getServiceById(req, res));

  // GET /api/services/owner/:ownerId - получить сервисы владельца (только для зарегистрированных)
  router.get('/owner/:ownerId', requireRegistration, (req, res) => servicesController.getServicesByOwner(req, res));

  // POST /api/services - создать новый сервис (только для зарегистрированных)
  router.post('/', requireRegistration, (req, res) => servicesController.createService(req, res));

  // PUT /api/services/:id - обновить сервис (только владелец)
  router.put('/:id', requireRegistration, requireServiceAccess, (req, res) => servicesController.updateService(req, res));

  // DELETE /api/services/:id - удалить сервис (только владелец)
  router.delete('/:id', requireRegistration, requireOwner, (req, res) => servicesController.deleteService(req, res));

  return router;
}