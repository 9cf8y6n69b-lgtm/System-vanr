// ═══════════════════════════════════════════════
//  Vanr • مفاتيح الحماية وأدواتها (تُستخدم من الأوامر ومن events/protection.js)
// ═══════════════════════════════════════════════
const Pro = require("pro.db");
const { MessageEmbed } = require("discord.js");

let config = {};
try { config = require(`${process.cwd()}/config`); } catch {}

const OWNERS = Array.isArray(config.owners) ? config.owners.filter(Boolean) : [];

// صلاحيات تعتبر خطيرة (تُسحب من المخالف وتُمنع إضافتها)
const DANGEROUS = [
    "ADMINISTRATOR",
    "MANAGE_GUILD",
    "MANAGE_ROLES",
    "MANAGE_CHANNELS",
    "BAN_MEMBERS",
    "KICK_MEMBERS",
    "MANAGE_WEBHOOKS"
];

// ───────────── الميزات ─────────────
// بعضها يحتفظ بمفاتيحه القديمة (antilinks-ID …) عشان ما تضيع إعداداتك
const simple = key => ({
    get: g => !!Pro.get(`${key} = ${g}`),
    set: (g, v) => Pro.set(`${key} = ${g}`, !!v)
});

const FEATURES = {
    antilink: {
        label: "حماية الروابط",
        get: g => Pro.get(`antilinks-${g}`) === "on",
        set: (g, v) => Pro.set(`antilinks-${g}`, v ? "on" : "off")
    },
    antispam: {
        label: "حماية السبام",
        get: g => !!Pro.get(`spamProtection_${g}`),
        set: (g, v) => Pro.set(`spamProtection_${g}`, !!v)
    },
    antibots: {
        label: "حماية البوتات",
        get: g => Pro.get(`antibots-${g}`) === "on",
        set: (g, v) => Pro.set(`antibots-${g}`, v ? "on" : "off")
    },
    antijoin: {
        label: "حماية الجوين (حسابات جديدة)",
        get: g => Pro.get(`antijoinEnabled_${g}`) === true,
        set: (g, v) => Pro.set(`antijoinEnabled_${g}`, !!v)
    },
    antiraid: { label: "حماية الريد (دخول جماعي)", ...simple("antiraid") },
    antidelete: { label: "حماية الحذف (شاتات/رولات/إيموجي)", ...simple("antidelete") },
    anticreate: { label: "حماية الإنشاء (شاتات/رولات)", ...simple("anticreate") },
    antiperms: { label: "حماية البرمشن (رولات + إعطاء رتب خطيرة)", ...simple("antiperms") },
    antiwebhook: { label: "حماية الويب هوك", ...simple("antiwebhook") },
    cols: { label: "حماية الرولات (اسم/لون)", ...simple("cols") },
    servername: { label: "حماية اسم السيرفر", ...simple("servername") },
    serveravatar: { label: "حماية صورة السيرفر", ...simple("serveravatar") },
    maxsec: { label: "الحماية المتقدمة (حد أكشنز للكل)", ...simple("maxsec") },
    sechard: { label: "الحماية القصوى (كل شي + باند)", ...simple("sechard") }
};

// أسماء بديلة مقبولة في أمر protect
const ALIASES = {
    links: "antilink", link: "antilink", روابط: "antilink",
    spam: "antispam", سبام: "antispam",
    bots: "antibots", بوتات: "antibots",
    join: "antijoin", جوين: "antijoin",
    raid: "antiraid", ريد: "antiraid",
    delete: "antidelete", حذف: "antidelete",
    create: "anticreate", انشاء: "anticreate", إنشاء: "anticreate",
    perms: "antiperms", برمشن: "antiperms",
    webhook: "antiwebhook", ويبهوك: "antiwebhook",
    roles: "cols", رولات: "cols",
    name: "servername", اسم: "servername", antiname: "servername",
    icon: "serveravatar", صورة: "serveravatar", antiicon: "serveravatar",
    advanced: "maxsec", متقدمة: "maxsec",
    hard: "sechard", قصوى: "sechard"
};

function resolveFeature(name) {
    if (!name) return null;
    const key = String(name).toLowerCase();
    if (FEATURES[key]) return key;
    return ALIASES[key] || null;
}

const isOn = (guildId, feature) => FEATURES[feature] ? FEATURES[feature].get(guildId) : false;
const setOn = (guildId, feature, value) => FEATURES[feature].set(guildId, value);

// ميزة فعّالة: إما مفعلة بنفسها أو الحماية القصوى شغالة
const effective = (guildId, feature) => isOn(guildId, feature) || isOn(guildId, "sechard");

// ───────────── الإعدادات الرقمية ─────────────
const getLimit = guildId => Number(Pro.get(`security_limit = ${guildId}`)) || 5;
const getWindowSec = guildId => Number(Pro.get(`sloprot = ${guildId}`)) || 60;
const getRaidAction = guildId => Pro.get(`setrjoin = ${guildId}`) || "prison";
const getJoinDays = guildId => Number(Pro.get(`rjoin_days = ${guildId}`)) || 30;

// ───────────── القوائم البيضاء ─────────────
const getBasicList = guildId => Pro.get(`wanti_list = ${guildId}`) || [];
const getAdvancedList = guildId => Pro.get(`aprot_list = ${guildId}`) || [];

// أونر البوت + أونر السيرفر + البوت نفسه: دائماً مستثنين
function isTrusted(guild, userId, client) {
    return (
        userId === (client && client.user && client.user.id) ||
        userId === guild.ownerId ||
        OWNERS.includes(userId)
    );
}

// مستثنى من الحماية العادية
function isBasicExempt(guild, userId, client) {
    return (
        isTrusted(guild, userId, client) ||
        getBasicList(guild.id).includes(userId) ||
        getAdvancedList(guild.id).includes(userId)
    );
}

// مستثنى من الحماية المتقدمة/القصوى
function isAdvancedExempt(guild, userId, client) {
    return isTrusted(guild, userId, client) || getAdvancedList(guild.id).includes(userId);
}

// ───────────── عدّاد الأكشنز (للحماية المتقدمة) ─────────────
const counters = new Map();

function bump(guildId, userId, action) {
    const key = `${guildId}:${userId}`;
    const now = Date.now();
    const windowMs = getWindowSec(guildId) * 1000;

    const list = (counters.get(key) || []).filter(item => now - item.time < windowMs);
    list.push({ time: now, action });
    counters.set(key, list);

    return list.length;
}

// ───────────── اللوق ─────────────
async function logSecurity(guild, lines, color = "#2b2d31") {
    const channelId = Pro.get(`security_log = ${guild.id}`);
    if (!channelId) return;

    const channel = guild.channels.cache.get(channelId);
    if (!channel || !channel.send) return;

    const embed = new MessageEmbed()
        .setColor(color)
        .setAuthor({
            name: `${guild.name} • سجل الحماية`,
            iconURL: guild.iconURL({ dynamic: true }) || undefined
        })
        .setDescription(Array.isArray(lines) ? lines.join("\n") : String(lines))
        .setTimestamp();

    await channel.send({ embeds: [embed], allowedMentions: { parse: [] } }).catch(() => {});
}

module.exports = {
    FEATURES,
    DANGEROUS,
    OWNERS,
    resolveFeature,
    isOn,
    setOn,
    effective,
    getLimit,
    getWindowSec,
    getRaidAction,
    getJoinDays,
    getBasicList,
    getAdvancedList,
    isTrusted,
    isBasicExempt,
    isAdvancedExempt,
    bump,
    logSecurity
};
