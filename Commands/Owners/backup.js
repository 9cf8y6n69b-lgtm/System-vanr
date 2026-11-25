// backup            ← نسخة الحين لروم النسخ
// backup list       ← آخر النسخ
// backup restore    ← استرجاع (آخر نسخة، أو ملف مرفق، أو بالرد على رسالة فيها ملف، أو ID رسالة النسخة)
const B = require("../../utils/backup");
const { owners } = require(`${process.cwd()}/config`);

module.exports = {
    name: "backup",
    aliases: ["نسخة", "نسخه", "باكاب", "نسخ"],

    run: async (client, message, args) => {
        if (!message.guild) return;
        if (!owners.includes(message.author.id) && !message.member.permissions.has("ADMINISTRATOR")) return message.react("❌").catch(() => {});

        const sub = (args[0] || "").toLowerCase();
        try {
            if (["list", "قائمة", "سجل"].includes(sub)) {
                const items = await B.list(10);
                if (!items.length) return message.reply("ما فيه نسخ في الروم.");
                return message.reply(items.map((i, n) => `${n + 1}. \`${i.id}\` • <t:${Math.floor(i.at / 1000)}:R> • ${(i.size / 1024).toFixed(1)}KB`).join("\n") + "\nللاسترجاع: `backup restore <ID>`");
            }

            if (["restore", "استرجاع", "رجع", "ارجاع"].includes(sub)) {
                let att = message.attachments.first();
                if (!att && message.reference) {
                    const ref = await message.channel.messages.fetch(message.reference.messageId).catch(() => null);
                    att = ref && ref.attachments.first();
                }
                const wait = await message.reply("⏳ جاري الاسترجاع...");
                let r;
                if (att) r = { ...B.restore(await B.download(att.url), "merge"), name: att.name };
                else r = await B.restoreFrom(args[1] || null, "merge");
                return wait.edit(`✅ تم الاسترجاع من \`${r.name}\`\nرجّعت **${r.applied}** إعداد (الجديد اللي مو بالنسخة بقي كما هو).`);
            }

            const wait = await message.reply("⏳ جاري عمل النسخة...");
            const r = await B.send(`يدوي بواسطة ${message.author.tag}`);
            return wait.edit(`✅ انرسلت النسخة لروم النسخ • ${r.count} إعداد`);
        } catch (e) {
            return message.reply(`❌ ${e.message}`);
        }
    }
};
