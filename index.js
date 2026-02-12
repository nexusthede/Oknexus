import { Client, GatewayIntentBits, Events } from 'discord.js';
import 'dotenv/config';
import http from 'http';

// --- Tiny HTTP server to keep Render alive ---
http.createServer((req, res) => {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('Bot is running!\n');
}).listen(3000, () => console.log('Web server running on port 3000'));

// --- Discord bot client ---
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// --- Leaderboard ---
const leaderboard = new Map();

// --- Bot ready ---
client.once(Events.ClientReady, () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

// --- Message listener ---
client.on(Events.MessageCreate, message => {
    if (message.author.bot) return;

    const userId = message.author.id;
    leaderboard.set(userId, (leaderboard.get(userId) || 0) + 1);

    if (message.content === '.lb') {
        let top = [...leaderboard.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([id, points]) => `<@${id}> - ${points} pts`)
            .join('\n');
        message.channel.send(`🏆 Leaderboard 🏆\n${top}`);
    }

    if (message.content === '.points') {
        message.channel.send(`You have ${leaderboard.get(userId)} points!`);
    }
});

// --- Login ---
client.login(process.env.TOKEN);
