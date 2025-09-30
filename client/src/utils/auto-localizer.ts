/**
 * Автоматический локализатор для извлечения и замены текстов
 */

interface LocaleEntry {
  key: string;
  value: string;
  file: string;
  line: number;
}

interface LocaleData {
  [key: string]: string;
}

export class AutoLocalizer {
  private static instance: AutoLocalizer;
  private locales: Map<string, LocaleData> = new Map();
  private currentLang = 'ru';

  static getInstance(): AutoLocalizer {
    if (!AutoLocalizer.instance) {
      AutoLocalizer.instance = new AutoLocalizer();
    }
    return AutoLocalizer.instance;
  }

  // Определение языка пользователя
  detectLanguage(): string {
    // 1. Приоритет - настройки пользователя
    const savedLang = localStorage.getItem('user_language');
    if (savedLang) return savedLang;

    // 2. Telegram WebApp данные
    const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
    if (tgUser?.language_code) {
      return tgUser.language_code.split('-')[0]; // en-US -> en
    }

    // 3. Браузер
    return navigator.language.split('-')[0] || 'ru';
  }

  // Сканирование файлов и извлечение текстов
  async scanAndExtract(): Promise<LocaleEntry[]> {
    const entries: LocaleEntry[] = [];
    
    // Регулярка для поиска русского текста в кавычках
    const textRegex = /['"`]([а-яё\s\d\.,!?:;-]+)['"`]/gi;
    
    // Здесь должно быть чтение файлов из src/components/
    // Для демонстрации - статический пример
    const mockFileContent = `
      <div className="card-title">Настройки</div>
      <div className="user-name">Заказ #{order.id}</div>
      <button>Добавить заказ</button>
    `;

    let match;
    let lineNumber = 1;
    
    while ((match = textRegex.exec(mockFileContent)) !== null) {
      const text = match[1].trim();
      if (text.length > 1) { // Игнорируем короткие строки
        entries.push({
          key: this.generateKey(text),
          value: text,
          file: 'example.tsx',
          line: lineNumber
        });
      }
    }

    return entries;
  }

  // Генерация ключа для локализации
  private generateKey(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^а-яё\w\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 30);
  }

  // Создание JSON файлов локалей
  generateLocaleFiles(entries: LocaleEntry[]): { [lang: string]: LocaleData } {
    const locales: { [lang: string]: LocaleData } = {
      ru: {},
      en: {},
      uk: {},
      kz: {}
    };

    entries.forEach(entry => {
      locales.ru[entry.key] = entry.value;
      locales.en[entry.key] = `[EN] ${entry.value}`; // Заглушка для перевода
      locales.uk[entry.key] = `[UK] ${entry.value}`;
      locales.kz[entry.key] = `[KZ] ${entry.value}`;
    });

    return locales;
  }

  // Загрузка локали
  async loadLocale(lang: string): Promise<void> {
    try {
      // В реальности - загрузка из JSON файла
      const mockLocale: LocaleData = {
        'nastroyki': 'Настройки',
        'zakaz': 'Заказ',
        'dobavit_zakaz': 'Добавить заказ'
      };
      
      this.locales.set(lang, mockLocale);
      this.currentLang = lang;
    } catch (error) {
      console.warn(`Не удалось загрузить локаль ${lang}:`, error);
    }
  }

  // Функция перевода
  t(key: string, fallback?: string): string {
    const locale = this.locales.get(this.currentLang);
    return locale?.[key] || fallback || key;
  }

  // Инициализация локализатора
  async init(): Promise<void> {
    const detectedLang = this.detectLanguage();
    await this.loadLocale(detectedLang);
    
    console.log(`🌐 Локализатор инициализирован: ${detectedLang}`);
  }

  // Смена языка
  async setLanguage(lang: string): Promise<void> {
    localStorage.setItem('user_language', lang);
    await this.loadLocale(lang);
    
    // Уведомляем компоненты об изменении
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: lang }));
  }
}

// Глобальная функция перевода
export const t = (key: string, fallback?: string): string => {
  return AutoLocalizer.getInstance().t(key, fallback);
};

// Хук для React компонентов
export const useLocalization = () => {
  const localizer = AutoLocalizer.getInstance();
  
  return {
    t: localizer.t.bind(localizer),
    currentLang: localizer.currentLang,
    setLanguage: localizer.setLanguage.bind(localizer)
  };
};