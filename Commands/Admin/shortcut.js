// shortcut / اختصار — اختصار أي أمر بالكامل (مع كل وسائطه)
//   اختصار add ب ban          ← "ب @عضو" تصير "ban @عضو"
//   اختصار add م timeout 10m  ← "م @عضو" تصير "timeout 10m @عضو"
//   اختصار del ب   |   اختصار list
const { MessageEmbed } = require("discord.js");
const SC = require("../../utils/shortcuts");

const E = (t, c = "#2b2d31") => new MessageEmbed().setColor(c).setDescription(t);

module.exports = {
    name: "shortcut",
    aliases: ["اختصار", "اختصارات"],
    description: "اختصار أي أمر بالكامل مع وسائطه",

    run: async (client, message, args = []) => {
        if (!message.guild || !message.member.permissions.has("ADMINISTRATOR")) return message.react("❌").catch(() => {});
        const send = e => message.reply({ embeds: [e], allowedMentions: { repliedUser: false } });

        const sub = (args[0] || "list").toLowerCase();

        if (["add", "اضافة", "إضافة"].includes(sub)) {
            const word = (args[1] || "").toLowerCase();
            const full = args.slice(2).join(" ");
            if (!word || !full) return send(E("الاستخدام: `اختصار add <كلمة> <الأمر كامل>`\nمثال: `اختصار add ب ban`"));
            if (client.commands.has(word)) return send(E("هذي الكلمة اسم أمر أصلي، اختر كلمة ثانية."));
            SC.set(message.guild.id, word, full);
            return send(E(`✅ الحين \`${word}\` = \`${full}\``, "#2ecc71"));
        }

        if (["del", "remove", "حذف"].includes(sub)) {
            return send(E(SC.remove(message.guild.id, args[1] || "") ? "✅ انحذف الاختصار." : "ما لقيت هالاختصار."));
        }

        const map = SC.all(message.guild.id);
        return send(E(Object.keys(map).map(k => `\`${k}\` ← \`${map[k]}\``).join("\n") || "ما فيه اختصارات.\n`اختصار add <كلمة> <الأمر>`"));
    }
};
