import os
import asyncio
from aiogram import Bot, Dispatcher, types
from aiogram.filters import CommandStart
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo

# --- НАСТРОЙКИ ---
BOT_TOKEN = os.getenv("BOT_TOKEN") 
WEB_APP_URL = "https://sergeucher96.github.io/ChatMaker/" # Убедись, что ссылка правильная

# --- КОД БОТА ---
dp = Dispatcher()
bot = Bot(BOT_TOKEN)

@dp.message(CommandStart())
async def command_start_handler(message: types.Message):
    """
    Этот обработчик будет срабатывать, когда пользователь напишет /start
    """
    
    # Создаем кнопку, которая будет внутри сообщения
    web_app_button = InlineKeyboardButton(
        text="🚀 Запустить редактор историй", # Текст на кнопке
        web_app=WebAppInfo(
            url=WEB_APP_URL,
            # ВОТ ОН, НАШ КЛЮЧЕВОЙ ПАРАМЕТР
            request_fullscreen=True 
        )
    )
    
    # Создаем клавиатуру из этой одной кнопки
    keyboard = InlineKeyboardMarkup(inline_keyboard=[[web_app_button]])
    
    # Отправляем приветственное сообщение с этой кнопкой
    await message.answer(
        "Привет! Нажми кнопку ниже, чтобы запустить приложение на весь экран.",
        reply_markup=keyboard
    )

async def main():
    """Главная функция для запуска бота"""
    print("Бот запущен в режиме Inline Keyboard...")
    # Удаляем старую кнопку меню, если она была установлена
    # Это необязательно, но помогает избежать путаницы
    # await bot.set_chat_menu_button(chat_id=None, menu_button=None) # Эта команда не работает глобально, нужно делать для каждого юзера
    
    await bot.delete_webhook(drop_pending_updates=True)
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
