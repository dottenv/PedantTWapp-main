/**
 * Утилиты для настройки CORS
 */
export class CorsUtils {
  static ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://localhost:3001', 
    'https://web.telegram.org',
    /\.devtunnels\.ms$/,  // Dev tunnels
    /\.ngrok\.io$/,       // Ngrok tunnels
    /\.loca\.lt$/,        // LocalTunnel
    /\.cloudpub\.ru$/,    // CloudPub tunnels
    /\.herokuapp\.com$/,  // Heroku
    /\.vercel\.app$/,     // Vercel
    /\.netlify\.app$/     // Netlify
  ];

  /**
   * Проверяет разрешен ли origin
   */
  static isOriginAllowed(origin) {
    if (!origin) {
      return true; // Разрешаем запросы без origin
    }
    
    return this.ALLOWED_ORIGINS.some(allowed => {
      if (typeof allowed === 'string') {
        return origin === allowed;
      }
      return allowed.test(origin);
    });
  }

  /**
   * Обработчик CORS для Express
   */
  static corsHandler(origin, callback) {
    console.log('🔍 CORS check for origin:', origin);
    
    if (!origin) {
      console.log('✅ CORS: Разрешен запрос без origin');
      return callback(null, true);
    }
    
    if (CorsUtils.isOriginAllowed(origin)) {
      console.log('✅ CORS: Разрешен origin:', origin);
      callback(null, true);
    } else {
      console.log('❌ CORS: Заблокирован origin:', origin);
      callback(new Error('Не разрешено CORS политикой'));
    }
  }

  /**
   * Конфигурация CORS для Express
   */
  static getCorsConfig() {
    return {
      origin: this.corsHandler,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      allowedHeaders: [
        'Content-Type', 
        'Authorization', 
        'Accept', 
        'X-Requested-With',
        'X-Telegram-User',
        'X-Telegram-Init-Data'
      ],
      exposedHeaders: ['X-Total-Count', 'X-Page-Count']
    };
  }
}