import os
import asyncio
from aiogram import Bot, Dispatcher, types
from aiogram.filters import CommandStart
from aiogram.types import MenuButtonWebApp, WebAppInfo

# --- НАСТРОЙКИ ---
BOT_TOKEN = os.getenv("BOT_TOKEN") 
WEB_APP_URL = "https://sergeucher96.github.io/ChatMaker/" # Убедись, что ссылка правильная!

# --- КОД БОТА ---
dp = Dispatcher()
bot = Bot(BOT_TOKEN)

@dp.message(CommandStart())
async def command_start_handler(message: types.Message):
    await bot.set_chat_menu_button(
        chat_id=message.chat.id,
        menu_button=MenuButtonWebApp(
            text="Создать Историю",
            web_app=WebAppInfo(
                url=WEB_APP_URL,
                request_write_access=True # Добавили этот параметр
            )
        )
    )
    await message.answer(
        "Привет! Я бот для создания чат-историй.\n\n"
        "Чтобы запустить редактор, нажми на кнопку 'Создать Историю' в меню 👇"
    )

async def main():
    print("Бот запущен...")
    # Важно: удаляем старые вебхуки перед запуском, чтобы избежать конфликтов
    await bot.delete_webhook(drop_pending_updates=True)
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
