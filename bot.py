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
# ВАЖНО: Убедись, что здесь правильная ссылка на твой сайт
WEB_APP_URL = "https://sergeucher96.github.io/ChatMaker/" 
WEB_SERVER_HOST = "0.0.0.0"
WEB_SERVER_PORT = int(os.getenv("PORT", 8080))

# --- КОД БОТА ---
bot = Bot(BOT_TOKEN)
dp = Dispatcher()
app = web.Application()

# --- ОБРАБОТЧИК КОМАНДЫ /start (ВОЗВРАЩАЕМ ЕГО НА МЕСТО) ---
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
    # Устанавливаем вебхук для бота, чтобы он получал сообщения от Telegram
    webhook_url = f"https://{os.getenv('RENDER_EXTERNAL_HOSTNAME')}/{BOT_TOKEN}"
    await bot.set_webhook(webhook_url)
    print(f"Вебхук установлен на: {webhook_url}")

async def main_bot_logic(dp: Dispatcher):
    """Эта функция будет запущена веб-сервером для обработки входящих от Telegram"""
    # Здесь мы не используем start_polling, так как работаем через вебхуки
    print("Логика бота готова к приему вебхуков...")


# Создаем обработчик для вебхуков
async def webhook_handler(request: web.Request):
    # Получаем обновление от Telegram
    update_data = await request.json()
    update = types.Update(**update_data)
    # Передаем его в диспетчер aiogram для обработки
    await dp.feed_update(bot=bot, update=update)
    return web.Response()


async def main():
    """Главная функция для запуска"""
    # --- НАСТРОЙКА CORS ---
    cors = aiohttp_cors.setup(app, defaults={
        "*": aiohttp_cors.ResourceOptions(
                allow_credentials=True, expose_headers="*", allow_headers="*",
            )
    })
    
    # "Оборачиваем" наш обработчик загрузки в правила CORS
    upload_route = app.router.add_post('/upload', upload_photo_handler)
    cors.add(upload_route)

    # "Оборачиваем" обработчик вебхука в правила CORS (на всякий случай)
    webhook_route = app.router.add_post(f'/{BOT_TOKEN}', webhook_handler)
    cors.add(webhook_route)

    # Добавляем действия при старте и запуске логики бота
    app.on_startup.append(on_startup)
    
    # --- ЗАПУСК ВЕБ-СЕРВЕРА ---
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, host=WEB_SERVER_HOST, port=WEB_SERVER_PORT)
    await site.start()
    
    print(f"Сервер слушает на {WEB_SERVER_HOST}:{WEB_SERVER_PORT}")
    
    # Запускаем логику бота
    asyncio.create_task(main_bot_logic(dp))
    
    # Чтобы сервер не закрылся
    await asyncio.Event().wait()


if __name__ == '__main__':
    asyncio.run(main())
