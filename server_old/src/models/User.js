export class User {
  constructor(data = {}) {
    // Базовая валидация данных
    if (data.id && typeof data.id !== 'number') {
      throw new Error('User ID must be a number');
    }
    
    // Telegram WebApp данные (только безопасные поля)
    this.id = data.id || 0;
    this.first_name = this.sanitizeString(data.first_name) || '';
    this.last_name = this.sanitizeString(data.last_name) || '';
    this.username = this.sanitizeString(data.username) || '';
    this.language_code = this.validateLanguageCode(data.language_code) || 'ru';
    this.is_premium = Boolean(data.is_premium);
    this.photo_url = this.sanitizeUrl(data.photo_url) || '';
    
    // Дополнительные поля (с валидацией)
    this.role = this.validateRole(data.role) || 'user';
    this.status = this.validateStatus(data.status) || 'active';
    this.registrationStatus = this.validateRegistrationStatus(data.registrationStatus) || 'unregistered';
    this.organizationName = this.sanitizeString(data.organizationName) || '';
    this.orders = Math.max(0, parseInt(data.orders) || 0);
    this.lastSeen = this.validateDate(data.lastSeen) || new Date().toISOString();
    this.createdAt = this.validateDate(data.createdAt) || new Date().toISOString();
    this.updatedAt = this.validateDate(data.updatedAt) || new Date().toISOString();
    
    // Мультисервисность
    this.ownedServices = Array.isArray(data.ownedServices) ? data.ownedServices : []; // ID сервисов, которыми владеет
    this.employeeServices = Array.isArray(data.employeeServices) ? data.employeeServices : []; // ID сервисов, где работает
    this.activeServiceId = data.activeServiceId || null; // Текущий активный сервис
  }
  
  // Методы валидации и санитарии
  sanitizeString(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[<>"'&]/g, '').trim().substring(0, 255);
  }
  
  sanitizeUrl(url) {
    if (typeof url !== 'string') return '';
    try {
      new URL(url);
      return url.substring(0, 500);
    } catch {
      return '';
    }
  }
  
  validateLanguageCode(code) {
    const validCodes = ['ru', 'en', 'uk', 'kz'];
    return validCodes.includes(code) ? code : 'ru';
  }
  
  validateRole(role) {
    const validRoles = ['admin', 'moderator', 'user'];
    return validRoles.includes(role) ? role : 'user';
  }
  
  validateStatus(status) {
    const validStatuses = ['active', 'blocked'];
    return validStatuses.includes(status) ? status : 'active';
  }

  validateRegistrationStatus(registrationStatus) {
    const validStatuses = ['unregistered', 'registered', 'employee', 'waiting_for_hire'];
    return validStatuses.includes(registrationStatus) ? registrationStatus : 'unregistered';
  }
  
  validateDate(dateStr) {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? null : date.toISOString();
    } catch {
      return null;
    }
  }

  get name() {
    return `${this.first_name} ${this.last_name}`.trim() || this.username || `User ${this.id}`;
  }

  static fromTelegramUser(telegramUser, additionalData = {}) {
    // Безопасное слияние данных
    const allowedTelegramFields = [
      'id', 'first_name', 'last_name', 'username', 
      'language_code', 'is_premium', 'photo_url'
    ];
    
    const allowedAdditionalFields = [
      'role', 'status', 'registrationStatus', 'organizationName', 'orders', 'lastSeen', 'createdAt', 'updatedAt',
      'ownedServices', 'employeeServices', 'activeServiceId'
    ];
    
    const safeData = {};
    
    // Копируем только разрешенные поля
    allowedTelegramFields.forEach(field => {
      if (telegramUser && telegramUser.hasOwnProperty(field)) {
        safeData[field] = telegramUser[field];
      }
    });
    
    allowedAdditionalFields.forEach(field => {
      if (additionalData && additionalData.hasOwnProperty(field)) {
        safeData[field] = additionalData[field];
      }
    });
    
    return new User(safeData);
  }

  toJSON() {
    return {
      id: this.id,
      first_name: this.first_name,
      last_name: this.last_name,
      username: this.username,
      language_code: this.language_code,
      is_premium: this.is_premium,
      photo_url: this.photo_url,
      role: this.role,
      status: this.status,
      orders: this.orders,
      lastSeen: this.lastSeen,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      name: this.name,
      registrationStatus: this.registrationStatus,
      organizationName: this.organizationName,
      ownedServices: this.ownedServices,
      employeeServices: this.employeeServices,
      activeServiceId: this.activeServiceId
    };
  }
}