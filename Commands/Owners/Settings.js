const Discord = require("discord.js"); 
const { MessageEmbed, MessageActionRow, MessageButton } = require("discord.js");
const { prefix, owners } = require(`${process.cwd()}/config`);
let fs = require("fs");
const db = require(`pro.db`)
module.exports = {
    name: 'settings', // هنا اسم الامر
    run: async (client, message, args) => {


        if (!message.member.permissions.has('ADMINISTRATOR')) {
            // إجراءات للتصرف عندما لا يتحقق الشرط
            return message.react('❌');
        }

        const Color = db.get(`Guild_Color = ${message.guild?.id}`) || `#000000`
        if (!Color) return;


        //client.on("messageCreate", message => {
       //     if (message.content === prefix + "Settings") {
              const row = new Discord.MessageActionRow().addComponents(
                new Discord.MessageButton()
                  .setLabel("الآوامر المتقدمة")
                  .setStyle("SECONDARY")
                  .setEmoji(`🔰`)
                  .setCustomId("Settings")
              );
          
              message.reply({
                components: [row],
                allowedMentions: { parse: [] }
              });
          //  }
       //   });
          
          client.on("interactionCreate", async interaction => {
            if (interaction.customId === 'Settings') {
              let embed = new Discord.MessageEmbed()
                .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
                .setAuthor(interaction.user.tag, interaction.user.avatarURL({ dynamic: true }))
                
          .setDescription(` > **Control settings :**
          \`${prefix}syavatar\` : **+ 125 تعين حجم الصورة**
          \`${prefix}sxavatar\` : **+ 125 تعين حجم الصورة**
          \`${prefix}xavatar\` : **+ يحرك الصورة يمين & يسار**
          \`${prefix}yavatar\` : **+ يحرك الصورة فوق & تحت***
          > **Control name :**
          \`${prefix}xname\` : **+ يحرك الخط يمين & يسار**
          \`${prefix}yname\` : **+ يحرك الخط فوق & تحت**
          \`${prefix}sname\` : **+ يزيد حجم الخط**
          \`${prefix}ncolor\` : **تعين لون الخط**
          > **Control image :**
          \`${prefix}wsize\` : **+ 800 //يضغط الصورة من اليمين واليسار الافضل 800 **
          \`${prefix}hsize\` : ** + hsize : 275    // يضغط الصورة من فوق وتحت **
          \`${prefix}data\` : ** عرض الاعدادت المُسجله**
          > **welcome :**
          \`${prefix}img-wlc\` : **تحديد صوره الترحيب**
          \`${prefix}channel-wlc\` : **تحديد شات الترحيب**
          \`${prefix}message-wlc\` : **تحديد رسالة الترحيب**
          \`${prefix}toggle-wlc\` : **تشغيل وايقاف الترحيب**
          \`${prefix}restert-wec\` : **إعادة ظبط الترحيب**
          \`${prefix}Settings\` : **عرض جميع اوامر الترحيب**
          \`${prefix}t\` : **تجربة احداثيات الترحيب**
          \`\`\`
[user] : يذكر الشخص بمنشن
[username] : يذكر الشخص بدون منشن
[invitername] : يذكر الداعي بدون منشن
[inviter] : يذكر الداعي بمنشن
[servername] : اسم السيرفر
[membercount] : يظهر عدد الأعضاء \`\`\``)
          
          
                .setFooter(interaction.guild.name, interaction.guild.iconURL({ dynamic: true }))
                .setColor(`${Color  || `#000000`}`)
                .setTimestamp();

          
              interaction.reply({ embeds: [embed], components: [], ephemeral: true });
            }
          });



    }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌙 تم البرمجة بواسطة : TRY
// 🏪 المتجر : NOVANIGHT SYSTEM BOT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
