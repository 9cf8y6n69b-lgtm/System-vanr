const { MessageEmbed } = require("discord.js");
const Pro = require(`pro.db`);

module.exports = {
  name: 'kickofflinebots',
  aliases: ['طردالبوتات', 'كيكبوتات'],
  run: async (client, message) => {
    const Color = Pro.get(`Guild_Color = ${message.guild.id}`) || message.guild.me.displayHexColor || `#000000`;
    if (!message.member.permissions.has('KICK_MEMBERS')) return message.react('❌');

    await message.guild.members.fetch();

    const offlineBots = message.guild.members.cache.filter(m =>
      m.user.bot &&
      (!m.presence || m.presence.status === 'offline') &&
      m.id !== client.user.id
    );

    if (!offlineBots.size) {
      const embed = new MessageEmbed()
        .setColor(`${Color}`)
        .setDescription(`**✅ لا توجد بوتات غير متصلة**`);
      return message.reply({ embeds: [embed] });
    }

    let kicked = 0;
    const names = [];
    for (const [, bot] of offlineBots) {
      try {
        names.push(bot.user.tag);
        await bot.kick('طرد بوت غير متصل');
        kicked++;
      } catch (e) {}
    }

    const embed = new MessageEmbed()
      .setColor(`${Color}`)
      .setTitle('🤖 طرد البوتات غير المتصلة')
      .setDescription(`**تم طرد \`${kicked}\` بوت:**\n${names.map(n => `**•** ${n}`).join('\n')}`)
      .setFooter(client.user.username, client.user.displayAvatarURL())
      .setTimestamp();

    message.reply({ embeds: [embed] });
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌙 تم البرمجة بواسطة : TRY
// 🏪 المتجر : NOVANIGHT SYSTEM BOT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
