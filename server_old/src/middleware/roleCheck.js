/**
 * Middleware для проверки ролей и доступа
 */
import { LoggerUtils } from '../utils/loggerUtils.js';

export const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    try {
      LoggerUtils.logInfo(`[ROLE_CHECK] Проверка роли для ${req.method} ${req.path}`);
      const user = req.user;
      
      if (!user) {
        LoggerUtils.logError('[ROLE_CHECK] Пользователь не авторизован');
        return res.status(401).json({ 
          error: 'Пользователь не авторизован' 
        });
      }

      LoggerUtils.logDebug(`[ROLE_CHECK] Текущая роль: ${user.role}, требуемые: [${allowedRoles.join(', ')}]`);
      
      // Проверяем роль пользователя
      if (!allowedRoles.includes(user.role)) {
        LoggerUtils.logError(`[ROLE_CHECK] Недостаточно прав: текущая роль ${user.role}, требуемые [${allowedRoles.join(', ')}]`);
        return res.status(403).json({ 
          error: 'Недостаточно прав доступа',
          required: allowedRoles,
          current: user.role
        });
      }

      LoggerUtils.logSuccess(`[ROLE_CHECK] Проверка роли пройдена для пользователя ${user.id}`);
      next();
    } catch (error) {
      LoggerUtils.logError('[ROLE_CHECK] Ошибка проверки роли', error);
      res.status(500).json({ error: 'Ошибка проверки прав доступа' });
    }
  };
};

export const requireOwner = (req, res, next) => {
  try {
    LoggerUtils.logInfo(`[OWNER_CHECK] Проверка прав владельца для ${req.method} ${req.path}`);
    const user = req.user;
    
    if (!user) {
      LoggerUtils.logError('[OWNER_CHECK] Пользователь не авторизован');
      return res.status(401).json({ 
        error: 'Пользователь не авторизован' 
      });
    }

    LoggerUtils.logDebug(`[OWNER_CHECK] Пользователь ${user.id}: ownedServices = [${user.ownedServices?.join(', ') || 'пусто'}]`);
    
    // Проверяем, что у пользователя есть собственные сервисы
    if (!user.ownedServices || user.ownedServices.length === 0) {
      LoggerUtils.logError(`[OWNER_CHECK] Пользователь ${user.id} не является владельцем сервисов`);
      return res.status(403).json({ 
        error: 'Доступ только для владельцев сервисов' 
      });
    }

    LoggerUtils.logSuccess(`[OWNER_CHECK] Проверка владельца пройдена для пользователя ${user.id}`);
    next();
  } catch (error) {
    LoggerUtils.logError('[OWNER_CHECK] Ошибка проверки прав владельца', error);
    res.status(500).json({ error: 'Ошибка проверки прав владельца' });
  }
};

export const requireServiceAccess = (req, res, next) => {
  try {
    const user = req.user;
    const serviceId = parseInt(req.params.serviceId) || parseInt(req.body.serviceId);
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Пользователь не авторизован' 
      });
    }

    if (!serviceId) {
      return res.status(400).json({ 
        error: 'ID сервиса не указан' 
      });
    }

    // Проверяем доступ к сервису (владелец или сотрудник)
    const hasAccess = user.ownedServices.includes(serviceId) || 
                     user.employeeServices.includes(serviceId);

    if (!hasAccess) {
      return res.status(403).json({ 
        error: 'Нет доступа к данному сервису' 
      });
    }

    req.serviceId = serviceId;
    next();
  } catch (error) {
    console.error('[SERVICE_ACCESS] Error:', error);
    res.status(500).json({ error: 'Ошибка проверки доступа к сервису' });
  }
};

export const requireEmployeePermission = (permission) => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      const serviceId = req.serviceId || parseInt(req.params.serviceId) || parseInt(req.body.serviceId);
      
      if (!user || !serviceId) {
        return res.status(401).json({ 
          error: 'Недостаточно данных для проверки прав' 
        });
      }

      // Владелец имеет все права
      if (user.ownedServices.includes(serviceId)) {
        return next();
      }

      // Проверяем права сотрудника
      const { EmployeeService } = await import('../services/employeeService.js');
      const employee = await EmployeeService.getEmployeeByUserAndService(user.id, serviceId);
      
      if (!employee) {
        return res.status(403).json({ 
          error: 'Вы не являетесь сотрудником данного сервиса' 
        });
      }

      if (!employee.permissions.includes(permission)) {
        return res.status(403).json({ 
          error: `Недостаточно прав: требуется ${permission}` 
        });
      }

      next();
    } catch (error) {
      console.error('[EMPLOYEE_PERMISSION] Error:', error);
      res.status(500).json({ error: 'Ошибка проверки прав сотрудника' });
    }
  };
};