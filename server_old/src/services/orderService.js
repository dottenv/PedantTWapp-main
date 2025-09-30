import { Order } from '../models/Order.js';
import { TelegramUtils } from '../utils/telegramUtils.js';
import { ValidationUtils } from '../utils/validationUtils.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class OrderService {
  constructor(db, userService = null, serviceService = null, orderNumberService = null) {
    this.db = db;
    this.userService = userService;
    this.serviceService = serviceService;
    this.orderNumberService = orderNumberService;
  }
  
  // Получаем имя пользователя по Telegram ID
  async getUserNameById(telegramId) {
    if (!this.userService || !telegramId) {
      return null;
    }
    
    try {
      const user = await this.userService.getUserById(telegramId);
      return user ? user.name : null;
    } catch (error) {
      console.error('❌ Ошибка получения имени пользователя:', error);
      return null;
    }
  }

  async getAllOrders() {
    try {
      await this.db.read();
      console.log('📋 Получение всех заказов, количество:', this.db.data.orders.length);
      
      const orders = [];
      for (const orderData of this.db.data.orders) {
        const order = Order.fromJSON(orderData);
        
        // Если есть Telegram ID, получаем актуальное имя
        if (order.created_by_id) {
          const userName = await this.getUserNameById(order.created_by_id);
          if (userName) {
            order.created_by = userName;
          }
        }
        
        orders.push(order);
      }
      
      return orders;
    } catch (error) {
      console.error('❌ Ошибка получения заказов:', error);
      throw error;
    }
  }

  async getOrderById(id) {
    await this.db.read();
    const orderData = this.db.data.orders.find(o => o.id === parseInt(id));
    
    if (!orderData) return null;
    
    const order = Order.fromJSON(orderData);
    
    // Обновляем имя по Telegram ID
    if (order.created_by_id) {
      const userName = await this.getUserNameById(order.created_by_id);
      if (userName) {
        order.created_by = userName;
      }
    }
    
    return order;
  }

  async createOrder(orderData) {
    try {
      await this.db.read();
      
      console.log('📝 Создание заказа:', orderData);
      
      // Генерируем уникальный ID для БД
      const orderId = Date.now();
      
      // ОБЯЗАТЕЛЬНО используем orderNumber из формы
      const orderNumber = orderData.orderNumber;
      
      if (!orderNumber || !orderNumber.trim()) {
        throw new Error('Номер заказа обязателен');
      }
      
      // Валидация формата номера заказа
      if (!ValidationUtils.validateOrderNumber(orderNumber)) {
        throw new Error('Неверный формат номера заказа. Используйте: XXX-XXXXXX (например: 667-00001)');
      }
      
      // Проверяем уникальность номера заказа
      if (this.orderNumberService) {
        const isUnique = await this.orderNumberService.isOrderNumberUnique(orderNumber);
        if (!isUnique) {
          throw new Error(`Заказ с номером ${orderNumber} уже существует`);
        }
      } else {
        const existingOrder = this.db.data.orders.find(o => o.orderNumber === orderNumber);
        if (existingOrder) {
          throw new Error(`Заказ с номером ${orderNumber} уже существует`);
        }
      }
      
      // Извлекаем номер сервиса и локальный номер
      const serviceNumber = ValidationUtils.extractServiceNumber(orderNumber);
      const localOrderNumber = orderNumber.split('-')[1] ? parseInt(orderNumber.split('-')[1]) : null;
      
      // Получаем serviceId по номеру сервиса
      let serviceId = orderData.serviceId || null;
      if (!serviceId && this.serviceService && serviceNumber) {
        const service = await this.serviceService.getServiceByNumber(serviceNumber);
        serviceId = service ? service.id : null;
      }
      
      // Загружаем фото в Telegram если есть
      let processedPhotos = orderData.photos || [];
      if (processedPhotos.length > 0) {
        try {
          const uploadsPath = path.join(__dirname, '../../data/uploads');
          console.log('🚀 Загружаем фото в Telegram...');
          processedPhotos = await TelegramUtils.uploadOrderPhotos(processedPhotos, uploadsPath);
          console.log('✅ Фото загружены в Telegram');
        } catch (error) {
          console.warn('⚠️ Ошибка загрузки в Telegram, продолжаем без Telegram:', error.message);
        }
      }
      
      const order = new Order({
        ...orderData,
        id: orderId,
        serviceId: serviceId,
        orderNumber: orderNumber,
        localOrderNumber: localOrderNumber,
        photos: processedPhotos,
        photos_count: processedPhotos.length
      });

      this.db.data.orders.push(order.toJSON());
      await this.db.write();
      
      console.log('✨ Новый заказ создан:', order.id, '(номер:', orderNumber, ')');
      console.log('💾 Данные сохранены в БД');
      
      return order;
    } catch (error) {
      console.error('❌ Ошибка создания заказа:', error);
      throw error;
    }
  }

  async updateOrder(id, updateData) {
    await this.db.read();
    
    const index = this.db.data.orders.findIndex(o => o.id === parseInt(id));
    if (index === -1) return null;

    const existingOrder = this.db.data.orders[index];
    const updatedOrder = new Order({
      ...existingOrder,
      ...updateData,
      id: parseInt(id),
      updated_at: new Date().toISOString(),
      photos_count: updateData.photos ? updateData.photos.length : existingOrder.photos_count
    });

    this.db.data.orders[index] = updatedOrder.toJSON();
    await this.db.write();
    
    return updatedOrder;
  }

  async deleteOrder(id) {
    await this.db.read();
    
    const index = this.db.data.orders.findIndex(o => o.id === parseInt(id));
    if (index === -1) return false;

    this.db.data.orders.splice(index, 1);
    await this.db.write();
    
    return true;
  }

  async generateNextOrderNumber(serviceNumber) {
    try {
      await this.db.read();
      
      // Находим все заказы для данного сервиса
      const serviceOrders = this.db.data.orders.filter(order => {
        if (!order.orderNumber) return false;
        const orderServiceNumber = ValidationUtils.extractServiceNumber(order.orderNumber);
        return orderServiceNumber === serviceNumber;
      });
      
      // Находим максимальный номер
      let maxNumber = 0;
      for (const order of serviceOrders) {
        const parts = order.orderNumber.split('-');
        if (parts.length === 2) {
          const orderNum = parseInt(parts[1]);
          if (!isNaN(orderNum) && orderNum > maxNumber) {
            maxNumber = orderNum;
          }
        }
      }
      
      // Генерируем следующий номер
      const nextNumber = maxNumber + 1;
      const paddedNumber = nextNumber.toString().padStart(5, '0'); // 00001, 00002, etc.
      
      return `${serviceNumber}-${paddedNumber}`;
    } catch (error) {
      console.error('Ошибка генерации номера:', error);
      throw error;
    }
  }
}