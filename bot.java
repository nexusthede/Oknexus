package com.mybot;

import net.dv8tion.jda.api.JDABuilder;
import net.dv8tion.jda.api.hooks.ListenerAdapter;
import net.dv8tion.jda.api.events.message.MessageReceivedEvent;
import net.dv8tion.jda.api.requests.GatewayIntent;

import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.util.*;

public class Bot extends ListenerAdapter {

    private static Map<String, Integer> leaderboard = new HashMap<>();

    public static void main(String[] args) throws Exception {
        String token = System.getenv("TOKEN");
        if (token == null || token.isEmpty()) {
            System.out.println("TOKEN missing!");
            return;
        }

        // --- Tiny HTTP server for Render ---
        HttpServer server = HttpServer.create(new InetSocketAddress(8080), 0);
        server.createContext("/", exchange -> {
            String response = "Bot is running!";
            exchange.sendResponseHeaders(200, response.getBytes().length);
            exchange.getResponseBody().write(response.getBytes());
            exchange.close();
        });
        server.start();
        System.out.println("Web server started on port 8080");

        // --- Start Discord bot ---
        JDABuilder.createDefault(token)
                .enableIntents(GatewayIntent.MESSAGE_CONTENT, GatewayIntent.GUILD_MESSAGES)
                .addEventListeners(new Bot())
                .build()
                .awaitReady(); // Important for Render

        System.out.println("Discord bot is online!");
    }

    @Override
    public void onMessageReceived(MessageReceivedEvent event) {
        if (event.getAuthor().isBot()) return;

        String msg = event.getMessage().getContentRaw();
        String userId = event.getAuthor().getId();

        // --- Leaderboard logic ---
        leaderboard.put(userId, leaderboard.getOrDefault(userId, 0) + 1);

        if (msg.equalsIgnoreCase(".lb")) {
            StringBuilder sb = new StringBuilder("🏆 Leaderboard 🏆\n");
            leaderboard.entrySet().stream()
                    .sorted((a, b) -> b.getValue() - a.getValue())
                    .limit(10)
                    .forEach(entry -> sb.append("<@")
                            .append(entry.getKey())
                            .append("> - ")
                            .append(entry.getValue())
                            .append(" pts\n"));
            event.getChannel().sendMessage(sb.toString()).queue();
        }

        if (msg.equalsIgnoreCase(".points")) {
            int pts = leaderboard.getOrDefault(userId, 0);
            event.getChannel().sendMessage("You have " + pts + " points!").queue();
        }

        // Add other old commands here if needed...
    }
}
