import express from 'express';
import { LoggerUtils } from '../utils/loggerUtils.js';

export function createUsersRouter(usersController) {
  const router = express.Router();

  // GET /api/users - получить всех пользователей
  router.get('/', (req, res) => {
    LoggerUtils.logInfo('[USERS_ROUTE] GET / - получение всех пользователей');
    usersController.getAllUsers(req, res);
  });

  // GET /api/users/:id - получить пользователя по ID
  router.get('/:id', (req, res) => usersController.getUserById(req, res));

  // POST /api/users - создать/обновить пользователя из Telegram
  router.post('/', (req, res) => {
    LoggerUtils.logInfo('[USERS_ROUTE] POST / - создание/обновление пользователя');
    usersController.createOrUpdateUser(req, res);
  });

  // PUT /api/users/:id/role - обновить роль пользователя
  router.put('/:id/role', (req, res) => usersController.updateUserRole(req, res));

  // PUT /api/users/:id - обновить пользователя
  router.put('/:id', (req, res) => usersController.updateUser(req, res));

  return router;
}