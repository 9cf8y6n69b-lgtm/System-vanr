// ═══════════════════════════════════════════════
//  Vanr • أزرار وقوائم الهيلب (hp_*) — بدون حالة، تشتغل حتى بعد إعادة التشغيل
// ═══════════════════════════════════════════════
const client = require("../index");
const Panel = require("../utils/helpPanel");
const CC = require("../utils/cmdConfig");

const canEdit = member => member && (member.permissions.has("MANAGE_GUILD") || CC.owners.includes(member.id));

async function prompt(interaction, text) {
    await interaction.followUp({ content: text, ephemeral: true }).catch(() => {});

    const channel = interaction.channel;
    if (!channel) return null;

    const got = await channel
        .awaitMessages({ filter: m => m.author.id === interaction.user.id, max: 1, time: 60000 })
        .then(c => c.first()).catch(() => null);

    if (got) got.delete().catch(() => {});
    return got;
}

const clearWord = v => ["حذف", "off", "لا", "مسح"].includes(String(v).trim().toLowerCase());

client.on("interactionCreate", async interaction => {
    try {
        if (!interaction.guild || !(interaction.isButton() || interaction.isSelectMenu())) return;
        const id = String(interaction.customId);
        if (!id.startsWith("hp_")) return;

        const guild = interaction.guild;
        const edit = canEdit(interaction.member);
        const [action, ...rest] = id.split(":");
        const arg = rest.join(":");

        // ───── تنقل (تحديث الرسالة) ─────
        if (action === "hp_home") return interaction.update(Panel.home(client, guild));
        if (action === "hp_close") return interaction.update({ components: [], embeds: interaction.message.embeds });
        if (action === "hp_cats") return interaction.update(Panel.category(client, guild, interaction.values[0], 0));

        if (action === "hp_pg") {
            const [dir, page] = [rest.slice(0, -1).join(":"), parseInt(rest[rest.length - 1])];
            return interaction.update(Panel.category(client, guild, dir, page || 0));
        }

        if (action === "hp_sp") {
            const page = parseInt(rest[rest.length - 1]);
            const query = decodeURIComponent(rest.slice(0, -1).join(":"));
            return interaction.update(Panel.search(client, guild, query, page || 0));
        }

        if (action === "hp_cmd") return interaction.update(Panel.command(client, guild, interaction.values[0], edit));

        // ───── بحث (يسأل عن الكلمة) ─────
        if (action === "hp_search") {
            await interaction.deferUpdate();
            const got = await prompt(interaction, "اكتب اسم الأمر أو جزء منه أو وصفه:");
            if (!got) return;
            return interaction.editReply(Panel.search(client, guild, got.content));
        }

        // ───── تعديل الأوامر ─────
        const name = arg;
        const cmd = client.commands.get(name);
        if (!cmd) return interaction.reply({ content: "الأمر غير موجود.", ephemeral: true });

        if (!edit) return interaction.reply({ content: "التعديل للإداريين فقط (Manage Server).", ephemeral: true });

        if (action === "hp_tg") {
            CC.set(guild.id, name, { disabled: !CC.get(guild.id, name).disabled });
            return interaction.update(Panel.command(client, guild, name, true));
        }

        if (action === "hp_rs") {
            CC.reset(guild.id, name);
            return interaction.update(Panel.command(client, guild, name, true));
        }

        await interaction.deferUpdate();

        if (action === "hp_al") {
            const got = await prompt(interaction, `اكتب الاختصارات الجديدة للأمر \`${name}\` مفصولة بمسافة، أو \`حذف\` لمسحها:`);
            if (got) {
                if (clearWord(got.content)) {
                    CC.set(guild.id, name, { aliases: [] });
                } else {
                    const words = [...new Set(got.content.trim().toLowerCase().split(/\s+/))].filter(w => w && w.length <= 30).slice(0, 10);
                    const ok = words.filter(w => !CC.taken(client, guild.id, w, name));
                    const bad = words.filter(w => !ok.includes(w));

                    CC.set(guild.id, name, { aliases: ok });
                    if (bad.length) interaction.followUp({ content: `تجاهلت (مستخدمة لأمر ثاني): ${bad.join(" ")}`, ephemeral: true }).catch(() => {});
                }
            }
        } else if (action === "hp_rl") {
            const got = await prompt(interaction, `منشن الرتبة المسموح لها باستخدام \`${name}\`، أو \`حذف\` لإلغاء التقييد:`);
            if (got) {
                if (clearWord(got.content)) CC.set(guild.id, name, { roleId: null });
                else if (got.mentions.roles.first()) CC.set(guild.id, name, { roleId: got.mentions.roles.first().id });
            }
        } else if (action === "hp_ch") {
            const got = await prompt(interaction, `منشن الروم اللي يشتغل فيه \`${name}\` فقط، أو \`حذف\` لإلغاء التقييد:`);
            if (got) {
                if (clearWord(got.content)) CC.set(guild.id, name, { channelId: null });
                else if (got.mentions.channels.first()) CC.set(guild.id, name, { channelId: got.mentions.channels.first().id });
            }
        }

        return interaction.editReply(Panel.command(client, guild, name, true));
    } catch (error) {
        console.error("[HELP] error:", error);
        const msg = { content: `❌ خطأ في الهيلب: ${String(error.message).slice(0, 150)}`, ephemeral: true };
        (interaction.replied || interaction.deferred ? interaction.followUp(msg) : interaction.reply(msg)).catch(() => {});
    }
});
