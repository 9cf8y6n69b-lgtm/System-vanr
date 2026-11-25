// filters / فلاتر — لوحة فلاتر الرسائل: كلمات محظورة (3 عقوبات)، نص متكرر، دعوات، روابط
const FP = require("../../utils/filtersPanel");

module.exports = {
    name: "filters",
    aliases: ["فلاتر", "فلاتر-الرسائل"],
    description: "فلاتر الرسائل: كلمات محظورة، نص متكرر، دعوات، روابط",

    run: async (client, ctx) => {
        if (!ctx.guild) return;
        const isSlash = typeof ctx.isCommand === "function" && ctx.isCommand();
        if (!ctx.member.permissions.has("ADMINISTRATOR")) {
            return isSlash ? ctx.reply({ content: "للإداريين فقط.", ephemeral: true }) : ctx.react("❌").catch(() => {});
        }
        return isSlash ? ctx.reply({ ...FP.home(ctx.guild), ephemeral: true }) : ctx.reply({ ...FP.home(ctx.guild), allowedMentions: { repliedUser: false } });
    }
};
