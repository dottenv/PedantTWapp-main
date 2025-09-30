# Утилиты сервера

Этот каталог содержит утилиты для устранения дублирования кода и улучшения архитектуры.

## Структура

### `corsUtils.js`
- Настройки CORS для Express
- Проверка разрешенных доменов
- Поддержка различных тунелей (ngrok, devtunnels, cloudpub.ru)

### `imageUtils.js`
- Обработка запросов изображений
- Определение MIME типов
- Отправка файлов с правильными заголовками

### `loggerUtils.js`
- Централизованное логирование
- Форматирование сообщений
- Логирование HTTP запросов и ошибок

### `validationUtils.js`
- Валидация входящих данных
- Проверка обязательных полей
- Валидация пользователей Telegram и заказов

## Использование

```javascript
import { CorsUtils } from './utils/corsUtils.js';
import { ImageUtils } from './utils/imageUtils.js';
import { LoggerUtils } from './utils/loggerUtils.js';
import { ValidationUtils } from './utils/validationUtils.js';

// CORS
app.use(cors(CorsUtils.getCorsConfig()));

// Изображения
app.get('/api/image/:filename', (req, res) => {
  ImageUtils.handleImageRequest(req, res, uploadsPath);
});

// Логирование
app.use(LoggerUtils.logRequest);

// Валидация
ValidationUtils.validateTelegramUser(userData);
```