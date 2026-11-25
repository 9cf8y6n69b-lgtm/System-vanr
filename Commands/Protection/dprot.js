const { MessageEmbed } = require("discord.js");
const Pro = require(`pro.db`);

module.exports = {
  name: 'dprot',
  run: async (client, message) => {
    const Color = Pro.get(`Guild_Color = ${message.guild.id}`) || message.guild.me.displayHexColor || `#000000`;
    if (!message.member.permissions.has('ADMINISTRATOR')) return message.react('❌');

    const member = message.mentions.members.first();
    if (!member) {
      const embed = new MessageEmbed().setColor(`${Color}`).setDescription(`**❌ يرجى منشن عضو**`);
      return message.reply({ embeds: [embed] });
    }

    let list = Pro.get(`aprot_list = ${message.guild.id}`) || [];
    if (!list.includes(member.id)) {
      const embed = new MessageEmbed().setColor(`${Color}`).setDescription(`**❌ هذا العضو غير موجود في القائمة**`);
      return message.reply({ embeds: [embed] });
    }

    list = list.filter(id => id !== member.id);
    Pro.set(`aprot_list = ${message.guild.id}`, list);

    const embed = new MessageEmbed()
      .setColor(`${Color}`)
      .setDescription(`**✅ تم إزالة ${member} من قائمة تخطي الحماية المتقدمة**`)
      .setFooter(client.user.username, client.user.displayAvatarURL());

    message.reply({ embeds: [embed] });
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌙 تم البرمجة بواسطة : TRY
// 🏪 المتجر : NOVANIGHT SYSTEM BOT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
