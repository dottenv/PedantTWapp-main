export class ServiceEmployee {
  constructor(data = {}) {
    this.id = data.id || Date.now();
    this.serviceId = parseInt(data.serviceId) || null;
    this.userId = parseInt(data.userId) || null; // Telegram ID сотрудника
    this.role = this.validateRole(data.role) || 'employee';
    this.permissions = Array.isArray(data.permissions) ? data.permissions : ['create_orders', 'view_orders'];
    this.status = this.validateStatus(data.status) || 'active';
    this.invitedBy = data.invitedBy ? parseInt(data.invitedBy) : null; // Telegram ID пригласившего
    this.joinedAt = data.joinedAt || new Date().toISOString();
  }

  validateRole(role) {
    const validRoles = ['owner', 'manager', 'employee'];
    return validRoles.includes(role) ? role : 'employee';
  }

  validateStatus(status) {
    const validStatuses = ['active', 'inactive'];
    return validStatuses.includes(status) ? status : 'active';
  }

  static fromJSON(json) {
    return new ServiceEmployee(json);
  }

  toJSON() {
    return {
      id: parseInt(this.id),
      serviceId: parseInt(this.serviceId),
      userId: parseInt(this.userId),
      role: this.role,
      permissions: this.permissions,
      status: this.status,
      invitedBy: this.invitedBy ? parseInt(this.invitedBy) : null,
      joinedAt: this.joinedAt
    };
  }
}