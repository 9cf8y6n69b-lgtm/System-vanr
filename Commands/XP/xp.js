// xp — إدارة نظام الخبرة
//   xp                         ← كرتك
//   xp channel #روم            ← روم إشعارات اللفل (xp channel off لإلغائه)
//   xp add @عضو 500 [chat|voice]
//   xp remove @عضو 200 [chat|voice]
//   xp reset @عضو
//   xp role <لفل> @رتبة        ← رتبة مكافأة   |  xp role remove <لفل>
//   xp roles                   ← عرض المكافآت
//   xp on | off                ← تشغيل/إيقاف النظام
const { MessageEmbed } = require("discord.js");
const Pro = require("pro.db");
const XP = require("../../utils/xp");
const { owners } = require(`${process.cwd()}/config`);

module.exports = {
    name: "xp",
    aliases: ["خبرة", "اكسبي"],

    run: async (client, message, args = []) => {
        if (!message.guild) return;

        const g = message.guild.id;
        const sub = (args[0] || "").toLowerCase();
        const isAdmin = message.member.permissions.has("MANAGE_GUILD") || owners.includes(message.author.id);

        // بدون أمر فرعي = كرت العضو
        if (!sub) return client.commands.get("id").run(client, message, []);

        if (!isAdmin) return message.react("❌").catch(() => {});

        const reply = text => message.reply({ embeds: [new MessageEmbed().setColor("#2b2d31").setDescription(text)] });
        const target = message.mentions.users.first();
        const kindArg = (args[3] || "chat").toLowerCase();
        const kind = ["voice", "فويس"].includes(kindArg) ? "voice" : "chat";

        if (sub === "on") { Pro.delete(`xp_disabled = ${g}`); return reply("✦ تم تشغيل نظام الخبرة."); }
        if (sub === "off") { Pro.set(`xp_disabled = ${g}`, true); return reply("✦ تم إيقاف نظام الخبرة."); }

        if (sub === "channel") {
            const channel = message.mentions.channels.first();

            if (args[1] === "off") { Pro.delete(`xp_channel = ${g}`); return reply("✦ إشعارات اللفل ترجع لنفس روم الرسالة."); }
            if (!channel) return reply("منشن الروم: `xp channel #الروم`");

            Pro.set(`xp_channel = ${g}`, channel.id);
            return reply(`✦ إشعارات اللفل ستصل في ${channel}`);
        }

        if (sub === "add" || sub === "remove") {
            const amount = parseInt(args[2]);

            if (!target || !amount || amount <= 0) return reply(`الاستخدام: \`xp ${sub} @عضو 500 [chat|voice]\``);

            XP.addXp(g, target.id, kind, sub === "add" ? amount : -amount);
            const total = XP.totalOf(XP.getUser(g, target.id));

            return reply(`✦ ${sub === "add" ? "تمت إضافة" : "تم خصم"} **${amount}** XP (${kind === "voice" ? "فويس" : "شات"}) — ${target}\nالمجموع: **${total}** • لفل **${XP.levelInfo(total).level}**`);
        }

        if (sub === "reset") {
            if (!target) return reply("منشن العضو: `xp reset @عضو`");
            XP.resetUser(g, target.id);
            return reply(`✦ تم تصفير خبرة ${target}`);
        }

        if (sub === "roles") {
            const rewards = XP.getRoleRewards(g).sort((a, b) => a.level - b.level);
            return reply(rewards.length ? rewards.map(r => `لفل **${r.level}** ← <@&${r.roleId}>`).join("\n") : "ما فيه رتب مكافآت.");
        }

        if (sub === "role") {
            let rewards = XP.getRoleRewards(g);

            if (args[1] === "remove") {
                const level = parseInt(args[2]);
                rewards = rewards.filter(r => r.level !== level);
                Pro.set(`xp_roles = ${g}`, rewards);
                return reply(`✦ تم حذف مكافأة لفل ${level}`);
            }

            const level = parseInt(args[1]);
            const role = message.mentions.roles.first();

            if (!level || !role) return reply("الاستخدام: `xp role 10 @رتبة`");

            rewards = rewards.filter(r => r.level !== level);
            rewards.push({ level, roleId: role.id });
            Pro.set(`xp_roles = ${g}`, rewards);

            return reply(`✦ من لفل **${level}** يحصل العضو على ${role}`);
        }

        return reply("أوامر: `channel` `add` `remove` `reset` `role` `roles` `on` `off`");
    }
};
