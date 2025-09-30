# Утилиты клиента

Этот каталог содержит утилиты для устранения дублирования кода и улучшения архитектуры.

## Структура

### `dateUtils.ts`
- Форматирование дат в различных форматах
- Относительное время ("2 часа назад")
- Поддержка локализации

### `imageUtils.ts`
- Генерация URL изображений через API
- Обработка ошибок загрузки
- Форматирование размеров файлов
- Создание placeholder'ов

### `qrUtils.ts`
- Генерация QR кодов для заказов
- Создание HTML страниц с QR кодами
- Открытие в новом окне

## Использование

```typescript
import { DateUtils } from '../utils/dateUtils';
import { ImageUtils } from '../utils/imageUtils';
import { QRUtils } from '../utils/qrUtils';

// Даты
const formattedDate = DateUtils.formatDate(order.created_at);
const relativeTime = DateUtils.getRelativeTime(order.created_at);

// Изображения
const imageUrl = ImageUtils.getImageUrl(photo);
const fileSize = ImageUtils.formatFileSize(photo.size);

// QR коды
QRUtils.createOrderQR(orderId);
```

## Преимущества

- **Устранение дублирования**: Общий код вынесен в утилиты
- **Консистентность**: Единообразное поведение во всем приложении
- **Тестируемость**: Утилиты легко тестировать изолированно
- **Поддерживаемость**: Изменения в одном месте влияют на все приложение