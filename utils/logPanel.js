// Voki • لوحة اللوقات (!log): كل لوق له روم، تختاره من الإيمبد
const Pro = require("pro.db");
const { MessageEmbed, MessageActionRow, MessageButton, MessageSelectMenu } = require("discord.js");
const LOG_TYPES = require(`${process.cwd()}/Extras/logTypes`);

const cfgKey = g => `lg_cfg_${g}`;
const getCfg = g => { const c = Pro.get(cfgKey(g)) || {}; return { ...c, types: c.types || {} }; };
const saveCfg = (g, c) => Pro.set(cfgKey(g), c);
const setRoom = (g, key, id) => { const c = getCfg(g); if (id) c.types[key] = id; else delete c.types[key]; saveCfg(g, c); };
const setAll = (g, id) => { const c = getCfg(g); for (const t of LOG_TYPES) c.types[t.key] = id; saveCfg(g, c); };

const btn = (id, label, style = "SECONDARY") => new MessageButton().setCustomId(id).setLabel(label).setStyle(style);

function home(guild) {
    const c = getCfg(guild.id);
    const done = LOG_TYPES.filter(t => c.types[t.key] && guild.channels.cache.has(c.types[t.key])).length;

    const lines = LOG_TYPES.map(t => {
        const id = c.types[t.key];
        return `${t.emoji} **${t.label}** ← ${id && guild.channels.cache.has(id) ? `<#${id}>` : "❌"}`;
    });

    const embed = new MessageEmbed()
        .setColor("#2b2d31")
        .setAuthor({ name: `${guild.name} • اللوقات`, iconURL: guild.iconURL({ dynamic: true }) || undefined })
        .setDescription(`مفعل **${done}/${LOG_TYPES.length}** — اختر لوق من القوائم تحت وحدد له روم.\n\n${lines.join("\n")}`.slice(0, 4000));

    const half = Math.ceil(LOG_TYPES.length / 2);
    const rows = [LOG_TYPES.slice(0, half), LOG_TYPES.slice(half)].map((group, i) =>
        new MessageActionRow().addComponents(
            new MessageSelectMenu().setCustomId(`lgp:pick${i}`).setPlaceholder(`اختر لوق (${i + 1}/2)`)
                .addOptions(group.map(t => ({ label: t.label, value: t.key, emoji: t.emoji })))
        )
    );

    rows.push(new MessageActionRow().addComponents(
        btn("lgp:all", "كل اللوقات في روم واحد", "PRIMARY"),
        btn("lgp:prison", "رول السجن"),
        btn("lgp:close", "إغلاق", "DANGER")
    ));

    return { embeds: [embed], components: rows, content: null };
}

function detail(guild, key) {
    const t = LOG_TYPES.find(x => x.key === key);
    if (!t) return home(guild);
    const c = getCfg(guild.id);
    const id = c.types[key];

    const embed = new MessageEmbed()
        .setColor(t.color)
        .setTitle(`${t.emoji} ${t.label}`)
        .setDescription(`الروم الحالي: ${id && guild.channels.cache.has(id) ? `<#${id}>` : "❌ غير محدد"}`);

    return {
        embeds: [embed],
        components: [new MessageActionRow().addComponents(
            btn(`lgp:set:${key}`, "اختيار الروم", "PRIMARY"),
            btn(`lgp:new:${key}`, "إنشاء روم جديد", "SUCCESS"),
            btn(`lgp:off:${key}`, "إيقاف", "DANGER"),
            btn("lgp:home", "رجوع")
        )],
        content: null
    };
}

module.exports = { home, detail, getCfg, saveCfg, setRoom, setAll, LOG_TYPES };
