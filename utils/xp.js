// ═══════════════════════════════════════════════
//  Voki • نظام الخبرة (XP شات + XP فويس + لفل) وكرت id
// ═══════════════════════════════════════════════
const fs = require("fs");
const path = require("path");
const Pro = require("pro.db");
const { createCanvas, loadImage, GlobalFonts } = require("canvas");

const ROOT = path.join(__dirname, "..");
const BANNER = path.join(ROOT, "assets", "voki-banner.jpg");

try {
    GlobalFonts.registerFromPath(path.join(ROOT, "Cairo-Regular.ttf"), "Cairo");
} catch {}

const FONT = "Cairo, sans-serif";

// ───────────── الإعدادات ─────────────
const CHAT_XP = { min: 15, max: 25, cooldownMs: 60 * 1000 };
const VOICE_XP_PER_MINUTE = 10;

// ───────────── التخزين ─────────────
const KEY = (guildId, userId) => `xp = ${guildId} = ${userId}`;
const INDEX = guildId => `xp_index = ${guildId}`;

const empty = () => ({ chat: 0, voice: 0, messages: 0, voiceSeconds: 0, lastMsg: 0 });

function getUser(guildId, userId) {
    return { ...empty(), ...(Pro.get(KEY(guildId, userId)) || {}) };
}

function saveUser(guildId, userId, data) {
    Pro.set(KEY(guildId, userId), data);

    const index = Pro.get(INDEX(guildId)) || [];

    if (!index.includes(userId)) {
        index.push(userId);
        Pro.set(INDEX(guildId), index);
    }
}

const isEnabled = guildId => Pro.get(`xp_disabled = ${guildId}`) !== true;
const getLevelChannelId = guildId => Pro.get(`xp_channel = ${guildId}`) || null;
const getRoleRewards = guildId => Pro.get(`xp_roles = ${guildId}`) || [];

// ───────────── اللفل ─────────────
// الخبرة المطلوبة للانتقال من لفل L إلى L+1
const needFor = level => 5 * level * level + 50 * level + 100;

function levelInfo(totalXp) {
    let level = 0;
    let remaining = Math.max(0, Math.floor(totalXp));

    while (remaining >= needFor(level) && level < 1000) {
        remaining -= needFor(level);
        level++;
    }

    return { level, current: remaining, needed: needFor(level) };
}

const totalOf = data => (data.chat || 0) + (data.voice || 0);

// ───────────── إضافة خبرة ─────────────
function addXp(guildId, userId, kind, amount, extra = {}) {
    const data = getUser(guildId, userId);
    const before = levelInfo(totalOf(data)).level;

    data[kind] = Math.max(0, (data[kind] || 0) + amount);
    Object.assign(data, extra);

    saveUser(guildId, userId, data);

    const after = levelInfo(totalOf(data)).level;

    return { data, before, after, leveledUp: after > before };
}

function setUserData(guildId, userId, data) {
    saveUser(guildId, userId, { ...empty(), ...data });
}

function resetUser(guildId, userId) {
    Pro.delete(KEY(guildId, userId));

    const index = (Pro.get(INDEX(guildId)) || []).filter(id => id !== userId);
    Pro.set(INDEX(guildId), index);
}

// ───────────── الترتيب ─────────────
function leaderboard(guildId, kind = "total") {
    const index = Pro.get(INDEX(guildId)) || [];

    return index
        .map(userId => {
            const data = getUser(guildId, userId);
            const value = kind === "chat" ? data.chat : kind === "voice" ? data.voice : totalOf(data);
            return { userId, value, data };
        })
        .filter(item => item.value > 0)
        .sort((a, b) => b.value - a.value);
}

function rankOf(guildId, userId) {
    const board = leaderboard(guildId, "total");
    const position = board.findIndex(item => item.userId === userId);
    return position === -1 ? null : position + 1;
}

// ───────────── مكافآت اللفل (رتب) ─────────────
async function applyRoleRewards(member, level) {
    const rewards = getRoleRewards(member.guild.id).filter(item => item.level <= level);
    const given = [];

    for (const reward of rewards) {
        const role = member.guild.roles.cache.get(reward.roleId);

        if (!role || member.roles.cache.has(role.id) || !role.editable) continue;

        await member.roles.add(role, "Voki XP level reward").then(() => given.push(role)).catch(() => {});
    }

    return given;
}

// ───────────── أدوات الرسم ─────────────
function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

function fitText(ctx, text, maxWidth, size, weight = "bold") {
    let current = size;

    do {
        ctx.font = `${weight} ${current}px ${FONT}`;
        current -= 2;
    } while (ctx.measureText(text).width > maxWidth && current > 14);
}

function formatVoice(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours ? `${hours}س ${minutes}د` : `${minutes}د`;
}

const compact = n => n >= 10000 ? `${(n / 1000).toFixed(1)}K` : String(Math.floor(n));

// ───────────── كرت id ─────────────
async function renderCard(user, guildId) {
    const data = getUser(guildId, user.id);
    const total = totalOf(data);
    const info = levelInfo(total);
    const rank = rankOf(guildId, user.id);

    const W = 934;
    const H = 300;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");

    // الخلفية: صورة Voki مظللة
    ctx.fillStyle = "#0e0f11";
    ctx.fillRect(0, 0, W, H);

    try {
        if (fs.existsSync(BANNER)) {
            const bg = await loadImage(BANNER);
            const scale = Math.max(W / bg.width, H / bg.height);
            const bw = bg.width * scale;
            const bh = bg.height * scale;
            ctx.drawImage(bg, (W - bw) / 2, (H - bh) / 2, bw, bh);
        }
    } catch {}

    const overlay = ctx.createLinearGradient(0, 0, W, 0);
    overlay.addColorStop(0, "rgba(8,8,10,0.92)");
    overlay.addColorStop(1, "rgba(8,8,10,0.70)");
    ctx.fillStyle = overlay;
    ctx.fillRect(0, 0, W, H);

    // إطار خفيف
    ctx.strokeStyle = "rgba(255,255,255,0.14)";
    ctx.lineWidth = 2;
    roundRect(ctx, 6, 6, W - 12, H - 12, 22);
    ctx.stroke();

    // الأفتار
    const cx = 138;
    const cy = 150;
    const radius = 84;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    try {
        const avatar = await loadImage(user.displayAvatarURL({ format: "png", size: 256 }));
        ctx.drawImage(avatar, cx - radius, cy - radius, radius * 2, radius * 2);
    } catch {
        ctx.fillStyle = "#2b2d31";
        ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
    }

    ctx.restore();

    const ring = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
    ring.addColorStop(0, "#ffffff");
    ring.addColorStop(1, "#7d838c");
    ctx.strokeStyle = ring;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 5, 0, Math.PI * 2);
    ctx.stroke();

    // الاسم + الآيدي
    const left = 262;
    const right = W - 40;
    const name = user.globalName || user.username;

    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "left";
    fitText(ctx, name, 470, 44);
    ctx.fillText(name, left, 88);

    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = `20px ${FONT}`;
    ctx.fillText(`ID: ${user.id}`, left, 120);

    // اللفل + الترتيب (يمين)
    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = `bold 20px ${FONT}`;
    ctx.fillText("LEVEL", right, 52);

    ctx.fillStyle = "#ffffff";
    ctx.font = `bold 58px ${FONT}`;
    ctx.fillText(String(info.level), right, 108);

    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = `bold 22px ${FONT}`;
    ctx.fillText(rank ? `RANK #${rank}` : "RANK -", right, 138);

    // شريط التقدم
    const barX = left;
    const barY = 168;
    const barW = right - left;
    const barH = 28;
    const ratio = Math.min(1, info.current / info.needed);

    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.font = `bold 19px ${FONT}`;
    ctx.fillText(`${compact(info.current)} / ${compact(info.needed)} XP`, barX, barY - 8);

    ctx.textAlign = "right";
    ctx.fillText(`${Math.floor(ratio * 100)}%`, right, barY - 8);

    ctx.fillStyle = "rgba(255,255,255,0.14)";
    roundRect(ctx, barX, barY, barW, barH, barH / 2);
    ctx.fill();

    if (ratio > 0) {
        const fillW = Math.max(barH, barW * ratio);
        const fill = ctx.createLinearGradient(barX, 0, barX + barW, 0);
        fill.addColorStop(0, "#ffffff");
        fill.addColorStop(1, "#9aa0a8");
        ctx.fillStyle = fill;
        roundRect(ctx, barX, barY, fillW, barH, barH / 2);
        ctx.fill();
    }

    // الإحصائيات
    const stats = [
        { label: "XP شات", value: compact(data.chat) },
        { label: "XP فويس", value: compact(data.voice) },
        { label: "وقت الفويس", value: formatVoice(data.voiceSeconds) }
    ];

    const gap = 14;
    const chipW = (barW - gap * 2) / 3;
    const chipY = 218;

    stats.forEach((stat, i) => {
        const x = barX + i * (chipW + gap);

        ctx.fillStyle = "rgba(255,255,255,0.10)";
        roundRect(ctx, x, chipY, chipW, 56, 14);
        ctx.fill();

        ctx.textAlign = "center";
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.font = `16px ${FONT}`;
        ctx.fillText(stat.label, x + chipW / 2, chipY + 22);

        ctx.fillStyle = "#ffffff";
        ctx.font = `bold 24px ${FONT}`;
        ctx.fillText(stat.value, x + chipW / 2, chipY + 47);
    });

    return canvas.toBuffer("image/png");
}

// ───────────── صورة الترقية ─────────────
const xpToReach = level => { let sum = 0; for (let i = 0; i < level; i++) sum += needFor(i); return sum; };

function nextReward(guildId, level, totalXp) {
    const next = getRoleRewards(guildId).filter(r => r.level > level).sort((a, b) => a.level - b.level)[0];
    if (!next) return null;
    return { ...next, remaining: Math.max(0, xpToReach(next.level) - totalXp) };
}

async function renderLevelUpCard(member, level, rewardRole) {
    const W = 934, H = 340;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");
    const total = totalOf(getUser(member.guild.id, member.id));
    const next = nextReward(member.guild.id, level, total);

    ctx.fillStyle = "#0e0f11";
    ctx.fillRect(0, 0, W, H);

    try {
        if (fs.existsSync(BANNER)) {
            const bg = await loadImage(BANNER);
            const scale = Math.max(W / bg.width, H / bg.height);
            ctx.drawImage(bg, (W - bg.width * scale) / 2, (H - bg.height * scale) / 2, bg.width * scale, bg.height * scale);
        }
    } catch {}

    ctx.fillStyle = "rgba(8,8,10,0.86)";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(255,255,255,0.14)";
    ctx.lineWidth = 2;
    roundRect(ctx, 6, 6, W - 12, H - 12, 22);
    ctx.stroke();

    // يسار: الصورة + الاسم
    const cx = 130, cy = 130, r = 74;
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.closePath(); ctx.clip();
    try {
        ctx.drawImage(await loadImage(member.user.displayAvatarURL({ format: "png", size: 256 })), cx - r, cy - r, r * 2, r * 2);
    } catch {
        ctx.fillStyle = "#2b2d31"; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    }
    ctx.restore();
    ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(cx, cy, r + 5, 0, Math.PI * 2); ctx.stroke();

    ctx.textAlign = "center";
    ctx.fillStyle = "#fff";
    fitText(ctx, member.displayName, 220, 28);
    ctx.fillText(member.displayName, cx, 250);

    // الوسط: اللفل الجديد
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.font = `bold 22px ${FONT}`;
    ctx.fillText("LEVEL UP", W / 2, 70);

    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(255,255,255,0.45)";
    ctx.shadowBlur = 24;
    ctx.font = `bold 140px ${FONT}`;
    ctx.fillText(String(level), W / 2, 200);
    ctx.shadowBlur = 0;

    // يمين: الرتبة
    const rx = W - 150;
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = `bold 20px ${FONT}`;
    ctx.fillText(rewardRole ? "الرتبة الجديدة" : "الرتبة", rx, 95);

    if (rewardRole) {
        const color = rewardRole.hexColor && rewardRole.hexColor !== "#000000" ? rewardRole.hexColor : "#ffffff";
        ctx.font = `bold 26px ${FONT}`;
        const w = Math.min(230, ctx.measureText(rewardRole.name).width + 44);
        ctx.fillStyle = color;
        roundRect(ctx, rx - w / 2, 115, w, 52, 26);
        ctx.fill();
        ctx.fillStyle = "#0e0f11";
        fitText(ctx, rewardRole.name, w - 28, 26);
        ctx.fillText(rewardRole.name, rx, 150);
    } else {
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.font = `22px ${FONT}`;
        ctx.fillText("—", rx, 150);
    }

    // تحت: الجائزة القادمة
    ctx.fillStyle = "rgba(255,255,255,0.10)";
    roundRect(ctx, 40, 272, W - 80, 48, 16);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = `bold 22px ${FONT}`;
    const text = next
        ? `الجائزة القادمة عند لفل ${next.level}  •  باقي ${Math.ceil(next.remaining)} XP`
        : "ما فيه جوائز قادمة حالياً";
    ctx.fillText(text, W / 2, 304);

    return canvas.toBuffer("image/png");
}

module.exports = {
    CHAT_XP,
    VOICE_XP_PER_MINUTE,
    needFor,
    levelInfo,
    totalOf,
    getUser,
    addXp,
    setUserData,
    resetUser,
    leaderboard,
    rankOf,
    isEnabled,
    getLevelChannelId,
    getRoleRewards,
    applyRoleRewards,
    renderCard,
    renderLevelUpCard
};
