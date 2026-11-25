// status — حالة الحماية بشكل دقيق (تقرأ نفس مفاتيح محرك الحماية)
const { MessageEmbed } = require("discord.js");
const Pro = require("pro.db");
const P = require("../../utils/protection");

module.exports = {
    name: "status",
    aliases: ["حالةالحماية", "pslist", "حمايتي"],
    run: async (client, message) => {
        if (!message.member.permissions.has("ADMINISTRATOR")) return message.react("❌");

        const g = message.guild.id;
        const on = [];
        const off = [];

        for (const [key, feature] of Object.entries(P.FEATURES)) {
            (P.isOn(g, key) ? on : off).push(`\`${key}\` • ${feature.label}`);
        }

        const logId = Pro.get(`security_log = ${g}`);
        const punishment = P.isOn(g, "sechard") ? "باند" : "سحب الصلاحيات الخطيرة + تايم أوت ساعة";

        const embed = new MessageEmbed()
            .setColor(Pro.get(`Guild_Color = ${g}`) || "#2b2d31")
            .setAuthor({ name: `${message.guild.name} • حالة الحماية`, iconURL: message.guild.iconURL({ dynamic: true }) || undefined })
            .addField("مفعّل", on.length ? on.join("\n") : "لا يوجد", false)
            .addField("معطّل", off.length ? off.join("\n") : "لا يوجد", false)
            .addField(
                "الإعدادات",
                [
                    `حد الأكشنز: \`${P.getLimit(g)}\` خلال \`${P.getWindowSec(g)}\` ثانية`,
                    `العقاب: ${punishment}`,
                    `إجراء الحسابات الجديدة: \`${P.getRaidAction(g)}\` (أقل من \`${P.getJoinDays(g)}\` يوم)`,
                    `لوق الحماية: ${logId ? `<#${logId}>` : "غير محدد (setsecurity)"}`,
                    `مستثنين عاديين: \`${P.getBasicList(g).length}\` • متقدمين: \`${P.getAdvancedList(g).length}\``
                ].join("\n")
            )
            .setFooter({ text: "protect <اسم> on/off  •  protect all on/off" })
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    }
};
