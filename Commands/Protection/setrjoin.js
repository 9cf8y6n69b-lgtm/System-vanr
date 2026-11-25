const { MessageEmbed } = require("discord.js");
const Pro = require(`pro.db`);

module.exports = {
  name: 'setrjoin',
  run: async (client, message, args) => {
    const Color = Pro.get(`Guild_Color = ${message.guild.id}`) || message.guild.me.displayHexColor || `#000000`;
    if (!message.member.permissions.has('ADMINISTRATOR')) return message.react('❌');

    const action = args[0];
    if (!action || !['ban','kick','prison','none'].includes(action)) {
      const embed = new MessageEmbed()
        .setColor(`${Color}`)
        .setDescription(`**❌ الاستخدام الصحيح:\n=setrjoin ban - حظر الحسابات الجديدة\n=setrjoin kick - طرد الحسابات الجديدة\n=setrjoin prison - سجن الحسابات الجديدة\n=setrjoin none - إيقاف**`);
      return message.reply({ embeds: [embed] });
    }

    Pro.set(`setrjoin = ${message.guild.id}`, action);

    // عدد الأيام: setrjoin kick 14  (الافتراضي 30 يوم)
    const days = parseInt(args[1]);
    if (days && days > 0 && days <= 365) Pro.set(`rjoin_days = ${message.guild.id}`, days);

    const actions = { ban: 'حظر', kick: 'طرد', prison: 'سجن', none: 'إيقاف الإجراء' };

    const embed = new MessageEmbed()
      .setColor(`${Color}`)
      .setDescription(`**✅ تم تعيين الإجراء مع الحسابات الجديدة: \`${actions[action]}\`**`)
      .setFooter(client.user.username, client.user.displayAvatarURL());

    message.reply({ embeds: [embed] });
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌙 تم البرمجة بواسطة : TRY
// 🏪 المتجر : NOVANIGHT SYSTEM BOT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
