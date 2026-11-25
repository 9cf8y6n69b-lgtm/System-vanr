const { MessageEmbed } = require("discord.js");
const Pro = require(`pro.db`);
const { owners } = require(`${process.cwd()}/config`);

module.exports = {
  name: 'sechard',
  aliases: ['حمايةقصوى'],
  run: async (client, message) => {
    const Color = Pro.get(`Guild_Color = ${message.guild.id}`) || message.guild.me.displayHexColor || `#000000`;
    if (!message.member.permissions.has('ADMINISTRATOR')) return message.react('❌');

    const current = Pro.get(`sechard = ${message.guild.id}`) || false;
    Pro.set(`sechard = ${message.guild.id}`, !current);

    const embed = new MessageEmbed()
      .setColor(`${Color}`)
      .setDescription(`**${!current ? '✅ تم تفعيل' : '❌ تم تعطيل'} الحماية القصوى**`)
      .setFooter(client.user.username, client.user.displayAvatarURL());

    message.reply({ embeds: [embed] });
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌙 تم البرمجة بواسطة : TRY
// 🏪 المتجر : NOVANIGHT SYSTEM BOT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
