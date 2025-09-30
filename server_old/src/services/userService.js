import { User } from '../models/User.js';
import { LoggerUtils } from '../utils/loggerUtils.js';

export class UserService {
  constructor(db) {
    this.db = db;
  }

  async addOwnedService(userId, serviceId) {
    await this.db.read();
    const index = this.db.data.users.findIndex(u => u.id === parseInt(userId));
    if (index >= 0) {
      const user = this.db.data.users[index];
      if (!user.ownedServices) user.ownedServices = [];
      if (!user.ownedServices.includes(serviceId)) {
        user.ownedServices.push(serviceId);
        await this.db.write();
      }
    }
  }

  async addEmployeeService(userId, serviceId) {
    try {
      LoggerUtils.logInfo(`[USER_SERVICE] Добавление сервиса ${serviceId} пользователю ${userId}`);
      await this.db.read();
      const index = this.db.data.users.findIndex(u => u.id === parseInt(userId));
      if (index >= 0) {
        const user = this.db.data.users[index];
        if (!user.employeeServices) user.employeeServices = [];
        if (!user.employeeServices.includes(parseInt(serviceId))) {
          user.employeeServices.push(parseInt(serviceId));
          await this.db.write();
          LoggerUtils.logSuccess(`[USER_SERVICE] Сервис ${serviceId} добавлен пользователю ${userId}`);
        } else {
          LoggerUtils.logInfo(`[USER_SERVICE] Сервис ${serviceId} уже есть у пользователя ${userId}`);
        }
      } else {
        LoggerUtils.logError(`[USER_SERVICE] Пользователь ${userId} не найден`);
        throw new Error(`Пользователь ${userId} не найден`);
      }
    } catch (error) {
      LoggerUtils.logError('[USER_SERVICE] Ошибка добавления сервиса пользователю', error);
      throw error;
    }
  }

  async removeEmployeeService(userId, serviceId) {
    await this.db.read();
    const index = this.db.data.users.findIndex(u => u.id === parseInt(userId));
    if (index >= 0) {
      const user = this.db.data.users[index];
      if (user.employeeServices) {
        user.employeeServices = user.employeeServices.filter(id => id !== serviceId);
        await this.db.write();
      }
    }
  }

  async setActiveService(userId, serviceId) {
    try {
      LoggerUtils.logInfo(`[USER_SERVICE] Установка активного сервиса ${serviceId} для пользователя ${userId}`);
      await this.db.read();
      const index = this.db.data.users.findIndex(u => u.id === parseInt(userId));
      if (index >= 0) {
        this.db.data.users[index].activeServiceId = parseInt(serviceId);
        await this.db.write();
        LoggerUtils.logSuccess(`[USER_SERVICE] Активный сервис ${serviceId} установлен для пользователя ${userId}`);
      } else {
        LoggerUtils.logError(`[USER_SERVICE] Пользователь ${userId} не найден`);
        throw new Error(`Пользователь ${userId} не найден`);
      }
    } catch (error) {
      LoggerUtils.logError('[USER_SERVICE] Ошибка установки активного сервиса', error);
      throw error;
    }
  }

  async getAllUsers() {
    LoggerUtils.logInfo('[USER_SERVICE] Получение всех пользователей');
    try {
      await this.db.read();
      const users = this.db.data.users.map(user => User.fromTelegramUser(user, user));
      LoggerUtils.logSuccess(`[USER_SERVICE] Получено пользователей: ${users.length}`);
      return users;
    } catch (error) {
      LoggerUtils.logError('[USER_SERVICE] Ошибка получения пользователей', error);
      throw error;
    }
  }

  async getUserById(id) {
    LoggerUtils.logInfo(`[USER_SERVICE] Поиск пользователя по ID: ${id}`);
    try {
      await this.db.read();
      const userData = this.db.data.users.find(u => u.id === parseInt(id));
      if (userData) {
        LoggerUtils.logSuccess(`[USER_SERVICE] Пользователь найден: ${id}`);
        return User.fromTelegramUser(userData, userData);
      } else {
        LoggerUtils.logInfo(`[USER_SERVICE] Пользователь не найден: ${id}`);
        return null;
      }
    } catch (error) {
      LoggerUtils.logError('[USER_SERVICE] Ошибка получения пользователя по ID', error);
      throw error;
    }
  }

  async createOrUpdateUser(telegramUserData) {
    LoggerUtils.logInfo('[USER_SERVICE] Создание/обновление пользователя', telegramUserData);
    try {
      await this.db.read();
      
      const existingIndex = this.db.data.users.findIndex(u => u.id === telegramUserData.id);
      
      if (existingIndex >= 0) {
        // Обновляем существующего
        const existing = this.db.data.users[existingIndex];
        LoggerUtils.logInfo(`[USER_SERVICE] Обновление существующего пользователя: ${telegramUserData.id}`);
        const updatedUser = User.fromTelegramUser(telegramUserData, {
          role: existing.role,
          status: existing.status,
          orders: existing.orders,
          createdAt: existing.createdAt,
          updatedAt: new Date().toISOString(),
          lastSeen: new Date().toISOString(),
          // Сохраняем поля регистрации
          registrationStatus: existing.registrationStatus,
          organizationName: existing.organizationName,
          ownedServices: existing.ownedServices,
          employeeServices: existing.employeeServices,
          activeServiceId: existing.activeServiceId
        });
        
        this.db.data.users[existingIndex] = updatedUser.toJSON();
        LoggerUtils.logSuccess(`[USER_SERVICE] Пользователь обновлен: ${updatedUser.id}`);
        LoggerUtils.logDebug('[USER_SERVICE] Обновленные данные', {
          registrationStatus: updatedUser.registrationStatus,
          ownedServices: updatedUser.ownedServices,
          activeServiceId: updatedUser.activeServiceId,
          lastSeen: updatedUser.lastSeen
        });
      } else {
        // Создаем нового
        const newUser = User.fromTelegramUser(telegramUserData);
        this.db.data.users.push(newUser.toJSON());
        LoggerUtils.logSuccess(`[USER_SERVICE] Новый пользователь создан: ${newUser.id}`);
      }
      
      await this.db.write();
      LoggerUtils.logSuccess('[USER_SERVICE] Данные сохранены в БД');
      
      const result = await this.getUserById(telegramUserData.id);
      LoggerUtils.logSuccess('[USER_SERVICE] Пользователь успешно создан/обновлен');
      return result;
    } catch (error) {
      LoggerUtils.logError('[USER_SERVICE] Ошибка создания/обновления пользователя', error);
      throw error;
    }
  }

  async updateUserRole(id, role) {
    await this.db.read();
    
    const index = this.db.data.users.findIndex(u => u.id === parseInt(id));
    if (index === -1) return null;

    this.db.data.users[index].role = role;
    this.db.data.users[index].updatedAt = new Date().toISOString();
    
    await this.db.write();
    return User.fromTelegramUser(this.db.data.users[index], this.db.data.users[index]);
  }

  async updateUser(id, updateData) {
    try {
      LoggerUtils.logInfo(`[USER_SERVICE] Обновление пользователя ${id}`, updateData);
      await this.db.read();
      
      const index = this.db.data.users.findIndex(u => u.id === parseInt(id));
      if (index === -1) {
        LoggerUtils.logError(`[USER_SERVICE] Пользователь ${id} не найден для обновления`);
        return null;
      }

      // Обновляем разрешенные поля
      const allowedFields = ['registrationStatus', 'organizationName', 'role', 'status', 'ownedServices', 'employeeServices', 'activeServiceId'];
      allowedFields.forEach(field => {
        if (updateData.hasOwnProperty(field)) {
          this.db.data.users[index][field] = updateData[field];
          LoggerUtils.logInfo(`[USER_SERVICE] Обновлено поле ${field}: ${JSON.stringify(updateData[field])}`);
        }
      });
      
      this.db.data.users[index].updatedAt = new Date().toISOString();
      
      await this.db.write();
      LoggerUtils.logSuccess(`[USER_SERVICE] Пользователь ${id} обновлен`);
      return User.fromTelegramUser(this.db.data.users[index], this.db.data.users[index]);
    } catch (error) {
      LoggerUtils.logError('[USER_SERVICE] Ошибка обновления пользователя', error);
      throw error;
    }
  }
}