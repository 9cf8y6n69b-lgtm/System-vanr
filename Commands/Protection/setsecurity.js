const { MessageEmbed } = require("discord.js");
const Pro = require(`pro.db`);

module.exports = {
  name: 'setsecurity',
  run: async (client, message) => {
    const Color = Pro.get(`Guild_Color = ${message.guild.id}`) || message.guild.me.displayHexColor || `#000000`;
    if (!message.member.permissions.has('ADMINISTRATOR')) return message.react('❌');

    const channel = message.mentions.channels.first() || message.channel;
    Pro.set(`security_log = ${message.guild.id}`, channel.id);

    const embed = new MessageEmbed()
      .setColor(`${Color}`)
      .setDescription(`**✅ تم تعيين ${channel} كشات لوقات الحماية**`)
      .setFooter(client.user.username, client.user.displayAvatarURL());

    message.reply({ embeds: [embed] });
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌙 تم البرمجة بواسطة : TRY
// 🏪 المتجر : NOVANIGHT SYSTEM BOT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
