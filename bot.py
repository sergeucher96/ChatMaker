import os
import asyncio
from aiohttp import web
import aiohttp_cors
from aiogram import Bot, Dispatcher, types
from aiogram.filters import CommandStart

BOT_TOKEN = os.getenv("BOT_TOKEN")
WEB_APP_URL = "https://sergeucher96.github.io/ChatMaker/" 
WEB_SERVER_HOST = "0.0.0.0"
WEB_SERVER_PORT = int(os.getenv("PORT", 10000))

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()
app = web.Application()

@dp.message(CommandStart())
async def command_start_handler(message: types.Message):
    await bot.set_chat_menu_button(
        chat_id=message.chat.id,
        menu_button=types.MenuButtonWebApp(text="Создать Историю", web_app=types.WebAppInfo(url=WEB_APP_URL))
    )
    await message.answer(
        "Привет! Нажми кнопку 'Создать Историю' в меню 👇, чтобы запустить редактор.",
    )

async def upload_photo_handler(request: web.Request):
    try:
        data = await request.post()
        photo_field = data.get('photo')
        user_id = int(data.get('user_id', 0))

        if not photo_field or not user_id:
            return web.json_response({'error': 'Отсутствуют данные.'}, status=400)

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

cors = aiohttp_cors.setup(app, defaults={
    "*": aiohttp_cors.ResourceOptions(allow_credentials=True, expose_headers="*", allow_headers="*")
})
upload_route = app.router.add_post('/upload', upload_photo_handler)
cors.add(upload_route)

async def run_bot():
    await bot.delete_webhook(drop_pending_updates=True)
    await dp.start_polling(bot)

async def main():
    asyncio.create_task(run_bot())
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, host=WEB_SERVER_HOST, port=WEB_SERVER_PORT)
    await site.start()
    print(f"Сервер слушает на {WEB_SERVER_HOST}:{WEB_SERVER_PORT}")
    await asyncio.Event().wait()

if __name__ == '__main__':
    print("Запуск приложения...")
    asyncio.run(main())
