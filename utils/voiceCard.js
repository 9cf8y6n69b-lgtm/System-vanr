// ═══════════════════════════════════════════════
//  Vanr • كرت لوق الصوت: اسم الروم + العضو + كل الأعضاء داخل الروم
// ═══════════════════════════════════════════════
const fs = require("fs");
const path = require("path");
const { createCanvas, loadImage, GlobalFonts } = require("canvas");

const ROOT = path.join(__dirname, "..");
const BANNER = path.join(ROOT, "assets", "vanr-banner.jpg");
try { GlobalFonts.registerFromPath(path.join(ROOT, "Cairo-Regular.ttf"), "Cairo"); } catch {}
const FONT = "Cairo, sans-serif";

const STYLES = {
    join: { label: "دخل الروم", color: "#3ddc84" },
    leave: { label: "طلع من الروم", color: "#ff5a5f" },
    move: { label: "انتقل إلى الروم", color: "#4da3ff" },
    pull: { label: "تم سحبه إلى الروم", color: "#ffb020" },
    mute: { label: "ميوت صوتي", color: "#ff8a3d" },
    unmute: { label: "فك الميوت الصوتي", color: "#3ddc84" },
    deaf: { label: "ديفن (تصميم)", color: "#c0392b" },
    undeaf: { label: "فك الديفن", color: "#3ddc84" }
};

function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

function fit(ctx, text, maxW, size, weight = "bold") {
    let s = size;
    do { ctx.font = `${weight} ${s}px ${FONT}`; s -= 2; } while (ctx.measureText(text).width > maxW && s > 12);
}

async function avatarOf(user) {
    try { return await loadImage(user.displayAvatarURL({ format: "png", size: 128 })); } catch { return null; }
}

function circle(ctx, img, cx, cy, r, ring) {
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.closePath(); ctx.clip();
    if (img) ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
    else { ctx.fillStyle = "#2b2d31"; ctx.fillRect(cx - r, cy - r, r * 2, r * 2); }
    ctx.restore();
    ctx.strokeStyle = ring; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(cx, cy, r + 3, 0, Math.PI * 2); ctx.stroke();
}

/**
 * @param {object} o { type: join|leave|move|pull, channel, actor (GuildMember), fromChannel? }
 * الأعضاء المعروضين = الموجودين حالياً بالروم (بعد الدخول أو بعد الخروج)
 */
async function renderVoiceCard({ type, channel, actor, fromChannel, note }) {
    const style = STYLES[type] || STYLES.join;
    const members = [...channel.members.values()].filter(m => m.id !== actor.id || type !== "leave");
    const shown = members.slice(0, 10);

    const W = 900, H = 420;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#0e0f11"; ctx.fillRect(0, 0, W, H);

    try {
        if (fs.existsSync(BANNER)) {
            const bg = await loadImage(BANNER);
            const sc = Math.max(W / bg.width, H / bg.height);
            ctx.drawImage(bg, (W - bg.width * sc) / 2, (H - bg.height * sc) / 2, bg.width * sc, bg.height * sc);
        }
    } catch {}
    ctx.fillStyle = "rgba(8,8,10,0.82)"; ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = "rgba(255,255,255,0.14)"; ctx.lineWidth = 2;
    rr(ctx, 6, 6, W - 12, H - 12, 22); ctx.stroke();

    // رأس: العضو المنفّذ
    const actorImg = await avatarOf(actor.user);
    circle(ctx, actorImg, 86, 84, 52, style.color);

    ctx.textAlign = "left";
    ctx.fillStyle = "#fff";
    fit(ctx, actor.displayName, 420, 36);
    ctx.fillText(actor.displayName, 160, 74);

    // شريحة الحدث
    ctx.font = `bold 20px ${FONT}`;
    const chipText = style.label;
    const cw = ctx.measureText(chipText).width + 36;
    ctx.fillStyle = style.color;
    rr(ctx, 160, 90, cw, 34, 17); ctx.fill();
    ctx.fillStyle = "#0e0f11"; ctx.textAlign = "center";
    ctx.fillText(chipText, 160 + cw / 2, 114);

    // اسم الروم (يمين)
    ctx.textAlign = "right"; ctx.fillStyle = "#fff";
    fit(ctx, `🔊 ${channel.name}`.replace("🔊 ", ""), 300, 34);
    ctx.fillText(channel.name, W - 40, 72);
    ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.font = `20px ${FONT}`;
    ctx.fillText(`${members.length} بالروم`, W - 40, 102);
    if (fromChannel && (type === "move" || type === "pull")) {
        ctx.fillText(`من: ${fromChannel.name}`, W - 40, 128);
    }
    if (note) {
        ctx.fillText(note, W - 40, 128);
    }

    // فاصل
    ctx.fillStyle = "rgba(255,255,255,0.12)"; ctx.fillRect(40, 150, W - 80, 2);

    // الأعضاء
    ctx.textAlign = "center";
    if (!shown.length) {
        ctx.fillStyle = "rgba(255,255,255,0.55)"; ctx.font = `bold 26px ${FONT}`;
        ctx.fillText("الروم فاضي", W / 2, 270);
    } else {
        const perRow = 5, cellW = (W - 80) / perRow;
        for (let i = 0; i < shown.length; i++) {
            const m = shown[i];
            const col = i % perRow, row = Math.floor(i / perRow);
            const cx = 40 + cellW * col + cellW / 2;
            const cy = 205 + row * 105;
            circle(ctx, await avatarOf(m.user), cx, cy, 32, m.id === actor.id ? style.color : "rgba(255,255,255,0.5)");
            ctx.fillStyle = "#fff"; fit(ctx, m.displayName, cellW - 20, 18, "");
            ctx.fillText(m.displayName, cx, cy + 56);
        }
        if (members.length > shown.length) {
            ctx.textAlign = "right"; ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.font = `18px ${FONT}`;
            ctx.fillText(`+${members.length - shown.length}`, W - 40, H - 22);
        }
    }

    return canvas.toBuffer("image/png");
}

module.exports = { renderVoiceCard, helpers: { rr, fit, avatarOf, circle, BANNER, FONT } };
