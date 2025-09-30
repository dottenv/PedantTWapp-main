import { ValidationUtils } from '../utils/validationUtils.js';

export class OrderNumberService {
  constructor(db) {
    this.db = db;
  }

  /**
   * Генерирует следующий номер заказа для сервиса
   */
  async generateNextOrderNumber(serviceNumber) {
    await this.db.read();
    
    if (!ValidationUtils.validateServiceNumber(serviceNumber)) {
      throw new Error('Неверный номер сервиса');
    }

    // Находим все заказы этого сервиса
    const serviceOrders = this.db.data.orders?.filter(order => {
      const orderServiceNumber = ValidationUtils.extractServiceNumber(order.orderNumber);
      return orderServiceNumber === serviceNumber;
    }) || [];

    // Извлекаем локальные номера и находим максимальный
    let maxLocalNumber = 0;
    serviceOrders.forEach(order => {
      const match = order.orderNumber.match(/^[0-9]{1,4}-([0-9]{3,6})$/);
      if (match) {
        const localNumber = parseInt(match[1]);
        if (localNumber > maxLocalNumber) {
          maxLocalNumber = localNumber;
        }
      }
    });

    // Генерируем следующий номер
    const nextLocalNumber = maxLocalNumber + 1;
    const paddedNumber = nextLocalNumber.toString().padStart(3, '0');
    
    return `${serviceNumber}-${paddedNumber}`;
  }

  /**
   * Проверяет уникальность номера заказа
   */
  async isOrderNumberUnique(orderNumber) {
    await this.db.read();
    
    const existingOrder = this.db.data.orders?.find(order => order.orderNumber === orderNumber);
    return !existingOrder;
  }

  /**
   * Проверяет, принадлежит ли номер заказа указанному сервису
   */
  validateOrderBelongsToService(orderNumber, serviceNumber) {
    const extractedServiceNumber = ValidationUtils.extractServiceNumber(orderNumber);
    return extractedServiceNumber === serviceNumber;
  }

  /**
   * Получает статистику номеров заказов для сервиса
   */
  async getServiceOrderStats(serviceNumber) {
    await this.db.read();
    
    const serviceOrders = this.db.data.orders?.filter(order => {
      const orderServiceNumber = ValidationUtils.extractServiceNumber(order.orderNumber);
      return orderServiceNumber === serviceNumber;
    }) || [];

    let minLocalNumber = Infinity;
    let maxLocalNumber = 0;
    
    serviceOrders.forEach(order => {
      const match = order.orderNumber.match(/^[0-9]{1,4}-([0-9]{3,6})$/);
      if (match) {
        const localNumber = parseInt(match[1]);
        if (localNumber < minLocalNumber) {
          minLocalNumber = localNumber;
        }
        if (localNumber > maxLocalNumber) {
          maxLocalNumber = localNumber;
        }
      }
    });

    return {
      totalOrders: serviceOrders.length,
      minOrderNumber: minLocalNumber === Infinity ? null : minLocalNumber,
      maxOrderNumber: maxLocalNumber === 0 ? null : maxLocalNumber,
      nextOrderNumber: await this.generateNextOrderNumber(serviceNumber)
    };
  }
}