// ═══════════════════════════════════════════════
//  Voki • نظام التكت
//  فتح الطلب → روم الريكوست → قبول/رفض → التكت (استلام / تحويل / استدعاء / إغلاق)
// ═══════════════════════════════════════════════
const client = require("../index");
const {
    MessageActionRow,
    MessageButton,
    MessageSelectMenu,
    MessageEmbed
} = require("discord.js");

const TS = require("../utils/ticketSystem");
const V = require("../utils/voki");
const Pro = require("pro.db");

const {
    getConfig,
    getTicket,
    setTicket,
    deleteTicket,
    nextNumber,
    addPoint,
    renderText,
    isStaff,
    addHistory,
    updateHistory,
    getHistory
} = TS;

const locks = new Set();
const callCooldown = new Map();

const TICKETS_CATEGORY_ID = null; // احتياطي إذا ما تحدد كاتيجوري وقت الإعداد
const PENDING_TTL = 24 * 60 * 60 * 1000; // طلب معلّق أكثر من يوم يعتبر منتهي
const TRANSFERS_KEY = guildId => `ticket_transfers_${guildId}`;

const COLORS = {
    pending: V.COLOR,
    accepted: "#2ecc71",
    rejected: "#e74c3c",
    closed: "#e74c3c",
    info: V.COLOR
};

const MEMBER_PERMS = {
    VIEW_CHANNEL: true,
    SEND_MESSAGES: true,
    READ_MESSAGE_HISTORY: true,
    ATTACH_FILES: true
};

// ───────────── أدوات عامة ─────────────
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const num = n => `#${String(n).padStart(3, "0")}`;
const unix = ms => Math.floor(ms / 1000);
const ico = (guild, key) => V.icon(guild, key);

function isSelect(interaction) {
    return (
        (interaction.isSelectMenu && interaction.isSelectMenu()) ||
        (interaction.isStringSelectMenu && interaction.isStringSelectMenu())
    );
}

function button(guild, { id, label, style, emojiKey, url }) {
    const btn = new MessageButton().setLabel(label).setStyle(style);

    if (url) btn.setURL(url);
    else btn.setCustomId(id);

    const emoji = emojiKey && V.btnEmoji(guild, emojiKey);
    if (emoji) btn.setEmoji(emoji);

    return btn;
}

// رد سري آمن (يتعامل مع كل حالات التفاعل)
// يرد على الأزرار والقوائم: القائمة المؤقتة تتحدّث، والزر الرئيسي يرد برسالة خاصة
async function respond(interaction, content) {
    if (typeof interaction.isSelectMenu === "function" && interaction.isSelectMenu()) {
        return interaction.update({ content: null, embeds: [E(content)], components: [] }).catch(() => {});
    }
    return reply(interaction, content);
}

async function reply(interaction, content, extra = {}) {
    const payload = { embeds: [E(content)], ephemeral: true, ...extra };

    try {
        if (interaction.deferred || interaction.replied) {
            return await interaction.followUp(payload);
        }

        return await interaction.reply(payload);
    } catch (error) {
        console.error("[TICKET] reply error:", error.message);
    }
}

// كل الردود إمبد
const E = (text, color) => new MessageEmbed().setColor(color || V.COLOR).setDescription(String(text));

function infoEmbed(guild, text, color = COLORS.info) {
    return new MessageEmbed().setColor(color).setDescription(text);
}

async function fetchChannel(guild, channelId) {
    if (!channelId) return null;
    return guild.channels.fetch(channelId).catch(() => null);
}

function makeName(username, number) {
    const slug = String(username)
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60) || "member";

    return `${slug}-${String(number).padStart(3, "0")}`;
}

// يرجع القائمة بعد ما يتغير اختيار المستخدم (عشان ما تعلق على الخيار القديم)
async function resetMenu(interaction) {
    try {
        const message = interaction.message;
        if (message && message.editable) {
            await message.edit({ components: message.components });
        }
    } catch {}
}

// ───────────── الصلاحيات ─────────────
function isHandler(member, config, ticket) {
    if (isStaff(member, config)) return true;

    const roles = [
        ...(ticket?.baseRoleIds || []),
        ...(ticket?.transferredRoleIds || [])
    ];

    return roles.some(roleId => member.roles.cache.has(roleId));
}

// ───────────── جهات التحويل ─────────────
function getTransferTargets(config, guildId) {
    const saved = Pro.get(TRANSFERS_KEY(guildId)) || [];

    const fromCategories = (config.categories || [])
        .filter(category => category.roleId)
        .map(category => ({
            id: category.id,
            name: category.name,
            description: category.description,
            emoji: category.emoji,
            roleIds: [category.roleId],
            type: "menu"
        }));

    const savedIds = new Set(saved.map(item => item.id));

    return [
        ...saved,
        ...fromCategories.filter(item => !savedIds.has(item.id))
    ];
}

// ───────────── الإمبدات ─────────────

// إمبد الطلب في روم الريكوست
function requestEmbed(guild, user, req, config, state = {}) {
    const status = state.status || "pending";
    const image = V.pickImage(config.requestImagePath, "ticket_request");

    const description = renderText(config.requestText, {
        user: `<@${req.userId}>`,
        number: num(req.number),
        category: req.categoryName,
        ticket: state.channel ? `<#${state.channel}>` : ""
    }).trim();

    const embed = new MessageEmbed()
        .setColor(COLORS[status] || COLORS.pending)
        .setAuthor({
            name: `${guild.name} • طلب تكت`,
            iconURL: guild.iconURL({ dynamic: true }) || undefined
        })
        .setDescription(
            description ||
            `${ico(guild, "star")} **طلب جديد بانتظار مراجعة الإدارة**`
        )
        .addFields(
            {
                name: "العضو",
                value:
                    `${ico(guild, "user")} <@${req.userId}>\n` +
                    `\`${user ? user.tag : req.userId}\` • \`${req.userId}\``,
                inline: false
            },
            {
                name: "نوع التكت",
                value: `${ico(guild, "type")} **${req.categoryName}**`,
                inline: true
            },
            {
                name: "رقم الطلب",
                value: `${ico(guild, "ticket")} \`${num(req.number)}\``,
                inline: true
            },
            {
                name: "وقت الطلب",
                value: `${ico(guild, "clock")} <t:${unix(req.createdAt)}:R>`,
                inline: true
            }
        )
        .setFooter({
            text: `${V.BRAND} • Ticket System`,
            iconURL: guild.iconURL({ dynamic: true }) || undefined
        });

    if (user) embed.setThumbnail(user.displayAvatarURL({ dynamic: true }));
    if (image.url) embed.setImage(image.url);

    if (status === "accepted") {
        embed.addField(
            "الحالة",
            `${ico(guild, "accept")} **تم القبول** بواسطة <@${state.by}> • <t:${unix(Date.now())}:R>\n` +
            (state.channel ? `${ico(guild, "ticket")} <#${state.channel}>` : "")
        );
    } else if (status === "rejected") {
        embed.addField(
            "الحالة",
            `${ico(guild, "reject")} **تم الرفض** بواسطة <@${state.by}> • <t:${unix(Date.now())}:R>`
        );
    }

    return { embed, image };
}

function requestButtons(guild, number) {
    return new MessageActionRow().addComponents(
        button(guild, { id: `tk:accept:${number}`, label: "قبول", style: "SUCCESS", emojiKey: "accept" }),
        button(guild, { id: `tk:reject:${number}`, label: "رفض", style: "DANGER", emojiKey: "reject" })
    );
}

// إمبد التكت (الرسالة الرئيسية داخل الروم)
function ticketEmbed(guild, ticket, config, user) {
    const image = V.pickImage(config.requestImagePath, "ticket_request");

    const description = renderText(config.ticketText, {
        user: `<@${ticket.userId}>`,
        staff: ticket.claimedBy ? `<@${ticket.claimedBy}>` : "الإدارة",
        number: num(ticket.number),
        category: ticket.categoryName
    }).trim();

    const embed = new MessageEmbed()
        .setColor(COLORS.accepted)
        .setAuthor({
            name: `${guild.name} • تكت ${num(ticket.number)}`,
            iconURL: guild.iconURL({ dynamic: true }) || undefined
        })
        .setDescription(
            description ||
            `${ico(guild, "star")} مرحباً بك، اشرح طلبك بالتفصيل وأرفق الصور إذا لزم.`
        )
        .addFields(
            {
                name: "العضو",
                value: `${ico(guild, "user")} <@${ticket.userId}>`,
                inline: true
            },
            {
                name: "نوع التكت",
                value: `${ico(guild, "type")} **${ticket.categoryName}**`,
                inline: true
            },
            {
                name: "المستلم",
                value: ticket.claimedBy
                    ? `${ico(guild, "claim")} <@${ticket.claimedBy}>`
                    : "لم يُستلم بعد",
                inline: true
            },
            {
                name: "وقت الفتح",
                value: `${ico(guild, "clock")} <t:${unix(ticket.acceptedAt || ticket.createdAt)}:R>`,
                inline: true
            }
        )
        .setFooter({
            text: `${V.BRAND} • Ticket System`,
            iconURL: guild.iconURL({ dynamic: true }) || undefined
        });

    if (user) embed.setThumbnail(user.displayAvatarURL({ dynamic: true }));
    if (image.url) embed.setImage(image.url);

    return { embed, image };
}

function ticketRows(guild, ticket) {
    return [
        new MessageActionRow().addComponents(
            button(guild, {
                id: "tk:claim",
                label: ticket.claimedBy ? "مستلم" : "استلام",
                style: "PRIMARY",
                emojiKey: "claim"
            }).setDisabled(Boolean(ticket.claimedBy)),
            button(guild, { id: "tk:transfer", label: "تحويل", style: "SECONDARY", emojiKey: "transfer" }),
            button(guild, { id: "tk:call", label: "استدعاء", style: "SECONDARY", emojiKey: "call" }),
            button(guild, { id: "tk:close", label: "إغلاق", style: "DANGER", emojiKey: "close" })
        ),
        new MessageActionRow().addComponents(
            button(guild, { id: "tk:adduser", label: "إضافة عضو", style: "SUCCESS", emojiKey: "adduser" }),
            button(guild, { id: "tk:rmuser", label: "إزالة عضو", style: "SECONDARY", emojiKey: "rmuser" }),
            button(guild, { id: "tk:lock", label: ticket.locked ? "فتح القفل" : "قفل", style: "SECONDARY", emojiKey: ticket.locked ? "unlock" : "lock" }),
            button(guild, { id: "tk:rename", label: "تسمية", style: "SECONDARY", emojiKey: "rename" }),
            button(guild, { id: "tk:transcript", label: "نسخة", style: "SECONDARY", emojiKey: "transcript" })
        )
    ];
}

// يحدّث الرسالة الرئيسية للتكت بعد استلام/تحويل
async function refreshTicketMessage(guild, channel, ticket, config) {
    if (!ticket.controlMessageId) return;

    const message = await channel.messages
        .fetch(ticket.controlMessageId)
        .catch(() => null);

    if (!message) return;

    const user = await client.users.fetch(ticket.userId).catch(() => null);
    const { embed } = ticketEmbed(guild, ticket, config, user);

    await message
        .edit({ embeds: [embed], components: ticketRows(guild, ticket) })
        .catch(err => console.error("[TICKET] refresh error:", err.message));
}

function formatHistory(guild, history) {
    if (!history.length) return "ما عندك تكتات سابقة.";

    const statusNames = {
        pending: "بانتظار القبول",
        accepted: "مقبول",
        rejected: "مرفوض",
        closed: "مغلق"
    };

    return history.slice(0, 15).map(ticket => {
        const date = ticket.createdAt ? `<t:${unix(ticket.createdAt)}:d>` : "غير معروف";

        return (
            `${ico(guild, "star")} **تكت ${num(ticket.number)}** — ${ticket.categoryName || "غير محدد"}\n` +
            `└ ${statusNames[ticket.status] || ticket.status} • ${date}`
        );
    }).join("\n\n");
}

// ═════════════════════════════════════════════
//  1) فتح طلب تكت من اللوحة
// ═════════════════════════════════════════════
async function openRequest(interaction, config) {
    const guild = interaction.guild;
    const selected = interaction.values[0];

    // التكتات السابقة
    if (selected === "ticket_history") {
        const history = getHistory(guild.id, interaction.user.id);
        await resetMenu(interaction);

        return interaction.reply({
            ephemeral: true,
            embeds: [
                new MessageEmbed()
                    .setColor(COLORS.info)
                    .setTitle("تكتاتي السابقة")
                    .setDescription(formatHistory(guild, history))
            ]
        }).catch(() => {});
    }

    await interaction.deferReply({ ephemeral: true }).catch(() => {});
    await resetMenu(interaction); // يمنع اختفاء/تعليق القائمة

    const category = (config.categories || []).find(item => item.id === selected);

    if (!category) {
        return interaction.editReply({ embeds: [E("القسم غير موجود.")] });
    }

    // تكت مفتوح أو طلب معلّق؟
    const memberKey = `ticket_member_${guild.id}_${interaction.user.id}`;
    const current = Pro.get(memberKey);

    if (current) {
        if (String(current).startsWith("p:")) {
            const pendingNumber = String(current).slice(2);
            const pending = TS.getPending(guild.id, pendingNumber);

            if (pending && Date.now() - pending.createdAt < PENDING_TTL) {
                return interaction.editReply({
                    embeds: [E(`عندك طلب قيد المراجعة (${num(pendingNumber)}). انتظر قرار الإدارة.`)]
                });
            }

            TS.deletePending(guild.id, pendingNumber);
            Pro.delete(memberKey);
        } else {
            const old = await fetchChannel(guild, current);

            if (old) {
                return interaction.editReply({
                    embeds: [E(`عندك تكت مفتوح بالفعل: ${old}`)]
                });
            }

            Pro.delete(memberKey);
        }
    }

    const requestChannel = await fetchChannel(guild, config.requestChannelId);

    if (!requestChannel) {
        return interaction.editReply({ embeds: [E("روم الريكوست غير موجود، أبلغ الإدارة.")] });
    }

    const number = nextNumber(guild.id);

    const req = {
        number,
        guildId: guild.id,
        userId: interaction.user.id,
        categoryId: category.id,
        categoryName: category.name,
        createdAt: Date.now()
    };

    const { embed, image } = requestEmbed(guild, interaction.user, req, config);

    const mentions = (config.reviewerRoleIds || [])
        .filter(id => guild.roles.cache.has(id))
        .map(id => `<@&${id}>`)
        .join(" ");

    const payload = {
        content: mentions || undefined,
        embeds: [embed],
        components: [requestButtons(guild, number)],
        allowedMentions: { roles: config.reviewerRoleIds || [], users: [] }
    };

    if (image.file) payload.files = [image.file];

    const requestMessage = await requestChannel.send(payload).catch(err => {
        console.error("[TICKET] request send error:", err.message);
        return null;
    });

    if (!requestMessage) {
        return interaction.editReply({
            embeds: [E("لم أستطع إرسال الطلب لروم الريكوست. تأكد من صلاحيات البوت هناك.")]
        });
    }

    req.requestMessageId = requestMessage.id;
    req.requestChannelId = requestChannel.id;

    TS.setPending(guild.id, number, req);
    Pro.set(memberKey, `p:${number}`);

    addHistory(guild.id, interaction.user.id, {
        number,
        channelId: null,
        categoryId: category.id,
        categoryName: category.name,
        status: "pending",
        createdAt: req.createdAt
    });

    return interaction.editReply({
        embeds: [E(`${ico(guild, "accept")} تم إرسال طلبك (${num(number)}) للإدارة، سيصلك إشعار عند القبول.`)]
    });
}

// ═════════════════════════════════════════════
//  2) قبول / رفض الطلب
// ═════════════════════════════════════════════
async function decideRequest(interaction, config, action, number) {
    const guild = interaction.guild;

    if (!isStaff(interaction.member, config)) {
        return reply(interaction, "ما عندك صلاحية قبول أو رفض الطلبات.");
    }

    const lockKey = `req:${guild.id}:${number}`;

    if (locks.has(lockKey)) {
        return reply(interaction, "الطلب تتم معالجته الآن.");
    }

    locks.add(lockKey);

    try {
        await interaction.deferUpdate().catch(() => {});

        const req = TS.getPending(guild.id, number);

        if (!req) {
            return interaction.followUp({
                embeds: [E("الطلب غير موجود أو تمت معالجته.")],
                ephemeral: true
            }).catch(() => {});
        }

        const user = await client.users.fetch(req.userId).catch(() => null);
        const memberKey = `ticket_member_${guild.id}_${req.userId}`;

        // ───── رفض ─────
        if (action === "reject") {
            TS.deletePending(guild.id, number);
            Pro.delete(memberKey);

            TS.updateHistoryByNumber(guild.id, req.userId, number, {
                status: "rejected",
                closedAt: Date.now()
            });

            const { embed } = requestEmbed(guild, user, req, config, {
                status: "rejected",
                by: interaction.user.id
            });

            await interaction.editReply({
                embeds: [embed],
                components: [],
                allowedMentions: { parse: [] }
            }).catch(() => {});

            if (user) {
                await user.send({
                    embeds: [
                        infoEmbed(
                            guild,
                            `${ico(guild, "reject")} تم رفض طلب التكت ${num(number)} (**${req.categoryName}**) في سيرفر **${guild.name}**.`,
                            COLORS.rejected
                        )
                    ]
                }).catch(() => {});
            }

            return;
        }

        // ───── قبول ─────
        const member = await guild.members.fetch(req.userId).catch(() => null);

        if (!member) {
            TS.deletePending(guild.id, number);
            Pro.delete(memberKey);
            TS.updateHistoryByNumber(guild.id, req.userId, number, { status: "rejected", closedAt: Date.now() });

            const { embed } = requestEmbed(guild, user, req, config, { status: "rejected", by: client.user.id });
            return interaction.editReply({ embeds: [embed], components: [] }).catch(() => {});
        }

        const category = (config.categories || []).find(item => item.id === req.categoryId);

        const baseRoleIds = [
            ...new Set([
                ...(config.reviewerRoleIds || []),
                ...(category && category.roleId ? [category.roleId] : [])
            ])
        ].filter(id => guild.roles.cache.has(id));

        const overwrites = [
            { id: guild.id, deny: ["VIEW_CHANNEL"] },
            {
                id: req.userId,
                allow: ["VIEW_CHANNEL", "SEND_MESSAGES", "READ_MESSAGE_HISTORY", "ATTACH_FILES"]
            },
            {
                id: client.user.id,
                allow: [
                    "VIEW_CHANNEL", "SEND_MESSAGES", "READ_MESSAGE_HISTORY",
                    "MANAGE_CHANNELS", "ATTACH_FILES", "EMBED_LINKS"
                ]
            },
            {
                id: interaction.user.id,
                allow: ["VIEW_CHANNEL", "SEND_MESSAGES", "READ_MESSAGE_HISTORY", "ATTACH_FILES"]
            },
            ...baseRoleIds.map(id => ({
                id,
                allow: ["VIEW_CHANNEL", "SEND_MESSAGES", "READ_MESSAGE_HISTORY", "ATTACH_FILES"]
            }))
        ];

        const channelOptions = {
            type: "GUILD_TEXT",
            topic: `تكت ${num(number)} • ${req.categoryName} • ${user ? user.tag : req.userId}`,
            permissionOverwrites: overwrites
        };

        const parentId = config.ticketCategoryId || TICKETS_CATEGORY_ID;
        if (parentId && guild.channels.cache.has(parentId)) channelOptions.parent = parentId;

        const channel = await guild.channels
            .create(makeName(user ? user.username : "member", number), channelOptions)
            .catch(err => {
                console.error("[TICKET] channel create error:", err);
                return null;
            });

        if (!channel) {
            return interaction.followUp({
                embeds: [E("فشل إنشاء روم التكت. تأكد أن البوت عنده Manage Channels ورتبته أعلى من رتب الدعم.")],
                ephemeral: true
            }).catch(() => {});
        }

        const ticket = {
            guildId: guild.id,
            channelId: channel.id,
            userId: req.userId,
            number,
            categoryId: req.categoryId,
            categoryName: req.categoryName,
            status: "accepted",
            claimedBy: interaction.user.id,
            acceptedBy: interaction.user.id,
            acceptedAt: Date.now(),
            baseRoleIds,
            transferredRoleIds: [],
            pointAwarded: false,
            createdAt: req.createdAt,
            requestMessageId: req.requestMessageId
        };

        const { embed: tEmbed, image: tImage } = ticketEmbed(guild, ticket, config, user);

        const payload = {
            content: `<@${req.userId}> <@${interaction.user.id}>`,
            embeds: [tEmbed],
            components: ticketRows(guild, ticket),
            allowedMentions: { users: [req.userId, interaction.user.id] }
        };

        if (tImage.file) payload.files = [tImage.file];

        let controlMessage = await channel.send(payload).catch(err => {
            console.error("[TICKET] control message error:", err.message);
            return null;
        });

        // لو فشل بالصورة نعيد بدونها عشان ما يبقى التكت فاضي
        if (!controlMessage) {
            tEmbed.image = null;
            controlMessage = await channel.send({ ...payload, files: [], embeds: [tEmbed] }).catch(err => {
                console.error("[TICKET] control message retry error:", err.message);
                return null;
            });
        }

        // آخر محاولة: رسالة نصية بسيطة + الأزرار (بدون إمبد)
        let lastError = null;
        if (!controlMessage) {
            controlMessage = await channel.send({
                content: `${payload.content}\n**🎫 تكت #${number}** — أزرار التحكم بالأسفل`,
                components: ticketRows(guild, ticket),
                allowedMentions: payload.allowedMentions
            }).catch(err => { lastError = err.message; console.error("[TICKET] control plain error:", err.message); return null; });
            if (!controlMessage) {
                interaction.followUp({ content: `⚠️ انفتح التكت لكن فشل إرسال أزرار التحكم: \`${lastError}\`\nتأكد أن للبوت صلاحية Send Messages + Embed Links + Attach Files داخل التكت.`, ephemeral: true }).catch(() => {});
            }
        }

        ticket.controlMessageId = controlMessage ? controlMessage.id : null;

        setTicket(channel.id, ticket);
        Pro.set(memberKey, channel.id);
        TS.deletePending(guild.id, number);

        TS.updateHistoryByNumber(guild.id, req.userId, number, {
            status: "accepted",
            channelId: channel.id
        });

        // تحديث رسالة الريكوست
        const { embed } = requestEmbed(guild, user, req, config, {
            status: "accepted",
            by: interaction.user.id,
            channel: channel.id
        });

        const linkRow = new MessageActionRow().addComponents(
            button(guild, {
                label: "فتح التكت",
                style: "LINK",
                url: `https://discord.com/channels/${guild.id}/${channel.id}`,
                emojiKey: "ticket"
            })
        );

        await interaction.editReply({
            embeds: [embed],
            components: [linkRow],
            allowedMentions: { parse: [] }
        }).catch(() => {});

        // إشعار خاص للعضو
        if (user) {
            const dmText = config.acceptedText
                ? renderText(config.acceptedText, {
                    admin: interaction.user.username,
                    number: num(number),
                    ticket: channel.name
                })
                : `${ico(guild, "accept")} تم قبول طلبك (${num(number)} • **${req.categoryName}**) في **${guild.name}**.`;

            await user.send({
                embeds: [infoEmbed(guild, dmText, COLORS.accepted)],
                components: [linkRow]
            }).catch(() => {});
        }
    } finally {
        locks.delete(lockKey);
    }
}

// ═════════════════════════════════════════════
//  3) داخل التكت: استلام
// ═════════════════════════════════════════════
async function claimTicket(interaction, config) {
    const guild = interaction.guild;
    const ticket = getTicket(interaction.channel.id);

    if (!ticket || ticket.status !== "accepted") {
        return reply(interaction, "هذا التكت غير موجود أو مغلق.");
    }

    if (!isHandler(interaction.member, config, ticket)) {
        return reply(interaction, "ما عندك صلاحية استلام التكت.");
    }

    if (ticket.claimedBy) {
        return reply(
            interaction,
            ticket.claimedBy === interaction.user.id
                ? "أنت مستلم التكت بالفعل."
                : `التكت مستلم من <@${ticket.claimedBy}>.`,
            { allowedMentions: { parse: [] } }
        );
    }

    ticket.claimedBy = interaction.user.id;
    setTicket(interaction.channel.id, ticket);

    await interaction.channel.permissionOverwrites
        .edit(interaction.user.id, MEMBER_PERMS)
        .catch(() => {});

    const user = await client.users.fetch(ticket.userId).catch(() => null);
    const { embed } = ticketEmbed(guild, ticket, config, user);

    await interaction.update({
        embeds: [embed],
        components: ticketRows(guild, ticket)
    }).catch(() => {});

    await interaction.channel.send({
        embeds: [
            infoEmbed(
                guild,
                `${ico(guild, "claim")} تم استلام التكت بواسطة ${interaction.user}`,
                COLORS.accepted
            ).setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        ],
        allowedMentions: { parse: [] }
    }).catch(() => {});
}

// ═════════════════════════════════════════════
//  4) داخل التكت: تحويل (زر ← قائمة سرية ← تنفيذ)
// ═════════════════════════════════════════════
async function showTransferMenu(interaction, config) {
    const guild = interaction.guild;
    const ticket = getTicket(interaction.channel.id);

    if (!ticket || ticket.status !== "accepted") {
        return reply(interaction, "هذا التكت غير موجود أو مغلق.");
    }

    if (!isHandler(interaction.member, config, ticket)) {
        return reply(interaction, "ما عندك صلاحية تحويل التكت.");
    }

    const targets = getTransferTargets(config, guild.id).slice(0, 100);

    if (!targets.length) {
        return reply(interaction, "ما فيه جهات تحويل. أضفها بأمر `تحويلات` أو اربط رتبة بالأقسام.");
    }

    // جهة وحدة فقط = تحويل مباشر بدون سؤال
    if (targets.length === 1) {
        return performTransfer(interaction, config, targets[0].id);
    }

    const rows = [];

    for (let i = 0; i < targets.length; i += 25) {
        const chunk = targets.slice(i, i + 25);

        rows.push(
            new MessageActionRow().addComponents(
                new MessageSelectMenu()
                    .setCustomId(`tk:tpick:${i / 25}`)
                    .setPlaceholder(i === 0 ? "اختر الجهة المراد التحويل لها" : `اختر الجهة (${i / 25 + 1})`)
                    .addOptions(
                        chunk.map(target => {
                            const option = {
                                label: String(target.name).slice(0, 100),
                                description: String(target.description || target.name).slice(0, 100),
                                value: target.id
                            };

                            const emoji = V.btnEmoji(guild, "transfer");
                            if (emoji) option.emoji = emoji;

                            return option;
                        })
                    )
            )
        );
    }

    return interaction.reply({
        embeds: [E(`${ico(guild, "transfer")} **تحويل التكت ${num(ticket.number)}**`)],
        components: rows,
        ephemeral: true
    }).catch(() => {});
}

async function performTransfer(interaction, config, targetId) {
    const guild = interaction.guild;
    const channel = interaction.channel;
    const ticket = getTicket(channel.id);

    if (!ticket || ticket.status !== "accepted") {
        return respond(interaction, "هذا التكت غير موجود أو مغلق.");
    }

    if (!isHandler(interaction.member, config, ticket)) {
        return respond(interaction, "ما عندك صلاحية تحويل التكت.");
    }

    const target = getTransferTargets(config, guild.id).find(item => item.id === targetId);

    if (!target) {
        return respond(interaction, "الجهة غير موجودة.");
    }

    await respond(interaction, `${ico(guild, "accept")} تم تحويل التكت إلى **${target.name}**.`);

    // إزالة صلاحيات التحويل السابق (بدون رتب الدعم الأساسية)
    const keep = new Set([...(config.reviewerRoleIds || []), ...(ticket.baseRoleIds || [])]);

    for (const roleId of ticket.transferredRoleIds || []) {
        if (keep.has(roleId)) continue;
        await channel.permissionOverwrites.delete(roleId).catch(() => {});
    }

    ticket.transferredRoleIds = [];

    for (const roleId of target.roleIds || []) {
        if (!guild.roles.cache.has(roleId)) continue;

        await channel.permissionOverwrites
            .edit(roleId, MEMBER_PERMS)
            .catch(err => console.error("[TICKET] transfer perms error:", err.message));

        ticket.transferredRoleIds.push(roleId);
    }

    ticket.categoryName = target.name;
    ticket.claimedBy = null; // الفريق الجديد يستلمه

    setTicket(channel.id, ticket);
    updateHistory(guild.id, ticket.userId, ticket.channelId, { categoryName: target.name });

    await refreshTicketMessage(guild, channel, ticket, config);

    const mentions = (target.roleIds || []).map(id => `<@&${id}>`).join(" ");

    await channel.send({
        content: mentions || undefined,
        embeds: [
            infoEmbed(
                guild,
                `${ico(guild, "transfer")} تم تحويل التكت إلى **${target.name}** بواسطة ${interaction.user}\n` +
                `اضغطوا زر **استلام** لاستلامه.`
            )
        ],
        allowedMentions: { roles: target.roleIds || [], users: [] }
    }).catch(err => console.error("[TICKET] transfer send error:", err.message));

    notifyRoleMembers(guild, target.roleIds || [], channel, interaction.user, target, ticket.number)
        .catch(err => console.error("[TICKET] transfer DM error:", err.message));
}

async function notifyRoleMembers(guild, roleIds, channel, staffUser, target, number) {
    await guild.members.fetch().catch(() => {});

    const sent = new Set();
    const link = `https://discord.com/channels/${guild.id}/${channel.id}`;

    for (const roleId of roleIds) {
        const role = guild.roles.cache.get(roleId);
        if (!role) continue;

        for (const member of role.members.values()) {
            if (member.user.bot || member.id === staffUser.id || sent.has(member.id)) continue;

            sent.add(member.id);

            await member.send(
                `تم تحويل تكت ${num(number)} إلى **${target.name}**\n` +
                `بواسطة: ${staffUser.username}\n` +
                `رابط التكت: ${link}`
            ).catch(() => {});

            await sleep(400);
        }
    }
}

// ═════════════════════════════════════════════
//  5) داخل التكت: استدعاء
//  - الإداري يستدعي صاحب التكت (منشن + خاص)
//  - صاحب التكت يستدعي الإدارة (المستلم أو رتب الدعم)
// ═════════════════════════════════════════════
async function callTicket(interaction, config) {
    const guild = interaction.guild;
    const channel = interaction.channel;
    const ticket = getTicket(channel.id);

    if (!ticket || ticket.status !== "accepted") {
        return reply(interaction, "هذا التكت غير موجود أو مغلق.");
    }

    const isOwner = interaction.user.id === ticket.userId;
    const handler = isHandler(interaction.member, config, ticket);

    if (!isOwner && !handler) {
        return reply(interaction, "ما عندك صلاحية الاستدعاء.");
    }

    const cooldownKey = `${channel.id}:${interaction.user.id}`;
    const last = callCooldown.get(cooldownKey) || 0;

    if (Date.now() - last < 60000) {
        const left = Math.ceil((60000 - (Date.now() - last)) / 1000);
        return reply(interaction, `انتظر ${left} ثانية قبل الاستدعاء مرة ثانية.`);
    }

    callCooldown.set(cooldownKey, Date.now());

    const link = `https://discord.com/channels/${guild.id}/${channel.id}`;
    const linkRow = new MessageActionRow().addComponents(
        button(guild, { label: "فتح التكت", style: "LINK", url: link, emojiKey: "ticket" })
    );

    await interaction.deferReply({ ephemeral: true }).catch(() => {});

    // الإداري → العضو
    if (!isOwner || (handler && interaction.user.id !== ticket.userId)) {
        const owner = await client.users.fetch(ticket.userId).catch(() => null);

        await channel.send({
            content: `<@${ticket.userId}>`,
            embeds: [
                infoEmbed(
                    guild,
                    `${ico(guild, "call")} **استدعاء**\n<@${ticket.userId}> الإدارة تنتظر ردك في التكت، تفضّل.`
                ).setFooter({ text: `بواسطة ${interaction.user.tag}` })
            ],
            allowedMentions: { users: [ticket.userId] }
        }).catch(() => {});

        let dmOk = false;

        if (owner) {
            dmOk = await owner.send({
                embeds: [
                    infoEmbed(
                        guild,
                        `${ico(guild, "call")} تم استدعاؤك في تكت ${num(ticket.number)} (**${ticket.categoryName}**) بسيرفر **${guild.name}**.`
                    )
                ],
                components: [linkRow]
            }).then(() => true).catch(() => false);
        }

        return interaction.editReply({
            embeds: [E(dmOk
                ? `${ico(guild, "call")} تم استدعاء العضو (منشن + رسالة خاصة).`
                : `${ico(guild, "call")} تم استدعاء العضو بالمنشن (الخاص مقفل).`)]
        }).catch(() => {});
    }

    // العضو → الإدارة
    const roleIds = ticket.claimedBy
        ? []
        : [...(ticket.baseRoleIds || []), ...(ticket.transferredRoleIds || [])].filter(id => guild.roles.cache.has(id));

    const mentions = ticket.claimedBy
        ? `<@${ticket.claimedBy}>`
        : roleIds.map(id => `<@&${id}>`).join(" ") || "الإدارة";

    await channel.send({
        content: mentions,
        embeds: [
            infoEmbed(
                guild,
                `${ico(guild, "call")} **استدعاء**\n<@${ticket.userId}> يطلب حضور الإدارة في التكت.`
            )
        ],
        allowedMentions: { users: ticket.claimedBy ? [ticket.claimedBy] : [], roles: roleIds }
    }).catch(() => {});

    if (ticket.claimedBy) {
        const staff = await client.users.fetch(ticket.claimedBy).catch(() => null);

        if (staff) {
            await staff.send({
                embeds: [
                    infoEmbed(
                        guild,
                        `${ico(guild, "call")} العضو <@${ticket.userId}> يستدعيك في تكت ${num(ticket.number)}.`
                    )
                ],
                components: [linkRow]
            }).catch(() => {});
        }
    }

    return interaction.editReply({ embeds: [E("تم إرسال الاستدعاء للإدارة.")] }).catch(() => {});
}

// ═════════════════════════════════════════════
//  6) داخل التكت: إغلاق (مع تأكيد)
// ═════════════════════════════════════════════
async function askClose(interaction, config) {
    const guild = interaction.guild;
    const ticket = getTicket(interaction.channel.id);

    if (!ticket || ticket.status !== "accepted") {
        return reply(interaction, "هذا التكت غير موجود أو مغلق.");
    }

    const allowed =
        interaction.user.id === ticket.userId ||
        isHandler(interaction.member, config, ticket);

    if (!allowed) {
        return reply(interaction, "ما عندك صلاحية إغلاق التكت.");
    }

    return interaction.reply({
        embeds: [E(`${ico(guild, "close")} **تأكيد إغلاق التكت ${num(ticket.number)}؟**\nسيتم حذف الروم بعد ثواني.`)],
        components: [
            new MessageActionRow().addComponents(
                button(guild, { id: "tk:cyes", label: "تأكيد الإغلاق", style: "DANGER", emojiKey: "close" }),
                button(guild, { id: "tk:cno", label: "إلغاء", style: "SECONDARY", emojiKey: "reject" })
            )
        ],
        ephemeral: true
    }).catch(() => {});
}

async function closeTicket(interaction, config) {
    const guild = interaction.guild;
    const channel = interaction.channel;
    const ticket = getTicket(channel.id);

    if (!ticket || ticket.status !== "accepted") {
        return respond(interaction, "هذا التكت غير موجود أو مغلق.");
    }

    const allowed =
        interaction.user.id === ticket.userId ||
        isHandler(interaction.member, config, ticket);

    if (!allowed) {
        return respond(interaction, "ما عندك صلاحية إغلاق التكت.");
    }

    const lockKey = `close:${channel.id}`;

    if (locks.has(lockKey)) {
        return respond(interaction, "يتم إغلاق التكت الآن.");
    }

    locks.add(lockKey);

    await interaction.deferUpdate().catch(() => {});

    ticket.status = "closed";
    ticket.closedBy = interaction.user.id;
    ticket.closedAt = Date.now();

    if (ticket.claimedBy && !ticket.pointAwarded) {
        ticket.pointAwarded = true;

        const points = addPoint(guild.id, ticket.claimedBy);

        if (config.pointText) {
            const staffUser = await client.users.fetch(ticket.claimedBy).catch(() => null);

            if (staffUser) {
                await staffUser.send(
                    renderText(config.pointText, {
                        points,
                        number: num(ticket.number),
                        user: ticket.userId
                    })
                ).catch(() => {});
            }
        }
    }

    setTicket(channel.id, ticket);
    updateHistory(guild.id, ticket.userId, channel.id, { status: "closed", closedAt: ticket.closedAt });

    // قفل الكتابة على العضو
    await channel.permissionOverwrites.edit(ticket.userId, {
        VIEW_CHANNEL: true,
        SEND_MESSAGES: false,
        READ_MESSAGE_HISTORY: true
    }).catch(() => {});

    // تعطيل أزرار الرسالة الرئيسية
    if (ticket.controlMessageId) {
        const main = await channel.messages.fetch(ticket.controlMessageId).catch(() => null);
        if (main) await main.edit({ components: [] }).catch(() => {});
    }

    const duration = Math.max(1, Math.round((ticket.closedAt - (ticket.acceptedAt || ticket.createdAt)) / 60000));

    await channel.send({
        embeds: [
            new MessageEmbed()
                .setColor(COLORS.closed)
                .setDescription(
                    `${ico(guild, "close")} **تم إغلاق التكت** بواسطة ${interaction.user}\n` +
                    `سيتم حذف الروم بعد لحظات.`
                )
        ],
        allowedMentions: { parse: [] }
    }).catch(() => {});

    const owner = await client.users.fetch(ticket.userId).catch(() => null);

    if (owner) {
        await owner.send({
            embeds: [
                new MessageEmbed()
                    .setColor(COLORS.closed)
                    .setAuthor({ name: `${guild.name} • تم إغلاق تكتك`, iconURL: guild.iconURL({ dynamic: true }) || undefined })
                    .addFields(
                        { name: "رقم التكت", value: `${ico(guild, "ticket")} \`${num(ticket.number)}\``, inline: true },
                        { name: "نوع التكت", value: `${ico(guild, "type")} ${ticket.categoryName}`, inline: true },
                        { name: "المدة", value: `${ico(guild, "clock")} ${duration} دقيقة`, inline: true }
                    )
            ]
        }).catch(() => {});
    }

    setTimeout(async () => {
        await channel.delete().catch(() => {});
        deleteTicket(channel.id);
        locks.delete(lockKey);
    }, 3000);
}

// ═════════════════════════════════════════════
//  داخل التكت: إضافة/إزالة عضو، قفل، تسمية، نسخة
// ═════════════════════════════════════════════
async function ticketGuard(interaction, config) {
    const ticket = getTicket(interaction.channel.id);

    if (!ticket || ticket.status !== "accepted") {
        await reply(interaction, "هذا التكت غير موجود أو مغلق.");
        return null;
    }

    if (!isHandler(interaction.member, config, ticket)) {
        await reply(interaction, "هذا الزر للإدارة المسؤولة عن التكت فقط.");
        return null;
    }

    return ticket;
}

// يسأل سؤال سري ويستنى رد صاحب الضغطة (يحذف رده)
async function askInTicket(interaction, text) {
    await interaction.followUp({ embeds: [E(text)], ephemeral: true }).catch(() => {});

    const got = await interaction.channel
        .awaitMessages({ filter: m => m.author.id === interaction.user.id, max: 1, time: 60000 })
        .then(c => c.first()).catch(() => null);

    if (got) got.delete().catch(() => {});
    return got;
}

async function memberAction(interaction, config, action) {
    const guild = interaction.guild;
    const ticket = await ticketGuard(interaction, config);
    if (!ticket) return;

    await interaction.deferReply({ ephemeral: true }).catch(() => {});

    const adding = action === "adduser";
    const got = await askInTicket(interaction, `${ico(guild, adding ? "adduser" : "rmuser")} منشن العضو اللي تبي ${adding ? "تضيفه للتكت" : "تشيله من التكت"}، أو اكتب الـ ID:`);
    if (!got) return;

    const id = (got.mentions.users.first() || {}).id || (got.content.match(/\d{15,}/) || [])[0];
    const member = id && await guild.members.fetch(id).catch(() => null);

    if (!member) return interaction.followUp({ embeds: [E("ما لقيت العضو.", COLORS.rejected)], ephemeral: true }).catch(() => {});
    if (!adding && member.id === ticket.userId) return interaction.followUp({ embeds: [E("ما تقدر تشيل صاحب التكت.", COLORS.rejected)], ephemeral: true }).catch(() => {});
    if (!adding && isStaff(member, config)) return interaction.followUp({ embeds: [E("هذا من الإدارة، ما ينشال من هنا.", COLORS.rejected)], ephemeral: true }).catch(() => {});

    if (adding) await interaction.channel.permissionOverwrites.edit(member.id, MEMBER_PERMS).catch(() => {});
    else await interaction.channel.permissionOverwrites.delete(member.id).catch(() => {});

    await interaction.channel.send({
        embeds: [
            infoEmbed(
                guild,
                `${ico(guild, adding ? "adduser" : "rmuser")} ${adding ? "تمت إضافة" : "تمت إزالة"} ${member} ${adding ? "إلى" : "من"} التكت بواسطة ${interaction.user}`,
                adding ? COLORS.accepted : COLORS.rejected
            ).setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        ],
        allowedMentions: { parse: [] }
    }).catch(() => {});

    return interaction.followUp({ embeds: [E("تم.", COLORS.accepted)], ephemeral: true }).catch(() => {});
}

async function toggleLock(interaction, config) {
    const guild = interaction.guild;
    const ticket = await ticketGuard(interaction, config);
    if (!ticket) return;

    ticket.locked = !ticket.locked;
    setTicket(interaction.channel.id, ticket);

    await interaction.channel.permissionOverwrites
        .edit(ticket.userId, { ...MEMBER_PERMS, SEND_MESSAGES: !ticket.locked })
        .catch(() => {});

    const user = await client.users.fetch(ticket.userId).catch(() => null);
    const { embed } = ticketEmbed(guild, ticket, config, user);

    await interaction.update({ embeds: [embed], components: ticketRows(guild, ticket) }).catch(() => {});

    await interaction.channel.send({
        embeds: [
            infoEmbed(
                guild,
                ticket.locked
                    ? `${ico(guild, "lock")} تم **قفل** التكت: صاحب التكت ما يقدر يكتب لين يفتحه ${interaction.user}`
                    : `${ico(guild, "unlock")} تم **فتح** التكت: صاحب التكت يقدر يكتب الحين.`,
                ticket.locked ? COLORS.rejected : COLORS.accepted
            )
        ],
        allowedMentions: { parse: [] }
    }).catch(() => {});
}

async function renameTicket(interaction, config) {
    const guild = interaction.guild;
    const ticket = await ticketGuard(interaction, config);
    if (!ticket) return;

    await interaction.deferReply({ ephemeral: true }).catch(() => {});

    const got = await askInTicket(interaction, `${ico(guild, "rename")} اكتب الاسم الجديد للتكت:`);
    if (!got) return;

    const name = got.content.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 80);
    if (!name) return interaction.followUp({ embeds: [E("اسم غير صالح.", COLORS.rejected)], ephemeral: true }).catch(() => {});

    const ok = await interaction.channel.setName(name).then(() => true).catch(() => false);

    return interaction.followUp({
        embeds: [E(ok ? `${ico(guild, "accept")} صار اسم التكت **${name}**` : "ما قدرت أغير الاسم (ديسكورد يسمح مرتين كل 10 دقايق).", ok ? COLORS.accepted : COLORS.rejected)],
        ephemeral: true
    }).catch(() => {});
}

// نسخة نصية من المحادثة (تجيك سري)
async function collectTranscript(channel, limit = 500) {
    const out = [];
    let before;

    while (out.length < limit) {
        const batch = await channel.messages.fetch({ limit: 100, ...(before ? { before } : {}) }).catch(() => null);
        if (!batch || !batch.size) break;
        out.push(...batch.values());
        before = batch.last().id;
        if (batch.size < 100) break;
    }

    return out.reverse().map(m => {
        const time = new Date(m.createdTimestamp).toLocaleString("en-GB", { timeZone: "Asia/Riyadh" });
        const extra = [...m.attachments.values()].map(a => a.url).join(" ");
        const embedText = m.embeds.map(e => e.description || e.title || "").filter(Boolean).join(" | ");
        return `[${time}] ${m.author.tag}: ${m.content || embedText}${extra ? ` ${extra}` : ""}`;
    }).join("\n");
}

async function sendTranscript(interaction, config) {
    const guild = interaction.guild;
    const ticket = await ticketGuard(interaction, config);
    if (!ticket) return;

    await interaction.deferReply({ ephemeral: true }).catch(() => {});

    const text = await collectTranscript(interaction.channel);

    return interaction.editReply({
        embeds: [E(`${ico(guild, "transcript")} نسخة من محادثة التكت ${num(ticket.number)} (آخر 500 رسالة).`, COLORS.accepted)],
        files: [{ attachment: Buffer.from(text || "لا يوجد رسائل", "utf8"), name: `ticket-${String(ticket.number).padStart(3, "0")}.txt` }]
    }).catch(() => {});
}

// ═════════════════════════════════════════════
//  الموزّع الرئيسي
// ═════════════════════════════════════════════
client.on("interactionCreate", async interaction => {
    try {
        if (!interaction.guild) return;

        const id = interaction.customId;
        if (!id || !String(id).startsWith("tk:")) return;

        const config = getConfig(interaction.guild.id);

        if (!config) {
            return reply(interaction, "نظام التكت غير مُعد في هذا السيرفر.");
        }

        const parts = String(id).split(":");
        const action = parts[1];

        if (isSelect(interaction)) {
            if (action === "open") return await openRequest(interaction, config);
            if (action === "tpick") return await performTransfer(interaction, config, interaction.values[0]);
            return;
        }

        if (!interaction.isButton()) return;

        switch (action) {
            case "accept":
            case "reject":
                return await decideRequest(interaction, config, action, parts[2]);
            case "claim":
                return await claimTicket(interaction, config);
            case "transfer":
                return await showTransferMenu(interaction, config);
            case "call":
                return await callTicket(interaction, config);
            case "close":
                return await closeTicket(interaction, config);
            case "adduser":
            case "rmuser":
                return await memberAction(interaction, config, action);
            case "lock":
                return await toggleLock(interaction, config);
            case "rename":
                return await renameTicket(interaction, config);
            case "transcript":
                return await sendTranscript(interaction, config);
            case "cyes": // (قديم) أزرار تأكيد قديمة في رسائل سابقة
                return await closeTicket(interaction, config);
            case "cno":
                return await interaction.update({ embeds: [E("تم إلغاء الإغلاق.")], components: [] }).catch(() => {});
        }
    } catch (error) {
        console.error("[TICKET INTERACTIONS ERROR]", error);
        await reply(interaction, "صار خطأ أثناء تنفيذ العملية.");
    }
});
