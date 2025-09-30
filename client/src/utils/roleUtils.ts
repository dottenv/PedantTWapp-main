/**
 * Утилиты для работы с ролями и правами доступа
 */

import type { User } from '../types/user';

export type UserRole = 'admin' | 'moderator' | 'user';
export type RegistrationStatus = 'unregistered' | 'registered' | 'employee' | 'waiting_for_hire';
export type Permission = 'create_orders' | 'view_orders' | 'edit_orders' | 'delete_orders' | 'manage_employees' | 'view_analytics';

export class RoleUtils {
  /**
   * Проверяет, имеет ли пользователь указанную роль
   */
  static hasRole(user: User | null, role: UserRole): boolean {
    if (!user) return false;
    return user.role === role;
  }

  /**
   * Проверяет, имеет ли пользователь одну из указанных ролей
   */
  static hasAnyRole(user: User | null, roles: UserRole[]): boolean {
    if (!user) return false;
    return roles.includes(user.role as UserRole);
  }

  /**
   * Проверяет, является ли пользователь владельцем сервиса
   */
  static isServiceOwner(user: User | null, serviceId: number): boolean {
    if (!user || !user.ownedServices) return false;
    return user.ownedServices.includes(serviceId);
  }

  /**
   * Проверяет, является ли пользователь сотрудником сервиса
   */
  static isServiceEmployee(user: User | null, serviceId: number): boolean {
    if (!user || !user.employeeServices) return false;
    return user.employeeServices.includes(serviceId);
  }

  /**
   * Проверяет, имеет ли пользователь доступ к сервису (владелец или сотрудник)
   */
  static hasServiceAccess(user: User | null, serviceId: number): boolean {
    return this.isServiceOwner(user, serviceId) || this.isServiceEmployee(user, serviceId);
  }

  /**
   * Проверяет статус регистрации пользователя
   */
  static hasRegistrationStatus(user: User | null, status: RegistrationStatus): boolean {
    if (!user) return false;
    return user.registrationStatus === status;
  }

  /**
   * Проверяет, зарегистрирован ли пользователь
   */
  static isRegistered(user: User | null): boolean {
    if (!user) return false;
    return user.registrationStatus !== 'unregistered';
  }

  /**
   * Проверяет, может ли пользователь создавать сервисы
   */
  static canCreateServices(user: User | null): boolean {
    return this.isRegistered(user) && this.hasRegistrationStatus(user, 'registered');
  }

  /**
   * Проверяет, может ли пользователь управлять сервисом
   */
  static canManageService(user: User | null, serviceId: number): boolean {
    return this.isServiceOwner(user, serviceId);
  }

  /**
   * Проверяет, может ли пользователь приглашать сотрудников
   */
  static canInviteEmployees(user: User | null, serviceId: number): boolean {
    return this.isServiceOwner(user, serviceId);
  }

  /**
   * Проверяет, может ли пользователь создавать заказы в сервисе
   */
  static canCreateOrders(user: User | null, serviceId: number): boolean {
    return this.hasServiceAccess(user, serviceId);
  }

  /**
   * Проверяет, может ли пользователь просматривать заказы сервиса
   */
  static canViewOrders(user: User | null, serviceId: number): boolean {
    return this.hasServiceAccess(user, serviceId);
  }

  /**
   * Проверяет, может ли пользователь редактировать заказы
   */
  static canEditOrders(user: User | null, serviceId: number): boolean {
    return this.hasServiceAccess(user, serviceId);
  }

  /**
   * Проверяет, может ли пользователь удалять заказы
   */
  static canDeleteOrders(user: User | null, serviceId: number): boolean {
    return this.isServiceOwner(user, serviceId);
  }

  /**
   * Проверяет, может ли пользователь просматривать аналитику
   */
  static canViewAnalytics(user: User | null, serviceId: number): boolean {
    return this.isServiceOwner(user, serviceId);
  }

  /**
   * Получает список доступных действий для пользователя в сервисе
   */
  static getAvailableActions(user: User | null, serviceId: number): Permission[] {
    const actions: Permission[] = [];

    if (this.canViewOrders(user, serviceId)) {
      actions.push('view_orders');
    }

    if (this.canCreateOrders(user, serviceId)) {
      actions.push('create_orders');
    }

    if (this.canEditOrders(user, serviceId)) {
      actions.push('edit_orders');
    }

    if (this.canDeleteOrders(user, serviceId)) {
      actions.push('delete_orders');
    }

    if (this.canInviteEmployees(user, serviceId)) {
      actions.push('manage_employees');
    }

    if (this.canViewAnalytics(user, serviceId)) {
      actions.push('view_analytics');
    }

    return actions;
  }

  /**
   * Получает роль пользователя в сервисе
   */
  static getServiceRole(user: User | null, serviceId: number): 'owner' | 'employee' | null {
    if (!user) return null;
    
    if (this.isServiceOwner(user, serviceId)) {
      return 'owner';
    }
    
    if (this.isServiceEmployee(user, serviceId)) {
      return 'employee';
    }
    
    return null;
  }

  /**
   * Проверяет, нужно ли показывать элемент UI на основе прав доступа
   */
  static shouldShowElement(user: User | null, requiredRole?: UserRole, requiredServiceId?: number, requiredPermission?: Permission): boolean {
    if (!user) return false;

    // Проверка роли
    if (requiredRole && !this.hasRole(user, requiredRole)) {
      return false;
    }

    // Проверка доступа к сервису
    if (requiredServiceId && !this.hasServiceAccess(user, requiredServiceId)) {
      return false;
    }

    // Проверка конкретного разрешения
    if (requiredPermission && requiredServiceId) {
      const availableActions = this.getAvailableActions(user, requiredServiceId);
      if (!availableActions.includes(requiredPermission)) {
        return false;
      }
    }

    return true;
  }
}