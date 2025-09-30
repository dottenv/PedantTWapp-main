from typing import List, Optional, Dict, Any
from datetime import datetime
import asyncio
from .storage import db
from .models import (
    User, Service, ServiceEmployee, Order, HiringQueue,
    UserCreate, UserUpdate, ServiceCreate, ServiceUpdate,
    EmployeeCreate, EmployeeUpdate, OrderCreate, OrderUpdate,
    HiringQueueCreate, HiringQueueUpdate, UserRole, RegistrationStatus
)
from .utils import ValidationUtils, LoggerUtils, OrderNumberService, SessionService


class UserService:
    def __init__(self):
        self.db = db

    async def get_all_users(self) -> List[User]:
        users_data = await self.db.list("users")
        return [User(**user) for user in users_data]

    async def get_user_by_id(self, user_id: int) -> Optional[User]:
        user_data = await self.db.get_by_id("users", user_id)
        return User(**user_data) if user_data else None

    async def create_or_update_user(self, user_data: UserCreate) -> User:
        existing_user = await self.get_user_by_id(user_data.id)
        
        if existing_user:
            # Обновляем существующего пользователя
            update_data = user_data.dict()
            update_data.update({
                "role": existing_user.role,
                "status": existing_user.status,
                "orders": existing_user.orders,
                "createdAt": existing_user.createdAt,
                "updatedAt": datetime.utcnow().isoformat() + "Z",
                "lastSeen": datetime.utcnow().isoformat() + "Z",
                "registrationStatus": existing_user.registrationStatus,
                "organizationName": existing_user.organizationName,
                "ownedServices": existing_user.ownedServices,
                "employeeServices": existing_user.employeeServices,
                "activeServiceId": existing_user.activeServiceId
            })
            saved_user = await self.db.upsert("users", update_data, key_field="id")
        else:
            # Создаем нового пользователя
            new_user_data = user_data.dict()
            new_user_data.update({
                "role": "user",
                "status": "active",
                "registrationStatus": "unregistered",
                "orders": 0,
                "ownedServices": [],
                "employeeServices": [],
                "activeServiceId": None
            })
            saved_user = await self.db.insert("users", new_user_data)
        
        return User(**saved_user)

    async def update_user(self, user_id: int, update_data: UserUpdate) -> Optional[User]:
        user_data = await self.db.get_by_id("users", user_id)
        if not user_data:
            return None
        
        # Обновляем только переданные поля
        update_dict = update_data.dict(exclude_none=True)
        update_dict["updatedAt"] = datetime.utcnow().isoformat() + "Z"
        
        updated_data = {**user_data, **update_dict}
        saved_user = await self.db.upsert("users", updated_data, key_field="id")
        return User(**saved_user)

    async def add_owned_service(self, user_id: int, service_id: int):
        user = await self.get_user_by_id(user_id)
        if user and service_id not in user.ownedServices:
            user.ownedServices.append(service_id)
            await self.db.upsert("users", user.dict(), key_field="id")

    async def add_employee_service(self, user_id: int, service_id: int):
        user = await self.get_user_by_id(user_id)
        if user and service_id not in user.employeeServices:
            user.employeeServices.append(service_id)
            await self.db.upsert("users", user.dict(), key_field="id")

    async def remove_employee_service(self, user_id: int, service_id: int):
        user = await self.get_user_by_id(user_id)
        if user and service_id in user.employeeServices:
            user.employeeServices.remove(service_id)
            await self.db.upsert("users", user.dict(), key_field="id")

    async def set_active_service(self, user_id: int, service_id: int):
        user = await self.get_user_by_id(user_id)
        if user:
            user.activeServiceId = service_id
            await self.db.upsert("users", user.dict(), key_field="id")


class ServiceService:
    def __init__(self, user_service: UserService):
        self.db = db
        self.user_service = user_service

    async def get_all_services(self) -> List[Service]:
        services_data = await self.db.list("services")
        return [Service(**service) for service in services_data]

    async def get_service_by_id(self, service_id: int) -> Optional[Service]:
        service_data = await self.db.get_by_id("services", service_id)
        return Service(**service_data) if service_data else None

    async def get_services_by_owner(self, owner_id: int) -> List[Service]:
        services_data = await self.db.find("services", ownerId=owner_id)
        return [Service(**service) for service in services_data]

    async def get_service_by_number(self, service_number: str) -> Optional[Service]:
        services_data = await self.db.find("services", serviceNumber=service_number)
        return Service(**services_data[0]) if services_data else None

    async def create_service(self, service_data: ServiceCreate) -> Service:
        # Проверяем уникальность номера сервиса
        existing_service = await self.get_service_by_number(service_data.serviceNumber)
        if existing_service:
            raise ValueError(f"Сервис с номером {service_data.serviceNumber} уже существует")

        service_id = int(datetime.utcnow().timestamp() * 1000)
        new_service_data = {
            **service_data.dict(),
            "id": service_id,
            "status": "active",
            "createdAt": datetime.utcnow().isoformat() + "Z",
            "updatedAt": datetime.utcnow().isoformat() + "Z"
        }
        
        saved_service = await self.db.insert("services", new_service_data)
        
        # Обновляем пользователя - добавляем сервис в ownedServices
        await self.user_service.add_owned_service(service_data.ownerId, service_id)
        
        return Service(**saved_service)

    async def update_service(self, service_id: int, update_data: ServiceUpdate) -> Optional[Service]:
        service_data = await self.db.get_by_id("services", service_id)
        if not service_data:
            return None
        
        update_dict = update_data.dict(exclude_none=True)
        update_dict["updatedAt"] = datetime.utcnow().isoformat() + "Z"
        
        updated_data = {**service_data, **update_dict}
        saved_service = await self.db.upsert("services", updated_data, key_field="id")
        return Service(**saved_service)

    async def delete_service(self, service_id: int) -> bool:
        service_data = await self.db.get_by_id("services", service_id)
        if not service_data:
            return False
        
        # Удаляем сервис из ownedServices у владельца
        owner_id = service_data["ownerId"]
        owner = await self.user_service.get_user_by_id(owner_id)
        if owner and service_id in owner.ownedServices:
            owner.ownedServices.remove(service_id)
            await self.db.upsert("users", owner.dict(), key_field="id")
        
        # Удаляем сервис
        await self.db.db.table("services").remove(doc_ids=[service_data["doc_id"]])
        return True


class EmployeeService:
    def __init__(self, user_service: UserService):
        self.db = db
        self.user_service = user_service

    async def get_all_employees(self) -> List[ServiceEmployee]:
        employees_data = await self.db.list("serviceEmployees")
        return [ServiceEmployee(**emp) for emp in employees_data]

    async def get_employees_by_service(self, service_id: int) -> List[ServiceEmployee]:
        employees_data = await self.db.find("serviceEmployees", serviceId=service_id)
        return [ServiceEmployee(**emp) for emp in employees_data]

    async def get_employees_by_user(self, user_id: int) -> List[ServiceEmployee]:
        employees_data = await self.db.find("serviceEmployees", userId=user_id)
        return [ServiceEmployee(**emp) for emp in employees_data]

    async def get_employee_by_id(self, employee_id: int) -> Optional[ServiceEmployee]:
        employee_data = await self.db.get_by_id("serviceEmployees", employee_id)
        return ServiceEmployee(**employee_data) if employee_data else None

    async def add_employee(self, employee_data: EmployeeCreate) -> ServiceEmployee:
        # Проверяем, не существует ли уже такой сотрудник
        existing_employees = await self.db.find("serviceEmployees", 
                                               userId=employee_data.userId, 
                                               serviceId=employee_data.serviceId)
        if existing_employees:
            return ServiceEmployee(**existing_employees[0])

        employee_id = int(datetime.utcnow().timestamp() * 1000)
        new_employee_data = {
            **employee_data.dict(),
            "id": employee_id,
            "status": "active",
            "joinedAt": datetime.utcnow().isoformat() + "Z"
        }
        
        saved_employee = await self.db.insert("serviceEmployees", new_employee_data)
        
        # Обновляем пользователя - добавляем сервис в employeeServices
        await self.user_service.add_employee_service(employee_data.userId, employee_data.serviceId)
        
        return ServiceEmployee(**saved_employee)

    async def update_employee(self, employee_id: int, update_data: EmployeeUpdate) -> Optional[ServiceEmployee]:
        employee_data = await self.db.get_by_id("serviceEmployees", employee_id)
        if not employee_data:
            return None
        
        update_dict = update_data.dict(exclude_none=True)
        updated_data = {**employee_data, **update_dict}
        saved_employee = await self.db.upsert("serviceEmployees", updated_data, key_field="id")
        return ServiceEmployee(**saved_employee)

    async def remove_employee(self, employee_id: int) -> bool:
        employee_data = await self.db.get_by_id("serviceEmployees", employee_id)
        if not employee_data:
            return False
        
        # Обновляем пользователя - удаляем сервис из employeeServices
        await self.user_service.remove_employee_service(employee_data["userId"], employee_data["serviceId"])
        
        # Удаляем сотрудника
        await self.db.db.table("serviceEmployees").remove(doc_ids=[employee_data["doc_id"]])
        return True

    async def has_permission(self, user_id: int, service_id: int, permission: str) -> bool:
        employees = await self.get_employees_by_service(service_id)
        employee = next((emp for emp in employees if emp.userId == user_id), None)
        
        if not employee or employee.status != "active":
            return False
        
        # Owner и Manager имеют все права
        if employee.role in ["owner", "manager"]:
            return True
        
        # Проверяем конкретное разрешение
        return permission in employee.permissions


class OrderService:
    def __init__(self, user_service: UserService, service_service: ServiceService):
        self.db = db
        self.user_service = user_service
        self.service_service = service_service

    async def get_all_orders(self) -> List[Order]:
        orders_data = await self.db.list("orders")
        orders = []
        
        for order_data in orders_data:
            order = Order(**order_data)
            
            # Обновляем имя создателя
            if order.created_by_id:
                user = await self.user_service.get_user_by_id(order.created_by_id)
                if user:
                    order.created_by = user.name
            
            orders.append(order)
        
        return orders

    async def get_order_by_id(self, order_id: int) -> Optional[Order]:
        order_data = await self.db.get_by_id("orders", order_id)
        if not order_data:
            return None
        
        order = Order(**order_data)
        
        # Обновляем имя создателя
        if order.created_by_id:
            user = await self.user_service.get_user_by_id(order.created_by_id)
            if user:
                order.created_by = user.name
        
        return order

    async def create_order(self, order_data: OrderCreate) -> Order:
        order_id = int(datetime.utcnow().timestamp() * 1000)
        
        # Получаем имя создателя
        user = await self.user_service.get_user_by_id(order_data.created_by_id)
        created_by = user.name if user else f"User {order_data.created_by_id}"
        
        new_order_data = {
            **order_data.dict(),
            "id": order_id,
            "created_by": created_by,
            "photos_count": len(order_data.photos),
            "status": "active",
            "created_at": datetime.utcnow().isoformat() + "Z",
            "updated_at": datetime.utcnow().isoformat() + "Z"
        }
        
        saved_order = await self.db.insert("orders", new_order_data)
        return Order(**saved_order)

    async def update_order(self, order_id: int, update_data: OrderUpdate) -> Optional[Order]:
        order_data = await self.db.get_by_id("orders", order_id)
        if not order_data:
            return None
        
        update_dict = update_data.dict(exclude_none=True)
        if "photos" in update_dict:
            update_dict["photos_count"] = len(update_dict["photos"])
        
        update_dict["updated_at"] = datetime.utcnow().isoformat() + "Z"
        
        updated_data = {**order_data, **update_dict}
        saved_order = await self.db.upsert("orders", updated_data, key_field="id")
        return Order(**saved_order)

    async def delete_order(self, order_id: int) -> bool:
        order_data = await self.db.get_by_id("orders", order_id)
        if not order_data:
            return False
        
        await self.db.db.table("orders").remove(doc_ids=[order_data["doc_id"]])
        return True

    async def generate_next_order_number(self, service_number: str) -> str:
        # Находим все заказы для данного сервиса
        orders_data = await self.db.list("orders")
        service_orders = [
            order for order in orders_data 
            if order.get("orderNumber", "").startswith(f"{service_number}-")
        ]
        
        # Находим максимальный номер
        max_number = 0
        for order in service_orders:
            order_number = order.get("orderNumber", "")
            if "-" in order_number:
                try:
                    num = int(order_number.split("-")[1])
                    max_number = max(max_number, num)
                except ValueError:
                    continue
        
        # Генерируем следующий номер
        next_number = max_number + 1
        return f"{service_number}-{next_number:05d}"


class HiringQueueService:
    def __init__(self, user_service: UserService):
        self.db = db
        self.user_service = user_service

    async def add_to_queue(self, queue_data: HiringQueueCreate) -> HiringQueue:
        queue_id = int(datetime.utcnow().timestamp() * 1000)
        
        new_queue_data = {
            **queue_data.dict(),
            "id": queue_id,
            "status": "pending",
            "scannedAt": datetime.utcnow().isoformat() + "Z",
            "expiresAt": (datetime.utcnow().timestamp() + 24 * 60 * 60) * 1000,
            "createdAt": datetime.utcnow().isoformat() + "Z",
            "updatedAt": datetime.utcnow().isoformat() + "Z"
        }
        
        saved_queue = await self.db.insert("hiringQueue", new_queue_data)
        return HiringQueue(**saved_queue)

    async def add_candidate_to_general_queue(self, candidate_user_id: int) -> HiringQueue:
        # Получаем данные пользователя
        user = await self.user_service.get_user_by_id(candidate_user_id)
        qr_data = {
            "firstName": user.first_name if user else "",
            "lastName": user.last_name if user else "",
            "username": user.username if user else ""
        } if user else None
        
        queue_data = HiringQueueCreate(
            candidateUserId=candidate_user_id,
            employerUserId=None,
            serviceId=None,
            role="employee",
            qrData=qr_data
        )
        
        queue = await self.add_to_queue(queue_data)
        
        # Обновляем статус пользователя
        await self.user_service.update_user(candidate_user_id, UserUpdate(
            registrationStatus=RegistrationStatus.WAITING_FOR_HIRE
        ))
        
        return queue

    async def get_employer_queue(self, employer_user_id: int) -> List[HiringQueue]:
        queue_data = await self.db.list("hiringQueue")
        queue_items = []
        
        for item_data in queue_data:
            queue_item = HiringQueue(**item_data)
            
            # Фильтруем по работодателю и не истекшие
            if ((queue_item.employerUserId == employer_user_id or 
                 (queue_item.employerUserId is None and queue_item.status == "waiting_for_hire")) and
                not queue_item.isExpired):
                queue_items.append(queue_item)
        
        # Сортируем по дате сканирования (новые первыми)
        queue_items.sort(key=lambda x: x.scannedAt, reverse=True)
        return queue_items

    async def get_candidate_applications(self, candidate_user_id: int) -> List[HiringQueue]:
        queue_data = await self.db.find("hiringQueue", candidateUserId=candidate_user_id)
        return [HiringQueue(**item) for item in queue_data]

    async def approve_candidate(self, queue_id: int, employer_user_id: int) -> Optional[HiringQueue]:
        queue_data = await self.db.get_by_id("hiringQueue", queue_id)
        if not queue_data:
            return None
        
        queue_item = HiringQueue(**queue_data)
        
        if queue_item.isExpired:
            raise ValueError("Заявка истекла")
        
        if queue_item.status not in ["pending", "waiting_for_hire"]:
            raise ValueError("Заявка уже обработана")
        
        # Обновляем статус
        queue_item.updateStatus("approved")
        queue_item.employerUserId = employer_user_id
        
        updated_data = queue_item.dict()
        saved_queue = await self.db.upsert("hiringQueue", updated_data, key_field="id")
        return HiringQueue(**saved_queue)

    async def reject_candidate(self, queue_id: int, employer_user_id: int) -> Optional[HiringQueue]:
        queue_data = await self.db.get_by_id("hiringQueue", queue_id)
        if not queue_data:
            return None
        
        queue_item = HiringQueue(**queue_data)
        
        if queue_item.status not in ["pending", "waiting_for_hire"]:
            raise ValueError("Заявка уже обработана")
        
        # Обновляем статус
        queue_item.updateStatus("rejected")
        queue_item.employerUserId = employer_user_id
        
        updated_data = queue_item.dict()
        saved_queue = await self.db.upsert("hiringQueue", updated_data, key_field="id")
        return HiringQueue(**saved_queue)

    async def get_queue_stats(self, employer_user_id: int) -> Dict[str, int]:
        queue = await self.get_employer_queue(employer_user_id)
        
        return {
            "total": len(queue),
            "pending": len([q for q in queue if q.status == "pending"]),
            "approved": len([q for q in queue if q.status == "approved"]),
            "rejected": len([q for q in queue if q.status == "rejected"])
        }
