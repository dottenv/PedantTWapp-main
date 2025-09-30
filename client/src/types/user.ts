export interface User {
  id: number;
  first_name: string;
  last_name: string;
  username: string;
  language_code: string;
  is_premium: boolean;
  photo_url: string;
  role: 'moderator' | 'user';
  status: 'active' | 'blocked';
  orders: number;
  lastSeen: string;
  createdAt: string;
  updatedAt: string;
  name: string; // computed field
  registrationStatus: 'unregistered' | 'registered' | 'employee' | 'waiting_for_hire';
  organizationName: string;
  
  // Мультисервисность
  ownedServices: number[]; // ID сервисов, которыми владеет
  employeeServices: number[]; // ID сервисов, где работает
  activeServiceId: number | null; // Текущий активный сервис
}

