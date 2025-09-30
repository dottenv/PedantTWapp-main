import React, { useState, useEffect } from 'react';
import { TelegramAPI } from '../utils/telegram-api-core';
import { useBackButton } from '../hooks/useBackButton';
import { useLocalization } from '../hooks/useLocalization';
import { apiService } from '../services/api';
import type { Service, ServiceEmployee } from '../types/service';
import { showSuccess, showError } from './ToastManager';

interface EmployeeManagementProps {
  onBack: () => void;
  userId: number;
}

interface EmployeeWithUser extends ServiceEmployee {
  user: any;
  serviceName: string;
}

const EmployeeManagement: React.FC<EmployeeManagementProps> = ({ onBack, userId }) => {
  const [services, setServices] = useState<Service[]>([]);
  const [employees, setEmployees] = useState<EmployeeWithUser[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<EmployeeWithUser[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [selectedEmployees, setSelectedEmployees] = useState<Set<number>>(new Set());
  const [massOperationsMode, setMassOperationsMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useLocalization();

  useBackButton(onBack);

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      const userServices = await apiService.getServicesByOwner(userId);
      setServices(userServices);
      
      const allEmployees: EmployeeWithUser[] = [];
      
      for (const service of userServices) {
        try {
          const serviceEmployees = await apiService.getEmployeesByService(service.id);
          const employeesWithService = serviceEmployees.map((emp: any) => ({
            ...emp,
            serviceName: service.name,
            serviceNumber: service.serviceNumber
          }));
          allEmployees.push(...employeesWithService);
        } catch (error) {
          console.error(`Ошибка загрузки сотрудников для сервиса ${service.id}:`, error);
        }
      }
      
      setEmployees(allEmployees);
      
      if (userServices.length > 0 && !selectedServiceId) {
        setSelectedServiceId(userServices[0].id);
      }
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
      setServices([]);
      setEmployees([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let filtered = employees.filter(emp => emp.role !== 'owner');
    
    // Фильтр по сервису
    if (selectedServiceId) {
      filtered = filtered.filter(emp => emp.serviceId === selectedServiceId);
    }
    
    // Поиск
    if (searchQuery) {
      const searchTerm = searchQuery.toLowerCase();
      filtered = filtered.filter(emp => {
        const name = emp.user?.name || emp.user?.first_name || '';
        const username = emp.user?.username || '';
        return name.toLowerCase().includes(searchTerm) || 
               username.toLowerCase().includes(searchTerm);
      });
    }
    
    setFilteredEmployees(filtered);
  }, [employees, selectedServiceId, searchQuery]);

  const toggleMassOperations = () => {
    setMassOperationsMode(!massOperationsMode);
    setSelectedEmployees(new Set());
    TelegramAPI.vibrate('light');
  };

  const toggleEmployeeSelection = (employeeId: number) => {
    const newSelected = new Set(selectedEmployees);
    if (newSelected.has(employeeId)) {
      newSelected.delete(employeeId);
    } else {
      newSelected.add(employeeId);
    }
    setSelectedEmployees(newSelected);
    TelegramAPI.vibrate('light');
  };

  const selectAll = () => {
    const newSelected = new Set(selectedEmployees);
    filteredEmployees.forEach(emp => newSelected.add(emp.id));
    setSelectedEmployees(newSelected);
    TelegramAPI.vibrate('light');
  };

  const clearSelection = () => {
    setSelectedEmployees(new Set());
    TelegramAPI.vibrate('light');
  };

  const toggleSearch = () => {
    setShowSearch(!showSearch);
    if (showSearch) {
      setSearchQuery('');
    }
    TelegramAPI.vibrate('light');
  };

  const handleMassDelete = async () => {
    if (selectedEmployees.size === 0) return;
    
    if (!confirm(`Удалить ${selectedEmployees.size} сотрудников?`)) {
      return;
    }

    try {
      let deleted = 0;
      for (const employeeId of selectedEmployees) {
        try {
          await apiService.removeEmployee(employeeId);
          deleted++;
        } catch (error) {
          console.error(`Ошибка удаления сотрудника ${employeeId}:`, error);
        }
      }
      
      if (deleted > 0) {
        showSuccess(`Удалено ${deleted} сотрудников`);
        TelegramAPI.vibrate('success');
        await loadData();
        setSelectedEmployees(new Set());
      }
      
      if (deleted < selectedEmployees.size) {
        showError(`Не удалось удалить ${selectedEmployees.size - deleted} сотрудников`);
      }
    } catch (error) {
      console.error('Ошибка массового удаления:', error);
      showError('Ошибка удаления');
      TelegramAPI.vibrate('error');
    }
  };

  const handleMassRoleChange = async (newRole: string) => {
    if (selectedEmployees.size === 0) return;
    
    try {
      let updated = 0;
      for (const employeeId of selectedEmployees) {
        try {
          await apiService.updateEmployee(employeeId, { role: newRole });
          updated++;
        } catch (error) {
          console.error(`Ошибка обновления роли сотрудника ${employeeId}:`, error);
        }
      }
      
      if (updated > 0) {
        showSuccess(`Обновлено ${updated} сотрудников`);
        TelegramAPI.vibrate('success');
        await loadData();
        setSelectedEmployees(new Set());
      }
    } catch (error) {
      showError('Ошибка массового обновления');
      TelegramAPI.vibrate('error');
    }
  };

  const handleRoleChange = async (employeeId: number, newRole: string) => {
    try {
      await apiService.updateEmployee(employeeId, { role: newRole });
      showSuccess('Роль обновлена');
      await loadData();
      TelegramAPI.vibrate('success');
    } catch (error: any) {
      console.error('Ошибка обновления роли:', error);
      showError(error.message || 'Ошибка обновления роли');
      TelegramAPI.vibrate('error');
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'owner': return 'Владелец';
      case 'manager': return 'Менеджер';
      case 'employee': return 'Сотрудник';
      default: return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'role-owner';
      case 'manager': return 'role-manager';
      case 'employee': return 'role-employee';
      default: return '';
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return 'Неизвестно';
    }
  };

  return (
    <div className="employees-container">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon"><i className="fas fa-users"></i></div>
          <div className="stat-info">
            <div className="stat-value">{filteredEmployees.length}</div>
            <div className="stat-label">Сотрудников</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><i className="fas fa-user-tie"></i></div>
          <div className="stat-info">
            <div className="stat-value">{filteredEmployees.filter(e => e.role === 'manager').length}</div>
            <div className="stat-label">Менеджеров</div>
          </div>
        </div>
      </div>
      
      <div className="card">
        <div className="card-title">
          {!showSearch ? (
            <>
              <div className="card-title-left">
                <i className="fas fa-users"></i>
                Управление сотрудниками
              </div>
              <div className="card-title-right">
                <button 
                  className="btn btn-secondary btn-sm" 
                  onClick={toggleMassOperations}
                  title="Массовые операции"
                >
                  <i className="fas fa-check-square"></i>
                </button>
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={() => loadData()}
                  title="Обновить"
                >
                  <i className="fas fa-sync-alt"></i>
                </button>
                <button 
                  className={`btn btn-sm ${searchQuery ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={toggleSearch}
                  title="Поиск"
                >
                  <i className="fas fa-search"></i>
                </button>
              </div>
            </>
          ) : (
            <div className="search-container">
              <input 
                type="text" 
                className="search-input"
                placeholder="Имя сотрудника..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              <button className="btn btn-secondary btn-sm" onClick={toggleSearch}>
                <i className="fas fa-times"></i>
              </button>
            </div>
          )}
        </div>
        <div className="card-content">
          {services.length > 0 && (
            <div className="service-filter" style={{ marginBottom: '16px' }}>
              <select 
                className="form-select"
                value={selectedServiceId || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setSelectedServiceId(value ? parseInt(value) : null);
                  TelegramAPI.vibrate('light');
                }}
              >
                <option value="">Все сервисы</option>
                {services.map(service => (
                  <option key={service.id} value={service.id}>
                    #{service.serviceNumber} {service.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          {/* Панель массовых операций */}
          {massOperationsMode && (
            <div className="mass-operations-panel" style={{ marginBottom: '16px' }}>
              <div className="mass-operations-header">
                <span>Выбрано: {selectedEmployees.size}</span>
                <div className="mass-operations-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button 
                    className="btn btn-sm btn-danger" 
                    onClick={handleMassDelete}
                    disabled={selectedEmployees.size === 0}
                    title="Удалить выбранных"
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                  <select 
                    className="btn btn-sm btn-info"
                    onChange={(e) => {
                      if (e.target.value) {
                        handleMassRoleChange(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    disabled={selectedEmployees.size === 0}
                    style={{ minWidth: '120px' }}
                  >
                    <option value="">Изменить роль</option>
                    <option value="employee">Сотрудник</option>
                    <option value="manager">Менеджер</option>
                  </select>
                  <button className="btn btn-sm btn-secondary" onClick={selectAll} title="Выбрать всех">
                    <i className="fas fa-check-double"></i>
                  </button>
                  <button className="btn btn-sm btn-secondary" onClick={clearSelection} title="Очистить выбор">
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Список сотрудников */}
          <div className="users-list-container">
            <div className="users-list">
              {isLoading ? (
                <div className="loading-skeleton">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="skeleton-item">
                      <div className="skeleton-avatar"></div>
                      <div className="skeleton-content">
                        <div className="skeleton-line skeleton-title"></div>
                        <div className="skeleton-line skeleton-subtitle"></div>
                        <div className="skeleton-badges">
                          <div className="skeleton-badge"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredEmployees.length === 0 ? (
                <div className="empty-state">
                  <i className="fas fa-users" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}></i>
                  <div>Сотрудники не найдены</div>
                  <button 
                    className="btn btn-primary btn-sm"
                    onClick={() => loadData()}
                    style={{ marginTop: '16px' }}
                  >
                    <i className="fas fa-sync-alt"></i> Обновить
                  </button>
                </div>
              ) : (
                filteredEmployees.map(employee => (
                  <div 
                    key={employee.id}
                    className={`user-item ${massOperationsMode ? 'mass-mode' : ''}`}
                    onClick={() => massOperationsMode && toggleEmployeeSelection(employee.id)}
                  >
                    {massOperationsMode && (
                      <div className="user-checkbox">
                        <input 
                          type="checkbox" 
                          checked={selectedEmployees.has(employee.id)}
                          onChange={() => toggleEmployeeSelection(employee.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    )}
                    <div className="user-avatar">
                      <div className="avatar-placeholder">
                        {employee.user?.first_name?.charAt(0) || 'U'}
                      </div>
                    </div>
                    <div className="user-info">
                      <div className="user-name">
                        {employee.user?.name || employee.user?.first_name || `User ${employee.userId}`}
                      </div>
                      <div className="user-details">
                        {employee.serviceName} • {formatDate(employee.joinedAt)}
                      </div>
                      <div className="user-meta">
                        <span className={`role-badge ${getRoleColor(employee.role)}`}>
                          {getRoleText(employee.role)}
                        </span>
                        <span className={`status-badge status-${employee.status}`}>
                          {employee.status === 'active' ? 'Активен' : 'Неактивен'}
                        </span>
                      </div>
                    </div>
                    {!massOperationsMode && employee.role !== 'owner' && (
                      <div className="user-actions">
                        <select 
                          className="btn btn-sm btn-secondary"
                          value={employee.role}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleRoleChange(employee.id, e.target.value);
                          }}
                          title="Изменить роль"
                          style={{ marginRight: '4px', fontSize: '12px' }}
                        >
                          <option value="employee">Сотрудник</option>
                          <option value="manager">Менеджер</option>
                        </select>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeManagement;