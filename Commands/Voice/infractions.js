const { MessageEmbed } = require("discord.js");
const Pro = require(`pro.db`);

module.exports = {
  name: 'infractions',
  aliases: ['عقوبات'],
  run: async (client, message) => {
    const Color = Pro.get(`Guild_Color = ${message.guild.id}`) || message.guild.me.displayHexColor || `#000000`;
    if (!message.member.permissions.has('MANAGE_GUILD')) return message.react('❌');

    const member = message.mentions.members.first() || message.member;
    const warns = Pro.get(`warns = ${message.guild.id} = ${member.id}`) || [];
    const muted = Pro.get(`muted = ${message.guild.id} = ${member.id}`) || false;
    const prisoned = Pro.get(`prison = ${message.guild.id} = ${member.id}`) || false;

    const embed = new MessageEmbed()
      .setColor(`${Color}`)
      .setTitle(`📋 سجل عقوبات ${member.user.tag}`)
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .addField('⚠️ التحذيرات', `${warns.length}`, true)
      .addField('🔇 مكتوم', muted ? 'نعم' : 'لا', true)
      .addField('🔒 مسجون', prisoned ? 'نعم' : 'لا', true)
      .setFooter(client.user.username, client.user.displayAvatarURL())
      .setTimestamp();

    if (warns.length) {
      embed.addField('📝 آخر تحذير', warns[warns.length - 1]?.reason || 'لم يذكر سبب', false);
    }

    message.reply({ embeds: [embed] });
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌙 تم البرمجة بواسطة : TRY
// 🏪 المتجر : NOVANIGHT SYSTEM BOT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
