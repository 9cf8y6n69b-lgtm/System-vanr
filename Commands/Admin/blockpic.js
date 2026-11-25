const { MessageEmbed } = require("discord.js");
const Pro = require(`pro.db`);

module.exports = {
  name: 'blockpic',
  run: async (client, message) => {
    const Color = Pro.get(`Guild_Color = ${message.guild.id}`) || message.guild.me.displayHexColor || `#000000`;
    if (!message.member.permissions.has('MANAGE_MESSAGES')) return message.react('❌');

    const channel = message.mentions.channels.first() || message.channel;
    const current = Pro.get(`blockpic = ${message.guild.id} = ${channel.id}`) || false;
    Pro.set(`blockpic = ${message.guild.id} = ${channel.id}`, !current);

    const embed = new MessageEmbed()
      .setColor(`${Color}`)
      .setDescription(`**${!current ? '✅ تم تفعيل' : '❌ تم تعطيل'} بلوك الصور في ${channel}**`)
      .setFooter(client.user.username, client.user.displayAvatarURL());

    message.reply({ embeds: [embed] });
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌙 تم البرمجة بواسطة : TRY
// 🏪 المتجر : NOVANIGHT SYSTEM BOT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
