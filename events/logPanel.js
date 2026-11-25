// Voki • تفاعلات لوحة اللوقات (lgp:*)
const client = require("../index");
const { MessageEmbed } = require("discord.js");
const LP = require("../utils/logPanel");

const E = (t, c = "#2b2d31") => new MessageEmbed().setColor(c).setDescription(String(t));
const slug = k => k.replace(/([A-Z])/g, "-$1").toLowerCase();

async function ask(interaction, text) {
    await interaction.followUp({ embeds: [E(text)], ephemeral: true }).catch(() => {});
    const got = await interaction.channel
        .awaitMessages({ filter: m => m.author.id === interaction.user.id, max: 1, time: 60000 })
        .then(c => c.first()).catch(() => null);
    if (got) got.delete().catch(() => {});
    return got;
}

client.on("interactionCreate", async interaction => {
    try {
        const id = String(interaction.customId || "");
        if (!interaction.guild || !id.startsWith("lgp:") || !(interaction.isButton() || interaction.isSelectMenu())) return;

        if (!interaction.member.permissions.has("ADMINISTRATOR")) {
            return interaction.reply({ embeds: [E("للإداريين فقط.", "#e74c3c")], ephemeral: true });
        }

        const guild = interaction.guild;
        const [, action, key] = id.split(":");

        if (action === "pick0" || action === "pick1") return interaction.update(LP.detail(guild, interaction.values[0]));
        if (action === "home") return interaction.update(LP.home(guild));
        if (action === "close") return interaction.update({ components: [] });

        if (action === "off") {
            LP.setRoom(guild.id, key, null);
            return interaction.update(LP.detail(guild, key));
        }

        if (action === "new") {
            const t = LP.LOG_TYPES.find(x => x.key === key);
            let category = guild.channels.cache.find(c => c.type === "GUILD_CATEGORY" && c.name === "LOGS");
            if (!category) category = await guild.channels.create("LOGS", { type: "GUILD_CATEGORY", permissionOverwrites: [{ id: guild.roles.everyone, deny: ["VIEW_CHANNEL"] }] }).catch(() => null);
            const room = await guild.channels.create(slug(t.key), { type: "GUILD_TEXT", parent: category || undefined }).catch(() => null);
            if (!room) return interaction.reply({ embeds: [E("ما قدرت أنشئ الروم (Manage Channels).", "#e74c3c")], ephemeral: true });
            LP.setRoom(guild.id, key, room.id);
            return interaction.update(LP.detail(guild, key));
        }

        // أسئلة (اختيار روم / كل اللوقات / رول السجن)
        await interaction.deferUpdate();

        if (action === "set" || action === "all") {
            const got = await ask(interaction, action === "all" ? "منشن الروم اللي تبي كل اللوقات تنزل فيه:" : "منشن الروم لهذا اللوق:");
            if (!got) return;
            const room = got.mentions.channels.first() || guild.channels.cache.get((got.content.match(/\d{15,}/) || [])[0]);
            if (!room || !room.isText()) { await interaction.followUp({ embeds: [E("ما لقيت الروم.", "#e74c3c")], ephemeral: true }).catch(() => {}); return; }
            if (action === "all") { LP.setAll(guild.id, room.id); return interaction.editReply(LP.home(guild)); }
            LP.setRoom(guild.id, key, room.id);
            return interaction.editReply(LP.detail(guild, key));
        }

        if (action === "prison") {
            const got = await ask(interaction, "منشن رول السجن (أو اكتب `حذف`):");
            if (!got) return;
            const c = LP.getCfg(guild.id);
            c.prisonRole = /حذف|off/i.test(got.content) ? null : (got.mentions.roles.first() || {}).id || c.prisonRole;
            LP.saveCfg(guild.id, c);
            return interaction.editReply(LP.home(guild));
        }
    } catch (error) {
        console.error("[LOG PANEL]", error);
        const msg = { embeds: [E(`خطأ: ${String(error.message).slice(0, 150)}`, "#e74c3c")], ephemeral: true };
        (interaction.replied || interaction.deferred ? interaction.followUp(msg) : interaction.reply(msg)).catch(() => {});
    }
});
