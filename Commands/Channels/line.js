// خط — يرسل الخط العام (المحفوظ بـ setline)
const Pro = require("pro.db");

module.exports = {
    name: "line",
    aliases: ["خط"],

    run: async (client, message) => {
        const line = Pro.get("Line");
        if (!line) return message.reply("ما فيه خط محفوظ. استخدم `setline` أو `autoline`.");
        return message.channel.send({ files: [line] });
    }
};
