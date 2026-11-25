// ticket / تكت — لوحة تحكم التكت (إمبد + أزرار): الرومات، الأقسام، الصور، النصوص، الرتب، إرسال اللوحة
//   تكت            ← تفتح لوحة التحكم
//   تكت panel      ← يعيد إرسال اللوحة بنفس الإعدادات
//   /ticket        ← نفس اللوحة (مخفية)
const TA = require("../../utils/ticketAdmin");
const { MessageEmbed } = require("discord.js");

const E = text => new MessageEmbed().setColor("#f5b942").setDescription(text);

module.exports = {
    name: "ticket",
    aliases: ["تكت", "تذاكر"],
    description: "لوحة تحكم نظام التكت",

    run: async (client, ctx, args = []) => {
        if (!ctx.guild) return;

        const isSlash = typeof ctx.isCommand === "function" && ctx.isCommand();
        const reply = payload => isSlash ? ctx.reply({ ...payload, ephemeral: true }) : ctx.reply({ ...payload, allowedMentions: { repliedUser: false } });

        if (!ctx.member.permissions.has("ADMINISTRATOR")) return reply({ embeds: [E("هذا الأمر للإدارة فقط.")] });

        if (!isSlash && args[0] && ["panel", "لوحة"].includes(args[0].toLowerCase())) {
            const cfg = TA.load(ctx.guild.id);
            const target = ctx.mentions.channels.first() || ctx.guild.channels.cache.get(cfg.panelChannelId);

            if (!target) return reply({ embeds: [E("حدد روم اللوحة من لوحة التحكم (`تكت`) أو منشنه: `تكت panel #الروم`")] });
            if (!cfg.categories.length) return reply({ embeds: [E("ما فيه أقسام، أضفها من `تكت` ← الأقسام.")] });

            await target.send(TA.buildPanel(ctx.guild, cfg));
            return reply({ embeds: [E(`انرسلت اللوحة في ${target}`)] });
        }

        return reply(TA.dashboard(ctx.guild));
    }
};
