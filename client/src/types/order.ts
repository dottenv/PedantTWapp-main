export interface Order {
  id: number;
  serviceId: number | null; // Привязка к сервису
  orderNumber: string;
  localOrderNumber: number | null; // Локальный номер в сервисе
  created_at: string;
  photos_count: number;
  created_by: string;
  created_by_id: number | null; // Telegram ID создателя
  comment: string;
  photos: OrderPhoto[];
  status: string;
  updated_at: string;
}

export interface OrderPhoto {
  filename: string;
  savedAs: string;
  size: number;
  mimetype: string;
  path: string;
}

export interface CreateOrderData {
  orderNumber: string;
  comment: string;
  photos: File[];
  serviceId?: number;
}

