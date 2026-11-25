// Voki • لوحة الفلاتر (إيمبد + أزرار)
const { MessageEmbed, MessageActionRow, MessageButton, MessageSelectMenu } = require("discord.js");
const F = require("./filters");

const btn = (id, label, style = "SECONDARY") => new MessageButton().setCustomId(id).setLabel(label).setStyle(style);
const state = on => (on ? "🟢 شغال" : "🔴 مطفي");

function home(guild) {
    const c = F.get(guild.id);

    const embed = new MessageEmbed()
        .setColor("#e74c3c")
        .setAuthor({ name: `${guild.name} • فلاتر الرسائل`, iconURL: guild.iconURL({ dynamic: true }) || undefined })
        .setDescription("الإداريين مستثنين تلقائياً. كل مخالفة تنسجل في لوق **فلاتر الرسائل**.")
        .addFields(
            { name: `الكلمات المحظورة • ${state(c.words.enabled)}`, value: `العدد: **${c.words.list.length}**\n1️⃣ ${F.label(c.words.punish[0])}\n2️⃣ ${F.label(c.words.punish[1])}\n3️⃣ ${F.label(c.words.punish[2])}\n*(المخالفات تتصفر بعد 24 ساعة)*`, inline: false },
            { name: `النص المتكرر • ${state(c.spam.enabled)}`, value: `${c.spam.count} رسائل متشابهة خلال ${c.spam.seconds} ثانية\nالعقوبة: ${F.label(c.spam.punish)}`, inline: true },
            { name: `دعوات ديسكورد • ${state(c.invites.enabled)}`, value: `العقوبة: ${F.label(c.invites.punish)}`, inline: true },
            { name: `الروابط الخارجية • ${state(c.links.enabled)}`, value: `العقوبة: ${F.label(c.links.punish)}\nمسموح: ${c.links.allow.slice(0, 8).join(", ") || "—"}`, inline: true }
        );

    return {
        embeds: [embed],
        content: null,
        components: [
            new MessageActionRow().addComponents(btn("flt:words", "الكلمات (إضافة/حذف)", "PRIMARY"), btn("flt:wpun", "عقوبات الكلمات 1-2-3", "PRIMARY"), btn("flt:wtoggle", c.words.enabled ? "إطفاء الكلمات" : "تشغيل الكلمات", c.words.enabled ? "DANGER" : "SUCCESS")),
            new MessageActionRow().addComponents(btn("flt:spam", "النص المتكرر"), btn("flt:invites", "دعوات ديسكورد"), btn("flt:links", "الروابط الخارجية"), btn("flt:allow", "الروابط المسموحة")),
            new MessageActionRow().addComponents(btn("flt:close", "إغلاق", "DANGER"))
        ]
    };
}

// قائمة اختيار عقوبة (ephemeral)
const punishSelect = (id, withOff) => new MessageActionRow().addComponents(
    new MessageSelectMenu().setCustomId(id).setPlaceholder("اختر العقوبة")
        .addOptions([
            ...(withOff ? [{ label: "إيقاف الفلتر", value: "off", emoji: "🔴" }] : []),
            ...Object.entries(F.PUNISH).map(([value, label]) => ({ label, value }))
        ])
);

module.exports = { home, punishSelect };
