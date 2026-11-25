const { MessageEmbed } = require("discord.js");
const Pro = require(`pro.db`);

module.exports = {
  name: 'mymute',
  run: async (client, message) => {
    const Color = Pro.get(`Guild_Color = ${message.guild.id}`) || message.guild.me.displayHexColor || `#000000`;
    if (!message.member.permissions.has('MODERATE_MEMBERS')) return message.react('❌');

    const member = message.mentions.members.first() || message.member;
    const isMuted = member.isCommunicationDisabled();
    const until = member.communicationDisabledUntil;

    const embed = new MessageEmbed()
      .setColor(`${Color}`)
      .setTitle('🔇 معلومات الميوت')
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .setDescription(
        isMuted
          ? `**العضو:** ${member.user.tag}\n**مكتوم حتى:** <t:${Math.floor(until.getTime() / 1000)}:F>`
          : `**${member.user.tag} غير مكتوم**`
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
