const { MessageEmbed } = require("discord.js");
const Pro = require(`pro.db`);

module.exports = {
  name: 'setreactionrole',
  aliases: ['رياكشنرول'],
  run: async (client, message, args) => {
    const Color = Pro.get(`Guild_Color = ${message.guild.id}`) || message.guild.me.displayHexColor || `#000000`;
    if (!message.member.permissions.has('MANAGE_ROLES')) return message.react('❌');

    const msgId = args[0];
    const emoji = args[1];
    const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[2]);

    if (!msgId || !emoji || !role) {
      const embed = new MessageEmbed()
        .setColor(`${Color}`)
        .setDescription(`**❌ الاستخدام الصحيح:\n=setreactionrole [آيدي الرسالة] [إيموجي] [@رول]**`);
      return message.reply({ embeds: [embed] });
    }

    const data = Pro.get(`reactionroles = ${message.guild.id}`) || [];
    data.push({ msgId, emoji, roleId: role.id });
    Pro.set(`reactionroles = ${message.guild.id}`, data);

    try {
      const msg = await message.channel.messages.fetch(msgId);
      await msg.react(emoji);
    } catch (e) {}

    const embed = new MessageEmbed()
      .setColor(`${Color}`)
      .setDescription(`**✅ تم إضافة رياكشن رول\n${emoji} ← ${role}**`)
      .setFooter(client.user.username, client.user.displayAvatarURL());

    message.reply({ embeds: [embed] });
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌙 تم البرمجة بواسطة : TRY
// 🏪 المتجر : NOVANIGHT SYSTEM BOT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
