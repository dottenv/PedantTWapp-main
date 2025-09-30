# Python Server (FastAPI)

Минимальный сервер на FastAPI с JSON-хранилищем (TinyDB) и асинхронной обёрткой.

## Быстрый старт

1. Создайте и активируйте venv:
```
python -m venv .venv
.venv\\Scripts\\activate
```

2. Установите зависимости:
```
pip install -r requirements.txt
```

3. Запуск dev-сервера:
```
uvicorn app.main:app --reload --port 3001
```

## Эндпоинты

- `GET /api/health` — проверка здоровья
- `GET /config.json` — рантайм-конфиг клиента
- CRUD пример: `GET /api/items`, `POST /api/items`, `GET /api/items/{id}`

## Хранилище

- База: `data/db.json` (TinyDB)
- Асинхронный доступ: простая обёртка над TinyDB с `async` API


