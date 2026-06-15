const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField, AttachmentBuilder } = require("discord.js");
const { createClient } = require("@supabase/supabase-js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ===================== CONFIGURACIÓN =====================
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const token = process.env.TOKEN;

if (!supabaseUrl || !supabaseKey || !token) {
  console.error("❌ Faltan variables de entorno (TOKEN, SUPABASE_URL o SUPABASE_KEY)");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ===================== READY =====================
client.once("ready", () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
  console.log(`🔌 Base de datos Supabase conectada`);
});

// ===================== COMANDOS =====================
client.on("messageCreate", async message => {

  if (message.author.bot) return;
  if (!message.guild) return;

  const args = message.content.split(" ");
  const command = args[0].toLowerCase();

  // ===================== PERMISOS =====================
  const isAdmin = message.member.permissions.has(
    PermissionsBitField.Flags.Administrator
  );

  // ===================== SUMAR WIN =====================
  if (command === "!win") {

    if (!isAdmin) {
      return message.reply("⛔ Solo administradores pueden sumar wins.");
    }

    const user = message.mentions.users.first();

    if (!user) {
      return message.reply("❌ Usá: !win @usuario");
    }

    try {

      // Buscar o crear usuario
      const { data, error } = await supabase
        .from("registros-usuarios")
        .upsert(
          {
            discord_id: user.id
          },
          {
            onConflict: "discord_id"
          }
        )
        .select();

      if (error) throw error;

      const currentWins = data[0].wins || 0;

      // Actualizar wins
      const { error: updateError } = await supabase
        .from("registros-usuarios")
        .update({
          wins: currentWins + 1
        })
        .eq("discord_id", user.id);

      if (updateError) throw updateError;

      message.channel.send(
        `🏆 **${user.username}** ahora tiene **${currentWins + 1} wins**`
      );

    } catch (e) {
      console.error(e);
      message.reply("❌ Error al guardar en la base de datos.");
    }
  }

  // ===================== RESET RANKING =====================
  if (command === "!reset") {

    if (!isAdmin) {
      return message.reply("⛔ Solo administradores.");
    }

    const { error } = await supabase
      .from("registros-usuarios")
      .update({
        wins: 0
      })
      .neq("wins", -1);

    if (error) {
      console.error(error);
      return message.reply("❌ Error al resetear.");
    }

    message.channel.send("♻️ Ranking reseteado correctamente.");
  }

  // ===================== RANKING GENERAL =====================
  if (command === "!rank") {

    const { data: users, error } = await supabase
      .from("registros-usuarios")
      .select("*")
      .order("wins", { ascending: false })
      .limit(10);

    if (error || !users || users.length === 0) {
      return message.channel.send("📊 Aún no hay victorias registradas.");
    }

    const medals = ["🥇", "🥈", "🥉"];

    const rankingText = users
      .map((u, i) => {
        const medal = medals[i] || "🏅";

        return `${medal} \`#${i + 1}\` <@${u.discord_id}> • **${u.wins} wins**`;
      })
      .join("\n");

    const topUser = users[0];

    const { data: allUsers } = await supabase
      .from("registros-usuarios")
      .select("discord_id, wins")
      .order("wins", { ascending: false });

    const position =
      allUsers.findIndex(u => u.discord_id === message.author.id) + 1;

    const userData =
      allUsers.find(u => u.discord_id === message.author.id);

    const embed = new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle("🏆・RANKING VAGANCIA")
      .setDescription(
        `👑 **TOP 1** ・ <@${topUser.discord_id}> (**${topUser.wins} wins**)\n` +
        `━━━━━━━━━━━━━━━━━━\n\n` +
        `📊 **TOP 10**\n` +
        `${rankingText}\n\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `🎯 **TU ESTADO**\n` +
        `${userData && userData.wins > 0
          ? `📍 Posición: **#${position}**\n💰 Wins: **${userData.wins}**`
          : `Aún no estás en el ranking`
        }`
      )
      .setThumbnail("https://cdn-icons-png.flaticon.com/512/2583/2583344.png")
      .setFooter({
        text: "⚔️ Vagancia Nube System"
      })
      .setTimestamp();

    message.channel.send({
      embeds: [embed]
    });
  }

  // ===================== NUEVO PERFIL (REEMPLAZO !MYWINS) =====================
  if (command === "!mywins") {

    try {
      // Obtenemos todos los registros ordenados para calcular el Top Global en tiempo real
      const { data: allUsers, error: dbError } = await supabase
        .from("registros-usuarios")
        .select("discord_id, wins")
        .order("wins", { ascending: false });

      if (dbError) throw dbError;

      const userData = allUsers.find(u => u.discord_id === message.author.id);
      const userWins = userData ? userData.wins : 0;
      
      const position = allUsers.findIndex(u => u.discord_id === message.author.id) + 1;
      const globalRank = userWins > 0 ? `#${position}` : "Sin rank";

      // Buscamos el logo local adjunto en la carpeta raíz del proyecto
      const file = new AttachmentBuilder("./logo.png");

      const profileEmbed = new EmbedBuilder()
        .setColor(0xFF007F)
        .setAuthor({ 
          name: message.author.username, 
          iconURL: message.author.displayAvatarURL({ dynamic: true }) 
        })
        .setDescription(
          `<:dox_rank:1347311895836754122> **· VAGANCIA RANK**\n\n` +
          `<:usuario:1411828606312906772> **USUARIO:** <@${message.author.id}>\n\n` +
          `<:top_global:1493178367728685136> **TOP GLOBAL:** ${globalRank}\n\n` +
          `<:wins:1452217653350502462> **WINS:** ${userWins}\n\n` +
          `───────────────────\n\n` +
          `😈 **Seguís subiendo en el ranking !**\n\n` +
          `───────────────────`
        )
        .setThumbnail("attachment://logo.png") 
        .setFooter({
          text: "❤️ Vagancia Rank system"
        })
        .setTimestamp();

      message.reply({
        embeds: [profileEmbed],
        files: [file]
      });

    } catch (e) {
      console.error(e);
      message.reply("❌ Ocurrió un error al cargar tu perfil.");
    }
  }
});

client.login(token);