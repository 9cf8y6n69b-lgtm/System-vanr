const { MessageEmbed } = require("discord.js");
const { owners } = require(`${process.cwd()}/config`);
const db = require(`pro.db`);

module.exports = {
    name: "setlog",
    aliases: ["ticlog", "ticketlog"],
    run: async (client, message) => {
        if (message.author.bot) return;
        if (!owners.includes(message.author.id) && !message.member.permissions.has('ADMINISTRATOR')) return message.react('❌');
        if (!message.guild) return;

        const channel = message.mentions.channels.first() || message.guild.channels.cache.get(message.content.trim().split(/ +/)[1]);
        if (!channel) return message.reply({ content: `**❌ يرجى منشن شات اللوق\nمثال: =setlog #شات**` });

        db.set(`Channel = [${message.guild.id}]`, channel.id);

        const Color = db.get(`Guild_Color = ${message.guild.id}`) || message.guild.me.displayHexColor || `#000000`;
        const embed = new MessageEmbed()
            .setColor(`${Color}`)
            .setDescription(`**✅ تم تعيين ${channel} كشات لوق التذاكر**`)
            .setFooter(client.user.username, client.user.displayAvatarURL());

        message.reply({ embeds: [embed] });
    }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌙 تم البرمجة بواسطة : TRY
// 🏪 المتجر : NOVANIGHT SYSTEM BOT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
