import { Service } from '../models/Service.js';
import { ValidationUtils } from '../utils/validationUtils.js';
import { LoggerUtils } from '../utils/loggerUtils.js';

export class ServiceService {
  constructor(db, userService = null) {
    this.db = db;
    this.userService = userService;
  }

  async getAllServices() {
    await this.db.read();
    return this.db.data.services?.map(service => Service.fromJSON(service)) || [];
  }

  async getServiceById(id) {
    await this.db.read();
    const serviceData = this.db.data.services?.find(s => s.id === parseInt(id));
    return serviceData ? Service.fromJSON(serviceData) : null;
  }

  async getServicesByOwner(ownerId) {
    await this.db.read();
    const services = this.db.data.services?.filter(s => s.ownerId === parseInt(ownerId)) || [];
    return services.map(service => Service.fromJSON(service));
  }

  async getServiceByNumber(serviceNumber) {
    await this.db.read();
    const serviceData = this.db.data.services?.find(s => s.serviceNumber === serviceNumber);
    return serviceData ? Service.fromJSON(serviceData) : null;
  }

  async createService(serviceData) {
    LoggerUtils.logInfo('[SERVICE_SERVICE] Создание нового сервиса', serviceData);
    await this.db.read();
    
    try {
      // Валидация обязательных полей
      ValidationUtils.validateRequired(serviceData, ['serviceNumber', 'name', 'ownerId']);
      LoggerUtils.logSuccess('[SERVICE_SERVICE] Валидация данных сервиса пройдена');
      
      // Проверка уникальности номера сервиса
      const existingService = await this.getServiceByNumber(serviceData.serviceNumber);
      if (existingService) {
        LoggerUtils.logError(`[SERVICE_SERVICE] Сервис с номером ${serviceData.serviceNumber} уже существует`);
        throw new Error(`Сервис с номером ${serviceData.serviceNumber} уже существует`);
      }
      LoggerUtils.logSuccess('[SERVICE_SERVICE] Номер сервиса уникален');

      // Инициализация массивов если не существуют
      if (!this.db.data.services) {
        this.db.data.services = [];
        LoggerUtils.logInfo('[SERVICE_SERVICE] Инициализирован массив services');
      }

      const serviceId = Date.now();
      const service = new Service({
        ...serviceData,
        id: serviceId
      });

      this.db.data.services.push(service.toJSON());
      LoggerUtils.logSuccess(`[SERVICE_SERVICE] Сервис добавлен в БД с ID: ${serviceId}`);
      
      // Сначала сохраняем сервис
      await this.db.write();
      LoggerUtils.logSuccess('[SERVICE_SERVICE] Данные сервиса сохранены в БД');
      
      // Затем обновляем пользователя - добавляем сервис в ownedServices
      if (this.userService) {
        await this.userService.addOwnedService(serviceData.ownerId, service.id);
        LoggerUtils.logSuccess(`[SERVICE_SERVICE] Сервис ${service.id} добавлен владельцу ${serviceData.ownerId}`);
      }
      
      LoggerUtils.logSuccess(`[SERVICE_SERVICE] Сервис успешно создан: ${service.name} (ID: ${service.id})`);
      return service;
    } catch (error) {
      LoggerUtils.logError('[SERVICE_SERVICE] Ошибка создания сервиса', error);
      throw error;
    }
  }

  async updateService(id, updateData) {
    await this.db.read();
    
    if (!this.db.data.services) {
      return null;
    }

    const index = this.db.data.services.findIndex(s => s.id === parseInt(id));
    if (index === -1) return null;

    const existingService = this.db.data.services[index];
    const updatedService = new Service({
      ...existingService,
      ...updateData,
      id: parseInt(id),
      updatedAt: new Date().toISOString()
    });

    this.db.data.services[index] = updatedService.toJSON();
    await this.db.write();
    
    return updatedService;
  }

  async deleteService(id) {
    await this.db.read();
    
    if (!this.db.data.services) {
      return false;
    }

    const index = this.db.data.services.findIndex(s => s.id === parseInt(id));
    if (index === -1) return false;

    this.db.data.services.splice(index, 1);
    await this.db.write();
    
    return true;
  }
}