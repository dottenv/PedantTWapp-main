from fastapi import HTTPException, UploadFile, File
from typing import List, Optional, Dict, Any
from .models import (
    User, Service, ServiceEmployee, Order, HiringQueue,
    UserCreate, UserUpdate, ServiceCreate, ServiceUpdate,
    EmployeeCreate, EmployeeUpdate, OrderCreate, OrderUpdate,
    HiringQueueCreate, HiringQueueUpdate
)
from .services import UserService, ServiceService, EmployeeService, OrderService, HiringQueueService


class UsersController:
    def __init__(self, user_service: UserService):
        self.user_service = user_service

    async def get_all_users(self) -> List[User]:
        return await self.user_service.get_all_users()

    async def get_user_by_id(self, user_id: int) -> User:
        user = await self.user_service.get_user_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="Пользователь не найден")
        return user

    async def create_or_update_user(self, user_data: UserCreate) -> Dict[str, Any]:
        user = await self.user_service.create_or_update_user(user_data)
        return {
            "success": True,
            "message": "Пользователь сохранен",
            "user": user
        }

    async def update_user_role(self, user_id: int, role: str) -> Dict[str, Any]:
        if role not in ["admin", "moderator", "user"]:
            raise HTTPException(status_code=400, detail="Неверная роль")
        
        user = await self.user_service.update_user(user_id, UserUpdate(role=role))
        if not user:
            raise HTTPException(status_code=404, detail="Пользователь не найден")
        
        return {
            "success": True,
            "message": "Роль обновлена",
            "user": user
        }

    async def update_user(self, user_id: int, update_data: UserUpdate) -> Dict[str, Any]:
        user = await self.user_service.update_user(user_id, update_data)
        if not user:
            raise HTTPException(status_code=404, detail="Пользователь не найден")
        
        return {
            "success": True,
            "message": "Пользователь обновлен",
            "user": user
        }


class ServicesController:
    def __init__(self, service_service: ServiceService, employee_service: EmployeeService):
        self.service_service = service_service
        self.employee_service = employee_service

    async def get_all_services(self) -> List[Service]:
        return await self.service_service.get_all_services()

    async def get_service_by_id(self, service_id: int) -> Service:
        service = await self.service_service.get_service_by_id(service_id)
        if not service:
            raise HTTPException(status_code=404, detail="Сервис не найден")
        return service

    async def get_services_by_owner(self, owner_id: int) -> List[Service]:
        return await self.service_service.get_services_by_owner(owner_id)

    async def create_service(self, service_data: ServiceCreate) -> Dict[str, Any]:
        service = await self.service_service.create_service(service_data)
        return {
            "success": True,
            "message": "Сервис создан",
            "service": service
        }

    async def update_service(self, service_id: int, update_data: ServiceUpdate) -> Dict[str, Any]:
        service = await self.service_service.update_service(service_id, update_data)
        if not service:
            raise HTTPException(status_code=404, detail="Сервис не найден")
        
        return {
            "success": True,
            "message": "Сервис обновлен",
            "service": service
        }

    async def delete_service(self, service_id: int) -> Dict[str, Any]:
        deleted = await self.service_service.delete_service(service_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Сервис не найден")
        
        return {
            "success": True,
            "message": "Сервис удален"
        }


class EmployeesController:
    def __init__(self, employee_service: EmployeeService, user_service: UserService):
        self.employee_service = employee_service
        self.user_service = user_service

    async def get_employees_by_service(self, service_id: int) -> List[Dict[str, Any]]:
        employees = await self.employee_service.get_employees_by_service(service_id)
        
        # Получаем информацию о пользователях для каждого сотрудника
        employees_with_user_info = []
        for employee in employees:
            user = await self.user_service.get_user_by_id(employee.userId)
            employees_with_user_info.append({
                **employee.dict(),
                "user": user.dict() if user else None
            })
        
        return employees_with_user_info

    async def get_employees_by_user(self, user_id: int) -> List[ServiceEmployee]:
        return await self.employee_service.get_employees_by_user(user_id)

    async def add_employee(self, employee_data: EmployeeCreate) -> Dict[str, Any]:
        employee = await self.employee_service.add_employee(employee_data)
        return {
            "success": True,
            "message": "Сотрудник добавлен",
            "employee": employee
        }

    async def update_employee(self, employee_id: int, update_data: EmployeeUpdate) -> Dict[str, Any]:
        employee = await self.employee_service.update_employee(employee_id, update_data)
        if not employee:
            raise HTTPException(status_code=404, detail="Сотрудник не найден")
        
        return {
            "success": True,
            "message": "Данные сотрудника обновлены",
            "employee": employee
        }

    async def remove_employee(self, employee_id: int) -> Dict[str, Any]:
        removed = await self.employee_service.remove_employee(employee_id)
        if not removed:
            raise HTTPException(status_code=404, detail="Сотрудник не найден")
        
        return {
            "success": True,
            "message": "Сотрудник удален"
        }

    async def check_permission(self, user_id: int, service_id: int, permission: str) -> Dict[str, bool]:
        has_permission = await self.employee_service.has_permission(user_id, service_id, permission)
        return {"hasPermission": has_permission}

    async def hire_employee(self, user_id: int, service_id: int, owner_id: int) -> Dict[str, Any]:
        # Проверяем владельца
        owner = await self.user_service.get_user_by_id(owner_id)
        if not owner or service_id not in owner.ownedServices:
            raise HTTPException(status_code=403, detail="Нет прав на найм в этот сервис")
        
        # Проверяем, не нанят ли уже
        existing_employees = await self.employee_service.get_employees_by_service(service_id)
        existing_employee = next((emp for emp in existing_employees if emp.userId == user_id), None)
        
        if existing_employee:
            return {
                "success": True,
                "message": "Сотрудник уже нанят",
                "employee": existing_employee
            }
        
        # Создаем данные сотрудника
        employee_data = EmployeeCreate(
            serviceId=service_id,
            userId=user_id,
            role="employee",
            permissions=["create_orders", "view_orders", "edit_orders"],
            invitedBy=owner_id
        )
        
        employee = await self.employee_service.add_employee(employee_data)
        
        # Обновляем статус пользователя
        await self.user_service.update_user(user_id, UserUpdate(
            registrationStatus="employee",
            activeServiceId=service_id
        ))
        
        return {
            "success": True,
            "message": "Сотрудник нанят",
            "employee": employee
        }


class OrdersController:
    def __init__(self, order_service: OrderService, employee_service: EmployeeService):
        self.order_service = order_service
        self.employee_service = employee_service

    async def get_all_orders(self) -> List[Order]:
        return await self.order_service.get_all_orders()

    async def get_order_by_id(self, order_id: int) -> Order:
        order = await self.order_service.get_order_by_id(order_id)
        if not order:
            raise HTTPException(status_code=404, detail="Заказ не найден")
        return order

    async def create_order(self, order_data: OrderCreate) -> Dict[str, Any]:
        # Проверка разрешений (если указан serviceId)
        if order_data.serviceId and self.employee_service:
            has_permission = await self.employee_service.has_permission(
                order_data.created_by_id, 
                order_data.serviceId, 
                "create_orders"
            )
            
            if not has_permission:
                raise HTTPException(status_code=403, detail="Нет разрешения на создание заказов в этом сервисе")
        
        order = await self.order_service.create_order(order_data)
        return {
            "success": True,
            "message": "Заказ создан",
            "order": order
        }

    async def update_order(self, order_id: int, update_data: OrderUpdate) -> Dict[str, Any]:
        order = await self.order_service.update_order(order_id, update_data)
        if not order:
            raise HTTPException(status_code=404, detail="Заказ не найден")
        
        return {
            "success": True,
            "message": "Заказ обновлен",
            "order": order
        }

    async def delete_order(self, order_id: int) -> Dict[str, Any]:
        deleted = await self.order_service.delete_order(order_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Заказ не найден")
        
        return {
            "success": True,
            "message": "Заказ удален"
        }

    async def get_next_order_number(self, service_number: str) -> Dict[str, str]:
        next_number = await self.order_service.generate_next_order_number(service_number)
        return {"nextNumber": next_number}


class HiringQueueController:
    def __init__(self, hiring_queue_service: HiringQueueService):
        self.hiring_queue_service = hiring_queue_service

    async def add_to_queue(self, user_id: int) -> Dict[str, Any]:
        queue_item = await self.hiring_queue_service.add_candidate_to_general_queue(user_id)
        return {
            "success": True,
            "message": "Добавлен в очередь найма",
            "queueItem": queue_item
        }

    async def get_employer_queue(self, employer_id: int) -> List[HiringQueue]:
        return await self.hiring_queue_service.get_employer_queue(employer_id)

    async def get_candidate_applications(self, candidate_id: int) -> List[HiringQueue]:
        return await self.hiring_queue_service.get_candidate_applications(candidate_id)

    async def approve_candidate(self, queue_id: int, employer_id: int) -> HiringQueue:
        return await self.hiring_queue_service.approve_candidate(queue_id, employer_id)

    async def reject_candidate(self, queue_id: int, employer_id: int) -> HiringQueue:
        return await self.hiring_queue_service.reject_candidate(queue_id, employer_id)

    async def get_queue_stats(self, employer_id: int) -> Dict[str, int]:
        return await self.hiring_queue_service.get_queue_stats(employer_id)
