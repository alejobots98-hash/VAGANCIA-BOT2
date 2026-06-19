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
  console.log("🔌 Base de datos Supabase conectada");
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
      return message.reply("❌ Usá: !win @usuario [cantidad]");
    }

    // Si no se especifica cantidad, por defecto suma 1
    let amount = parseInt(args[2]) || 1;

    if (isNaN(amount) || amount < 1 || amount > 10) {
      return message.reply("❌ La cantidad de wins debe ser un número entre 1 y 10.");
    }

    try {
      // Aseguramos que el usuario exista en la tabla
      await supabase
        .from("registros-usuarios")
        .upsert({ discord_id: user.id }, { onConflict: "discord_id" });

      // Sumamos de forma segura mediante RPC
      const { error } = await supabase
        .rpc("increment_wins", { row_id: user.id, num: amount });

      if (error) throw error;

      // Buscamos el nuevo total para mostrarlo
      const { data: userData } = await supabase
        .from("registros-usuarios")
        .select("wins")
        .eq("discord_id", user.id)
        .single();

      message.channel.send(
        `🏆 **${user.username}** recibió **+${amount} wins**. Total actual: **${userData?.wins || 0} wins**`
      );

    } catch (e) {
      console.error(e);
      message.reply("❌ Error al guardar en la base de datos.");
    }
  }

  // ===================== RESTAR WIN =====================
  if (command === "!rwin") {

    if (!isAdmin) {
      return message.reply("⛔ Solo administradores pueden restar wins.");
    }

    const user = message.mentions.users.first();

    if (!user) {
      return message.reply("❌ Usá: !rwin @usuario [cantidad]");
    }

    // Si no se especifica cantidad, por defecto resta 1
    let amount = parseInt(args[2]) || 1;

    if (isNaN(amount) || amount < 1 || amount > 10) {
      return message.reply("❌ La cantidad a restar debe ser un número entre 1 y 10.");
    }

    try {
      // Verificamos si el usuario existe para no restar en el vacío
      const { data: userData, error: fetchError } = await supabase
        .from("registros-usuarios")
        .select("wins")
        .eq("discord_id", user.id)
        .single();

      if (fetchError || !userData) {
        return message.reply("❌ El usuario no tiene un registro activo en el ranking.");
      }

      // Evitamos que queden wins en negativo
      let finalAmount = amount;
      if (userData.wins - amount < 0) {
        finalAmount = userData.wins; 
      }

      if (finalAmount === 0) {
        return message.reply(`⚠ **${user.username}** ya tiene 0 wins.`);
      }

      // Restamos pasando el número en negativo al RPC
      const { error } = await supabase
        .rpc("increment_wins", { row_id: user.id, num: -finalAmount });

      if (error) throw error;

      message.channel.send(
        `📉 **${user.username}** perdió **-${finalAmount} wins**. Total actual: **${userData.wins - finalAmount} wins**`
      );

    } catch (e) {
      console.error(e);
      message.reply("❌ Error al procesar la solicitud en la base de datos.");
    }
  }

  // ===================== RESET RANKING =====================
  if (command === "!reset") {

    if (!isAdmin) {
      return message.reply("⛔ Solo administradores.");
    }

    const { error } = await supabase
      .from("registros-usuarios")
      .update({ wins: 0 })
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
        return `${medal} #${i + 1} <@${u.discord_id}> • **${u.wins} wins**`;
      })
      .join("\n");

    const topUser = users[0];

    const { data: allUsers } = await supabase
      .from("registros-usuarios")
      .select("discord_id, wins")
      .order("wins", { ascending: false });

    const position = allUsers.findIndex(u => u.discord_id === message.author.id) + 1;
    const userData = allUsers.find(u => u.discord_id === message.author.id);

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
        `${userData && userData.wins > 0 ? `📍 Posición: **#${position}**\n💰 Wins: **${userData.wins}**` : "Aún no estás en el ranking"}`
      )
      .setThumbnail("https://cdn-icons-png.flaticon.com/512/2583/2583344.png")
      .setFooter({ text: "⚔️ Vagancia Nube System" })
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }

  // ===================== NUEVO PERFIL =====================
  if (command === "!mywins") {

    try {
      const { data: allUsers, error: dbError } = await supabase
        .from("registros-usuarios")
        .select("discord_id, wins")
        .order("wins", { ascending: false });

      if (dbError) throw dbError;

      const userData = allUsers.find(u => u.discord_id === message.author.id);
      const userWins = userData ? userData.wins : 0;
      
      const position = allUsers.findIndex(u => u.discord_id === message.author.id) + 1;
      const globalRank = userWins > 0 ? `#${position}` : "Sin rank";

      const file = new AttachmentBuilder("./logo.png");
      const userAvatarURL = message.author.displayAvatarURL({ dynamic: true, size: 1024 });

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
        .setImage(userAvatarURL)
        .setFooter({ text: "❤️ Vagancia Rank system" })
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