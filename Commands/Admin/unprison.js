
const { MessageEmbed } = require("discord.js");
const { prefix } = require(`${process.cwd()}/config`);
const Pro = require("pro.db");
const moment = require("moment");

module.exports = {
    name: "unprison",
    aliases: ["عفو"],

    run: async (client, message, args) => {
        try {
            const guild = message.guild;

            const Color =
                Pro.get(`Guild_Color = ${guild.id}`) ||
                guild.me.displayHexColor ||
                "#000000";

            const allowDb = Pro.get(
                `Allow - Command unprison = [ ${guild.id} ]`
            );

            const allowedRole = guild.roles.cache.get(allowDb);

            const isAuthorAllowed =
                message.member.roles.cache.has(allowedRole?.id);

            if (
                !isAuthorAllowed &&
                message.author.id !== allowDb &&
                !message.member.permissions.has("MUTE_MEMBERS")
            ) {
                return message.react("❌");
            }

            const member =
                message.mentions.members.first() ||
                guild.members.cache.get(args[0]);

            if (!member) {
                return message.reply({
                    embeds: [
                        new MessageEmbed()
                            .setColor(Color)
                            .setDescription(
                                `**يرجى استعمال الأمر بالطريقة الصحيحة.\n${prefix}عفو @العضو**`
                            )
                    ]
                });
            }

            const punishmentKey =
                `prison = ${guild.id} = ${member.id}`;

            const punishment = Pro.get(punishmentKey);

            if (!punishment) {
                return message.reply(
                    "⚠️ هذا العضو ليس لديه سجل سجن فعال."
                );
            }

            const prisonRole = guild.roles.cache.find(
                role => role.name === "prison"
            );

            if (prisonRole && member.roles.cache.has(prisonRole.id)) {
                const botMember = guild.me;

                if (
                    !botMember.permissions.has("MANAGE_ROLES") ||
                    botMember.roles.highest.position <= prisonRole.position
                ) {
                    return message.reply(
                        "❌ لا أستطيع إزالة رتبة السجن. تحقق من صلاحياتي وترتيب رتبتي."
                    );
                }

                await member.roles.remove(
                    prisonRole,
                    `Prison removed by ${message.author.tag}`
                );
            }

            // حذف سجل العقوبة
            Pro.delete(punishmentKey);
            Pro.delete(`MutedMember_${member.id}`);

            // حذف العضو من قائمة المسجونين
            const prisonListKey =
                `prisonMembers = ${guild.id}`;

            const prisonList =
                Pro.get(prisonListKey) || [];

            Pro.set(
                prisonListKey,
                prisonList.filter(id => id !== member.id)
            );

            const embed = new MessageEmbed()
                .setColor(Color)
                .setTitle("✅ تم فك السجن")
                .setDescription(
                    `**العضو:** ${member}\n` +
                    `**بواسطة:** ${message.author}\n` +
                    `**سبب السجن السابق:** ${punishment.reason || "غير معروف"}\n` +
                    `**وقت فك السجن:** ${moment().format("YYYY-MM-DD HH:mm")}`
                )
                .setFooter(
                    client.user.username,
                    client.user.displayAvatarURL()
                )
                .setTimestamp();

            await message.reply({ embeds: [embed] });

            const logChannel = guild.channels.cache.find(
                channel => channel.name === "log-prison-unprison"
            );

            if (logChannel) {
                await logChannel.send({
                    embeds: [embed]
                }).catch(() => {});
            }

        } catch (error) {
            console.error("[UNPRISON ERROR]:", error);

            return message.reply(
                "❌ حدث خطأ أثناء فك السجن."
            ).catch(() => {});
        }
    }
};
