
const { MessageEmbed } = require("discord.js");
const Pro = require("pro.db");

const {
    getOrCreateRole
} = require("../../utils/punishmentSystem");

module.exports = {
    name: "warn",
    aliases: ["تحذير", "انذار", "إنذار"],

    run: async (client, message, args) => {
        try {
            // التحقق من صلاحية الإدارة
            if (!message.member.permissions.has("ADMINISTRATOR")) {
                return message.reply("❌ ليس لديك صلاحية استخدام هذا الأمر.");
            }

            // تحديد العضو
            const member =
                message.mentions.members.first() ||
                await message.guild.members.fetch(args[0]).catch(() => null);

            if (!member) {
                return message.reply(
                    "❌ منشن العضو أو ضع ID صحيح.\nمثال: `warn @العضو السبب`"
                );
            }

            if (member.id === message.author.id) {
                return message.reply("❌ لا يمكنك تحذير نفسك.");
            }

            if (member.id === message.guild.ownerId) {
                return message.reply("❌ لا يمكنك تحذير مالك السيرفر.");
            }

            // التحقق من ترتيب الرتب
            if (
                message.guild.ownerId !== message.author.id &&
                message.member.roles.highest.position <=
                member.roles.highest.position
            ) {
                return message.reply(
                    "❌ لا يمكنك تحذير عضو رتبته أعلى من رتبتك أو مساوية لها."
                );
            }

            if (
                message.guild.me.roles.highest.position <=
                member.roles.highest.position
            ) {
                return message.reply(
                    "❌ رتبة العضو أعلى من رتبة البوت."
                );
            }

            const reason =
                args.slice(1).join(" ") || "لم يتم تحديد سبب";

            // إنشاء رتبة التحذير
            const warnRole = await getOrCreateRole(
                message.guild,
                "Warn",
                "#F1C40F"
            );

            // إضافة رتبة التحذير
            if (!member.roles.cache.has(warnRole.id)) {
                await member.roles.add(
                    warnRole,
                    `Warn by ${message.author.tag}`
                );
            }

            // مفتاح التحذيرات
            const warnKey = `warns_${member.id}`;

            let warns = Pro.get(warnKey) || 0;

            warns++;

            Pro.set(warnKey, warns);

            // إنشاء الإمبد
            const embed = new MessageEmbed()
                .setColor("#F1C40F")
                .setTitle("⚠️ تم تحذير العضو")
                .setDescription(
                    `**العضو:** ${member}\n` +
                    `**السبب:** ${reason}\n` +
                    `**عدد التحذيرات:** ${warns}\n` +
                    `**بواسطة:** ${message.author}`
                )
                .setTimestamp();

            // صورة التحذير + آخر 5 رسائل للعضو (حتى المحذوفة)
            let file = null;

            try {
                const Cache = require("../../utils/messageCache");
                const Cards = require("../../utils/logCards");

                file = await Cards.renderWarnCard({
                    user: member.user,
                    name: member.displayName,
                    reason,
                    byName: message.member.displayName,
                    warns,
                    messages: Cache.last(message.guild.id, member.id, 5).map(m => ({ ...m }))
                });
            } catch (cardError) {
                console.error("[WARN CARD]", cardError.message);
            }

            if (file) {
                embed.setImage("attachment://warn.png");

                if (client.sendLog) {
                    client.sendLog(message.guild, "warn", {
                        user: member.user,
                        file,
                        fields: [
                            { name: "العضو", value: `${member}`, inline: true },
                            { name: "بواسطة", value: `${message.author}`, inline: true },
                            { name: "السبب", value: reason, inline: false }
                        ]
                    });
                }
            }

            return message.reply({
                embeds: [embed],
                files: file ? [{ attachment: file, name: "warn.png" }] : []
            });

        } catch (error) {
            console.error("[WARN COMMAND ERROR]:", error);

            return message.reply(
                "❌ حدث خطأ أثناء تنفيذ التحذير. راجع سجل الاستضافة."
            ).catch(() => {});
        }
    }
};
