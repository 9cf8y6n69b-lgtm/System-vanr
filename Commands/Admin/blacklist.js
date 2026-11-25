
const { MessageEmbed } = require("discord.js");
const Pro = require("pro.db");

const {
    getOrCreateRole,
    getOrCreateChannel
} = require("../../utils/punishmentSystem");

module.exports = {
    name: "blacklist",
    aliases: ["بلاك ليست", "بلاكليست"],
    
    run: async (client, message, args) => {
        try {
            // التحقق من الصلاحيات
            if (!message.member.permissions.has("ADMINISTRATOR")) {
                return message.reply("❌ ليس لديك صلاحية استخدام هذا الأمر.");
            }

            const member =
                message.mentions.members.first() ||
                await message.guild.members.fetch(args[0]).catch(() => null);

            if (!member) {
                return message.reply("❌ منشن العضو أو ضع ID صحيح.");
            }

            if (member.id === message.author.id) {
                return message.reply("❌ لا يمكنك معاقبة نفسك.");
            }

            if (member.id === message.guild.ownerId) {
                return message.reply("❌ لا يمكنك معاقبة مالك السيرفر.");
            }

            if (
                message.member.roles.highest.position <=
                member.roles.highest.position &&
                message.guild.ownerId !== message.author.id
            ) {
                return message.reply("❌ رتبة العضو أعلى من رتبتك أو مساوية لها.");
            }

            if (
                client.user.id !== message.guild.ownerId &&
                member.roles.highest.position >=
                message.guild.me.roles.highest.position
            ) {
                return message.reply("❌ لا أستطيع معاقبة هذا العضو بسبب ترتيب الرتب.");
            }

            const punishmentKey =
                `blacklist = ${message.guild.id} = ${member.id}`;

            const prisonKey =
                `prison = ${message.guild.id} = ${member.id}`;

            if (Pro.get(punishmentKey)?.active) {
                return message.reply("❌ هذا العضو موجود بالفعل في البلاك ليست.");
            }

            if (Pro.get(prisonKey)?.active) {
                return message.reply("❌ العضو مسجون بالفعل، فك سجنه أولاً.");
            }

            const reason =
                args.slice(1).join(" ") || "بدون سبب";

            // إنشاء رتبة البلاك ليست
            const role = await getOrCreateRole(
                message.guild,
                "Blacklist",
                "#000000"
            );

            // إنشاء قناة البلاك ليست
            const channel = await getOrCreateChannel(
                message.guild,
                "البلاك ليست",
                role
            );

            // إخفاء بقية القنوات عن رتبة البلاك ليست
            for (const [, guildChannel] of message.guild.channels.cache) {
                if (
                    guildChannel.id === channel.id ||
                    !guildChannel.permissionOverwrites
                ) continue;

                await guildChannel.permissionOverwrites.edit(role.id, {
                    VIEW_CHANNEL: false
                }).catch(console.error);
            }

            // إعطاء الرتبة
            await member.roles.add(role);

            // حفظ العقوبة
            Pro.set(punishmentKey, {
                reason,
                mod: message.author.id,
                time: Date.now(),
                active: true
            });

            // الرد
            const embed = new MessageEmbed()
                .setColor("#000000")
                .setTitle("تمت إضافة العضو إلى البلاك ليست")
                .setDescription(
                    `**العضو:** ${member}\n` +
                    `**السبب:** ${reason}\n` +
                    `**بواسطة:** ${message.author}`
                )
                .setTimestamp();

            try {
                const Cards = require("../../utils/logCards");
                const file = await Cards.renderBlacklistCard({
                    user: member.user, name: member.displayName, reason, byName: message.member.displayName, added: true
                });

                embed.setImage("attachment://blacklist.png");

                if (client.sendLog) {
                    client.sendLog(message.guild, "blacklistAdd", {
                        user: member.user, file,
                        fields: [
                            { name: "العضو", value: `${member}`, inline: true },
                            { name: "بواسطة", value: `${message.author}`, inline: true },
                            { name: "السبب", value: reason, inline: false }
                        ]
                    });
                }

                return message.reply({ embeds: [embed], files: [{ attachment: file, name: "blacklist.png" }] });
            } catch (cardError) {
                console.error("[BLACKLIST CARD]", cardError.message);
            }

            return message.reply({
                embeds: [embed]
            });

        } catch (error) {
            console.error("[BLACKLIST ERROR]:", error);

            return message.reply(
                "❌ حدث خطأ أثناء تنفيذ أمر البلاك ليست. راجع سجل الاستضافة."
            ).catch(() => {});
        }
    }
};
