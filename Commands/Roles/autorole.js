const { MessageEmbed } = require("discord.js");
const Pro = require(`pro.db`);

module.exports = {
  name: 'autorole',
  aliases: ['رولتلقائي', 'أوتورول'],
  run: async (client, message) => {
    const Color = Pro.get(`Guild_Color = ${message.guild.id}`) || message.guild.me.displayHexColor || `#000000`;
    if (!message.member.permissions.has('MANAGE_ROLES')) return message.react('❌');

    const role = message.mentions.roles.first() || message.guild.roles.cache.get(message.content.trim().split(/ +/)[1]);

    if (!role) {
      const current = Pro.get(`autorole = ${message.guild.id}`);
      if (current) {
        const r = message.guild.roles.cache.get(current);
        const embed = new MessageEmbed()
          .setColor(`${Color}`)
          .setDescription(`**⚙️ الرول التلقائي الحالي: ${r || 'محذوف'}\nلتغييره: =autorole @رول\nلإلغائه: =daorole**`);
        return message.reply({ embeds: [embed] });
      }
      const embed = new MessageEmbed().setColor(`${Color}`).setDescription(`**❌ يرجى منشن رول\nمثال: =autorole @رول**`);
      return message.reply({ embeds: [embed] });
    }

    Pro.set(`autorole = ${message.guild.id}`, role.id);

    const embed = new MessageEmbed()
      .setColor(`${Color}`)
      .setDescription(`**✅ تم تعيين ${role} كرول تلقائي لكل عضو يدخل**`)
      .setFooter(client.user.username, client.user.displayAvatarURL());

    message.reply({ embeds: [embed] });
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌙 تم البرمجة بواسطة : TRY
// 🏪 المتجر : NOVANIGHT SYSTEM BOT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
