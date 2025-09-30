/**
 * Сканер для автоматического извлечения текстов из компонентов
 */

interface ScanResult {
  file: string;
  texts: Array<{
    text: string;
    line: number;
    key: string;
  }>;
}

export class LocaleScanner {
  // Паттерны для поиска русского текста
  private patterns = [
    // Строки в JSX
    />\s*([а-яё][а-яё\s\d\.,!?:;№#-]*[а-яё\d])\s*</gi,
    // Строки в кавычках
    /['"`]([а-яё][а-яё\s\d\.,!?:;№#-]*[а-яё\d])['"`]/gi,
    // title, placeholder, alt атрибуты
    /(?:title|placeholder|alt)=['"`]([а-яё][а-яё\s\d\.,!?:;№#-]*[а-яё\d])['"`]/gi
  ];

  // Исключения - не переводим
  private excludePatterns = [
    /^\d+$/, // Только цифры
    /^[a-zA-Z]+$/, // Только латиница
    /^[#@]/,  // Хештеги, упоминания
    /^https?:\/\//, // URL
  ];

  // Сканирование содержимого файла
  scanFileContent(content: string, filename: string): ScanResult {
    const texts: Array<{ text: string; line: number; key: string }> = [];
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      this.patterns.forEach(pattern => {
        let match;
        const regex = new RegExp(pattern.source, pattern.flags);
        
        while ((match = regex.exec(line)) !== null) {
          const text = match[1].trim();
          
          if (this.isValidText(text)) {
            texts.push({
              text,
              line: index + 1,
              key: this.generateKey(text)
            });
          }
        }
      });
    });

    return { file: filename, texts };
  }

  // Проверка валидности текста
  private isValidText(text: string): boolean {
    if (text.length < 2) return false;
    
    return !this.excludePatterns.some(pattern => pattern.test(text));
  }

  // Генерация ключа локализации
  private generateKey(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\wа-яё\s]/g, '') // Убираем спецсимволы
      .replace(/\s+/g, '_') // Пробелы в подчеркивания
      .substring(0, 40); // Ограничиваем длину
  }

  // Создание JSON локалей
  generateLocaleJSON(scanResults: ScanResult[]): Record<string, any> {
    const locales = {
      ru: {} as Record<string, string>,
      en: {} as Record<string, string>,
      uk: {} as Record<string, string>
    };

    scanResults.forEach(result => {
      result.texts.forEach(({ text, key }) => {
        locales.ru[key] = text;
        locales.en[key] = `[TO_TRANSLATE] ${text}`;
        locales.uk[key] = `[TO_TRANSLATE] ${text}`;
      });
    });

    return locales;
  }

  // Замена текстов в файле на вызовы t()
  replaceTextsInFile(content: string, texts: Array<{ text: string; key: string }>): string {
    let result = content;

    texts.forEach(({ text, key }) => {
      // Замена в JSX
      const jsxPattern = new RegExp(`>\\s*${this.escapeRegex(text)}\\s*<`, 'g');
      result = result.replace(jsxPattern, `>{t('${key}')}<`);

      // Замена в атрибутах
      const attrPattern = new RegExp(`(['"\`])${this.escapeRegex(text)}\\1`, 'g');
      result = result.replace(attrPattern, `$1{t('${key}')}$1`);
    });

    return result;
  }

  // Экранирование спецсимволов для регулярки
  private escapeRegex(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

// Утилита для быстрого сканирования
export const scanForLocalization = (fileContent: string, filename: string) => {
  const scanner = new LocaleScanner();
  return scanner.scanFileContent(fileContent, filename);
};