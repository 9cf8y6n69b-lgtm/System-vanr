// ═══════════════════════════════════════════════
//  Vanr • إعدادات الأوامر من الهيلب: تعطيل / اختصارات / رتبة / روم (محفوظة بـ pro.db)
// ═══════════════════════════════════════════════
const Pro = require("pro.db");

let owners = [];
try { owners = (require(`${process.cwd()}/config`).owners || []).filter(Boolean); } catch {}

const key = (g, name) => `cmd_cfg_${g}_${name}`;
const idxKey = g => `cmd_alias_idx_${g}`;

const DEFAULT = () => ({ disabled: false, aliases: [], roleId: null, roleIds: [], channelId: null });

// roleId (قديم، رتبة وحدة) و roleIds (جديد، عدة رتب) نوحدهم
const get = (g, name) => {
    const c = { ...DEFAULT(), ...(Pro.get(key(g, name)) || {}) };
    c.roleIds = [...new Set([...(Array.isArray(c.roleIds) ? c.roleIds : []), ...(c.roleId ? [c.roleId] : [])])];
    c.roleId = c.roleIds[0] || null;
    return c;
};

// رتب تستخدم كل الأوامر
const gKey = g => `cmd_global_roles_${g}`;
const getGlobal = g => (Pro.get(gKey(g)) || []).filter(Boolean);
const setGlobal = (g, ids) => Pro.set(gKey(g), [...new Set(ids)]);

function set(g, name, patch) {
    const next = { ...get(g, name), ...patch };
    if ("roleId" in patch && !("roleIds" in patch)) next.roleIds = patch.roleId ? [patch.roleId] : [];
    next.roleIds = [...new Set(next.roleIds || [])];
    next.roleId = next.roleIds[0] || null;
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

const OWNER_DIRS = ["Owners"];

// هل العضو "مخوّل" بالأمر عن طريق رتبة (عامة أو خاصة بالأمر)؟ أوامر المالك مستثناة
function granted(guild, member, command) {
    if (!member || !command) return false;
    if (OWNER_DIRS.includes(command.directory)) return false;
    const mine = member.roles.cache;
    return getGlobal(guild.id).some(r => mine.has(r)) || get(guild.id, command.name).roleIds.some(r => mine.has(r));
}

// null = مسموح، وإلا سبب المنع
function blockReason(guild, member, channel, commandName, command) {
    if (!member) return null;
    if (owners.includes(member.id)) return null;

    const cfg = get(guild.id, commandName);
    const admin = member.permissions.has("ADMINISTRATOR");
    const mine = member.roles.cache;
    const globalOk = getGlobal(guild.id).some(r => mine.has(r)) && !OWNER_DIRS.includes(command && command.directory);

    if (cfg.disabled) return "الأمر معطل.";
    if (admin || globalOk) return null;
    if (cfg.roleIds.length && !cfg.roleIds.some(r => mine.has(r))) return "ما عندك الرتبة المطلوبة لهذا الأمر.";
    if (cfg.channelId && channel && channel.id !== cfg.channelId) return `هذا الأمر يشتغل فقط في <#${cfg.channelId}>.`;

    return null;
}

// يعطي العضو صلاحيات الأمر لهذي الرسالة/التفاعل فقط (الأوامر تفحص member.permissions داخلياً)
function grantPerms(target, member) {
    const fake = Object.create(member);
    const perms = member.permissions;
    Object.defineProperty(fake, "permissions", {
        value: new Proxy(perms, { get(t, p) { if (p === "has" || p === "any" || p === "hasAny") return () => true; const v = t[p]; return typeof v === "function" ? v.bind(t) : v; } })
    });
    Object.defineProperty(target, "member", { value: fake, configurable: true, writable: true });
}

module.exports = { get, set, reset, find, taken, blockReason, granted, grantPerms, getGlobal, setGlobal, owners };
