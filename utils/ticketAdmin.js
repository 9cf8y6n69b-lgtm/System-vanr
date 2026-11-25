// ═══════════════════════════════════════════════
//  Vanr • لوحة تحكم التكت (كلها إمبد + أزرار)
// ═══════════════════════════════════════════════
const fs = require("fs");
const path = require("path");
const https = require("https");
const Pro = require("pro.db");
const { MessageActionRow, MessageButton, MessageSelectMenu, MessageEmbed } = require("discord.js");
const V = require("./vanr");
const TS = require("./ticketSystem");

const IMAGES_DIR = path.join(process.cwd(), "ticket_images");
const imgKey = g => `ticket_imgs_${g}`;
const MAX_IMAGE = 3 * 1024 * 1024;

const DEFAULTS = guildId => ({
    guildId, panelChannelId: null, requestChannelId: null, ticketCategoryId: null,
    reviewerRoleIds: [], categories: [], panelImagePath: null, requestImagePath: null,
    panelMode: "embed", panelText: "", requestText: "", ticketText: "", acceptedText: "", pointText: ""
});

const load = guildId => ({ ...DEFAULTS(guildId), ...(TS.getConfig(guildId) || {}) });
const save = (guildId, cfg) => TS.setConfig(guildId, cfg);

// ───────────── الصور (تنحفظ كملف + نسخة بالقاعدة عشان ما تضيع بالتحديث) ─────────────
function downloadImage(url, fileName, guildId) {
    return new Promise((resolve, reject) => {
        fs.mkdirSync(IMAGES_DIR, { recursive: true });
        const ext = (path.extname(new URL(url).pathname) || ".png").toLowerCase();
        const filePath = path.join(IMAGES_DIR, `${fileName}${ext}`);

        https.get(url, res => {
            if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
            const chunks = [];
            let size = 0;
            res.on("data", c => { size += c.length; if (size > MAX_IMAGE) { res.destroy(); reject(new Error("الصورة أكبر من 3MB")); } else chunks.push(c); });
            res.on("end", () => {
                const buf = Buffer.concat(chunks);
                fs.writeFileSync(filePath, buf);
                const store = Pro.get(imgKey(guildId)) || {};
                store[path.basename(filePath)] = buf.toString("base64");
                Pro.set(imgKey(guildId), store);
                resolve(filePath);
            });
        }).on("error", reject);
    });
}

// يرجع الصور المفقودة (بعد إعادة تشغيل/نشر) من القاعدة
function restoreImages(client) {
    for (const guild of client.guilds.cache.values()) {
        const cfg = TS.getConfig(guild.id);
        const store = Pro.get(imgKey(guild.id));
        if (!cfg || !store) continue;

        for (const file of [cfg.panelImagePath, cfg.requestImagePath]) {
            if (!file || fs.existsSync(file)) continue;
            const data = store[path.basename(file)];
            if (!data) continue;
            fs.mkdirSync(path.dirname(file), { recursive: true });
            fs.writeFileSync(file, Buffer.from(data, "base64"));
        }
    }
}

function cleanEmoji(value) {
    const text = String(value || "").trim();
    if (/^<a?:\w+:\d+>$/.test(text)) return text;
    if (/^(\p{Extended_Pictographic}[️‍]*)+$/u.test(text)) return text;
    return null;
}

// ───────────── لوحة الأعضاء (القائمة) ─────────────
function makePanelRows(guild, categories) {
    const options = categories.map(category => {
        const option = {
            label: category.name.slice(0, 100),
            description: (category.description || category.name).slice(0, 100),
            value: category.id
        };
        const emoji = category.emoji || V.btnEmoji(guild, "tkgold") || V.btnEmoji(guild, "ticket");
        if (emoji) option.emoji = emoji;
        return option;
    });

    const historyOption = { label: "تكتاتي السابقة", description: "عرض التكتات التي فتحتها سابقاً", value: "ticket_history" };
    const historyEmoji = V.btnEmoji(guild, "history");
    if (historyEmoji) historyOption.emoji = historyEmoji;
    options.push(historyOption);

    const rows = [];
    for (let i = 0; i < options.length; i += 25) {
        rows.push(new MessageActionRow().addComponents(
            new MessageSelectMenu().setCustomId("tk:open").setPlaceholder("اختر القسم أو التكتات السابقة").addOptions(options.slice(i, i + 25))
        ));
    }
    return rows;
}

function buildPanel(guild, config) {
    const image = V.pickImage(config.panelImagePath, "ticket_panel");

    // نمط "صورة + أقسام" بدون إمبد
    if (config.panelMode === "image") {
        const p = { components: makePanelRows(guild, config.categories || []) };
        if (config.panelText) p.content = config.panelText;
        if (image.file) p.files = [image.file];
        return p;
    }

    const embed = new MessageEmbed()
        .setColor(V.COLOR)
        .setAuthor({ name: `${guild.name} • مركز الدعم`, iconURL: guild.iconURL({ dynamic: true }) || undefined })
        .setDescription(
            config.panelText ||
            `${V.icon(guild, "tkcrown")} **اختر القسم المناسب من القائمة بالأسفل**\n` +
            `${V.icon(guild, "sparkle")} سيصل طلبك للإدارة وبعد القبول تُفتح لك تذكرة خاصة.`
        )
        .setFooter({ text: `${V.BRAND} • Ticket System`, iconURL: guild.iconURL({ dynamic: true }) || undefined });

    if (image.url) embed.setImage(image.url);

    const payload = { embeds: [embed], components: makePanelRows(guild, config.categories || []) };
    if (image.file) payload.files = [image.file];
    return payload;
}

// ───────────── واجهة التحكم ─────────────
const btn = (guild, id, label, style = "SECONDARY", emoji) => {
    const b = new MessageButton().setCustomId(id).setLabel(label).setStyle(style);
    const e = emoji && V.btnEmoji(guild, emoji);
    if (e) b.setEmoji(e);
    return b;
};

const mark = (ok, text) => `${ok ? "✅" : "❌"} ${text}`;
const ch = id => (id ? `<#${id}>` : "غير محدد");
const txt = t => (t ? "مخصص" : "افتراضي");

function dashboard(guild) {
    const c = load(guild.id);
    const i = key => V.icon(guild, key);

    const embed = new MessageEmbed()
        .setColor("#f5b942")
        .setAuthor({ name: `${guild.name} • لوحة تحكم التكت`, iconURL: guild.iconURL({ dynamic: true }) || undefined })
        .setDescription(
            `${i("tkcrown")} **كل إعدادات التكت من هنا**، اضغط الزر وجاوب في الشات (60 ثانية).\n` +
            "المتغيرات في النصوص: `{user}` `{number}` `{category}` `{staff}` `{ticket}` `{admin}`"
        )
        .addFields(
            { name: `${i("panel")} الرومات`, value: [mark(c.panelChannelId, `اللوحة: ${ch(c.panelChannelId)}`), mark(c.requestChannelId, `الريكوست: ${ch(c.requestChannelId)}`), mark(c.ticketCategoryId, `كاتيغوري التكت: ${ch(c.ticketCategoryId)}`)].join("\n"), inline: false },
            { name: `${i("support")} رتب الدعم`, value: mark(c.reviewerRoleIds.length, c.reviewerRoleIds.map(r => `<@&${r}>`).join(" ") || "غير محددة"), inline: false },
            { name: `${i("tkgold")} الأقسام (${c.categories.length})`, value: (c.categories.map(x => `${x.emoji || "•"} **${x.name}**`).join(" • ") || "ما فيه أقسام").slice(0, 1000), inline: false },
            { name: `${i("image")} الصور`, value: `اللوحة: ${c.panelImagePath ? "مخصصة" : "Vanr"} • الريكوست: ${c.requestImagePath ? "مخصصة" : "Vanr"}`, inline: true },
            { name: `${i("note")} النصوص`, value: `اللوحة: ${txt(c.panelText)} • الريكوست: ${txt(c.requestText)} • التكت: ${txt(c.ticketText)}\nDM القبول: ${txt(c.acceptedText)} • DM النقطة: ${txt(c.pointText)}`, inline: true }
        )
        .setFooter({ text: `${V.BRAND} • Ticket System` });

    const rows = [
        new MessageActionRow().addComponents(
            btn(guild, "tkc:panelch", "روم اللوحة", "SECONDARY", "panel"),
            btn(guild, "tkc:reqch", "روم الريكوست", "SECONDARY", "panel"),
            btn(guild, "tkc:cat", "كاتيغوري التكت", "SECONDARY", "folder"),
            btn(guild, "tkc:roles", "رتب الدعم", "SECONDARY", "support"),
            btn(guild, "tkc:sections", "الأقسام", "PRIMARY", "tkgold")
        ),
        new MessageActionRow().addComponents(
            btn(guild, "tkc:panelimg", "صورة اللوحة", "SECONDARY", "image"),
            btn(guild, "tkc:reqimg", "صورة الريكوست", "SECONDARY", "image"),
            btn(guild, "tkc:paneltxt", "نص اللوحة", "SECONDARY", "note"),
            btn(guild, "tkc:reqtxt", "نص الريكوست", "SECONDARY", "note"),
            btn(guild, "tkc:tickettxt", "نص التكت", "SECONDARY", "note")
        ),
        new MessageActionRow().addComponents(
            btn(guild, "tkc:acctxt", "DM القبول", "SECONDARY", "accept"),
            btn(guild, "tkc:pointtxt", "DM النقطة", "SECONDARY", "star"),
            btn(guild, "tkc:preview", "معاينة اللوحة", "SECONDARY", "eye"),
            btn(guild, "tkc:send", "إرسال اللوحة", "SUCCESS", "sparkle"),
            btn(guild, "tkc:close", "إغلاق", "DANGER", "close")
        ),
        new MessageActionRow().addComponents(
            btn(guild, "tkc:panelmode", c.panelMode === "image" ? "نمط اللوحة: صورة + أقسام" : "نمط اللوحة: إمبد", "PRIMARY", "image")
        )
    ];

    return { embeds: [embed], components: rows, content: null };
}

function sectionsView(guild, notice) {
    const c = load(guild.id);
    const i = key => V.icon(guild, key);

    const embed = new MessageEmbed()
        .setColor("#f5b942")
        .setAuthor({ name: `${guild.name} • أقسام التكت`, iconURL: guild.iconURL({ dynamic: true }) || undefined })
        .setDescription(
            (c.categories.map((x, n) => `**${n + 1}.** ${x.emoji || i("tkgold")} **${x.name}**${x.description ? ` — ${x.description}` : ""}${x.roleId ? ` • <@&${x.roleId}>` : ""}`).join("\n") || "ما فيه أقسام، اضغط **إضافة**.") +
            "\n\n**صيغة الإضافة:** `الاسم | الوصف | الإيموجي | @الرتبة` (كلها اختيارية ما عدا الاسم)"
        )
        .setFooter({ text: notice || `${V.BRAND} • Ticket System` });

    const rows = [];

    if (c.categories.length) {
        rows.push(new MessageActionRow().addComponents(
            new MessageSelectMenu().setCustomId("tkc:secpick").setPlaceholder("اختر قسم لتعديله أو حذفه")
                .addOptions(c.categories.slice(0, 25).map(x => ({ label: x.name.slice(0, 100), value: x.id, description: (x.description || "—").slice(0, 100) })))
        ));
    }

    rows.push(new MessageActionRow().addComponents(
        btn(guild, "tkc:secadd", "إضافة قسم", "SUCCESS", "adduser"),
        btn(guild, "tkc:home", "رجوع", "SECONDARY", "panel")
    ));

    return { embeds: [embed], components: rows, content: null };
}

function sectionView(guild, id) {
    const c = load(guild.id);
    const x = c.categories.find(s => s.id === id);
    if (!x) return sectionsView(guild, "القسم غير موجود");

    const embed = new MessageEmbed()
        .setColor("#f5b942")
        .setTitle(`${x.emoji || V.icon(guild, "tkgold")} ${x.name}`)
        .addFields(
            { name: "الوصف", value: x.description || "—", inline: false },
            { name: "الرتبة", value: x.roleId ? `<@&${x.roleId}>` : "الرتب العامة فقط", inline: true },
            { name: "الإيموجي", value: x.emoji || "افتراضي", inline: true }
        );

    return {
        embeds: [embed],
        components: [new MessageActionRow().addComponents(
            btn(guild, `tkc:secedit:${id}`, "تعديل", "PRIMARY", "edit"),
            btn(guild, `tkc:secdel:${id}`, "حذف", "DANGER", "trash"),
            btn(guild, "tkc:sections", "رجوع", "SECONDARY", "panel")
        )],
        content: null
    };
}

module.exports = { load, save, dashboard, sectionsView, sectionView, buildPanel, makePanelRows, downloadImage, restoreImages, cleanEmoji, IMAGES_DIR };
