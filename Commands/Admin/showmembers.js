const { MessageEmbed } = require("discord.js");
const Pro = require(`pro.db`);

module.exports = {
  name: 'showmembers',
  run: async (client, message) => {
    const Color = Pro.get(`Guild_Color = ${message.guild.id}`) || message.guild.me.displayHexColor || `#000000`;
    if (!message.member.permissions.has('ADMINISTRATOR')) return message.react('❌');

    await message.guild.members.fetch();
    const members = message.guild.members.cache.filter(m => !m.user.bot);

    const list = [...members.values()].slice(0, 25).map(m => {
      const blocked = Pro.get(`blockpic = ${message.guild.id} = ${m.id}`) || false;
      return `**•** ${m.user.tag} ${blocked ? '🚫 محظور الصور' : '✅'}`;
    }).join('\n');

    const embed = new MessageEmbed()
      .setColor(`${Color}`)
      .setTitle(`👥 عرض الأعضاء (${members.size})`)
      .setDescription(list || 'لا يوجد أعضاء')
      .setFooter(client.user.username, client.user.displayAvatarURL())
      .setTimestamp();

    message.reply({ embeds: [embed] });
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌙 تم البرمجة بواسطة : TRY
// 🏪 المتجر : NOVANIGHT SYSTEM BOT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
