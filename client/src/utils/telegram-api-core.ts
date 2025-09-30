/**
 * Telegram WebApp API интеграция с улучшенной поддержкой
 */

interface TelegramWebApp {
  ready(): void;
  expand(): void;
  close(): void;
  initDataUnsafe?: {
    user?: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
      language_code?: string;
    };
  };
  colorScheme?: 'light' | 'dark';
  themeParams?: Record<string, string>;
  version?: string;
  platform?: string;
  isExpanded?: boolean;
  viewportHeight?: number;
  initData?: string;
  HapticFeedback?: {
    impactOccurred(style: 'light' | 'medium' | 'heavy'): void;
    notificationOccurred(type: 'error' | 'success' | 'warning'): void;
    selectionChanged(): void;
  };
  MainButton?: {
    setText(text: string): void;
    onClick(callback: () => void): void;
    show(): void;
    hide(): void;
    showProgress(): void;
    hideProgress(): void;
    color: string;
    textColor: string;
  };
  BackButton?: {
    onClick(callback: () => void): void;
    show(): void;
    hide(): void;
  };
  SettingsButton?: {
    onClick(callback: () => void): void;
    show(): void;
    hide(): void;
  };

  showConfirm?(message: string, callback: (result: boolean) => void): void;
  showProgress?(): void;
  hideProgress?(): void;
  disableVerticalSwipes?(): void;
  enableVerticalSwipes?(): void;
  requestFullscreen?(): void;
  exitFullscreen?(): void;
  isFullscreen?: boolean;
  lockOrientation?(): void;
  unlockOrientation?(): void;
  onEvent?: (eventType: 'viewportChanged' | 'themeChanged', callback: () => void) => void;
  offEvent?: (eventType: 'viewportChanged' | 'themeChanged', callback: () => void) => void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
    TelegramAPI: typeof TelegramAPI;
  }
}

export const TelegramAPI = {
  tg: (window as any).Telegram?.WebApp as TelegramWebApp | undefined,
  
  init(): boolean {
    if (!this.tg) {
      console.warn('Telegram WebApp API недоступен');
      return false;
    }
    
    this.tg.ready();
    this.tg.expand();
    this.setupTheme();
    
    console.log('✅ Telegram WebApp API инициализирован');
    return true;
  },
  
  getUser() {
    try {
      return this.tg?.initDataUnsafe?.user || null;
    } catch (error) {
      console.warn('Ошибка получения пользователя Telegram:', error);
      return null;
    }
  },
  
  vibrate(type: 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning' | 'selection' = 'light') {
    if (!this.tg?.HapticFeedback) return;
    
    switch (type) {
      case 'light':
      case 'medium':
      case 'heavy':
        this.tg.HapticFeedback.impactOccurred(type);
        break;
      case 'success':
      case 'error':
      case 'warning':
        this.tg.HapticFeedback.notificationOccurred(type);
        break;
      case 'selection':
        this.tg.HapticFeedback.selectionChanged();
        break;
    }
  },
  
  showConfirm(message: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.tg?.showConfirm) {
        this.tg.showConfirm(message, resolve);
      } else {
        const result = confirm(message);
        resolve(result);
      }
    });
  },
  
  showMainButton(text: string, callback: () => void, options: { color?: string; textColor?: string } = {}) {
    if (!this.tg?.MainButton) return;
    
    this.tg.MainButton.setText(text);
    this.tg.MainButton.color = options.color || '#2481cc';
    this.tg.MainButton.textColor = options.textColor || '#ffffff';
    this.tg.MainButton.onClick(callback);
    this.tg.MainButton.show();
    
    // Скрываем футер
    document.body.classList.add('main-button-visible');
  },
  
  hideMainButton() {
    if (this.tg?.MainButton) {
      this.tg.MainButton.hide();
    }
    
    // Показываем футер
    document.body.classList.remove('main-button-visible');
  },
  
  showMainButtonProgress() {
    if (this.tg?.MainButton) {
      this.tg.MainButton.showProgress();
    }
  },
  
  hideMainButtonProgress() {
    if (this.tg?.MainButton) {
      this.tg.MainButton.hideProgress();
    }
  },
  
  showMainButtonWithProgress(text: string, callback: () => void, options: { color?: string; textColor?: string } = {}) {
    if (!this.tg?.MainButton) return;
    
    this.showMainButton(text, async () => {
      this.showMainButtonProgress();
      try {
        await callback();
      } finally {
        this.hideMainButtonProgress();
      }
    }, options);
  },
  
  setMainButtonText(text: string) {
    if (this.tg?.MainButton) {
      this.tg.MainButton.setText(text);
    }
  },
  
  showProgress() {
    if (this.tg?.showProgress) {
      this.tg.showProgress();
    }
  },
  
  hideProgress() {
    if (this.tg?.hideProgress) {
      this.tg.hideProgress();
    }
  },
  
  showBackButton(callback?: () => void) {
    if (!this.tg?.BackButton) return;
    
    if (callback) {
      this.tg.BackButton.onClick(callback);
    }
    this.tg.BackButton.show();
  },
  
  hideBackButton() {
    if (this.tg?.BackButton) {
      this.tg.BackButton.hide();
    }
  },
  
  showSettingsButton(callback?: () => void) {
    if (!this.tg?.SettingsButton) {
      return;
    }
    
    if (callback) {
      this.tg.SettingsButton.onClick(callback);
    }
    this.tg.SettingsButton.show();
  },
  
  hideSettingsButton() {
    if (this.tg?.SettingsButton) {
      this.tg.SettingsButton.hide();
    }
  },
  
  close() {
    if (this.tg?.close) {
      this.tg.close();
    }
  },
  
  disableVerticalSwipes(): boolean {
    if (this.tg?.disableVerticalSwipes) {
      this.tg.disableVerticalSwipes();
      console.log('🚫 Вертикальные свайпы отключены');
      return true;
    }
    return false;
  },
  
  enableVerticalSwipes(): boolean {
    if (this.tg?.enableVerticalSwipes) {
      this.tg.enableVerticalSwipes();
      console.log('✅ Вертикальные свайпы включены');
      return true;
    }
    return false;
  },
  
  requestFullscreen(): boolean {
    if (this.tg?.requestFullscreen) {
      this.tg.requestFullscreen();
      console.log('📱 Запрос полноэкранного режима');
      return true;
    }
    return false;
  },
  
  exitFullscreen(): boolean {
    if (this.tg?.exitFullscreen) {
      this.tg.exitFullscreen();
      console.log('📱 Выход из полноэкранного режима');
      return true;
    }
    return false;
  },
  
  isFullscreen(): boolean {
    return this.tg?.isFullscreen || false;
  },
  
  lockOrientation(): boolean {
    if (this.tg?.lockOrientation) {
      this.tg.lockOrientation();
      return true;
    }
    return false;
  },
  
  unlockOrientation(): boolean {
    if (this.tg?.unlockOrientation) {
      this.tg.unlockOrientation();
      return true;
    }
    return false;
  },
  
  setupTheme() {
    if (!this.tg) {
      console.warn('Telegram WebApp недоступен, использую стандартную тему');
      return;
    }
    
    const root = document.documentElement;
    const colorScheme = this.tg.colorScheme || 'light';
    
    console.log('Настройка темы:', colorScheme, this.tg.themeParams);
    
    // Применяем цвета Telegram
    if (this.tg.themeParams) {
      const theme = this.tg.themeParams;
      
      // Основные цвета
      if (theme.bg_color) root.style.setProperty('--tg-theme-bg-color', theme.bg_color);
      if (theme.text_color) root.style.setProperty('--tg-theme-text-color', theme.text_color);
      if (theme.hint_color) root.style.setProperty('--tg-theme-hint-color', theme.hint_color);
      if (theme.link_color) root.style.setProperty('--tg-theme-link-color', theme.link_color);
      if (theme.button_color) root.style.setProperty('--tg-theme-button-color', theme.button_color);
      if (theme.button_text_color) root.style.setProperty('--tg-theme-button-text-color', theme.button_text_color);
      if (theme.secondary_bg_color) root.style.setProperty('--tg-theme-secondary-bg-color', theme.secondary_bg_color);
      if (theme.header_bg_color) root.style.setProperty('--tg-theme-header-bg-color', theme.header_bg_color);
      if (theme.accent_text_color) root.style.setProperty('--tg-theme-accent-text-color', theme.accent_text_color);
      if (theme.section_bg_color) root.style.setProperty('--tg-theme-section-bg-color', theme.section_bg_color);
      if (theme.section_header_text_color) root.style.setProperty('--tg-theme-section-header-text-color', theme.section_header_text_color);
      if (theme.section_separator_color) root.style.setProperty('--tg-theme-section-separator-color', theme.section_separator_color);
      if (theme.subtitle_text_color) root.style.setProperty('--tg-theme-subtitle-text-color', theme.subtitle_text_color);
      if (theme.destructive_text_color) root.style.setProperty('--tg-theme-destructive-text-color', theme.destructive_text_color);
      if (theme.bottom_bar_bg_color) root.style.setProperty('--tg-theme-bottom-bar-bg-color', theme.bottom_bar_bg_color);
    }
    
    // Устанавливаем класс темы
    document.body.classList.remove('theme-light', 'theme-dark');
    document.body.classList.add(`theme-${colorScheme}`);
    
    // Обновляем цвет статус-бара
    const metaTheme = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement;
    if (metaTheme && this.tg.themeParams?.header_bg_color) {
      metaTheme.content = this.tg.themeParams.header_bg_color;
    }
  },
  
  isAvailable(): boolean {
    return !!this.tg;
  },
  
  getVersion(): string {
    return this.tg?.version || 'unknown';
  },
  
  getPlatform(): string {
    return this.tg?.platform || 'unknown';
  },
  
  onThemeChanged(callback: () => void) {
    if (this.tg?.onEvent) {
      this.tg.onEvent('themeChanged', () => {
        this.setupTheme();
        callback();
      });
    }
  },
  
  disableClosingConfirmation() {
    // Функция отключена для совместимости с версией 6.0
  },
  
  enableClosingConfirmation() {
    // Функция отключена для совместимости с версией 6.0
  },
  
  getDebugInfo() {
    if (!this.tg) {
      return {
        available: false,
        version: 'N/A',
        platform: 'N/A',
        colorScheme: 'N/A',
        isExpanded: false,
        viewportHeight: 'N/A'
      };
    }
    
    return {
      available: true,
      version: this.tg.version || 'unknown',
      platform: this.tg.platform || 'unknown',
      colorScheme: this.tg.colorScheme || 'light',
      isExpanded: this.tg.isExpanded || false,
      viewportHeight: this.tg.viewportHeight || window.innerHeight,
      initData: !!this.tg.initData,
      user: !!this.tg.initDataUnsafe?.user,
      themeParams: !!this.tg.themeParams,
      hapticFeedback: !!this.tg.HapticFeedback,
      mainButton: !!this.tg.MainButton,
      backButton: !!this.tg.BackButton
    };
  }
};

// Добавляем в глобальный объект для совместимости
if (typeof window !== 'undefined') {
  window.TelegramAPI = TelegramAPI;
}