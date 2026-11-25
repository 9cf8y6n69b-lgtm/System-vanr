// ═══════════════════════════════════════════════
//  Vanr • إعدادات الترحيب القابلة للتخصيص (embed / صورة / الاثنين / نص)
//  المفتاح: welcome_cfg_<guild>   — صورة التصميم تظل من أمر welcome (welcome_system_<guild>)
// ═══════════════════════════════════════════════
const Pro = require("pro.db");
const { MessageEmbed } = require("discord.js");
const { createCanvas, loadImage, GlobalFonts } = require("canvas");
const path = require("path");

try { GlobalFonts.registerFromPath(path.join(__dirname, "..", "Cairo-Regular.ttf"), "Cairo"); } catch {}

const DEFAULTS = {
    enabled: true,
    channelId: null,
    mode: "both",            // embed | image | both | text
    text: "أهلاً {user} في **{server}** 🎉\nأنت العضو رقم **{count}**\nدعاك: {inviter}",
    title: "",
    color: "#2b2d31",
    footer: "",
    avatar: true,            // صورة العضو (ثمبنيل الإمبد)
    name: true,              // اسم العضو (أعلى الإمبد)
    mention: true,           // منشن العضو فوق الرسالة
    inviter: true,           // منشن الداعي
    count: true,             // رقم العضو
    imgAvatar: true,         // صورة العضو على الصورة (إذا مطفي = التصميم بدون صورة العضو)
    imgName: false,          // اسم العضو على الصورة
    deleteAfter: 0,          // حذف رسالة الترحيب بعد ثواني (0 = لا)
    roleId: null             // رتبة تلقائية عند الدخول
};

const key = guildId => `welcome_cfg_${guildId}`;

function get(guildId) {
    const saved = Pro.get(key(guildId)) || {};
    const legacy = Pro.get(`welcome_system_${guildId}`) || {};

    const cfg = { ...DEFAULTS, ...saved };
    if (!cfg.channelId && legacy.channelId) cfg.channelId = legacy.channelId;
    if (saved.enabled === undefined && legacy.enabled === false) cfg.enabled = false;

    return cfg;
}

function set(guildId, patch) {
    Pro.set(key(guildId), { ...(Pro.get(key(guildId)) || {}), ...patch });
}

const reset = guildId => Pro.delete(key(guildId));
const getTemplate = guildId => {
    const t = Pro.get(`welcome_system_${guildId}`);
    return t && t.template && t.circle ? t : null;
};

// ───────────── المتغيرات ─────────────
function fill(text, member, inviterInfo, cfg) {
    const inviterUser = inviterInfo && inviterInfo.user;
    const inviterText = !cfg.inviter ? "" : inviterUser ? `${inviterUser}` : "غير معروف";

    return String(text || "")
        .replace(/{user}/gi, `${member}`)
        .replace(/{name}/gi, member.user.username)
        .replace(/{tag}/gi, member.user.tag)
        .replace(/{id}/gi, member.id)
        .replace(/{server}/gi, member.guild.name)
        .replace(/{count}/gi, String(member.guild.memberCount))
        .replace(/{inviter}/gi, inviterText)
        .replace(/{inviter_name}/gi, inviterUser ? inviterUser.username : "غير معروف")
        .replace(/{code}/gi, (inviterInfo && inviterInfo.code) || "-")
        .replace(/\\n/g, "\n");
}

// ───────────── الصورة ─────────────
async function renderImage(member, template, cfg) {
    const bg = await loadImage(Buffer.from(template.template, "base64"));
    const canvas = createCanvas(bg.width, bg.height);
    const ctx = canvas.getContext("2d");

    ctx.drawImage(bg, 0, 0);

    const { x, y, radius, none } = template.circle;

    if (!none && cfg.imgAvatar !== false) {
        const avatar = await loadImage(member.user.displayAvatarURL({ format: "png", dynamic: false, size: 512 }));
        const r = radius * 0.94;

        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, x - r, y - r, r * 2, r * 2);
        ctx.restore();
    }

    if (cfg.imgName) {
        const noCircle = none || cfg.imgAvatar === false;
        const baseR = noCircle ? Math.min(bg.width, bg.height) * 0.16 : radius;
        const size = Math.max(22, Math.round(baseR * 0.32));
        ctx.textAlign = "center";
        ctx.fillStyle = "#ffffff";
        ctx.shadowColor = "rgba(0,0,0,0.7)";
        ctx.shadowBlur = 8;
        ctx.font = `bold ${size}px Cairo, sans-serif`;
        const nx = noCircle ? bg.width / 2 : x;
        const ny = noCircle ? bg.height * 0.85 : Math.min(bg.height - 12, y + radius + size + 14);
        ctx.fillText(member.displayName || member.user.username, nx, ny);
    }

    return canvas.toBuffer("image/png");
}

// ───────────── بناء الرسالة ─────────────
async function build(member, inviterInfo, cfg) {
    const useImage = ["image", "both"].includes(cfg.mode) && getTemplate(member.guild.id);
    const useEmbed = ["embed", "both"].includes(cfg.mode) || (["image", "both"].includes(cfg.mode) && !useImage && cfg.mode !== "text");
    const description = fill(cfg.text, member, inviterInfo, cfg);

    const mentionIds = new Set([member.id]);
    if (inviterInfo && inviterInfo.user && cfg.inviter) mentionIds.add(inviterInfo.user.id);
    const payload = { allowedMentions: { users: [...mentionIds] } };
    if (cfg.mention) payload.content = `${member}`;

    let file = null;
    if (useImage) {
        file = { attachment: await renderImage(member, getTemplate(member.guild.id), cfg), name: "welcome.png" };
        payload.files = [file];
    }

    if (useEmbed) {
        const embed = new MessageEmbed().setColor(cfg.color || "#2b2d31").setDescription(description || "​");
        if (cfg.title) embed.setTitle(fill(cfg.title, member, inviterInfo, cfg));
        if (cfg.name) embed.setAuthor({ name: member.user.username, iconURL: member.user.displayAvatarURL({ dynamic: true }) });
        if (cfg.avatar) embed.setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }));
        if (cfg.footer) embed.setFooter({ text: fill(cfg.footer, member, inviterInfo, cfg) });
        if (file) embed.setImage("attachment://welcome.png");
        payload.embeds = [embed];
    } else {
        // نص فقط = الرسالة نص، صورة فقط = الصورة (مع المنشن إن كان مفعل)
        if (cfg.mode === "text") payload.content = [payload.content, description].filter(Boolean).join("\n");
    }

    return payload;
}

module.exports = { DEFAULTS, get, set, reset, getTemplate, fill, build, key };
