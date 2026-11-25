const { MessageEmbed } = require("discord.js");
const Pro = require(`pro.db`);

module.exports = {
  name: 'absrooms',
  aliases: ['الغائبين'],
  run: async (client, message) => {
    const Color = Pro.get(`Guild_Color = ${message.guild.id}`) || message.guild.me.displayHexColor || `#000000`;
    if (!message.member.permissions.has('MANAGE_GUILD')) return message.react('❌');

    await message.guild.members.fetch();
    const adminsNotInVC = message.guild.members.cache.filter(m =>
      !m.user.bot && m.permissions.has('ADMINISTRATOR') && !m.voice.channel
    );

    if (!adminsNotInVC.size) {
      const embed = new MessageEmbed().setColor(`${Color}`).setDescription(`**✅ جميع الأدمن متواجدون في الرومات الصوتية**`);
      return message.reply({ embeds: [embed] });
    }

    const list = adminsNotInVC.map((m, i) => `**${i + 1}.** ${m.user.tag}`).join('\n');

    const embed = new MessageEmbed()
      .setColor(`${Color}`)
      .setTitle(`🔇 الأدمن الخارجين من الرومات (${adminsNotInVC.size})`)
      .setDescription(list)
      .setFooter(client.user.username, client.user.displayAvatarURL())
      .setTimestamp();

    message.reply({ embeds: [embed] });
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌙 تم البرمجة بواسطة : TRY
// 🏪 المتجر : NOVANIGHT SYSTEM BOT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
