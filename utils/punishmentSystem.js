
async function getOrCreateRole(guild, name, color) {
    let role = guild.roles.cache.find(r => r.name === name);

    if (!role) {
        role = await guild.roles.create({
            name,
            color,
            permissions: []
        });
    }

    return role;
}

async function getOrCreateChannel(guild, name, role) {
    let channel = guild.channels.cache.find(
        c => c.name === name && c.type === "GUILD_TEXT"
    );

    if (!channel) {
        channel = await guild.channels.create(name, {
            type: "GUILD_TEXT"
        });
    }

    // إخفاء القناة عن الجميع
    await channel.permissionOverwrites.edit(guild.id, {
        VIEW_CHANNEL: false
    });

    // السماح لأصحاب رتبة العقوبة بالدخول والكتابة
    await channel.permissionOverwrites.edit(role.id, {
        VIEW_CHANNEL: true,
        SEND_MESSAGES: true,
        READ_MESSAGE_HISTORY: true,
        ADD_REACTIONS: true
    });

    return channel;
}

module.exports = {
    getOrCreateRole,
    getOrCreateChannel
};
