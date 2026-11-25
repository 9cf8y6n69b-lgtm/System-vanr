// autoreact — اختار روم والبوت يحط ريأكشنات على كل رسالة فيه
//   /autoreact action:set channel:#room emojis:🔥 ❤️
//   /autoreact action:remove channel:#room
//   /autoreact action:list
// عادي:  autoreact #room 🔥 ❤️  |  autoreact remove #room  |  autoreact list
const { MessageEmbed } = require("discord.js");
const AR = require("../../utils/autoReact");

module.exports = {
    name: "autoreact",
    aliases: ["ريأكشن", "ردود-تلقائية", "رياكشن"],
    description: "ريأكشن تلقائي على كل رسالة في روم تحدده",
    options: [
        {
            name: "action", description: "العملية", type: "STRING", required: true,
            choices: [{ name: "تعيين", value: "set" }, { name: "حذف", value: "remove" }, { name: "عرض", value: "list" }]
        },
        { name: "channel", description: "الروم", type: "CHANNEL", channelTypes: ["GUILD_TEXT", "GUILD_NEWS"], required: false },
        { name: "emojis", description: "الإيموجيات (حتى 10، مفصولة بمسافة)", type: "STRING", required: false }
    ],

    run: async (client, ctx, args = []) => {
        if (!ctx.guild) return;

        const isSlash = typeof ctx.isCommand === "function" && ctx.isCommand();
        const reply = payload => isSlash ? ctx.reply({ ...payload, ephemeral: true }) : ctx.reply({ ...payload, allowedMentions: { repliedUser: false } });

        if (!ctx.member.permissions.has("MANAGE_CHANNELS")) return reply({ content: "⛔ تحتاج صلاحية Manage Channels." });

        let action, channel, text;

        if (isSlash) {
            action = ctx.options.getString("action");
            channel = ctx.options.getChannel("channel");
            text = ctx.options.getString("emojis") || "";
        } else {
            const first = (args[0] || "").toLowerCase();
            action = ["remove", "حذف", "ازالة"].includes(first) ? "remove" : ["list", "عرض", "القائمة"].includes(first) ? "list" : "set";
            channel = ctx.mentions.channels.first() || ctx.guild.channels.cache.get(args.find(a => /^\d{15,}$/.test(a)));
            text = args.join(" ").replace(/<#\d+>/g, "");
        }

        if (action === "list") {
            const map = AR.all(ctx.guild.id);
            const lines = Object.keys(map).filter(id => ctx.guild.channels.cache.has(id)).map(id => `<#${id}> ← ${map[id].map(AR.show).join(" ")}`);
            return reply({ embeds: [new MessageEmbed().setColor("#2b2d31").setTitle("الريأكشن التلقائي").setDescription(lines.join("\n") || "ما فيه أي روم مضبوط.")] });
        }

        if (!channel) channel = ctx.channel;

        if (action === "remove") {
            AR.set(ctx.guild.id, channel.id, []);
            return reply({ content: `✅ انحذف الريأكشن التلقائي من ${channel}.` });
        }

        const emojis = AR.parse(text);
        if (!emojis.length) return reply({ content: "اكتب إيموجي واحد على الأقل. مثال: `autoreact #chat 🔥 ❤️`" });

        // الإيموجي المخصص لازم يكون بسيرفر البوت يقدر يشوفه
        const bad = emojis.filter(e => /^\d+$/.test(e) && !client.emojis.cache.has(e));
        if (bad.length) return reply({ content: "بعض الإيموجيات المخصصة مو متاحة للبوت (لازم تكون من سيرفر البوت فيه)." });

        AR.set(ctx.guild.id, channel.id, emojis);
        return reply({ content: `✅ كل رسالة في ${channel} بيحط عليها: ${emojis.map(AR.show).join(" ")}` });
    }
};
