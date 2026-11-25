const { MessageEmbed } = require("discord.js");
const Discord = require("discord.js");

module.exports = {
  name: "unban-all",
  aliases: ["unbanall"],
  description: "لإلغاء الحظر عن الجميع",
  usage: ["!unban all"],
  run: async (client, message, args, config) => {


    const Pro = require(`pro.db`)
    const db = Pro.get(`Allow - Command unban-all = [ ${message.guild.id} ]`)
const allowedRole = message.guild.roles.cache.get(db);
const isAuthorAllowed = message.member.roles.cache.has(allowedRole?.id);

if (!isAuthorAllowed && message.author.id !== db  && !message.member.permissions.has('ADMINISTRATOR')) {
// إجراءات للتصرف عندما لا يتحقق الشرط
return message.react('❌')
}


    try {
      let bans = await message.guild.bans.fetch();
      if (!bans.size) {
        return message.channel.send({ content: "🙄 **لا يوجد أي حظر في هذه الخادم**" });
      }
      bans.forEach((lynnanne) => {
        return message.guild.members.unban(lynnanne.user);
      });
      message.reply({ content: "**يرجى الانتظار...**", allowedMentions: { parse: [] } }).then((keondrick) => {
        setTimeout(() => {
          keondrick.reply({
            content: `! **تم إلغاء الحظر بنجاح عن \`${bans.size}\` أعضاء ✅**\nتم فك جميع الباند بنجاح.`,
            allowedMentions: { parse: [] },
          });
          keondrick.delete();
        }, 4000);
      });
    } catch (error) {
      console.error(error);
      message.reply({ content: "حدث خطأ أثناء تنفيذ الأمر" , allowedMentions: { parse: [] }} );
    }
  },
};
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌙 تم البرمجة بواسطة : TRY
// 🏪 المتجر : NOVANIGHT SYSTEM BOT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
