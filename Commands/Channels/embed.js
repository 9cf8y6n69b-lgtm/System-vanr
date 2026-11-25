const { MessageEmbed } = require("discord.js");
const Pro = require(`pro.db`);

module.exports = {
  name: 'embed',
  aliases: ['إمبيد', 'امبيد'],
  run: async (client, message, args) => {
    const Color = Pro.get(`Guild_Color = ${message.guild.id}`) || message.guild.me.displayHexColor || `#000000`;
    if (!message.member.permissions.has('MANAGE_MESSAGES')) return message.react('❌');

    const text = args.join(' ');
    if (!text) {
      const embed = new MessageEmbed().setColor(`${Color}`).setDescription(`**❌ يرجى كتابة نص للإمبيد**`);
      return message.reply({ embeds: [embed] });
    }

    const embed = new MessageEmbed()
      .setColor(`${Color}`)
      .setDescription(text)
      .setFooter(client.user.username, client.user.displayAvatarURL())
      .setTimestamp();

    await message.channel.send({ embeds: [embed] });
    await message.delete().catch(() => {});
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌙 تم البرمجة بواسطة : TRY
// 🏪 المتجر : NOVANIGHT SYSTEM BOT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
