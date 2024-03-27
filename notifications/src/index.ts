import express from "express";
import { Client, SlashCommandBuilder, REST, Routes, GatewayIntentBits, InteractionType } from "discord.js";
import {WebSocketServer} from "ws";
import * as url from "url";

const discordCommands = [
  new SlashCommandBuilder()
  .setName("notify")
  .setDescription("Send a notification to all active PonyPlace clients")
  .setDMPermission(false)
  .addStringOption(option =>
    option.setName("level")
    .setDescription("The level of the notification. Critical plays an audio alert")
    .addChoices({
      "name": "Low",
      "value": "low"
    })
    .addChoices({
      "name": "High",
      "value": "high"
    })
    .addChoices({
      "name": "Critical",
      "value": "critical"
    })
    .setRequired(true))
  .addStringOption(option =>
    option.setName("text")
    .setDescription("The text to show in the notifications")
    .setRequired(true)
      .addChoices()) as SlashCommandBuilder
];

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async function () {
  // Pushes the commands
  await rest.put(
    Routes.applicationCommands(process.env.DISCORD_ID),
    {body: discordCommands}
  ) as any;
})();

const wss = new WebSocketServer({ noServer: true });
const app = express();
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

app.use(express.json());

wss.on("connection", ws => {
  ws["keepalive"] = setInterval(() => {
    ws.send(JSON.stringify({ ka: true }));
  },10000);

  ws.on("close", () => {
    clearInterval(ws["keepalive"]);
  });
});

app.post("/", (req, res) => {
  if (req.headers.Authorization === undefined) return res.status(401).send();
  if (req.headers.Authorization !== process.env.API_TOKEN) return res.status(403).send();

  if (req.body.level === undefined) return res.status(400).send({
    error: true,
    message: "Missing notification level"
  });

  if (req.body.text === undefined) return res.status(400).send({
    error: true,
    message: "Missing notification text"
  });

  if (["low", "high", "critical"].includes(req.body.level)) return res.status(400).send({
    error: true,
    message: "Invalid notification level (only low/high/critical accepted)"
  });

  wss.clients.forEach(ws => {
    ws.send(JSON.stringify({
      level: req.body.level,
      text: req.body.text
    }));
  });

  res.status(200).send();
});

client.on("interactionCreate", interaction => {
  if (interaction.type !== InteractionType.ApplicationCommand) return;

  if (interaction.commandName === "notify") {
    const level = interaction.options.get("level", true).value as string;
    const text = interaction.options.get("text", true).value as string;

    wss.clients.forEach(ws => {
      ws.send(JSON.stringify({
        level: level,
        text: text
      }));
    });

    interaction.reply({
      content: "Successfully published notification.",
      ephemeral: true
    });
  }
});

client.on("ready", () => {
  console.log("ready");
})

const server = app.listen(9003);
client.login(process.env.DISCORD_TOKEN);

server.on('upgrade', async (request, socket, head) => {
  const pathname = url.parse(request.url as string).pathname;

  if (pathname === "/") {
    wss.handleUpgrade(request, socket, head, socket => {
      wss.emit('connection', socket, request);
    });
  }
});