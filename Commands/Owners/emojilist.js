// emojilist — يعرض كل إيموجيات Voki المرفوعة مع أسمائها (للاستخدام في الرسائل)
const Voki = require("../../utils/voki");
const Pro = require("pro.db");
const { owners } = require(`${process.cwd()}/config`);

module.exports = {
    name: "emojilist",
    aliases: ["ايموجيات", "إيموجيات"],

    run: async (client, message) => {
        if (!message.guild) return;
        if (!message.member.permissions.has("MANAGE_GUILD") && !owners.includes(message.author.id)) return message.react("❌").catch(() => {});

        const map = Pro.get(`void_emojis_${message.guild.id}`) || {};
        const keys = Object.keys(map);

        if (!keys.length) return message.reply("ما فيه إيموجيات مرفوعة. اكتب `vokisetup emojis` أولاً.");

        const lines = keys.map(k => `${map[k]} \`${k}\``);
        for (let i = 0; i < lines.length; i += 25) {
            await message.channel.send(lines.slice(i, i + 25).join("\n"));
        }
    }
};
