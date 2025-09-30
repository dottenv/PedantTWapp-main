import asyncio
import os
from aiogram import Bot, Dispatcher
from aiogram.types import MenuButtonWebApp, WebAppInfo
from dotenv import load_dotenv

load_dotenv()

BOT_TOKEN = os.getenv("BOT_TOKEN", "")
CLOUDPUB_CLIENT_URL = os.getenv("CLOUDPUB_CLIENT_URL", "")


async def configure_webapp_menu(bot: Bot):
    if not CLOUDPUB_CLIENT_URL:
        return
    try:
        # Кнопка WebApp по умолчанию для всех приватных чатов с ботом
        await bot.set_chat_menu_button(
            menu_button=MenuButtonWebApp(text="Открыть приложение", web_app=WebAppInfo(url=CLOUDPUB_CLIENT_URL))
        )
        # Обновим описание профиля бота, чтобы пользователь видел назначение
        try:
            await bot.set_my_short_description(short_description="Открыть WebApp")
        except Exception:
            pass
        try:
            await bot.set_my_description(description="Кнопка меню открывает приложение PedantTW")
        except Exception:
            pass
    except Exception:
        pass


async def main():
    if not BOT_TOKEN:
        raise RuntimeError("BOT_TOKEN is not set")

    bot = Bot(token=BOT_TOKEN)
    dp = Dispatcher()

    await configure_webapp_menu(bot)

    # Поллинг без хэндлеров — бот не отвечает на сообщения
    await dp.start_polling(bot, allowed_updates=dp.resolve_used_update_types())


if __name__ == "__main__":
    asyncio.run(main())
