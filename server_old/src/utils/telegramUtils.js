import fs from 'fs';
import path from 'path';

/**
 * Утилиты для работы с Telegram Bot API
 */
export class TelegramUtils {
  static BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  static TELEGRAM_API_URL = `https://api.telegram.org/bot${TelegramUtils.BOT_TOKEN}`;

  /**
   * Загружает фото в Telegram и возвращает file_id
   */
  static async uploadPhotoToTelegram(filePath, chatId = null) {
    if (!TelegramUtils.BOT_TOKEN) {
      throw new Error('TELEGRAM_BOT_TOKEN не установлен');
    }

    try {
      const FormData = (await import('form-data')).default;
      const fetch = (await import('node-fetch')).default;
      
      const form = new FormData();
      form.append('photo', fs.createReadStream(filePath));
      
      // Если есть chatId, отправляем фото в чат, иначе используем sendPhoto без chat_id
      const endpoint = chatId ? 'sendPhoto' : 'sendPhoto';
      const url = `${TelegramUtils.TELEGRAM_API_URL}/${endpoint}`;
      
      if (chatId) {
        form.append('chat_id', chatId);
      } else {
        // Используем временный чат для загрузки (можно использовать свой ID)
        form.append('chat_id', '665852999'); // ID администратора
      }

      const response = await fetch(url, {
        method: 'POST',
        body: form
      });

      const result = await response.json();
      
      if (!result.ok) {
        throw new Error(`Telegram API error: ${result.description}`);
      }

      // Возвращаем file_id самого большого размера фото
      const photos = result.result.photo;
      const largestPhoto = photos[photos.length - 1];
      
      return {
        file_id: largestPhoto.file_id,
        file_unique_id: largestPhoto.file_unique_id,
        width: largestPhoto.width,
        height: largestPhoto.height,
        file_size: largestPhoto.file_size
      };
    } catch (error) {
      console.error('Ошибка загрузки фото в Telegram:', error);
      throw error;
    }
  }

  /**
   * Получает HTTPS ссылку на фото по file_id
   */
  static async getPhotoUrl(fileId) {
    if (!TelegramUtils.BOT_TOKEN) {
      throw new Error('TELEGRAM_BOT_TOKEN не установлен');
    }

    try {
      const fetch = (await import('node-fetch')).default;
      
      const response = await fetch(`${TelegramUtils.TELEGRAM_API_URL}/getFile?file_id=${fileId}`);
      const result = await response.json();
      
      if (!result.ok) {
        throw new Error(`Telegram API error: ${result.description}`);
      }

      const filePath = result.result.file_path;
      return `https://api.telegram.org/file/bot${TelegramUtils.BOT_TOKEN}/${filePath}`;
    } catch (error) {
      console.error('Ошибка получения URL фото:', error);
      throw error;
    }
  }

  /**
   * Загружает все фото заказа в Telegram
   */
  static async uploadOrderPhotos(photos, uploadsPath) {
    const telegramPhotos = [];
    
    for (const photo of photos) {
      try {
        const filePath = path.join(uploadsPath, photo.savedAs);
        
        if (!fs.existsSync(filePath)) {
          console.warn(`Файл не найден: ${filePath}`);
          continue;
        }

        const telegramPhoto = await TelegramUtils.uploadPhotoToTelegram(filePath);
        
        telegramPhotos.push({
          ...photo,
          telegram_file_id: telegramPhoto.file_id,
          telegram_file_unique_id: telegramPhoto.file_unique_id,
          telegram_width: telegramPhoto.width,
          telegram_height: telegramPhoto.height,
          telegram_file_size: telegramPhoto.file_size
        });

        console.log(`✅ Фото загружено в Telegram: ${photo.filename} -> ${telegramPhoto.file_id}`);
      } catch (error) {
        console.error(`❌ Ошибка загрузки фото ${photo.filename}:`, error);
        // Добавляем фото без Telegram данных
        telegramPhotos.push(photo);
      }
    }
    
    return telegramPhotos;
  }

  /**
   * Отправляет уведомление пользователю с командой перезагрузки WebApp
   */
  static async sendReloadNotification(userId, message) {
    if (!TelegramUtils.BOT_TOKEN) {
      console.warn('TELEGRAM_BOT_TOKEN не установлен, уведомление не отправлено');
      return;
    }

    try {
      const fetch = (await import('node-fetch')).default;
      
      const response = await fetch(`${TelegramUtils.TELEGRAM_API_URL}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chat_id: userId,
          text: message,
          reply_markup: {
            inline_keyboard: [[
              {
                text: '🔄 Перезагрузить приложение',
                web_app: { url: process.env.WEBAPP_URL || 'https://your-webapp-url.com' }
              }
            ]]
          }
        })
      });

      const result = await response.json();
      
      if (!result.ok) {
        console.error(`Telegram API error: ${result.description}`);
        return;
      }

      console.log(`✅ Уведомление отправлено пользователю ${userId}`);
    } catch (error) {
      console.error('Ошибка отправки уведомления:', error);
    }
  }
}

// Экспортируем функцию для прямого использования
export const sendReloadNotification = TelegramUtils.sendReloadNotification.bind(TelegramUtils);