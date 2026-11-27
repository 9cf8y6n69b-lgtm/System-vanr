// ═══════════════════════════════════════════════
//  Vanr • أدوات الهوية (الاسم، الصورة، الإيموجيات)
// ═══════════════════════════════════════════════
const fs = require("fs");
const path = require("path");
const { AsyncLocalStorage } = require("async_hooks");
const Discord = require("discord.js");
const Pro = require("pro.db");

const ROOT = path.join(__dirname, "..");
const BRAND = "Vanr";
const COLOR = "#2b2d31";

const BANNER_NAME = "vanr-banner.jpg";
const BANNER_PATH = path.join(ROOT, "assets", BANNER_NAME);
const ICON_PATH = path.join(ROOT, "assets", "vanr-icon.png");
const EMOJI_DIR = path.join(ROOT, "emojis");

// مفاتيح الإيموجيات = أسماء ملفات emojis/vanr_<key>.png
const EMOJI_KEYS = [
    "vanr", "claim", "transfer", "call", "close", "accept", "reject", "ticket", "user", "type",
    "clock", "star", "history", "heart", "shield", "unlock", "ban", "kick", "mic", "micoff",
    "speaker", "chat", "gear", "link", "warning", "info", "trophy", "search", "trash", "edit",
    "image", "tkgold", "tkcrown", "lock", "adduser", "rmuser", "rename", "note", "transcript", "priority",
    "support", "verified", "panel", "sparkle", "save"
];  // حد ديسكورد 50 إيموجي للسيرفر بدون بوست


// رموز زخرفية (مو إيموجي) تظهر في النص لو الإيموجيات المخصصة ما انرفعت
const FALLBACK = {
    tkgold: "❖", tkcrown: "♛", lock: "⌂", adduser: "＋", rmuser: "－", rename: "✎", note: "▤", transcript: "▼", priority: "△", support: "◈", verified: "✔", panel: "▦", sparkle: "✦", save: "▣", vanr: "◉", claim: "❖", transfer: "⇄", call: "◈", close: "✕",
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
    // حذف إيموجيات الأسماء القديمة (void_* و voki_*) لتفادي حد الإيموجيات
    for (const old of [...guild.emojis.cache.filter(e => /^(void|voki)_/.test(e.name)).values()]) {
        await old.delete("Rebrand to Vanr").catch(() => {});
    }

    for (const key of EMOJI_KEYS) {
        const name = `vanr_${key}`;
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

// يتأكد إن إيموجيات المفاتيح موجودة فعلاً بالسيرفر، وإلا يرفعها (مرة وحدة لكل سيرفر في نفس الوقت)
const ensuring = new Map();
async function ensureEmojis(guild, keys) {
    if (ensuring.has(guild.id)) return ensuring.get(guild.id);
    const job = (async () => {
        try {
            await guild.emojis.fetch().catch(() => {});
            const map = emojiMap(guild.id);
            const want = keys || EMOJI_KEYS;
            const idOf = v => (/(\d{15,25})>?$/.exec(String(v || "")) || [])[1];
            const missing = want.filter(k => !map[k] || !guild.emojis.cache.has(idOf(map[k])));
            if (!missing.length) return false;
            await uploadEmojis(guild);
            return true;
        } catch (e) { console.error("[EMOJI] ensure:", e.message); return false; }
        finally { ensuring.delete(guild.id); }
    })();
    ensuring.set(guild.id, job);
    return job;
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
        if (fs.existsSync(dp)) return { file: { attachment: dp, name: `vanr-${kind}.png` }, url: `attachment://vanr-${kind}.png` };
        let data = null;
        try { data = require("./designData")[kind]; } catch {}
        if (data) return { file: { attachment: Buffer.from(data, "base64"), name: `vanr-${kind}.png` }, url: `attachment://vanr-${kind}.png` };
    }
    const file = bannerFile();
    return file ? { file, url: `attachment://${BANNER_NAME}` } : { file: null, url: null };
}

// ───────────── بانر تلقائي على إمبدات بعض الأوامر ─────────────
const als = new AsyncLocalStorage();

let bannerCommands = new Set();
try {
    const info = require(path.join(ROOT, "botinfo.json"));
    if (info.vanrBanner && info.vanrBanner.enabled !== false) {
        bannerCommands = new Set((info.vanrBanner.commands || []).map(c => String(c).toLowerCase()));
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

// يشغّل الأمر، ولو اسمه بالقائمة تنضاف له صورة Vanr تلقائياً
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
    ensureEmojis,
    DESIGNS_DIR,
    WELCOME_CIRCLE,
    installBannerPatch,
    runWithBanner
};
