// ═══════════════════════════════════════════════
//  Vanr • محرك فلاتر الرسائل + تفاعلات اللوحة (flt:*)
// ═══════════════════════════════════════════════
const client = require("../index");
const { MessageEmbed } = require("discord.js");
const F = require("../utils/filters");
const FP = require("../utils/filtersPanel");
const P = require("../utils/protection");

const E = (t, c = "#e74c3c") => new MessageEmbed().setColor(c).setDescription(String(t));
const recent = new Map(); // g:u -> [{text, t}]

// ───────────── فحص كل رسالة ─────────────
client.on("messageCreate", async message => {
    try {
        if (!message.guild || message.author.bot || message.system || !message.member) return;

        const guild = message.guild;
        const cfg = F.get(guild.id);
        if (!cfg.words.enabled && !cfg.spam.enabled && !cfg.invites.enabled && !cfg.links.enabled) return;

        const member = message.member;
        if (member.permissions.has("ADMINISTRATOR") || P.isTrusted(guild, member.id, client)) return;
        if (cfg.exemptRoles.some(r => member.roles.cache.has(r))) return;

        const content = message.content || "";
        let reason = null, spec = null, extra = null;

        if (cfg.words.enabled && (extra = F.hasBadWord(cfg, content))) {
            const n = Math.min(F.strike(guild.id, member.id), 3);
            reason = `كلمة محظورة (مخالفة ${n}/3)`;
            spec = cfg.words.punish[n - 1];
        } else if (cfg.invites.enabled && F.INVITE.test(content)) {
            reason = "رابط دعوة ديسكورد";
            spec = cfg.invites.punish;
        } else if (cfg.links.enabled && F.externalLinks(cfg, content).length) {
            reason = "رابط خارجي";
            spec = cfg.links.punish;
            extra = F.externalLinks(cfg, content)[0];
        } else if (cfg.spam.enabled && content.length > 2) {
            const k = `${guild.id}:${member.id}`;
            const now = Date.now();
            const text = F.normalize(content);
            const list = (recent.get(k) || []).filter(x => now - x.t < cfg.spam.seconds * 1000);
            list.push({ text, t: now });
            recent.set(k, list);

            if (list.filter(x => x.text === text).length >= cfg.spam.count) {
                reason = "نص متكرر";
                spec = cfg.spam.punish;
                recent.delete(k);
            }
        }

        if (!reason) return;

        const botMember = guild.me;
        if (botMember.permissions.has("MANAGE_MESSAGES")) await message.delete().catch(() => {});

        const res = spec === "delete" ? { done: F.label(spec), ok: true } : await F.punish(member, spec, `Vanr: ${reason}`);

        message.channel.send({
            content: `${member}`,
            embeds: [E(`🚫 **${reason}**\nالإجراء: ${res.done}${res.ok ? "" : "\n⚠️ ما قدرت أنفذ العقوبة (رتبتي أقل أو ينقصني صلاحية)"}`)],
            allowedMentions: { users: [member.id] }
        }).then(m => setTimeout(() => m.delete().catch(() => {}), 6000)).catch(() => {});

        if (client.sendLog) {
            client.sendLog(guild, "filterHit", {
                user: member.user,
                fields: [
                    { name: "👤 العضو", value: `${member} (${member.user.tag}) • ${member.id}`, inline: true },
                    { name: "🚫 السبب", value: reason, inline: true },
                    { name: "⚖️ الإجراء", value: res.done, inline: true },
                    { name: "📍 الروم", value: `${message.channel}`, inline: true },
                    { name: "💬 الرسالة", value: content.slice(0, 900) || "—", inline: false }
                ]
            });
        }
    } catch (error) {
        console.error("[FILTERS]", error.message);
    }
});

// ───────────── اللوحة ─────────────
async function ask(interaction, text) {
    await interaction.followUp({ embeds: [E(text, "#2b2d31")], ephemeral: true }).catch(() => {});
    const got = await interaction.channel
        .awaitMessages({ filter: m => m.author.id === interaction.user.id, max: 1, time: 60000 })
        .then(c => c.first()).catch(() => null);
    if (got) got.delete().catch(() => {});
    return got;
}

// يسأل بقائمة اختيار ويرجع القيمة
async function pickPunish(interaction, title, withOff) {
    const customId = `flt_tmp:${interaction.id}:${Date.now()}`;
    await interaction.followUp({ embeds: [E(title, "#2b2d31")], components: [FP.punishSelect(customId, withOff)], ephemeral: true }).catch(() => {});

    const picked = await interaction.channel
        .awaitMessageComponent({ filter: i => i.customId === customId && i.user.id === interaction.user.id, time: 60000 })
        .catch(() => null);

    if (!picked) return null;
    await picked.update({ embeds: [E("✅ تم", "#2ecc71")], components: [] }).catch(() => {});
    return picked.values[0];
}

client.on("interactionCreate", async interaction => {
    try {
        const id = String(interaction.customId || "");
        if (!interaction.guild || !id.startsWith("flt:") || !interaction.isButton()) return;

        if (!interaction.member.permissions.has("ADMINISTRATOR")) return interaction.reply({ embeds: [E("للإداريين فقط.")], ephemeral: true });

        const guild = interaction.guild;
        const action = id.split(":")[1];

        if (action === "close") return interaction.update({ components: [] });

        const cfg = F.get(guild.id);

        if (action === "wtoggle") {
            cfg.words.enabled = !cfg.words.enabled;
            F.save(guild.id, cfg);
            return interaction.update(FP.home(guild));
        }

        await interaction.deferUpdate();

        if (action === "words") {
            const got = await ask(interaction, "اكتب الكلمات للإضافة (افصل بمسافة أو سطر).\nلحذف كلمة اكتبها بعد `-` مثل `-كلمة`. ولمسح الكل اكتب `مسح`.");
            if (!got) return;
            if (/^(مسح|clear)$/i.test(got.content.trim())) cfg.words.list = [];
            else for (const tok of got.content.split(/\s+/).filter(Boolean)) {
                if (tok.startsWith("-")) cfg.words.list = cfg.words.list.filter(w => w !== tok.slice(1));
                else if (!cfg.words.list.includes(tok)) cfg.words.list.push(tok);
            }
            cfg.words.list = cfg.words.list.slice(0, 500);
            if (cfg.words.list.length) cfg.words.enabled = true;
        } else if (action === "wpun") {
            for (let i = 0; i < 3; i++) {
                const p = await pickPunish(interaction, `عقوبة المخالفة رقم **${i + 1}**:`, false);
                if (!p) break;
                cfg.words.punish[i] = p;
            }
        } else if (action === "spam" || action === "invites" || action === "links") {
            const names = { spam: "النص المتكرر", invites: "دعوات ديسكورد", links: "الروابط الخارجية" };
            const p = await pickPunish(interaction, `عقوبة **${names[action]}** (أو إيقاف الفلتر):`, true);
            if (!p) return;
            if (p === "off") cfg[action].enabled = false;
            else { cfg[action].enabled = true; cfg[action].punish = p; }
        } else if (action === "allow") {
            const got = await ask(interaction, "اكتب الدومينات المسموحة (مثل `youtube.com twitter.com`) — تضاف للقائمة. لمسحها كلها اكتب `مسح`:");
            if (!got) return;
            if (/^(مسح|clear)$/i.test(got.content.trim())) cfg.links.allow = [];
            else cfg.links.allow = [...new Set([...cfg.links.allow, ...got.content.toLowerCase().split(/\s+/).map(d => d.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "")).filter(Boolean)])].slice(0, 100);
        }

        F.save(guild.id, cfg);
        return interaction.editReply(FP.home(guild)).catch(() => {});
    } catch (error) {
        console.error("[FILTERS PANEL]", error);
        const msg = { embeds: [E(`خطأ: ${String(error.message).slice(0, 150)}`)], ephemeral: true };
        (interaction.replied || interaction.deferred ? interaction.followUp(msg) : interaction.reply(msg)).catch(() => {});
    }
});

setInterval(() => {
    const now = Date.now();
    for (const [k, list] of recent) if (!list.length || now - list[list.length - 1].t > 120000) recent.delete(k);
}, 120000);
