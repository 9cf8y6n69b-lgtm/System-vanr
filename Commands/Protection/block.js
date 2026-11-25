const { MessageEmbed } = require("discord.js");
const Pro = require(`pro.db`);

module.exports = {
  name: 'block',
  aliases: ['حجب'],
  run: async (client, message) => {
    const Color = Pro.get(`Guild_Color = ${message.guild.id}`) || message.guild.me.displayHexColor || `#000000`;
    if (!message.member.permissions.has('BAN_MEMBERS')) return message.react('❌');

    const member = message.mentions.members.first();
    if (!member) {
      const embed = new MessageEmbed().setColor(`${Color}`).setDescription(`**❌ يرجى منشن عضو**`);
      return message.reply({ embeds: [embed] });
    }

    const list = Pro.get(`block_list = ${message.guild.id}`) || [];
    if (!list.includes(member.id)) {
      list.push(member.id);
      Pro.set(`block_list = ${message.guild.id}`, list);
    }

    try {
      await message.guild.members.ban(member, { reason: 'تم حجبه من السيرفر' });
    } catch (e) {}

    const embed = new MessageEmbed()
      .setColor(`${Color}`)
      .setDescription(`**✅ تم منع ${member.user.tag} من دخول السيرفر**`)
      .setFooter(client.user.username, client.user.displayAvatarURL());

    message.reply({ embeds: [embed] });
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌙 تم البرمجة بواسطة : TRY
// 🏪 المتجر : NOVANIGHT SYSTEM BOT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
