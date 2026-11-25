// unanti @عضو — إزالة عضو من قائمة تخطي الحماية العادية (عكس anti)
const { MessageEmbed } = require("discord.js");
const Pro = require("pro.db");

module.exports = {
    name: "unanti",
    aliases: ["ازالةتخطي"],
    run: async (client, message, args = []) => {
        if (!message.member.permissions.has("ADMINISTRATOR")) return message.react("❌");

        const id =
            (message.mentions.users.first() && message.mentions.users.first().id) ||
            String(args[0] || "").replace(/[<@!>]/g, "");

        if (!id) return message.reply("منشن العضو أو اكتب الآيدي: `unanti @عضو`");

        const key = `wanti_list = ${message.guild.id}`;
        const list = Pro.get(key) || [];

        if (!list.includes(id)) return message.reply("هذا العضو مو في قائمة التخطي.");

        Pro.set(key, list.filter(item => item !== id));

        return message.reply({
            embeds: [new MessageEmbed().setColor("#2b2d31").setDescription(`✅ تمت إزالة <@${id}> من قائمة تخطي الحماية`)]
        });
    }
};
