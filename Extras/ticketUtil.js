const { MessageEmbed, MessageActionRow, MessageSelectMenu } = require("discord.js");
const db = require("pro.db");

const LINE = "━━━━━━━━━━━━━━━━━━━━";

const DEFAULTS = {
    category: null,   // كاتيغوري التذاكر
    requests: null,   // روم طلبات التذاكر
    log: null,        // روم لوق التذاكر (اختياري)
    staffRole: null,  // رول يقدر يقبل/يرفض (اختياري، الأدمن دائماً يقدر)
    title: "🎫 مركز الدعم والتذاكر",
    description:
        `**مرحباً بك في مركز الدعم** ✨\n${LINE}\n` +
        `› اختر القسم المناسب من القائمة بالأسفل\n` +
        `› سيصل طلبك للإدارة للمراجعة والقبول\n` +
        `› بعد القبول تُفتح لك تذكرة خاصة بك فقط\n${LINE}`,
    color: "#2b2d31",
    footer: "Vanr • Ticket System",
    placeholder: "📩 اختر نوع التذكرة",
    image: null,      // صورة اللوحة
    thumbnail: null,  // صورة صغيرة باللوحة
    banner: null,     // صورة داخل التذكرة
    welcome: "مرحباً {user} 👋\nتم قبول طلبك وسيتم خدمتك من قبل {staff}.\nاشرح طلبك بالتفصيل وأرفق الصور إذا لزم.",
    options: [],      // [{ id, label, desc, emoji }]
    transfers: [],    // [{ id, targetId, kind: "role" | "user", label, emoji }]
};

function getCfg(gid) {
    const saved = db.get(`tk_cfg_${gid}`) || {};
    return { ...DEFAULTS, ...saved, options: saved.options || [], transfers: saved.transfers || [] };
}

function saveCfg(gid, cfg) {
    db.set(`tk_cfg_${gid}`, cfg);
}

// يضيف الفوتر والوقت لأي إمبد
function brand(embed, guild, cfg) {
    return embed.setFooter(cfg.footer, guild.iconURL({ dynamic: true }) || undefined).setTimestamp();
}

// لوحة التذاكر (الإمبد + القائمة)
function buildPanel(guild, cfg) {
    const embed = new MessageEmbed()
        .setColor(cfg.color)
        .setTitle(cfg.title)
        .setDescription(cfg.description);

    const thumb = cfg.thumbnail || guild.iconURL({ dynamic: true });
    if (thumb) embed.setThumbnail(thumb);
    if (cfg.image) embed.setImage(cfg.image);
    brand(embed, guild, cfg);

    const menu = new MessageSelectMenu()
        .setCustomId("tk_open")
        .setPlaceholder(cfg.placeholder)
        .addOptions(
            cfg.options.map(o => ({
                label: o.label,
                description: o.desc || undefined,
                value: o.id,
                emoji: o.emoji || undefined,
            }))
        );

    return { embeds: [embed], components: [new MessageActionRow().addComponents(menu)] };
}

// يقبل إيموجي عادي أو مخصص فقط
function cleanEmoji(e) {
    if (!e) return null;
    e = e.trim();
    if (/^<a?:\w+:\d+>$/.test(e)) return e;
    if (/^\p{Extended_Pictographic}/u.test(e)) return e;
    return null;
}

const isUrl = (s) => /^https?:\/\/\S+$/i.test(s);

module.exports = { LINE, DEFAULTS, getCfg, saveCfg, brand, buildPanel, cleanEmoji, isUrl };
