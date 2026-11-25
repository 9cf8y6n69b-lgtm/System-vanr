const { MessageEmbed } = require("discord.js");
const Pro = require(`pro.db`);

module.exports = {
  name: 'vkick',
  aliases: ['فككيك', 'طردصوتي'],
  run: async (client, message) => {
    const Color = Pro.get(`Guild_Color = ${message.guild.id}`) || message.guild.me.displayHexColor || `#000000`;

    const db = Pro.get(`Allow - Command vkick = [ ${message.guild.id} ]`);
    const allowedRole = message.guild.roles.cache.get(db);
    const isAllowed = message.member.roles.cache.has(allowedRole?.id);
    if (!isAllowed && !message.member.permissions.has('MOVE_MEMBERS')) return message.react('❌');

    const member = message.mentions.members.first();
    if (!member) {
      const embed = new MessageEmbed().setColor(`${Color}`).setDescription(`**❌ يرجى منشن عضو\nمثال: =vkick @عضو**`);
      return message.reply({ embeds: [embed] });
    }

    if (!member.voice.channel) {
      const embed = new MessageEmbed().setColor(`${Color}`).setDescription(`**❌ هذا العضو ليس في روم صوتي**`);
      return message.reply({ embeds: [embed] });
    }

    await member.voice.disconnect();

    const embed = new MessageEmbed()
      .setColor(`${Color}`)
      .setDescription(`**✅ تم طرد ${member} من الروم الصوتي**`)
      .setFooter(client.user.username, client.user.displayAvatarURL());

    message.reply({ embeds: [embed] });
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌙 تم البرمجة بواسطة : TRY
// 🏪 المتجر : NOVANIGHT SYSTEM BOT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
