import { telegramLogger } from '../components/TelegramLogger';
import { API_CONFIG, getApiUrl } from '../config/api';

class ApiService {
  private isServerAvailable = false;
  
  async checkServerConnection(): Promise<boolean> {
    try {
      const healthUrl = getApiUrl('/health');
      telegramLogger.info(`🔍 Проверяем: ${healthUrl}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);
      
      const response = await fetch(healthUrl, { 
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      clearTimeout(timeoutId);
      
      this.isServerAvailable = response.ok;
      
      if (response.ok) {
        const data = await response.json();
        telegramLogger.success(`✅ Сервер доступен: ${JSON.stringify(data)}`);
      } else {
        telegramLogger.error(`❌ Сервер недоступен: ${response.status}`);
        
        // Пытаемся получить текст ошибки
        try {
          const errorText = await response.text();
          telegramLogger.error(`❌ Ошибка сервера: ${errorText}`);
        } catch (e) {
          telegramLogger.error(`❌ Не удалось прочитать ошибку`);
        }
      }
      
      return this.isServerAvailable;
    } catch (error: any) {
      telegramLogger.error(`❌ Ошибка подключения: ${error.name} - ${error.message}`);
      
      // Дополнительная информация для отладки
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        telegramLogger.error('❌ Возможно, сервер не запущен или недоступен');
      }
      
      this.isServerAvailable = false;
      return false;
    }
  }
  
  private async requestFormData<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = getApiUrl(endpoint);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    
    const config: RequestInit = {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        // Не устанавливаем Content-Type для FormData - браузер сам установит с boundary
        ...options.headers,
      },
      ...options,
    };

    telegramLogger.info(`🚀 ${options.method || 'GET'} ${url} (FormData)`);

    try {
      const response = await fetch(url, config);
      clearTimeout(timeoutId);
      
      telegramLogger.info(`📊 Status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        let errorText = 'Unknown error';
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            errorText = errorData.error || errorData.message || 'Server error';
          } else {
            const textResponse = await response.text();
            // Убираем HTML теги из ошибки
            errorText = textResponse.replace(/<[^>]*>/g, '').trim() || 'Server error';
            if (errorText.length > 200) {
              errorText = errorText.substring(0, 200) + '...';
            }
          }
        } catch (e) {
          errorText = `Failed to read error response`;
        }
        
        telegramLogger.error(`❌ API Error ${response.status}: ${errorText}`);
        throw new Error(errorText);
      }
      
      const data = await response.json();
      telegramLogger.success(`✅ Response: ${JSON.stringify(data).substring(0, 100)}...`);
      return data;
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        telegramLogger.error('⏰ Upload timeout (60s)');
        throw new Error('Тайм-аут загрузки');
      }
      
      telegramLogger.error(`❌ Request failed: ${error.name} - ${error.message}`);
      throw error;
    }
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = getApiUrl(endpoint);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);
    
    const config: RequestInit = {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        // Подставляем заголовок с данными пользователя, если он сохранен локально
        ...(typeof options.headers === 'object' ? options.headers : {}),
        ...(localStorage.getItem('telegram_user') ? { 'x-telegram-user': btoa(unescape(encodeURIComponent(localStorage.getItem('telegram_user') || ''))) } : {})
      },
      ...options,
    };

    telegramLogger.info(`🚀 ${options.method || 'GET'} ${url}`);
    
    if (options.body) {
      telegramLogger.info(`📦 Body: ${options.body}`);
    }

    try {
      const response = await fetch(url, config);
      clearTimeout(timeoutId);
      
      telegramLogger.info(`📊 Status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        let errorText = 'Unknown error';
        let errorData = null;
        
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            errorData = await response.json();
            errorText = errorData.error || errorData.message || JSON.stringify(errorData);
          } else {
            errorText = await response.text();
          }
        } catch (e) {
          errorText = `Failed to read error response`;
        }
        
        telegramLogger.error(`❌ API Error ${response.status}: ${errorText}`);
        
        // Специальная обработка для 302 редиректов (тунели с авторизацией)
        if (response.status === 302) {
          const location = response.headers.get('location');
          if (location && location.includes('auth')) {
            throw new Error('Тунель требует авторизации. Используйте ngrok или localtunnel');
          }
        }
        
        // Убираем HTML теги из ошибки
        const cleanError = errorText.replace(/<[^>]*>/g, '').trim() || 'Server error';
        throw new Error(cleanError.length > 200 ? cleanError.substring(0, 200) + '...' : cleanError);
      }
      
      const data = await response.json();
      telegramLogger.success(`✅ Response: ${JSON.stringify(data).substring(0, 100)}...`);
      return data;
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        telegramLogger.error('⏰ Request timeout (15s)');
        throw new Error('Тайм-аут запроса');
      }
      
      // Дополнительная диагностика
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        telegramLogger.error('❌ Нет соединения с сервером. Проверьте URL и доступность сервера');
      }
      
      telegramLogger.error(`❌ Request failed: ${error.name} - ${error.message}`);
      throw error;
    }
  }

  // Users API
  async getUsers() {
    return this.request('/users');
  }

  // Services API
  async getServices() {
    return this.request('/services');
  }

  async getServiceById(id: number) {
    return this.request(`/services/${id}`);
  }

  async getServicesByOwner(ownerId: number) {
    return this.request(`/services/owner/${ownerId}`);
  }

  async createService(serviceData: any) {
    return this.request('/services', {
      method: 'POST',
      body: JSON.stringify(serviceData),
    });
  }

  async updateService(id: number, serviceData: any) {
    return this.request(`/services/${id}`, {
      method: 'PUT',
      body: JSON.stringify(serviceData),
    });
  }

  async deleteService(id: number) {
    return this.request(`/services/${id}`, {
      method: 'DELETE',
    });
  }

  // Employees API
  async getEmployeesByService(serviceId: number) {
    return this.request(`/employees/service/${serviceId}`);
  }

  async getEmployeesByUser(userId: number) {
    return this.request(`/employees/user/${userId}`);
  }

  async addEmployee(employeeData: any) {
    return this.request('/employees', {
      method: 'POST',
      body: JSON.stringify(employeeData),
    });
  }

  async updateEmployee(id: number, employeeData: any) {
    return this.request(`/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(employeeData),
    });
  }

  async removeEmployee(id: number) {
    return this.request(`/employees/${id}`, {
      method: 'DELETE',
    });
  }

  async checkPermission(userId: number, serviceId: number, permission: string) {
    return this.request(`/employees/permission/${userId}/${serviceId}/${permission}`);
  }

  async hireEmployee(employeeData: any) {
    return this.request('/employees/hire', {
      method: 'POST',
      body: JSON.stringify(employeeData),
    });
  }

  // Hiring Queue API
  async addToHiringQueue(userId: number) {
    return this.request('/hiring-queue', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  }

  async getHiringQueue(employerId: number) {
    return this.request(`/hiring-queue/employer/${employerId}`);
  }

  async approveCandidate(queueId: number, employerId: number) {
    return this.request(`/hiring-queue/${queueId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ employerId }),
    });
  }

  async rejectCandidate(queueId: number, employerId: number) {
    return this.request(`/hiring-queue/${queueId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ employerId }),
    });
  }

  async getUserById(id: number) {
    return this.request(`/users/${id}`);
  }

  async createOrUpdateUser(userData: any) {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async updateUserRole(id: number, role: string) {
    return this.request(`/users/${id}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  }

  // Orders API
  async getOrders() {
    return this.request('/orders');
  }

  async getOrderById(id: number) {
    return this.request(`/orders/${id}`);
  }

  async createOrder(orderData: any) {
    // Если есть фото, используем FormData
    if (orderData.photos && orderData.photos.length > 0) {
      const formData = new FormData();
      
      // Добавляем текстовые поля
      formData.append('orderNumber', orderData.orderNumber);
      formData.append('created_by', orderData.created_by);
      formData.append('created_by_id', orderData.created_by_id.toString());
      formData.append('comment', orderData.comment || '');
      
      // Добавляем файлы
      orderData.photos.forEach((photo: File) => {
        formData.append('photos', photo);
      });
      
      return this.requestFormData('/orders', {
        method: 'POST',
        body: formData,
      });
    }
    
    // Обычный JSON запрос без фото
    return this.request('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  }

  async updateOrder(id: number, orderData: any) {
    return this.request(`/orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(orderData),
    });
  }

  async updateOrderWithPhotos(id: number, orderData: any) {
    // Если есть фото, используем FormData
    if (orderData.photos && orderData.photos.length > 0) {
      const formData = new FormData();
      
      // Добавляем текстовые поля
      formData.append('orderNumber', orderData.orderNumber || '');
      formData.append('comment', orderData.comment || '');
      
      // Добавляем файлы
      orderData.photos.forEach((photo: File) => {
        formData.append('photos', photo);
      });
      
      return this.requestFormData(`/orders/${id}`, {
        method: 'PUT',
        body: formData,
      });
    }
    
    // Обычный JSON запрос без фото
    return this.updateOrder(id, orderData);
  }

  async deleteOrder(id: number) {
    return this.request(`/orders/${id}`, {
      method: 'DELETE',
    });
  }

  // Health check
  async healthCheck() {
    return this.request('/health');
  }

  // User initialization with session
  async initUser(userData: any) {
    return this.request('/init', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  // Session management
  async closeSession(sessionId: string): Promise<void> {
    await this.request('/session/close', {
      method: 'POST',
      body: JSON.stringify({ sessionId })
    });
  }

  async pingSession(sessionId: string): Promise<{ valid: boolean }> {
    return this.request('/session/ping', {
      method: 'POST',
      body: JSON.stringify({ sessionId })
    });
  }

  async getSessionStats(): Promise<{ total: number; active: number; expired: number }> {
    return this.request('/sessions/stats');
  }
  
  // Получение статуса сервера
  getServerStatus(): { available: boolean; baseUrl: string } {
    return {
      available: this.isServerAvailable,
      baseUrl: API_CONFIG.BASE_URL
    };
  }
  
  // Получение базового URL для прямых запросов
  getBaseUrl(): string {
    return API_CONFIG.BASE_URL;
  }
  
  // Общие методы для работы с API
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }
  
  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    });
  }
  
  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    });
  }
  
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const apiService = new ApiService();
export default apiService;