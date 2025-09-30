import { LoggerUtils } from '../utils/loggerUtils.js';

export class UsersController {
  constructor(userService) {
    this.userService = userService;
  }

  async getAllUsers(req, res) {
    LoggerUtils.logInfo('[USERS_API] Получение всех пользователей');
    
    try {
      const users = await this.userService.getAllUsers();
      LoggerUtils.logSuccess(`[USERS_API] Получено пользователей: ${users.length}`);
      res.json(users);
    } catch (error) {
      LoggerUtils.logError('[USERS_API] Ошибка получения пользователей', error);
      res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  async getUserById(req, res) {
    try {
      const { id } = req.params;
      const user = await this.userService.getUserById(id);
      
      if (!user) {
        return res.status(404).json({ error: 'Пользователь не найден' });
      }
      
      res.json(user);
    } catch (error) {
      console.error('Ошибка получения пользователя:', error);
      res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  async createOrUpdateUser(req, res) {
    const telegramUserData = req.body;
    LoggerUtils.logInfo(`[USERS_API] Создание/обновление пользователя: ${telegramUserData?.id}`);
    
    try {
      if (!telegramUserData.id) {
        LoggerUtils.logError('[USERS_API] Отсутствует обязательный ID пользователя');
        return res.status(400).json({ error: 'ID пользователя обязателен' });
      }
      
      const user = await this.userService.createOrUpdateUser(telegramUserData);
      
      LoggerUtils.logSuccess(`[USERS_API] Пользователь ${telegramUserData.id} успешно сохранен`);
      res.json({
        success: true,
        message: 'Пользователь сохранен',
        user: user
      });
    } catch (error) {
      LoggerUtils.logError('[USERS_API] Ошибка сохранения пользователя', error);
      res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  async updateUserRole(req, res) {
    try {
      const { id } = req.params;
      const { role } = req.body;
      
      if (!['admin', 'moderator', 'user'].includes(role)) {
        return res.status(400).json({ error: 'Неверная роль' });
      }
      
      const user = await this.userService.updateUserRole(id, role);
      
      if (!user) {
        return res.status(404).json({ error: 'Пользователь не найден' });
      }
      
      res.json({
        success: true,
        message: 'Роль обновлена',
        user: user
      });
    } catch (error) {
      console.error('Ошибка обновления роли:', error);
      res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      const user = await this.userService.updateUser(id, updateData);
      
      if (!user) {
        return res.status(404).json({ error: 'Пользователь не найден' });
      }
      
      res.json({
        success: true,
        message: 'Пользователь обновлен',
        user: user
      });
    } catch (error) {
      console.error('Ошибка обновления пользователя:', error);
      res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }
}