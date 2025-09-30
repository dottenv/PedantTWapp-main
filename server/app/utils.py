import re
from typing import Any, Dict, List, Optional
from datetime import datetime
import logging

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ValidationUtils:
    @staticmethod
    def validate_required(data: Dict[str, Any], required_fields: List[str]) -> None:
        """Проверяет наличие обязательных полей"""
        missing_fields = [field for field in required_fields if field not in data or data[field] is None]
        if missing_fields:
            raise ValueError(f"Отсутствуют обязательные поля: {', '.join(missing_fields)}")

    @staticmethod
    def validate_order_number(order_number: str) -> bool:
        """Валидация формата номера заказа XXX-XXXXXX"""
        pattern = r'^\d{3}-\d{5}$'
        return bool(re.match(pattern, order_number))

    @staticmethod
    def extract_service_number(order_number: str) -> Optional[str]:
        """Извлекает номер сервиса из номера заказа"""
        if '-' in order_number:
            return order_number.split('-')[0]
        return None

    @staticmethod
    def validate_telegram_user(user_data: Dict[str, Any]) -> None:
        """Валидация данных пользователя Telegram"""
        if not user_data.get('id'):
            raise ValueError('ID пользователя обязателен')
        
        if not isinstance(user_data['id'], int):
            raise ValueError('ID пользователя должен быть числом')


class LoggerUtils:
    @staticmethod
    def log_info(message: str, data: Any = None):
        """Логирование информационных сообщений"""
        if data:
            logger.info(f"{message}: {data}")
        else:
            logger.info(message)

    @staticmethod
    def log_success(message: str, data: Any = None):
        """Логирование успешных операций"""
        if data:
            logger.info(f"✅ {message}: {data}")
        else:
            logger.info(f"✅ {message}")

    @staticmethod
    def log_error(message: str, error: Exception = None):
        """Логирование ошибок"""
        if error:
            logger.error(f"❌ {message}: {error}")
        else:
            logger.error(f"❌ {message}")

    @staticmethod
    def log_debug(message: str, data: Any = None):
        """Логирование отладочной информации"""
        if data:
            logger.debug(f"🔍 {message}: {data}")
        else:
            logger.debug(f"🔍 {message}")

    @staticmethod
    def log_request(request_data: Dict[str, Any]):
        """Логирование входящих запросов"""
        logger.info(f"📥 {request_data.get('method', 'UNKNOWN')} {request_data.get('url', 'UNKNOWN')}")

    @staticmethod
    def log_health_check(request_data: Dict[str, Any]) -> Dict[str, Any]:
        """Логирование проверки здоровья сервера"""
        return {
            "status": "ok",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "request": request_data
        }

    @staticmethod
    def log_user_init(user_data: Dict[str, Any]):
        """Логирование инициализации пользователя"""
        logger.info(f"👤 Инициализация пользователя: {user_data.get('id', 'unknown')}")

    @staticmethod
    def log_user_init_success(user_id: int):
        """Логирование успешной инициализации пользователя"""
        logger.info(f"✅ Пользователь {user_id} успешно инициализирован")


class TelegramUtils:
    @staticmethod
    async def upload_order_photos(photos: List[Dict[str, Any]], uploads_path: str) -> List[Dict[str, Any]]:
        """Загрузка фото заказа в Telegram (заглушка)"""
        # В реальной реализации здесь была бы интеграция с Telegram Bot API
        # Пока возвращаем фото как есть
        return photos


class CorsUtils:
    @staticmethod
    def get_cors_config() -> Dict[str, Any]:
        """Конфигурация CORS"""
        return {
            "origin": "*",
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allowedHeaders": ["*"],
            "credentials": False
        }


class SessionService:
    def __init__(self, db):
        self.db = db

    async def create_session(self, user_id: int, user_agent: str, ip_address: str) -> Dict[str, Any]:
        """Создание новой сессии"""
        session_id = f"sess-{user_id}-{int(datetime.utcnow().timestamp())}"
        session_data = {
            "id": session_id,
            "userId": user_id,
            "userAgent": user_agent,
            "ipAddress": ip_address,
            "isActive": True,
            "createdAt": datetime.utcnow().isoformat() + "Z",
            "lastActivity": datetime.utcnow().isoformat() + "Z"
        }
        
        await self.db.insert("sessions", session_data)
        return session_data

    async def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Получение сессии по ID"""
        sessions = await self.db.find("sessions", id=session_id)
        return sessions[0] if sessions else None

    async def update_session_activity(self, session_id: str):
        """Обновление времени последней активности сессии"""
        session = await self.get_session(session_id)
        if session:
            session["lastActivity"] = datetime.utcnow().isoformat() + "Z"
            await self.db.upsert("sessions", session, key_field="id")

    async def track_hiring_activity(self, user_id: int, activity_type: str, data: Dict[str, Any]):
        """Отслеживание активности найма"""
        activity_data = {
            "userId": user_id,
            "activityType": activity_type,
            "data": data,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
        await self.db.insert("hiringActivities", activity_data)


class OrderNumberService:
    def __init__(self, db):
        self.db = db

    async def is_order_number_unique(self, order_number: str) -> bool:
        """Проверка уникальности номера заказа"""
        orders = await self.db.find("orders", orderNumber=order_number)
        return len(orders) == 0

    async def generate_next_order_number(self, service_number: str) -> str:
        """Генерация следующего номера заказа для сервиса"""
        orders = await self.db.list("orders")
        service_orders = [
            order for order in orders 
            if order.get("orderNumber", "").startswith(f"{service_number}-")
        ]
        
        max_number = 0
        for order in service_orders:
            order_number = order.get("orderNumber", "")
            if "-" in order_number:
                try:
                    num = int(order_number.split("-")[1])
                    max_number = max(max_number, num)
                except ValueError:
                    continue
        
        next_number = max_number + 1
        return f"{service_number}-{next_number:05d}"


class ClientLogger:
    def __init__(self):
        self.clients = []

    def add_client(self, response):
        """Добавление клиента для Server-Sent Events"""
        self.clients.append(response)

    def remove_client(self, response):
        """Удаление клиента"""
        if response in self.clients:
            self.clients.remove(response)

    async def send_to_all(self, message: str):
        """Отправка сообщения всем подключенным клиентам"""
        for client in self.clients[:]:  # Копия списка для безопасного удаления
            try:
                await client.write(f"data: {message}\n\n")
            except:
                self.remove_client(client)


# Глобальный экземпляр логгера клиентов
client_logger = ClientLogger()
