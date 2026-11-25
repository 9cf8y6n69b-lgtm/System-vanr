const { MessageEmbed } = require("discord.js");
const Pro = require(`pro.db`);

module.exports = {
  name: 'profile',
  aliases: ['بروفايل'],
  run: async (client, message) => {
    const Color = Pro.get(`Guild_Color = ${message.guild.id}`) || message.guild.me.displayHexColor || `#000000`;
    const member = message.mentions.members.first() || message.member;
    const user = member.user;

    const warns = Pro.get(`warns = ${message.guild.id} = ${member.id}`) || [];
    const isBlacklisted = Pro.get(`blacklist = ${message.guild.id} = ${member.id}`) ? 'نعم ⛔' : 'لا ✅';

    const embed = new MessageEmbed()
      .setColor(member.displayHexColor || `${Color}`)
      .setTitle(`👤 بروفايل ${user.username}`)
      .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
      .addField('🏷️ الاسم', user.tag, true)
      .addField('🆔 الآيدي', user.id, true)
      .addField('📅 انضم للديسكورد', `<t:${Math.floor(user.createdTimestamp / 1000)}:D>`, true)
      .addField('📥 انضم للسيرفر', `<t:${Math.floor(member.joinedTimestamp / 1000)}:D>`, true)
      .addField('⚠️ التحذيرات', `${warns.length}`, true)
      .addField('⛔ بلاكلست', isBlacklisted, true)
      .addField('🎭 الرول الأعلى', member.roles.highest.toString(), true)
      .addField('🤖 بوت', user.bot ? 'نعم' : 'لا', true)
      .setImage(user.bannerURL({ dynamic: true, size: 1024 }) || null)
      .setFooter(client.user.username, client.user.displayAvatarURL())
      .setTimestamp();

    message.reply({ embeds: [embed] });
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌙 تم البرمجة بواسطة : TRY
// 🏪 المتجر : NOVANIGHT SYSTEM BOT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
