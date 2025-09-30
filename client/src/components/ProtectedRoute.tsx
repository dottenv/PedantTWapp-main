/**
 * Компонент для защищенных маршрутов
 */

import React from 'react';
import type { User } from '../types/user';
import { RoleUtils } from '../utils/roleUtils';
import type { UserRole, Permission } from '../utils/roleUtils';

interface ProtectedRouteProps {
  user: User | null;
  children: React.ReactNode;
  requiredRole?: UserRole;
  requiredServiceId?: number;
  requiredPermission?: Permission;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  user,
  children,
  requiredRole,
  requiredServiceId,
  requiredPermission,
  fallback,
  redirectTo
}) => {
  // Проверяем права доступа
  const hasAccess = RoleUtils.shouldShowElement(
    user,
    requiredRole,
    requiredServiceId,
    requiredPermission
  );

  if (!hasAccess) {
    if (redirectTo) {
      // В реальном приложении здесь был бы редирект
      console.log(`Redirecting to: ${redirectTo}`);
    }

    return (
      <>
        {fallback || (
          <div className="access-denied">
            <div className="access-denied-content">
              <i className="fas fa-lock" style={{ fontSize: '48px', color: 'var(--tg-theme-hint-color)' }}></i>
              <h3>Доступ ограничен</h3>
              <p>У вас недостаточно прав для просмотра этого содержимого.</p>
              {!user && <p>Пожалуйста, авторизуйтесь.</p>}
              {user && requiredRole && (
                <p>Требуется роль: {requiredRole}</p>
              )}
              {user && requiredServiceId && (
                <p>Требуется доступ к сервису #{requiredServiceId}</p>
              )}
              {user && requiredPermission && (
                <p>Требуется разрешение: {requiredPermission}</p>
              )}
            </div>
          </div>
        )}
      </>
    );
  }

  return <>{children}</>;
};

interface ConditionalRenderProps {
  user: User | null;
  children: React.ReactNode;
  requiredRole?: UserRole;
  requiredServiceId?: number;
  requiredPermission?: Permission;
  fallback?: React.ReactNode;
}

/**
 * Компонент для условного рендеринга на основе прав доступа
 */
export const ConditionalRender: React.FC<ConditionalRenderProps> = ({
  user,
  children,
  requiredRole,
  requiredServiceId,
  requiredPermission,
  fallback
}) => {
  const shouldShow = RoleUtils.shouldShowElement(
    user,
    requiredRole,
    requiredServiceId,
    requiredPermission
  );

  if (!shouldShow) {
    return <>{fallback || null}</>;
  }

  return <>{children}</>;
};

/**
 * HOC для защиты компонентов
 */
export function withRoleProtection<P extends object>(
  Component: React.ComponentType<P>,
  requiredRole?: UserRole,
  requiredServiceId?: number,
  requiredPermission?: Permission
) {
  return function ProtectedComponent(props: P & { user: User | null }) {
    const { user, ...componentProps } = props;

    return (
      <ProtectedRoute
        user={user}
        requiredRole={requiredRole}
        requiredServiceId={requiredServiceId}
        requiredPermission={requiredPermission}
      >
        <Component {...(componentProps as P)} />
      </ProtectedRoute>
    );
  };
}