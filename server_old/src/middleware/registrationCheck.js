/**
 * Middleware для проверки статуса регистрации пользователя
 * Проверяет, завершил ли пользователь процесс регистрации организации
 */
import { LoggerUtils } from '../utils/loggerUtils.js';
export const registrationCheck = (options = {}) => {
  const {
    requireRegistration = true,
    allowedStatuses = ['registered'],
    redirectUnregistered = false
  } = options;

  return async (req, res, next) => {
    try {
      // Пропускаем проверку для определенных маршрутов
      const skipRoutes = [
        '/api/health',
        '/api/users/init',
        '/api/users/register',
        '/api/services',
        '/api/session/ping',
        '/api/session',
        '/api/logs/stream'
      ];

      const isSkipRoute = skipRoutes.some(route => req.path.startsWith(route));
      if (isSkipRoute) {
        LoggerUtils.logDebug(`[REGISTRATION_CHECK] Пропуск маршрута: ${req.path}`);
        return next();
      }

      // Проверяем наличие пользователя
      if (!req.user) {
        LoggerUtils.logWarning(`[REGISTRATION_CHECK] Пользователь не найден для ${req.method} ${req.path} - пропускаем`);
        return next();
      }

      const user = req.user;
      LoggerUtils.logInfo(`[REGISTRATION_CHECK] Проверка регистрации для пользователя ${user.id}: статус = ${user.registrationStatus}`);
      LoggerUtils.logDebug(`[REGISTRATION_CHECK] Параметры: requireRegistration=${requireRegistration}, allowedStatuses=[${allowedStatuses.join(', ')}]`);

      // Проверяем статус регистрации
      if (requireRegistration && !allowedStatuses.includes(user.registrationStatus)) {
        LoggerUtils.logError(`[REGISTRATION_CHECK] Пользователь ${user.id} не завершил регистрацию (статус: ${user.registrationStatus})`);
        
        if (redirectUnregistered) {
          return res.status(403).json({
            error: 'Registration required',
            message: 'Пользователь должен завершить регистрацию',
            registrationStatus: user.registrationStatus,
            requiresRegistration: true,
            userId: user.id,
            path: req.path
          });
        }
      }

      // Добавляем информацию о статусе регистрации в запрос
      req.registrationStatus = user.registrationStatus;
      req.isRegistered = allowedStatuses.includes(user.registrationStatus);

      LoggerUtils.logSuccess(`[REGISTRATION_CHECK] Проверка регистрации пройдена для пользователя ${user.id}`);
      next();
    } catch (error) {
      LoggerUtils.logError('[REGISTRATION_CHECK] Ошибка в middleware', error);
      next(error);
    }
  };
};

/**
 * Middleware для маршрутов, требующих завершенной регистрации
 */
export const requireRegistration = registrationCheck({
  requireRegistration: true,
  allowedStatuses: ['registered'],
  redirectUnregistered: true
});

/**
 * Middleware для маршрутов, доступных только незарегистрированным пользователям
 */
export const requireUnregistered = registrationCheck({
  requireRegistration: false,
  allowedStatuses: ['unregistered', 'employee', 'waiting_for_hire'],
  redirectUnregistered: false
});