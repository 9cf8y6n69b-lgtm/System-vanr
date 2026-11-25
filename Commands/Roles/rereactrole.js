const { MessageEmbed } = require("discord.js");
const Pro = require(`pro.db`);

module.exports = {
  name: 'rereactrole',
  run: async (client, message, args) => {
    const Color = Pro.get(`Guild_Color = ${message.guild.id}`) || message.guild.me.displayHexColor || `#000000`;
    if (!message.member.permissions.has('MANAGE_ROLES')) return message.react('❌');

    const msgId = args[0];
    if (!msgId) {
      const embed = new MessageEmbed().setColor(`${Color}`).setDescription(`**❌ يرجى كتابة آيدي الرسالة**`);
      return message.reply({ embeds: [embed] });
    }

    let data = Pro.get(`reactionroles = ${message.guild.id}`) || [];
    const before = data.length;
    data = data.filter(r => r.msgId !== msgId);
    Pro.set(`reactionroles = ${message.guild.id}`, data);

    const embed = new MessageEmbed()
      .setColor(`${Color}`)
      .setDescription(before !== data.length ? `**✅ تم إزالة رياكشن رول الرسالة**` : `**❌ لم يتم العثور على رياكشن رول لهذه الرسالة**`)
      .setFooter(client.user.username, client.user.displayAvatarURL());

    message.reply({ embeds: [embed] });
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌙 تم البرمجة بواسطة : TRY
// 🏪 المتجر : NOVANIGHT SYSTEM BOT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
