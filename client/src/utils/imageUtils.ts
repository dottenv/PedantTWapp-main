/**
 * Утилиты для работы с изображениями
 */
export class ImageUtils {
  /**
   * Сжимает изображение до указанного размера
   */
  static compressImage(file: File, maxWidth: number = 1920, maxHeight: number = 1080, quality: number = 0.8): Promise<File> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      
      img.onload = () => {
        // Вычисляем новые размеры с сохранением пропорций
        let { width, height } = img;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Рисуем сжатое изображение
        ctx.drawImage(img, 0, 0, width, height);
        
        // Конвертируем в blob
        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        }, 'image/jpeg', quality);
      };
      
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Сжимает массив изображений
   */
  static async compressImages(files: File[]): Promise<File[]> {
    const compressed: File[] = [];
    
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        const compressedFile = await this.compressImage(file);
        compressed.push(compressedFile);
        console.log(`📷 Сжато: ${file.name} ${(file.size / 1024 / 1024).toFixed(1)}MB → ${(compressedFile.size / 1024 / 1024).toFixed(1)}MB`);
      } else {
        compressed.push(file);
      }
    }
    
    return compressed;
  }
}