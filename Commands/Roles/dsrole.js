const { MessageEmbed } = require("discord.js");
const Pro = require(`pro.db`);

module.exports = {
  name: 'dsrole',
  run: async (client, message) => {
    const Color = Pro.get(`Guild_Color = ${message.guild.id}`) || message.guild.me.displayHexColor || `#000000`;
    if (!message.member.permissions.has('MANAGE_ROLES')) return message.react('❌');

    const target = message.mentions.members.first() || message.member;
    const roleId = Pro.get(`myrole = ${message.guild.id} = ${target.id}`);

    if (!roleId) {
      const embed = new MessageEmbed().setColor(`${Color}`).setDescription(`**❌ لا يوجد رول خاص لهذا العضو**`);
      return message.reply({ embeds: [embed] });
    }

    const role = message.guild.roles.cache.get(roleId);
    if (role) await role.delete().catch(() => {});

    Pro.delete(`myrole = ${message.guild.id} = ${target.id}`);

    const embed = new MessageEmbed()
      .setColor(`${Color}`)
      .setDescription(`**✅ تم حذف الرول الخاص لـ ${target.user.tag}**`)
      .setFooter(client.user.username, client.user.displayAvatarURL());

    message.reply({ embeds: [embed] });
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌙 تم البرمجة بواسطة : TRY
// 🏪 المتجر : NOVANIGHT SYSTEM BOT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
