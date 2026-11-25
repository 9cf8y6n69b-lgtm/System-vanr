// ═══════════════════════════════════════════════
//  Voki • إعدادات الأوامر من الهيلب: تعطيل / اختصارات / رتبة / روم (محفوظة بـ pro.db)
// ═══════════════════════════════════════════════
const Pro = require("pro.db");

let owners = [];
try { owners = (require(`${process.cwd()}/config`).owners || []).filter(Boolean); } catch {}

const key = (g, name) => `cmd_cfg_${g}_${name}`;
const idxKey = g => `cmd_alias_idx_${g}`;

const DEFAULT = () => ({ disabled: false, aliases: [], roleId: null, channelId: null });

const get = (g, name) => ({ ...DEFAULT(), ...(Pro.get(key(g, name)) || {}) });

function set(g, name, patch) {
    const next = { ...get(g, name), ...patch };
    Pro.set(key(g, name), next);

    // فهرس الاختصارات المخصصة: alias -> command
    const idx = Pro.get(idxKey(g)) || {};
    for (const alias of Object.keys(idx)) if (idx[alias] === name) delete idx[alias];
    for (const alias of next.aliases) idx[alias.toLowerCase()] = name;
    Pro.set(idxKey(g), idx);

    return next;
}

const reset = (g, name) => set(g, name, DEFAULT());

const customAlias = (g, word) => (Pro.get(idxKey(g)) || {})[String(word).toLowerCase()] || null;

// يرجع الأمر من الاسم/الاختصار الأصلي أو المخصص
function find(client, guildId, word) {
    const w = String(word).toLowerCase();

    return (
        client.commands.get(w) ||
        client.commands.find(cmd => Array.isArray(cmd.aliases) && cmd.aliases.some(a => String(a).toLowerCase() === w)) ||
        (customAlias(guildId, w) ? client.commands.get(customAlias(guildId, w)) : null) ||
        null
    );
}

// هل الاسم مستخدم مسبقاً (أمر أو اختصار)؟
const taken = (client, guildId, word, exceptName) => {
    const found = find(client, guildId, word);
    return !!found && found.name !== exceptName;
};

// null = مسموح، وإلا سبب المنع
function blockReason(guild, member, channel, commandName) {
    if (!member) return null;
    if (owners.includes(member.id)) return null;

    const cfg = get(guild.id, commandName);
    const admin = member.permissions.has("ADMINISTRATOR");

    if (cfg.disabled) return "الأمر معطل.";
    if (admin) return null;
    if (cfg.roleId && !member.roles.cache.has(cfg.roleId)) return "ما عندك الرتبة المطلوبة لهذا الأمر.";
    if (cfg.channelId && channel && channel.id !== cfg.channelId) return `هذا الأمر يشتغل فقط في <#${cfg.channelId}>.`;

    return null;
}

module.exports = { get, set, reset, find, taken, blockReason, owners };
