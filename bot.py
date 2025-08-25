import os
import asyncio
import json
import hmac
import hashlib
from urllib.parse import parse_qsl

from aiohttp import web
from aiogram import Bot, Dispatcher, types

# --- НАСТРОЙКИ ---
BOT_TOKEN = os.getenv("BOT_TOKEN", "СЮДА_ВСТАВЬ_СВОЙ_ТОКЕН_ЕСЛИ_ТЕСТИРУЕШЬ_ЛОКАЛЬНО")
WEB_SERVER_HOST = "0.0.0.0"
WEB_SERVER_PORT = int(os.getenv("PORT", 8080)) # Render сам подставит нужный порт

# --- КОД БОТА ---
bot = Bot(BOT_TOKEN)
dp = Dispatcher()
app = web.Application()


def validate_init_data(init_data: str, bot_token: str) -> (bool, dict):
    """Проверяет подлинность данных от Telegram"""
    try:
        parsed_data = dict(parse_qsl(init_data))
        received_hash = parsed_data.pop('hash')
        data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(parsed_data.items()))
        
        secret_key = hmac.new("WebAppData".encode(), bot_token.encode(), hashlib.sha256).digest()
        calculated_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()

        if calculated_hash == received_hash:
            user_data = json.loads(parsed_data['user'])
            return True, user_data
        
        return False, None
    except Exception:
        return False, None

async def upload_photo_handler(request: web.Request):
    """Принимает картинку от Web App и отправляет ее пользователю"""
    try:
        data = await request.post()
        
        photo_field = data.get('photo')
        init_data_str = data.get('initData')

        if not photo_field or not init_data_str:
            return web.json_response({'error': 'Отсутствуют фото или данные.'}, status=400)

        is_valid, user_data = validate_init_data(init_data_str, BOT_TOKEN)
        if not is_valid:
            return web.json_response({'error': 'Неверные данные.'}, status=403)
        
        user_id = user_data['id']
        photo_bytes = photo_field.file.read()

        input_photo = types.BufferedInputFile(photo_bytes, filename="story.jpg")
        await bot.send_photo(
            chat_id=user_id,
            photo=input_photo,
            caption="Ваша история готова!"
        )
        
        return web.json_response({'status': 'ok'}, status=200)

    except Exception as e:
        print(f"Ошибка на сервере при загрузке: {e}")
        return web.json_response({'error': 'Внутренняя ошибка сервера.'}, status=500)

async def on_startup(app):
    """Действия при старте сервера"""
    # Устанавливаем вебхук (необязательно для этой задачи, но хорошая практика)
    # webhook_url = f"https://{os.getenv('RENDER_EXTERNAL_HOSTNAME')}/{BOT_TOKEN}"
    # await bot.set_webhook(webhook_url)
    print("Веб-сервер запущен...")

async def main():
    """Главная функция для запуска"""
    # Добавляем обработчик для POST запросов на /upload
    app.router.add_post('/upload', upload_photo_handler)
    app.on_startup.append(on_startup)
    
    # Запускаем веб-сервер
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, host=WEB_SERVER_HOST, port=WEB_SERVER_PORT)
    await site.start()
    
    print(f"Сервер слушает на {WEB_SERVER_HOST}:{WEB_SERVER_PORT}")
    
    # Чтобы сервер не закрылся
    await asyncio.Event().wait()

if __name__ == '__main__':
    asyncio.run(main())
