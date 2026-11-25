const { MessageEmbed } = require("discord.js");
const Pro = require(`pro.db`);

module.exports = {
  name: 'unvmute',
  aliases: ['فكصوتي'],
  run: async (client, message) => {
    const Color = Pro.get(`Guild_Color = ${message.guild.id}`) || message.guild.me.displayHexColor || `#000000`;

    const db = Pro.get(`Allow - Command unvmute = [ ${message.guild.id} ]`);
    const allowedRole = message.guild.roles.cache.get(db);
    const isAllowed = message.member.roles.cache.has(allowedRole?.id);
    if (!isAllowed && !message.member.permissions.has('MUTE_MEMBERS')) return message.react('❌');

    const member = message.mentions.members.first();
    if (!member) {
      const embed = new MessageEmbed().setColor(`${Color}`).setDescription(`**❌ يرجى منشن عضو**`);
      return message.reply({ embeds: [embed] });
    }

    if (!member.voice.channel) {
      const embed = new MessageEmbed().setColor(`${Color}`).setDescription(`**❌ هذا العضو ليس في روم صوتي**`);
      return message.reply({ embeds: [embed] });
    }

    await member.voice.setMute(false);

    const embed = new MessageEmbed()
      .setColor(`${Color}`)
      .setDescription(`**✅ تم فك الميوت الصوتي عن ${member}**`)
      .setFooter(client.user.username, client.user.displayAvatarURL());

    message.reply({ embeds: [embed] });
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌙 تم البرمجة بواسطة : TRY
// 🏪 المتجر : NOVANIGHT SYSTEM BOT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
