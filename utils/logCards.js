// ═══════════════════════════════════════════════
//  Voki • كروت اللوقات: تبديل روم (من/إلى)، حذف رسالة، تحذير (آخر 5 رسائل)، بلاك ليست
// ═══════════════════════════════════════════════
const fs = require("fs");
const { createCanvas, loadImage } = require("canvas");
const { helpers: H } = require("./voiceCard");

const { rr, fit, avatarOf, circle, BANNER, FONT } = H;

const isArabic = text => /[؀-ۿ]/.test(text);

function frame(W, H2, dim = 0.84) {
    const canvas = createCanvas(W, H2);
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#0e0f11";
    ctx.fillRect(0, 0, W, H2);

    return { canvas, ctx, ready: (async () => {
        try {
            if (fs.existsSync(BANNER)) {
                const bg = await loadImage(BANNER);
                const sc = Math.max(W / bg.width, H2 / bg.height);
                ctx.drawImage(bg, (W - bg.width * sc) / 2, (H2 - bg.height * sc) / 2, bg.width * sc, bg.height * sc);
            }
        } catch {}
        ctx.fillStyle = `rgba(8,8,10,${dim})`;
        ctx.fillRect(0, 0, W, H2);
        ctx.strokeStyle = "rgba(255,255,255,0.14)";
        ctx.lineWidth = 2;
        rr(ctx, 6, 6, W - 12, H2 - 12, 22);
        ctx.stroke();
    })() };
}

function chip(ctx, x, y, text, color) {
    ctx.font = `bold 20px ${FONT}`;
    const w = ctx.measureText(text).width + 36;
    ctx.fillStyle = color;
    rr(ctx, x, y, w, 34, 17);
    ctx.fill();
    ctx.fillStyle = "#0e0f11";
    ctx.textAlign = "center";
    ctx.fillText(text, x + w / 2, y + 24);
    return w;
}

// يلف النص على أسطر (كلمات)
function wrap(ctx, text, maxW, maxLines) {
    const words = String(text).replace(/\s+/g, " ").trim().split(" ");
    const lines = [];
    let line = "";

    for (const word of words) {
        const test = line ? `${line} ${word}` : word;

        if (ctx.measureText(test).width > maxW && line) {
            lines.push(line);
            line = word;
        } else {
            line = test;
        }
    }
    if (line) lines.push(line);

    if (lines.length > maxLines) {
        lines.length = maxLines;
        lines[maxLines - 1] = lines[maxLines - 1].replace(/.{0,3}$/, "...");
    }

    return lines;
}

function header(ctx, user, name, avatarImg, color, label, rightLines = []) {
    circle(ctx, avatarImg, 86, 84, 52, color);

    ctx.textAlign = "left";
    ctx.fillStyle = "#fff";
    fit(ctx, name, 420, 36);
    ctx.fillText(name, 160, 74);

    chip(ctx, 160, 90, label, color);

    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.font = `20px ${FONT}`;
    rightLines.forEach((line, i) => ctx.fillText(line, ctx.canvas.width - 40, 66 + i * 28));
}

// ───────────── تبديل روم: من → إلى ─────────────
async function renderMoveCard({ member, from, to, pulledBy }) {
    const W = 1100, Hh = 430;
    const { canvas, ctx, ready } = frame(W, Hh);
    await ready;

    const color = pulledBy ? "#ffb020" : "#4da3ff";
    header(ctx, member.user, member.displayName, await avatarOf(member.user), color,
        pulledBy ? "تم سحبه بين الرومات" : "تبديل بين الرومات",
        pulledBy ? [`بواسطة: ${pulledBy.displayName || pulledBy.username || pulledBy.tag}`] : []);

    const panel = async (x, title, channel, tag, accent) => {
        const w = 460;
        ctx.fillStyle = "rgba(255,255,255,0.07)";
        rr(ctx, x, 150, w, 250, 20);
        ctx.fill();

        ctx.textAlign = "center";
        ctx.fillStyle = accent;
        ctx.font = `bold 18px ${FONT}`;
        ctx.fillText(tag, x + w / 2, 178);

        ctx.fillStyle = "#fff";
        fit(ctx, channel.name, w - 40, 28);
        ctx.fillText(channel.name, x + w / 2, 212);

        const members = [...channel.members.values()];
        const shown = members.slice(0, 6);

        for (let i = 0; i < shown.length; i++) {
            const col = i % 3, row = Math.floor(i / 3);
            const cx = x + 80 + col * 150;
            const cy = 275 + row * 82;
            circle(ctx, await avatarOf(shown[i].user), cx, cy, 24, shown[i].id === member.id ? accent : "rgba(255,255,255,0.4)");
            ctx.fillStyle = "#ddd";
            fit(ctx, shown[i].displayName, 120, 15, "");
            ctx.fillText(shown[i].displayName, cx, cy + 42);
        }

        if (!shown.length) {
            ctx.fillStyle = "rgba(255,255,255,0.5)";
            ctx.font = `bold 22px ${FONT}`;
            ctx.fillText("الروم فاضي", x + w / 2, 300);
        } else if (members.length > shown.length) {
            ctx.fillStyle = "rgba(255,255,255,0.6)";
            ctx.font = `16px ${FONT}`;
            ctx.fillText(`+${members.length - shown.length}`, x + w - 30, 385);
        }
    };

    await panel(40, "from", from, "من", "#ff8a8a");
    await panel(W - 500, "to", to, "إلى", "#5fe39a");

    // سهم
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(528, 245); ctx.lineTo(572, 245); ctx.lineTo(572, 225); ctx.lineTo(606 - 6, 265 - 20 + 20);
    ctx.lineTo(572, 305); ctx.lineTo(572, 285); ctx.lineTo(528, 285);
    ctx.closePath();
    ctx.fill();

    return canvas.toBuffer("image/png");
}

// ───────────── حذف رسالة ─────────────
async function renderDeleteCard({ author, authorName, channelName, content, deletedBy, attachmentNames = [], imageUrl }) {
    const W = 900;
    const text = content || (attachmentNames.length ? "(مرفق بدون نص)" : "(محتوى غير متوفر)");

    const measure = createCanvas(10, 10).getContext("2d");
    measure.font = `24px ${FONT}`;
    const lines = wrap(measure, text, imageUrl ? 430 : 780, 7);
    const bodyH = Math.max(110, lines.length * 34 + 40);
    const Hh = 170 + bodyH + 70;

    const { canvas, ctx, ready } = frame(W, Hh);
    await ready;

    header(ctx, author, authorName, author ? await avatarOf(author) : null, "#ff5a5f", "حذف رسالة", [`#${channelName}`]);

    const top = 150;
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    rr(ctx, 40, top, W - 80, bodyH, 18);
    ctx.fill();

    const rtl = isArabic(text);
    ctx.fillStyle = "#fff";
    ctx.font = `24px ${FONT}`;
    ctx.textAlign = rtl ? "right" : "left";
    const textX = rtl ? (imageUrl ? 500 : W - 64) : 64;
    lines.forEach((line, i) => ctx.fillText(line, textX, top + 44 + i * 34));

    if (imageUrl) {
        try {
            const img = await loadImage(imageUrl);
            const maxW = 300, maxH = bodyH - 30;
            const sc = Math.min(maxW / img.width, maxH / img.height);
            const iw = img.width * sc, ih = img.height * sc;
            ctx.save();
            rr(ctx, W - 64 - iw, top + 15, iw, ih, 12);
            ctx.clip();
            ctx.drawImage(img, W - 64 - iw, top + 15, iw, ih);
            ctx.restore();
        } catch {}
    }

    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.font = `20px ${FONT}`;
    const footer = `حُذفت بواسطة: ${deletedBy || "الكاتب نفسه / غير معروف"}` + (attachmentNames.length ? `  •  مرفقات: ${attachmentNames.length}` : "");
    ctx.fillText(footer, 44, Hh - 26);

    return canvas.toBuffer("image/png");
}

// ───────────── تحذير: آخر 5 رسائل ─────────────
async function renderWarnCard({ user, name, reason, byName, warns, messages }) {
    const W = 900;
    const rowH = 62;
    const rows = Math.max(1, messages.length);
    const Hh = 220 + rows * rowH + 30;

    const { canvas, ctx, ready } = frame(W, Hh);
    await ready;

    header(ctx, user, name, await avatarOf(user), "#f5b82e", "تحذير", [`التحذير رقم ${warns}`, `بواسطة: ${byName}`]);

    ctx.textAlign = "left";
    ctx.fillStyle = "#fff";
    ctx.font = `22px ${FONT}`;
    const reasonLines = wrap(ctx, `السبب: ${reason}`, W - 80, 2);
    ctx.textAlign = isArabic(reason) ? "right" : "left";
    reasonLines.forEach((line, i) => ctx.fillText(line, isArabic(reason) ? W - 40 : 40, 156 + i * 30));

    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = `bold 20px ${FONT}`;
    ctx.fillText("آخر 5 رسائل للعضو (حتى المحذوفة):", 40, 222);

    if (!messages.length) {
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.font = `22px ${FONT}`;
        ctx.fillText("ما فيه رسائل مسجلة للعضو.", 40, 270);
    }

    messages.forEach((m, i) => {
        const y = 240 + i * rowH;

        ctx.fillStyle = m.deleted ? "rgba(255,90,95,0.16)" : "rgba(255,255,255,0.07)";
        rr(ctx, 40, y, W - 80, rowH - 8, 12);
        ctx.fill();

        ctx.textAlign = "left";
        ctx.fillStyle = m.deleted ? "#ff8a8a" : "rgba(255,255,255,0.55)";
        ctx.font = `15px ${FONT}`;
        ctx.fillText(`#${m.channelName}  •  ${new Date(m.time).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}${m.deleted ? "  •  محذوفة" : ""}`, 56, y + 20);

        const body = m.content || (m.attachments && m.attachments.length ? `(مرفق: ${m.attachments[0]})` : "(بدون نص)");
        ctx.fillStyle = "#fff";
        ctx.font = `20px ${FONT}`;
        const line = wrap(ctx, body, W - 140, 1)[0] || "";
        ctx.textAlign = isArabic(line) ? "right" : "left";
        ctx.fillText(line, isArabic(line) ? W - 56 : 56, y + 44);
    });

    return canvas.toBuffer("image/png");
}

// ───────────── بلاك ليست ─────────────
async function renderBlacklistCard({ user, name, reason, byName, added }) {
    const W = 900, Hh = 260;
    const { canvas, ctx, ready } = frame(W, Hh);
    await ready;

    const color = added ? "#9aa0a8" : "#3ddc84";
    header(ctx, user, name, await avatarOf(user), color, added ? "إضافة إلى البلاك ليست" : "إزالة من البلاك ليست", [`بواسطة: ${byName}`]);

    ctx.fillStyle = "rgba(255,255,255,0.08)";
    rr(ctx, 40, 150, W - 80, 80, 16);
    ctx.fill();

    ctx.fillStyle = "#fff";
    ctx.font = `22px ${FONT}`;
    const lines = wrap(ctx, `السبب: ${reason || "بدون سبب"}`, W - 120, 2);
    ctx.textAlign = isArabic(reason || "") ? "right" : "left";
    lines.forEach((line, i) => ctx.fillText(line, isArabic(reason || "") ? W - 60 : 60, 186 + i * 30));

    return canvas.toBuffer("image/png");
}

// ───────────── كرت عام لأي لوق (عضو/إدارة/سيرفر/أوامر) ─────────────
async function renderEventCard({ user, name, label, color = "#4da3ff", rows = [], rightLines = [] }) {
    rows = rows.filter(r => r && r[1]).slice(0, 7);

    const probe = createCanvas(10, 10).getContext("2d");
    probe.font = `24px ${FONT}`;
    const laid = rows.map(([k, v]) => ({ k, lines: wrap(probe, v, 880, 3) }));
    const bodyH = laid.reduce((n, r) => n + 34 + r.lines.length * 32 + 14, 0);

    const W = 1100, Hh = 170 + bodyH + 30;
    const { canvas, ctx, ready } = frame(W, Hh);
    await ready;

    header(ctx, user, name, await avatarOf(user), color, label, rightLines);

    ctx.fillStyle = "rgba(255,255,255,0.07)";
    rr(ctx, 40, 150, W - 80, bodyH + 10, 20);
    ctx.fill();

    let y = 184;
    for (const row of laid) {
        ctx.textAlign = "left";
        ctx.fillStyle = color;
        ctx.font = `bold 18px ${FONT}`;
        ctx.fillText(row.k, 66, y);
        y += 30;

        ctx.fillStyle = "#fff";
        ctx.font = `24px ${FONT}`;
        for (const line of row.lines) {
            if (isArabic(line)) { ctx.textAlign = "right"; ctx.fillText(line, W - 66, y); }
            else { ctx.textAlign = "left"; ctx.fillText(line, 66, y); }
            y += 32;
        }
        y += 14;
    }

    return canvas.toBuffer("image/png");
}

// ───────────── تعديل رسالة: قبل / بعد ─────────────
async function renderEditCard({ author, authorName, channelName, before, after }) {
    const W = 1100, Hh = 470;
    const { canvas, ctx, ready } = frame(W, Hh);
    await ready;

    header(ctx, author, authorName, await avatarOf(author), "#f1c40f", "تعديل رسالة", [`#${channelName}`]);

    const panel = (x, title, text, accent) => {
        const w = 510;
        ctx.fillStyle = "rgba(255,255,255,0.07)";
        rr(ctx, x, 150, w, 290, 20);
        ctx.fill();

        ctx.textAlign = "center";
        ctx.fillStyle = accent;
        ctx.font = `bold 20px ${FONT}`;
        ctx.fillText(title, x + w / 2, 184);

        ctx.font = `24px ${FONT}`;
        ctx.fillStyle = "#fff";
        const lines = wrap(ctx, text || "—", w - 50, 7);
        lines.forEach((line, i) => {
            if (isArabic(line)) { ctx.textAlign = "right"; ctx.fillText(line, x + w - 25, 226 + i * 32); }
            else { ctx.textAlign = "left"; ctx.fillText(line, x + 25, 226 + i * 32); }
        });
    };

    panel(40, "قبل", before, "#ff7a7a");
    panel(550, "بعد", after, "#6ee7a0");

    return canvas.toBuffer("image/png");
}

module.exports = { renderMoveCard, renderDeleteCard, renderWarnCard, renderBlacklistCard, renderEventCard, renderEditCard };
