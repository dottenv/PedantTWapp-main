import { ServiceEmployee } from '../models/ServiceEmployee.js';
import { ValidationUtils } from '../utils/validationUtils.js';
import { LoggerUtils } from '../utils/loggerUtils.js';

export class EmployeeService {
  constructor(db, userService = null) {
    this.db = db;
    this.userService = userService;
  }

  async getAllEmployees() {
    LoggerUtils.logInfo('[EMPLOYEE_SERVICE] Получение всех сотрудников');
    await this.db.read();
    const employees = this.db.data.serviceEmployees?.map(emp => ServiceEmployee.fromJSON(emp)) || [];
    LoggerUtils.logSuccess(`[EMPLOYEE_SERVICE] Найдено сотрудников: ${employees.length}`);
    return employees;
  }

  async getEmployeesByService(serviceId) {
    LoggerUtils.logInfo(`[EMPLOYEE_SERVICE] Получение сотрудников для сервиса: ${serviceId}`);
    await this.db.read();
    
    const employees = this.db.data.serviceEmployees?.filter(emp => {
      return emp.serviceId === parseInt(serviceId);
    }) || [];
    
    LoggerUtils.logSuccess(`[EMPLOYEE_SERVICE] Найдено сотрудников для сервиса ${serviceId}: ${employees.length}`);
    return employees.map(emp => ServiceEmployee.fromJSON(emp));
  }

  async getEmployeesByUser(userId) {
    await this.db.read();
    const employees = this.db.data.serviceEmployees?.filter(emp => emp.userId === parseInt(userId)) || [];
    return employees.map(emp => ServiceEmployee.fromJSON(emp));
  }

  async getEmployeeById(id) {
    await this.db.read();
    const empData = this.db.data.serviceEmployees?.find(emp => emp.id === parseInt(id));
    return empData ? ServiceEmployee.fromJSON(empData) : null;
  }

  async addEmployee(employeeData) {
    LoggerUtils.logInfo('[EMPLOYEE_SERVICE] Добавление нового сотрудника', employeeData);
    await this.db.read();
    
    try {
      // Валидация обязательных полей
      ValidationUtils.validateRequired(employeeData, ['serviceId', 'userId', 'invitedBy']);
      LoggerUtils.logSuccess('[EMPLOYEE_SERVICE] Валидация данных пройдена');

      // Инициализация массива если не существует
      if (!this.db.data.serviceEmployees) {
        this.db.data.serviceEmployees = [];
        LoggerUtils.logInfo('[EMPLOYEE_SERVICE] Инициализирован массив serviceEmployees');
      }

      // Проверяем, не существует ли уже такой сотрудник
      const existingEmployee = this.db.data.serviceEmployees.find(emp => 
        emp.userId === parseInt(employeeData.userId) && 
        emp.serviceId === parseInt(employeeData.serviceId)
      );
      
      if (existingEmployee) {
        LoggerUtils.logInfo(`[EMPLOYEE_SERVICE] Сотрудник уже существует: userId=${employeeData.userId}, serviceId=${employeeData.serviceId}`);
        return ServiceEmployee.fromJSON(existingEmployee);
      }

      // Генерируем уникальный ID
      const maxId = this.db.data.serviceEmployees.reduce((max, emp) => Math.max(max, emp.id || 0), 0);
      const newId = maxId + 1;
      LoggerUtils.logInfo(`[EMPLOYEE_SERVICE] Сгенерирован ID для нового сотрудника: ${newId}`);
      
      const employee = new ServiceEmployee({
        ...employeeData,
        id: newId,
        serviceId: parseInt(employeeData.serviceId),
        userId: parseInt(employeeData.userId),
        invitedBy: parseInt(employeeData.invitedBy)
      });

      const employeeJSON = employee.toJSON();
      LoggerUtils.logInfo('[EMPLOYEE_SERVICE] Данные сотрудника для сохранения:', employeeJSON);
      
      this.db.data.serviceEmployees.push(employeeJSON);
      LoggerUtils.logSuccess(`[EMPLOYEE_SERVICE] Сотрудник добавлен в БД с ID: ${newId}`);
      
      // Сохраняем изменения в БД ПЕРЕД обновлением пользователя
      await this.db.write();
      LoggerUtils.logSuccess('[EMPLOYEE_SERVICE] Данные сохранены в БД');
      
      // Обновляем пользователя - добавляем сервис в employeeServices
      if (this.userService) {
        await this.userService.addEmployeeService(employeeData.userId, employeeData.serviceId);
        LoggerUtils.logSuccess(`[EMPLOYEE_SERVICE] Сервис ${employeeData.serviceId} добавлен пользователю ${employeeData.userId}`);
      }

      // Проверяем, что данные действительно сохранились
      await this.db.read();
      const savedEmployee = this.db.data.serviceEmployees.find(emp => emp.id === newId);
      if (savedEmployee) {
        LoggerUtils.logSuccess(`[EMPLOYEE_SERVICE] Подтверждено: сотрудник сохранен в БД с ID: ${newId}`);
      } else {
        LoggerUtils.logError(`[EMPLOYEE_SERVICE] ОШИБКА: сотрудник не найден в БД после сохранения!`);
      }
      
      return employee;
    } catch (error) {
      LoggerUtils.logError('[EMPLOYEE_SERVICE] Ошибка добавления сотрудника', error);
      throw error;
    }
  }

  async updateEmployee(id, updateData) {
    await this.db.read();
    
    if (!this.db.data.serviceEmployees) {
      return null;
    }

    const index = this.db.data.serviceEmployees.findIndex(emp => emp.id === parseInt(id));
    if (index === -1) return null;

    const existingEmployee = this.db.data.serviceEmployees[index];
    const updatedEmployee = new ServiceEmployee({
      ...existingEmployee,
      ...updateData,
      id: parseInt(id)
    });

    this.db.data.serviceEmployees[index] = updatedEmployee.toJSON();
    await this.db.write();
    
    return updatedEmployee;
  }

  async removeEmployee(id) {
    await this.db.read();
    
    if (!this.db.data.serviceEmployees) {
      return false;
    }

    const index = this.db.data.serviceEmployees.findIndex(emp => emp.id === parseInt(id));
    if (index === -1) return false;

    const employee = this.db.data.serviceEmployees[index];
    this.db.data.serviceEmployees.splice(index, 1);
    
    // Обновляем пользователя - удаляем сервис из employeeServices
    if (this.userService) {
      await this.userService.removeEmployeeService(employee.userId, employee.serviceId);
    }

    await this.db.write();
    return true;
  }

  async hasPermission(userId, serviceId, permission) {
    LoggerUtils.logInfo(`[EMPLOYEE_SERVICE] Проверка разрешения: userId=${userId}, serviceId=${serviceId}, permission=${permission}`);
    const employees = await this.getEmployeesByService(serviceId);
    const employee = employees.find(emp => emp.userId === parseInt(userId));
    
    if (!employee || employee.status !== 'active') {
      LoggerUtils.logInfo(`[EMPLOYEE_SERVICE] Разрешение отклонено: сотрудник не найден или неактивен`);
      return false;
    }

    // Owner и Manager имеют все права
    if (employee.role === 'owner' || employee.role === 'manager') {
      LoggerUtils.logSuccess(`[EMPLOYEE_SERVICE] Разрешение предоставлено: роль ${employee.role}`);
      return true;
    }

    // Проверяем конкретное разрешение
    const hasPermission = employee.permissions.includes(permission);
    LoggerUtils.logInfo(`[EMPLOYEE_SERVICE] Проверка разрешения ${permission}: ${hasPermission ? 'разрешено' : 'отклонено'}`);
    return hasPermission;
  }
}