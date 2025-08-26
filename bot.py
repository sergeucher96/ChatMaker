import os
import asyncio
import json
import hmac
import hashlib
from urllib.parse import parse_qsl

from aiohttp import web
import aiohttp_cors
from aiogram import Bot, Dispatcher, types
from aiogram.filters import CommandStart
from aiogram.types import MenuButtonWebApp, WebAppInfo

# --- НАСТРОЙКИ ---
BOT_TOKEN = os.getenv("BOT_TOKEN")
WEB_APP_URL = "https://sergeucher96.github.io/ChatMaker/" 
WEB_SERVER_HOST = "0.0.0.0"
# Render сам предоставит правильный порт в переменной PORT, по умолчанию 10000
WEB_SERVER_PORT = int(os.getenv("PORT", 10000))

# --- Инициализация ---
bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()
app = web.Application()

# --- ОБРАБОТЧИКИ БОТА ---
@dp.message(CommandStart())
async def command_start_handler(message: types.Message):
    await bot.set_chat_menu_button(
        chat_id=message.chat.id,
        menu_button=MenuButtonWebApp(text="Создать Историю", web_app=WebAppInfo(url=WEB_APP_URL))
    )
    await message.answer(
        "Привет! Нажми кнопку 'Создать Историю' в меню 👇, чтобы запустить редактор.",
    )

# --- ОБРАБОТЧИК ДЛЯ WEB APP ---
def validate_init_data(init_data: str, bot_token: str):
    try:
        parsed_data = dict(parse_qsl(init_data))
        received_hash = parsed_data.pop('hash')
        data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(parsed_data.items()))
        secret_key = hmac.new("WebAppData".encode(), bot_token.encode(), hashlib.sha256).digest()
        calculated_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
        if calculated_hash == received_hash:
            return True, json.loads(parsed_data['user'])
        return False, None
    except Exception:
        return False, None

async def upload_photo_handler(request: web.Request):
    try:
        data = await request.post()
        photo_field = data.get('photo')
        init_data_str = data.get('initData')

        if not photo_field or not init_data_str:
            return web.json_response({'error': 'Отсутствуют данные.'}, status=400)

        is_valid, user_data = validate_init_data(init_data_str, BOT_TOKEN)
        if not is_valid or not user_data:
            return web.json_response({'error': 'Неверные данные.'}, status=403)
        
        user_id = user_data['id']
        photo_bytes = photo_field.file.read()

        await bot.send_photo(
            chat_id=user_id,
            photo=types.BufferedInputFile(photo_bytes, filename="story.jpg"),
            caption="Ваша история готова!"
        )
        return web.json_response({'status': 'ok'}, status=200)
    except Exception as e:
        print(f"Ошибка при загрузке: {e}")
        return web.json_response({'error': 'Ошибка сервера.'}, status=500)

# --- ФУНКЦИИ ЗАПУСКА ---
async def run_bot():
    """Запускает polling бота"""
    await bot.delete_webhook(drop_pending_updates=True)
    await dp.start_polling(bot)

async def main():
    """Главная функция для запуска сервера и бота"""
    # Настройка CORS
    cors = aiohttp_cors.setup(app, defaults={
        "*": aiohttp_cors.ResourceOptions(allow_credentials=True, expose_headers="*", allow_headers="*")
    })
    upload_route = app.router.add_post('/upload', upload_photo_handler)
    cors.add(upload_route)
    
    # Запускаем бота в фоновой задаче
    asyncio.create_task(run_bot())
    
    # Запускаем веб-сервер
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, host=WEB_SERVER_HOST, port=WEB_SERVER_PORT)
    await site.start()
    
    print(f"Сервер слушает на {WEB_SERVER_HOST}:{WEB_SERVER_PORT}")
    await asyncio.Event().wait()

if __name__ == '__main__':
    print("Запуск приложения...")
    asyncio.run(main())
