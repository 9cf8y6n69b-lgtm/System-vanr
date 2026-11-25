const { MessageEmbed } = require("discord.js");
const Pro = require(`pro.db`);

module.exports = {
  name: 'mhide',
  run: async (client, message) => {
    const Color = Pro.get(`Guild_Color = ${message.guild.id}`) || message.guild.me.displayHexColor || `#000000`;
    if (!message.member.permissions.has('MANAGE_CHANNELS')) return message.react('❌');

    const member = message.mentions.members.first();
    const channel = message.mentions.channels.first() || message.channel;

    if (!member) {
      const embed = new MessageEmbed().setColor(`${Color}`).setDescription(`**❌ يرجى منشن عضو**`);
      return message.reply({ embeds: [embed] });
    }

    await channel.permissionOverwrites.edit(member, { VIEW_CHANNEL: false }).catch(() => {});

    const embed = new MessageEmbed()
      .setColor(`${Color}`)
      .setDescription(`**✅ تم إخفاء ${channel} عن ${member}**`)
      .setFooter(client.user.username, client.user.displayAvatarURL());

    message.reply({ embeds: [embed] });
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌙 تم البرمجة بواسطة : TRY
// 🏪 المتجر : NOVANIGHT SYSTEM BOT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
