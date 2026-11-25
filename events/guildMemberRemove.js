
const client = require("../index");
const Pro = require("pro.db");

client.on("guildMemberRemove", async (member) => {
    try {
        if (member.user.bot) return;

        const guild = member.guild;

        const roleIds = member.roles.cache
            .filter(role =>
                role.id !== guild.id &&
                !role.managed
            )
            .map(role => role.id);

        const savedKey =
            `savedRoles = ${guild.id}_${member.id}`;

        // حفظ الرتب حتى لو كانت القائمة فارغة
        Pro.set(savedKey, roleIds);

        console.log(
            `[ROLES] Saved ${roleIds.length} roles for ${member.user.tag}`
        );

    } catch (error) {
        console.error("[ROLES] Save error:", error);
    }
});
