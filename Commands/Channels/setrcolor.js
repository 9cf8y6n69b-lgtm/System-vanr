const { MessageEmbed } = require("discord.js");
const Pro = require(`pro.db`);

module.exports = {
  name: 'setrcolor',
  run: async (client, message, args) => {
    const Color = Pro.get(`Guild_Color = ${message.guild.id}`) || message.guild.me.displayHexColor || `#000000`;
    if (!message.member.permissions.has('MANAGE_CHANNELS')) return message.react('❌');

    const color = args[0];
    if (!color) {
      const embed = new MessageEmbed().setColor(`${Color}`).setDescription(`**❌ يرجى كتابة لون هكس\nمثال: =setrcolor #ff0000**`);
      return message.reply({ embeds: [embed] });
    }

    Pro.set(`ratecolor = ${message.guild.id}`, color);

    const embed = new MessageEmbed()
      .setColor(color.startsWith('#') ? color : `#${color}`)
      .setDescription(`**✅ تم تعيين لون خط التقييمات إلى \`${color}\`**`)
      .setFooter(client.user.username, client.user.displayAvatarURL());

    message.reply({ embeds: [embed] }).catch(() => message.react('❌'));
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌙 تم البرمجة بواسطة : TRY
// 🏪 المتجر : NOVANIGHT SYSTEM BOT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
