// addemoji — يضيف أي إيموجي للسيرفر
//  • إيموجيات من سيرفرات ثانية (الصقها بعد الأمر، تدعم المتحركة)       addemoji <:a:123> <a:b:456>
//  • صورة مرفقة                                                         addemoji الاسم  + صورة
//  • رابط صورة                                                          addemoji الاسم https://...
//  • إيموجي عادي (😀 ❄️ ...)                                             addemoji ❄️
//  • بالرد على رسالة فيها إيموجيات أو صور                                addemoji (رد)
const { Util } = require("discord.js");
const Pro = require("pro.db");

const CUSTOM = /<a?:\w{2,32}:\d{15,25}>/g;
const URL_RE = /^https?:\/\/\S+$/i;
const UNI = /\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic}|[\u{1F3FB}-\u{1F3FF}])*/gu;
const safeName = s => (String(s || "").replace(/[^\w]/g, "_").replace(/^_+|_+$/g, "").slice(0, 32).padEnd(2, "_")) || "emoji";

const twemoji = ch => {
    const cps = [...ch].map(c => c.codePointAt(0).toString(16)).filter(h => h !== "fe0f");
    return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/${cps.join("-")}.png`;
};

module.exports = {
    name: "addemoji",
    aliases: ["emojis", "eo", "اضافة_ايموجي", "اضف_ايموجي", "سرقة_ايموجي", "سرقه"],
    description: "إضافة أي إيموجي للسيرفر (إيموجي، رابط، صورة مرفقة)",

    run: async (client, message, args) => {
        if (message.author.bot || !message.guild) return;

        const db = Pro.get(`Allow - Command addemoji = [ ${message.guild.id} ]`);
        const allowedRole = message.guild.roles.cache.get(db);
        const ok = (allowedRole && message.member.roles.cache.has(allowedRole.id)) || message.author.id === db || message.member.permissions.has("MANAGE_EMOJIS_AND_STICKERS");
        if (!ok) return message.react("❌").catch(() => {});

        let ref = null;
        if (message.reference && message.reference.messageId) ref = await message.channel.messages.fetch(message.reference.messageId).catch(() => null);

        const text = [message.content, ref ? ref.content : ""].join(" ");
        const words = (args || []).filter(a => !/<a?:\w{2,32}:\d{15,25}>/.test(a) && !URL_RE.test(a) && !a.match(UNI));
        const plainName = words[0];

        const jobs = [];

        for (const m of text.match(CUSTOM) || []) {
            const e = Util.parseEmoji(m);
            if (e && e.id) jobs.push({ name: e.name, url: `https://cdn.discordapp.com/emojis/${e.id}.${e.animated ? "gif" : "png"}?size=128` });
        }

        const atts = [...message.attachments.values(), ...(ref ? [...ref.attachments.values()] : [])].filter(a => /\.(png|jpe?g|gif|webp)(\?|$)/i.test(a.url));
        const urls = (args || []).filter(a => URL_RE.test(a)).map(u => ({ url: u }));
        const files = [...atts.map(a => ({ url: a.url, base: (a.name || "").replace(/\.[^.]+$/, "") })), ...urls];
        files.forEach((f, i) => jobs.push({ name: files.length === 1 && plainName ? plainName : (f.base || `emoji_${i + 1}`), url: f.url }));

        if (!jobs.length) {
            for (const ch of [...new Set((text.match(UNI) || []))].slice(0, 20)) {
                jobs.push({ name: `e_${[...ch][0].codePointAt(0).toString(16)}`, url: twemoji(ch) });
            }
        }

        if (!jobs.length) {
            return message.reply("**الاستخدام:**\n• `addemoji` + إيموجيات من أي سيرفر\n• `addemoji الاسم` + صورة مرفقة\n• `addemoji الاسم رابط`\n• `addemoji ❄️` (إيموجي عادي)\n• أو رد على رسالة فيها إيموجيات/صور بـ `addemoji`");
        }

        const added = [], failed = [];
        for (const j of jobs.slice(0, 30)) {
            try {
                const e = await message.guild.emojis.create(j.url, safeName(j.name), { reason: `addemoji by ${message.author.tag}` });
                added.push(e.toString());
            } catch (err) {
                let why = err.message || "خطأ";
                if (/maximum number of emojis|slots/i.test(why)) why = "ما بقي مكان للإيموجيات";
                else if (/256|size|too large/i.test(why)) why = "حجم الصورة أكبر من 256KB";
                else if (/Missing Permissions/i.test(why)) why = "البوت ما عنده صلاحية Manage Emojis";
                failed.push(`\`${safeName(j.name)}\`: ${why}`);
                if (/ما بقي/.test(why)) break;
            }
        }

        const out = [];
        if (added.length) out.push(`✅ انضافت **${added.length}**: ${added.join(" ")}`);
        if (failed.length) out.push(`❌ فشلت:\n${failed.slice(0, 8).join("\n")}`);
        return message.reply({ content: out.join("\n"), allowedMentions: { parse: [] } });
    }
};
