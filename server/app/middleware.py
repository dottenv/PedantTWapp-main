from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, Dict, Any
from .utils import LoggerUtils, ValidationUtils
from .services import UserService
from .storage import db

security = HTTPBearer(auto_error=False)


class TelegramAuth:
    def __init__(self, user_service: UserService):
        self.user_service = user_service

    async def __call__(self, request: Request):
        """Middleware для аутентификации пользователей Telegram"""
        try:
            # Получаем данные пользователя из заголовков или тела запроса
            user_data = None
            
            # Проверяем заголовки
            telegram_user = request.headers.get("X-Telegram-User")
            if telegram_user:
                import json
                user_data = json.loads(telegram_user)
            
            # Если нет в заголовках, проверяем тело запроса
            if not user_data and hasattr(request, '_json'):
                user_data = request._json.get('user')
            
            if user_data:
                # Валидируем данные пользователя
                ValidationUtils.validate_telegram_user(user_data)
                
                # Создаем или обновляем пользователя
                user = await self.user_service.create_or_update_user(user_data)
                request.state.user = user
                LoggerUtils.log_success(f"Пользователь аутентифицирован: {user.id}")
            else:
                LoggerUtils.log_info("Пользователь не аутентифицирован")
                request.state.user = None
                
        except Exception as e:
            LoggerUtils.log_error("Ошибка аутентификации", e)
            request.state.user = None


class RegistrationCheck:
    def __init__(self):
        self.db = db

    async def __call__(self, request: Request):
        """Middleware для проверки регистрации пользователя"""
        user = getattr(request.state, 'user', None)
        
        if not user:
            LoggerUtils.log_info("Пользователь не найден в запросе")
            return
        
        # Проверяем статус регистрации
        if user.registrationStatus == "unregistered":
            LoggerUtils.log_info(f"Пользователь {user.id} не зарегистрирован")
            # Можно добавить логику перенаправления или ограничения доступа
        
        LoggerUtils.log_success(f"Проверка регистрации пройдена для пользователя {user.id}")


class RoleCheck:
    def __init__(self, required_roles: list):
        self.required_roles = required_roles

    async def __call__(self, request: Request):
        """Middleware для проверки роли пользователя"""
        user = getattr(request.state, 'user', None)
        
        if not user:
            raise HTTPException(status_code=401, detail="Пользователь не аутентифицирован")
        
        if user.role not in self.required_roles:
            raise HTTPException(
                status_code=403, 
                detail=f"Недостаточно прав. Требуемые роли: {', '.join(self.required_roles)}"
            )
        
        LoggerUtils.log_success(f"Проверка роли пройдена для пользователя {user.id} с ролью {user.role}")


class ServicePermissionCheck:
    def __init__(self, required_permission: str):
        self.required_permission = required_permission

    async def __call__(self, request: Request):
        """Middleware для проверки разрешений в сервисе"""
        user = getattr(request.state, 'user', None)
        
        if not user:
            raise HTTPException(status_code=401, detail="Пользователь не аутентифицирован")
        
        # Получаем serviceId из параметров маршрута
        service_id = request.path_params.get('service_id')
        if not service_id:
            # Пытаемся получить из тела запроса
            if hasattr(request, '_json'):
                service_id = request._json.get('serviceId')
        
        if not service_id:
            LoggerUtils.log_info("ServiceId не найден в запросе")
            return
        
        # Проверяем разрешения через EmployeeService
        from .services import EmployeeService
        employee_service = EmployeeService(UserService())
        
        has_permission = await employee_service.has_permission(
            user.id, 
            int(service_id), 
            self.required_permission
        )
        
        if not has_permission:
            raise HTTPException(
                status_code=403, 
                detail=f"Нет разрешения '{self.required_permission}' для сервиса {service_id}"
            )
        
        LoggerUtils.log_success(
            f"Проверка разрешения '{self.required_permission}' пройдена для пользователя {user.id} в сервисе {service_id}"
        )


# Функции для использования в зависимостях FastAPI
async def get_current_user(request: Request) -> Optional[Any]:
    """Получение текущего пользователя из запроса"""
    return getattr(request.state, 'user', None)


async def require_authentication(request: Request):
    """Требует аутентификации пользователя"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Требуется аутентификация")
    return user


async def require_admin(request: Request):
    """Требует роль администратора"""
    user = await require_authentication(request)
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Требуется роль администратора")
    return user


async def require_service_owner(request: Request):
    """Требует владельца сервиса"""
    user = await require_authentication(request)
    service_id = request.path_params.get('service_id')
    
    if not service_id:
        raise HTTPException(status_code=400, detail="Service ID не найден")
    
    # Проверяем, является ли пользователь владельцем сервиса
    if service_id not in user.ownedServices:
        raise HTTPException(status_code=403, detail="Нет прав на управление этим сервисом")
    
    return user


# Middleware для логирования запросов
async def log_requests(request: Request, call_next):
    """Middleware для логирования входящих запросов"""
    LoggerUtils.log_request({
        "method": request.method,
        "url": str(request.url),
        "headers": dict(request.headers)
    })
    
    response = await call_next(request)
    
    LoggerUtils.log_success(f"Ответ отправлен: {response.status_code}")
    return response
