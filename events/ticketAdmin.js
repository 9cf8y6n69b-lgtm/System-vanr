// ═══════════════════════════════════════════════
//  Voki • أزرار لوحة تحكم التكت (tkc:*)
// ═══════════════════════════════════════════════
const client = require("../index");
const { MessageEmbed } = require("discord.js");
const TA = require("../utils/ticketAdmin");
const V = require("../utils/voki");

const E = (text, color = "#f5b942") => new MessageEmbed().setColor(color).setDescription(String(text));

const isAdmin = member => member && member.permissions.has("ADMINISTRATOR");
const skip = v => ["تخطي", "حذف", "مسح", "off"].includes(String(v).trim().toLowerCase());

async function prompt(interaction, text) {
    await interaction.followUp({ embeds: [E(`${text}\n*اكتب \`تخطي\` للمسح أو الرجوع للافتراضي.*`)], ephemeral: true }).catch(() => {});

    const got = await interaction.channel
        .awaitMessages({ filter: m => m.author.id === interaction.user.id, max: 1, time: 60000 })
        .then(c => c.first()).catch(() => null);

    if (got) got.delete().catch(() => {});
    return got;
}

const note = (interaction, text, color) => interaction.followUp({ embeds: [E(text, color)], ephemeral: true }).catch(() => {});

function findCategoryChannel(guild, input) {
    const t = input.trim();
    if (/^\d{15,25}$/.test(t)) { const c = guild.channels.cache.get(t); if (c && c.type === "GUILD_CATEGORY") return c; }
    return guild.channels.cache.find(c => c.type === "GUILD_CATEGORY" && c.name.toLowerCase() === t.toLowerCase()) || null;
}

const channelFrom = (guild, got) => got.mentions.channels.first() || guild.channels.cache.get((got.content.match(/\d{15,}/) || [])[0]);

// يحلل: الاسم | الوصف | إيموجي | @رتبة
function parseSection(got) {
    const parts = got.content.split("|").map(s => s.trim());
    const out = { name: (parts[0] || "").slice(0, 80), description: "", emoji: null, roleId: null };

    for (const part of parts.slice(1)) {
        const role = (part.match(/<@&(\d+)>/) || [])[1];
        if (role) { out.roleId = role; continue; }
        const emoji = TA.cleanEmoji(part);
        if (emoji) { out.emoji = emoji; continue; }
        if (part) out.description = part.slice(0, 100);
    }

    const mentionRole = got.mentions.roles.first();
    if (mentionRole) out.roleId = mentionRole.id;
    return out;
}

client.once("ready", () => { try { TA.restoreImages(client); } catch (e) { console.error("[TICKET] restore images:", e.message); } });

client.on("interactionCreate", async interaction => {
    try {
        const id = String(interaction.customId || "");
        if (!interaction.guild || !id.startsWith("tkc:") || !(interaction.isButton() || interaction.isSelectMenu())) return;

        if (!isAdmin(interaction.member)) return interaction.reply({ embeds: [E("لوحة التحكم للإداريين فقط.", "#e74c3c")], ephemeral: true });

        const guild = interaction.guild;
        const [, action, arg] = id.split(":");

        // ───── تنقل ─────
        if (action === "home") return interaction.update(TA.dashboard(guild));
        if (action === "close") return interaction.update({ components: [] });
        if (action === "sections") return interaction.update(TA.sectionsView(guild));
        if (action === "secpick") return interaction.update(TA.sectionView(guild, interaction.values[0]));

        // ───── بدون سؤال ─────
        if (action === "preview") {
            const cfg = TA.load(guild.id);
            return interaction.reply({ ...TA.buildPanel(guild, cfg), ephemeral: true });
        }

        if (action === "send") {
            const cfg = TA.load(guild.id);
            const target = guild.channels.cache.get(cfg.panelChannelId);
            if (!target) return interaction.reply({ embeds: [E("حدد روم اللوحة أول.", "#e74c3c")], ephemeral: true });
            if (!cfg.categories.length) return interaction.reply({ embeds: [E("أضف قسم واحد على الأقل أول.", "#e74c3c")], ephemeral: true });
            if (!cfg.requestChannelId) return interaction.reply({ embeds: [E("حدد روم الريكوست أول.", "#e74c3c")], ephemeral: true });

            const ok = await target.send(TA.buildPanel(guild, cfg)).then(() => true).catch(() => false);
            return interaction.reply({ embeds: [E(ok ? `${V.icon(guild, "verified")} انرسلت اللوحة في ${target}` : "ما قدرت أرسل في الروم (تأكد من صلاحيات البوت).", ok ? "#2ecc71" : "#e74c3c")], ephemeral: true });
        }

        if (action === "secdel") {
            const cfg = TA.load(guild.id);
            cfg.categories = cfg.categories.filter(c => c.id !== arg);
            TA.save(guild.id, cfg);
            return interaction.update(TA.sectionsView(guild, "تم حذف القسم"));
        }

        // ───── أسئلة ─────
        await interaction.deferUpdate();
        const cfg = TA.load(guild.id);
        let back = TA.dashboard(guild);
        const refresh = () => interaction.editReply(back).catch(() => {});

        if (action === "panelch" || action === "reqch") {
            const got = await prompt(interaction, action === "panelch" ? "منشن روم اللوحة:" : "منشن روم الريكوست (اللي تنزل فيه الطلبات):");
            if (!got) return;
            const c = channelFrom(guild, got);
            if (!c || !c.isText()) { await note(interaction, "ما لقيت الروم.", "#e74c3c"); return; }
            cfg[action === "panelch" ? "panelChannelId" : "requestChannelId"] = c.id;
        } else if (action === "cat") {
            const got = await prompt(interaction, "اكتب اسم الكاتيغوري أو الـ ID (اللي تنفتح فيه التكتات):");
            if (!got) return;
            if (skip(got.content)) cfg.ticketCategoryId = null;
            else {
                const c = findCategoryChannel(guild, got.content);
                if (!c) { await note(interaction, "ما لقيت الكاتيغوري.", "#e74c3c"); return; }
                cfg.ticketCategoryId = c.id;
            }
        } else if (action === "roles") {
            const got = await prompt(interaction, "منشن رتب الدعم (تقدر أكثر من وحدة):");
            if (!got) return;
            cfg.reviewerRoleIds = skip(got.content) ? [] : [...got.mentions.roles.keys()];
        } else if (action === "panelimg" || action === "reqimg") {
            const got = await prompt(interaction, "أرسل الصورة (مرفق، أو رابط):");
            if (!got) return;
            const field = action === "panelimg" ? "panelImagePath" : "requestImagePath";

            if (skip(got.content)) cfg[field] = null;
            else {
                const url = (got.attachments.first() || {}).url || (got.content.match(/https?:\/\/\S+/) || [])[0];
                if (!url) { await note(interaction, "ما لقيت صورة.", "#e74c3c"); return; }
                try { cfg[field] = await TA.downloadImage(url, `${guild.id}_${field}_${Date.now()}`, guild.id); }
                catch (e) { await note(interaction, `فشل تحميل الصورة: ${e.message}`, "#e74c3c"); return; }
            }
        } else if (["paneltxt", "reqtxt", "tickettxt", "acctxt", "pointtxt"].includes(action)) {
            const map = { paneltxt: ["panelText", "نص اللوحة"], reqtxt: ["requestText", "نص رسالة الريكوست"], tickettxt: ["ticketText", "نص الرسالة داخل التكت"], acctxt: ["acceptedText", "رسالة DM للعضو بعد القبول"], pointtxt: ["pointText", "رسالة DM للإداري عند حصوله على نقطة"] };
            const [field, label] = map[action];
            const got = await prompt(interaction, `اكتب ${label}:`);
            if (!got) return;
            cfg[field] = skip(got.content) ? "" : got.content;
        } else if (action === "secadd" || action === "secedit") {
            const got = await prompt(interaction, "اكتب القسم بالصيغة: `الاسم | الوصف | الإيموجي | @الرتبة`");
            if (!got) return;
            const sec = parseSection(got);
            if (!sec.name) { await note(interaction, "لازم اسم للقسم.", "#e74c3c"); return; }

            if (action === "secadd") {
                if (cfg.categories.length >= 25) { await note(interaction, "الحد 25 قسم.", "#e74c3c"); return; }
                cfg.categories.push({ id: `cat_${Date.now().toString(36)}`, ...sec });
                back = TA.sectionsView(guild, "تمت إضافة القسم");
            } else {
                const target = cfg.categories.find(c => c.id === arg);
                if (target) Object.assign(target, sec);
                TA.save(guild.id, cfg);
                return interaction.editReply(TA.sectionView(guild, arg)).catch(() => {});
            }
        }

        TA.save(guild.id, cfg);
        return refresh();
    } catch (error) {
        console.error("[TICKET ADMIN]", error);
        const msg = { embeds: [E(`خطأ: ${String(error.message).slice(0, 150)}`, "#e74c3c")], ephemeral: true };
        try { (interaction.replied || interaction.deferred ? interaction.followUp(msg) : interaction.reply(msg)).catch(() => {}); } catch {}
    }
});

