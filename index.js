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

// IDs de roles autorizados
const INTER_APOS_ROLE_ID = "1476541425263968391";
const RULETA_ROLE_ID = "1558984699609612318";

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
  // Es Admin O tiene el rol Inter Apos O tiene el rol de Ruleta
  const hasPermission = 
    message.member.permissions.has(PermissionsBitField.Flags.Administrator) ||
    message.member.roles.cache.has(INTER_APOS_ROLE_ID) ||
    message.member.roles.cache.has(RULETA_ROLE_ID);

  // ===================== SUMAR WIN (GENERAL) =====================
  if (command === "!win") {
    if (!hasPermission) {
      return message.reply("⛔ No tenés permisos para usar este comando.");
    }

    const user = message.mentions.users.first();
    if (!user) {
      return message.reply("❌ Usá: !win @usuario [cantidad]");
    }

    let amount = parseInt(args[2]) || 1;
    if (isNaN(amount) || amount < 1 || amount > 10) {
      return message.reply("❌ La cantidad de wins debe ser un número entre 1 y 10.");
    }

    try {
      await supabase
        .from("registros-usuarios")
        .upsert({ discord_id: user.id }, { onConflict: "discord_id" });

      const { error } = await supabase
        .rpc("increment_wins", { row_id: user.id, num: amount });

      if (error) throw error;

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

  // ===================== RESTAR WIN (GENERAL) =====================
  if (command === "!rwin") {
    if (!hasPermission) {
      return message.reply("⛔ No tenés permisos para usar este comando.");
    }

    const user = message.mentions.users.first();
    if (!user) {
      return message.reply("❌ Usá: !rwin @usuario [cantidad]");
    }

    let amount = parseInt(args[2]) || 1;
    if (isNaN(amount) || amount < 1 || amount > 10) {
      return message.reply("❌ La cantidad a restar debe ser un número entre 1 y 10.");
    }

    try {
      const { data: userData, error: fetchError } = await supabase
        .from("registros-usuarios")
        .select("wins")
        .eq("discord_id", user.id)
        .single();

      if (fetchError || !userData) {
        return message.reply("❌ El usuario no tiene un registro activo en el ranking.");
      }

      let finalAmount = amount;
      if (userData.wins - amount < 0) {
        finalAmount = userData.wins; 
      }

      if (finalAmount === 0) {
        return message.reply(`⚠ **${user.username}** ya tiene 0 wins.`);
      }

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

  // ===================== SUMAR WIN (FEMENINO) =====================
  if (command === "!fwin") {
    if (!hasPermission) {
      return message.reply("⛔ No tenés permisos para usar este comando.");
    }

    const user = message.mentions.users.first();
    if (!user) {
      return message.reply("❌ Usá: !fwin @usuario [cantidad]");
    }

    let amount = parseInt(args[2]) || 1;
    if (isNaN(amount) || amount < 1 || amount > 10) {
      return message.reply("❌ La cantidad de wins debe ser un número entre 1 y 10.");
    }

    try {
      await supabase
        .from("registros-usuarios")
        .upsert({ discord_id: user.id }, { onConflict: "discord_id" });

      const { error } = await supabase
        .rpc("increment_wins_femeninas", { row_id: user.id, num: amount });

      if (error) throw error;

      const { data: userData } = await supabase
        .from("registros-usuarios")
        .select("wins_femeninas")
        .eq("discord_id", user.id)
        .single();

      message.channel.send(
        `👑 **${user.username}** recibió **+${amount} wins** (Femenino). Total actual: **${userData?.wins_femeninas || 0} wins**`
      );
    } catch (e) {
      console.error(e);
      message.reply("❌ Error al guardar en la base de datos.");
    }
  }

  // ===================== RESTAR WIN (FEMENINO) =====================
  if (command === "!rfwin") {
    if (!hasPermission) {
      return message.reply("⛔ No tenés permisos para usar este comando.");
    }

    const user = message.mentions.users.first();
    if (!user) {
      return message.reply("❌ Usá: !rfwin @usuario [cantidad]");
    }

    let amount = parseInt(args[2]) || 1;
    if (isNaN(amount) || amount < 1 || amount > 10) {
      return message.reply("❌ La cantidad a restar debe ser un número entre 1 y 10.");
    }

    try {
      const { data: userData, error: fetchError } = await supabase
        .from("registros-usuarios")
        .select("wins_femeninas")
        .eq("discord_id", user.id)
        .single();

      if (fetchError || !userData) {
        return message.reply("❌ La usuaria no tiene un registro activo en el ranking femenino.");
      }

      let currentWins = userData.wins_femeninas || 0;
      let finalAmount = amount;
      if (currentWins - amount < 0) {
        finalAmount = currentWins; 
      }

      if (finalAmount === 0) {
        return message.reply(`⚠ **${user.username}** ya tiene 0 wins femeninas.`);
      }

      const { error } = await supabase
        .rpc("increment_wins_femeninas", { row_id: user.id, num: -finalAmount });

      if (error) throw error;

      message.channel.send(
        `📉 **${user.username}** perdió **-${finalAmount} wins** (Femenino). Total actual: **${currentWins - finalAmount} wins**`
      );
    } catch (e) {
      console.error(e);
      message.reply("❌ Error al procesar la solicitud en la base de datos.");
    }
  }

  // ===================== SUMAR WIN (RULETA) =====================
  if (command === "!rulawin") {
    if (!hasPermission) {
      return message.reply("⛔ No tenés permisos para usar este comando.");
    }

    const user = message.mentions.users.first();
    if (!user) {
      return message.reply("❌ Usá: !rulawin @usuario [cantidad]");
    }

    let amount = parseInt(args[2]) || 1;
    if (isNaN(amount) || amount < 1 || amount > 10) {
      return message.reply("❌ La cantidad de wins debe ser un número entre 1 y 10.");
    }

    try {
      await supabase
        .from("registros-usuarios")
        .upsert({ discord_id: user.id }, { onConflict: "discord_id" });

      const { error } = await supabase
        .rpc("increment_rulawins", { row_id: user.id, num: amount });

      if (error) throw error;

      const { data: userData } = await supabase
        .from("registros-usuarios")
        .select("rulawins")
        .eq("discord_id", user.id)
        .single();

      message.channel.send(
        `🎰 **${user.username}** ganó **+${amount} victoria(s) en Ruleta**! Total actual: **${userData?.rulawins || 0} rula-wins** 🎯`
      );
    } catch (e) {
      console.error(e);
      message.reply("❌ Error al guardar en la base de datos.");
    }
  }

  // ===================== RESTAR WIN (RULETA) =====================
  if (command === "!quitwin") {
    if (!hasPermission) {
      return message.reply("⛔ No tenés permisos para usar este comando.");
    }

    const user = message.mentions.users.first();
    if (!user) {
      return message.reply("❌ Usá: !quitwin @usuario [cantidad]");
    }

    let amount = parseInt(args[2]) || 1;
    if (isNaN(amount) || amount < 1 || amount > 10) {
      return message.reply("❌ La cantidad a restar debe ser un número entre 1 y 10.");
    }

    try {
      const { data: userData, error: fetchError } = await supabase
        .from("registros-usuarios")
        .select("rulawins")
        .eq("discord_id", user.id)
        .single();

      if (fetchError || !userData) {
        return message.reply("❌ El usuario no tiene un registro activo en el ranking de ruleta.");
      }

      let currentWins = userData.rulawins || 0;
      let finalAmount = amount;
      if (currentWins - amount < 0) {
        finalAmount = currentWins; 
      }

      if (finalAmount === 0) {
        return message.reply(`⚠ **${user.username}** ya tiene 0 victorias en ruleta.`);
      }

      const { error } = await supabase
        .rpc("increment_rulawins", { row_id: user.id, num: -finalAmount });

      if (error) throw error;

      message.channel.send(
        `📉 **${user.username}** perdió **-${finalAmount} victoria(s) en Ruleta**. Total actual: **${currentWins - finalAmount} rula-wins**`
      );
    } catch (e) {
      console.error(e);
      message.reply("❌ Error al procesar la solicitud en la base de datos.");
    }
  }

  // ===================== RESET RANKING =====================
  if (command === "!reset") {
    if (!hasPermission) {
      return message.reply("⛔ No tenés permisos para usar este comando.");
    }

    const { error } = await supabase
      .from("registros-usuarios")
      .update({ wins: 0, wins_femeninas: 0, rulawins: 0 })
      .neq("wins", -1);

    if (error) {
      console.error(error);
      return message.reply("❌ Error al resetear.");
    }

    message.channel.send("♻️ Rankings reseteados correctamente (General, Femenino y Ruleta).");
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

    const position = allUsers ? allUsers.findIndex(u => u.discord_id === message.author.id) + 1 : 0;
    const userData = allUsers ? allUsers.find(u => u.discord_id === message.author.id) : null;

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

  // ===================== RANKING FEMENINO =====================
  if (command === "!frank") {
    const { data: users, error } = await supabase
      .from("registros-usuarios")
      .select("*")
      .gt("wins_femeninas", 0)
      .order("wins_femeninas", { ascending: false })
      .limit(10);

    if (error || !users || users.length === 0) {
      return message.channel.send("👑 Aún no hay victorias registradas en el ranking femenino.");
    }

    const medals = ["🥇", "🥈", "🥉"];

    const rankingText = users
      .map((u, i) => {
        const medal = medals[i] || "🏅";
        return `${medal} #${i + 1} <@${u.discord_id}> • **${u.wins_femeninas} wins**`;
      })
      .join("\n");

    const topUser = users[0];

    const { data: allUsers } = await supabase
      .from("registros-usuarios")
      .select("discord_id, wins_femeninas")
      .gt("wins_femeninas", 0)
      .order("wins_femeninas", { ascending: false });

    const position = allUsers ? allUsers.findIndex(u => u.discord_id === message.author.id) + 1 : 0;
    const userData = allUsers ? allUsers.find(u => u.discord_id === message.author.id) : null;

    const embed = new EmbedBuilder()
      .setColor(0xFF007F)
      .setTitle("👑・RANKING FEMENINO VAGANCIA")
      .setDescription(
        `👑 **TOP 1** ・ <@${topUser.discord_id}> (**${topUser.wins_femeninas} wins**)\n` +
        `━━━━━━━━━━━━━━━━━━\n\n` +
        `📊 **TOP 10 FEMENINO**\n` +
        `${rankingText}\n\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `🎯 **TU ESTADO**\n` +
        `${userData && userData.wins_femeninas > 0 ? `📍 Posición Femenina: **#${position}**\n💰 Wins: **${userData.wins_femeninas}**` : "Aún no estás en el ranking femenino"}`
      )
      .setThumbnail("attachment://rankfem.png")
      .setFooter({ text: "❤️ Vagancia Rank system" })
      .setTimestamp();

    const file = new AttachmentBuilder("./rankfem.png");

    message.channel.send({ embeds: [embed], files: [file] });
  }

  // ===================== RANKING RULETA =====================
  if (command === "!rularank") {
    const { data: users, error } = await supabase
      .from("registros-usuarios")
      .select("*")
      .gt("rulawins", 0)
      .order("rulawins", { ascending: false })
      .limit(10);

    if (error || !users || users.length === 0) {
      return message.channel.send("🎰 Aún no hay victorias registradas en el ranking de ruleta.");
    }

    const medals = ["🥇", "🥈", "🥉"];

    const rankingText = users
      .map((u, i) => {
        const medal = medals[i] || "🏅";
        return `${medal} #${i + 1} <@${u.discord_id}> • **${u.rulawins} rula-wins**`;
      })
      .join("\n");

    const topUser = users[0];

    const { data: allUsers } = await supabase
      .from("registros-usuarios")
      .select("discord_id, rulawins")
      .gt("rulawins", 0)
      .order("rulawins", { ascending: false });

    const position = allUsers ? allUsers.findIndex(u => u.discord_id === message.author.id) + 1 : 0;
    const userData = allUsers ? allUsers.find(u => u.discord_id === message.author.id) : null;

    const embed = new EmbedBuilder()
      .setColor(0x9B59B6)
      .setTitle("🎰・RANKING RULETA APOSTADOS")
      .setDescription(
        `👑 **REY DE LA RULETA** ・ <@${topUser.discord_id}> (**${topUser.rulawins} rula-wins**)\n` +
        `━━━━━━━━━━━━━━━━━━\n\n` +
        `🎲 **TOP 10 RULETEROS**\n` +
        `${rankingText}\n\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `🎯 **TU ESTADO**\n` +
        `${userData && userData.rulawins > 0 ? `📍 Posición: **#${position}**\n🎲 Victorias: **${userData.rulawins}**` : "Aún no figurás en el ranking de ruleta"}`
      )
      .setThumbnail("attachment://ruletero.png")
      .setFooter({ text: "🎲 Vagancia Roulette System" })
      .setTimestamp();

    const file = new AttachmentBuilder("./ruletero.png");

    message.channel.send({ embeds: [embed], files: [file] });
  }

  // ===================== MI PERFIL GENERAL =====================
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

  // ===================== MI PERFIL FEMENINO =====================
  if (command === "!fmywins") {
    try {
      const { data: allUsers, error: dbError } = await supabase
        .from("registros-usuarios")
        .select("discord_id, wins_femeninas")
        .gt("wins_femeninas", 0)
        .order("wins_femeninas", { ascending: false });

      if (dbError) throw dbError;

      const userData = allUsers ? allUsers.find(u => u.discord_id === message.author.id) : null;
      const userWins = userData ? userData.wins_femeninas : 0;
      
      const position = allUsers ? allUsers.findIndex(u => u.discord_id === message.author.id) + 1 : 0;
      const globalRank = userWins > 0 ? `#${position}` : "Sin rank";

      const file = new AttachmentBuilder("./rankfem.png");
      const userAvatarURL = message.author.displayAvatarURL({ dynamic: true, size: 1024 });

      const profileEmbed = new EmbedBuilder()
        .setColor(0xFF007F)
        .setAuthor({ 
          name: message.author.username, 
          iconURL: message.author.displayAvatarURL({ dynamic: true }) 
        })
        .setDescription(
          `<:1326235112920186951:1540650992104898590> **· VAGANCIA RANK FEMENINO**\n\n` +
          `<a:9mar:1524563170868596839> **USUARIO:** <@${message.author.id}>\n\n` +
          `<:ChatGPT_Image_6_may_2026__06_14_:1548620596147916841> **TOP GLOBAL:** ${globalRank}\n\n` +
          `<:Gemini_Generated_Image_od72axod7:1501696778091888782> **WINS:** ${userWins}\n\n` +
          `───────────────────\n\n` +
          `😈 **Seguís subiendo en el ranking !**\n\n` +
          `───────────────────`
        )
        .setThumbnail("attachment://rankfem.png")
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

  // ===================== MI PERFIL RULETA =====================
  if (command === "!myrula") {
    try {
      const { data: allUsers, error: dbError } = await supabase
        .from("registros-usuarios")
        .select("discord_id, rulawins")
        .gt("rulawins", 0)
        .order("rulawins", { ascending: false });

      if (dbError) throw dbError;

      const userData = allUsers ? allUsers.find(u => u.discord_id === message.author.id) : null;
      const userRulaWins = userData ? userData.rulawins : 0;
      
      const position = allUsers ? allUsers.findIndex(u => u.discord_id === message.author.id) + 1 : 0;
      const globalRank = userRulaWins > 0 ? `#${position}` : "Sin rank";

      const file = new AttachmentBuilder("./ruletero.png");
      const userAvatarURL = message.author.displayAvatarURL({ dynamic: true, size: 1024 });

      const profileEmbed = new EmbedBuilder()
        .setColor(0x8E44AD)
        .setAuthor({ 
          name: message.author.username, 
          iconURL: message.author.displayAvatarURL({ dynamic: true }) 
        })
        .setDescription(
          `🎰 **· PERFIL RULETA APOSTADOS** 🎰\n\n` +
          `👤 **USUARIO:** <@${message.author.id}>\n\n` +
          `🏆 **TOP RULETA:** ${globalRank}\n\n` +
          `🎲 **RULA WINS:** ${userRulaWins}\n\n` +
          `───────────────────\n\n` +
          `🔥 **¡Que la suerte siga de tu lado!**\n\n` +
          `───────────────────`
        )
        .setThumbnail("attachment://ruletero.png")
        .setImage(userAvatarURL)
        .setFooter({ text: "🎲 Vagancia Roulette System" })
        .setTimestamp();

      message.reply({
        embeds: [profileEmbed],
        files: [file]
      });

    } catch (e) {
      console.error(e);
      message.reply("❌ Ocurrió un error al cargar tu perfil de ruleta.");
    }
  }
});

client.login(token);