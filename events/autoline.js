// ═══════════════════════════════════════════════
//  Vanr • الخط التلقائي: يرسل صورة الخط بعد أي رسالة (نص/صورة/ملف/ستكر) في الرومات المحددة
// ═══════════════════════════════════════════════
const client = require("../index");
const Pro = require("pro.db");

function isCommand(content) {
    const first = String(content || "").trim().split(/\s+/)[0].toLowerCase();
    if (!first) return false;

    return !!(client.commands.get(first) ||
        client.commands.find(cmd => cmd.aliases && cmd.aliases.map(a => String(a).toLowerCase()).includes(first)));
}

client.on("messageCreate", async message => {
    try {
        if (!message.guild || message.author.bot || message.system || message.webhookId) return;
        if (!message.channel.permissionsFor(message.guild.me)?.has(["SEND_MESSAGES", "ATTACH_FILES"])) return;

        // الأوامر ما يطلع لها خط
        if (isCommand(message.content)) return;

        // 1) إعداد القناة الحالي (autoline)
        const data = Pro.get(`autoline_image_${message.guild.id}_${message.channel.id}`);
        let file = null;

        if (data && data.enabled && data.image) {
            file = { attachment: Buffer.from(data.image, "base64"), name: data.fileName || "line.png" };
        } else {
            // 2) النظام القديم: setline + cline (خط عام لرومات محددة)
            const channels = Pro.get("Channels") || [];
            const line = Pro.get("Line");

            if (Array.isArray(channels) && channels.includes(message.channel.id) && line) {
                file = line;
            }
        }

        if (!file) return;

        await message.channel.send({ files: [file] });
    } catch (error) {
        console.error("[AUTOLINE] error:", error.message);
    }
});
