import { LoggerUtils } from '../utils/loggerUtils.js';

export const telegramAuth = (userService) => {
  return async (req, res, next) => {
    try {
      LoggerUtils.logDebug(`[TELEGRAM_AUTH] ${req.method} ${req.path} - начало аутентификации`);
      
      // Получаем данные пользователя из Telegram WebApp
      let telegramUser = null;
      let source = 'none';
      
      // Проверяем разные источники данных пользователя
      if (req.body && req.body.id) {
        telegramUser = req.body;
        source = 'body.id';
      } else if (req.body && req.body.user) {
        telegramUser = req.body.user;
        source = 'body.user';
      } else if (req.headers['x-telegram-user']) {
        try {
          telegramUser = JSON.parse(req.headers['x-telegram-user']);
          source = 'header';
        } catch (e) {
          LoggerUtils.logError('[TELEGRAM_AUTH] Ошибка парсинга заголовка x-telegram-user', e);
        }
      } else if (req.params && req.params.userId) {
        telegramUser = { id: parseInt(req.params.userId) };
        source = 'params.userId';
      } else if (req.params && req.params.id) {
        telegramUser = { id: parseInt(req.params.id) };
        source = 'params.id';
      }
      
      LoggerUtils.logDebug(`[TELEGRAM_AUTH] Источник данных: ${source}`, telegramUser);
      
      if (telegramUser && telegramUser.id) {
        LoggerUtils.logInfo(`[TELEGRAM_AUTH] Аутентификация пользователя: ${telegramUser.id}`);
        
        if (req.method === 'GET') {
          const user = await userService.getUserById(telegramUser.id);
          if (user) {
            req.user = user;
            LoggerUtils.logSuccess(`[TELEGRAM_AUTH] Пользователь найден: ${user.id} (статус: ${user.registrationStatus})`);
          } else {
            LoggerUtils.logWarning(`[TELEGRAM_AUTH] Пользователь ${telegramUser.id} не найден в БД`);
          }
        } else {
          const user = await userService.createOrUpdateUser(telegramUser);
          req.user = user;
          LoggerUtils.logSuccess(`[TELEGRAM_AUTH] Пользователь аутентифицирован: ${user.id} (статус: ${user.registrationStatus})`);
        }
      } else {
        LoggerUtils.logWarning(`[TELEGRAM_AUTH] Не удалось получить данные пользователя для ${req.method} ${req.path}`);
      }
      
      next();
    } catch (error) {
      LoggerUtils.logError('[TELEGRAM_AUTH] Ошибка аутентификации', error);
      next();
    }
  };
};