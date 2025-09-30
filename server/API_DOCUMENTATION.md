# PedantTW Server API Documentation

## Обзор

Полностью воссозданный API сервера на FastAPI с поддержкой всех функций из old_server.

## Структура проекта

```
server/
├── app/
│   ├── main.py          # Основное приложение FastAPI
│   ├── models.py        # Pydantic модели данных
│   ├── services.py      # Бизнес-логика и работа с БД
│   ├── controllers.py    # Контроллеры API
│   ├── middleware.py    # Middleware для аутентификации
│   ├── utils.py         # Утилиты и вспомогательные функции
│   ├── settings.py      # Настройки приложения
│   └── storage.py       # Работа с базой данных TinyDB
├── requirements.txt     # Зависимости Python
└── API_DOCUMENTATION.md # Эта документация
```

## Модели данных

### User (Пользователь)
- `id`: Telegram ID пользователя
- `first_name`, `last_name`, `username`: Данные из Telegram
- `language_code`: Язык пользователя
- `role`: Роль (admin, moderator, user)
- `status`: Статус (active, blocked)
- `registrationStatus`: Статус регистрации
- `organizationName`: Название организации
- `ownedServices`: ID сервисов, которыми владеет
- `employeeServices`: ID сервисов, где работает
- `activeServiceId`: Текущий активный сервис

### Service (Сервис)
- `id`: Уникальный ID
- `serviceNumber`: Номер сервиса (XXX)
- `name`: Название сервиса
- `address`: Адрес
- `ownerId`: ID владельца
- `status`: Статус (active, inactive)

### ServiceEmployee (Сотрудник сервиса)
- `id`: Уникальный ID
- `serviceId`: ID сервиса
- `userId`: ID пользователя
- `role`: Роль (owner, manager, employee)
- `permissions`: Разрешения
- `status`: Статус (active, inactive)
- `invitedBy`: Кто пригласил

### Order (Заказ)
- `id`: Уникальный ID
- `serviceId`: ID сервиса
- `orderNumber`: Номер заказа (XXX-XXXXX)
- `localOrderNumber`: Локальный номер
- `created_by_id`: ID создателя
- `comment`: Комментарий
- `photos`: Массив фото
- `status`: Статус заказа

### HiringQueue (Очередь найма)
- `id`: Уникальный ID
- `candidateUserId`: ID кандидата
- `employerUserId`: ID работодателя
- `serviceId`: ID сервиса
- `role`: Роль для найма
- `status`: Статус (pending, approved, rejected, expired)
- `qrData`: Данные из QR-кода
- `expiresAt`: Время истечения

## API Endpoints

### Пользователи (Users)
- `GET /api/users` - Получить всех пользователей
- `GET /api/users/{user_id}` - Получить пользователя по ID
- `POST /api/users` - Создать/обновить пользователя
- `PUT /api/users/{user_id}/role` - Обновить роль пользователя
- `PUT /api/users/{user_id}` - Обновить пользователя

### Сервисы (Services)
- `GET /api/services` - Получить все сервисы
- `GET /api/services/{service_id}` - Получить сервис по ID
- `GET /api/services/owner/{owner_id}` - Получить сервисы владельца
- `POST /api/services` - Создать сервис
- `PUT /api/services/{service_id}` - Обновить сервис
- `DELETE /api/services/{service_id}` - Удалить сервис

### Сотрудники (Employees)
- `GET /api/employees/service/{service_id}` - Получить сотрудников сервиса
- `GET /api/employees/user/{user_id}` - Получить сервисы пользователя
- `POST /api/employees` - Добавить сотрудника
- `PUT /api/employees/{employee_id}` - Обновить сотрудника
- `DELETE /api/employees/{employee_id}` - Удалить сотрудника
- `GET /api/employees/{user_id}/{service_id}/{permission}` - Проверить разрешение
- `POST /api/employees/hire` - Нанять сотрудника

### Заказы (Orders)
- `GET /api/orders` - Получить все заказы
- `GET /api/orders/{order_id}` - Получить заказ по ID
- `POST /api/orders` - Создать заказ (с поддержкой загрузки файлов)
- `PUT /api/orders/{order_id}` - Обновить заказ
- `DELETE /api/orders/{order_id}` - Удалить заказ
- `GET /api/orders/next-number/{service_number}` - Получить следующий номер заказа

### Очередь найма (Hiring Queue)
- `POST /api/hiring-queue` - Добавить в очередь найма
- `GET /api/hiring-queue/employer/{employer_id}` - Получить очередь работодателя
- `GET /api/hiring-queue/candidate/{candidate_id}` - Получить заявки кандидата
- `POST /api/hiring-queue/{queue_id}/approve` - Одобрить кандидата
- `POST /api/hiring-queue/{queue_id}/reject` - Отклонить кандидата
- `GET /api/hiring-queue/stats/{employer_id}` - Получить статистику очереди

### Системные
- `GET /api/health` - Проверка здоровья сервера
- `GET /config.json` - Конфигурация для клиентов
- `POST /api/init` - Инициализация пользователя из Telegram WebApp
- `GET /api/logs/stream` - Поток логов (Server-Sent Events)
- `POST /api/session/ping` - Проверка сессии

### Отладка
- `POST /api/debug/hire` - Отладка найма сотрудника
- `GET /api/debug/db` - Состояние базы данных

## Аутентификация и авторизация

### Middleware
- **TelegramAuth**: Аутентификация пользователей Telegram
- **RegistrationCheck**: Проверка статуса регистрации
- **RoleCheck**: Проверка ролей пользователей
- **ServicePermissionCheck**: Проверка разрешений в сервисах

### Зависимости FastAPI
- `require_authentication`: Требует аутентификации
- `require_admin`: Требует роль администратора
- `require_service_owner`: Требует владельца сервиса

## Особенности реализации

### База данных
- Использует TinyDB для хранения данных
- Асинхронная работа с базой данных
- Автоматическая генерация ID

### Валидация
- Pydantic модели для валидации данных
- Валидация номеров заказов (формат XXX-XXXXX)
- Санитизация пользовательских данных

### Логирование
- Структурированное логирование с эмодзи
- Server-Sent Events для потоков логов
- Отслеживание активности пользователей

### Загрузка файлов
- Поддержка загрузки фото для заказов
- Обработка multipart/form-data
- Сохранение метаданных файлов

## Совместимость

API полностью совместим с клиентскими приложениями из old_server:
- Те же endpoints и структуры данных
- Поддержка всех функций Telegram WebApp
- Обратная совместимость с существующими клиентами

## Развертывание

1. Установите зависимости: `pip install -r requirements.txt`
2. Запустите сервер: `uvicorn app.main:app --host 0.0.0.0 --port 3001`
3. Сервер будет доступен по адресу: `http://localhost:3001`

## Мониторинг

- `/api/health` - Проверка состояния сервера
- `/api/debug/db` - Статистика базы данных
- `/api/logs/stream` - Поток логов в реальном времени
