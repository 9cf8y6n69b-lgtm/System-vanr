// ═══════════════════════════════════════════════
//  Voki • أزرار الرول الشخصي (pr_*) — كل الردود مخفية
// ═══════════════════════════════════════════════
const client = require("../index");
const PR = require("../utils/personalRoles");
const Panel = require("../utils/personalPanel");

const ask = async (interaction, text) => {
    await interaction.followUp({ content: text, ephemeral: true }).catch(() => {});
    const got = await interaction.channel
        .awaitMessages({ filter: m => m.author.id === interaction.user.id, max: 1, time: 60000 })
        .then(c => c.first()).catch(() => null);
    if (got) got.delete().catch(() => {});
    return got;
};

const note = (interaction, content) => interaction.followUp({ content, ephemeral: true }).catch(() => {});

client.on("interactionCreate", async interaction => {
    try {
        if (!interaction.guild || !interaction.isButton()) return;
        const id = String(interaction.customId);
        if (!id.startsWith("pr_")) return;

        const [action, owner] = id.split(":");
        const guild = interaction.guild;

        // فتح اللوحة من الرسالة العامة (لصاحب الأمر فقط)
        if (action === "pr_open") {
            if (owner !== interaction.user.id) return interaction.reply({ content: "هذا الزر مو لك.", ephemeral: true });
            return interaction.reply({ ...Panel.main(guild, interaction.user.id), ephemeral: true });
        }

        const roleId = PR.getRoleId(guild.id, interaction.user.id);
        const role = roleId && guild.roles.cache.get(roleId);
        if (!role) return interaction.reply({ content: "ما عندك رول شخصي.", ephemeral: true });

        const me = guild.me;
        if (!me.permissions.has("MANAGE_ROLES") || role.position >= me.roles.highest.position) {
            return interaction.reply({ content: "رتبة البوت لازم تكون أعلى من رولك.", ephemeral: true });
        }

        if (action === "pr_list") {
            const names = role.members.map(m => `${m}`).slice(0, 60).join(" ") || "ما أحد.";
            return interaction.reply({ content: `**الحاملين (${role.members.size}):**\n${names}`, ephemeral: true, allowedMentions: { parse: [] } });
        }

        if (action === "pr_del") {
            await interaction.update({ components: [], embeds: [], content: "جاري الحذف..." });
            await role.delete(`Voki: صاحب الرول (${interaction.user.tag}) حذفه`).catch(() => {});
            PR.clear(guild.id, interaction.user.id);
            return interaction.editReply({ content: "✅ انحذف رولك." });
        }

        await interaction.deferUpdate();
        const refresh = () => interaction.editReply(Panel.main(guild, interaction.user.id)).catch(() => {});

        if (action === "pr_color") {
            const got = await ask(interaction, "اكتب اللون بصيغة hex مثل `#ff66aa`:");
            const hex = got && got.content.trim().match(/^#?([0-9a-f]{6})$/i);
            if (!hex) return got ? note(interaction, "لون غير صحيح.") : null;
            await role.setColor(`#${hex[1]}`).catch(() => note(interaction, "ما قدرت أغير اللون."));
            return refresh();
        }

        if (action === "pr_name") {
            const got = await ask(interaction, "اكتب الاسم الجديد:");
            if (!got) return;
            const name = got.content.trim().slice(0, 100);
            if (!name) return;
            await role.setName(name).catch(() => note(interaction, "ما قدرت أغير الاسم."));
            return refresh();
        }

        if (action === "pr_emoji") {
            const got = await ask(interaction, "اكتب الإيموجي (أو أرسل صورة للأيقونة لو السيرفر يدعمها):");
            if (!got) return;

            const image = got.attachments.first()?.url;
            const text = got.content.trim();
            const custom = text.match(/<a?:\w+:(\d+)>/);
            const canIcon = guild.features.includes("ROLE_ICONS");

            if (canIcon) {
                const ok = await role.setIcon(image || (custom ? client.emojis.cache.get(custom[1]) || undefined : text) || null).then(() => true).catch(() => false);
                if (ok) return refresh();
            }

            // السيرفر ما يدعم أيقونة الرول: نضيف الإيموجي على الاسم
            const emoji = custom ? null : (text.match(/\p{Extended_Pictographic}/u) || [])[0];
            if (emoji && !role.name.includes(emoji)) {
                await role.setName(`${emoji} ${role.name}`.slice(0, 100)).catch(() => {});
                await note(interaction, "السيرفر ما يدعم أيقونات الرولات، فأضفته على الاسم.");
            } else {
                await note(interaction, "ما قدرت أضيف الإيموجي.");
            }
            return refresh();
        }

        if (action === "pr_give" || action === "pr_take") {
            const got = await ask(interaction, action === "pr_give" ? "منشن العضو اللي تبي تعطيه الرول:" : "منشن العضو اللي تبي تسحب منه الرول:");
            const target = got && (got.mentions.members.first() || guild.members.cache.get((got.content.match(/\d{15,}/) || [])[0]));
            if (!target) return got ? note(interaction, "ما لقيت العضو.") : null;

            if (action === "pr_give") await target.roles.add(role, "Voki: صاحب الرول أعطاه").catch(() => note(interaction, "ما قدرت."));
            else if (target.id === interaction.user.id) await note(interaction, "ما تقدر تسحب رولك من نفسك، احذفه بدلها.");
            else await target.roles.remove(role, "Voki: صاحب الرول سحبه").catch(() => note(interaction, "ما قدرت."));

            return refresh();
        }
    } catch (error) {
        console.error("[PROLE] error:", error);
    }
});
