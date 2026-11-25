const { MessageEmbed } = require("discord.js");
const Pro = require(`pro.db`);

module.exports = {
  name: 'aremove',
  aliases: ['إزالةالخلفية'],
  run: async (client, message) => {
    const Color = Pro.get(`Guild_Color = ${message.guild.id}`) || message.guild.me.displayHexColor || `#000000`;

    const attachment = message.attachments.first();
    if (!attachment) {
      const embed = new MessageEmbed().setColor(`${Color}`).setDescription(`**❌ يرجى إرفاق صورة مع الأمر**`);
      return message.reply({ embeds: [embed] });
    }

    const embed = new MessageEmbed()
      .setColor(`${Color}`)
      .setDescription(`**⚙️ جاري إزالة خلفية الصورة...**\n\nهذه الميزة تتطلب API خارجي مثل remove.bg`)
      .setFooter(client.user.username, client.user.displayAvatarURL());

    message.reply({ embeds: [embed] });
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌙 تم البرمجة بواسطة : TRY
// 🏪 المتجر : NOVANIGHT SYSTEM BOT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
