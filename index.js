const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField } = require("discord.js");
const fs = require("fs");
require("dotenv").config();

// 🔐 Token desde Railway (.env)
const token = process.env.TOKEN;

if (!token) {
  console.error("❌ TOKEN no encontrado en variables de entorno");
  process.exit(1);
}

// 🤖 Cliente Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// 📂 Cargar wins
let wins = {};
if (fs.existsSync("./wins.json")) {
  wins = JSON.parse(fs.readFileSync("./wins.json", "utf8"));
}

// ✅ Bot listo
client.once("ready", () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
});

// 💬 Comandos
client.on("messageCreate", message => {
  if (message.author.bot || !message.guild) return;

  const args = message.content.split(" ");
  const command = args[0].toLowerCase();

  const isAdmin = message.member.permissions.has(
    PermissionsBitField.Flags.Administrator
  );

  // 🏆 WIN
  if (command === "!win") {
    if (!isAdmin) return message.reply("⛔ Solo administradores pueden usar este comando.");

    const user = message.mentions.users.first();
    if (!user) return message.reply("❌ Usá: !win @usuario");

    if (!wins[user.id]) wins[user.id] = 0;
    wins[user.id]++;

    fs.writeFileSync("./wins.json", JSON.stringify(wins, null, 2));
    message.channel.send(`🏆 **${user.username}** ahora tiene **${wins[user.id]} wins**`);
  }

  // 🔄 RESET
  if (command === "!reset") {
    if (!isAdmin) return message.reply("⛔ Solo administradores pueden usar este comando.");

    wins = {};
    fs.writeFileSync("./wins.json", JSON.stringify(wins, null, 2));
    message.channel.send("♻️ Ranking reseteado correctamente");
  }

  // 📊 RANK
  if (command === "!rank") {
    if (Object.keys(wins).length === 0)
      return message.channel.send("No hay datos aún");

    const sorted = Object.entries(wins).sort((a, b) => b[1] - a[1]);

    const rankingText = sorted
      .map((u, i) => `🥇 #${i + 1} <@${u[0]}> → **${u[1]} wins**`)
      .join("\n");

    const embed = new EmbedBuilder()
      .setTitle("🏆 Ranking de Victorias")
      .setDescription(rankingText)
      .setColor(0xFFD700)
      .setFooter({ text: "VG WINS BOT" })
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }
});

// 🚀 Login
client.login(token);

