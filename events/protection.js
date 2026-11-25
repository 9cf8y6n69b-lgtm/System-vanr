// ═══════════════════════════════════════════════
//  Vanr • محرك الحماية
//  (الأوامر كانت تحفظ الإعدادات فقط وما فيه كود ينفذها — هذا الملف ينفذها)
//
//  حماية عادية : تتراجع عن العملية وتعاقب المنفّذ فوراً (إلا المستثنين wanti)
//  متقدمة maxsec: تحسب أكشنز الكل (حتى wanti) وتعاقب لو تجاوز الحد خلال المدة
//  قصوى sechard : كل الحمايات شغالة + العقاب باند + wanti ما تنفع (aprot فقط)
// ═══════════════════════════════════════════════
const client = require("../index");
const Pro = require("pro.db");
const P = require("../utils/protection");
const { getOrCreateRole } = require("../utils/punishmentSystem");

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const warnedPerms = new Set();

// ───────────── أدوات ─────────────

// يلقى من سوّى العملية من سجل التدقيق
async function findEntry(guild, type, targetId, maxAge = 10000) {
    if (!guild.me || !guild.me.permissions.has("VIEW_AUDIT_LOG")) {
        if (!warnedPerms.has(guild.id)) {
            warnedPerms.add(guild.id);
            P.logSecurity(guild, "⚠️ البوت ما عنده صلاحية **View Audit Log**، الحماية ما تقدر تعرف المنفّذ.", "#f1c40f");
        }
        return null;
    }

    for (let attempt = 0; attempt < 3; attempt++) {
        const logs = await guild.fetchAuditLogs({ type, limit: 8 }).catch(() => null);

        if (logs) {
            const entry = logs.entries.find(item =>
                Date.now() - item.createdTimestamp < maxAge &&
                (!targetId || (item.target && item.target.id === targetId))
            );

            if (entry) return entry;
        }

        await sleep(800);
    }

    return null;
}

// يقرر: هل العملية مخالفة؟  (null = مسموح)
function judge(guild, userId, feature, action) {
    const g = guild.id;

    if (!userId || userId === client.user.id) return null;
    if (P.isAdvancedExempt(guild, userId, client)) return null;

    const hard = P.isOn(g, "sechard");
    const featureOn = feature ? P.effective(g, feature) : false;
    const basicExempt = !hard && P.isBasicExempt(guild, userId, client);

    if (featureOn && !basicExempt) {
        return { reason: `مخالفة: ${P.FEATURES[feature].label}` };
    }

    if (P.isOn(g, "maxsec") || hard) {
        const count = P.bump(g, userId, action);
        const limit = P.getLimit(g);

        if (count > limit) {
            return { reason: `تجاوز حد الأكشنز (${count}/${limit} خلال ${P.getWindowSec(g)} ثانية)` };
        }
    }

    return null;
}

// العقاب: عادي = سحب الصلاحيات الخطيرة + تايم أوت، قصوى/بوت = باند
async function punish(guild, userId, reason) {
    const hard = P.isOn(guild.id, "sechard");
    const member = await guild.members.fetch(userId).catch(() => null);

    try {
        if (!member) {
            await guild.members.ban(userId, { reason: `Vanr: ${reason}` });
            return "تم حظره";
        }

        if (member.user.bot || hard) {
            await guild.members.ban(userId, { reason: `Vanr: ${reason}` });
            return "تم حظره";
        }

        const removable = member.roles.cache.filter(role =>
            role.id !== guild.id &&
            !role.managed &&
            role.editable &&
            role.permissions.any(P.DANGEROUS)
        );

        if (removable.size) await member.roles.remove(removable, `Vanr: ${reason}`);

        await member.timeout(60 * 60 * 1000, `Vanr: ${reason}`).catch(() => {});

        const stillDangerous = member.roles.cache.some(role =>
            role.id !== guild.id && role.permissions.any(P.DANGEROUS) && !removable.has(role.id)
        );

        return stillDangerous
            ? `سُحبت ${removable.size} رتبة، لكن عنده رتب أعلى من رتبتي (ارفع رتبة البوت)`
            : `سُحبت صلاحياته (${removable.size} رتبة) + تايم أوت ساعة`;
    } catch (error) {
        return `فشل العقاب: ${String(error.message).slice(0, 80)}`;
    }
}

async function violation(guild, userId, reason, title, details = []) {
    const result = await punish(guild, userId, reason);

    await P.logSecurity(
        guild,
        [
            `**${title}**`,
            `المنفّذ: <@${userId}> \`${userId}\``,
            `السبب: ${reason}`,
            ...details,
            `الإجراء: ${result}`
        ],
        "#e74c3c"
    );
}

const guarded = (name, fn) => async (...args) => {
    try {
        await fn(...args);
    } catch (error) {
        console.error(`[PROTECTION] ${name}:`, error);
    }
};

const watching = (guildId, feature) => P.effective(guildId, feature) || P.isOn(guildId, "maxsec");

// ═════════════════════════════════════════════
//  حماية الحذف
// ═════════════════════════════════════════════
client.on("channelDelete", guarded("channelDelete", async channel => {
    const guild = channel.guild;
    if (!guild || (channel.isThread && channel.isThread())) return;
    if (!watching(guild.id, "antidelete")) return;

    const entry = await findEntry(guild, "CHANNEL_DELETE", channel.id);
    if (!entry || !entry.executor) return;

    const verdict = judge(guild, entry.executor.id, "antidelete", "channelDelete");
    if (!verdict) return;

    let restored;

    try {
        const copy = await channel.clone({ reason: "Vanr Protection" });
        await copy.setPosition(channel.rawPosition).catch(() => {});
        restored = `الشات أُعيد إنشاؤه: ${copy}`;
    } catch (error) {
        restored = `فشل استرجاع الشات: ${String(error.message).slice(0, 60)}`;
    }

    await violation(guild, entry.executor.id, verdict.reason, "حذف شات", [`الشات: \`${channel.name}\``, restored]);
}));

client.on("roleDelete", guarded("roleDelete", async role => {
    const guild = role.guild;
    if (!guild || role.managed) return;
    if (!watching(guild.id, "antidelete")) return;

    const entry = await findEntry(guild, "ROLE_DELETE", role.id);
    if (!entry || !entry.executor) return;

    const verdict = judge(guild, entry.executor.id, "antidelete", "roleDelete");
    if (!verdict) return;

    let restored;

    try {
        const copy = await guild.roles.create({
            name: role.name,
            color: role.color,
            hoist: role.hoist,
            permissions: role.permissions,
            mentionable: role.mentionable,
            position: role.rawPosition,
            reason: "Vanr Protection"
        });

        restored = `الرتبة أُعيد إنشاؤها: ${copy} (ما يرجع أعضاءها تلقائياً)`;
    } catch (error) {
        restored = `فشل استرجاع الرتبة: ${String(error.message).slice(0, 60)}`;
    }

    await violation(guild, entry.executor.id, verdict.reason, "حذف رتبة", [`الرتبة: \`${role.name}\``, restored]);
}));

client.on("emojiDelete", guarded("emojiDelete", async emoji => {
    const guild = emoji.guild;
    if (!guild || !watching(guild.id, "antidelete")) return;

    const entry = await findEntry(guild, "EMOJI_DELETE", emoji.id);
    if (!entry || !entry.executor) return;

    const verdict = judge(guild, entry.executor.id, "antidelete", "emojiDelete");
    if (!verdict) return;

    let restored;

    try {
        const copy = await guild.emojis.create(emoji.url, emoji.name);
        restored = `الإيموجي أُعيد: ${copy}`;
    } catch (error) {
        restored = `فشل استرجاع الإيموجي: ${String(error.message).slice(0, 60)}`;
    }

    await violation(guild, entry.executor.id, verdict.reason, "حذف إيموجي", [`الإيموجي: \`${emoji.name}\``, restored]);
}));

// ═════════════════════════════════════════════
//  حماية الإنشاء
// ═════════════════════════════════════════════
client.on("channelCreate", guarded("channelCreate", async channel => {
    const guild = channel.guild;
    if (!guild || (channel.isThread && channel.isThread())) return;
    if (!watching(guild.id, "anticreate")) return;

    const entry = await findEntry(guild, "CHANNEL_CREATE", channel.id);
    if (!entry || !entry.executor) return;

    const verdict = judge(guild, entry.executor.id, "anticreate", "channelCreate");
    if (!verdict) return;

    const deleted = await channel.delete("Vanr Protection").then(() => "تم حذف الشات").catch(() => "فشل حذف الشات");

    await violation(guild, entry.executor.id, verdict.reason, "إنشاء شات", [`الشات: \`${channel.name}\``, deleted]);
}));

client.on("roleCreate", guarded("roleCreate", async role => {
    const guild = role.guild;
    if (!guild || role.managed) return;
    if (!watching(guild.id, "anticreate")) return;

    const entry = await findEntry(guild, "ROLE_CREATE", role.id);
    if (!entry || !entry.executor) return;

    const verdict = judge(guild, entry.executor.id, "anticreate", "roleCreate");
    if (!verdict) return;

    const deleted = await role.delete("Vanr Protection").then(() => "تم حذف الرتبة").catch(() => "فشل حذف الرتبة");

    await violation(guild, entry.executor.id, verdict.reason, "إنشاء رتبة", [`الرتبة: \`${role.name}\``, deleted]);
}));

// ═════════════════════════════════════════════
//  حماية البرمشن والرولات
// ═════════════════════════════════════════════
client.on("roleUpdate", guarded("roleUpdate", async (oldRole, newRole) => {
    const guild = newRole.guild;
    if (!guild || newRole.managed) return;

    const permsChanged = !oldRole.permissions.equals(newRole.permissions);
    const looksChanged =
        oldRole.name !== newRole.name ||
        oldRole.color !== newRole.color ||
        oldRole.hoist !== newRole.hoist ||
        oldRole.mentionable !== newRole.mentionable;

    const wantPerms = permsChanged && watching(guild.id, "antiperms");
    const wantLook = looksChanged && P.effective(guild.id, "cols");

    if (!wantPerms && !wantLook) return;

    const entry = await findEntry(guild, "ROLE_UPDATE", newRole.id);
    if (!entry || !entry.executor) return;

    let verdict = null;
    if (wantPerms) verdict = judge(guild, entry.executor.id, "antiperms", "roleUpdate");
    if (!verdict && wantLook) verdict = judge(guild, entry.executor.id, "cols", "roleUpdate");
    if (!verdict) return;

    const reverted = await newRole.edit({
        name: oldRole.name,
        color: oldRole.color,
        hoist: oldRole.hoist,
        mentionable: oldRole.mentionable,
        permissions: oldRole.permissions
    }, "Vanr Protection").then(() => "تم إرجاع الرتبة كما كانت").catch(error => `فشل الإرجاع: ${String(error.message).slice(0, 60)}`);

    await violation(guild, entry.executor.id, verdict.reason, "تعديل رتبة", [`الرتبة: ${newRole}`, reverted]);
}));

// إعطاء رتبة فيها صلاحيات خطيرة لعضو
client.on("guildMemberUpdate", guarded("guildMemberUpdate", async (oldMember, newMember) => {
    const guild = newMember.guild;
    if (!guild || !watching(guild.id, "antiperms")) return;
    if (!oldMember.roles || !newMember.roles) return;

    const added = newMember.roles.cache.filter(role =>
        !oldMember.roles.cache.has(role.id) &&
        !role.managed &&
        role.permissions.any(P.DANGEROUS)
    );

    if (!added.size) return;

    const entry = await findEntry(guild, "MEMBER_ROLE_UPDATE", newMember.id);
    if (!entry || !entry.executor) return;

    const verdict = judge(guild, entry.executor.id, "antiperms", "giveRole");
    if (!verdict) return;

    const removed = await newMember.roles.remove(added, "Vanr Protection")
        .then(() => "تم سحب الرتبة من العضو")
        .catch(() => "فشل سحب الرتبة");

    await violation(guild, entry.executor.id, verdict.reason, "إعطاء رتبة بصلاحيات خطيرة", [
        `العضو: ${newMember}`,
        `الرتب: ${added.map(role => `\`${role.name}\``).join("، ")}`,
        removed
    ]);
}));

// ═════════════════════════════════════════════
//  الويب هوك
// ═════════════════════════════════════════════
client.on("webhookUpdate", guarded("webhookUpdate", async channel => {
    const guild = channel.guild;
    if (!guild || !watching(guild.id, "antiwebhook")) return;

    const entry = await findEntry(guild, "WEBHOOK_CREATE", null, 8000);
    if (!entry || !entry.executor) return;

    const verdict = judge(guild, entry.executor.id, "antiwebhook", "webhook");
    if (!verdict) return;

    const hooks = await channel.fetchWebhooks().catch(() => null);
    let deleted = 0;

    if (hooks) {
        for (const hook of hooks.values()) {
            const mine = hook.id === (entry.target && entry.target.id) ||
                (hook.owner && hook.owner.id === entry.executor.id);

            if (mine && await hook.delete("Vanr Protection").then(() => true).catch(() => false)) deleted++;
        }
    }

    await violation(guild, entry.executor.id, verdict.reason, "إنشاء ويب هوك", [`الشات: ${channel}`, `تم حذف ${deleted} ويب هوك`]);
}));

// ═════════════════════════════════════════════
//  باند / طرد جماعي (متقدمة وقصوى فقط)
// ═════════════════════════════════════════════
client.on("guildBanAdd", guarded("guildBanAdd", async ban => {
    const guild = ban.guild;
    if (!guild || !(P.isOn(guild.id, "maxsec") || P.isOn(guild.id, "sechard"))) return;

    const entry = await findEntry(guild, "MEMBER_BAN_ADD", ban.user.id);
    if (!entry || !entry.executor) return;

    const verdict = judge(guild, entry.executor.id, null, "ban");
    if (!verdict) return;

    const unbanned = await guild.members.unban(ban.user.id, "Vanr Protection")
        .then(() => "تم فك الباند عن الضحية")
        .catch(() => "فشل فك الباند");

    await violation(guild, entry.executor.id, verdict.reason, "باند جماعي", [`الضحية: <@${ban.user.id}>`, unbanned]);
}));

client.on("guildMemberRemove", guarded("kickWatch", async member => {
    const guild = member.guild;
    if (!guild || !(P.isOn(guild.id, "maxsec") || P.isOn(guild.id, "sechard"))) return;

    const entry = await findEntry(guild, "MEMBER_KICK", member.id, 6000);
    if (!entry || !entry.executor) return;

    const verdict = judge(guild, entry.executor.id, null, "kick");
    if (!verdict) return;

    await violation(guild, entry.executor.id, verdict.reason, "طرد جماعي", [`المطرود: <@${member.id}>`]);
}));

// ═════════════════════════════════════════════
//  اسم وصورة السيرفر
// ═════════════════════════════════════════════
client.on("guildUpdate", guarded("guildUpdate", async (oldGuild, newGuild) => {
    const wantName = oldGuild.name !== newGuild.name && P.effective(newGuild.id, "servername");
    const wantIcon = oldGuild.icon !== newGuild.icon && P.effective(newGuild.id, "serveravatar");

    if (!wantName && !wantIcon) return;

    const entry = await findEntry(newGuild, "GUILD_UPDATE", newGuild.id);
    if (!entry || !entry.executor) return;

    const verdict = judge(newGuild, entry.executor.id, wantName ? "servername" : "serveravatar", "guildUpdate");
    if (!verdict) return;

    const done = [];

    if (wantName) {
        await newGuild.setName(oldGuild.name, "Vanr Protection").then(() => done.push("أُرجع الاسم")).catch(() => done.push("فشل إرجاع الاسم"));
    }

    if (wantIcon) {
        const url = oldGuild.iconURL({ format: "png", size: 1024 });
        await newGuild.setIcon(url, "Vanr Protection").then(() => done.push("أُرجعت الصورة")).catch(() => done.push("فشل إرجاع الصورة"));
    }

    await violation(newGuild, entry.executor.id, verdict.reason, "تعديل السيرفر", done);
}));

// ═════════════════════════════════════════════
//  دخول الأعضاء: حظر / بوتات / ريد / حسابات جديدة
// ═════════════════════════════════════════════
const joins = new Map();      // guildId → [{ id, time }]
const raidUntil = new Map();  // guildId → timestamp

async function actOnJoiner(member, action, reason) {
    const user = member.user;

    await user.send(`تم ${action === "ban" ? "حظرك" : action === "prison" ? "سجنك" : "طردك"} من **${member.guild.name}**\nالسبب: ${reason}`).catch(() => {});

    if (action === "ban") return member.ban({ reason: `Vanr: ${reason}` });
    if (action === "prison") {
        const role = await getOrCreateRole(member.guild, "prison", "#E74C3C");
        return member.roles.add(role, `Vanr: ${reason}`);
    }

    return member.kick(`Vanr: ${reason}`);
}

client.on("guildMemberAdd", guarded("guildMemberAdd", async member => {
    const guild = member.guild;
    const g = guild.id;

    // 1) قائمة الحجب
    if ((Pro.get(`block_list = ${g}`) || []).includes(member.id)) {
        await member.ban({ reason: "Vanr: في قائمة الحجب" }).catch(() => {});
        return P.logSecurity(guild, [`**دخول عضو محجوب**`, `${member.user.tag} • \`${member.id}\``, "الإجراء: تم حظره"], "#e74c3c");
    }

    // 2) بوتات
    if (member.user.bot) {
        if (!P.effective(g, "antibots")) return;

        const entry = await findEntry(guild, "BOT_ADD", member.id, 15000);
        const adder = entry && entry.executor ? entry.executor.id : null;

        // الأونر/المستثنى المتقدم لو أضافه فهو مسموح
        if (adder && P.isAdvancedExempt(guild, adder, client)) return;

        const removed = await member.ban({ reason: "Vanr: AntiBots" })
            .then(() => "تم حظر البوت")
            .catch(() => "فشل حظر البوت (ارفع رتبتي)");

        await P.logSecurity(guild, [
            `**إضافة بوت**`,
            `البوت: ${member.user.tag}`,
            `أضافه: ${adder ? `<@${adder}>` : "غير معروف"}`,
            `الإجراء: ${removed}`
        ], "#e74c3c");

        if (adder && P.isOn(g, "sechard") && !P.isBasicExempt(guild, adder, client)) {
            await violation(guild, adder, "إضافة بوت بدون إذن", "إضافة بوت");
        }

        return;
    }

    // 3) ريد: دخول جماعي
    if (P.isOn(g, "antiraid") || P.isOn(g, "sechard")) {
        const now = Date.now();
        const list = (joins.get(g) || []).filter(item => now - item.time < 10000);
        list.push({ id: member.id, time: now });
        joins.set(g, list);

        const threshold = Math.max(3, P.getLimit(g));
        const raid = (raidUntil.get(g) || 0) > now;

        if (raid || list.length >= threshold) {
            if (!raid) {
                raidUntil.set(g, now + 2 * 60 * 1000);
                await P.logSecurity(guild, [`**ريد: دخول جماعي**`, `${list.length} أعضاء خلال 10 ثواني`, "تفعيل الطرد التلقائي لمدة دقيقتين"], "#e74c3c");

                for (const joiner of list) {
                    if (joiner.id === member.id) continue;
                    const other = guild.members.cache.get(joiner.id);
                    if (other) await actOnJoiner(other, P.isOn(g, "sechard") ? "ban" : "kick", "ريد").catch(() => {});
                }
            }

            return actOnJoiner(member, P.isOn(g, "sechard") ? "ban" : "kick", "ريد").catch(() => {});
        }
    }

    // 4) حسابات جديدة
    if (P.isOn(g, "antijoin")) {
        const action = P.getRaidAction(g);
        if (action === "none") return;

        const days = P.getJoinDays(g);
        const ageDays = (Date.now() - member.user.createdTimestamp) / 86400000;

        if (ageDays < days) {
            await actOnJoiner(member, action, `حساب جديد (أقل من ${days} يوم)`).catch(() => {});

            await P.logSecurity(guild, [
                `**حساب جديد**`,
                `${member} • عمر الحساب ${Math.floor(ageDays)} يوم`,
                `الإجراء: ${action}`
            ], "#f1c40f");
        }
    }
}));

// ═════════════════════════════════════════════
//  الروابط والسبام
// ═════════════════════════════════════════════
const DEFAULT_ALLOWED_DOMAINS = [
    "tenor.com", "giphy.com", "cdn.discordapp.com", "media.discordapp.net",
    "youtube.com", "youtu.be", "twitter.com", "x.com", "imgur.com"
];

const LINK_REGEX = /(?:https?:\/\/|www\.)[^\s<>]+|discord(?:app)?\.com\/invite\/[\w-]+|discord\.gg\/[\w-]+/gi;
const INVITE_REGEX = /discord(?:app)?\.com\/invite\/|discord\.gg\//i;

function hasForbiddenLink(content, guildId) {
    const matches = String(content || "").match(LINK_REGEX);
    if (!matches) return false;

    const allowed = [...DEFAULT_ALLOWED_DOMAINS, ...(Pro.get(`antilink_allow = ${guildId}`) || [])];

    return matches.some(raw => {
        if (INVITE_REGEX.test(raw)) return true;

        try {
            const host = new URL(raw.startsWith("http") ? raw : `https://${raw}`).hostname.replace(/^www\./, "").toLowerCase();
            return !allowed.some(domain => host === domain || host.endsWith(`.${domain}`));
        } catch {
            return false;
        }
    });
}

async function silence(member, ms, reason) {
    const done = await member.timeout(ms, `Vanr: ${reason}`).then(() => true).catch(() => false);
    if (done) return true;

    const muted = member.guild.roles.cache.find(role => role.name === "Muted");
    if (!muted) return false;

    return member.roles.add(muted, `Vanr: ${reason}`).then(() => {
        setTimeout(() => member.roles.remove(muted).catch(() => {}), ms);
        return true;
    }).catch(() => false);
}

function notice(channel, text) {
    channel.send({ content: text, allowedMentions: { parse: [] } })
        .then(msg => setTimeout(() => msg.delete().catch(() => {}), 4000))
        .catch(() => {});
}

const spamCache = new Map(); // guild:user → [{ id, time, content }]

setInterval(() => {
    const now = Date.now();
    for (const [key, list] of spamCache) {
        const fresh = list.filter(item => now - item.time < 15000);
        if (fresh.length) spamCache.set(key, fresh);
        else spamCache.delete(key);
    }
}, 60000);

client.on("messageCreate", guarded("messageCreate", async message => {
    if (!message.guild || message.author.bot || !message.member) return;

    const g = message.guild.id;
    const wantLink = P.isOn(g, "antilink");
    const wantSpam = P.isOn(g, "antispam");

    if (!wantLink && !wantSpam) return;

    const member = message.member;

    if (
        P.isBasicExempt(message.guild, member.id, client) ||
        member.permissions.has("ADMINISTRATOR") ||
        member.permissions.has("MANAGE_MESSAGES")
    ) return;

    // ───── روابط ─────
    if (wantLink && hasForbiddenLink(message.content, g)) {
        await message.delete().catch(() => {});
        notice(message.channel, `${member} ممنوع نشر الروابط هنا.`);

        const muted = await silence(member, 10 * 60 * 1000, "نشر روابط");

        return P.logSecurity(message.guild, [
            `**رابط ممنوع**`,
            `${member} في ${message.channel}`,
            `الإجراء: حذف الرسالة${muted ? " + تايم أوت 10 دقائق" : ""}`
        ], "#f1c40f");
    }

    // ───── سبام ─────
    if (!wantSpam) return;

    const key = `${g}:${member.id}`;
    const now = Date.now();
    const list = (spamCache.get(key) || []).filter(item => now - item.time < 10000);

    list.push({ id: message.id, time: now, content: message.content, channelId: message.channel.id });
    spamCache.set(key, list);

    const mentionCount = message.mentions.users.size + message.mentions.roles.size;
    const fast = list.filter(item => now - item.time < 4000).length >= 5;
    const repeated = message.content.length > 0 &&
        list.filter(item => item.content === message.content).length >= 4;
    const massMention = mentionCount >= 5;

    if (!fast && !repeated && !massMention) return;

    spamCache.delete(key);

    const ids = list.filter(item => item.channelId === message.channel.id).map(item => item.id);
    await message.channel.bulkDelete(ids, true).catch(() => message.delete().catch(() => {}));

    const reason = massMention ? "منشن جماعي" : repeated ? "تكرار الرسائل" : "سبام";
    const muted = await silence(member, 5 * 60 * 1000, reason);

    notice(message.channel, `${member} تم إيقافك 5 دقائق بسبب ${reason}.`);

    await P.logSecurity(message.guild, [
        `**${reason}**`,
        `${member} في ${message.channel}`,
        `الإجراء: حذف الرسائل${muted ? " + تايم أوت 5 دقائق" : ""}`
    ], "#f1c40f");
}));

// ═════════════════════════════════════════════
//  نسخة الإيموجيات (يستخدمها restemoji)
// ═════════════════════════════════════════════
function backupEmojis(guild) {
    if (!guild.emojis.cache.size) return;

    Pro.set(
        `backup_emojis = ${guild.id}`,
        guild.emojis.cache.map(emoji => ({ name: emoji.name, url: emoji.url }))
    );
}

function snapshotAll() {
    for (const guild of client.guilds.cache.values()) backupEmojis(guild);
}

client.once("ready", () => {
    snapshotAll();
    setInterval(snapshotAll, 30 * 60 * 1000);
});

client.on("emojiCreate", emoji => backupEmojis(emoji.guild));
