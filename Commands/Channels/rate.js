const { MessageEmbed } = require("discord.js");
const Pro = require(`pro.db`);

module.exports = {
  name: 'rate',
  aliases: ['تقييم'],
  run: async (client, message, args) => {
    const Color = Pro.get(`Guild_Color = ${message.guild.id}`) || message.guild.me.displayHexColor || `#000000`;

    const target = message.mentions.members.first() || message.member;
    const rating = Math.floor(Math.random() * 101);
    const stars = '⭐'.repeat(Math.ceil(rating / 20));

    const embed = new MessageEmbed()
      .setColor(`${Color}`)
      .setTitle('⭐ التقييم')
      .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
      .setDescription(`**${target.user.tag}**\nالتقييم: \`${rating}/100\`\n${stars}`)
      .setFooter(client.user.username, client.user.displayAvatarURL())
      .setTimestamp();

    message.reply({ embeds: [embed] });
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌙 تم البرمجة بواسطة : TRY
// 🏪 المتجر : NOVANIGHT SYSTEM BOT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
