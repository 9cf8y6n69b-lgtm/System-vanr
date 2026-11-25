// ═══════════════════════════════════════════════
//  Voki • أدوات الهوية (الاسم، الصورة، الإيموجيات)
// ═══════════════════════════════════════════════
const fs = require("fs");
const path = require("path");
const { AsyncLocalStorage } = require("async_hooks");
const Discord = require("discord.js");
const Pro = require("pro.db");

const ROOT = path.join(__dirname, "..");
const BRAND = "Voki";
const COLOR = "#2b2d31";

const BANNER_NAME = "voki-banner.jpg";
const BANNER_PATH = path.join(ROOT, "assets", BANNER_NAME);
const ICON_PATH = path.join(ROOT, "assets", "voki-icon.png");
const EMOJI_DIR = path.join(ROOT, "emojis");

// مفاتيح الإيموجيات = أسماء ملفات emojis/voki_<key>.png
const EMOJI_KEYS = [
    "voki", "claim", "transfer", "call", "close", "accept", "reject", "ticket", "user", "type",
    "clock", "star", "history", "heart", "shield", "unlock", "ban", "kick", "mic", "micoff",
    "speaker", "chat", "gear", "link", "warning", "info", "trophy", "search", "trash", "edit",
    "image", "tkgold", "tkcrown", "lock", "adduser", "rmuser", "rename", "note", "transcript", "priority",
    "support", "verified", "panel", "sparkle", "save"
];  // حد ديسكورد 50 إيموجي للسيرفر بدون بوست


// رموز زخرفية (مو إيموجي) تظهر في النص لو الإيموجيات المخصصة ما انرفعت
const FALLBACK = {
    tkgold: "❖", tkcrown: "♛", lock: "⌂", adduser: "＋", rmuser: "－", rename: "✎", note: "▤", transcript: "▼", priority: "△", support: "◈", verified: "✔", panel: "▦", sparkle: "✦", save: "▣", voki: "◉", claim: "❖", transfer: "⇄", call: "◈", close: "✕",
    accept: "✔", reject: "✖", ticket: "❖", user: "◈", type: "❖",
    clock: "◷", star: "✦", history: "❏",
    crown: "♛", heart: "♥", shield: "⛨", unlock: "◌", ban: "⦸", kick: "⇥", mic: "◖", micoff: "◗", speaker: "◁", chat: "▤", gear: "✲", link: "∞", warning: "△", info: "ⓘ", bolt: "ϟ", fire: "✺", gem: "◆", trophy: "♔", gift: "❀", flag: "⚑", pin: "⌖", search: "⌕", trash: "⌫", edit: "✎", image: "▣", folder: "▭", globe: "◍", calendar: "▦", eye: "◉", eyeoff: "◎", levelup: "⇧", plus: "＋", minus: "－", bot: "▣", medal: "✪"
};

// ───────────── الإيموجيات المخصصة ─────────────
const emojiKey = guildId => `void_emojis_${guildId}`;

function emojiMap(guildId) {
    return Pro.get(emojiKey(guildId)) || {};
}

// للنص داخل الإمبد (قيمة حقل / وصف)
function icon(guild, key) {
    const map = emojiMap(guild.id);
    return map[key] || FALLBACK[key] || "";
}

// للأزرار والقوائم: إيموجي مخصص فقط، وإلا بدون إيموجي
function btnEmoji(guild, key) {
    return emojiMap(guild.id)[key] || null;
}

// رفع الإيموجيات للسيرفر وحفظ الـ IDs
async function uploadEmojis(guild) {
    const map = { ...emojiMap(guild.id) };
    const report = { created: [], existed: [], failed: [] };

    await guild.emojis.fetch().catch(() => {});
    // حذف إيموجيات الاسم القديم (void_*) لتفادي حد الإيموجيات
    for (const old of [...guild.emojis.cache.filter(e => /^void_/.test(e.name)).values()]) {
        await old.delete("Rebrand to Voki").catch(() => {});
    }

    for (const key of EMOJI_KEYS) {
        const name = `voki_${key}`;
        const file = path.join(EMOJI_DIR, `${name}.png`);
        if (!fs.existsSync(file)) {
            report.failed.push(`${name} (الملف ناقص)`);
            continue;
        }

        let emoji = guild.emojis.cache.find(e => e.name === name);

        if (emoji) {
            report.existed.push(name);
        } else {
            try {
                emoji = await guild.emojis.create(file, name);
                report.created.push(name);
            } catch (error) {
                report.failed.push(`${name} (${String(error.message).slice(0, 60)})`);
                continue;
            }
        }

        map[key] = emoji.toString();
    }

    Pro.set(emojiKey(guild.id), map);
    return report;
}

// ───────────── البانر ─────────────
function bannerFile() {
    return fs.existsSync(BANNER_PATH)
        ? { attachment: BANNER_PATH, name: BANNER_NAME }
        : null;
}

// يجهز صورة (مسار مخصص أو البانر الافتراضي) → { file, url }
const DESIGNS_DIR = path.join(ROOT, "assets", "designs");
const WELCOME_CIRCLE = { x: 722, y: 280, radius: 150, none: false };

function pickImage(customPath, kind) {
    if (customPath && fs.existsSync(customPath)) {
        const name = path.basename(customPath);
        return { file: { attachment: customPath, name }, url: `attachment://${name}` };
    }

    if (kind) {
        const dp = path.join(DESIGNS_DIR, `${kind}.png`);
        if (fs.existsSync(dp)) return { file: { attachment: dp, name: `voki-${kind}.png` }, url: `attachment://voki-${kind}.png` };
    }
    const file = bannerFile();
    return file ? { file, url: `attachment://${BANNER_NAME}` } : { file: null, url: null };
}

// ───────────── بانر تلقائي على إمبدات بعض الأوامر ─────────────
const als = new AsyncLocalStorage();

let bannerCommands = new Set();
try {
    const info = require(path.join(ROOT, "botinfo.json"));
    if (info.vokiBanner && info.vokiBanner.enabled !== false) {
        bannerCommands = new Set((info.vokiBanner.commands || []).map(c => String(c).toLowerCase()));
    }
} catch {}

function injectBanner(payload) {
    if (!als.getStore()) return payload;
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return payload;

    const embeds = payload.embeds;
    if (!Array.isArray(embeds) || !embeds.length) return payload;

    const first = embeds[0];
    if (!first || first.image || (first.data && first.data.image)) return payload;
    if (!fs.existsSync(BANNER_PATH)) return payload;

    const url = `attachment://${BANNER_NAME}`;

    if (typeof first.setImage === "function") first.setImage(url);
    else first.image = { url };

    const files = Array.isArray(payload.files) ? payload.files.slice() : [];
    files.push({ attachment: BANNER_PATH, name: BANNER_NAME });

    return { ...payload, files };
}

let installed = false;

function installBannerPatch() {
    if (installed) return;
    installed = true;

    const patch = (proto, name) => {
        if (!proto || typeof proto[name] !== "function") return;
        const original = proto[name];

        proto[name] = function (options, ...rest) {
            return original.call(this, injectBanner(options), ...rest);
        };
    };

    patch(Discord.Message && Discord.Message.prototype, "reply");

    for (const key of ["TextChannel", "NewsChannel", "ThreadChannel"]) {
        if (Discord[key]) patch(Discord[key].prototype, "send");
    }
}

// يشغّل الأمر، ولو اسمه بالقائمة تنضاف له صورة Voki تلقائياً
function runWithBanner(commandName, fn) {
    if (bannerCommands.has(String(commandName).toLowerCase())) {
        return als.run({ command: commandName }, fn);
    }
    return fn();
}

module.exports = {
    BRAND,
    COLOR,
    BANNER_NAME,
    BANNER_PATH,
    ICON_PATH,
    EMOJI_KEYS,
    icon,
    btnEmoji,
    uploadEmojis,
    bannerFile,
    pickImage,
    DESIGNS_DIR,
    WELCOME_CIRCLE,
    installBannerPatch,
    runWithBanner
};
