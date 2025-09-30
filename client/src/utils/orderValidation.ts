/**
 * Утилиты для валидации номеров заказов
 */

export interface OrderNumberValidation {
  isValid: boolean;
  error?: string;
  serviceNumber?: string;
  orderNumber?: string;
}

export class OrderValidationUtils {
  // Регулярное выражение для валидации номера заказа: XXX-XXXXXX
  private static readonly ORDER_NUMBER_REGEX = /^([0-9]{1,4})-([0-9]{3,6})$/;

  /**
   * Валидирует номер заказа
   * @param orderNumber - номер заказа для валидации
   * @returns результат валидации
   */
  static validateOrderNumber(orderNumber: string): OrderNumberValidation {
    if (!orderNumber || !orderNumber.trim()) {
      return {
        isValid: false,
        error: 'Номер заказа обязателен'
      };
    }

    const trimmed = orderNumber.trim();
    const match = trimmed.match(this.ORDER_NUMBER_REGEX);

    if (!match) {
      return {
        isValid: false,
        error: 'Неверный формат. Используйте: XXX-XXXXXX (например: 667-00001)'
      };
    }

    const [, serviceNumber, localOrderNumber] = match;

    return {
      isValid: true,
      serviceNumber,
      orderNumber: localOrderNumber
    };
  }

  /**
   * Форматирует номер заказа (убирает лишние пробелы, приводит к верхнему регистру)
   * @param orderNumber - номер для форматирования
   * @returns отформатированный номер
   */
  static formatOrderNumber(orderNumber: string): string {
    return orderNumber.trim().toUpperCase();
  }

  /**
   * Генерирует следующий номер заказа для сервиса
   * @param serviceNumber - номер сервиса
   * @param lastOrderNumber - последний номер заказа в сервисе
   * @returns следующий номер заказа
   */
  static generateNextOrderNumber(serviceNumber: string, lastOrderNumber?: number): string {
    const nextNumber = (lastOrderNumber || 0) + 1;
    const paddedNumber = nextNumber.toString().padStart(3, '0');
    return `${serviceNumber}-${paddedNumber}`;
  }

  /**
   * Извлекает номер сервиса из номера заказа
   * @param orderNumber - полный номер заказа
   * @returns номер сервиса или null
   */
  static extractServiceNumber(orderNumber: string): string | null {
    const validation = this.validateOrderNumber(orderNumber);
    return validation.isValid ? validation.serviceNumber! : null;
  }

  /**
   * Проверяет, принадлежит ли заказ указанному сервису
   * @param orderNumber - номер заказа
   * @param serviceNumber - номер сервиса
   * @returns true если заказ принадлежит сервису
   */
  static belongsToService(orderNumber: string, serviceNumber: string): boolean {
    const extractedServiceNumber = this.extractServiceNumber(orderNumber);
    return extractedServiceNumber === serviceNumber;
  }
}