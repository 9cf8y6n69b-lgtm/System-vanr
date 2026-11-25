// antispam on/off — حماية السبام (التنفيذ في events/protection.js)
const P = require("../../utils/protection");
const { owners } = require(`${process.cwd()}/config`);

module.exports = {
    name: "antispam",
    run: async (client, message, args = []) => {
        if (!message.guild) return;

        const Pro = require("pro.db");
        const allowed = Pro.get(`Allow - Command antispam = [ ${message.guild.id} ]`);
        const allowedRole = message.guild.roles.cache.get(allowed);
        const ok =
            message.member.permissions.has("ADMINISTRATOR") ||
            owners.includes(message.author.id) ||
            message.author.id === allowed ||
            (allowedRole && message.member.roles.cache.has(allowedRole.id));

        if (!ok) return message.react("❌");

        const state = (args[0] || "").toLowerCase();

        if (state === "on") {
            P.setOn(message.guild.id, "antispam", true);
            return message.reply("AntiSpam has been successfully turned on ✅");
        }

        if (state === "off") {
            P.setOn(message.guild.id, "antispam", false);
            return message.reply("AntiSpam has been successfully turned off ❎");
        }

        return message.reply("Example: antispam on/off");
    }
};
