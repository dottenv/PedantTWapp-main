import express from 'express';
import { uploadPhotos, handleUploadError } from '../middleware/upload.js';
import { requireRegistration } from '../middleware/registrationCheck.js';
import { requireServiceAccess, requireEmployeePermission } from '../middleware/roleCheck.js';

export function createOrdersRouter(ordersController) {
  const router = express.Router();

  // GET /api/orders - получить все заказы (только для зарегистрированных)
  router.get('/', requireRegistration, (req, res) => ordersController.getAllOrders(req, res));

  // GET /api/orders/:id - получить заказ по ID (с проверкой доступа)
  router.get('/:id', requireRegistration, requireEmployeePermission('view_orders'), (req, res) => ordersController.getOrderById(req, res));

  // POST /api/orders - создать новый заказ с фото (с правом создания)
  router.post('/', requireRegistration, uploadPhotos, handleUploadError, requireEmployeePermission('create_orders'), (req, res) => ordersController.createOrder(req, res));

  // PUT /api/orders/:id - обновить заказ (с правом редактирования)
  router.put('/:id', requireRegistration, uploadPhotos, handleUploadError, requireEmployeePermission('edit_orders'), (req, res) => ordersController.updateOrder(req, res));

  // DELETE /api/orders/:id - удалить заказ (только владельцы)
  router.delete('/:id', requireRegistration, requireEmployeePermission('delete_orders'), (req, res) => ordersController.deleteOrder(req, res));

  // GET /api/orders/next-number/:serviceNumber - получить следующий номер заказа (с доступом к сервису)
  router.get('/next-number/:serviceNumber', requireRegistration, requireServiceAccess, (req, res) => ordersController.getNextOrderNumber(req, res));

  return router;
}