const Discord = require(`discord.js`);
module.exports = {
    name: `slowmode`,
    run: async (client, message) => {
      


              const Pro = require(`pro.db`)
        const db = Pro.get(`Allow - Command slowmode = [ ${message.guild.id} ]`)
const allowedRole = message.guild.roles.cache.get(db);
const isAuthorAllowed = message.member.roles.cache.has(allowedRole?.id);

if (!isAuthorAllowed && message.author.id !== db  && !message.member.permissions.has('ADMINISTRATOR')) {
    // إجراءات للتصرف عندما لا يتحقق الشرط
    return message.react('❌');
}
      

 // if (!message.member.permissions.has('ADMINISTRATOR')) {
   // return message.react('❌');
 // }

  if (message.author.bot || message.channel.type === "DM") {
    return;
  }

  const args = message.content.split(" ");
  if (isNaN(args[1])) {
    return message.react('🕐');
  }

  message.react('🕐');
  message.channel.setRateLimitPerUser(args[1]);

        
    }
}
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌙 تم البرمجة بواسطة : TRY
// 🏪 المتجر : NOVANIGHT SYSTEM BOT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
