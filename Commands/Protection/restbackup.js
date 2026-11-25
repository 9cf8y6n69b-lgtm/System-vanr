const { MessageEmbed } = require("discord.js");
const Pro = require(`pro.db`);
const { owners } = require(`${process.cwd()}/config`);

module.exports = {
  name: 'restbackup',
  aliases: ['باكب', 'استرجاع'],
  run: async (client, message) => {
    const Color = Pro.get(`Guild_Color = ${message.guild.id}`) || message.guild.me.displayHexColor || `#000000`;
    if (!owners.includes(message.author.id) && !message.member.permissions.has('ADMINISTRATOR')) return message.react('❌');

    const embed = new MessageEmbed()
      .setColor(`${Color}`)
      .setTitle('🔄 استرجاع السيرفر')
      .setDescription('**⚠️ هذه الميزة تتطلب إعداد نظام باكب مسبقاً عبر =setbackup**\n\nللإعداد الكامل تواصل مع مالك البوت.')
      .setFooter(client.user.username, client.user.displayAvatarURL());

    message.reply({ embeds: [embed] });
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌙 تم البرمجة بواسطة : TRY
// 🏪 المتجر : NOVANIGHT SYSTEM BOT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
