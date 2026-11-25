// ═══════════════════════════════════════════════
//  Voki • دخول عضو: رتبة تلقائية + استرجاع رتبه القديمة + رسالة الترحيب (حسب إعدادات welcomeset)
// ═══════════════════════════════════════════════
const client = require("../index");
const Pro = require("pro.db");
const Tracker = require("../utils/inviteTracker");
const WC = require("../utils/welcomeCfg");

// رتب بصلاحيات خطيرة ما تنسترجع تلقائياً
const DANGEROUS = ["ADMINISTRATOR", "MANAGE_GUILD", "MANAGE_ROLES", "MANAGE_CHANNELS", "BAN_MEMBERS", "KICK_MEMBERS", "MANAGE_WEBHOOKS"];

client.once("ready", () => Tracker.init(client).catch(error => console.error("[INVITES] init:", error.message)));

async function restoreRoles(member) {
    const key = `savedRoles = ${member.guild.id}_${member.id}`;
    const ids = Pro.get(key);
    if (!Array.isArray(ids) || !ids.length) return;

    const roles = ids
        .map(id => member.guild.roles.cache.get(id))
        .filter(role => role && !role.managed && role.editable && !role.permissions.has(DANGEROUS));

    if (roles.length) await member.roles.add(roles, "Voki: استرجاع رتب العضو").catch(() => {});
    Pro.delete(key);
}

async function welcome(member, inviterInfo) {
    const cfg = WC.get(member.guild.id);
    if (!cfg.enabled || !cfg.channelId) {
        console.log(`[WELCOME] تخطي ${member.user.tag}: ${!cfg.enabled ? "الترحيب غير مفعل" : "ما فيه روم ترحيب"} (سيرفر ${member.guild.name}). فعّله بـ ترحيب.`);
        return;
    }

    if (cfg.roleId) {
        const role = member.guild.roles.cache.get(cfg.roleId);
        if (role && role.editable) await member.roles.add(role, "Voki: رتبة الترحيب").catch(() => {});
    }

    const channel = member.guild.channels.cache.get(cfg.channelId);
    if (!channel || !channel.isText()) { console.log("[WELCOME] روم الترحيب محذوف أو مو نصي، أعد ضبطه."); return; }
    if (!channel.permissionsFor(member.guild.me).has(["SEND_MESSAGES", "EMBED_LINKS", "ATTACH_FILES"])) {
        console.log(`[WELCOME] البوت ينقصه صلاحيات (Send/Embed/Attach) في #${channel.name}`);
        return;
    }

    const payload = await WC.build(member, inviterInfo, cfg);
    const sent = await channel.send(payload);

    if (cfg.deleteAfter > 0) setTimeout(() => sent.delete().catch(() => {}), cfg.deleteAfter * 1000);
}

client.on("guildMemberAdd", async member => {
    console.log(`[WELCOME] دخل ${member.user.tag} → ${member.guild.name}`);
    if (member.user.bot) return;

    let inviterInfo = null;

    try {
        const found = await Tracker.findInviter(member.guild);
        if (found) {
            const user = found.inviterId ? await client.users.fetch(found.inviterId).catch(() => null) : null;
            inviterInfo = { user, code: found.code };
        }
    } catch (error) {
        console.error("[INVITES] find:", error.message);
    }

    await restoreRoles(member).catch(error => console.error("[ROLES] restore:", error.message));
    await welcome(member, inviterInfo).catch(error => console.error("[WELCOME] error:", error));
});
