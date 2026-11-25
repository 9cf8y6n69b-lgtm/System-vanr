const { MessageEmbed } = require("discord.js");
const Pro = require(`pro.db`);

module.exports = {
  name: 'anti',
  run: async (client, message) => {
    const Color = Pro.get(`Guild_Color = ${message.guild.id}`) || message.guild.me.displayHexColor || `#000000`;
    if (!message.member.permissions.has('ADMINISTRATOR')) return message.react('❌');

    const member = message.mentions.members.first();
    if (!member) {
      const embed = new MessageEmbed().setColor(`${Color}`).setDescription(`**❌ يرجى منشن عضو\nمثال: =anti @عضو**`);
      return message.reply({ embeds: [embed] });
    }

    const list = Pro.get(`wanti_list = ${message.guild.id}`) || [];
    if (list.includes(member.id)) {
      const embed = new MessageEmbed().setColor(`${Color}`).setDescription(`**❌ هذا العضو موجود مسبقاً في قائمة الحماية**`);
      return message.reply({ embeds: [embed] });
    }

    list.push(member.id);
    Pro.set(`wanti_list = ${message.guild.id}`, list);

    const embed = new MessageEmbed()
      .setColor(`${Color}`)
      .setDescription(`**✅ تم إضافة ${member} لقائمة تخطي الحماية**`)
      .setFooter(client.user.username, client.user.displayAvatarURL());

    message.reply({ embeds: [embed] });
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌙 تم البرمجة بواسطة : TRY
// 🏪 المتجر : NOVANIGHT SYSTEM BOT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
