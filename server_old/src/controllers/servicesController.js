export class ServicesController {
  constructor(serviceService, employeeService) {
    this.serviceService = serviceService;
    this.employeeService = employeeService;
  }

  async getAllServices(req, res) {
    try {
      const services = await this.serviceService.getAllServices();
      res.json(services);
    } catch (error) {
      console.error('Ошибка получения сервисов:', error);
      res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  async getServiceById(req, res) {
    try {
      const { id } = req.params;
      const service = await this.serviceService.getServiceById(id);
      
      if (!service) {
        return res.status(404).json({ error: 'Сервис не найден' });
      }
      
      res.json(service);
    } catch (error) {
      console.error('Ошибка получения сервиса:', error);
      res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  async getServicesByOwner(req, res) {
    try {
      const { ownerId } = req.params;
      const services = await this.serviceService.getServicesByOwner(ownerId);
      res.json(services);
    } catch (error) {
      console.error('Ошибка получения сервисов владельца:', error);
      res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  async createService(req, res) {
    try {
      const serviceData = req.body;
      const service = await this.serviceService.createService(serviceData);
      
      // Обновляем пользователя - добавляем сервис в ownedServices
      if (service && service.ownerId) {
        const { UserService } = await import('../services/userService.js');
        const userService = new UserService(this.serviceService.db);
        const user = await userService.getUserById(service.ownerId);
        
        if (user) {
          const updatedOwnedServices = [...(user.ownedServices || []), service.id];
          const updateData = {
            ownedServices: updatedOwnedServices,
            activeServiceId: service.id
          };
          
          // Если это первый сервис, делаем пользователя админом
          if (user.ownedServices.length === 0) {
            updateData.role = 'admin';
          }
          
          await userService.updateUser(service.ownerId, updateData);
        }
      }
      
      res.status(201).json({
        success: true,
        message: 'Сервис создан',
        service: service
      });
    } catch (error) {
      console.error('Ошибка создания сервиса:', error);
      res.status(400).json({ 
        success: false,
        error: error.message || 'Ошибка создания сервиса' 
      });
    }
  }

  async updateService(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const service = await this.serviceService.updateService(id, updateData);
      
      if (!service) {
        return res.status(404).json({ 
          success: false,
          error: 'Сервис не найден' 
        });
      }
      
      res.json({
        success: true,
        message: 'Сервис обновлен',
        service: service
      });
    } catch (error) {
      console.error('Ошибка обновления сервиса:', error);
      res.status(500).json({ 
        success: false,
        error: error.message || 'Внутренняя ошибка сервера' 
      });
    }
  }

  async deleteService(req, res) {
    try {
      const { id } = req.params;
      const deleted = await this.serviceService.deleteService(id);
      
      if (!deleted) {
        return res.status(404).json({ error: 'Сервис не найден' });
      }
      
      res.json({
        success: true,
        message: 'Сервис удален'
      });
    } catch (error) {
      console.error('Ошибка удаления сервиса:', error);
      res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }
}