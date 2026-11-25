// id [@عضو] — كرت العضو: صورة + اسم + لفل + شريط الخبرة + XP شات/فويس
const XP = require("../../utils/xp");

module.exports = {
    name: "id",
    aliases: ["-id", "ايدي", "رانك", "rank", "بطاقتي"],

    run: async (client, message, args = []) => {
        if (!message.guild) return;

        const user =
            message.mentions.users.first() ||
            (args[0] && /^\d{17,20}$/.test(args[0]) ? await client.users.fetch(args[0]).catch(() => null) : null) ||
            message.author;

        if (user.bot) return message.reply("البوتات ما لها خبرة.");

        await message.channel.sendTyping().catch(() => {});

        try {
            const card = await XP.renderCard(user, message.guild.id);

            return message.reply({
                content: user.id,
                files: [{ attachment: card, name: `id-${user.id}.png` }],
                allowedMentions: { repliedUser: false }
            });
        } catch (error) {
            console.error("[ID CARD ERROR]", error);
            return message.reply(`${user.id}`);
        }
    }
};
