from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    ADMIN = "admin"
    MODERATOR = "moderator"
    USER = "user"


class UserStatus(str, Enum):
    ACTIVE = "active"
    BLOCKED = "blocked"


class RegistrationStatus(str, Enum):
    UNREGISTERED = "unregistered"
    REGISTERED = "registered"
    EMPLOYEE = "employee"
    WAITING_FOR_HIRE = "waiting_for_hire"


class ServiceStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"


class EmployeeRole(str, Enum):
    OWNER = "owner"
    MANAGER = "manager"
    EMPLOYEE = "employee"


class EmployeeStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"


class OrderStatus(str, Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class HiringStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXPIRED = "expired"
    WAITING_FOR_HIRE = "waiting_for_hire"


class User(BaseModel):
    id: int
    first_name: Optional[str] = ""
    last_name: Optional[str] = ""
    username: Optional[str] = ""
    language_code: str = "ru"
    is_premium: bool = False
    photo_url: Optional[str] = ""
    role: UserRole = UserRole.USER
    status: UserStatus = UserStatus.ACTIVE
    registrationStatus: RegistrationStatus = RegistrationStatus.UNREGISTERED
    organizationName: Optional[str] = ""
    orders: int = 0
    lastSeen: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    createdAt: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    updatedAt: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    ownedServices: List[int] = Field(default_factory=list)
    employeeServices: List[int] = Field(default_factory=list)
    activeServiceId: Optional[int] = None

    @validator('language_code')
    def validate_language_code(cls, v):
        valid_codes = ['ru', 'en', 'uk', 'kz']
        return v if v in valid_codes else 'ru'

    @validator('first_name', 'last_name', 'username', 'organizationName')
    def sanitize_string(cls, v):
        if v is None:
            return ""
        if isinstance(v, str):
            return v.replace('[<>"\'&]', '').strip()[:255]
        return ""

    @validator('photo_url')
    def sanitize_url(cls, v):
        if v is None:
            return ""
        if isinstance(v, str) and v:
            try:
                from urllib.parse import urlparse
                urlparse(v)
                return v[:500]
            except:
                return ""
        return ""

    @property
    def name(self) -> str:
        full_name = f"{self.first_name or ''} {self.last_name or ''}".strip()
        return full_name or self.username or f"User {self.id}"

    class Config:
        use_enum_values = True


class Service(BaseModel):
    id: int
    serviceNumber: str
    name: str
    address: str
    status: ServiceStatus = ServiceStatus.ACTIVE
    ownerId: int
    createdAt: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    updatedAt: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")

    class Config:
        use_enum_values = True


class ServiceEmployee(BaseModel):
    id: int
    serviceId: int
    userId: int
    role: EmployeeRole = EmployeeRole.EMPLOYEE
    permissions: List[str] = Field(default_factory=lambda: ["create_orders", "view_orders"])
    status: EmployeeStatus = EmployeeStatus.ACTIVE
    invitedBy: Optional[int] = None
    joinedAt: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")

    class Config:
        use_enum_values = True


class Order(BaseModel):
    id: int
    serviceId: Optional[int] = None
    orderNumber: str
    localOrderNumber: Optional[int] = None
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    photos_count: int = 0
    created_by: str = ""
    created_by_id: Optional[int] = None
    comment: str = ""
    photos: List[Dict[str, Any]] = Field(default_factory=list)
    status: OrderStatus = OrderStatus.ACTIVE
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")

    class Config:
        use_enum_values = True


class HiringQueue(BaseModel):
    id: int
    candidateUserId: int
    employerUserId: Optional[int] = None
    serviceId: Optional[int] = None
    role: EmployeeRole = EmployeeRole.EMPLOYEE
    status: HiringStatus = HiringStatus.PENDING
    qrData: Optional[Dict[str, Any]] = None
    scannedAt: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    processedAt: Optional[str] = None
    expiresAt: str = Field(default_factory=lambda: (datetime.utcnow().timestamp() + 24 * 60 * 60) * 1000)
    createdAt: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    updatedAt: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")

    @property
    def isExpired(self) -> bool:
        return datetime.utcnow().timestamp() > self.expiresAt

    def updateStatus(self, new_status: HiringStatus, processed_at: Optional[str] = None):
        self.status = new_status
        self.processedAt = processed_at or datetime.utcnow().isoformat() + "Z"
        self.updatedAt = datetime.utcnow().isoformat() + "Z"

    class Config:
        use_enum_values = True


# Pydantic модели для API запросов
class UserCreate(BaseModel):
    id: int
    first_name: Optional[str] = ""
    last_name: Optional[str] = ""
    username: Optional[str] = ""
    language_code: str = "ru"
    is_premium: bool = False
    photo_url: Optional[str] = ""


class UserUpdate(BaseModel):
    registrationStatus: Optional[RegistrationStatus] = None
    organizationName: Optional[str] = None
    role: Optional[UserRole] = None
    status: Optional[UserStatus] = None
    ownedServices: Optional[List[int]] = None
    employeeServices: Optional[List[int]] = None
    activeServiceId: Optional[int] = None


class ServiceCreate(BaseModel):
    serviceNumber: str
    name: str
    address: str
    ownerId: int


class ServiceUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    status: Optional[ServiceStatus] = None


class EmployeeCreate(BaseModel):
    serviceId: int
    userId: int
    role: EmployeeRole = EmployeeRole.EMPLOYEE
    permissions: List[str] = Field(default_factory=lambda: ["create_orders", "view_orders"])
    invitedBy: int


class EmployeeUpdate(BaseModel):
    role: Optional[EmployeeRole] = None
    permissions: Optional[List[str]] = None
    status: Optional[EmployeeStatus] = None


class OrderCreate(BaseModel):
    serviceId: Optional[int] = None
    orderNumber: str
    created_by_id: int
    comment: str = ""
    photos: List[Dict[str, Any]] = Field(default_factory=list)


class OrderUpdate(BaseModel):
    comment: Optional[str] = None
    photos: Optional[List[Dict[str, Any]]] = None
    status: Optional[OrderStatus] = None


class HiringQueueCreate(BaseModel):
    candidateUserId: int
    employerUserId: Optional[int] = None
    serviceId: Optional[int] = None
    role: EmployeeRole = EmployeeRole.EMPLOYEE
    qrData: Optional[Dict[str, Any]] = None


class HiringQueueUpdate(BaseModel):
    status: HiringStatus
    employerUserId: Optional[int] = None
