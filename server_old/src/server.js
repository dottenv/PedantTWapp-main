import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { JSONFilePreset } from 'lowdb/node'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

// Загружаем переменные окружения
dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Инициализация данных
import { initializeData } from '../init-data.js';
initializeData();

const app = express()
const PORT = process.env.PORT || 3001

// Инициализация базы данных
const defaultData = {
  users: [],
  sessions: [],
  orders: [],
  services: [],
  serviceEmployees: [],
  hiringQueue: []
}

let db;
try {
  db = await JSONFilePreset(path.join(__dirname, '../data/db.json'), defaultData);
  console.log('[DB] Database connected');
} catch (error) {
  console.error('[DB] Database connection error:', error);
  process.exit(1);
}



// Middleware
app.use(helmet({
  // Отключаем некоторые ограничения для Telegram WebApp
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}))

// CORS настройки
app.use(cors(CorsUtils.getCorsConfig()))
app.use(express.json({ limit: '100mb' }))
app.use(express.urlencoded({ limit: '100mb', extended: true }))

// Логирование запросов
app.use(LoggerUtils.logRequest);

// Импорт сервисов и контроллеров
import { OrderService } from './services/orderService.js';
import { OrdersController } from './controllers/ordersController.js';
import { createOrdersRouter } from './routes/orders.js';
import { UserService } from './services/userService.js';
import { UsersController } from './controllers/usersController.js';
import { createUsersRouter } from './routes/users.js';
import { ServiceService } from './services/serviceService.js';
import { EmployeeService } from './services/employeeService.js';
import { OrderNumberService } from './services/orderNumberService.js';
import { ServicesController } from './controllers/servicesController.js';
import { EmployeesController } from './controllers/employeesController.js';
import { createServicesRouter } from './routes/services.js';
import { createEmployeesRouter } from './routes/employees.js';
import { SessionService } from './services/sessionService.js';
import { HiringQueueService } from './services/hiringQueueService.js';
import { HiringQueueController } from './controllers/hiringQueueController.js';
import { createHiringQueueRouter } from './routes/hiringQueue.js';
import { telegramAuth } from './middleware/telegramAuth.js';
import { registrationCheck, requireRegistration } from './middleware/registrationCheck.js';
import { CorsUtils } from './utils/corsUtils.js';
import { LoggerUtils } from './utils/loggerUtils.js';
import { ValidationUtils } from './utils/validationUtils.js';
import { TelegramUtils } from './utils/telegramUtils.js';
import { clientLogger } from './utils/clientLogger.js';

// Инициализация сервисов
const userService = new UserService(db);
const serviceService = new ServiceService(db, userService);
const employeeService = new EmployeeService(db, userService);
const orderNumberService = new OrderNumberService(db);
const orderService = new OrderService(db, userService, serviceService, orderNumberService);

// Инициализация контроллеров
const ordersController = new OrdersController(orderService, employeeService);
const usersController = new UsersController(userService);
const servicesController = new ServicesController(serviceService, employeeService);
const employeesController = new EmployeesController(employeeService, userService);
const sessionService = new SessionService(db);
const hiringQueueService = new HiringQueueService(db, userService, sessionService);
const hiringQueueController = new HiringQueueController(hiringQueueService);

// Middleware для автосохранения пользователей Telegram
app.use('/api', telegramAuth(userService));

// Middleware для проверки регистрации (применяется ко всем API маршрутам)
app.use('/api', registrationCheck());

// API Routes
app.get('/api/health', (req, res) => {
  const healthData = LoggerUtils.logHealthCheck(req);
  res.json(healthData);
});

// Server-Sent Events для логов
app.get('/api/logs/stream', (req, res) => {
  LoggerUtils.logInfo('[SERVER] Клиент подключился к потоку логов');
  clientLogger.addClient(res);
});

// Подключение маршрутов
app.use('/api/orders', createOrdersRouter(ordersController));
app.use('/api/users', createUsersRouter(usersController));
app.use('/api/services', createServicesRouter(servicesController));
app.use('/api/employees', createEmployeesRouter(employeesController));
app.use('/api/hiring-queue', createHiringQueueRouter(hiringQueueController));

// Debug routes для тестирования найма
app.post('/api/debug/hire', async (req, res) => {
  LoggerUtils.logInfo('[DEBUG] Тестирование найма сотрудника');
  try {
    const { userId, serviceId, ownerId } = req.body;
    
    LoggerUtils.logInfo('[DEBUG] Данные для найма:', { userId, serviceId, ownerId });
    
    // Проверяем текущее состояние БД
    await db.read();
    LoggerUtils.logInfo(`[DEBUG] Текущие сотрудники: ${db.data.serviceEmployees?.length || 0}`);
    
    // Вызываем метод найма
    const result = await employeesController.hireEmployee({
      body: { userId, serviceId, ownerId }
    }, {
      json: (data) => {
        LoggerUtils.logInfo('[DEBUG] Результат найма:', data);
        res.json(data);
      },
      status: (code) => ({
        json: (data) => {
          LoggerUtils.logError('[DEBUG] Ошибка найма:', data);
          res.status(code).json(data);
        }
      })
    });
    
  } catch (error) {
    LoggerUtils.logError('[DEBUG] Ошибка тестирования найма', error);
    res.status(500).json({ error: error.message });
  }
});

// Debug route для проверки состояния БД
app.get('/api/debug/db', async (req, res) => {
  try {
    await db.read();
    res.json({
      users: db.data.users?.length || 0,
      services: db.data.services?.length || 0,
      serviceEmployees: db.data.serviceEmployees || [],
      hiringQueue: db.data.hiringQueue?.length || 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Маршрут для проверки сессии
app.post('/api/session/ping', async (req, res) => {
  const { sessionId } = req.body;
  LoggerUtils.logInfo(`[SERVER] Проверка сессии: ${sessionId}`);
  
  try {
    if (!sessionId) {
      LoggerUtils.logError('[SERVER] Отсутствует Session ID');
      return res.status(400).json({ error: 'Session ID required' });
    }
    
    const session = await sessionService.getSession(sessionId);
    
    if (!session || !session.isActive) {
      LoggerUtils.logError(`[SERVER] Недействительная сессия: ${sessionId}`);
      return res.status(401).json({ error: 'Invalid session' });
    }
    
    // Обновляем время последней активности
    await sessionService.updateSessionActivity(sessionId);
    LoggerUtils.logSuccess(`[SERVER] Сессия обновлена: ${sessionId}`);
    
    res.json({ success: true, session });
  } catch (error) {
    LoggerUtils.logError('[SERVER] Ошибка проверки сессии', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Эндпоинт для инициализации пользователя из Telegram WebApp
app.post('/api/init', async (req, res) => {
  LoggerUtils.logInfo('[SERVER] Инициализация пользователя из Telegram WebApp');
  try {
    LoggerUtils.logUserInit(req.body);
    
    const telegramUser = req.body;
    
    // Валидация данных пользователя
    try {
      ValidationUtils.validateTelegramUser(telegramUser);
      LoggerUtils.logSuccess('[SERVER] Валидация данных пользователя прошла успешно');
    } catch (validationError) {
      LoggerUtils.logError('[SERVER] Ошибка валидации данных пользователя', validationError);
      return res.status(400).json({ error: validationError.message });
    }
    
    const user = await userService.createOrUpdateUser(telegramUser);
    LoggerUtils.logSuccess(`[SERVER] Пользователь создан/обновлен: ${user.id}`);
    
    // Создаем новую сессию (автоматически удаляет старые)
    const session = await sessionService.createSession(
      user.id,
      req.headers['user-agent'],
      req.ip || req.connection.remoteAddress
    );
    LoggerUtils.logSuccess(`[SERVER] Сессия создана: ${session.id}`);
    
    LoggerUtils.logUserInitSuccess(user.id);
    
    res.json({
      success: true,
      user: user,
      session: session
    });
  } catch (error) {
    LoggerUtils.logError('[SERVER] Ошибка инициализации пользователя', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});







// Статические файлы
const uploadsPath = path.join(__dirname, '../data/uploads');
app.use('/uploads', express.static(uploadsPath));
app.use(express.static(path.join(__dirname, '../../client/dist')));

// Специальный маршрут для gallery.html (должен быть перед fallback)
app.get('/gallery.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../../client/public/gallery.html'));
});

// Fallback для SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../client/dist/index.html'))
})

// Обработка ошибок
app.use((error, req, res, next) => {
  console.error('Необработанная ошибка:', error)
  res.status(500).json({ error: 'Внутренняя ошибка сервера' })
})

app.listen(PORT, '0.0.0.0', async () => {
  LoggerUtils.logSuccess(`[SERVER] Сервер запущен на порту ${PORT}`);
  LoggerUtils.logInfo(`[SERVER] WebApp: http://localhost:${PORT}`);
  LoggerUtils.logInfo(`[SERVER] API: http://localhost:${PORT}/api/health`);
  LoggerUtils.logInfo(`[SERVER] База данных: ${path.join(__dirname, '../data/db.json')}`);
  
  try {
    await db.read();
    LoggerUtils.logInfo(`[DB] Пользователи: ${db.data.users.length}`);
    LoggerUtils.logInfo(`[DB] Заказы: ${db.data.orders.length}`);
    LoggerUtils.logInfo(`[DB] Сервисы: ${db.data.services?.length || 0}`);
    LoggerUtils.logInfo(`[DB] Сотрудники: ${db.data.serviceEmployees?.length || 0}`);
    LoggerUtils.logSuccess('[SERVER] Сервер готов к работе');
  } catch (error) {
    LoggerUtils.logError('[DB] Ошибка проверки базы данных', error);
  }
})