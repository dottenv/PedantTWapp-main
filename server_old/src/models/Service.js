export class Service {
  constructor(data = {}) {
    this.id = data.id || Date.now();
    this.serviceNumber = data.serviceNumber || '';
    this.name = data.name || '';
    this.address = data.address || '';
    this.status = this.validateStatus(data.status) || 'active';
    this.ownerId = data.ownerId || null; // Telegram ID владельца
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  validateStatus(status) {
    const validStatuses = ['active', 'inactive'];
    return validStatuses.includes(status) ? status : 'active';
  }

  static fromJSON(json) {
    return new Service(json);
  }

  toJSON() {
    return {
      id: this.id,
      serviceNumber: this.serviceNumber,
      name: this.name,
      address: this.address,
      status: this.status,
      ownerId: this.ownerId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}