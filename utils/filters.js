// ═══════════════════════════════════════════════
//  Vanr • فلاتر الرسائل (كلمات محظورة، تكرار، دعوات، روابط) + عقوبات
// ═══════════════════════════════════════════════
const Pro = require("pro.db");

const key = g => `filters_${g}`;
const DEFAULT = () => ({
    words: { enabled: false, list: [], punish: ["delete", "warn", "mute:10"] },   // العقوبة 1، 2، 3
    spam: { enabled: false, count: 3, seconds: 20, punish: "mute:10" },
    invites: { enabled: false, punish: "delete" },
    links: { enabled: false, punish: "delete", allow: ["tenor.com", "giphy.com", "discord.com", "discordapp.com", "discordapp.net", "cdn.discordapp.com"] },
    exemptRoles: []
});

function get(g) {
    const d = DEFAULT(), c = Pro.get(key(g)) || {};
    return { ...d, ...c, words: { ...d.words, ...c.words }, spam: { ...d.spam, ...c.spam }, invites: { ...d.invites, ...c.invites }, links: { ...d.links, ...c.links } };
}
const save = (g, c) => Pro.set(key(g), c);

// نصوص العقوبات
const PUNISH = {
    delete: "حذف الرسالة فقط",
    warn: "حذف + تحذير",
    "mute:10": "حذف + ميوت 10 دقايق",
    "mute:60": "حذف + ميوت ساعة",
    "mute:1440": "حذف + ميوت يوم",
    kick: "حذف + طرد",
    ban: "حذف + حظر"
};
const label = p => PUNISH[p] || p || "—";

// ───────────── كشف ─────────────
const INVITE = /(?:discord\.gg|discord(?:app)?\.com\/invite)\/[\w-]+/i;
const URL_RE = /(?:https?:\/\/|www\.)[^\s<>]+/gi;

const normalize = t => String(t || "").toLowerCase()
    .replace(/[ً-ْـ]/g, "")            // تشكيل وتطويل
    .replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه")
    .replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();

function hasBadWord(cfg, content) {
    const text = ` ${normalize(content)} `;
    const squashed = normalize(content).replace(/\s/g, "");
    return cfg.words.list.find(w => {
        const n = normalize(w);
        return n && (text.includes(` ${n} `) || (n.replace(/\s/g, "").length >= 4 && squashed.includes(n.replace(/\s/g, ""))));
    }) || null;
}

function externalLinks(cfg, content) {
    return (String(content).match(URL_RE) || []).filter(u => {
        if (INVITE.test(u)) return false; // الدعوات لها فلتر مستقل
        const host = u.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split(/[/?#]/)[0].toLowerCase();
        return !cfg.links.allow.some(d => host === d || host.endsWith(`.${d}`));
    });
}

// ───────────── عداد المخالفات (كلمات) ─────────────
const strikeKey = (g, u) => `filter_strikes_${g}_${u}`;
function strike(g, u) {
    const cur = Pro.get(strikeKey(g, u)) || { n: 0, at: 0 };
    const n = Date.now() - cur.at > 24 * 3600 * 1000 ? 1 : cur.n + 1;
    Pro.set(strikeKey(g, u), { n, at: Date.now() });
    return n;
}

// ───────────── تنفيذ العقوبة ─────────────
async function punish(member, spec, reason) {
    const res = { done: label(spec), ok: true };
    try {
        if (spec.startsWith("mute:")) await member.timeout(Number(spec.split(":")[1]) * 60 * 1000, reason);
        else if (spec === "kick") await member.kick(reason);
        else if (spec === "ban") await member.ban({ reason, days: 0 });
    } catch (error) {
        res.ok = false;
        res.err = error.message;
    }
    return res;
}

module.exports = { get, save, label, PUNISH, INVITE, hasBadWord, externalLinks, normalize, strike, punish };
