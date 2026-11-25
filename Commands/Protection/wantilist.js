const { MessageEmbed } = require("discord.js");
const Pro = require(`pro.db`);

module.exports = {
  name: 'wantilist',
  run: async (client, message) => {
    const Color = Pro.get(`Guild_Color = ${message.guild.id}`) || message.guild.me.displayHexColor || `#000000`;
    if (!message.member.permissions.has('ADMINISTRATOR')) return message.react('❌');

    const list = Pro.get(`wanti_list = ${message.guild.id}`) || [];

    if (!list.length) {
      const embed = new MessageEmbed().setColor(`${Color}`).setDescription(`**📋 قائمة تخطي الحماية فارغة**`);
      return message.reply({ embeds: [embed] });
    }

    const members = list.map((id, i) => `**${i + 1}.** <@${id}> \`${id}\``).join('\n');

    const embed = new MessageEmbed()
      .setColor(`${Color}`)
      .setTitle('📋 قائمة الأشخاص المسموح لهم')
      .setDescription(members)
      .setFooter(client.user.username, client.user.displayAvatarURL())
      .setTimestamp();

    message.reply({ embeds: [embed] });
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌙 تم البرمجة بواسطة : TRY
// 🏪 المتجر : NOVANIGHT SYSTEM BOT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
