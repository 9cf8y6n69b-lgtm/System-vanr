const { MessageEmbed } = require("discord.js");
const Pro = require(`pro.db`);

module.exports = {
  name: 'advice',
  aliases: ['نصيحة', 'نصائح'],
  run: async (client, message) => {
    const Color = Pro.get(`Guild_Color = ${message.guild.id}`) || message.guild.me.displayHexColor || `#000000`;

    const tips = [
      "✅ فعّل حماية الأنتي سبام لمنع الفلود",
      "✅ فعّل حماية الأنتي لينك لمنع الروابط الضارة",
      "✅ حدد صلاحيات الأدمن بدقة عبر =allow",
      "✅ فعّل sechard للحماية القصوى",
      "✅ استخدم setlimit لتحديد حد الأكشنز",
      "✅ فعّل antibots لمنع البوتات غير المصرح بها",
      "✅ استخدم setsecurity لإنشاء لوقات الحماية",
      "✅ راجع pslist بشكل دوري لمعرفة حالة الحماية",
    ];

    const embed = new MessageEmbed()
      .setColor(`${Color}`)
      .setTitle("💡 نصائح لحماية سيرفرك")
      .setDescription(tips.join("\n"))
      .setFooter(client.user.username, client.user.displayAvatarURL())
      .setTimestamp();

    message.reply({ embeds: [embed] });
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌙 تم البرمجة بواسطة : TRY
// 🏪 المتجر : NOVANIGHT SYSTEM BOT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
