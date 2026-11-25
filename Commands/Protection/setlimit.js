const { MessageEmbed } = require("discord.js");
const Pro = require(`pro.db`);

module.exports = {
  name: 'setlimit',
  aliases: ['حدالحماية'],
  run: async (client, message, args) => {
    const Color = Pro.get(`Guild_Color = ${message.guild.id}`) || message.guild.me.displayHexColor || `#000000`;
    if (!message.member.permissions.has('ADMINISTRATOR')) return message.react('❌');

    const limit = parseInt(args[0]);
    if (!limit || isNaN(limit) || limit < 1 || limit > 20) {
      const embed = new MessageEmbed()
        .setColor(`${Color}`)
        .setDescription(`**❌ يرجى كتابة رقم صحيح بين 1 و 20\nمثال: =setlimit 5**`);
      return message.reply({ embeds: [embed] });
    }

    Pro.set(`security_limit = ${message.guild.id}`, limit);

    const embed = new MessageEmbed()
      .setColor(`${Color}`)
      .setDescription(`**✅ تم تحديد حد الحماية إلى \`${limit}\` أكشن**`)
      .setFooter(client.user.username, client.user.displayAvatarURL());

    message.reply({ embeds: [embed] });
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌙 تم البرمجة بواسطة : TRY
// 🏪 المتجر : NOVANIGHT SYSTEM BOT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
