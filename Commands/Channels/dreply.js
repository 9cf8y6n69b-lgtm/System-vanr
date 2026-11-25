const { MessageEmbed } = require("discord.js");
const Pro = require(`pro.db`);

module.exports = {
  name: 'dreply',
  run: async (client, message, args) => {
    const Color = Pro.get(`Guild_Color = ${message.guild.id}`) || message.guild.me.displayHexColor || `#000000`;
    if (!message.member.permissions.has('ADMINISTRATOR')) return message.react('❌');

    const trigger = args.join(' ');
    if (!trigger) {
      const embed = new MessageEmbed().setColor(`${Color}`).setDescription(`**❌ يرجى كتابة الكلمة المراد حذفها**`);
      return message.reply({ embeds: [embed] });
    }

    let replies = Pro.get(`autoreplies = ${message.guild.id}`) || [];
    const before = replies.length;
    replies = replies.filter(r => r.trigger !== trigger);
    Pro.set(`autoreplies = ${message.guild.id}`, replies);

    const embed = new MessageEmbed()
      .setColor(`${Color}`)
      .setDescription(before !== replies.length ? `**✅ تم حذف الرد التلقائي للكلمة: \`${trigger}\`**` : `**❌ لم يتم العثور على الكلمة**`)
      .setFooter(client.user.username, client.user.displayAvatarURL());

    message.reply({ embeds: [embed] });
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌙 تم البرمجة بواسطة : TRY
// 🏪 المتجر : NOVANIGHT SYSTEM BOT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
