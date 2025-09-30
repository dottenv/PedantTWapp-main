export class OrdersController {
  constructor(orderService, employeeService = null) {
    this.orderService = orderService;
    this.employeeService = employeeService;
  }

  async getAllOrders(req, res) {
    console.log('📋 GET /api/orders - запрос на получение всех заказов');
    try {
      const orders = await this.orderService.getAllOrders();
      console.log('✅ Заказы получены, количество:', orders.length);
      console.log('📤 Отправляем ответ клиенту:', orders);
      res.json(orders);
    } catch (error) {
      console.error('❌ Ошибка получения заказов:', error);
      res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  async getOrderById(req, res) {
    try {
      const { id } = req.params;
      const order = await this.orderService.getOrderById(id);
      
      if (!order) {
        return res.status(404).json({ error: 'Заказ не найден' });
      }
      
      res.json(order);
    } catch (error) {
      console.error('Ошибка получения заказа:', error);
      res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  async createOrder(req, res) {
    console.log('📝 POST /api/orders - запрос на создание заказа');
    console.log('📥 Данные заказа:', req.body);
    console.log('📷 Файлы:', req.files ? req.files.length : 0);
    try {
      const orderData = req.body;
      
      if (!orderData.created_by_id) {
        console.error('❌ Отсутствует created_by_id');
        return res.status(400).json({ error: 'Telegram ID создателя обязателен' });
      }
      
      if (!orderData.orderNumber) {
        console.error('❌ Отсутствует orderNumber');
        return res.status(400).json({ error: 'Номер заказа обязателен' });
      }
      
      // Проверка разрешений (если указан serviceId)
      if (orderData.serviceId && this.employeeService) {
        const hasPermission = await this.employeeService.hasPermission(
          orderData.created_by_id, 
          orderData.serviceId, 
          'create_orders'
        );
        
        if (!hasPermission) {
          return res.status(403).json({ 
            error: 'Нет разрешения на создание заказов в этом сервисе' 
          });
        }
      }
      
      // Обработка файлов фото (multer)
      const photos = [];
      if (req.files && req.files.length > 0) {
        console.log(`📷 Обрабатываем ${req.files.length} фото`);
        
        const fs = await import('fs/promises');
        const path = await import('path');
        const { fileURLToPath } = await import('url');
        
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const uploadsDir = path.join(__dirname, '../../data/uploads');
        
        // Создаем папку uploads если не существует
        try {
          await fs.access(uploadsDir);
        } catch {
          await fs.mkdir(uploadsDir, { recursive: true });
        }
        
        for (const file of req.files) {
          const timestamp = Date.now();
          const ext = path.extname(file.originalname);
          const filename = `${timestamp}_${Math.random().toString(36).substring(7)}${ext}`;
          const filepath = path.join(uploadsDir, filename);
          
          // Сохраняем файл на диск
          await fs.writeFile(filepath, file.buffer);
          
          photos.push({
            filename: file.originalname,
            savedAs: filename,
            size: file.size,
            mimetype: file.mimetype,
            path: `/uploads/${filename}`
          });
        }
      }
      
      const orderWithPhotos = {
        ...orderData,
        photos: photos,
        photos_count: photos.length
      };
      
      const order = await this.orderService.createOrder(orderWithPhotos);
      
      const response = {
        success: true,
        message: 'Заказ создан',
        order: order
      };
      
      console.log('[SUCCESS] Order created successfully:', response);
      res.status(201).json(response);
    } catch (error) {
      console.error('[ERROR] Order creation failed:', error.message || error);
      res.status(500).json({ 
        success: false,
        error: error.message || 'Внутренняя ошибка сервера' 
      });
    }
  }

  async updateOrder(req, res) {
    console.log('[ORDER] PUT /api/orders/:id - request to update order');
    console.log('[ORDER] Order ID:', req.params.id);
    console.log('[ORDER] Update data:', req.body);
    console.log('[ORDER] Files:', req.files ? req.files.length : 0);
    
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      // Обработка файлов фото (только если есть новые файлы)
      const photos = [];
      if (req.files && req.files.length > 0) {
        console.log(`[ORDER] Processing ${req.files.length} photos`);
        
        const fs = await import('fs/promises');
        const path = await import('path');
        const { fileURLToPath } = await import('url');
        
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const uploadsDir = path.join(__dirname, '../../data/uploads');
        
        try {
          await fs.access(uploadsDir);
        } catch {
          await fs.mkdir(uploadsDir, { recursive: true });
        }
        
        for (const file of req.files) {
          const timestamp = Date.now();
          const ext = path.extname(file.originalname);
          const filename = `${timestamp}_${Math.random().toString(36).substring(7)}${ext}`;
          const filepath = path.join(uploadsDir, filename);
          
          await fs.writeFile(filepath, file.buffer);
          
          photos.push({
            filename: file.originalname,
            savedAs: filename,
            size: file.size,
            mimetype: file.mimetype,
            path: `/uploads/${filename}`
          });
        }
        
        // Получаем текущие фото заказа
        const currentOrder = await this.orderService.getOrderById(id);
        const existingPhotos = currentOrder?.photos || [];
        
        // Добавляем новые фото к существующим
        updateData.photos = [...existingPhotos, ...photos];
        updateData.photos_count = updateData.photos.length;
        
        console.log(`[ORDER] Добавляем ${photos.length} новых фото к ${existingPhotos.length} существующим`);
      } else {
        // Если нет новых фото, оставляем старые без изменений
        console.log('[ORDER] Обновляем только текстовые поля');
      }
      
      const order = await this.orderService.updateOrder(id, updateData);
      
      if (!order) {
        return res.status(404).json({ 
          success: false,
          error: 'Заказ не найден' 
        });
      }
      
      const photoMessage = photos.length > 0 ? ` (добавлено ${photos.length} фото)` : '';
      const response = {
        success: true,
        message: `Заказ #${order.orderNumber || order.id} обновлен${photoMessage}`,
        order: order
      };
      
      console.log('[SUCCESS] Order updated successfully:', response);
      res.json(response);
    } catch (error) {
      console.error('[ERROR] Order update failed:', error);
      res.status(500).json({ 
        success: false,
        error: error.message || 'Внутренняя ошибка сервера' 
      });
    }
  }

  async deleteOrder(req, res) {
    try {
      const { id } = req.params;
      const deleted = await this.orderService.deleteOrder(id);
      
      if (!deleted) {
        return res.status(404).json({ error: 'Заказ не найден' });
      }
      
      res.json({
        success: true,
        message: 'Заказ удален'
      });
    } catch (error) {
      console.error('Ошибка удаления заказа:', error);
      res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  async getNextOrderNumber(req, res) {
    try {
      const { serviceNumber } = req.params;
      
      if (!serviceNumber) {
        return res.status(400).json({ error: 'Номер сервиса обязателен' });
      }
      
      const nextNumber = await this.orderService.generateNextOrderNumber(serviceNumber);
      res.json(nextNumber);
    } catch (error) {
      console.error('Ошибка генерации номера:', error);
      res.status(500).json({ error: 'Ошибка генерации номера заказа' });
    }
  }
}