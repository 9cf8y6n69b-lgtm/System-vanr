const { MessageEmbed } = require("discord.js");
const Pro = require(`pro.db`);

module.exports = {
  name: 'myprison',
  run: async (client, message) => {
    const Color = Pro.get(`Guild_Color = ${message.guild.id}`) || message.guild.me.displayHexColor || `#000000`;
    if (!message.member.permissions.has('MANAGE_ROLES')) return message.react('❌');

    const member = message.mentions.members.first() || message.member;
    const prisonData = Pro.get(`prison = ${message.guild.id} = ${member.id}`);

    const embed = new MessageEmbed()
      .setColor(`${Color}`)
      .setTitle('🔒 معلومات السجن')
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .setDescription(
        prisonData
          ? `**العضو:** ${member.user.tag}\n**السبب:** ${prisonData.reason || 'لم يذكر'}\n**بواسطة:** <@${prisonData.mod}>\n**الوقت:** <t:${Math.floor(prisonData.time / 1000)}:R>`
          : `**${member.user.tag} ليس في السجن**`
      )
      .setFooter(client.user.username, client.user.displayAvatarURL())
      .setTimestamp();

    message.reply({ embeds: [embed] });
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌙 تم البرمجة بواسطة : TRY
// 🏪 المتجر : NOVANIGHT SYSTEM BOT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
