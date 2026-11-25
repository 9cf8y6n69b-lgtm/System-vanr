let drawCircle = null;
try { ({ drawCircle } = require("editor-canvas")); } catch { /* اختياري: ما تثبت على Node الجديد */ }
module.exports = {
    name: "circle",
    run: async (client, message, args) => {
       

        
        
          if (!message.guild || message.author.bot) return;
          if (!drawCircle) return message.reply("❌ أمر circle غير متوفر حالياً.");
          var args = message.content.split(/ +/);
        
          
        
            var user = message.mentions.members.first() || (args[1] ? await client.users.fetch(args[1]).catch(() => { }) : null) || message.member,
              attach = message.attachments.first()?.proxyURL ?? null;
            var avatar;
            await message.channel.sendTyping();
            if (attach) avatar = attach;
            else if (args[1]?.startsWith("http")) avatar = `${args[1]}`;
            else if (user) avatar = user.displayAvatarURL({
              dynamic: false,
              format: "jpg",
              size: 2048
            });
            try {
              avatar = await drawCircle({ image: avatar });
            } catch (err) {
              return message.reply({
                content: `> خطأ!, لم استطع التعرف على الصورة`
              })
            }
            message.reply({ files: [avatar] });
          
        

        
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌙 تم البرمجة بواسطة : TRY
// 🏪 المتجر : NOVANIGHT SYSTEM BOT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
