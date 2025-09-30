import { LoggerUtils } from '../utils/loggerUtils.js';

export class EmployeesController {
  constructor(employeeService, userService) {
    this.employeeService = employeeService;
    this.userService = userService;
  }

  async getEmployeesByService(req, res) {
    const { serviceId } = req.params;
    LoggerUtils.logInfo(`[EMPLOYEES_API] Получение сотрудников сервиса: ${serviceId}`);
    try {
      const employees = await this.employeeService.getEmployeesByService(serviceId);
      LoggerUtils.logInfo(`[EMPLOYEES_API] Найдено сотрудников: ${employees.length}`);
      
      // Получаем информацию о пользователях для каждого сотрудника
      const employeesWithUserInfo = [];
      for (const employee of employees) {
        const user = await this.userService.getUserById(employee.userId);
        
        employeesWithUserInfo.push({
          ...employee.toJSON(),
          user: user ? user.toJSON() : null
        });
      }
      
      LoggerUtils.logSuccess(`[EMPLOYEES_API] Сотрудники сервиса ${serviceId} успешно получены`);
      res.json(employeesWithUserInfo);
    } catch (error) {
      LoggerUtils.logError('[EMPLOYEES_API] Ошибка получения сотрудников сервиса', error);
      res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  async getEmployeesByUser(req, res) {
    try {
      const { userId } = req.params;
      const employees = await this.employeeService.getEmployeesByUser(userId);
      res.json(employees);
    } catch (error) {
      console.error('Ошибка получения сервисов пользователя:', error);
      res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  async addEmployee(req, res) {
    try {
      const employeeData = req.body;
      const employee = await this.employeeService.addEmployee(employeeData);
      
      res.status(201).json({
        success: true,
        message: 'Сотрудник добавлен',
        employee: employee
      });
    } catch (error) {
      console.error('Ошибка добавления сотрудника:', error);
      res.status(400).json({ 
        success: false,
        error: error.message || 'Ошибка добавления сотрудника' 
      });
    }
  }

  async updateEmployee(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const employee = await this.employeeService.updateEmployee(id, updateData);
      
      if (!employee) {
        return res.status(404).json({ 
          success: false,
          error: 'Сотрудник не найден' 
        });
      }
      
      res.json({
        success: true,
        message: 'Данные сотрудника обновлены',
        employee: employee
      });
    } catch (error) {
      console.error('Ошибка обновления сотрудника:', error);
      res.status(500).json({ 
        success: false,
        error: error.message || 'Внутренняя ошибка сервера' 
      });
    }
  }

  async removeEmployee(req, res) {
    try {
      const { id } = req.params;
      const removed = await this.employeeService.removeEmployee(id);
      
      if (!removed) {
        return res.status(404).json({ error: 'Сотрудник не найден' });
      }
      
      res.json({
        success: true,
        message: 'Сотрудник удален'
      });
    } catch (error) {
      console.error('Ошибка удаления сотрудника:', error);
      res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  async checkPermission(req, res) {
    try {
      const { userId, serviceId, permission } = req.params;
      const hasPermission = await this.employeeService.hasPermission(userId, serviceId, permission);
      
      res.json({
        hasPermission: hasPermission
      });
    } catch (error) {
      console.error('Ошибка проверки разрешений:', error);
      res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  async hireEmployee(req, res) {
    const { userId, serviceId, ownerId } = req.body;
    LoggerUtils.logInfo(`[HIRE] 🚀 Начало найма: userId=${userId}, serviceId=${serviceId}, ownerId=${ownerId}`);
    
    try {
      // Проверяем владельца
      LoggerUtils.logInfo('[HIRE] 🔍 Проверка прав владельца...');
      const owner = await this.userService.getUserById(ownerId);
      LoggerUtils.logInfo(`[HIRE] 👤 Владелец найден: ${!!owner}, сервисы: ${JSON.stringify(owner?.ownedServices)}`);
      
      if (!owner || !owner.ownedServices.includes(parseInt(serviceId))) {
        LoggerUtils.logError('[HIRE] ❌ Нет прав на найм');
        return res.status(403).json({ 
          success: false,
          error: 'Нет прав на найм в этот сервис' 
        });
      }
      LoggerUtils.logSuccess('[HIRE] ✅ Права владельца подтверждены');
      
      // Проверяем текущее состояние БД
      LoggerUtils.logInfo('[HIRE] 📊 Проверка текущего состояния БД...');
      const currentEmployees = await this.employeeService.getEmployeesByService(serviceId);
      LoggerUtils.logInfo(`[HIRE] 👥 Текущие сотрудники сервиса ${serviceId}: ${currentEmployees.length}`);
      currentEmployees.forEach(emp => {
        LoggerUtils.logInfo(`[HIRE] - ID: ${emp.id}, userId: ${emp.userId}, role: ${emp.role}`);
      });
      
      // Проверяем, не нанят ли уже
      const existingEmployee = currentEmployees.find(emp => emp.userId === parseInt(userId));
      if (existingEmployee) {
        LoggerUtils.logInfo('[HIRE] ℹ️ Сотрудник уже нанят, возвращаем существующую запись');
        return res.json({
          success: true,
          message: 'Сотрудник уже нанят',
          employee: existingEmployee.toJSON()
        });
      }
      
      // Создаем данные сотрудника
      const employeeData = {
        serviceId: parseInt(serviceId),
        userId: parseInt(userId),
        role: 'employee',
        permissions: ['create_orders', 'view_orders', 'edit_orders'],
        status: 'active',
        invitedBy: parseInt(ownerId)
      };
      
      LoggerUtils.logInfo('[HIRE] 💾 Добавление сотрудника в БД...', employeeData);
      const employee = await this.employeeService.addEmployee(employeeData);
      LoggerUtils.logSuccess(`[HIRE] ✅ Сотрудник добавлен с ID: ${employee.id}`);
      
      // Проверяем, что сотрудник действительно добавлен
      LoggerUtils.logInfo('[HIRE] 🔍 Проверка добавления в БД...');
      const verifyEmployees = await this.employeeService.getEmployeesByService(serviceId);
      const addedEmployee = verifyEmployees.find(emp => emp.userId === parseInt(userId));
      if (addedEmployee) {
        LoggerUtils.logSuccess(`[HIRE] ✅ ПОДТВЕРЖДЕНО: Сотрудник найден в БД с ID: ${addedEmployee.id}`);
      } else {
        LoggerUtils.logError('[HIRE] ❌ ОШИБКА: Сотрудник НЕ найден в БД после добавления!');
      }
      
      // Обновляем пользователя
      LoggerUtils.logInfo('[HIRE] 👤 Обновление статуса пользователя...');
      await this.userService.updateUser(userId, {
        registrationStatus: 'employee',
        activeServiceId: parseInt(serviceId)
      });
      LoggerUtils.logSuccess('[HIRE] ✅ Статус пользователя обновлен');
      
      LoggerUtils.logSuccess(`[HIRE] 🎉 Найм завершен успешно: userId=${userId} -> serviceId=${serviceId}`);
      res.json({
        success: true,
        message: 'Сотрудник нанят',
        employee: employee.toJSON()
      });
    } catch (error) {
      LoggerUtils.logError('[HIRE] 💥 Критическая ошибка найма:', error);
      LoggerUtils.logError(`[HIRE] Stack trace: ${error.stack}`);
      res.status(500).json({ 
        success: false,
        error: error.message || 'Ошибка найма сотрудника' 
      });
    }
  }
}