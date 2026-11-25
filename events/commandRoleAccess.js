
const db = require("pro.db");

function getSettings(guildId) {
    return db.get(`Command_Roles_${guildId}`) || {
        globalRoles: [],
        commands: {}
    };
}

function saveSettings(guildId, settings) {
    db.set(`Command_Roles_${guildId}`, settings);
}

function isOwner(client, userId) {
    const owners = client.config?.owners || [];

    return (
        Array.isArray(owners) &&
        owners.includes(userId)
    );
}

function canUseCommand(client, member, commandName) {
    if (!member || !member.guild) return false;

    // الأونر والأدمن يحتفظون بصلاحياتهم
    if (
        isOwner(client, member.id) ||
        member.permissions.has("ADMINISTRATOR")
    ) {
        return true;
    }

    const settings = getSettings(member.guild.id);
    const memberRoles = member.roles.cache;

    // الرتبة العامة تسمح بكل الأوامر
    if (
        settings.globalRoles.some(roleId =>
            memberRoles.has(roleId)
        )
    ) {
        return true;
    }

    // إذا لم يتم تخصيص الأمر، يبقى متاحاً مثل السابق
    const allowedRoles = settings.commands[commandName];

    if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) {
        return true;
    }

    // يجب أن يمتلك العضو رتبة واحدة على الأقل من الرتب المحددة
    return allowedRoles.some(roleId =>
        memberRoles.has(roleId)
    );
}

module.exports = {
    getSettings,
    saveSettings,
    canUseCommand
};
