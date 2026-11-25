const { MessageEmbed } = require("discord.js");
const Pro = require(`pro.db`);

module.exports = {
  name: 'topinv',
  aliases: ['topinvites', 'أعلىدعوات'],
  run: async (client, message) => {
    const Color = Pro.get(`Guild_Color = ${message.guild.id}`) || message.guild.me.displayHexColor || `#000000`;

    try {
      const invites = await message.guild.invites.fetch();
      const inviteMap = new Map();

      invites.forEach(inv => {
        if (inv.inviter) {
          const cur = inviteMap.get(inv.inviter.id) || 0;
          inviteMap.set(inv.inviter.id, cur + (inv.uses || 0));
        }
      });

      const sorted = [...inviteMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
      if (!sorted.length) {
        return message.reply({ embeds: [new MessageEmbed().setColor(`${Color}`).setDescription('**لا توجد دعوات**')] });
      }

      const medals = ['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣'];
      const list = sorted.map(([id, count], i) => `${medals[i]} <@${id}> - \`${count}\` دعوة`).join('\n');

      const embed = new MessageEmbed()
        .setColor(`${Color}`)
        .setTitle('📊 أعلى عدد دعوات')
        .setDescription(list)
        .setFooter(client.user.username, client.user.displayAvatarURL())
        .setTimestamp();

      message.reply({ embeds: [embed] });
    } catch (e) {
      message.react('❌');
    }
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌙 تم البرمجة بواسطة : TRY
// 🏪 المتجر : NOVANIGHT SYSTEM BOT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
