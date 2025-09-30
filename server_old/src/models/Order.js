export class Order {
  constructor(data = {}) {
    this.id = data.id || Date.now();
    this.serviceId = data.serviceId || null; // Привязка к сервису
    this.orderNumber = data.orderNumber || data.id?.toString() || '';
    this.localOrderNumber = data.localOrderNumber || null; // Локальный номер в сервисе
    this.created_at = data.created_at || new Date().toISOString();
    this.photos_count = data.photos_count || 0;
    this.created_by = data.created_by || '';
    this.created_by_id = data.created_by_id || null; // Telegram ID создателя
    this.comment = data.comment || '';
    this.photos = data.photos || [];
    this.status = data.status || 'active';
    this.updated_at = data.updated_at || new Date().toISOString();
  }

  static fromJSON(json) {
    return new Order(json);
  }

  toJSON() {
    return {
      id: this.id,
      serviceId: this.serviceId,
      orderNumber: this.orderNumber,
      localOrderNumber: this.localOrderNumber,
      created_at: this.created_at,
      photos_count: this.photos_count,
      created_by: this.created_by,
      created_by_id: this.created_by_id,
      comment: this.comment,
      photos: this.photos,
      status: this.status,
      updated_at: this.updated_at
    };
  }
}