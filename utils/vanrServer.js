// ═══════════════════════════════════════════════
//  Vanr • بناء هيكل السيرفر (رتب + كاتيغوريات + رومات) وربطه بإعدادات البوت
//  آمن: ما يحذف شي، وما يكرر الموجود (يطابق بالاسم)
// ═══════════════════════════════════════════════
const fs = require("fs");
const path = require("path");
const Pro = require("pro.db");

const STICKER_DIR = path.join(__dirname, "..", "stickers");

// ───────────── الرتب ─────────────
const ROLES = [
    { key: "owner", name: "✦ Vanr Owner", color: "#ffffff", hoist: true, perms: ["ADMINISTRATOR"] },
    { key: "admin", name: "✦ Administrator", color: "#d9dde3", hoist: true, perms: ["MANAGE_GUILD", "MANAGE_CHANNELS", "MANAGE_ROLES", "KICK_MEMBERS", "BAN_MEMBERS", "MODERATE_MEMBERS", "MANAGE_MESSAGES", "VIEW_AUDIT_LOG"] },
    { key: "mod", name: "✦ Moderator", color: "#aeb4bd", hoist: true, perms: ["KICK_MEMBERS", "MODERATE_MEMBERS", "MANAGE_MESSAGES", "MUTE_MEMBERS", "MOVE_MEMBERS"] },
    { key: "support", name: "✦ Support", color: "#8d949e", hoist: true, perms: ["MANAGE_MESSAGES"] },
    { key: "vip", name: "✦ VIP", color: "#ffd166", hoist: true, perms: [] },
    { key: "member", name: "Member", color: "#6b7078", hoist: false, perms: [] },
    { key: "prison", name: "Prison", color: "#3a3d43", hoist: false, perms: [] }
];

// ───────────── الرومات (أسماء إنجليزية بحتة، بدون إيموجي) ─────────────
// staff = يشوفه الإدارة فقط | ro = قراءة فقط للأعضاء | log = مفتاح اللوق اللي ينربط بالروم
const logCh = (name, log) => ({ name, type: "text", staff: true, log });

const LAYOUT = [
    {
        name: "INFORMATION",
        channels: [
            { name: "rules", type: "text", ro: true, topic: "Server rules" },
            { name: "announcements", type: "text", ro: true },
            { name: "welcome", type: "text", ro: true, bind: "welcome" },
            { name: "colors", type: "text", ro: true, topic: "Pick your color" }
        ]
    },
    {
        name: "COMMUNITY",
        channels: [
            { name: "chat", type: "text" },
            { name: "media", type: "text" },
            { name: "commands", type: "text" },
            { name: "levels", type: "text", ro: true, bind: "xp", topic: "Level up notifications" },
            { name: "my-role", type: "text", bind: "roleRoom", topic: "Manage your personal role" }
        ]
    },
    {
        name: "VOICE",
        channels: [
            { name: "Lounge", type: "voice" },
            { name: "Gaming", type: "voice" },
            { name: "Chill", type: "voice" },
            { name: "Private", type: "voice", limit: 2 }
        ]
    },
    {
        name: "SUPPORT",
        channels: [
            { name: "tickets", type: "text", ro: true },
            { name: "requests", type: "text", staff: true, topic: "Ticket requests" }
        ]
    },
    {
        name: "STAFF",
        staff: true,
        channels: [
            { name: "staff-chat", type: "text", staff: true },
            logCh("security-logs", "security"),
            logCh("warn-logs", "warn")
        ]
    },
    {
        name: "LOGS - MESSAGES",
        staff: true,
        channels: [
            logCh("message-delete", "messageDelete"), logCh("message-edit", "messageUpdate"), logCh("image-delete", "imageDelete")
        ]
    },
    {
        name: "LOGS - VOICE",
        staff: true,
        channels: [
            logCh("voice-join", "voiceJoin"), logCh("voice-leave", "voiceLeave"), logCh("voice-move", "voiceMove"),
            logCh("voice-mute", "voiceMute"), logCh("voice-state", "voiceState"), logCh("voice-pull", "voicePull")
        ]
    },
    {
        name: "LOGS - MEMBERS",
        staff: true,
        channels: [
            logCh("member-join", "memberJoin"), logCh("member-leave", "memberLeave"),
            logCh("role-add", "roleAdd"), logCh("role-remove", "roleRemove")
        ]
    },
    {
        name: "LOGS - MODERATION",
        staff: true,
        channels: [
            logCh("ban-add", "banAdd"), logCh("ban-remove", "banRemove"), logCh("kick", "kick"),
            logCh("timeout", "timeout"), logCh("untimeout", "untimeout"),
            logCh("prison-add", "prisonAdd"), logCh("prison-remove", "prisonRemove"),
            logCh("blacklist-add", "blacklistAdd"), logCh("blacklist-remove", "blacklistRemove")
        ]
    },
    {
        name: "LOGS - COMMANDS",
        staff: true,
        channels: [
            logCh("cmd-admin", "cmdAdmin"), logCh("cmd-owners", "cmdOwners"), logCh("cmd-roles", "cmdRoles"),
            logCh("cmd-channels", "cmdChannels"), logCh("cmd-protection", "cmdProtection"), logCh("cmd-security", "cmdSecurity"),
            logCh("cmd-tickets", "cmdTickets"), logCh("cmd-voice", "cmdVoice")
        ]
    },
    {
        name: "LOGS - SERVER",
        staff: true,
        channels: [
            logCh("channel-create", "channelCreate"), logCh("channel-edit", "channelUpdate"), logCh("channel-delete", "channelDelete"),
            logCh("emoji-create", "emojiCreate"), logCh("emoji-delete", "emojiDelete"),
            logCh("role-create", "roleCreate"), logCh("role-delete", "roleDelete"), logCh("role-edit", "roleUpdate"),
            logCh("channel-permissions", "permUpdate"), logCh("server-edit", "guildUpdate"),
            logCh("invite-create", "inviteCreate"), logCh("invite-delete", "inviteDelete"),
            logCh("mod-commands", "cmdAll"), logCh("message-filters", "filterHit")
        ]
    }
];

const findRole = (guild, name) => guild.roles.cache.find(r => r.name === name);
const findChannel = (guild, name, type, parentId) =>
    guild.channels.cache.find(c => c.name === name && c.parentId === parentId && (type === "category" ? c.type === "GUILD_CATEGORY" : true));

async function buildRoles(guild, report) {
    const map = {};

    for (const def of ROLES) {
        let role = findRole(guild, def.name);

        if (!role) {
            role = await guild.roles.create({
                name: def.name, color: def.color, hoist: def.hoist, permissions: def.perms, mentionable: false, reason: "Vanr setup"
            }).catch(error => { report.failed.push(`رتبة ${def.name}: ${error.message}`); return null; });

            if (role) report.rolesCreated++;
        }

        if (role) map[def.key] = role;
    }

    return map;
}

async function buildChannels(guild, roles, report) {
    const bound = {};
    const everyone = guild.roles.everyone;
    const staffIds = ["owner", "admin", "mod", "support"].map(k => roles[k] && roles[k].id).filter(Boolean);

    const staffOverwrites = () => [
        { id: everyone.id, deny: ["VIEW_CHANNEL"] },
        ...staffIds.map(id => ({ id, allow: ["VIEW_CHANNEL", "SEND_MESSAGES"] })),
        { id: guild.me.id, allow: ["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS", "ATTACH_FILES"] }
    ];

    const readOnly = () => [{ id: everyone.id, deny: ["SEND_MESSAGES"] }];

    for (const group of LAYOUT) {
        let category = guild.channels.cache.find(c => c.type === "GUILD_CATEGORY" && c.name === group.name);

        if (!category) {
            category = await guild.channels.create(group.name, {
                type: "GUILD_CATEGORY",
                permissionOverwrites: group.staff ? staffOverwrites() : [],
                reason: "Vanr setup"
            }).catch(error => { report.failed.push(`كاتيغوري ${group.name}: ${error.message}`); return null; });

            if (category) report.channelsCreated++;
        }

        if (!category) continue;

        for (const def of group.channels) {
            let channel = findChannel(guild, def.name, def.type, category.id);

            if (!channel) {
                const options = {
                    type: def.type === "voice" ? "GUILD_VOICE" : "GUILD_TEXT",
                    parent: category.id,
                    reason: "Vanr setup"
                };

                if (def.topic) options.topic = def.topic;
                if (def.limit) options.userLimit = def.limit;
                if (def.staff) options.permissionOverwrites = staffOverwrites();
                else if (def.ro) options.permissionOverwrites = readOnly();

                channel = await guild.channels.create(def.name, options)
                    .catch(error => { report.failed.push(`روم ${def.name}: ${error.message}`); return null; });

                if (channel) report.channelsCreated++;
            }

            if (channel && def.bind) bound[def.bind] = channel;
            if (channel && def.log) (bound.logs = bound.logs || {})[def.log] = channel;
        }
    }

    return bound;
}

// يربط الرومات بإعدادات البوت (كل لوق بروم مستقل / XP / الحماية / الرول الشخصي)
function bindSettings(guild, bound, report) {
    const cfg = Pro.get(`lg_cfg_${guild.id}`) || {};
    cfg.types = cfg.types || {};

    const logs = bound.logs || {};
    for (const [key, channel] of Object.entries(logs)) {
        if (key === "security") { Pro.set(`security_log = ${guild.id}`, channel.id); continue; }
        cfg.types[key] = channel.id;
    }

    Pro.set(`lg_cfg_${guild.id}`, cfg);
    report.bound.push(`${Object.keys(logs).length} لوق، كل واحد بروم خاص`);

    if (bound.xp) { Pro.set(`xp_channel = ${guild.id}`, bound.xp.id); report.bound.push(`إشعارات اللفل ← ${bound.xp}`); }
    if (bound.roleRoom) { Pro.set(`role_room = ${guild.id}`, bound.roleRoom.id); report.bound.push(`الرولات الشخصية ← ${bound.roleRoom}`); }
}

async function buildServer(guild) {
    const report = { rolesCreated: 0, channelsCreated: 0, bound: [], failed: [] };

    await guild.roles.fetch().catch(() => {});
    await guild.channels.fetch().catch(() => {});

    const roles = await buildRoles(guild, report);
    const bound = await buildChannels(guild, roles, report);
    bindSettings(guild, bound, report);

    return report;
}

// ───────────── الستكرات ─────────────
const STICKER_TAGS = {
    hala: "wave", tamam: "white_check_mark", gg: "trophy", bye: "wave", shukran: "heart", absher: "muscle",
    laa: "x", yasalam: "sparkles", vanr: "new_moon", voice: "microphone", wait: "hourglass", ok: "ok_hand"
};

const STICKER_LIMIT = { NONE: 5, TIER_1: 15, TIER_2: 30, TIER_3: 60 };

async function uploadStickers(guild) {
    const report = { created: [], existed: [], failed: [], skipped: [] };

    await guild.stickers.fetch().catch(() => {});

    const limit = STICKER_LIMIT[guild.premiumTier] || 5;
    let free = limit - guild.stickers.cache.size;

    for (const [key, tag] of Object.entries(STICKER_TAGS)) {
        const name = `vanr_${key}`;
        const file = path.join(STICKER_DIR, `${key}.png`);

        if (guild.stickers.cache.find(s => s.name === name)) { report.existed.push(name); continue; }
        if (!fs.existsSync(file)) { report.failed.push(`${name} (الملف ناقص)`); continue; }
        if (free <= 0) { report.skipped.push(name); continue; }

        try {
            await guild.stickers.create(file, name, tag, { description: "Vanr", reason: "Vanr setup" });
            report.created.push(name);
            free--;
        } catch (error) {
            report.failed.push(`${name}: ${error.message}`);
        }
    }

    report.limit = limit;
    return report;
}

module.exports = { buildServer, uploadStickers, ROLES, LAYOUT };
