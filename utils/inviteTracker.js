// ═══════════════════════════════════════════════
//  Voki • تتبع الدعوات: يعرف مين دعا العضو (يقارن استخدامات الدعوات قبل/بعد الدخول)
//  يحتاج صلاحية Manage Server للبوت
// ═══════════════════════════════════════════════
const cache = new Map(); // guildId -> Map(code -> { uses, inviterId })

async function snapshot(guild) {
    try {
        const invites = await guild.invites.fetch();
        const map = new Map();
        invites.forEach(inv => map.set(inv.code, { uses: inv.uses || 0, inviterId: inv.inviter ? inv.inviter.id : null }));
        cache.set(guild.id, map);
        return map;
    } catch {
        return null; // ما فيه صلاحية
    }
}

async function init(client) {
    for (const guild of client.guilds.cache.values()) await snapshot(guild);

    client.on("guildCreate", guild => snapshot(guild));
    client.on("inviteCreate", invite => {
        const map = cache.get(invite.guild.id) || new Map();
        map.set(invite.code, { uses: invite.uses || 0, inviterId: invite.inviter ? invite.inviter.id : null });
        cache.set(invite.guild.id, map);
    });
    client.on("inviteDelete", invite => {
        const map = cache.get(invite.guild.id);
        if (map) setTimeout(() => map.delete(invite.code), 3000); // بعد ما يُستخدم آخر استخدام
    });
}

// يرجع { inviterId, code } أو null
async function findInviter(guild) {
    const before = cache.get(guild.id);
    const after = await snapshot(guild);

    if (!before || !after) return null;

    for (const [code, info] of after) {
        const old = before.get(code);
        if ((old ? old.uses : 0) < info.uses) return { inviterId: info.inviterId, code };
    }

    // دعوة انحذفت بعد آخر استخدام (محدودة الاستخدام)
    for (const [code, info] of before) {
        if (!after.has(code)) return { inviterId: info.inviterId, code };
    }

    return null;
}

module.exports = { init, findInviter };
