
const client = require("../index");
const Pro = require("pro.db");

client.once("ready", async () => {
    console.log("[PRISON] Checking saved prison punishments...");

    for (const [, guild] of client.guilds.cache) {
        try {
            const prisonListKey = `prisonMembers = ${guild.id}`;
            const prisonList = Pro.get(prisonListKey) || [];

            const prisonRole = guild.roles.cache.find(
                role => role.name === "prison"
            );

            const remainingMembers = [];

            for (const userId of prisonList) {
                const punishmentKey =
                    `prison = ${guild.id} = ${userId}`;

                const punishment = Pro.get(punishmentKey);

                if (!punishment || !punishment.active) {
                    Pro.delete(`MutedMember_${userId}`);
                    continue;
                }

                if (!punishment.expiresAt) {
                    remainingMembers.push(userId);
                    continue;
                }

                const remainingTime =
                    punishment.expiresAt - Date.now();

                if (remainingTime <= 0) {
                    try {
                        const member = await guild.members.fetch(userId)
                            .catch(error => {
                                if (error.code === 10007) return null;
                                throw error;
                            });

                        if (member && prisonRole) {
                            if (
                                guild.me.roles.highest.position <=
                                prisonRole.position
                            ) {
                                console.log(
                                    `[PRISON] Cannot remove role from ${userId}: role hierarchy`
                                );

                                remainingMembers.push(userId);
                                continue;
                            }

                            if (member.roles.cache.has(prisonRole.id)) {
                                await member.roles.remove(
                                    prisonRole,
                                    "Prison duration expired"
                                );
                            }
                        }

                        Pro.delete(punishmentKey);
                        Pro.delete(`MutedMember_${userId}`);

                        console.log(
                            `[PRISON] Expired punishment cleared for ${userId}`
                        );

                    } catch (error) {
                        console.error(
                            `[PRISON] Failed to clear expired punishment for ${userId}:`,
                            error
                        );

                        remainingMembers.push(userId);
                    }

                    continue;
                }

                remainingMembers.push(userId);

                // استكمال المؤقت بعد إعادة التشغيل
                setTimeout(async () => {
                    try {
                        const current = Pro.get(punishmentKey);

                        if (
                            !current ||
                            !current.active ||
                            current.expiresAt !== punishment.expiresAt
                        ) {
                            return;
                        }

                        if (current.expiresAt > Date.now()) {
                            return;
                        }

                        const member = await guild.members.fetch(userId)
                            .catch(error => {
                                if (error.code === 10007) return null;
                                throw error;
                            });

                        if (member && prisonRole) {
                            if (
                                guild.me.roles.highest.position <=
                                prisonRole.position
                            ) {
                                console.log(
                                    `[PRISON] Cannot remove role from ${userId}: role hierarchy`
                                );
                                return;
                            }

                            if (member.roles.cache.has(prisonRole.id)) {
                                await member.roles.remove(
                                    prisonRole,
                                    "Prison duration expired"
                                );
                            }
                        }

                        Pro.delete(punishmentKey);
                        Pro.delete(`MutedMember_${userId}`);

                        const list =
                            Pro.get(prisonListKey) || [];

                        Pro.set(
                            prisonListKey,
                            list.filter(id => id !== userId)
                        );

                        console.log(
                            `[PRISON] Prison ended for ${userId}`
                        );

                    } catch (error) {
                        console.error(
                            `[PRISON] Expiry timer error for ${userId}:`,
                            error
                        );
                    }
                }, remainingTime);
            }

            Pro.set(prisonListKey, remainingMembers);

        } catch (error) {
            console.error(
                `[PRISON] Guild startup error ${guild.id}:`,
                error
            );
        }
    }

    console.log("[PRISON] Prison recovery completed.");
});
