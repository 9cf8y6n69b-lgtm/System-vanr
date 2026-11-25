// Voki • يحط الريأكشنات المحددة على كل رسالة في الروم المضبوط
const client = require("../index");
const AR = require("../utils/autoReact");

client.on("messageCreate", async message => {
    try {
        if (!message.guild || message.system) return;

        const list = AR.get(message.guild.id, message.channel.id);
        if (!list.length) return;
        if (!message.channel.permissionsFor(message.guild.me)?.has(["ADD_REACTIONS", "READ_MESSAGE_HISTORY"])) return;

        for (const emoji of list) {
            await message.react(emoji).catch(() => {});
        }
    } catch (error) {
        console.error("[AUTOREACT]", error.message);
    }
});
