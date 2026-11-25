const { MessageEmbed } = require("discord.js");
const Pro = require(`pro.db`);

module.exports = {
  name: 'lastvoice',
  aliases: ['آخردخول'],
  run: async (client, message) => {
    const Color = Pro.get(`Guild_Color = ${message.guild.id}`) || message.guild.me.displayHexColor || `#000000`;
    if (!message.member.permissions.has('MANAGE_GUILD')) return message.react('❌');

    const member = message.mentions.members.first() || message.member;
    const lastVC = Pro.get(`lastvoice = ${message.guild.id} = ${member.id}`);

    const embed = new MessageEmbed()
      .setColor(`${Color}`)
      .setTitle('🎙️ آخر دخول صوتي')
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .setDescription(
        lastVC
          ? `**${member.user.tag}**\nآخر دخول: <t:${Math.floor(lastVC / 1000)}:R>\n(<t:${Math.floor(lastVC / 1000)}:F>)`
          : `**لا توجد سجلات لـ ${member.user.tag}**`
      )
      .setFooter(client.user.username, client.user.displayAvatarURL())
      .setTimestamp();

    message.reply({ embeds: [embed] });
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌙 تم البرمجة بواسطة : TRY
// 🏪 المتجر : NOVANIGHT SYSTEM BOT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
