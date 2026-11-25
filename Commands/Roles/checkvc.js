const { MessageEmbed } = require("discord.js");
const Pro = require(`pro.db`);

module.exports = {
  name: 'checkvc',
  run: async (client, message) => {
    const Color = Pro.get(`Guild_Color = ${message.guild.id}`) || message.guild.me.displayHexColor || `#000000`;
    if (!message.member.permissions.has('MANAGE_ROLES')) return message.react('❌');

    const role = message.mentions.roles.first();
    if (!role) {
      const embed = new MessageEmbed().setColor(`${Color}`).setDescription(`**❌ يرجى منشن رول**`);
      return message.reply({ embeds: [embed] });
    }

    await message.guild.members.fetch();
    const inVC = message.guild.members.cache.filter(m =>
      m.voice.channel && m.roles.cache.has(role.id)
    );

    if (!inVC.size) {
      const embed = new MessageEmbed().setColor(`${Color}`).setDescription(`**📋 لا يوجد أعضاء من ${role} في الرومات الصوتية**`);
      return message.reply({ embeds: [embed] });
    }

    const list = inVC.map(m => `**•** ${m.user.tag} ← 🔊 ${m.voice.channel.name}`).join('\n');

    const embed = new MessageEmbed()
      .setColor(`${Color}`)
      .setTitle(`🔊 أعضاء ${role.name} في الرومات الصوتية`)
      .setDescription(list)
      .setFooter(`${inVC.size} عضو`, client.user.displayAvatarURL())
      .setTimestamp();

    message.reply({ embeds: [embed] });
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌙 تم البرمجة بواسطة : TRY
// 🏪 المتجر : NOVANIGHT SYSTEM BOT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
