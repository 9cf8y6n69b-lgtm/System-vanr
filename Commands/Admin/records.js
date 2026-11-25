const { MessageEmbed } = require("discord.js");
const Pro = require(`pro.db`);

module.exports = {
  name: 'records',
  aliases: ['سجل'],
  run: async (client, message) => {
    const Color = Pro.get(`Guild_Color = ${message.guild.id}`) || message.guild.me.displayHexColor || `#000000`;
    if (!message.member.permissions.has('MODERATE_MEMBERS')) return message.react('❌');

    const member = message.mentions.members.first() || message.member;
    const warns = Pro.get(`warns = ${message.guild.id} = ${member.id}`) || [];

    const embed = new MessageEmbed()
      .setColor(`${Color}`)
      .setTitle(`📋 سجل عقوبات ${member.user.tag}`)
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .setDescription(
        warns.length
          ? warns.map((w, i) => `**${i + 1}.** ${w.reason} - بواسطة <@${w.mod}>\n<t:${Math.floor(w.time / 1000)}:R>`).join('\n\n')
          : '**لا توجد سجلات**'
      )
      .setFooter(`${warns.length} تحذير`, client.user.displayAvatarURL())
      .setTimestamp();

    message.reply({ embeds: [embed] });
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌙 تم البرمجة بواسطة : TRY
// 🏪 المتجر : NOVANIGHT SYSTEM BOT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
