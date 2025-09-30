export class MassLocalizer {
  async scanAllComponents(): Promise<void> {
    console.log('Локализатор отключен');
  }

  async addKeyToAllLocales(key: string, ruText: string): Promise<void> {
    console.log('Локализатор отключен');
  }
}

export const massLocalizer = new MassLocalizer();