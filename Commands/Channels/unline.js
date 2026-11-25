const { MessageEmbed } = require("discord.js");
const Pro = require(`pro.db`);

module.exports = {
  name: 'unline',
  run: async (client, message) => {
    const Color = Pro.get(`Guild_Color = ${message.guild.id}`) || message.guild.me.displayHexColor || `#000000`;
    if (!message.member.permissions.has('MANAGE_CHANNELS')) return message.react('❌');

    const channel = message.mentions.channels.first() || message.channel;
    const key = `autoline_image_${message.guild.id}_${channel.id}`;
    const saved = Pro.get(key);
    if (saved) { saved.enabled = false; Pro.set(key, saved); }
    const old = Pro.get("Channels") || [];
    if (old.includes(channel.id)) Pro.set("Channels", old.filter(id => id !== channel.id));

    const embed = new MessageEmbed()
      .setColor(`${Color}`)
      .setDescription(`**✅ تم تعطيل الفاصل التلقائي في ${channel}**`)
      .setFooter(client.user.username, client.user.displayAvatarURL());

    message.reply({ embeds: [embed] });
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌙 تم البرمجة بواسطة : TRY
// 🏪 المتجر : NOVANIGHT SYSTEM BOT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
