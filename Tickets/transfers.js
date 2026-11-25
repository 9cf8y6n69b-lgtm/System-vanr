const Pro = require("pro.db");

const KEY = guildId => `ticket_transfers_${guildId}`;

function ask(message, question) {
    return new Promise(async (resolve, reject) => {
        await message.channel.send(question);

        const collected = await message.channel.awaitMessages({
            filter: m => m.author.id === message.author.id,
            max: 1,
            time: 120000,
            errors: ["time"]
        }).catch(() => null);

        if (!collected || !collected.size) {
            return reject(new Error("انتهى الوقت"));
        }

        resolve(collected.first());
    });
}

// يقبل إيموجي عادي أو مخصص فقط، غير كذا يتجاهله
function cleanEmoji(value) {
    if (!value) return null;

    const text = value.trim();

    if (/^<a?:\w+:\d+>$/.test(text)) return text;
    if (/^(\p{Extended_Pictographic}[\uFE0F\u200D]*)+$/u.test(text)) return text;

    return null;
}

function parseType(value) {
    const text = value.trim().toLowerCase();

    if (["زر", "button", "btn", "ازرار", "أزرار"].includes(text)) {
        return "button";
    }

    return "menu";
}

function formatList(list) {
    if (!list.length) return "ما فيه تحويلات.";

    return list.map((item, index) => {
        const roles = item.roleIds.map(id => `<@&${id}>`).join(" ");
        const type = item.type === "button" ? "زر" : "قائمة";
        return `**${index + 1}.** ${item.emoji || ""} ${item.name} ← ${roles} (${type})`;
    }).join("\n");
}

module.exports = {
    name: "transfers",
    aliases: ["تحويلات"],

    run: async (client, message) => {
        if (!message.guild) return;

        if (!message.member.permissions.has("ADMINISTRATOR")) {
            return message.reply("هذا الأمر للإدارة فقط.");
        }

        try {
            const actionMessage = await ask(
                message,
                "اكتب: **اضافة** أو **حذف** أو **عرض**"
            );

            const action = actionMessage.content.trim().toLowerCase();
            const list = Pro.get(KEY(message.guild.id)) || [];

            // عرض
            if (action === "عرض" || action === "list") {
                return message.channel.send({
                    content: formatList(list),
                    allowedMentions: { parse: [] }
                });
            }

            // إضافة
            if (action === "اضافة" || action === "إضافة" || action === "add") {
                if (list.length >= 25) {
                    return message.channel.send("وصلت الحد الأقصى (25 تحويل).");
                }

                const nameMessage = await ask(
                    message,
                    "**اسم التحويل :**"
                );

                const name = nameMessage.content.trim();

                if (!name) {
                    return message.channel.send("الاسم غير صالح.");
                }

                const rolesMessage = await ask(
                    message,
                    "**الرتبة :** (منشن الرتبة أو الرتب)"
                );

                const roleIds = [...rolesMessage.mentions.roles.keys()];

                if (!roleIds.length) {
                    return message.channel.send("لازم تمنشن رتبة واحدة على الأقل.");
                }

                const emojiMessage = await ask(
                    message,
                    "**ايموجي :** (أو اكتب تخطي)"
                );

                const emoji =
                    emojiMessage.content.trim().toLowerCase() === "تخطي"
                        ? null
                        : cleanEmoji(emojiMessage.content);

                const typeMessage = await ask(
                    message,
                    "**النوع :** اكتب `زر` أو `قائمة`"
                );

                const type = parseType(typeMessage.content);

                list.push({
                    id: `tr_${Date.now()}`,
                    name,
                    description: name,
                    emoji,
                    roleIds,
                    type
                });

                Pro.set(KEY(message.guild.id), list);

                return message.channel.send(
                    `✅ تمت إضافة التحويل: ${name} (${type === "button" ? "زر" : "قائمة"})`
                );
            }

            // حذف
            if (action === "حذف" || action === "remove") {
                if (!list.length) {
                    return message.channel.send("ما فيه تحويلات للحذف.");
                }

                await message.channel.send({
                    content: formatList(list),
                    allowedMentions: { parse: [] }
                });

                const numberMessage = await ask(
                    message,
                    "اكتب رقم التحويل اللي تبي تحذفه."
                );

                const index = Number(numberMessage.content.trim()) - 1;

                if (!Number.isInteger(index) || !list[index]) {
                    return message.channel.send("رقم غير صحيح.");
                }

                const [removed] = list.splice(index, 1);
                Pro.set(KEY(message.guild.id), list);

                return message.channel.send(`🗑️ تم حذف التحويل: ${removed.name}`);
            }

            return message.channel.send("خيار غير صحيح. اكتب: اضافة / حذف / عرض");

        } catch (error) {
            console.error("[TRANSFERS ERROR]", error);

            return message.channel.send(
                "انتهى الوقت أو حدث خطأ."
            ).catch(() => {});
        }
    }
};
