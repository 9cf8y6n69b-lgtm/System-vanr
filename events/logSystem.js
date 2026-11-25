const client = require("../index");
const { MessageEmbed } = require("discord.js");
const db = require("pro.db");
const LOG_TYPES = require(`${process.cwd()}/Extras/logTypes`);

const TYPE_MAP = Object.fromEntries(LOG_TYPES.map((t) => [t.key, t]));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cfgOf = (gid) => {
    const c = db.get(`lg_cfg_${gid}`) || {};
    return { types: c.types || {}, prisonRole: c.prisonRole || null };
};
const short = (s, n = 1000) => {
    s = String(s === undefined || s === null ? "" : s);
    return s.length > n ? s.slice(0, n - 3) + "..." : s;
};
const { renderVoiceCard } = require("../utils/voiceCard");
const Cards = require("../utils/logCards");
const card = (type, channel, actor, fromChannel, note) =>
    channel && actor ? renderVoiceCard({ type, channel, actor, fromChannel, note }).catch(() => null) : null;
const unix = (ms) => Math.floor(ms / 1000);

const CH_TYPES = {
    GUILD_TEXT: "💬 كتابي",
    GUILD_VOICE: "🔊 صوتي",
    GUILD_CATEGORY: "📁 كاتيغوري",
    GUILD_NEWS: "📢 إعلانات",
    GUILD_STAGE_VOICE: "🎤 ستيج",
    GUILD_FORUM: "🗂 منتدى",
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// أدوات مساعدة
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// يرجّع الروم المخصص لنوع اللوق (أو null لو غير مفعّل)
function getChannel(guild, key) {
    const id = cfgOf(guild.id).types[key];
    if (!id) return null;
    const ch = guild.channels.cache.get(id);
    if (!ch || !ch.isText()) return null;
    if (guild.me && !ch.permissionsFor(guild.me).has(["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"])) return null;
    return ch;
}

// ───── كروت تلقائية لباقي اللوقات ─────
const AUTO_CARD = new Set(["memberJoin", "memberLeave", "kick", "banAdd", "banRemove", "timeout", "untimeout", "prisonAdd", "prisonRemove", "roleAdd", "roleRemove", "channelCreate", "channelUpdate", "channelDelete", "emojiCreate", "emojiDelete", "warn", "voiceState", "roleCreate", "roleDelete", "roleUpdate", "permUpdate", "guildUpdate", "inviteCreate", "inviteDelete", "cmdAll", "filterHit"]);

// يحول المنشنات لأسماء ويشيل الإيموجي (الكرت صورة)
const plain = (guild, text) =>
    String(text === undefined || text === null ? "" : text)
        .replace(/<@!?(\d+)>/g, (_, id) => (guild.members.cache.get(id) || client.users.cache.get(id) || {}).displayName || (client.users.cache.get(id) || {}).username || "عضو")
        .replace(/<@&(\d+)>/g, (_, id) => `@${(guild.roles.cache.get(id) || {}).name || "رول"}`)
        .replace(/<#(\d+)>/g, (_, id) => `#${(guild.channels.cache.get(id) || {}).name || "روم"}`)
        .replace(/<t:(\d+)(?::\w)?>/g, (_, n) => {
            const ms = Number(n) * 1000, diff = Math.max(0, Date.now() - ms), d = Math.floor(diff / 864e5);
            const age = d >= 365 ? `${Math.floor(d / 365)} سنة و${Math.floor((d % 365) / 30)} شهر` : d >= 30 ? `${Math.floor(d / 30)} شهر و${d % 30} يوم` : d >= 1 ? `${d} يوم` : `${Math.floor(diff / 36e5)} ساعة`;
            return `${new Date(ms).toLocaleString("ar-SA", { timeZone: "Asia/Riyadh", hour12: true })} (${Math.sign(Date.now() - ms) >= 0 ? "قبل" : "بعد"} ${age})`;
        })
        .replace(/<a?:\w+:\d+>/g, "")
        .replace(/\p{Extended_Pictographic}\uFE0F?/gu, "")
        .replace(/\[(.*?)\]\(.*?\)/g, "$1")
        .replace(/\s+/g, " ").trim();

async function autoCard(guild, key, data) {
    const t = TYPE_MAP[key];
    const user = data.user || client.user;
    const rows = (data.fields || []).filter(f => f && f.value).map(f => [plain(guild, f.name).replace(/^[:\s]+/, ""), plain(guild, f.value)]);
    if (data.description) rows.unshift(["التفاصيل", plain(guild, data.description)]);

    return Cards.renderEventCard({
        user,
        name: user.displayName || user.username || guild.name,
        label: t.label,
        color: t.color,
        rows,
        rightLines: [new Date().toLocaleString("ar-SA", { timeZone: "Asia/Riyadh", hour12: true })]
    }).catch(error => { console.error("[LOG card]", key, error.message); return null; });
}

// يرسل لوق. data: { description, fields: [{name, value, inline}], user, image }
async function sendLog(guild, key, data = {}) {
    const ch = getChannel(guild, key);
    const t = TYPE_MAP[key];
    if (!ch || !t) return;

    if (!data.file && (AUTO_CARD.has(key) || key.startsWith("cmd")) && ch.permissionsFor(guild.me).has("ATTACH_FILES")) {
        data = { ...data, file: await autoCard(guild, key, data) };
    }

    const embed = new MessageEmbed().setColor(t.color).setTitle(`${t.emoji} ${t.label}`);
    if (data.description) embed.setDescription(short(data.description, 3500));
    const fields = (data.fields || [])
        .filter((f) => f && f.value)
        .map((f) => ({ name: f.name, value: short(f.value, 1000) || "—", inline: f.inline !== false }));
    if (fields.length) embed.addFields(fields.slice(0, 25));
    if (data.user) embed.setThumbnail(data.user.displayAvatarURL({ dynamic: true }));
    const files = [];
    if (data.file && ch.permissionsFor(guild.me).has("ATTACH_FILES")) {
        files.push({ attachment: data.file, name: "voki-log.png" });
        embed.setImage("attachment://voki-log.png");
    } else if (data.image) embed.setImage(data.image);
    embed.setFooter(`Voki • ${guild.name}`, guild.iconURL({ dynamic: true }) || undefined).setTimestamp();

    return ch.send({ embeds: [embed], files }).catch(() => {});
}
// نخليها متاحة لأوامرك (بلاك ليست، سجن...): client.sendLog(guild, "blacklistAdd", {...})
client.sendLog = sendLog;

// يدور في الأوديت لوق على آخر عملية مطابقة (يحتاج صلاحية View Audit Log)
async function findAudit(guild, { type, targetId, actions, maxAge = 7000, test } = {}) {
    try {
        if (!guild.me || !guild.me.permissions.has("VIEW_AUDIT_LOG")) return null;
        await sleep(1000);
        const logs = await guild.fetchAuditLogs({ ...(type ? { type } : {}), limit: 10 });
        return (
            logs.entries.find(
                (e) =>
                    Date.now() - e.createdTimestamp < maxAge &&
                    (!targetId || (e.target && e.target.id === targetId)) &&
                    (!actions || actions.includes(e.action)) &&
                    (!test || test(e))
            ) || null
        );
    } catch {
        return null;
    }
}

const execField = (entry) => ({
    name: "👮 بواسطة",
    value: entry && entry.executor ? `${entry.executor} (${entry.executor.tag}) • ${entry.executor.id}` : "غير معروف",
    inline: true,
});
const reasonField = (entry) => (entry && entry.reason ? { name: "📝 السبب", value: entry.reason, inline: false } : null);
const userField = (user, member) => ({ name: "👤 العضو", value: `${member || user} (${user.tag}) • ${user.id}`, inline: true });
const guard = (name, fn) => async (...args) => {
    try {
        await fn(...args);
    } catch (e) {
        console.error(`[LOG ${name}]`, e.message);
    }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// الرسائل
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
client.on("messageDelete", guard("messageDelete", async (message) => {
    if (!message.guild || (message.author && message.author.bot)) return;
    const guild = message.guild;
    const chImg = getChannel(guild, "imageDelete");
    const chMsg = getChannel(guild, "messageDelete");
    if (!chImg && !chMsg) return;

    const atts = message.attachments ? [...message.attachments.values()] : [];
    const images = atts.filter((a) => (a.contentType || "").startsWith("image/") || /\.(png|jpe?g|gif|webp)$/i.test(a.name || a.url || ""));

    let entry = null;
    if (message.author) {
        entry = await findAudit(guild, {
            type: "MESSAGE_DELETE",
            targetId: message.author.id,
            maxAge: 5000,
            test: (e) => e.extra && e.extra.channel && e.extra.channel.id === message.channel.id,
        });
    }

    const content = message.content ? short(message.content, 1000) : null;
    const base = [
        { name: "👤 الكاتب", value: message.author ? `${message.author} (${message.author.tag})` : "غير معروف (رسالة قديمة)", inline: true },
        { name: "📍 الروم", value: `${message.channel}`, inline: true },
        { name: "👮 حُذفت بواسطة", value: entry ? `${entry.executor}` : "الكاتب نفسه أو غير معروف", inline: true },
    ];

    if (images.length && chImg) {
        for (const img of images.slice(0, 3)) {
            await sendLog(guild, "imageDelete", {
                user: message.author,
                fields: [...base, content ? { name: "💬 النص", value: content, inline: false } : null],
                image: img.proxyURL || img.url,
            });
        }
    }
    if (chMsg && !(images.length && chImg && chImg.id === chMsg.id)) {
        let file = null;
        try {
            file = await Cards.renderDeleteCard({
                author: message.author,
                authorName: message.member ? message.member.displayName : message.author ? message.author.username : "غير معروف",
                channelName: message.channel.name || "-",
                content: message.content || "",
                deletedBy: entry ? (entry.executor.username || entry.executor.tag) : null,
                attachmentNames: atts.map(a => a.name || "file"),
                imageUrl: images[0] ? (images[0].proxyURL || images[0].url) : null
            });
        } catch (error) {
            console.error("[LOG deleteCard]", error.message);
        }

        await sendLog(guild, "messageDelete", {
            user: message.author,
            file,
            fields: [...base, { name: "💬 المحتوى", value: content || (atts.length ? "(ملف/مرفق بدون نص)" : "غير متوفر"), inline: false }],
        });
    }
}));

client.on("messageUpdate", guard("messageUpdate", async (oldM, newM) => {
    if (!newM.guild || (newM.author && newM.author.bot)) return;
    if (!getChannel(newM.guild, "messageUpdate")) return;
    if (newM.partial) await newM.fetch().catch(() => {});
    if (!oldM.partial && oldM.content === newM.content) return;

    const file = newM.author && getChannel(newM.guild, "messageUpdate") && !oldM.partial
        ? await Cards.renderEditCard({ author: newM.author, authorName: newM.member?.displayName || newM.author.username, channelName: newM.channel.name, before: oldM.content, after: newM.content }).catch(() => null)
        : null;

    await sendLog(newM.guild, "messageUpdate", {
        user: newM.author,
        file,
        description: `[الانتقال للرسالة](${newM.url})`,
        fields: [
            { name: "👤 الكاتب", value: newM.author ? `${newM.author} (${newM.author.tag})` : "غير معروف", inline: true },
            { name: "📍 الروم", value: `${newM.channel}`, inline: true },
            { name: "📜 قبل", value: oldM.partial ? "غير متوفر (رسالة قديمة)" : oldM.content || "—", inline: false },
            { name: "📝 بعد", value: newM.content || "—", inline: false },
        ],
    });
}));

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// الإيموجي
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
client.on("emojiCreate", guard("emojiCreate", async (emoji) => {
    if (!getChannel(emoji.guild, "emojiCreate")) return;
    const entry = await findAudit(emoji.guild, { type: "EMOJI_CREATE", targetId: emoji.id, maxAge: 8000 });
    await sendLog(emoji.guild, "emojiCreate", {
        description: `${emoji} \`:${emoji.name}:\``,
        image: emoji.url,
        fields: [execField(entry)],
    });
}));

client.on("emojiDelete", guard("emojiDelete", async (emoji) => {
    if (!getChannel(emoji.guild, "emojiDelete")) return;
    const entry = await findAudit(emoji.guild, { type: "EMOJI_DELETE", targetId: emoji.id, maxAge: 8000 });
    await sendLog(emoji.guild, "emojiDelete", {
        description: `\`:${emoji.name}:\``,
        image: emoji.url,
        fields: [execField(entry)],
    });
}));

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// الرومات
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const isTicket = (c) => (c.name || "").startsWith("🎫");

client.on("channelCreate", guard("channelCreate", async (channel) => {
    if (!channel.guild || isTicket(channel)) return;
    if (!getChannel(channel.guild, "channelCreate")) return;
    const entry = await findAudit(channel.guild, { type: "CHANNEL_CREATE", targetId: channel.id, maxAge: 8000 });
    await sendLog(channel.guild, "channelCreate", {
        fields: [
            { name: "📛 الروم", value: `${channel} (\`${channel.name}\`)`, inline: true },
            { name: "📂 النوع", value: CH_TYPES[channel.type] || channel.type, inline: true },
            { name: "📁 الكاتيغوري", value: channel.parent ? channel.parent.name : "—", inline: true },
            execField(entry),
        ],
    });
}));

client.on("channelDelete", guard("channelDelete", async (channel) => {
    if (!channel.guild || isTicket(channel)) return;
    if (!getChannel(channel.guild, "channelDelete")) return;
    const entry = await findAudit(channel.guild, { type: "CHANNEL_DELETE", targetId: channel.id, maxAge: 8000 });
    await sendLog(channel.guild, "channelDelete", {
        fields: [
            { name: "📛 الروم", value: `\`${channel.name}\``, inline: true },
            { name: "📂 النوع", value: CH_TYPES[channel.type] || channel.type, inline: true },
            { name: "📁 الكاتيغوري", value: channel.parent ? channel.parent.name : "—", inline: true },
            execField(entry),
        ],
    });
}));

client.on("channelUpdate", guard("channelUpdate", async (oldC, newC) => {
    if (!newC.guild || isTicket(newC)) return;
    if (!getChannel(newC.guild, "channelUpdate")) return;

    const diffs = [];
    if (oldC.name !== newC.name) diffs.push({ name: "📛 الاسم", value: `${oldC.name} ← ${newC.name}`, inline: false });
    if (oldC.topic !== newC.topic) diffs.push({ name: "📝 الوصف", value: `${oldC.topic || "—"} ← ${newC.topic || "—"}`, inline: false });
    if (oldC.nsfw !== newC.nsfw) diffs.push({ name: "🔞 NSFW", value: `${oldC.nsfw ? "نعم" : "لا"} ← ${newC.nsfw ? "نعم" : "لا"}`, inline: true });
    if (oldC.rateLimitPerUser !== newC.rateLimitPerUser) diffs.push({ name: "🐢 السلو مود", value: `${oldC.rateLimitPerUser || 0}ث ← ${newC.rateLimitPerUser || 0}ث`, inline: true });
    if (oldC.parentId !== newC.parentId) diffs.push({ name: "📁 الكاتيغوري", value: `${oldC.parent ? oldC.parent.name : "—"} ← ${newC.parent ? newC.parent.name : "—"}`, inline: false });
    if (oldC.bitrate !== newC.bitrate) diffs.push({ name: "🎚 البتريت", value: `${oldC.bitrate} ← ${newC.bitrate}`, inline: true });
    if (oldC.userLimit !== newC.userLimit) diffs.push({ name: "👥 حد الأعضاء", value: `${oldC.userLimit} ← ${newC.userLimit}`, inline: true });

    const sig = (c) =>
        JSON.stringify(
            [...c.permissionOverwrites.cache.values()]
                .map((o) => [o.id, o.allow.bitfield.toString(), o.deny.bitfield.toString()])
                .sort()
        );
    if (sig(oldC) !== sig(newC)) {
        diffs.push({ name: "🔐 الصلاحيات", value: "تم تعديل صلاحيات الروم", inline: false });
        permDiffLog(oldC, newC).catch(() => {});
    }

    if (!diffs.length) return;
    const entry = await findAudit(newC.guild, {
        targetId: newC.id,
        maxAge: 8000,
        actions: ["CHANNEL_UPDATE", "CHANNEL_OVERWRITE_UPDATE", "CHANNEL_OVERWRITE_CREATE", "CHANNEL_OVERWRITE_DELETE"],
    });
    await sendLog(newC.guild, "channelUpdate", {
        description: `${newC} (\`${newC.name}\`)`,
        fields: [...diffs, execField(entry)],
    });
}));

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// الباند
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
client.on("guildBanAdd", guard("banAdd", async (ban) => {
    if (ban.partial) ban = await ban.fetch().catch(() => ban);
    const guild = ban.guild;
    if (!getChannel(guild, "banAdd")) return;
    const entry = await findAudit(guild, { type: "MEMBER_BAN_ADD", targetId: ban.user.id, maxAge: 8000 });
    await sendLog(guild, "banAdd", {
        user: ban.user,
        fields: [userField(ban.user), { name: "🆔 الآيدي", value: ban.user.id, inline: true }, execField(entry), { name: "📝 السبب", value: ban.reason || (entry && entry.reason) || "بدون سبب", inline: false }],
    });
}));

client.on("guildBanRemove", guard("banRemove", async (ban) => {
    const guild = ban.guild;
    if (!getChannel(guild, "banRemove")) return;
    const entry = await findAudit(guild, { type: "MEMBER_BAN_REMOVE", targetId: ban.user.id, maxAge: 8000 });
    await sendLog(guild, "banRemove", {
        user: ban.user,
        fields: [userField(ban.user), { name: "🆔 الآيدي", value: ban.user.id, inline: true }, execField(entry)],
    });
}));

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// تحديث العضو: تايم أوت + رولات + سجن
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
client.on("guildMemberUpdate", guard("memberUpdate", async (oldM, newM) => {
    if (oldM.partial) return;
    const guild = newM.guild;
    const user = newM.user;
    const cfg = cfgOf(guild.id);

    // تايم أوت
    const oldT = oldM.communicationDisabledUntilTimestamp;
    const newT = newM.communicationDisabledUntilTimestamp;
    if (oldT !== newT) {
        if (newT && newT > Date.now() && getChannel(guild, "timeout")) {
            const entry = await findAudit(guild, { type: "MEMBER_UPDATE", targetId: newM.id, maxAge: 8000 });
            await sendLog(guild, "timeout", {
                user,
                fields: [userField(user, newM), execField(entry), { name: "⏳ ينتهي", value: `<t:${unix(newT)}:R>`, inline: true }, reasonField(entry)],
            });
        } else if ((!newT || newT <= Date.now()) && oldT && oldT > Date.now() && getChannel(guild, "untimeout")) {
            const entry = await findAudit(guild, { type: "MEMBER_UPDATE", targetId: newM.id, maxAge: 8000 });
            await sendLog(guild, "untimeout", { user, fields: [userField(user, newM), execField(entry)] });
        }
    }

    // الرولات
    const added = newM.roles.cache.filter((r) => !oldM.roles.cache.has(r.id));
    const removed = oldM.roles.cache.filter((r) => !newM.roles.cache.has(r.id));
    if (!added.size && !removed.size) return;

    const wantAdd = added.size && getChannel(guild, "roleAdd");
    const wantRem = removed.size && getChannel(guild, "roleRemove");
    const prisonIn = cfg.prisonRole && added.has(cfg.prisonRole) && getChannel(guild, "prisonAdd");
    const prisonOut = cfg.prisonRole && removed.has(cfg.prisonRole) && getChannel(guild, "prisonRemove");
    if (!wantAdd && !wantRem && !prisonIn && !prisonOut) return;

    const entry = await findAudit(guild, { type: "MEMBER_ROLE_UPDATE", targetId: newM.id, maxAge: 8000 });
    const prev = oldM.roles.cache.filter((r) => r.id !== guild.id).map((r) => `${r}`).join(" ") || "—";
    const base = [userField(user, newM), execField(entry), { name: "📜 رولاته السابقة", value: prev, inline: false }];

    if (wantAdd) await sendLog(guild, "roleAdd", { user, fields: [...base, { name: "🏷 الرولات", value: added.map((r) => `${r}`).join(" "), inline: false }] });
    if (wantRem) await sendLog(guild, "roleRemove", { user, fields: [...base, { name: "🏷 الرولات", value: removed.map((r) => `${r}`).join(" "), inline: false }] });
    if (prisonIn) await sendLog(guild, "prisonAdd", { user, fields: base });
    if (prisonOut) await sendLog(guild, "prisonRemove", { user, fields: base });
}));

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// دخول / خروج / طرد
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
client.on("guildMemberAdd", guard("memberJoin", async (member) => {
    await sendLog(member.guild, "memberJoin", {
        user: member.user,
        fields: [
            userField(member.user, member),
            { name: "🆔 الآيدي", value: member.id, inline: true },
            { name: "📅 إنشاء الحساب", value: `<t:${unix(member.user.createdTimestamp)}:R>`, inline: true },
            { name: "👥 عدد الأعضاء", value: String(member.guild.memberCount), inline: true },
        ],
    });
}));

client.on("guildMemberRemove", guard("memberRemove", async (member) => {
    const guild = member.guild;
    const wantKick = getChannel(guild, "kick");
    const wantLeave = getChannel(guild, "memberLeave");
    if (!wantKick && !wantLeave) return;

    const entry = await findAudit(guild, { targetId: member.id, maxAge: 8000, actions: ["MEMBER_KICK", "MEMBER_BAN_ADD"] });
    if (entry && entry.action === "MEMBER_BAN_ADD") return; // يتسجل في لوق الباند
    if (entry) {
        await sendLog(guild, "kick", {
            user: member.user,
            fields: [userField(member.user), { name: "🆔 الآيدي", value: member.id, inline: true }, execField(entry), reasonField(entry)],
        });
        return;
    }
    const roles = member.roles ? member.roles.cache.filter((r) => r.id !== guild.id).map((r) => `${r}`).join(" ") : "";
    await sendLog(guild, "memberLeave", {
        user: member.user,
        fields: [
            userField(member.user),
            { name: "🆔 الآيدي", value: member.id, inline: true },
            member.joinedTimestamp ? { name: "📥 دخل", value: `<t:${unix(member.joinedTimestamp)}:R>`, inline: true } : null,
            roles ? { name: "🏷 الرولات", value: roles, inline: false } : null,
        ],
    });
}));

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// الصوت
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
client.on("voiceStateUpdate", guard("voice", async (oldS, newS) => {
    const guild = newS.guild;
    const member = newS.member || oldS.member;
    if (!member) return;
    const user = member.user;
    const who = userField(user, member);
    const oldId = oldS.channelId;
    const newId = newS.channelId;

    if (!oldId && newId) {
        return sendLog(guild, "voiceJoin", { user, file: getChannel(guild, "voiceJoin") && await card("join", newS.channel, member), fields: [who, { name: "🔊 الروم", value: `${newS.channel}`, inline: true }] });
    }
    if (oldId && !newId) {
        return sendLog(guild, "voiceLeave", { user, file: getChannel(guild, "voiceLeave") && await card("leave", oldS.channel, member), fields: [who, { name: "🔇 الروم", value: `${oldS.channel}`, inline: true }] });
    }

    // تبديل روم (أو سحب عضو)
    if (oldId && newId && oldId !== newId) {
        let pulled = null;
        if (getChannel(guild, "voicePull")) {
            pulled = await findAudit(guild, {
                type: "MEMBER_MOVE",
                maxAge: 6000,
                test: (e) => e.executor && e.executor.id !== member.id && e.extra && e.extra.channel && e.extra.channel.id === newId,
            });
        }
        const route = [
            { name: "📤 من", value: `${oldS.channel}`, inline: true },
            { name: "📥 إلى", value: `${newS.channel}`, inline: true },
        ];
        if (pulled) return sendLog(guild, "voicePull", { user, file: await Cards.renderMoveCard({ member, from: oldS.channel, to: newS.channel, pulledBy: pulled.executor }).catch(() => null), fields: [who, ...route, execField(pulled)] });
        return sendLog(guild, "voiceMove", { user, file: getChannel(guild, "voiceMove") && await Cards.renderMoveCard({ member, from: oldS.channel, to: newS.channel }).catch(() => null), fields: [who, ...route] });
    }

    // نفس الروم: تغيّر حالة
    if (oldId && newId && oldId === newId) {
        if (oldS.serverMute !== newS.serverMute && getChannel(guild, "voiceMute")) {
            const entry = await findAudit(guild, { type: "MEMBER_UPDATE", targetId: member.id, maxAge: 8000 });
            await sendLog(guild, "voiceMute", {
                user,
                file: await card(newS.serverMute ? "mute" : "unmute", newS.channel, member, null, entry && entry.executor ? `بواسطة: ${entry.executor.username}` : undefined),
                description: newS.serverMute ? "تم إعطاء العضو **ميوت صوتي**" : "تم فك **الميوت الصوتي** عن العضو",
                fields: [who, { name: "🔊 الروم", value: `${newS.channel}`, inline: true }, execField(entry)],
            });
        }

        const lines = [];
        if (oldS.serverDeaf !== newS.serverDeaf) lines.push(newS.serverDeaf ? "🔇 تم تصميمه من الإدارة" : "🔊 فُك التصميم عنه");
        if (oldS.selfMute !== newS.selfMute) lines.push(newS.selfMute ? "🎙 كتم الميك" : "🎙 فتح الميك");
        if (oldS.selfDeaf !== newS.selfDeaf) lines.push(newS.selfDeaf ? "🎧 سمّع نفسه (ديفن)" : "🎧 فك الديفن");
        if (oldS.streaming !== newS.streaming) lines.push(newS.streaming ? "🔴 بدأ بث" : "⚪ أوقف البث");
        if (oldS.selfVideo !== newS.selfVideo) lines.push(newS.selfVideo ? "📷 فتح الكاميرا" : "📷 قفل الكاميرا");
        if (lines.length) {
            const muteChanged = oldS.selfMute !== newS.selfMute;
            const deafChanged = oldS.selfDeaf !== newS.selfDeaf || oldS.serverDeaf !== newS.serverDeaf;
            const deafOn = newS.selfDeaf || newS.serverDeaf;
            await sendLog(guild, "voiceState", {
                user,
                file: deafChanged ? await card(deafOn ? "deaf" : "undeaf", newS.channel, member, null, "ديفن") : muteChanged ? await card(newS.selfMute ? "mute" : "unmute", newS.channel, member, null, "ميوت ذاتي") : null,
                description: lines.join("\n"),
                fields: [who, { name: "🔊 الروم", value: `${newS.channel}`, inline: true }],
            });
        }
    }
}));

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// قوائم اختيار اللوقات (من /log set و /log disable)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
client.on("interactionCreate", async (interaction) => {
    try {
        if (!interaction.guild || !interaction.isSelectMenu()) return;
        const id = interaction.customId || "";
        if (!id.startsWith("lg_pick") && !id.startsWith("lg_off")) return;

        if (!interaction.member.permissions.has("ADMINISTRATOR")) {
            return interaction.reply({ content: "**❌ للإدارة فقط**", ephemeral: true });
        }

        const [head, arg] = id.split(":");
        const cfg = cfgOf(interaction.guild.id);
        const picked = interaction.values.filter((v) => TYPE_MAP[v]);
        const list = picked.map((v) => `${TYPE_MAP[v].emoji} ${TYPE_MAP[v].label}`).join("\n");
        let embed;

        if (head.startsWith("lg_pick")) {
            picked.forEach((v) => (cfg.types[v] = arg));
            embed = new MessageEmbed().setColor("#2ecc71").setTitle("✅ تم الحفظ").setDescription(`راحت هذي اللوقات إلى <#${arg}>:\n${list}\n\nتقدر تكمل اختيار من القوائم.`);
        } else {
            picked.forEach((v) => delete cfg.types[v]);
            embed = new MessageEmbed().setColor("#e67e22").setTitle("🛑 تم الإيقاف").setDescription(`تم إيقاف:\n${list}`);
        }
        db.set(`lg_cfg_${interaction.guild.id}`, cfg);

        await interaction.update({ embeds: [embed], components: interaction.message.components });
    } catch (e) {
        console.error("[LOG picker]", e.message);
    }
});


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// لوق الأوامر: كل أمر يتنفذ يتسجل بكرت (حسب قسمه)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const CMD_LOG = { Admin: "cmdAdmin", Owners: "cmdOwners", Roles: "cmdRoles", Channels: "cmdChannels", Protection: "cmdProtection", Security: "cmdSecurity", Tickets: "cmdTickets", Voice: "cmdVoice" };
const SECRET = /token|توكن|password|pass|mongo/i;

const NO_ALL = new Set(["General", "XP", "Tweets", "avatars"]);

client.logCommand = async (guild, member, channel, command, args = [], viaSlash = false) => {
    try {
        if (!guild || !member) return;
        const key = CMD_LOG[command.directory];
        const wantAll = !NO_ALL.has(command.directory) && getChannel(guild, "cmdAll");
        const wantDir = key && getChannel(guild, key);
        if (!wantAll && !wantDir) return;

        const shown = SECRET.test(command.name) ? "(مخفي)" : plain(guild, args.join(" ")).slice(0, 300) || "—";
        const target = (args.map(a => String(a).match(/\d{15,}/)).find(Boolean) || [])[0];
        const targetMember = target && guild.members.cache.get(target);

        const data = {
            user: member.user,
            fields: [
                { name: "الأمر", value: `${viaSlash ? "/" : ""}${command.name}`, inline: true },
                { name: "المنفذ", value: `${member} (${member.user.tag}) • ${member.id}`, inline: true },
                { name: "الروم", value: `${channel}`, inline: true },
                targetMember ? { name: "الهدف", value: `${targetMember} (${targetMember.user.tag}) • ${targetMember.id}`, inline: true } : null,
                { name: "الوسائط", value: shown, inline: false }
            ].filter(Boolean)
        };

        if (wantDir) await sendLog(guild, key, data);
        if (wantAll) await sendLog(guild, "cmdAll", data);
    } catch (error) {
        console.error("[LOG cmd]", error.message);
    }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// الرتب: إنشاء / حذف / تعديل
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const { Permissions } = require("discord.js");

const roleInfo = (role) => [
    { name: "🏷 الرتبة", value: `${role.name} • ${role.id}`, inline: true },
    { name: "🎨 اللون", value: role.hexColor, inline: true },
];

client.on("roleCreate", guard("roleCreate", async (role) => {
    if (!getChannel(role.guild, "roleCreate")) return;
    const entry = await findAudit(role.guild, { type: "ROLE_CREATE", targetId: role.id, maxAge: 8000 });
    await sendLog(role.guild, "roleCreate", { user: entry && entry.executor, fields: [...roleInfo(role), execField(entry)] });
}));

client.on("roleDelete", guard("roleDelete", async (role) => {
    if (!getChannel(role.guild, "roleDelete")) return;
    const entry = await findAudit(role.guild, { type: "ROLE_DELETE", targetId: role.id, maxAge: 8000 });
    await sendLog(role.guild, "roleDelete", { user: entry && entry.executor, fields: [...roleInfo(role), execField(entry)] });
}));

client.on("roleUpdate", guard("roleUpdate", async (oldR, newR) => {
    if (!getChannel(newR.guild, "roleUpdate")) return;
    const diffs = [];
    if (oldR.name !== newR.name) diffs.push({ name: "الاسم", value: `${oldR.name} ← ${newR.name}`, inline: false });
    if (oldR.color !== newR.color) diffs.push({ name: "اللون", value: `${oldR.hexColor} ← ${newR.hexColor}`, inline: true });
    if (oldR.hoist !== newR.hoist) diffs.push({ name: "عرض منفصل", value: `${oldR.hoist ? "نعم" : "لا"} ← ${newR.hoist ? "نعم" : "لا"}`, inline: true });
    if (oldR.mentionable !== newR.mentionable) diffs.push({ name: "قابلة للمنشن", value: `${oldR.mentionable ? "نعم" : "لا"} ← ${newR.mentionable ? "نعم" : "لا"}`, inline: true });
    if (!oldR.permissions.equals(newR.permissions)) {
        const a = oldR.permissions.toArray(), b = newR.permissions.toArray();
        const plus = b.filter((x) => !a.includes(x)), minus = a.filter((x) => !b.includes(x));
        diffs.push({ name: "الصلاحيات", value: [plus.length ? `+ ${plus.join(", ")}` : "", minus.length ? `- ${minus.join(", ")}` : ""].filter(Boolean).join("\n"), inline: false });
    }
    if (!diffs.length) return;
    const entry = await findAudit(newR.guild, { type: "ROLE_UPDATE", targetId: newR.id, maxAge: 8000 });
    await sendLog(newR.guild, "roleUpdate", { user: entry && entry.executor, fields: [...roleInfo(newR), ...diffs, execField(entry)] });
}));

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// صلاحيات الروم: قبل / بعد
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function permDiffLog(oldC, newC) {
    const guild = newC.guild;
    if (!getChannel(guild, "permUpdate")) return;

    const state = (o, flag) => (!o ? "—" : o.allow.has(flag) ? "✅" : o.deny.has(flag) ? "❌" : "—");
    const lines = [];
    const ids = new Set([...oldC.permissionOverwrites.cache.keys(), ...newC.permissionOverwrites.cache.keys()]);

    for (const id of ids) {
        const o = oldC.permissionOverwrites.cache.get(id), n = newC.permissionOverwrites.cache.get(id);
        const name = guild.roles.cache.get(id) ? `@${guild.roles.cache.get(id).name}` : (guild.members.cache.get(id) || {}).displayName || id;
        for (const flag of Object.keys(Permissions.FLAGS)) {
            const a = state(o, flag), b = state(n, flag);
            if (a !== b) lines.push(`${name} • ${flag}: ${a} ← ${b}`);
        }
        if (!o) lines.unshift(`${name}: أُضيف`);
        if (!n) lines.unshift(`${name}: أُزيل`);
    }
    if (!lines.length) return;

    const entry = await findAudit(guild, { targetId: newC.id, maxAge: 8000, actions: ["CHANNEL_OVERWRITE_UPDATE", "CHANNEL_OVERWRITE_CREATE", "CHANNEL_OVERWRITE_DELETE", "CHANNEL_UPDATE"] });
    await sendLog(guild, "permUpdate", {
        user: entry && entry.executor,
        fields: [
            { name: "📛 الروم", value: `${newC} • ${newC.id}`, inline: true },
            execField(entry),
            { name: "🔐 قبل ← بعد", value: lines.slice(0, 14).join("\n"), inline: false },
        ],
    });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// السيرفر + الدعوات
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
client.on("guildUpdate", guard("guildUpdate", async (oldG, newG) => {
    if (!getChannel(newG, "guildUpdate")) return;
    const diffs = [];
    if (oldG.name !== newG.name) diffs.push({ name: "الاسم", value: `${oldG.name} ← ${newG.name}`, inline: false });
    if (oldG.icon !== newG.icon) diffs.push({ name: "الصورة", value: "تم تغيير صورة السيرفر", inline: true });
    if (oldG.banner !== newG.banner) diffs.push({ name: "البنر", value: "تم تغيير البنر", inline: true });
    if (oldG.vanityURLCode !== newG.vanityURLCode) diffs.push({ name: "الرابط المخصص", value: `${oldG.vanityURLCode || "—"} ← ${newG.vanityURLCode || "—"}`, inline: false });
    if (oldG.verificationLevel !== newG.verificationLevel) diffs.push({ name: "مستوى التحقق", value: `${oldG.verificationLevel} ← ${newG.verificationLevel}`, inline: true });
    if (!diffs.length) return;
    const entry = await findAudit(newG, { type: "GUILD_UPDATE", maxAge: 8000 });
    await sendLog(newG, "guildUpdate", { user: entry && entry.executor, image: newG.iconURL({ dynamic: true, size: 512 }), fields: [...diffs, execField(entry)] });
}));

client.on("inviteCreate", guard("inviteCreate", async (invite) => {
    if (!invite.guild || !getChannel(invite.guild, "inviteCreate")) return;
    await sendLog(invite.guild, "inviteCreate", {
        user: invite.inviter,
        fields: [
            { name: "🔗 الرابط", value: `discord.gg/${invite.code}`, inline: true },
            { name: "👤 أنشأه", value: invite.inviter ? `${invite.inviter} (${invite.inviter.tag}) • ${invite.inviter.id}` : "غير معروف", inline: true },
            { name: "📍 الروم", value: `${invite.channel}`, inline: true },
            { name: "⏳ المدة", value: invite.maxAge ? `${Math.round(invite.maxAge / 3600)} ساعة` : "دائم", inline: true },
            { name: "🔢 الاستخدامات", value: invite.maxUses ? String(invite.maxUses) : "بلا حد", inline: true },
        ],
    });
}));

client.on("inviteDelete", guard("inviteDelete", async (invite) => {
    if (!invite.guild || !getChannel(invite.guild, "inviteDelete")) return;
    const entry = await findAudit(invite.guild, { type: "INVITE_DELETE", maxAge: 8000 });
    await sendLog(invite.guild, "inviteDelete", {
        user: entry && entry.executor,
        fields: [{ name: "🔗 الرابط", value: `discord.gg/${invite.code}`, inline: true }, execField(entry)],
    });
}));
