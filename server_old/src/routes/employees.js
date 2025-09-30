import express from 'express';
import { requireRegistration } from '../middleware/registrationCheck.js';
import { requireOwner, requireServiceAccess } from '../middleware/roleCheck.js';
import { LoggerUtils } from '../utils/loggerUtils.js';

export function createEmployeesRouter(employeesController) {
  const router = express.Router();

  // GET /api/employees/service/:serviceId - получить сотрудников сервиса
  router.get('/service/:serviceId', (req, res) => {
    LoggerUtils.logInfo(`[EMPLOYEES_ROUTE] GET /service/${req.params.serviceId}`);
    employeesController.getEmployeesByService(req, res);
  });

  // GET /api/employees/user/:userId - получить сервисы пользователя (только для зарегистрированных)
  router.get('/user/:userId', requireRegistration, (req, res) => employeesController.getEmployeesByUser(req, res));

  // POST /api/employees - добавить сотрудника (только владельцы)
  router.post('/', requireRegistration, requireOwner, (req, res) => employeesController.addEmployee(req, res));
  
  // POST /api/employees/hire - нанять сотрудника (без авторизации - для QR и очереди)
  router.post('/hire', (req, res) => {
    LoggerUtils.logInfo('[EMPLOYEES_ROUTE] POST /hire - начало найма сотрудника');
    employeesController.hireEmployee(req, res);
  });

  // PUT /api/employees/:id - обновить данные сотрудника (только владельцы)
  router.put('/:id', requireRegistration, requireOwner, (req, res) => employeesController.updateEmployee(req, res));

  // DELETE /api/employees/:id - удалить сотрудника (только владельцы)
  router.delete('/:id', requireRegistration, requireOwner, (req, res) => employeesController.removeEmployee(req, res));

  // GET /api/employees/permission/:userId/:serviceId/:permission - проверить разрешение (только для зарегистрированных)
  router.get('/permission/:userId/:serviceId/:permission', requireRegistration, (req, res) => employeesController.checkPermission(req, res));

  return router;
}