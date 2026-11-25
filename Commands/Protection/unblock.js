const { MessageEmbed } = require("discord.js");
const Pro = require(`pro.db`);

module.exports = {
  name: 'unblock',
  run: async (client, message, args) => {
    const Color = Pro.get(`Guild_Color = ${message.guild.id}`) || message.guild.me.displayHexColor || `#000000`;
    if (!message.member.permissions.has('BAN_MEMBERS')) return message.react('❌');

    const userId = args[0]?.replace(/[<@!>]/g, '');
    if (!userId) {
      const embed = new MessageEmbed().setColor(`${Color}`).setDescription(`**❌ يرجى كتابة آيدي العضو أو منشنه**`);
      return message.reply({ embeds: [embed] });
    }

    let list = Pro.get(`block_list = ${message.guild.id}`) || [];
    list = list.filter(id => id !== userId);
    Pro.set(`block_list = ${message.guild.id}`, list);

    try {
      await message.guild.members.unban(userId);
    } catch (e) {}

    const embed = new MessageEmbed()
      .setColor(`${Color}`)
      .setDescription(`**✅ تم فك الحجب عن <@${userId}>**`)
      .setFooter(client.user.username, client.user.displayAvatarURL());

    message.reply({ embeds: [embed] });
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌙 تم البرمجة بواسطة : TRY
// 🏪 المتجر : NOVANIGHT SYSTEM BOT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
