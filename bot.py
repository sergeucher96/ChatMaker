import os
import asyncio
import base64
import io

from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import CommandStart
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo, BufferedInputFile

# --- НАСТРОЙКИ ---
BOT_TOKEN = os.getenv("BOT_TOKEN") 
# Убедитесь, что GitHub Pages развернул последнюю версию вашего JS кода
WEB_APP_URL = "https://sergeucher96.github.io/ChatMaker/" 

# --- КОД БОТА ---
dp = Dispatcher()
bot = Bot(BOT_TOKEN)

@dp.message(CommandStart())
async def command_start_handler(message: types.Message):
    """
    Этот обработчик будет срабатывать, когда пользователь напишет /start
    """
    web_app_button = InlineKeyboardButton(
        text="🚀 Запустить редактор историй",
        web_app=WebAppInfo(
            url=WEB_APP_URL,
            request_fullscreen=True 
        )
    )
    keyboard = InlineKeyboardMarkup(inline_keyboard=[[web_app_button]])
    await message.answer(
        "Привет! Нажми кнопку ниже, чтобы запустить приложение и создать свою историю.",
        reply_markup=keyboard
    )

# !!! --- НОВЫЙ ОБРАБОТЧИК ДАННЫХ ИЗ WEBAPP --- !!!
@dp.message(F.web_app_data)
async def handle_web_app_data(message: types.Message):
    """
    Этот обработчик ловит сообщения, содержащие данные от Web App.
    """
    print("Получены данные от WebApp:", message.web_app_data.data[:50] + "...") # Логируем начало строки

    # Отправляем пользователю уведомление о том, что мы начали обработку
    processing_message = await message.answer("Получил данные. Генерирую изображение...")

    try:
        # Получаем строку Base64 из данных
        base64_str = message.web_app_data.data
        
        # Декодируем строку Base64 в байты
        image_bytes = base64.b64decode(base64_str)
        
        # Создаем "файл в памяти" для отправки в Telegram
        image_file = BufferedInputFile(image_bytes, filename="story.png")
        
        # Отправляем изображение пользователю
        await bot.send_photo(
            chat_id=message.chat.id,
            photo=image_file,
            caption="Ваша история готова!"
        )
        
        # Удаляем сообщение "Генерирую изображение..."
        await bot.delete_message(chat_id=message.chat.id, message_id=processing_message.message_id)

    except Exception as e:
        print("Ошибка при обработке данных из WebApp:", e)
        await message.answer("Произошла ошибка при создании изображения. Попробуйте снова.")
        # Также можно отредактировать сообщение о процессе, чтобы показать ошибку
        await bot.edit_message_text(
            text="Не удалось создать изображение. Пожалуйста, попробуйте еще раз.",
            chat_id=message.chat.id,
            message_id=processing_message.message_id
        )


async def main():
    """Главная функция для запуска бота"""
    print("Бот запущен...")
    await bot.delete_webhook(drop_pending_updates=True)
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
