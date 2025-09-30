/**
 * Утилиты для работы с QR кодами
 */
import { getApiOrigin } from '../config/api';

export class QRUtils {
  /**
   * Создает QR код для заказа
   */
  static createOrderQR(orderId: number, orderNumber?: string): void {
    try {
      // Создаем ссылку на галерею заказа для клиентов
      const baseUrl = window.location.origin;
      // Prefer runtime API origin when available
      const apiOrigin = getApiOrigin() || baseUrl;
      const orderUrl = `${apiOrigin.replace(/\/$/, '')}/gallery.html?order=${orderId}`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&format=png&margin=20&data=${encodeURIComponent(orderUrl)}`;
      
      console.log('🔗 Создаем QR код для заказа:', { orderId, orderNumber, orderUrl, qrUrl });
      
      const qrWindow = window.open('', '_blank', 'width=500,height=650,scrollbars=no,resizable=yes');
      if (qrWindow) {
        qrWindow.document.write(QRUtils.generateQRHTML(orderId, orderNumber || orderId.toString(), qrUrl, orderUrl));
        qrWindow.document.close();
      } else {
        console.error('❌ Не удалось открыть окно QR кода');
        // Fallback - копируем ссылку в буфер обмена
        navigator.clipboard?.writeText(orderUrl).then(() => {
          alert(`QR код: ${orderUrl}\n\nСсылка скопирована в буфер обмена`);
        }).catch(() => {
          alert(`QR код для заказа #${orderNumber || orderId}:\n${orderUrl}`);
        });
      }
    } catch (error) {
      console.error('❌ Ошибка создания QR кода:', error);
    }
  }

  /**
   * Генерирует HTML для QR кода
   */
  private static generateQRHTML(orderId: number, orderNumber: string, qrUrl: string, orderUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>QR-код заказа #${orderNumber}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 20px;
            }
            .container {
              background: white;
              padding: 40px 30px;
              border-radius: 20px;
              box-shadow: 0 20px 40px rgba(0,0,0,0.1);
              max-width: 400px;
              width: 100%;
              text-align: center;
            }
            .header {
              margin-bottom: 30px;
            }
            .order-number {
              font-size: 28px;
              font-weight: 700;
              color: #2c3e50;
              margin-bottom: 8px;
            }
            .subtitle {
              color: #7f8c8d;
              font-size: 16px;
              margin-bottom: 10px;
            }
            .instruction {
              background: #e8f4fd;
              color: #2980b9;
              padding: 12px 16px;
              border-radius: 10px;
              font-size: 14px;
              font-weight: 500;
              margin-bottom: 30px;
            }
            .qr-container {
              background: #f8f9fa;
              padding: 20px;
              border-radius: 15px;
              margin-bottom: 25px;
              display: inline-block;
            }
            .qr-image {
              border-radius: 10px;
              max-width: 100%;
              height: auto;
            }
            .url-container {
              background: #f8f9fa;
              padding: 15px;
              border-radius: 10px;
              border: 2px dashed #dee2e6;
            }
            .url-label {
              font-size: 12px;
              color: #6c757d;
              margin-bottom: 8px;
              text-transform: uppercase;
              font-weight: 600;
              letter-spacing: 0.5px;
            }
            .url {
              word-break: break-all;
              font-size: 13px;
              color: #495057;
              font-family: 'Monaco', 'Menlo', monospace;
              line-height: 1.4;
            }
            .footer {
              margin-top: 25px;
              padding-top: 20px;
              border-top: 1px solid #dee2e6;
              color: #6c757d;
              font-size: 12px;
            }
            @media print {
              body { background: white; }
              .container { box-shadow: none; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="order-number">Заказ #${orderNumber}</div>
              <div class="subtitle">Галерея фотографий</div>
            </div>
            
            <div class="instruction">
              📱 Покажите этот QR-код клиенту для просмотра фотографий
            </div>
            
            <div class="qr-container">
              <img src="${qrUrl}" alt="QR-код для заказа #${orderNumber}" class="qr-image" />
            </div>
            
            <div class="url-container">
              <div class="url-label">Ссылка для клиента:</div>
              <div class="url">${orderUrl}</div>
              <button onclick="navigator.clipboard.writeText('${orderUrl}').then(() => alert('Ссылка скопирована!')).catch(() => alert('Не удалось скопировать'))" style="margin-top: 10px; padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">📋 Копировать ссылку</button>
            </div>
            
            <div class="footer">
              Клиент может отсканировать код камерой телефона<br>
              или перейти по ссылке выше
            </div>
          </div>
        </body>
      </html>
    `;
  }
}