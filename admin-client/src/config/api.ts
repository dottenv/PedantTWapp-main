// Runtime-config aware API client (admin)
type RuntimeConfig = {
  API_BASE?: string;
};

export const API_CONFIG = {
  BASE_URL: (() => {
    // Проверяем глобальные переменные из vite.config.ts
    const serverUrl = (globalThis as any).__CLOUDPUB_SERVER_URL__ || import.meta.env.CLOUDPUB_SERVER_URL;
    console.log('🔧 Admin: CLOUDPUB_SERVER_URL из .env:', serverUrl);
    if (serverUrl) {
      return `${serverUrl}/api`;
    }
    return import.meta.env.VITE_API_BASE_URL || '/api';
  })(),
  TIMEOUT: 15000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000
};

export const loadRuntimeConfig = async (): Promise<void> => {
  const tried: string[] = [];
  const setBase = (base: string) => {
    API_CONFIG.BASE_URL = base;
    console.info('Admin runtime config applied, API_BASE =', base);
  }

  const tryFetch = async (url: string, timeout = 5000) => {
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

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  try {
    const proto = window.location.protocol;
    const host = window.location.hostname;

    // 1) Абсолютный runtime config с сервера, если известен URL (
    const globalServerUrl = (globalThis as any).__CLOUDPUB_SERVER_URL__ || (import.meta as any)?.env?.CLOUDPUB_SERVER_URL;
    if (globalServerUrl) {
      const absoluteConfigUrl = `${globalServerUrl}/config.json`;
      console.log('🌐 Admin: Пробуем абсолютный config.json:', absoluteConfigUrl);
      const abs = await tryFetch(absoluteConfigUrl, 5000);
      if (abs && abs.ok) {
        const data: RuntimeConfig = await abs.json();
        if (data && data.API_BASE) {
          console.log('✅ Admin: Абсолютный runtime config применен:', data);
          setBase(data.API_BASE);
          return;
        }
      }
      // Фоллбэк к локальному сценарию
    }

    // 2) Локальный config.json (статический файл)
    let r = await tryFetch('/config.json');
    if (r && r.ok) {
      const data: RuntimeConfig = await r.json();
      if (data && data.API_BASE) { 
        console.log('📄 Admin: Найден runtime config:', data.API_BASE);
        console.log('📄 Admin: Runtime данные:', data);
        setBase(data.API_BASE); 
        return; 
      }
    }

    // 3) Same-origin health check (если /api проксируется к серверу)
    r = await tryFetch('/api/health');
    if (r && r.ok) { setBase('/api'); return; }

    // 4) Локальная разработка - hostname:3001
    r = await tryFetch(`${proto}//${host}:3001/api/health`);
    if (r && r.ok) { setBase(`${proto}//${host}:3001/api`); return; }

    // 5) Cloudpub паттерны с повторными попытками
    const cloudpubPatterns = [
      // Прямое преобразование admin -> server
      host.replace(/^admin/, 'server'),
      host.replace(/^admin-client/, 'server'),
      host.replace(/-admin/, '-server'),
      host.replace(/admin/g, 'server'),
      // Обратное преобразование для случая, когда админ запущен на server URL
      host.replace(/^server/, 'server'),
      host.replace(/-server/, '-server'),
      host
    ];

    // Повторяем попытки с задержкой
    for (let attempt = 1; attempt <= 3; attempt++) {
      console.log(`🔄 Admin: Попытка ${attempt}/3 поиска сервера...`);
      
      for (const serverHost of cloudpubPatterns) {
        if (serverHost !== host) {
          console.log(`🔍 Admin: Проверяем ${proto}//${serverHost}/api/health`);
          r = await tryFetch(`${proto}//${serverHost}/api/health`, 8000);
          if (r && r.ok) { 
            console.log(`✅ Admin: Найден сервер ${serverHost}`);
            setBase(`${proto}//${serverHost}/api`); 
            return; 
          }
        }
      }
      
      if (attempt < 3) {
        console.log(`⏳ Admin: Ждем ${attempt * 2}с...`);
        await delay(attempt * 2000);
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

    console.warn('Admin runtime config: no server found, tried:', tried.join(', '));
  } catch (e) {
    console.warn('Could not load runtime config (admin), using defaults', e);
  }
};

export const getApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

console.log('🔧 Admin API Configuration (initial):', { 
  BASE_URL: API_CONFIG.BASE_URL, 
  hostname: window.location.hostname,
  protocol: window.location.protocol 
});