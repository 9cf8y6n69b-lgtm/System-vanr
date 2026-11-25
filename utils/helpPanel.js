// ═══════════════════════════════════════════════
//  Vanr • واجهة الهيلب: تصفح كل الأوامر + بحث + تعديل (من نفس الهيلب)
// ═══════════════════════════════════════════════
const { MessageEmbed, MessageActionRow, MessageButton, MessageSelectMenu } = require("discord.js");
const CC = require("./cmdConfig");
const DESC = require("./cmdDescriptions");
const desc = c => c.description || DESC[c.name] || "";

const LABELS = {
    General: "العامة", Admin: "الإدارة", Channels: "الرومات", Owners: "الأونر", Protection: "الحماية",
    Roles: "الرولات", Security: "الأمان", Tickets: "التذاكر", Tweets: "التغريدات", Voice: "الصوت", XP: "الخبرة", avatars: "الأفتارات"
};
const PAGE = 25;
const color = "#2b2d31";

const label = dir => LABELS[dir] || dir;
const btn = (id, text, style = "SECONDARY", disabled = false) => new MessageButton().setCustomId(id).setLabel(text).setStyle(style).setDisabled(disabled);

function groups(client) {
    const map = {};
    for (const cmd of client.commands.values()) (map[cmd.directory || "General"] = map[cmd.directory || "General"] || []).push(cmd);
    for (const list of Object.values(map)) list.sort((a, b) => a.name.localeCompare(b.name));
    return map;
}

const short = (text, n) => (String(text || "").length > n ? `${String(text).slice(0, n - 1)}…` : String(text || ""));

function home(client, guild) {
    const map = groups(client);
    const total = client.commands.size;

    const embed = new MessageEmbed()
        .setColor(color)
        .setAuthor({ name: `${guild.name} • قائمة الأوامر`, iconURL: guild.iconURL({ dynamic: true }) || undefined })
        .setDescription(
            `عدد الأوامر: **${total}**\nاختر قسم من القائمة، أو اضغط **بحث** عشان تدور على أي أمر.\n` +
            "تقدر تعدل أي أمر من هنا (تعطيل، اختصارات، رتبة، روم) إذا كنت إداري.\n\n" +
            Object.keys(map).sort().map(dir => `• **${label(dir)}** — ${map[dir].length}`).join("\n")
        );

    const select = new MessageSelectMenu()
        .setCustomId("hp_cats")
        .setPlaceholder("اختر القسم")
        .addOptions(Object.keys(map).sort().slice(0, 25).map(dir => ({ label: label(dir), value: dir, description: `${map[dir].length} أمر` })));

    return {
        embeds: [embed],
        components: [new MessageActionRow().addComponents(select), new MessageActionRow().addComponents(btn("hp_search", "بحث", "PRIMARY"), btn("hp_close", "إغلاق", "DANGER"))]
    };
}

function listView(client, guild, title, commands, page, backId, pageIdPrefix) {
    const pages = Math.max(1, Math.ceil(commands.length / PAGE));
    const p = Math.min(Math.max(0, page), pages - 1);
    const slice = commands.slice(p * PAGE, p * PAGE + PAGE);

    const embed = new MessageEmbed()
        .setColor(color)
        .setTitle(title)
        .setDescription(
            slice.length
                ? slice.map(c => `${CC.get(guild.id, c.name).disabled ? "⛔" : "•"} \`${c.name}\`${desc(c) ? ` — ${short(desc(c), 60)}` : ""}`).join("\n")
                : "ما لقيت شي."
        )
        .setFooter({ text: `صفحة ${p + 1}/${pages} • اختر أمر من القائمة لعرضه وتعديله` });

    const rows = [];

    if (slice.length) {
        rows.push(new MessageActionRow().addComponents(
            new MessageSelectMenu().setCustomId("hp_cmd").setPlaceholder("اختر أمر")
                .addOptions(slice.map(c => ({ label: c.name.slice(0, 100), value: c.name.slice(0, 100), description: short(desc(c) || (c.aliases || []).join(" ، ") || "—", 90) })))
        ));
    }

    rows.push(new MessageActionRow().addComponents(
        btn(`${pageIdPrefix}:${p - 1}`, "السابق", "SECONDARY", p <= 0),
        btn(`${pageIdPrefix}:${p + 1}`, "التالي", "SECONDARY", p >= pages - 1),
        btn("hp_home", "الرئيسية", "PRIMARY"),
        btn("hp_search", "بحث", "SECONDARY")
    ));

    return { embeds: [embed], components: rows };
}

const category = (client, guild, dir, page = 0) =>
    listView(client, guild, `${label(dir)}`, groups(client)[dir] || [], page, "hp_home", `hp_pg:${dir}`);

function search(client, guild, query, page = 0) {
    const q = String(query).toLowerCase().trim();
    const found = [...client.commands.values()].filter(c => {
        const cfg = CC.get(guild.id, c.name);
        return c.name.toLowerCase().includes(q) ||
            (c.aliases || []).some(a => String(a).toLowerCase().includes(q)) ||
            cfg.aliases.some(a => a.includes(q)) ||
            String(desc(c)).toLowerCase().includes(q);
    }).sort((a, b) => a.name.localeCompare(b.name));

    return listView(client, guild, `نتائج البحث: ${short(query, 40)}`, found, page, "hp_home", `hp_sp:${encodeURIComponent(q).slice(0, 40)}`);
}

function command(client, guild, name, canEdit) {
    const cmd = client.commands.get(name);
    if (!cmd) return { embeds: [new MessageEmbed().setColor(color).setDescription("الأمر غير موجود.")], components: [] };

    const cfg = CC.get(guild.id, name);

    const embed = new MessageEmbed()
        .setColor(cfg.disabled ? "#ff5a5f" : color)
        .setTitle(`الأمر: ${cmd.name}`)
        .setDescription(desc(cmd) || "ما فيه وصف لهذا الأمر.")
        .addFields(
            { name: "القسم", value: label(cmd.directory || "General"), inline: true },
            { name: "الحالة", value: cfg.disabled ? "⛔ معطل" : "✅ شغال", inline: true },
            { name: "الاختصارات الأصلية", value: (cmd.aliases || []).map(a => `\`${a}\``).join(" ") || "—", inline: false },
            { name: "اختصارات أضفتها", value: cfg.aliases.map(a => `\`${a}\``).join(" ") || "—", inline: false },
            { name: "مقيّد بالرتبة", value: cfg.roleId ? `<@&${cfg.roleId}>` : "لا", inline: true },
            { name: "مقيّد بالروم", value: cfg.channelId ? `<#${cfg.channelId}>` : "لا", inline: true }
        );

    const rows = [];

    if (canEdit) {
        rows.push(new MessageActionRow().addComponents(
            btn(`hp_tg:${name}`, cfg.disabled ? "تفعيل الأمر" : "تعطيل الأمر", cfg.disabled ? "SUCCESS" : "DANGER"),
            btn(`hp_al:${name}`, "الاختصارات", "PRIMARY"),
            btn(`hp_rl:${name}`, "تقييد برتبة"),
            btn(`hp_ch:${name}`, "تقييد بروم"),
            btn(`hp_rs:${name}`, "إعادة ضبط")
        ));
    }

    rows.push(new MessageActionRow().addComponents(
        btn(`hp_pg:${cmd.directory || "General"}:0`, "رجوع للقسم"), btn("hp_home", "الرئيسية", "PRIMARY"), btn("hp_search", "بحث")
    ));

    return { embeds: [embed], components: rows };
}

module.exports = { home, category, search, command };
