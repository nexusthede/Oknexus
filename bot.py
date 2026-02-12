import discord
from discord.ext import commands
from aiohttp import web
import os
import asyncio

# --- Tiny web server to keep Render container alive ---
async def handle(request):
    return web.Response(text="Bot is running!")
app = web.Application()
app.router.add_get('/', handle)
runner = web.AppRunner(app)

async def start_server():
    await runner.setup()
    site = web.TCPSite(runner, '0.0.0.0', 3000)
    await site.start()
    print("Web server running on port 3000")

# --- Discord bot setup ---
intents = discord.Intents.default()
intents.message_content = True
bot = commands.Bot(command_prefix='.', intents=intents)

leaderboard = {}

@bot.event
async def on_ready():
    print(f'Logged in as {bot.user}!')

@bot.event
async def on_message(message):
    if message.author.bot:
        return

    user_id = message.author.id
    leaderboard[user_id] = leaderboard.get(user_id, 0) + 1

    if message.content == '.lb':
        top = sorted(leaderboard.items(), key=lambda x: x[1], reverse=True)[:10]
        msg = "🏆 Leaderboard 🏆\n" + "\n".join(f"<@{uid}> - {pts} pts" for uid, pts in top)
        await message.channel.send(msg)

    if message.content == '.points':
        await message.channel.send(f"You have {leaderboard[user_id]} points!")

    await bot.process_commands(message)

# --- Run both web server and bot ---
async def main():
    await start_server()
    await bot.start(os.environ['TOKEN'])

asyncio.run(main())
