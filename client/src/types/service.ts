export interface Service {
  id: number;
  serviceNumber: string;
  name: string;
  address: string;
  status: 'active' | 'inactive';
  ownerId: number;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceEmployee {
  id: number;
  serviceId: number;
  userId: number;
  role: 'owner' | 'manager' | 'employee';
  permissions: string[];
  status: 'active' | 'inactive';
  invitedBy: number;
  joinedAt: string;
}

export interface ServiceWithEmployees extends Service {
  employees: ServiceEmployee[];
  employeeCount: number;
}