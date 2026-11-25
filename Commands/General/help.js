// help — قائمة كل الأوامر (سلاش + عادي): تصفح، بحث، وتعديل الأوامر من نفس القائمة
//   /help                     ← تظهر للكل
//   /help hidden:true         ← تظهر لك أنت فقط (إخفاء)
//   /help search:ban          ← بحث مباشر
const Panel = require("../../utils/helpPanel");

module.exports = {
    name: "help",
    aliases: ["مساعدة", "اوامر", "الاوامر"],
    description: "قائمة كل أوامر البوت مع البحث والتعديل",
    options: [
        { name: "hidden", description: "اخفِ الرد (يظهر لك أنت فقط)", type: "BOOLEAN", required: false },
        { name: "search", description: "ابحث عن أمر", type: "STRING", required: false }
    ],

    run: async (client, ctx, args = []) => {
        if (!ctx.guild) return;

        const isSlash = typeof ctx.isCommand === "function" && ctx.isCommand();
        const query = isSlash ? ctx.options.getString("search") : args.join(" ");
        const hidden = isSlash ? !!ctx.options.getBoolean("hidden") : false;

        const view = query ? Panel.search(client, ctx.guild, query) : Panel.home(client, ctx.guild);

        if (isSlash) return ctx.reply({ ...view, ephemeral: hidden });

        return ctx.reply({ ...view, allowedMentions: { repliedUser: false } });
    }
};
