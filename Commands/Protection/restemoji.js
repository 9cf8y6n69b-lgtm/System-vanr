const { MessageEmbed } = require("discord.js");
const Pro = require(`pro.db`);
const { owners } = require(`${process.cwd()}/config`);

module.exports = {
  name: 'restemoji',
  run: async (client, message) => {
    const Color = Pro.get(`Guild_Color = ${message.guild.id}`) || message.guild.me.displayHexColor || `#000000`;
    if (!owners.includes(message.author.id) && !message.member.permissions.has('ADMINISTRATOR')) return message.react('❌');

    const emojis = Pro.get(`backup_emojis = ${message.guild.id}`);
    if (!emojis || !emojis.length) {
      const embed = new MessageEmbed().setColor(`${Color}`).setDescription(`**❌ لا يوجد إيموجيات محفوظة لهذا السيرفر**`);
      return message.reply({ embeds: [embed] });
    }

    let restored = 0;
    for (const emoji of emojis) {
      try {
        await message.guild.emojis.create(emoji.url, emoji.name);
        restored++;
      } catch (e) {}
    }

    const embed = new MessageEmbed()
      .setColor(`${Color}`)
      .setDescription(`**✅ تم استرجاع \`${restored}\` إيموجي**`)
      .setFooter(client.user.username, client.user.displayAvatarURL());

    message.reply({ embeds: [embed] });
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌙 تم البرمجة بواسطة : TRY
// 🏪 المتجر : NOVANIGHT SYSTEM BOT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
