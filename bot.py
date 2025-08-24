import os
import asyncio
from aiogram import Bot, Dispatcher, types
from aiogram.filters import CommandStart
from aiogram.types import MenuButtonWebApp, WebAppInfo

# --- НАСТРОЙКИ ---
# Возьми токен своего бота из @BotFather
BOT_TOKEN = os.getenv("BOT_TOKEN")

# Вставь сюда ПОЛНУЮ ссылку на твой опубликованный сайт на GitHub Pages
WEB_APP_URL = "https://sergeucher96.github.io/ChatMaker/" # <--- ВАША ССЫЛКА ЗДЕСЬ

# --- КОД БОТА (не трогай его) ---
dp = Dispatcher()
bot = Bot(BOT_TOKEN)

@dp.message(CommandStart())
async def command_start_handler(message: types.Message):
    """
    Этот обработчик будет срабатывать, когда пользователь напишет /start
    """
    # Устанавливаем специальную кнопку "Меню" для этого пользователя
    await bot.set_chat_menu_button(
        chat_id=message.chat.id,
        menu_button=MenuButtonWebApp(
            text="Создать Историю", # Текст, который будет на кнопке
            web_app=WebAppInfo(url=WEB_APP_URL)
        )
    )
    
    # Отправляем приветственное сообщение
    await message.answer(
        "Привет! Я бот для создания чат-историй.\n\n"
        "Чтобы запустить редактор, нажми на кнопку 'Создать Историю' в меню 👇"
    )

async def main():
    """Главная функция для запуска бота"""
    print("Бот запущен...")
    await dp.start_polling(bot)

if __name__ == "__main__":

    asyncio.run(main())

