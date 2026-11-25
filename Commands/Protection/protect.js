// protect <ميزة> on/off   |   protect all on/off   |   protect list
const { MessageEmbed } = require("discord.js");
const P = require("../../utils/protection");

module.exports = {
    name: "protect",
    aliases: ["حماية", "تحكم"],
    run: async (client, message, args = []) => {
        if (!message.member.permissions.has("ADMINISTRATOR") && !P.OWNERS.includes(message.author.id)) {
            return message.react("❌");
        }

        const g = message.guild.id;
        const first = (args[0] || "").toLowerCase();
        const state = (args[1] || "").toLowerCase();

        if (!first || first === "list") {
            const lines = Object.entries(P.FEATURES).map(([key, f]) => `\`${key}\` • ${f.label} ${P.isOn(g, key) ? "🟢" : "🔴"}`);

            return message.reply({
                embeds: [
                    new MessageEmbed()
                        .setColor("#2b2d31")
                        .setTitle("Vanr • التحكم بالحماية")
                        .setDescription(lines.join("\n") + "\n\n`protect <اسم> on` أو `off`\n`protect all on` تفعيل الكل (بدون sechard)")
                ]
            });
        }

        if (state !== "on" && state !== "off") {
            return message.reply("الاستخدام: `protect <اسم> on|off` — مثال: `protect antidelete on`");
        }

        const value = state === "on";

        if (first === "all" || first === "الكل") {
            for (const key of Object.keys(P.FEATURES)) {
                if (key === "sechard") continue;
                P.setOn(g, key, value);
            }

            return message.reply(`${value ? "✅ تم تفعيل" : "❎ تم تعطيل"} كل الحمايات (ما عدا الحماية القصوى).`);
        }

        const key = P.resolveFeature(first);

        if (!key) {
            return message.reply("اسم الحماية غير معروف. اكتب `protect list` لرؤية الأسماء.");
        }

        P.setOn(g, key, value);

        if (value && key === "servername") require("pro.db").set(`servername_value = ${g}`, message.guild.name);

        return message.reply(`${value ? "✅ تم تفعيل" : "❎ تم تعطيل"} **${P.FEATURES[key].label}**`);
    }
};
