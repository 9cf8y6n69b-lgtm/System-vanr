// ═══════════════════════════════════════════════
//  Vanr • قوائم الألوان (دائمة — تشتغل بعد إعادة التشغيل ولا تنتهي مدتها)
//  تتعامل مع أي قائمة customId حقها color_pick_*
// ═══════════════════════════════════════════════
const client = require("../index");
const { MessageEmbed } = require("discord.js");

const isColorRole = role => /^\d+$/.test(role.name);

client.on("interactionCreate", async interaction => {
    try {
        if (!interaction.guild || !interaction.isSelectMenu()) return;
        if (!String(interaction.customId).startsWith("color_pick_")) return;

        await interaction.deferReply({ ephemeral: true }).catch(() => {});

        const role = interaction.guild.roles.cache.get(interaction.values[0]);

        if (!role || !isColorRole(role)) {
            return interaction.editReply({ content: "هذا اللون غير موجود." });
        }

        if (!role.editable) {
            return interaction.editReply({
                content: "ما أقدر أعطيك هذا اللون، لازم رتبة البوت تكون أعلى من رتب الألوان."
            });
        }

        const member = await interaction.guild.members.fetch(interaction.user.id);

        // شيل ألوانه القديمة (كلها بطلبة وحدة)
        const old = member.roles.cache.filter(r => isColorRole(r) && r.id !== role.id);

        if (old.size) {
            await member.roles.remove([...old.keys()]).catch(error =>
                console.error("[colors] remove error:", error.message)
            );
        }

        if (!member.roles.cache.has(role.id)) {
            await member.roles.add(role);
        }

        // رجّع القائمة لوضعها الطبيعي (ما تبقى معلّقة على الخيار)
        if (interaction.message && interaction.message.editable) {
            await interaction.message
                .edit({ components: interaction.message.components })
                .catch(() => {});
        }

        return interaction.editReply({
            embeds: [
                new MessageEmbed()
                    .setColor(role.color || "#2b2d31")
                    .setDescription(`✦ تم تغيير لونك إلى **${role.name}**`)
            ]
        });
    } catch (error) {
        console.error("[colors] error:", error);

        const payload = { content: "صار خطأ أثناء تغيير اللون." };

        if (interaction.deferred || interaction.replied) {
            interaction.editReply(payload).catch(() => {});
        } else {
            interaction.reply({ ...payload, ephemeral: true }).catch(() => {});
        }
    }
});
