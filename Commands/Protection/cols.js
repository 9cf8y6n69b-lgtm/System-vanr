const { MessageEmbed } = require("discord.js");
const Pro = require(`pro.db`);

module.exports = {
  name: 'cols',
  run: async (client, message, args) => {
    const Color = Pro.get(`Guild_Color = ${message.guild.id}`) || message.guild.me.displayHexColor || `#000000`;
    if (!message.member.permissions.has('ADMINISTRATOR')) return message.react('❌');

    // cols on/off
    const toggle = args[0];
    if (!toggle || !['on','off'].includes(toggle)) {
      const embed = new MessageEmbed()
        .setColor(`${Color}`)
        .setDescription(`**❌ الاستخدام الصحيح:\n=cols on - تفعيل حماية الرولات\n=cols off - تعطيل حماية الرولات**`);
      return message.reply({ embeds: [embed] });
    }

    Pro.set(`cols = ${message.guild.id}`, toggle === 'on');

    const embed = new MessageEmbed()
      .setColor(`${Color}`)
      .setDescription(`**${toggle === 'on' ? '✅ تم تفعيل' : '❌ تم تعطيل'} حماية الرولات**`)
      .setFooter(client.user.username, client.user.displayAvatarURL());

    message.reply({ embeds: [embed] });
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌙 تم البرمجة بواسطة : TRY
// 🏪 المتجر : NOVANIGHT SYSTEM BOT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
