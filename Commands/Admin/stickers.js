const { MessageEmbed } = require("discord.js");
const Pro = require(`pro.db`);

module.exports = {
  name: 'stickers',
  aliases: ['ستيكر', 'ستيكرز'],
  run: async (client, message) => {
    const Color = Pro.get(`Guild_Color = ${message.guild.id}`) || message.guild.me.displayHexColor || `#000000`;
    if (!message.member.permissions.has('MANAGE_EMOJIS_AND_STICKERS')) return message.react('❌');

    const attachment = message.attachments.first();
    const args = message.content.trim().split(/ +/);
    const name = args[1];

    if (!attachment || !name) {
      const embed = new MessageEmbed()
        .setColor(`${Color}`)
        .setDescription(`**❌ الاستخدام الصحيح:\n=stickers [اسم] (مع إرفاق صورة PNG/APNG/GIF)**`);
      return message.reply({ embeds: [embed] });
    }

    try {
      const sticker = await message.guild.stickers.create(attachment.url, name, '😀', { description: `Added by ${message.author.tag}` });

      const embed = new MessageEmbed()
        .setColor(`${Color}`)
        .setTitle('✅ تم إضافة الستيكر')
        .addField('الاسم', sticker.name, true)
        .addField('الآيدي', sticker.id, true)
        .setThumbnail(sticker.url)
        .setFooter(client.user.username, client.user.displayAvatarURL());

      message.reply({ embeds: [embed] });
    } catch (e) {
      const embed = new MessageEmbed().setColor(`${Color}`).setDescription(`**❌ حدث خطأ: ${e.message}**`);
      message.reply({ embeds: [embed] });
    }
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌙 تم البرمجة بواسطة : TRY
// 🏪 المتجر : NOVANIGHT SYSTEM BOT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
