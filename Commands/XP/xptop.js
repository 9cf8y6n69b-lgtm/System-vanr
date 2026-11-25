// xptop [chat|voice] — ترتيب الخبرة
const { MessageEmbed } = require("discord.js");
const XP = require("../../utils/xp");

module.exports = {
    name: "xptop",
    aliases: ["المتصدرين", "لوحة"],

    run: async (client, message, args = []) => {
        if (!message.guild) return;

        const arg = (args[0] || "").toLowerCase();
        const kind = ["voice", "فويس"].includes(arg) ? "voice" : ["chat", "شات"].includes(arg) ? "chat" : "total";
        const board = XP.leaderboard(message.guild.id, kind).slice(0, 10);

        if (!board.length) return message.reply("ما فيه خبرة مسجلة للحين.");

        const medals = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩"];

        const lines = board.map((item, i) => {
            const level = XP.levelInfo(XP.totalOf(item.data)).level;
            return `${medals[i]} <@${item.userId}> — **${item.value}** XP • لفل ${level}`;
        });

        const titles = { total: "الترتيب العام", chat: "ترتيب الشات", voice: "ترتيب الفويس" };

        return message.reply({
            embeds: [
                new MessageEmbed()
                    .setColor("#2b2d31")
                    .setAuthor({ name: `${message.guild.name} • ${titles[kind]}`, iconURL: message.guild.iconURL({ dynamic: true }) || undefined })
                    .setDescription(lines.join("\n"))
                    .setFooter({ text: "xptop chat | xptop voice" })
            ],
            allowedMentions: { parse: [], repliedUser: false }
        });
    }
};
