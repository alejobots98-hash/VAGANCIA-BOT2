
  // ===================== MI PERFIL GENERAL (LINK A LA WEB) =====================
  if (command === "!mywins") {
    const embed = new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle("🏆・MI PERFIL VAGANCIA")
      .setDescription(
        `👤 **¡Consultá tu perfil personal!**\n\n` +
        `📊 Para ver tus estadísticas completas, ingresá a nuestra página web.\n\n` +
        `🏆 Wins, derrotas, posición global, winrate, rachas y mucho más.\n\n` +
        `🔗 **[INGRESÁ A LA WEB Y MIRÁ TU PERFIL](${WEB_URL})**`
      )
      .setThumbnail("attachment://vs.gif")
      .setFooter({ text: "⚔️ Vagancia Nube System" })
      .setTimestamp();

    const file = new AttachmentBuilder("./vs.gif");

    return message.channel.send({ embeds: [embed], files: [file] });
  }
