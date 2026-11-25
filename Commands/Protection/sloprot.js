const { MessageEmbed } = require("discord.js");
const Pro = require(`pro.db`);

module.exports = {
  name: 'sloprot',
  run: async (client, message, args) => {
    const Color = Pro.get(`Guild_Color = ${message.guild.id}`) || message.guild.me.displayHexColor || `#000000`;
    if (!message.member.permissions.has('ADMINISTRATOR')) return message.react('❌');

    const seconds = parseInt(args[0]);
    if (!seconds || isNaN(seconds)) {
      const embed = new MessageEmbed()
        .setColor(`${Color}`)
        .setDescription(`**❌ يرجى كتابة وقت صحيح بالثواني\nمثال: =sloprot 10**`);
      return message.reply({ embeds: [embed] });
    }

    Pro.set(`sloprot = ${message.guild.id}`, seconds);

    const embed = new MessageEmbed()
      .setColor(`${Color}`)
      .setDescription(`**✅ تم تحديد لوق الحماية المتقدمة إلى \`${seconds}\` ثانية**`)
      .setFooter(client.user.username, client.user.displayAvatarURL());

    message.reply({ embeds: [embed] });
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌙 تم البرمجة بواسطة : TRY
// 🏪 المتجر : NOVANIGHT SYSTEM BOT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
