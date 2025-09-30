from fastapi import FastAPI, HTTPException, Request, UploadFile, File, Form, Depends, Path
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
import asyncio
import json

from .settings import settings
from .storage import db
from .models import (
    User, Service, ServiceEmployee, Order, HiringQueue,
    UserCreate, UserUpdate, ServiceCreate, ServiceUpdate,
    EmployeeCreate, EmployeeUpdate, OrderCreate, OrderUpdate,
    HiringQueueCreate, HiringQueueUpdate
)
from .services import UserService, ServiceService, EmployeeService, OrderService, HiringQueueService
from .controllers import (
    UsersController, ServicesController, EmployeesController, 
    OrdersController, HiringQueueController
)
from .middleware import (
    TelegramAuth, RegistrationCheck, log_requests,
    get_current_user, require_authentication, require_admin
)
from .utils import LoggerUtils, client_logger

app = FastAPI(title="PedantTW Server", version="0.1.0")

# Обработчик ошибок для возврата JSON вместо HTML
@app.exception_handler(404)
async def not_found_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=404,
        content={"detail": "Not Found", "path": str(request.url.path)}
    )

@app.exception_handler(500)
async def internal_error_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error", "error": str(exc)}
    )

# CORS: временно максимально либеральный, чтобы исключить проблемы туннеля cloudpub
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,  # Должно быть False при allow_origins=["*"]
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Добавляем middleware для логирования
app.middleware("http")(log_requests)

# Дополнительные CORS заголовки
@app.middleware("http")
async def add_cors_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
    response.headers["Access-Control-Allow-Headers"] = "*"
    response.headers["Access-Control-Expose-Headers"] = "*"
    return response

# Добавляем обслуживание статических файлов
try:
    app.mount("/static", StaticFiles(directory="static"), name="static")
except Exception:
    pass  # Игнорируем если папка static не существует

# Инициализация сервисов
user_service = UserService()
service_service = ServiceService(user_service)
employee_service = EmployeeService(user_service)
order_service = OrderService(user_service, service_service)
hiring_queue_service = HiringQueueService(user_service)

# Инициализация контроллеров
users_controller = UsersController(user_service)
services_controller = ServicesController(service_service, employee_service)
employees_controller = EmployeesController(employee_service, user_service)
orders_controller = OrdersController(order_service, employee_service)
hiring_queue_controller = HiringQueueController(hiring_queue_service)


@app.options("/{full_path:path}")
async def options_handler(full_path: str = Path(...)):
    return JSONResponse(
        content={"message": "OK"},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Max-Age": "86400"
        }
    )

@app.get("/")
async def root():
    return JSONResponse({
        "message": "PedantTW Server is running",
        "version": app.version,
        "api_base": settings.api_base,
        "endpoints": {
            "health": "/api/health",
            "config": "/config.json",
            "api_docs": "/docs"
        }
    })


@app.get("/api/health")
async def health(request: Request):
    origin = request.headers.get("origin") or request.client.host if request.client else None
    ua = request.headers.get("user-agent", "")
    return JSONResponse(
        {
            "status": "ok",
            "version": app.version,
            "environment": settings.node_env,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "api_base": settings.api_base,
            "cors": {
                "origin": origin or "",
                "userAgent": ua,
                "allowed": ["*"]
            },
        },
        headers={
            "Content-Type": "application/json",
            "Cache-Control": "no-cache"
        }
    )


@app.get("/config.json")
async def runtime_config():
    api_base = settings.api_base
    # Убираем дублирование /api если оно уже есть
    if api_base.endswith('/api'):
        final_api_base = api_base
    else:
        final_api_base = f"{api_base}/api"
    
    return JSONResponse(
        {
            "API_BASE": final_api_base,
            "NODE_ENV": settings.node_env,
        },
        headers={
            "Content-Type": "application/json",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )


# ===== USERS API =====
@app.get("/api/users")
async def get_users(current_user: User = Depends(require_authentication)):
    return await users_controller.get_all_users()


@app.get("/api/users/{user_id}")
async def get_user(user_id: int, current_user: User = Depends(require_authentication)):
    return await users_controller.get_user_by_id(user_id)


@app.post("/api/users")
async def create_or_update_user(user: UserCreate):
    return await users_controller.create_or_update_user(user)


@app.put("/api/users/{user_id}/role")
async def update_user_role(user_id: int, payload: dict, current_user: User = Depends(require_admin)):
    role = payload.get("role")
    if not role:
        raise HTTPException(status_code=400, detail="Role is required")
    return await users_controller.update_user_role(user_id, role)


@app.put("/api/users/{user_id}")
async def update_user(user_id: int, update_data: UserUpdate, current_user: User = Depends(require_authentication)):
    return await users_controller.update_user(user_id, update_data)


# ===== SERVICES API =====
@app.get("/api/services")
async def get_services(current_user: User = Depends(require_authentication)):
    return await services_controller.get_all_services()


@app.get("/api/services/{service_id}")
async def get_service(service_id: int, current_user: User = Depends(require_authentication)):
    return await services_controller.get_service_by_id(service_id)


@app.get("/api/services/owner/{owner_id}")
async def get_services_by_owner(owner_id: int, current_user: User = Depends(require_authentication)):
    return await services_controller.get_services_by_owner(owner_id)


@app.post("/api/services")
async def create_service(service: ServiceCreate, current_user: User = Depends(require_authentication)):
    return await services_controller.create_service(service)


@app.put("/api/services/{service_id}")
async def update_service(service_id: int, update_data: ServiceUpdate, current_user: User = Depends(require_authentication)):
    return await services_controller.update_service(service_id, update_data)


@app.delete("/api/services/{service_id}")
async def delete_service(service_id: int, current_user: User = Depends(require_authentication)):
    return await services_controller.delete_service(service_id)


# ===== EMPLOYEES API =====
@app.get("/api/employees/service/{service_id}")
async def get_employees_by_service(service_id: int, current_user: User = Depends(require_authentication)):
    return await employees_controller.get_employees_by_service(service_id)


@app.get("/api/employees/user/{user_id}")
async def get_employees_by_user(user_id: int, current_user: User = Depends(require_authentication)):
    return await employees_controller.get_employees_by_user(user_id)


@app.post("/api/employees")
async def add_employee(employee: EmployeeCreate, current_user: User = Depends(require_authentication)):
    return await employees_controller.add_employee(employee)


@app.put("/api/employees/{employee_id}")
async def update_employee(employee_id: int, update_data: EmployeeUpdate, current_user: User = Depends(require_authentication)):
    return await employees_controller.update_employee(employee_id, update_data)


@app.delete("/api/employees/{employee_id}")
async def remove_employee(employee_id: int, current_user: User = Depends(require_authentication)):
    return await employees_controller.remove_employee(employee_id)


@app.get("/api/employees/{user_id}/{service_id}/{permission}")
async def check_permission(user_id: int, service_id: int, permission: str, current_user: User = Depends(require_authentication)):
    return await employees_controller.check_permission(user_id, service_id, permission)


@app.post("/api/employees/hire")
async def hire_employee(payload: dict, current_user: User = Depends(require_authentication)):
    user_id = payload.get("userId")
    service_id = payload.get("serviceId")
    owner_id = payload.get("ownerId")
    
    if not all([user_id, service_id, owner_id]):
        raise HTTPException(status_code=400, detail="userId, serviceId, and ownerId are required")
    
    return await employees_controller.hire_employee(user_id, service_id, owner_id)


# ===== ORDERS API =====
@app.get("/api/orders")
async def get_orders():
    try:
        result = await orders_controller.get_all_orders()
        return JSONResponse(result, headers={"Content-Type": "application/json"})
    except Exception as e:
        return JSONResponse(
            {"error": str(e), "orders": []},
            status_code=500,
            headers={"Content-Type": "application/json"}
        )


@app.get("/api/orders/{order_id}")
async def get_order(order_id: int, current_user: User = Depends(require_authentication)):
    return await orders_controller.get_order_by_id(order_id)


@app.post("/api/orders")
async def create_order(
    serviceId: Optional[int] = Form(None),
    orderNumber: str = Form(...),
    created_by_id: int = Form(...),
    comment: str = Form(""),
    photos: List[UploadFile] = File(default=[]),
    current_user: User = Depends(require_authentication)
):
    # Обработка загруженных файлов
    processed_photos = []
    for photo in photos:
        if photo.filename:
            # Сохраняем файл (упрощенная версия)
            file_data = await photo.read()
            processed_photos.append({
                "filename": photo.filename,
                "size": len(file_data),
                "mimetype": photo.content_type,
                "path": f"/uploads/{photo.filename}"
            })
    
    order_data = OrderCreate(
        serviceId=serviceId,
        orderNumber=orderNumber,
        created_by_id=created_by_id,
        comment=comment,
        photos=processed_photos
    )
    
    return await orders_controller.create_order(order_data)


@app.put("/api/orders/{order_id}")
async def update_order(order_id: int, update_data: OrderUpdate, current_user: User = Depends(require_authentication)):
    return await orders_controller.update_order(order_id, update_data)


@app.delete("/api/orders/{order_id}")
async def delete_order(order_id: int, current_user: User = Depends(require_authentication)):
    return await orders_controller.delete_order(order_id)


@app.get("/api/orders/next-number/{service_number}")
async def get_next_order_number(service_number: str, current_user: User = Depends(require_authentication)):
    return await orders_controller.get_next_order_number(service_number)


# ===== HIRING QUEUE API =====
@app.post("/api/hiring-queue")
async def add_to_queue(payload: dict, current_user: User = Depends(require_authentication)):
    user_id = payload.get("userId")
    if not user_id:
        raise HTTPException(status_code=400, detail="userId is required")
    return await hiring_queue_controller.add_to_queue(user_id)


@app.get("/api/hiring-queue/employer/{employer_id}")
async def get_employer_queue(employer_id: int, current_user: User = Depends(require_authentication)):
    return await hiring_queue_controller.get_employer_queue(employer_id)


@app.get("/api/hiring-queue/candidate/{candidate_id}")
async def get_candidate_applications(candidate_id: int, current_user: User = Depends(require_authentication)):
    return await hiring_queue_controller.get_candidate_applications(candidate_id)


@app.post("/api/hiring-queue/{queue_id}/approve")
async def approve_candidate(queue_id: int, payload: dict, current_user: User = Depends(require_authentication)):
    employer_id = payload.get("employerId")
    if not employer_id:
        raise HTTPException(status_code=400, detail="employerId is required")
    return await hiring_queue_controller.approve_candidate(queue_id, employer_id)


@app.post("/api/hiring-queue/{queue_id}/reject")
async def reject_candidate(queue_id: int, payload: dict, current_user: User = Depends(require_authentication)):
    employer_id = payload.get("employerId")
    if not employer_id:
        raise HTTPException(status_code=400, detail="employerId is required")
    return await hiring_queue_controller.reject_candidate(queue_id, employer_id)


@app.get("/api/hiring-queue/stats/{employer_id}")
async def get_queue_stats(employer_id: int, current_user: User = Depends(require_authentication)):
    return await hiring_queue_controller.get_queue_stats(employer_id)


# ===== LEGACY ENDPOINTS =====
@app.get("/api/settings")
async def get_settings():
    return JSONResponse(
        {"locale": "ru", "features": {}, "theme": "light"},
        headers={"Content-Type": "application/json"}
    )


@app.post("/api/init")
async def init_user(payload: dict):
    # ожидаем структуру WebApp initData преобразованную на клиенте
    user = payload.get("user") or {}
    # минимальный набор полей
    data = {
        "id": user.get("id"),
        "username": user.get("username"),
        "first_name": user.get("first_name"),
        "last_name": user.get("last_name"),
        "language_code": user.get("language_code"),
        "role": "user",
    }
    saved = await db.upsert("users", {k: v for k, v in data.items() if v is not None}, key_field="id")
    session = {"token": f"sess-{saved['id']}", "createdAt": datetime.utcnow().isoformat() + "Z"}
    return JSONResponse(
        {"user": saved, "session": session},
        headers={"Content-Type": "application/json"}
    )


@app.get("/api/logs/stream")
async def logs_stream():
    async def event_generator():
        counter = 0
        while True:
            counter += 1
            payload = {
                "ts": datetime.utcnow().isoformat() + "Z",
                "msg": "heartbeat",
                "n": counter,
            }
            yield f"data: {json.dumps(payload)}\n\n"
            await asyncio.sleep(15)
    return StreamingResponse(
        event_generator(), 
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Cache-Control"
        }
    )


# ===== DEBUG ENDPOINTS =====
@app.post("/api/debug/hire")
async def debug_hire(payload: dict):
    user_id = payload.get("userId")
    service_id = payload.get("serviceId")
    owner_id = payload.get("ownerId")
    
    if not all([user_id, service_id, owner_id]):
        raise HTTPException(status_code=400, detail="userId, serviceId, and ownerId are required")
    
    return await employees_controller.hire_employee(user_id, service_id, owner_id)


@app.get("/api/debug/db")
async def debug_db():
    try:
        users = await db.list("users")
        services = await db.list("services")
        service_employees = await db.list("serviceEmployees")
        hiring_queue = await db.list("hiringQueue")
        
        return JSONResponse({
            "users": len(users),
            "services": len(services),
            "serviceEmployees": service_employees,
            "hiringQueue": len(hiring_queue),
            "status": "ok"
        })
    except Exception as e:
        return JSONResponse(
            {"error": str(e), "status": "error"},
            status_code=500
        )


@app.get("/api/test")
async def test_endpoint():
    return JSONResponse({
        "message": "Test endpoint working",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "server_url": settings.api_base
    })


@app.post("/api/session/ping")
async def session_ping(payload: dict):
    session_id = payload.get("sessionId")
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID required")
    
    # Простая проверка сессии (можно расширить)
    return {
        "success": True,
        "session": {
            "id": session_id,
            "isActive": True,
            "lastActivity": datetime.utcnow().isoformat() + "Z"
        }
    }
