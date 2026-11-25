const { MessageEmbed } = require("discord.js");
const Pro = require(`pro.db`);

module.exports = {
  name: 'unbanal',
  aliases: ['فكحظرالكل', 'رفعكلالبانات'],
  run: async (client, message) => {
    const Color = Pro.get(`Guild_Color = ${message.guild.id}`) || message.guild.me.displayHexColor || `#000000`;
    if (!message.member.permissions.has('BAN_MEMBERS')) return message.react('❌');

    const loadEmbed = new MessageEmbed()
      .setColor(`${Color}`)
      .setDescription(`**⏳ جاري إلغاء جميع الحظرات من السيرفر...**`);
    const msg = await message.reply({ embeds: [loadEmbed] });

    try {
      const bans = await message.guild.bans.fetch();
      if (!bans.size) {
        return msg.edit({ embeds: [new MessageEmbed().setColor(`${Color}`).setDescription('**✅ لا يوجد محظورين في السيرفر**')] });
      }

      let count = 0;
      for (const [id] of bans) {
        await message.guild.members.unban(id).catch(() => {});
        count++;
      }

      const embed = new MessageEmbed()
        .setColor(`${Color}`)
        .setTitle('✅ تم إلغاء جميع الحظرات')
        .setDescription(`**تم فك حظر \`${count}\` شخص من السيرفر**`)
        .setFooter(`بواسطة: ${message.author.tag}`, message.author.displayAvatarURL({ dynamic: true }))
        .setTimestamp();

      msg.edit({ embeds: [embed] });
    } catch (e) {
      msg.edit({ embeds: [new MessageEmbed().setColor(`${Color}`).setDescription(`**❌ حدث خطأ: ${e.message}**`)] });
    }
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌙 تم البرمجة بواسطة : TRY
// 🏪 المتجر : NOVANIGHT SYSTEM BOT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
