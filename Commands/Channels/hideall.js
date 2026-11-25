const { MessageEmbed } = require("discord.js");
const Pro = require(`pro.db`);

module.exports = {
  name: 'hideall',
  run: async (client, message) => {
    const Color = Pro.get(`Guild_Color = ${message.guild.id}`) || message.guild.me.displayHexColor || `#000000`;
    if (!message.member.permissions.has('MANAGE_CHANNELS')) return message.react('❌');

    const channels = message.guild.channels.cache.filter(c => c.type === 'GUILD_VOICE');
    let count = 0;
    for (const [, ch] of channels) {
      await ch.permissionOverwrites.edit(message.guild.roles.everyone, { VIEW_CHANNEL: false }).catch(() => {});
      count++;
    }

    const embed = new MessageEmbed()
      .setColor(`${Color}`)
      .setDescription(`**✅ تم إخفاء \`${count}\` روم صوتي**`)
      .setFooter(client.user.username, client.user.displayAvatarURL());

    message.reply({ embeds: [embed] });
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌙 تم البرمجة بواسطة : TRY
// 🏪 المتجر : NOVANIGHT SYSTEM BOT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
