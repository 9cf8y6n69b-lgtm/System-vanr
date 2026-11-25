const { MessageEmbed, MessageActionRow, MessageButton } = require("discord.js");
const Pro = require(`pro.db`);

module.exports = {
  name: 'edit-image',
  aliases: ['تعديل', 'فلتر'],
  run: async (client, message) => {
    const Color = Pro.get(`Guild_Color = ${message.guild.id}`) || message.guild.me.displayHexColor || `#000000`;

    const attachment = message.attachments.first();
    if (!attachment) {
      const embed = new MessageEmbed()
        .setColor(`${Color}`)
        .setDescription(`**❌ يرجى إرفاق صورة مع الأمر\nمثال: =edit-image (مع إرفاق صورة)**`);
      return message.reply({ embeds: [embed] });
    }

    const row = new MessageActionRow().addComponents(
      new MessageButton().setCustomId('filter_bw').setLabel('أبيض وأسود').setStyle('SECONDARY').setEmoji('🖤'),
      new MessageButton().setCustomId('filter_blur').setLabel('ضبابي').setStyle('SECONDARY').setEmoji('🌫️'),
      new MessageButton().setCustomId('filter_flip').setLabel('عكس').setStyle('SECONDARY').setEmoji('🔄'),
      new MessageButton().setCustomId('filter_bright').setLabel('مضيء').setStyle('SECONDARY').setEmoji('☀️'),
    );

    const embed = new MessageEmbed()
      .setColor(`${Color}`)
      .setTitle('🎨 تعديل الصورة')
      .setDescription('**اختر الفلتر المناسب:**')
      .setImage(attachment.url)
      .setFooter(client.user.username, client.user.displayAvatarURL());

    message.reply({ embeds: [embed], components: [row] });
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌙 تم البرمجة بواسطة : TRY
// 🏪 المتجر : NOVANIGHT SYSTEM BOT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
