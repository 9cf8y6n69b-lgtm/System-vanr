const { MessageEmbed } = require("discord.js");
const db = require("pro.db");

module.exports = {
    name: "alias",
    description: "إدارة اختصارات الأوامر",
    type: "CHAT_INPUT",
    options: [
        {
            name: "add",
            description: "إضافة اختصار لأمر",
            type: "SUB_COMMAND",
            options: [
                { name: "shortcut", description: "الاختصار (مثال: تحذير)", type: "STRING", required: true },
                { name: "command", description: "اسم الأمر الأصلي (مثال: warn)", type: "STRING", required: true },
            ],
        },
        {
            name: "remove",
            description: "حذف اختصار",
            type: "SUB_COMMAND",
            options: [
                { name: "shortcut", description: "الاختصار المراد حذفه", type: "STRING", required: true },
            ],
        },
        {
            name: "list",
            description: "عرض كل الاختصارات",
            type: "SUB_COMMAND",
        },
    ],

    run: async (client, interaction) => {
        // لو انكتب كأمر عادي بالبريفكس (مو سلاش)
        if (!interaction.options || typeof interaction.options.getSubcommand !== "function") {
            return interaction.reply("**⚠️ استخدم الأمر بالسلاش: `/alias`**").catch(() => {});
        }

        // للأدمن فقط
        if (!interaction.member.permissions.has("ADMINISTRATOR")) {
            return interaction.reply({ content: "**❌ هذا الأمر للإدارة فقط**", ephemeral: true }).catch(() => {});
        }

        const guildId = interaction.guild.id;
        const key = `Aliases = [${guildId}]`;
        const aliases = db.get(key) || {};
        const sub = interaction.options.getSubcommand();
        const Color = db.get(`Guild_Color = ${guildId}`) || "#000000";

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // إضافة اختصار
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        if (sub === "add") {
            const shortcut = interaction.options.getString("shortcut").trim().toLowerCase();
            const command = interaction.options.getString("command").trim().toLowerCase();

            if (/\s/.test(shortcut)) {
                return interaction.reply({ content: "**❌ الاختصار لازم يكون كلمة وحدة بدون مسافات**", ephemeral: true }).catch(() => {});
            }

            // تأكد إن الأمر الأصلي موجود (إذا البوت يخزن الأوامر في client.commands)
            if (client.commands && typeof client.commands.get === "function") {
                const exists =
                    client.commands.get(command) ||
                    (typeof client.commands.find === "function" &&
                        client.commands.find(c => c.name === command || (c.aliases && c.aliases.includes(command))));
                if (!exists) {
                    return interaction.reply({ content: `**❌ ما فيه أمر اسمه \`${command}\`**`, ephemeral: true }).catch(() => {});
                }

                // لا تسمح باختصار يتعارض مع أمر موجود
                const clash = client.commands.get(shortcut);
                if (clash) {
                    return interaction.reply({ content: `**❌ \`${shortcut}\` اسم أمر موجود، اختر اختصاراً ثانياً**`, ephemeral: true }).catch(() => {});
                }
            }

            if (aliases[shortcut]) {
                return interaction.reply({ content: `**⚠️ الاختصار \`${shortcut}\` موجود (يشغّل \`${aliases[shortcut]}\`). احذفه أولاً لو تبي تغيّره**`, ephemeral: true }).catch(() => {});
            }

            aliases[shortcut] = command;
            db.set(key, aliases);

            return interaction.reply({ content: `**✅ تم: \`${shortcut}\` ← \`${command}\`**`, ephemeral: true }).catch(() => {});
        }

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // حذف اختصار
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        if (sub === "remove") {
            const shortcut = interaction.options.getString("shortcut").trim().toLowerCase();
            if (!aliases[shortcut]) {
                return interaction.reply({ content: `**❌ ما فيه اختصار اسمه \`${shortcut}\`**`, ephemeral: true }).catch(() => {});
            }
            delete aliases[shortcut];
            db.set(key, aliases);
            return interaction.reply({ content: `**🗑 تم حذف الاختصار \`${shortcut}\`**`, ephemeral: true }).catch(() => {});
        }

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // عرض الاختصارات
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        if (sub === "list") {
            const entries = Object.entries(aliases);
            const text = entries.length
                ? entries.map(([s, c]) => `\`${s}\` ← \`${c}\``).join("\n")
                : "ما فيه اختصارات";

            const embed = new MessageEmbed()
                .setColor(Color)
                .setTitle("⚙ اختصارات الأوامر")
                .setDescription(text.length > 4000 ? text.slice(0, 4000) + "..." : text)
                .setFooter("Vanr", client.user.displayAvatarURL())
                .setTimestamp();

            return interaction.reply({ embeds: [embed], ephemeral: true }).catch(() => {});
        }
    },
};
