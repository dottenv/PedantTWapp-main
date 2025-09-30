import { TelegramAPI } from '../utils/telegram-api-core';

type LocaleData = Record<string, string>;

class LocalizationManager {
  private static instance: LocalizationManager;
  private currentLocale: LocaleData = {};
  private currentLang = 'ru';
  private fallbackLang = 'ru';

  static getInstance(): LocalizationManager {
    if (!LocalizationManager.instance) {
      LocalizationManager.instance = new LocalizationManager();
    }
    return LocalizationManager.instance;
  }

  async detectLanguage(): Promise<string> {
    const userSetting = localStorage.getItem('user_language_setting');
    if (userSetting && userSetting !== 'auto') {
      return userSetting;
    }

    try {
      const tgUser = TelegramAPI.getUser();
      if (tgUser?.language_code) {
        const lang = tgUser.language_code.split('-')[0];
        const baseLangs = ['ru', 'en'];
        if (baseLangs.includes(lang)) {
          return lang;
        }
      }
    } catch (error) {
      // Игнорируем ошибки
    }

    const browserLang = navigator.language.split('-')[0];
    if (['ru', 'en'].includes(browserLang)) {
      return browserLang;
    }

    return this.fallbackLang;
  }

  async loadLocale(lang: string): Promise<void> {
    try {
      const localeModule = await this.importLocale(lang);
      this.currentLocale = localeModule.default || localeModule;
      this.currentLang = lang;
    } catch (error) {
      if (lang !== this.fallbackLang) {
        await this.loadLocale(this.fallbackLang);
      }
    }
  }

  private async importLocale(lang: string): Promise<LocaleData> {
    try {
      const cached = localStorage.getItem(`app_locales_${lang}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Object.keys(parsed).length > 0) {
          return parsed;
        }
      }
      return this.createMissingLocale(lang);
    } catch (error) {
      return this.createMissingLocale(lang);
    }
  }

  private createMissingLocale(lang: string): LocaleData {
    const baseLocale = {
      nastroyki: "Настройки", galereya: "Галерея", zakaz: "Заказ",
      dobavit_zakaz: "Добавить заказ", redaktirovat: "Редактировать",
      sohranit: "Сохранить", otmenit: "Отменить", poisk: "Поиск",
      zagruzka: "Загрузка", profil: "Профиль", bezopasnost: "Безопасность",
      zakazov: "Заказов", foto: "Фото", fotografii: "Фотографии",
      fotografii_ne_naydeny: "Фотографии не найдены", pokazat_esche: "Показать ещё",
      vybrano: "Выбрано", nomer_zakaza: "Номер заказа", kommentariy: "Комментарий",
      dobavit_foto: "Добавить фото", profil_opisanie: "Профиль и настройки интерфейса",
      bezopasnost_opisanie: "Пароли и конфиденциальность", hranilische: "Хранилище",
      hranilische_opisanie: "Управление данными и кэшем", o_prilozhenii: "О приложении",
      galereya_zakazov: "Галерея заказов", versiya: "Версия", posledneye_obnovleniye: "Последнее обновление",
      informatsiya_o_zakaze: "Информация о заказе", sozdatel: "Создатель",
      data_sozdaniya: "Дата создания", kolichestvo_foto: "Количество фото", sht: "шт.",
      pokazat_vse: "Показать все", skryt: "Скрыть", fotografii_ne_zagruzheny: "Фотографии не загружены",
      deystviya: "Действия", podelitsya: "Поделиться", skachat_vse: "Скачать все", udalit: "Удалить"
    };

    const translations: Record<string, LocaleData> = {
      en: {
        nastroyki: "Settings", galereya: "Gallery", zakaz: "Order",
        dobavit_zakaz: "Add Order", redaktirovat: "Edit",
        sohranit: "Save", otmenit: "Cancel", poisk: "Search",
        zagruzka: "Loading", profil: "Profile", bezopasnost: "Security",
        zakazov: "Orders", foto: "Photos", fotografii: "Photos",
        fotografii_ne_naydeny: "No photos found", pokazat_esche: "Show more",
        vybrano: "Selected", nomer_zakaza: "Order Number", kommentariy: "Comment",
        dobavit_foto: "Add Photo", profil_opisanie: "Profile and interface settings",
        bezopasnost_opisanie: "Passwords and privacy", hranilische: "Storage",
        hranilische_opisanie: "Data and cache management", o_prilozhenii: "About App",
        galereya_zakazov: "Orders Gallery", versiya: "Version", posledneye_obnovleniye: "Last Update",
        informatsiya_o_zakaze: "Order Information", sozdatel: "Creator",
        data_sozdaniya: "Creation Date", kolichestvo_foto: "Photo Count", sht: "pcs",
        pokazat_vse: "Show All", skryt: "Hide", fotografii_ne_zagruzheny: "No photos uploaded",
        deystviya: "Actions", podelitsya: "Share", skachat_vse: "Download All", udalit: "Delete"
      }
    };

    const locale = translations[lang] || baseLocale;
    localStorage.setItem(`app_locales_${lang}`, JSON.stringify(locale));
    return locale;
  }

  t(key: string, fallback?: string): string {
    const translation = this.currentLocale[key];
    if (!translation && fallback) {
      this.currentLocale[key] = fallback;
      localStorage.setItem(`app_locales_${this.currentLang}`, JSON.stringify(this.currentLocale));
      return fallback;
    }
    return translation || fallback || key;
  }

  async setLanguage(lang: string): Promise<void> {
    localStorage.setItem('app_language', lang);
    await this.loadLocale(lang);
    window.dispatchEvent(new CustomEvent('languageChanged', { 
      detail: { lang, locale: this.currentLocale } 
    }));
    window.dispatchEvent(new CustomEvent('forceRerender'));
  }

  getCurrentLanguage(): string {
    return this.currentLang;
  }

  getAvailableLanguages(): string[] {
    return ['ru', 'en'];
  }

  isAutoMode(): boolean {
    const userSetting = localStorage.getItem('user_language_setting');
    return !userSetting || userSetting === 'auto';
  }

  async init(): Promise<void> {
    const userLang = await this.detectLanguage();
    await this.loadLocale(userLang);
  }
}

export const t = (key: string, fallback?: string): string => {
  return LocalizationManager.getInstance().t(key, fallback);
};

export const refreshLocalization = async (): Promise<void> => {
  const manager = LocalizationManager.getInstance();
  const newLang = await manager.detectLanguage();
  if (newLang !== manager.getCurrentLanguage()) {
    await manager.setLanguage(newLang);
  }
};

export const initLocalization = async (): Promise<void> => {
  await LocalizationManager.getInstance().init();
};

export const setLanguage = async (lang: string): Promise<void> => {
  await LocalizationManager.getInstance().setLanguage(lang);
};

export const getCurrentLanguage = (): string => {
  return LocalizationManager.getInstance().getCurrentLanguage();
};

export const getAvailableLanguages = (): string[] => {
  return LocalizationManager.getInstance().getAvailableLanguages();
};

export const isAutoLanguageMode = (): boolean => {
  return LocalizationManager.getInstance().isAutoMode();
};

export const setupAutoTranslation = async (): Promise<void> => {
  console.log('Переводчик отключен');
};

export const scanAllForTranslation = async (): Promise<void> => {
  console.log('Локализатор отключен');
};