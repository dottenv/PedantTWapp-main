export class AutoTranslator {
  private static instance: AutoTranslator;

  static getInstance(): AutoTranslator {
    if (!AutoTranslator.instance) {
      AutoTranslator.instance = new AutoTranslator();
    }
    return AutoTranslator.instance;
  }

  setApiKey(key: string, useGemini: boolean = false) {
    console.log('API ключ установлен');
  }

  isAvailable(): boolean {
    return false;
  }

  async translate(text: string, targetLang: string): Promise<string> {
    return text;
  }

  async translateLocale(sourceLocale: Record<string, string>, targetLang: string): Promise<Record<string, string>> {
    return sourceLocale;
  }

  async updateAllTranslations(): Promise<void> {
    console.log('Переводчик отключен');
  }
}

export const setTranslationApiKey = (key: string, useGemini: boolean = false) => {
  AutoTranslator.getInstance().setApiKey(key, useGemini);
};

export const translateText = async (text: string, targetLang: string): Promise<string> => {
  return AutoTranslator.getInstance().translate(text, targetLang);
};

export const updateAllTranslations = async (): Promise<void> => {
  await AutoTranslator.getInstance().updateAllTranslations();
};