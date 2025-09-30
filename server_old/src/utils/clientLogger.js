/**
 * Утилита для отправки логов на клиент через Server-Sent Events
 */

class ClientLogger {
  constructor() {
    this.clients = new Set();
  }

  // Добавление клиента для получения логов
  addClient(res) {
    this.clients.add(res);
    
    // Настройка SSE
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Отправляем начальное сообщение
    res.write('data: {"type":"connected","message":"Подключен к логам сервера"}\n\n');

    // Удаляем клиента при отключении
    res.on('close', () => {
      this.clients.delete(res);
    });
  }

  // Отправка лога всем подключенным клиентам
  sendLog(type, message, data = null) {
    if (this.clients.size === 0) return;

    const logData = {
      type,
      message,
      data,
      timestamp: new Date().toISOString()
    };

    const eventData = `data: ${JSON.stringify(logData)}\n\n`;

    // Отправляем всем подключенным клиентам
    for (const client of this.clients) {
      try {
        client.write(eventData);
      } catch (error) {
        // Удаляем отключенных клиентов
        this.clients.delete(client);
      }
    }
  }

  logSuccess(message, data = null) {
    this.sendLog('success', message, data);
  }

  logError(message, error = null) {
    this.sendLog('error', message, error?.message || error);
  }

  logInfo(message, data = null) {
    this.sendLog('info', message, data);
  }

  logWarning(message, data = null) {
    this.sendLog('warning', message, data);
  }

  logDebug(message, data = null) {
    this.sendLog('debug', message, data);
  }
}

// Создаем глобальный экземпляр
export const clientLogger = new ClientLogger();