// رولي — لوحة تعديل الرول الشخصي (مخفية، تظهر لصاحب الرول فقط)
//   /myrole   ← تظهر مخفية مباشرة
//   رولي      ← في روم الرولات: يطلع زر يفتح اللوحة المخفية
//   myroom    ← (إداري) حدد الروم:  رولي-روم #room
const { MessageActionRow, MessageButton } = require("discord.js");
const PR = require("../../utils/personalRoles");
const Panel = require("../../utils/personalPanel");

module.exports = {
    name: "myrole",
    aliases: ["رولي"],
    description: "لوحة تعديل رولك الشخصي (مخفية)",
    options: [
        { name: "setroom", description: "(إداري) حدد روم تعديل الرولات", type: "CHANNEL", channelTypes: ["GUILD_TEXT"], required: false }
    ],

    run: async (client, ctx, args = []) => {
        if (!ctx.guild) return;

        const isSlash = typeof ctx.isCommand === "function" && ctx.isCommand();
        const room = PR.getRoom(ctx.guild.id);

        // ضبط الروم
        const setTo = isSlash ? ctx.options.getChannel("setroom") : (/^(setroom|روم)$/i.test(args[0] || "") ? (ctx.mentions.channels.first() || ctx.channel) : null);

        if (setTo) {
            if (!ctx.member.permissions.has("MANAGE_GUILD")) return ctx.reply({ content: "⛔ تحتاج Manage Server.", ephemeral: isSlash });
            PR.setRoom(ctx.guild.id, setTo.id);
            return ctx.reply({ content: `✅ روم تعديل الرولات: ${setTo}`, ephemeral: isSlash });
        }

        if (room && ctx.channel.id !== room) {
            const text = `اكتب الأمر في <#${room}>`;
            if (isSlash) return ctx.reply({ content: text, ephemeral: true });
            return ctx.reply({ content: text, allowedMentions: { repliedUser: false } })
                .then(m => setTimeout(() => { m.delete().catch(() => {}); ctx.delete().catch(() => {}); }, 5000)).catch(() => {});
        }

        if (isSlash) return ctx.reply({ ...Panel.main(ctx.guild, ctx.user.id), ephemeral: true });

        // رسالة عادية: ما نقدر نخفي → زر يفتح اللوحة المخفية
        const row = new MessageActionRow().addComponents(new MessageButton().setCustomId(`pr_open:${ctx.author.id}`).setLabel("فتح لوحة رولي").setStyle("PRIMARY"));
        const sent = await ctx.reply({ content: `${ctx.author}`, components: [row], allowedMentions: { users: [ctx.author.id], repliedUser: false } });
        setTimeout(() => { sent.delete().catch(() => {}); ctx.delete().catch(() => {}); }, 60000);
    }
};
