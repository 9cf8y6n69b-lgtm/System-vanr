const { MessageEmbed } = require("discord.js");
const Pro = require(`pro.db`);

module.exports = {
  name: 'stats',
  aliases: ['إحصائيات'],
  run: async (client, message) => {
    const Color = Pro.get(`Guild_Color = ${message.guild.id}`) || message.guild.me.displayHexColor || `#000000`;
    if (!message.member.permissions.has('MODERATE_MEMBERS')) return message.react('❌');

    const member = message.mentions.members.first() || message.member;
    const bans = Pro.get(`ban_count = ${message.guild.id} = ${member.id}`) || 0;
    const kicks = Pro.get(`kick_count = ${message.guild.id} = ${member.id}`) || 0;
    const mutes = Pro.get(`mute_count = ${message.guild.id} = ${member.id}`) || 0;
    const warns_given = Pro.get(`warns_given = ${message.guild.id} = ${member.id}`) || 0;

    const embed = new MessageEmbed()
      .setColor(`${Color}`)
      .setTitle(`📊 إحصائيات ${member.user.tag}`)
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .addField('🔨 بانات', `${bans}`, true)
      .addField('👢 طرد', `${kicks}`, true)
      .addField('🔇 كتم', `${mutes}`, true)
      .addField('⚠️ تحذيرات أعطاها', `${warns_given}`, true)
      .setFooter(client.user.username, client.user.displayAvatarURL())
      .setTimestamp();

    message.reply({ embeds: [embed] });
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌙 تم البرمجة بواسطة : TRY
// 🏪 المتجر : NOVANIGHT SYSTEM BOT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
