/**
 * Утилиты для валидации данных
 */
export class ValidationUtils {
  /**
   * Проверяет наличие обязательных полей
   */
  static validateRequired(data, requiredFields) {
    const missing = requiredFields.filter(field => !data[field]);
    if (missing.length > 0) {
      throw new Error(`Отсутствуют обязательные поля: ${missing.join(', ')}`);
    }
  }

  /**
   * Валидирует данные пользователя Telegram
   */
  static validateTelegramUser(userData) {
    this.validateRequired(userData, ['id']);
    
    if (typeof userData.id !== 'number') {
      throw new Error('ID пользователя должен быть числом');
    }
  }

  /**
   * Валидирует данные заказа
   */
  static validateOrderData(orderData) {
    this.validateRequired(orderData, ['created_by']);
    
    if (orderData.comment && typeof orderData.comment !== 'string') {
      throw new Error('Комментарий должен быть строкой');
    }
  }

  /**
   * Валидирует ID
   */
  static validateId(id, fieldName = 'ID') {
    const numId = parseInt(id);
    if (isNaN(numId) || numId <= 0) {
      throw new Error(`${fieldName} должен быть положительным числом`);
    }
    return numId;
  }

  /**
   * Валидирует роль пользователя
   */
  static validateUserRole(role) {
    const validRoles = ['user', 'admin', 'moderator'];
    if (!validRoles.includes(role)) {
      throw new Error(`Недопустимая роль. Разрешены: ${validRoles.join(', ')}`);
    }
  }

  /**
   * Валидирует номер заказа (формат: XXX-XXXXXX)
   */
  static validateOrderNumber(orderNumber) {
    if (!orderNumber || typeof orderNumber !== 'string') {
      return false;
    }
    
    const orderNumberRegex = /^[0-9]{1,4}-[0-9]{3,6}$/;
    return orderNumberRegex.test(orderNumber.trim());
  }

  /**
   * Извлекает номер сервиса из номера заказа
   */
  static extractServiceNumber(orderNumber) {
    if (!this.validateOrderNumber(orderNumber)) {
      return null;
    }
    
    const match = orderNumber.trim().match(/^([0-9]{1,4})-([0-9]{3,6})$/);
    return match ? match[1] : null;
  }

  /**
   * Валидирует номер сервиса
   */
  static validateServiceNumber(serviceNumber) {
    if (!serviceNumber || typeof serviceNumber !== 'string') {
      return false;
    }
    
    const serviceNumberRegex = /^[0-9]{1,4}$/;
    return serviceNumberRegex.test(serviceNumber.trim());
  }
}