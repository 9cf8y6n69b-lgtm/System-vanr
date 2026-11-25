const { MessageEmbed } = require("discord.js");
const Pro = require(`pro.db`);

module.exports = {
  name: 'adminlist',
  aliases: ['الادمن', 'قائمةالادمن'],
  run: async (client, message) => {
    const Color = Pro.get(`Guild_Color = ${message.guild.id}`) || message.guild.me.displayHexColor || `#000000`;
    if (!message.member.permissions.has('MANAGE_GUILD')) return message.react('❌');

    await message.guild.members.fetch();
    const admins = message.guild.members.cache.filter(m =>
      !m.user.bot && m.permissions.has('ADMINISTRATOR')
    );

    if (!admins.size) {
      const embed = new MessageEmbed().setColor(`${Color}`).setDescription(`**لا يوجد أدمن في السيرفر**`);
      return message.reply({ embeds: [embed] });
    }

    const list = admins.map((m, i) => `**${i + 1}.** ${m.user.tag} \`${m.id}\``).join('\n');

    const embed = new MessageEmbed()
      .setColor(`${Color}`)
      .setTitle(`🛡️ قائمة الأدمن (${admins.size})`)
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
