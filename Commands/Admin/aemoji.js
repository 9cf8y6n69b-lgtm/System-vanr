const { MessageEmbed } = require("discord.js");
const Pro = require(`pro.db`);

module.exports = {
  name: 'aemoji',
  aliases: ['إيموجي', 'addmoji'],
  run: async (client, message) => {
    const Color = Pro.get(`Guild_Color = ${message.guild.id}`) || message.guild.me.displayHexColor || `#000000`;
    if (!message.member.permissions.has('MANAGE_EMOJIS_AND_STICKERS')) return message.react('❌');

    const args = message.content.trim().split(/ +/);
    const name = args[1];
    const url = args[2] || message.attachments.first()?.url;

    if (!name || !url) {
      const embed = new MessageEmbed()
        .setColor(`${Color}`)
        .setDescription(`**❌ الاستخدام الصحيح:\n=aemoji [اسم] [رابط الصورة]\nأو =aemoji [اسم] مع إرفاق صورة**`);
      return message.reply({ embeds: [embed] });
    }

    try {
      const emoji = await message.guild.emojis.create(url, name);

      const embed = new MessageEmbed()
        .setColor(`${Color}`)
        .setTitle('✅ تم إضافة الإيموجي')
        .setDescription(`${emoji} \`:${emoji.name}:\``)
        .addField('الاسم', emoji.name, true)
        .addField('الآيدي', emoji.id, true)
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
