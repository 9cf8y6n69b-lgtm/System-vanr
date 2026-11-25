// ═══════════════════════════════════════════════
//  Voki • اكتساب الخبرة: شات (أي رسالة/صورة) + فويس (كل دقيقة)
// ═══════════════════════════════════════════════
const client = require("../index");
const Pro = require("pro.db");
const XP = require("../utils/xp");
const { MessageEmbed } = require("discord.js");

const cooldowns = new Map();

function commandName(content) {
    const first = String(content || "").trim().replace(/^[!\-.]+(?=\S)/, "").split(/\s+/)[0].toLowerCase();
    if (!first) return null;

    const hit = client.commands.get(first) ||
        client.commands.find(cmd => cmd.aliases && cmd.aliases.map(a => String(a).toLowerCase()).includes(first));

    return hit ? first : null;
}

async function announce(guild, member, kind, level, fallbackChannel) {
    const channelId = XP.getLevelChannelId(guild.id);
    const channel = (channelId && guild.channels.cache.get(channelId)) || fallbackChannel;

    const given = await XP.applyRoleRewards(member, level);

    if (!channel || !channel.send) return;
    if (!channel.permissionsFor(guild.me).has(["SEND_MESSAGES", "ATTACH_FILES"])) return;

    // الرتبة المعروضة: اللي انعطاها الحين، وإلا أعلى رتبة مكافأة وصلها
    let shown = given[given.length - 1] || null;

    if (!shown) {
        const reached = XP.getRoleRewards(guild.id).filter(r => r.level <= level).sort((a, b) => b.level - a.level)[0];
        shown = reached ? guild.roles.cache.get(reached.roleId) : null;
    }

    try {
        const card = await XP.renderLevelUpCard(member, level, shown);

        await channel.send({
            content: `${member}`,
            files: [{ attachment: card, name: "levelup.png" }],
            allowedMentions: { users: [member.id] }
        });
    } catch (error) {
        console.error("[XP] levelup card:", error.message);
        channel.send({ content: `✦ مبروك ${member} وصلت **لفل ${level}**`, allowedMentions: { users: [member.id] } }).catch(() => {});
    }
}

// ───────────── XP الشات ─────────────
client.on("messageCreate", async message => {
    try {
        if (!message.guild || message.author.bot || message.system || !message.member) return;
        if (!XP.isEnabled(message.guild.id)) return;

        // الأوامر ما تعطي خبرة (يمنع السبام بالأوامر)
        if (commandName(message.content)) return;

        const key = `${message.guild.id}:${message.author.id}`;
        const now = Date.now();

        if (now - (cooldowns.get(key) || 0) < XP.CHAT_XP.cooldownMs) return;
        cooldowns.set(key, now);

        const gain = XP.CHAT_XP.min + Math.floor(Math.random() * (XP.CHAT_XP.max - XP.CHAT_XP.min + 1));
        const current = XP.getUser(message.guild.id, message.author.id);

        const result = XP.addXp(message.guild.id, message.author.id, "chat", gain, {
            messages: current.messages + 1,
            lastMsg: now
        });

        if (result.leveledUp) {
            await announce(message.guild, message.member, "chat", result.after, message.channel);
        }
    } catch (error) {
        console.error("[XP] chat error:", error);
    }
});

// ───────────── XP الفويس (كل دقيقة) ─────────────
async function voiceTick() {
    for (const guild of client.guilds.cache.values()) {
        try {
            if (!XP.isEnabled(guild.id)) continue;

            for (const channel of guild.channels.cache.values()) {
                if (!channel.isVoice() || channel.id === guild.afkChannelId) continue;

                const humans = channel.members.filter(member => !member.user.bot);

                // لازم اثنين على الأقل (يمنع الجلوس لوحدك لجمع الخبرة)
                if (humans.size < 2) continue;

                for (const member of humans.values()) {
                    const voice = member.voice;

                    // مو ديفن (AFK)
                    if (voice.selfDeaf || voice.serverDeaf) continue;

                    const current = XP.getUser(guild.id, member.id);

                    const result = XP.addXp(guild.id, member.id, "voice", XP.VOICE_XP_PER_MINUTE, {
                        voiceSeconds: current.voiceSeconds + 60
                    });

                    if (result.leveledUp) {
                        await announce(guild, member, "voice", result.after, null);
                    }
                }
            }
        } catch (error) {
            console.error("[XP] voice tick error:", error);
        }
    }
}

client.once("ready", () => {
    setInterval(voiceTick, 60 * 1000);
});

// تنظيف الكولداون
setInterval(() => {
    const now = Date.now();
    for (const [key, time] of cooldowns) {
        if (now - time > 5 * 60 * 1000) cooldowns.delete(key);
    }
}, 10 * 60 * 1000);
