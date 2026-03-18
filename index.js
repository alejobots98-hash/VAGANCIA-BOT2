const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField } = require("discord.js");
const fs = require("fs");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const token = process.env.TOKEN;

if (!token) {
  console.error("❌ TOKEN no encontrado en Railway");
  process.exit(1);
}

let wins = {};

function saveWins() {
  fs.writeFileSync("./wins.json", JSON.stringify(wins, null, 2));
}

if (fs.existsSync("./wins.json")) {
  wins = JSON.parse(fs.readFileSync("./wins.json", "utf8"));
}

client.once("ready", () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
});

client.on("messageCreate", message => {

  if (message.author.bot) return;

  const args = message.content.split(" ");
  const command = args[0].toLowerCase();

  const isAdmin = message.member.permissions.has(
    PermissionsBitField.Flags.Administrator
  );

  // SUMAR WIN
  if (command === "!win") {

    if (!isAdmin)
      return message.reply("⛔ Solo administradores pueden usar este comando.");

    const user = message.mentions.users.first();

    if (!user)
      return message.reply("❌ Usá: !win @usuario");

    if (!wins[user.id]) wins[user.id] = 0;

    wins[user.id]++;

    saveWins();

    message.channel.send(`🏆 **${user.username}** ahora tiene **${wins[user.id]} wins**`);
  }

  // RESET RANKING
  if (command === "!reset") {

    if (!isAdmin)
      return message.reply("⛔ Solo administradores pueden usar este comando.");

    wins = {};
    saveWins();

    message.channel.send("♻️ Ranking reseteado correctamente");
  }

  // RANK BONITO
  if (command === "!rank") {

    if (Object.keys(wins).length === 0)
      return message.channel.send("📊 Aún no hay victorias registradas.");

    const sorted = Object.entries(wins).sort((a, b) => b[1] - a[1]);

    const medals = ["🥇", "🥈", "🥉"];

    const rankingText = sorted
      .slice(0, 10)
      .map((u, i) => {
        const medal = medals[i] || "🏅";
        return `${medal} <@${u[0]}> • **${u[1]} win${u[1] === 1 ? "" : "s"}**`;
      })
      .join("\n");

    const embed = new EmbedBuilder()
      .setTitle("🏆 TOP 10 — RANKING DE VICTORIAS")
      .setDescription(rankingText)
      .setColor(0xFFD700)
      .setThumbnail(client.user.displayAvatarURL())
      .setFooter({ text: "VG WINS BOT" })
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }

  // MIS WINS
  if (command === "!mywins") {

    const userId = message.author.id;

    if (!wins[userId])
      return message.reply("📊 Aún no tenés victorias registradas.");

    const sorted = Object.entries(wins).sort((a, b) => b[1] - a[1]);

    const position = sorted.findIndex(u => u[0] === userId) + 1;

    const embed = new EmbedBuilder()
      .setTitle("📊 Tus estadísticas")
      .addFields(
        { name: "Jugador", value: `<@${userId}>`, inline: true },
        { name: "Wins", value: `${wins[userId]}`, inline: true },
        { name: "Posición", value: `#${position}`, inline: true }
      )
      .setColor(0x00AEFF)
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }

  // RANKING LISTA
  if (command === "!ranked") {

    if (Object.keys(wins).length === 0)
      return message.channel.send("📊 No hay datos aún.");

    const sorted = Object.entries(wins).sort((a, b) => b[1] - a[1]);

    const rankingText = sorted
      .slice(0, 10)
      .map((u, i) => `**${i + 1}.** <@${u[0]}> — ${u[1]} wins`)
      .join("\n");

    const embed = new EmbedBuilder()
      .setTitle("📊 Ranking de Jugadores")
      .setDescription(rankingText)
      .setColor(0x00AEFF)
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }

});

client.login(token);
