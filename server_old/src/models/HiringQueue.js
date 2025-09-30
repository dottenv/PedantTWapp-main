export class HiringQueue {
  constructor(data = {}) {
    this.id = data.id || Date.now();
    this.candidateUserId = data.candidateUserId || null; // ID кандидата
    this.employerUserId = data.employerUserId || null; // ID работодателя
    this.serviceId = data.serviceId || null; // ID сервиса
    this.role = this.validateRole(data.role) || 'employee';
    this.status = this.validateStatus(data.status) || 'pending';
    this.qrData = data.qrData || null; // Данные из QR-кода
    this.scannedAt = data.scannedAt || new Date().toISOString();
    this.processedAt = data.processedAt || null;
    this.expiresAt = data.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 часа
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  validateRole(role) {
    const validRoles = ['employee', 'manager'];
    return validRoles.includes(role) ? role : 'employee';
  }

  validateStatus(status) {
    const validStatuses = ['pending', 'approved', 'rejected', 'expired'];
    return validStatuses.includes(status) ? status : 'pending';
  }

  // Проверка истечения срока
  isExpired() {
    return new Date() > new Date(this.expiresAt);
  }

  // Обновление статуса
  updateStatus(newStatus, processedAt = null) {
    this.status = this.validateStatus(newStatus);
    this.processedAt = processedAt || new Date().toISOString();
    this.updatedAt = new Date().toISOString();
  }

  toJSON() {
    return {
      id: this.id,
      candidateUserId: this.candidateUserId,
      employerUserId: this.employerUserId,
      serviceId: this.serviceId,
      role: this.role,
      status: this.status,
      qrData: this.qrData,
      scannedAt: this.scannedAt,
      processedAt: this.processedAt,
      expiresAt: this.expiresAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      isExpired: this.isExpired()
    };
  }
}