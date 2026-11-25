const { MessageEmbed } = require("discord.js");
const Pro = require(`pro.db`);

module.exports = {
  name: 'showblockpic',
  run: async (client, message) => {
    const Color = Pro.get(`Guild_Color = ${message.guild.id}`) || message.guild.me.displayHexColor || `#000000`;
    if (!message.member.permissions.has('MANAGE_MESSAGES')) return message.react('❌');

    await message.guild.members.fetch();
    const blockedChannels = [];
    
    message.guild.channels.cache.forEach(ch => {
      const blocked = Pro.get(`blockpic = ${message.guild.id} = ${ch.id}`);
      if (blocked) blockedChannels.push(`**•** <#${ch.id}>`);
    });

    const embed = new MessageEmbed()
      .setColor(`${Color}`)
      .setTitle('🚫 قائمة شاتات بلوك الصور')
      .setDescription(blockedChannels.length ? blockedChannels.join('\n') : '**لا يوجد شاتات مفعّل فيها بلوك الصور**')
      .setFooter(client.user.username, client.user.displayAvatarURL())
      .setTimestamp();

    message.reply({ embeds: [embed] });
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌙 تم البرمجة بواسطة : TRY
// 🏪 المتجر : NOVANIGHT SYSTEM BOT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
