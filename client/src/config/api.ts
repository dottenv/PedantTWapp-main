// Runtime-config aware API client
type RuntimeConfig = {
  API_BASE?: string;
};

// Default config (fallback)
export const API_CONFIG = {
  BASE_URL: (() => {
    // Проверяем глобальные переменные из vite.config.ts
    const serverUrl = (globalThis as any).__CLOUDPUB_SERVER_URL__ || import.meta.env.CLOUDPUB_SERVER_URL;
    console.log('🔧 CLOUDPUB_SERVER_URL из .env:', serverUrl);
    if (serverUrl) {
      return `${serverUrl}/api`;
    }
    return import.meta.env.VITE_API_BASE_URL || '/api';
  })(),
  TIMEOUT: 15000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000
};

// Load runtime config (fetch /config.json) and apply to API_CONFIG
export const loadRuntimeConfig = async (): Promise<void> => {
  const tried: string[] = [];
  const setBase = (base: string) => {
    API_CONFIG.BASE_URL = base;
    console.info('✅ Runtime config applied, API_BASE =', base);
  }

  const tryFetch = async (url: string, timeout = 3000) => {
    tried.push(url);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const r = await fetch(url, { 
        cache: 'no-store',
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      
      clearTimeout(timeoutId);
      return r;
    } catch (e) {
      return null;
    }
  }

  try {
    const proto = window.location.protocol;
    const host = window.location.hostname;

    // 1) Пытаемся получить абсолютный runtime config с сервера (
    // сначала берем URL из глобальной переменной или env)
    const globalServerUrl = (globalThis as any).__CLOUDPUB_SERVER_URL__ || (import.meta as any)?.env?.CLOUDPUB_SERVER_URL;
    if (globalServerUrl) {
      const absoluteConfigUrl = `${globalServerUrl}/config.json`;
      console.log('🌐 Пробуем абсолютный config.json с сервера:', absoluteConfigUrl);
      const abs = await tryFetch(absoluteConfigUrl, 5000);
      if (abs && abs.ok) {
        const data: RuntimeConfig = await abs.json();
        if (data && data.API_BASE) {
          console.log('✅ Абсолютный runtime config применен:', data);
          setBase(data.API_BASE);
          return;
        }
      }
      // Если абсолютный конфиг недоступен, продолжаем обычный сценарий
    }

    // 2) Локальный runtime config файл (статический рядом с SPA)
    let r = await tryFetch('/config.json');
    if (r && r.ok) {
      const data: RuntimeConfig = await r.json();
      if (data && data.API_BASE) { 
        console.log('📄 Найден runtime config:', data.API_BASE);
        console.log('📄 Runtime данные:', data);
        setBase(data.API_BASE); 
        return; 
      }
    }

    // 3) Same-origin health check
    r = await tryFetch('/api/health');
    if (r && r.ok) { 
      console.log('🔗 Same-origin API доступен');
      setBase('/api'); 
      return; 
    }

    // 4) Локальная разработка
    r = await tryFetch(`${proto}//${host}:3001/api/health`);
    if (r && r.ok) { 
      console.log('💻 Локальный сервер найден');
      setBase(`${proto}//${host}:3001/api`); 
      return; 
    }

    // 5) Cloudpub паттерны с повторными попытками и задержкой
    const cloudpubPatterns = [
      // Прямое преобразование client -> server
      host.replace(/^client/, 'server'),
      host.replace(/-client/, '-server'),
      host.replace(/client/g, 'server'),
      // Обратное преобразование для случая, когда клиент запущен на server URL
      host.replace(/^server/, 'server'), // Оставляем как есть
      host.replace(/-server/, '-server'), // Оставляем как есть
      // Попробуем все возможные варианты
      host
    ];

    // Повторяем попытки с задержкой (сервер может еще запускаться)
    for (let attempt = 1; attempt <= 3; attempt++) {
      console.log(`🔄 Попытка ${attempt}/3 поиска сервера...`);
      
      for (const serverHost of cloudpubPatterns) {
        if (serverHost !== host) {
          console.log(`🔍 Проверяем: ${proto}//${serverHost}/api/health`);
          r = await tryFetch(`${proto}//${serverHost}/api/health`, 8000);
          if (r && r.ok) { 
            console.log(`✅ Найден сервер: ${serverHost}`);
            setBase(`${proto}//${serverHost}/api`); 
            return; 
          }
        }
      }
      
      // Задержка между попытками (кроме последней)
      if (attempt < 3) {
        console.log(`⏳ Ждем ${attempt * 2}с перед следующей попыткой...`);
        await new Promise(resolve => setTimeout(resolve, attempt * 2000));
      }
    }

    // 6) Попытка найти сервер по общим доменным частям
    try {
      const parts = host.split('.');
      if (parts.length > 2) {
        const serverGuess = ['server', ...parts.slice(1)].join('.');
        r = await tryFetch(`${proto}//${serverGuess}/api/health`);
        if (r && r.ok) { setBase(`${proto}//${serverGuess}/api`); return; }
      }
    } catch {}

    console.warn('❌ Runtime config: no server found, tried:', tried.join(', '));
    console.warn('Current host:', host);
    console.warn('Using fallback API_BASE:', API_CONFIG.BASE_URL);
  } catch (e) {
    console.warn('Could not load runtime config, using defaults', e);
  }
};

export const getApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

/**
 * Returns the API origin (without the /api suffix) so clients can build absolute URLs
 * to server-served static assets like /gallery.html or /uploads/*
 */
export const getApiOrigin = (): string => {
  const base = API_CONFIG.BASE_URL;
  // If base contains /api at the end, strip it
  if (base.endsWith('/api')) return base.slice(0, -4);
  if (base.endsWith('/api/')) return base.slice(0, -5);
  return base;
};

// Логирование для отладки
console.log('🔧 API Configuration (initial):', {
  BASE_URL: API_CONFIG.BASE_URL,
  hostname: window.location.hostname
});