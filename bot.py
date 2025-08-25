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
# Токен будет взят из настроек Render (Environment Variables)
BOT_TOKEN = os.getenv("BOT_TOKEN") 

# Ссылка на твой сайт на GitHub Pages
WEB_APP_URL = "https://sergeucher96.github.io/ChatMaker/" 

# Настройки для веб-сервера на Render
WEB_SERVER_HOST = "0.0.0.0"
WEB_SERVER_PORT = int(os.getenv("PORT", 10000))

# --- Инициализация ---
bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()
app = web.Application()

# --- ОБРАБОТЧИК КОМАНДЫ /start ---
@dp.message(CommandStart())
async def command_start_handler(message: types.Message):
    """
    Этот обработчик срабатывает на /start.
    Он устанавливает кнопку меню, которая запускает Web App в полноэкранном режиме.
    """
    await bot.set_chat_menu_button(
        chat_id=message.chat.id,
        menu_button=MenuButtonWebApp(
            text="Создать Историю", # Текст на кнопке
            web_app=WebAppInfo(url=WEB_APP_URL)
        )
    )
    await message.answer(
        "Привет! Я бот для создания чат-историй.\n\n"
        "Чтобы запустить редактор, нажми на кнопку 'Создать Историю' в меню 👇"
    )

# --- ОБРАБОТЧИК ДЛЯ ПРИЕМА КАРТИНКИ ОТ WEB APP ---
def validate_init_data(init_data: str, bot_token: str):
    """Проверяет подлинность данных, полученных от Web App."""
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
    """Принимает POST-запрос с картинкой на /upload."""
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
            caption="Ваша история готова! Теперь ее можно переслать."
        )
        return web.json_response({'status': 'ok'}, status=200)
    except Exception as e:
        print(f"[ОШИБКА] Ошибка при загрузке: {e}")
        return web.json_response({'error': 'Внутренняя ошибка сервера.'}, status=500)

# --- ОБРАБОТЧИК ДЛЯ СООБЩЕНИЙ ОТ TELEGRAM (ВЕБХУК) ---
async def webhook_handler(request: web.Request):
    """Принимает сообщения от Telegram (например, /start) и передает их в aiogram."""
    update_data = await request.json()
    update = types.Update(**update_data)
    await dp.feed_update(bot=bot, update=update)
    return web.Response()

# --- ФУНКЦИЯ ЗАПУСКА СЕРВЕРА ---
async def on_startup(app_instance):
    """Действия при старте сервера: установка вебхука."""
    webhook_url = f"https://{os.getenv('RENDER_EXTERNAL_HOSTNAME')}/{BOT_TOKEN}"
    await bot.set_webhook(webhook_url)
    print(f"Вебхук установлен на: {webhook_url}")

async def main():
    # Настройка CORS
    cors = aiohttp_cors.setup(app, defaults={
        "*": aiohttp_cors.ResourceOptions(allow_credentials=True, expose_headers="*", allow_headers="*")
    })
    
    # Добавляем маршруты для загрузки фото и для вебхука
    upload_route = app.router.add_post('/upload', upload_photo_handler)
    cors.add(upload_route)
    webhook_route = app.router.add_post(f'/{BOT_TOKEN}', webhook_handler)
    cors.add(webhook_route)

    # Добавляем действия при старте
    app.on_startup.append(on_startup)
    
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
