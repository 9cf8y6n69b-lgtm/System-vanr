// ═══════════════════════════════════════════════════════════════
//  Voki • logsetup — ملف واحد، أمر واحد:
//    ينشئ روم لوق منفصل لكل لوق (دخول صوت، حذف رسالة...) + روم لكل أمر إداري،
//    ويسجل كل أمر ينفذ في روم خاص فيه بصورة (من نفذ، الهدف، الروم، الوسائط).
//
//  الاستخدام:   logsetup          ← الكل
//               logsetup logs     ← لوقات الأحداث فقط
//               logsetup cmds     ← رومات الأوامر فقط
//               logsetup reset    ← يوقف تسجيل الأوامر (ما يحذف الرومات)
//  لازم صلاحية Administrator.   أسماء الرومات إنجليزية بدون إيموجي.
// ═══════════════════════════════════════════════════════════════
const client = require("../../index");
const Pro = require("pro.db");
const fs = require("fs");
const { MessageEmbed } = require("discord.js");
const LOG_TYPES = require(`${process.cwd()}/Extras/logTypes`);

const CMD_DIRS = ["Admin", "Owners", "Roles", "Channels", "Protection", "Security", "Tickets", "Voice"];
const PER_CATEGORY = 45;
const cmdKey = g => `lg_cmd_${g}`;
const cfgKey = g => `lg_cfg_${g}`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const slug = s => String(s).toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 90);

// ───────────── الكرت (صورة) ─────────────
let H = null, canvasLib = null;
try { H = require("../../utils/voiceCard").helpers; canvasLib = require("canvas"); } catch {}

async function renderCard({ user, name, title, rows }) {
    if (!H || !canvasLib) return null;
    const { rr, fit, avatarOf, circle, BANNER, FONT } = H;
    const { createCanvas, loadImage } = canvasLib;
    const W = 1100;
    const rowsH = rows.length * 78;
    const Hh = 190 + rowsH;

    const canvas = createCanvas(W, Hh);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#0e0f11"; ctx.fillRect(0, 0, W, Hh);
    try {
        if (fs.existsSync(BANNER)) {
            const bg = await loadImage(BANNER);
            const sc = Math.max(W / bg.width, Hh / bg.height);
            ctx.drawImage(bg, (W - bg.width * sc) / 2, (Hh - bg.height * sc) / 2, bg.width * sc, bg.height * sc);
        }
    } catch {}
    ctx.fillStyle = "rgba(8,8,10,0.84)"; ctx.fillRect(0, 0, W, Hh);
    ctx.strokeStyle = "rgba(255,255,255,0.14)"; ctx.lineWidth = 2; rr(ctx, 6, 6, W - 12, Hh - 12, 22); ctx.stroke();

    const color = "#4da3ff";
    circle(ctx, await avatarOf(user), 86, 84, 52, color);
    ctx.textAlign = "left"; ctx.fillStyle = "#fff"; fit(ctx, name, 420, 36); ctx.fillText(name, 160, 74);

    ctx.font = `bold 20px ${FONT}`;
    const cw = ctx.measureText(title).width + 36;
    ctx.fillStyle = color; rr(ctx, 160, 90, cw, 34, 17); ctx.fill();
    ctx.fillStyle = "#0e0f11"; ctx.textAlign = "center"; ctx.fillText(title, 160 + cw / 2, 114);

    ctx.textAlign = "right"; ctx.fillStyle = "rgba(255,255,255,0.65)"; ctx.font = `20px ${FONT}`;
    ctx.fillText(new Date().toLocaleString("ar-SA", { timeZone: "Asia/Riyadh", hour12: true }), W - 40, 70);

    ctx.fillStyle = "rgba(255,255,255,0.07)"; rr(ctx, 40, 150, W - 80, rowsH + 10, 20); ctx.fill();
    rows.forEach(([k, v], i) => {
        const y = 186 + i * 78;
        ctx.textAlign = "left"; ctx.fillStyle = color; ctx.font = `bold 18px ${FONT}`; ctx.fillText(k, 66, y);
        ctx.fillStyle = "#fff"; fit(ctx, v, W - 150, 26);
        const arabic = /[؀-ۿ]/.test(v);
        ctx.textAlign = arabic ? "right" : "left";
        ctx.fillText(v, arabic ? W - 66 : 66, y + 36);
    });
    return canvas.toBuffer("image/png");
}

// ───────────── تنظيف النص ─────────────
const plain = (guild, text) => String(text || "")
    .replace(/<@!?(\d+)>/g, (_, id) => (guild.members.cache.get(id) || {}).displayName || "عضو")
    .replace(/<@&(\d+)>/g, (_, id) => `@${(guild.roles.cache.get(id) || {}).name || "رول"}`)
    .replace(/<#(\d+)>/g, (_, id) => `#${(guild.channels.cache.get(id) || {}).name || "روم"}`)
    .replace(/\s+/g, " ").trim();

const SECRET = /token|password|pass|mongo/i;

// ───────────── التسجيل عند تنفيذ أي أمر ─────────────
async function logCommand(guild, member, channel, command, args, slash) {
    try {
        if (!guild || !member || !command) return;
        const map = Pro.get(cmdKey(guild.id));
        const roomId = map && map[command.name];
        if (!roomId) return;

        const room = guild.channels.cache.get(roomId);
        if (!room || !room.isText()) return;
        if (!room.permissionsFor(guild.me).has(["VIEW_CHANNEL", "SEND_MESSAGES"])) return;

        const shown = SECRET.test(command.name) ? "(مخفي)" : (plain(guild, args.join(" ")).slice(0, 200) || "—");
        const targetId = (args.map(a => String(a).match(/\d{15,}/)).find(Boolean) || [])[0];
        const target = targetId && guild.members.cache.get(targetId);

        const rows = [
            ["الأمر", `${slash ? "/" : ""}${command.name}`],
            ["المنفذ", `${member.displayName} (${member.user.tag})`],
            ["الروم", `#${channel.name}`],
            target ? ["الهدف", `${target.displayName} (${target.user.tag})`] : null,
            ["الوسائط", shown]
        ].filter(Boolean);

        const file = await renderCard({ user: member.user, name: member.displayName, title: `أمر: ${command.name}`, rows }).catch(() => null);

        const embed = new MessageEmbed().setColor("#4da3ff").setTitle(`أمر: ${command.name}`).setFooter(`Voki • ${guild.name}`).setTimestamp();

        if (file && room.permissionsFor(guild.me).has("ATTACH_FILES")) {
            embed.setImage("attachment://cmd.png");
            await room.send({ embeds: [embed], files: [{ attachment: file, name: "cmd.png" }] });
        } else {
            embed.setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                .addFields(rows.map(([k, v]) => ({ name: k, value: v.slice(0, 1000) || "—", inline: k !== "الوسائط" })));
            await room.send({ embeds: [embed] });
        }
    } catch (error) {
        console.error("[LOGSETUP] cmd log:", error.message);
    }
}

const findCommand = word => {
    const w = String(word || "").toLowerCase();
    return client.commands.get(w) || client.commands.find(c => Array.isArray(c.aliases) && c.aliases.some(a => String(a).toLowerCase() === w));
};

if (!client.__logsetupHooked) {
    client.__logsetupHooked = true;

    client.on("messageCreate", message => {
        if (!message.guild || message.author.bot || !message.member) return;
        const [first, ...rest] = require("../../utils/shortcuts").normalize(message.guild.id, message.content).split(/\s+/);
        const command = findCommand(first);
        if (command) logCommand(message.guild, message.member, message.channel, command, rest, false);
    });

    client.on("interactionCreate", interaction => {
        if (!interaction.guild || !interaction.isCommand()) return;
        const command = client.commands.get(interaction.commandName);
        const args = interaction.options.data.flatMap(o => o.options ? [o.name, ...o.options.map(x => x.value)] : [o.value]).filter(v => v !== undefined && v !== null);
        if (command) logCommand(interaction.guild, interaction.guild.members.cache.get(interaction.user.id), interaction.channel, command, args, true);
    });
}

// ───────────── إنشاء الرومات ─────────────
async function ensureCategory(guild, name) {
    const found = guild.channels.cache.find(c => c.type === "GUILD_CATEGORY" && c.name === name);
    if (found) return found;
    return guild.channels.create(name, {
        type: "GUILD_CATEGORY",
        permissionOverwrites: [{ id: guild.roles.everyone, deny: ["VIEW_CHANNEL"] }]
    });
}

async function ensureText(guild, category, name) {
    const found = guild.channels.cache.find(c => c.type === "GUILD_TEXT" && c.parentId === category.id && c.name === name);
    return found || guild.channels.create(name, { type: "GUILD_TEXT", parent: category });
}

async function setupLogs(guild, progress) {
    const cfg = Pro.get(cfgKey(guild.id)) || {};
    cfg.types = cfg.types || {};
    const types = LOG_TYPES.filter(t => !/^cmd(Admin|Owners|Roles|Channels|Protection|Security|Tickets|Voice)$/.test(t.key));
    let category = await ensureCategory(guild, "LOGS");
    let inCat = 0, catNo = 1, made = 0;

    for (const t of types) {
        if (inCat >= PER_CATEGORY) { catNo++; category = await ensureCategory(guild, `LOGS ${catNo}`); inCat = 0; }
        const room = await ensureText(guild, category, slug(t.key.replace(/([A-Z])/g, "-$1")));
        cfg.types[t.key] = room.id;
        inCat++; made++;
        if (made % 8 === 0) await progress(`لوقات الأحداث: ${made}/${types.length}`);
    }
    Pro.set(cfgKey(guild.id), cfg);
    return made;
}

async function setupCommands(guild, progress) {
    const map = Pro.get(cmdKey(guild.id)) || {};
    const list = [...client.commands.values()]
        .filter(c => CMD_DIRS.includes(c.directory) && /^[a-z0-9_-]+$/i.test(c.name) && c.name !== "logsetup")
        .sort((a, b) => (a.directory + a.name).localeCompare(b.directory + b.name));

    let made = 0, catNo = 0, inCat = PER_CATEGORY, category = null;

    for (const cmd of list) {
        if (inCat >= PER_CATEGORY) { catNo++; category = await ensureCategory(guild, `CMD LOGS ${catNo}`); inCat = 0; }

        const existing = map[cmd.name] && guild.channels.cache.get(map[cmd.name]);
        if (!existing) {
            const room = await ensureText(guild, category, slug(cmd.name));
            map[cmd.name] = room.id;
        }
        inCat++; made++;
        if (made % 10 === 0) { Pro.set(cmdKey(guild.id), map); await progress(`لوق الأوامر: ${made}/${list.length}`); }
    }
    Pro.set(cmdKey(guild.id), map);
    return made;
}

module.exports = {
    name: "logsetup",
    aliases: ["تسطيب-لوق", "لوقات"],

    run: async (client, message, args = []) => {
        if (!message.member.permissions.has("ADMINISTRATOR")) return message.react("❌").catch(() => {});
        const guild = message.guild;
        const mode = (args[0] || "all").toLowerCase();

        if (!guild.me.permissions.has("MANAGE_CHANNELS")) return message.reply("البوت يحتاج صلاحية Manage Channels.");

        if (mode === "reset") {
            Pro.delete(cmdKey(guild.id));
            return message.reply("تم إيقاف تسجيل الأوامر (الرومات باقية، احذفها يدوياً).");
        }

        const status = await message.reply("جاري إنشاء رومات اللوق... ممكن ياخذ كم دقيقة، لا تعيد الأمر.");
        const progress = text => status.edit(`جاري الإنشاء... ${text}`).catch(() => {});

        try {
            const lines = [];
            if (mode === "all" || mode === "logs") lines.push(`لوقات الأحداث: **${await setupLogs(guild, progress)}** روم`);
            if (mode === "all" || mode === "cmds") lines.push(`لوق الأوامر: **${await setupCommands(guild, progress)}** روم (روم لكل أمر)`);

            await status.edit(`✅ تم.\n${lines.join("\n")}\nكل شيء يتسجل بصورة في روم خاص فيه.`).catch(() => {});
        } catch (error) {
            console.error("[LOGSETUP]", error);
            await status.edit(`❌ وقف بسبب: ${String(error.message).slice(0, 200)}\nأعد الأمر وراح يكمل من وين وقف.`).catch(() => {});
        }
    }
};
