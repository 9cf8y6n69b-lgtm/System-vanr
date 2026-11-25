
const { MessageEmbed } = require("discord.js");
const Pro = require("pro.db");

module.exports = {
    name: "unblacklist",
    aliases: ["فك_بلاك", "إلغاء_بلاك"],

    run: async (client, message, args) => {
        try {
            const guild = message.guild;

            const Color =
                Pro.get(`Guild_Color = ${guild.id}`) ||
                guild.me.displayHexColor ||
                "#000000";

            if (!message.member.permissions.has("ADMINISTRATOR")) {
                return message.react("❌");
            }

            const target =
                message.mentions.members.first() ||
                args[0];

            if (!target) {
                return message.reply(
                    "❌ يرجى تحديد العضو.\nمثال: `unblacklist @العضو`"
                );
            }

            const memberId =
                typeof target === "string" ? target : target.id;

            if (!/^\d{17,20}$/.test(memberId)) {
                return message.reply("❌ آيدي العضو غير صحيح.");
            }

            const punishmentKey =
                `blacklist = ${guild.id} = ${memberId}`;

            const punishment = Pro.get(punishmentKey);

            if (!punishment) {
                return message.reply(
                    "⚠️ هذا العضو ليس موجودًا في البلاك ليست."
                );
            }

            // محاولة جلب العضو حتى لو لم يكن في الكاش
            const member =
                typeof target === "string"
                    ? await guild.members.fetch(memberId).catch(() => null)
                    : target;

            const blacklistRole = guild.roles.cache.find(
                role => role.name === "Blacklist"
            );

            // إزالة رتبة البلاك ليست إذا كان العضو داخل السيرفر
            if (
                member &&
                blacklistRole &&
                member.roles.cache.has(blacklistRole.id)
            ) {
                const botMember = guild.me;

                if (
                    !botMember.permissions.has("MANAGE_ROLES") ||
                    botMember.roles.highest.position <= blacklistRole.position
                ) {
                    return message.reply(
                        "❌ لا أستطيع إزالة رتبة Blacklist. تحقق من صلاحيات البوت وترتيب رتبته."
                    );
                }

                await member.roles.remove(
                    blacklistRole,
                    `Blacklist removed by ${message.author.tag}`
                );
            }

            // حذف سجل البلاك ليست
            Pro.delete(punishmentKey);

            const embed = new MessageEmbed()
                .setColor(Color)
                .setTitle("✅ تم فك البلاك ليست")
                .setDescription(
                    `**العضو:** <@${memberId}>\n` +
                    `**بواسطة:** ${message.author}\n` +
                    `**سبب البلاك ليست السابق:** ${punishment.reason || "غير معروف"}\n` +
                    `**الحالة:** تم إلغاء العقوبة`
                )
                .setFooter(
                    client.user.username,
                    client.user.displayAvatarURL()
                )
                .setTimestamp();

            try {
                const Cards = require("../../utils/logCards");
                const target = member ? member.user : await client.users.fetch(memberId).catch(() => null);

                if (target) {
                    const file = await Cards.renderBlacklistCard({
                        user: target, name: member ? member.displayName : target.username,
                        reason: punishment.reason || "غير معروف", byName: message.member.displayName, added: false
                    });

                    embed.setImage("attachment://blacklist.png");

                    if (client.sendLog) {
                        client.sendLog(message.guild, "blacklistRemove", {
                            user: target, file,
                            fields: [
                                { name: "العضو", value: `<@${memberId}>`, inline: true },
                                { name: "بواسطة", value: `${message.author}`, inline: true }
                            ]
                        });
                    }

                    return message.reply({ embeds: [embed], files: [{ attachment: file, name: "blacklist.png" }] });
                }
            } catch (cardError) {
                console.error("[UNBLACKLIST CARD]", cardError.message);
            }

            return message.reply({
                embeds: [embed]
            });

        } catch (error) {
            console.error("[UNBLACKLIST ERROR]:", error);

            return message.reply(
                "❌ حدث خطأ أثناء فك البلاك ليست."
            ).catch(() => {});
        }
    }
};
