
const {
    MessageEmbed,
    MessageSelectMenu,
    MessageActionRow,
    MessageButton
} = require("discord.js");

const { prefix } = require(`${process.cwd()}/config`);
const Pro = require("pro.db");

const {
    getOrCreateRole,
    getOrCreateChannel
} = require("../../utils/punishmentSystem");

module.exports = {
    name: "سجن",
    aliases: ["prison"],

    run: async (client, message, args) => {
        try {
            const guild = message.guild;

            const Color =
                Pro.get(`Guild_Color = ${guild.id}`) ||
                guild.me.displayHexColor ||
                "#000000";

            const allowDb = Pro.get(
                `Allow - Command prison = [ ${guild.id} ]`
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
                await guild.members.fetch(args[0]).catch(() => null);

            if (!member) {
                return message.reply({
                    embeds: [
                        new MessageEmbed()
                            .setColor(Color)
                            .setDescription(
                                `**يرجى استعمال الأمر بالطريقة الصحيحة.\n${prefix}سجن @العضو**`
                            )
                    ]
                });
            }

            if (member.id === message.author.id) {
                return message.react("❌");
            }

            if (member.id === guild.ownerId) {
                return message.reply("❌ لا يمكن سجن مالك السيرفر.");
            }

            if (
                message.member.roles.highest.position <
                member.roles.highest.position
            ) {
                return message.react("❌");
            }

            const botMember = guild.me;

            if (
                !botMember.permissions.has("MANAGE_ROLES") ||
                botMember.roles.highest.position <=
                member.roles.highest.position
            ) {
                return message.reply(
                    "❌ تأكد من صلاحية Manage Roles وأن رتبة البوت أعلى من رتبة العضو."
                );
            }

            const punishmentKey =
                `prison = ${guild.id} = ${member.id}`;

            if (Pro.get(punishmentKey)?.active) {
                return message.reply("⚠️ هذا العضو مسجون بالفعل.");
            }

            const blacklistData = Pro.get(
                `blacklist = ${guild.id} = ${member.id}`
            );

            if (blacklistData?.active) {
                return message.reply(
                    "❌ لا يمكن سجن عضو موجود في البلاك ليست."
                );
            }

            const menuOptions = [
                {
                    label: "مشاكل متكررة",
                    description: "يوم واحد",
                    value: "v1"
                },
                {
                    label: "قذف أو سب أو تشفير",
                    description: "يومان",
                    value: "v2"
                },
                {
                    label: "يدخل حسابات وهمية",
                    description: "يومان",
                    value: "v3"
                },
                {
                    label: "يروج في الخاص لسيرفر",
                    description: "ثلاثة أيام",
                    value: "v4"
                }
            ];

            const menu = new MessageSelectMenu()
                .setCustomId("prison_menu")
                .setPlaceholder("اختر سبب العقوبة ومدة السجن")
                .addOptions(menuOptions);

            const cancelButton = new MessageButton()
                .setCustomId("prison_cancel")
                .setLabel("إلغاء")
                .setStyle("SECONDARY");

            const row1 = new MessageActionRow().addComponents(menu);
            const row2 = new MessageActionRow().addComponents(cancelButton);

            const prompt = await message.reply({
                content: `**يرجى تحديد سبب العقوبة للعضو ${member}.**`,
                components: [row1, row2]
            });

            const collector = prompt.createMessageComponentCollector({
                filter: interaction =>
                    interaction.user.id === message.author.id,
                time: 60000
            });

            collector.on("collect", async interaction => {
                try {
                    if (interaction.customId === "prison_cancel") {
                        await interaction.update({
                            content: "❌ تم إلغاء السجن.",
                            components: []
                        });

                        collector.stop();
                        return;
                    }

                    if (interaction.customId !== "prison_menu") return;

                    await interaction.deferUpdate();

                    const durations = {
                        v1: {
                            reason: "مشاكل متكررة",
                            duration: 1
                        },
                        v2: {
                            reason: "قذف أو سب أو تشفير",
                            duration: 2
                        },
                        v3: {
                            reason: "يدخل حسابات وهمية",
                            duration: 2
                        },
                        v4: {
                            reason: "يروج في الخاص لسيرفر",
                            duration: 3
                        }
                    };

                    const selected = durations[interaction.values[0]];

                    if (!selected) return;

                    const prisonRole = await getOrCreateRole(
                        guild,
                        "prison",
                        "#E74C3C"
                    );

                    const prisonChannel = await getOrCreateChannel(
                        guild,
                        "السجن",
                        prisonRole
                    );

                    const channels = guild.channels.cache.filter(channel =>
                        channel.id !== prisonChannel.id &&
                        [
                            "GUILD_TEXT",
                            "GUILD_VOICE",
                            "GUILD_CATEGORY",
                            "GUILD_NEWS",
                            "GUILD_STORE"
                        ].includes(channel.type)
                    );

                    for (const [, channel] of channels) {
                        await channel.permissionOverwrites.edit(
                            prisonRole,
                            {
                                VIEW_CHANNEL: false,
                                SEND_MESSAGES: false,
                                CONNECT: false
                            }
                        );
                    }

                    await prisonChannel.permissionOverwrites.edit(
                        guild.id,
                        {
                            VIEW_CHANNEL: false
                        }
                    );

                    await prisonChannel.permissionOverwrites.edit(
                        prisonRole,
                        {
                            VIEW_CHANNEL: true,
                            SEND_MESSAGES: true,
                            READ_MESSAGE_HISTORY: true,
                            ADD_REACTIONS: true
                        }
                    );

                    await member.roles.add(
                        prisonRole,
                        `Prison by ${message.author.tag}`
                    );

                    const durationMs =
                        selected.duration * 24 * 60 * 60 * 1000;

                    const startedAt = Date.now();
                    const expiresAt = startedAt + durationMs;

                    Pro.set(punishmentKey, {
                        reason: selected.reason,
                        mod: message.author.id,
                        startedAt,
                        expiresAt,
                        active: true
                    });

                    const prisonListKey =
                        `prisonMembers = ${guild.id}`;

                    const prisonList =
                        Pro.get(prisonListKey) || [];

                    if (!prisonList.includes(member.id)) {
                        prisonList.push(member.id);
                        Pro.set(prisonListKey, prisonList);
                    }

                    Pro.set(`MutedMember_${member.id}`, "True");

                    await interaction.editReply({
                        content:
                            `🔒 **تم سجن ${member.user.tag} بنجاح.**\n` +
                            `**السبب:** ${selected.reason}\n` +
                            `**المدة:** ${selected.duration} يوم\n` +
                            `**ينتهي بتاريخ:** <t:${Math.floor(expiresAt / 1000)}:F>`,
                        components: []
                    });

                    await message.react("✅").catch(() => {});

                    // مؤقت انتهاء العقوبة أثناء تشغيل البوت
                    setTimeout(async () => {
                        try {
                            const current = Pro.get(punishmentKey);

                            if (
                                !current ||
                                current.expiresAt !== expiresAt
                            ) {
                                return;
                            }

                            const currentMember =
                                await guild.members.fetch(member.id)
                                    .catch(() => null);

                            if (currentMember) {
                                await currentMember.roles.remove(
                                    prisonRole,
                                    "Prison duration expired"
                                );
                            }

                            Pro.delete(punishmentKey);
                            Pro.delete(`MutedMember_${member.id}`);

                            const list =
                                Pro.get(prisonListKey) || [];

                            Pro.set(
                                prisonListKey,
                                list.filter(id => id !== member.id)
                            );

                        } catch (error) {
                            console.error(
                                "[PRISON EXPIRY ERROR]:",
                                error
                            );
                        }
                    }, durationMs);

                    collector.stop();

                } catch (error) {
                    console.error("[PRISON APPLY ERROR]:", error);

                    await interaction.editReply({
                        content:
                            "❌ حدث خطأ أثناء تطبيق السجن. راجع صلاحيات البوت.",
                        components: []
                    }).catch(() => {});
                }
            });

            collector.on("end", async (_, reason) => {
                if (reason === "time") {
                    await prompt.edit({
                        content: "⌛ انتهى وقت اختيار العقوبة.",
                        components: []
                    }).catch(() => {});
                }
            });

        } catch (error) {
            console.error("[PRISON COMMAND ERROR]:", error);

            return message.reply(
                "❌ حدث خطأ أثناء تنفيذ أمر السجن."
            ).catch(() => {});
        }
    }
};
