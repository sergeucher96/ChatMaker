import os
import asyncio
import traceback
from io import BytesIO

from aiohttp import web
import aiohttp_cors
from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command

# =========================
# Настройки
# =========================
BOT_TOKEN = os.getenv("BOT_TOKEN")
WEB_APP_URL = "https://sergeucher96.github.io/ChatMaker/"
WEB_SERVER_HOST = "0.0.0.0"
WEB_SERVER_PORT = int(os.getenv("PORT", 10000))

# =========================
# Инициализация бота
# =========================
bot = Bot(token=BOT_TOKEN)
dp = Dispatcher(bot=bot)
app = web.Application()

# =========================
# Команда /start
# =========================
@dp.message(Command(commands=["start"]))
async def command_start_handler(message: types.Message):
    # Установка кнопки WebApp
    await bot.set_chat_menu_button(
        chat_id=message.chat.id,
        menu_button=types.MenuButtonWebApp(
            text="Создать Историю",
            web_app=types.WebAppInfo(url=WEB_APP_URL)
        )
    )
    await message.answer(
        "Привет! Нажми кнопку 'Создать Историю' в меню 👇, чтобы запустить редактор."
    )

# =========================
# Обработка фото от WebApp
# =========================
async def upload_photo_handler(request: web.Request):
    try:
        data = await request.post()
        print("Received data:", data)

        photo_field = data.get('photo')
        user_id_str = data.get('user_id')

        if not photo_field:
            return web.json_response({'error': 'Нет фото'}, status=400)
        if not user_id_str:
            return web.json_response({'error': 'Нет user_id'}, status=400)

        try:
            user_id = int(user_id_str)
        except ValueError:
            return web.json_response({'error': 'Некорректный user_id'}, status=400)

        # Чтение фото
        photo_bytes = await photo_field.read()
        if not photo_bytes:
            return web.json_response({'error': 'Пустое фото'}, status=400)

        # Отправка фото пользователю
        photo_file = types.InputFile(BytesIO(photo_bytes), filename="story.png")
        await bot.send_photo(
            chat_id=user_id,
            photo=photo_file,
            caption="Ваша история готова!"
        )

        return web.json_response({'status': 'ok'})

    except Exception as e:
        traceback.print_exc()
        return web.json_response({'error': str(e)}, status=500)

# =========================
# Настройка CORS
# =========================
cors = aiohttp_cors.setup(app, defaults={
    "*": aiohttp_cors.ResourceOptions(
        allow_credentials=True,
        expose_headers="*",
        allow_headers="*"
    )
})
resource = cors.add(app.router.add_resource("/upload"))
cors.add(resource.add_route("POST", upload_photo_handler))

# =========================
# Запуск бота
# =========================
async def run_bot():
    try:
        await bot.delete_webhook(drop_pending_updates=True)
        await dp.start_polling(bot)
    except Exception:
        traceback.print_exc()

# =========================
# Запуск веб-сервера
# =========================
async def main():
    # Запуск бота в отдельной задаче
    asyncio.create_task(run_bot())

    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, host=WEB_SERVER_HOST, port=WEB_SERVER_PORT)
    await site.start()
    print(f"Сервер слушает на {WEB_SERVER_HOST}:{WEB_SERVER_PORT}")

    # Бесконечное ожидание
    await asyncio.Event().wait()

# =========================
# Точка входа
# =========================
if __name__ == '__main__':
    print("Запуск приложения...")
    asyncio.run(main())
