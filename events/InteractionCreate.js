const client = require("../index");
const { MessageEmbed } = require("discord.js");
const db = require("pro.db");
const { prefix } = require(`${process.cwd()}/config`);

// أزرار/قوائم تتعامل مع الرد بنفسها (ما نسوي لها deferUpdate تلقائي)
const SKIP_DEFER = ["help"];
// أي زر/قائمة تبدأ بـ tk_ (التذاكر) أو lg_ (اللوقات) يتعامل معها ملفها الخاص
const isOwnComponent = (id) => SKIP_DEFER.includes(id) || String(id).startsWith("tk_") || String(id).startsWith("lg_") || String(id).startsWith("hp_") || String(id).startsWith("pr_") || String(id).startsWith("tkc_") || String(id).startsWith("tkc:") || String(id).startsWith("lgp:") || String(id).startsWith("flt:");

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// قوائم الأوامر: [اسم الأمر, الشرح]
// الشرح مكتوب من أسماء الملفات، عدّل أي شرح مو مضبوط
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const CMDS = {
    general: [
        ["ai", "الذكاء الاصطناعي"],
        ["aremove", "إزالة"],
        ["change", "تغيير"],
        ["circle", "تدوير الصورة"],
        ["color", "عرض لون"],
        ["colors", "قائمة الألوان"],
        ["mcolors", "ألوان متعددة"],
        ["edit-image", "تعديل صورة"],
        ["evaluation", "التقييم"],
        ["help", "قائمة المساعدة"],
        ["link", "رابط"],
        ["msg", "إرسال رسالة"],
        ["roll", "قرعة / رقم عشوائي"],
        ["say", "يكرر كلامك"],
        ["savatar", "صورة السيرفر"],
        ["semoji", "إيموجي السيرفر"],
    ],
    admin: [
        ["addemoji", "إضافة إيموجي"],
        ["aemoji", "إيموجي"],
        ["addrole", "إضافة رول"],
        ["role", "إعطاء رول لعضو"],
        ["roleall", "إعطاء رول للجميع"],
        ["roleremove", "سحب رول"],
        ["srole", "معلومات رول"],
        ["ban", "حظر عضو"],
        ["unban", "فك حظر عضو"],
        ["unban-all", "فك الحظر عن الجميع"],
        ["unbanal", "فك الحظر عن الجميع"],
        ["allbans", "قائمة المحظورين"],
        ["kick", "طرد عضو"],
        ["kickofflinebots", "طرد البوتات الأوفلاين"],
        ["mute", "ميوت كتابي"],
        ["unmute", "فك الميوت الكتابي"],
        ["mymute", "ميوتاتي"],
        ["vmute", "ميوت صوتي"],
        ["unvmute", "فك الميوت الصوتي"],
        ["vunmute", "فك الميوت الصوتي"],
        ["vkick", "طرد من الروم الصوتي"],
        ["timeout", "تايم أوت"],
        ["untimeout", "فك التايم أوت"],
        ["prison", "سجن عضو"],
        ["unprison", "إخراج من السجن"],
        ["myprison", "سجني"],
        ["warn", "تحذير عضو"],
        ["warnings", "عرض التحذيرات"],
        ["remove-warn", "حذف تحذير"],
        ["blacklist", "إضافة للقائمة السوداء"],
        ["unblacklist", "إزالة من القائمة السوداء"],
        ["setupblchat", "إعداد شات القائمة السوداء"],
        ["blockpic", "منع الصور عن عضو"],
        ["removeblockpic", "إزالة منع الصور"],
        ["showblockpic", "عرض الممنوعين من الصور"],
        ["pic", "إعطاء صلاحية الصور"],
        ["clear", "مسح الرسائل"],
        ["lock", "قفل الشات"],
        ["unlock", "فتح الشات"],
        ["hide", "إخفاء الشات"],
        ["show", "إظهار الشات"],
        ["slowmode", "السلو مود"],
        ["move", "نقل عضو صوتياً"],
        ["moveme", "نقلي لعضو"],
        ["voiceroom", "الرومات الصوتية"],
        ["nick", "تغيير نك نيم"],
        ["setnick", "تعيين نك نيم"],
        ["showmembers", "عرض أعضاء رول"],
        ["here", "المتواجدين"],
        ["live", "حالة البث"],
        ["check", "فحص عضو"],
        ["records", "سجلات العضو"],
        ["stats", "إحصائيات"],
        ["stickers", "الملصقات"],
        ["applay", "قبول تقديم"],
        ["disapplay", "رفض تقديم"],
    ],
    channels: [
        ["autoline", "تفعيل الخط التلقائي"],
        ["unline", "إيقاف الخط التلقائي"],
        ["dltrchat", "حذف شات الرد"],
        ["setrchat", "تعيين شات الرد"],
        ["dreply", "حذف رد"],
        ["embed", "إرسال إمبد"],
        ["feel", "شات المشاعر"],
        ["feedrate", "شات التقييم"],
        ["rate", "تقييم"],
        ["hideall", "إخفاء كل الشاتات"],
        ["unhideall", "إظهار كل الشاتات"],
        ["hide", "إخفاء شات"],
        ["unhide", "إظهار شات"],
        ["mhide", "إخفاء عدة شاتات"],
        ["mshow", "إظهار عدة شاتات"],
        ["ochat", "فتح شات"],
        ["setpic", "تعيين شات الصور"],
        ["unpic", "إلغاء شات الصور"],
        ["setrcolor", "تعيين لون الرد"],
        ["setrimage", "تعيين صورة الرد"],
    ],
    info: [
        ["avatar", "صورة العضو"],
        ["banner", "بنر العضو"],
        ["id", "آيدي العضو"],
        ["user", "معلومات العضو"],
        ["profile", "البروفايل"],
        ["server", "معلومات السيرفر"],
        ["ping", "سرعة البوت"],
        ["myinv", "دعواتي"],
        ["top", "التوب"],
        ["topinv", "توب الدعوات"],
        ["top-invites", "توب الدعوات"],
        ["topinvites", "توب الدعوات"],
        ["adminlist", "قائمة الإداريين في الصوت"],
        ["infractions", "المخالفات الصوتية"],
        ["lastvoice", "آخر تواجد صوتي"],
        ["rooms", "الرومات الصوتية"],
    ],
    roles: [
        ["autorole", "رول تلقائي"],
        ["checkvc", "فحص الصوت"],
        ["daorole", "حذف رول تلقائي"],
        ["dsrole", "حذف رول"],
        ["editrole", "تعديل رول"],
        ["myrole", "رولاتي"],
        ["r", "رول"],
        ["setreactionrole", "إعداد رول بالرياكشن"],
        ["rereactrole", "إعادة رول الرياكشن"],
    ],
    tickets: [
        ["ticket setup", "تحديد الكاتيغوري وروم الطلبات واللوق"],
        ["ticket panel", "إرسال لوحة التذاكر"],
        ["ticket style", "تخصيص الشكل والصور"],
        ["ticket option-add", "إضافة قسم"],
        ["ticket option-remove", "حذف قسم"],
        ["ticket transfer-add", "إضافة هدف للتحويل"],
        ["ticket transfer-remove", "حذف هدف تحويل"],
        ["ticket status", "عرض الإعدادات"],
        ["ticket reset", "إعادة الضبط"],
    ],
    logs: [
        ["log all", "كل اللوقات في روم واحد"],
        ["log set", "اختيار لوقات لروم معين"],
        ["log disable", "إيقاف لوقات"],
        ["log status", "عرض الإعدادات"],
        ["log prison-role", "رول السجن"],
        ["log reset", "إعادة الضبط"],
    ],
    tweets: [
        ["chat-cut", "تعيين شات الكت"],
        ["cut-tweets", "أسئلة الكت"],
        ["image-cut", "صور الكت"],
    ],
    avatars: [
        ["avtchats", "تعيين شات الأفتارات"],
        ["avtclear", "مسح شات الأفتارات"],
    ],
    protection: [
        ["setsecurity", "إعداد الحماية"],
        ["status", "حالة الحماية"],
        ["maxsec", "أقصى حماية"],
        ["sechard", "حماية قوية"],
        ["setlimit", "تعيين الحد"],
        ["setrjoin", "إعداد حماية الدخول"],
        ["anti", "إعدادات الأنتي"],
        ["anticreate", "منع إنشاء الشاتات"],
        ["antidelete", "منع الحذف"],
        ["antiperms", "منع تعديل الصلاحيات"],
        ["antiwebhook", "منع الويب هوك"],
        ["antibots", "منع البوتات"],
        ["antijoin", "منع الدخول"],
        ["antilink", "منع الروابط"],
        ["antispam", "منع السبام"],
        ["word", "كلمة ممنوعة"],
        ["wordlist", "قائمة الكلمات الممنوعة"],
        ["block", "حظر من البوت"],
        ["unblock", "فك الحظر من البوت"],
        ["wantilist", "قائمة المستثنين"],
        ["pslist", "قائمة الحماية"],
        ["restbackup", "استرجاع نسخة احتياطية"],
        ["restemoji", "استرجاع الإيموجي"],
        ["cols", "الألوان"],
        ["aprot", "تفعيل الحماية"],
        ["dprot", "إيقاف الحماية"],
        ["sloprot", "حماية السلو مود"],
        ["advice", "نصائح"],
        ["bots", "قائمة البوتات"],
        ["serveravatar", "تغيير صورة السيرفر"],
        ["servername", "تغيير اسم السيرفر"],
    ],
    owners: [
        ["Settings", "إعدادات البوت"],
        ["aiset", "إعدادات الذكاء الاصطناعي"],
        ["allow", "السماح"],
        ["autoreply", "إضافة رد تلقائي"],
        ["dautoreply", "حذف رد تلقائي"],
        ["cline", "مسح الخط"],
        ["setline", "تعيين الخط"],
        ["creatcolors", "إنشاء رولات ألوان"],
        ["setcolors", "تعيين الألوان"],
        ["setecolor", "تعيين لون الإمبد"],
        ["detlog", "حذف اللوق"],
        ["setlog", "تعيين اللوق"],
        ["join", "إدخال البوت للروم"],
        ["movelink", "رابط النقل"],
        ["order", "الأوامر"],
        ["owners", "قائمة الأونرز"],
        ["setowner", "إضافة أونر"],
        ["restart", "إعادة تشغيل البوت"],
        ["setavatar", "تغيير صورة البوت"],
        ["setname", "تغيير اسم البوت"],
        ["setprefix", "تغيير البريفكس"],
        ["setstatus", "تغيير حالة البوت"],
        ["setclear", "إعداد المسح"],
        ["setreact", "تعيين رياكشن"],
        ["unreact", "حذف رياكشن"],
        ["uptime", "مدة تشغيل البوت"],
    ],
};

// يحول قائمة الأوامر لنص (الحد الأقصى لوصف الإمبد 4096 حرف)
function build(list, p = prefix) {
    const text = list.map(([name, desc]) => `\`${p}${name}\` ← ${desc}`).join("\n");
    return text.length > 4000 ? text.slice(0, 4000) + "..." : text;
}

// صفحات قائمة المساعدة
const HELP_PAGES = {
    "1help_option":  { title: "⚙ الأوامر العامة",   desc: build(CMDS.general) },
    "2help_option":  { title: "⚙ أوامر الادارة",    desc: build(CMDS.admin) },
    "5help_option":  { title: "⚙ أوامر الإعدادات",  desc: build(CMDS.channels) + "\n\n**📋 اللوقات**\n" + build(CMDS.logs, "/") },
    "11help_option": { title: "⚙ أوامر المعلومات",  desc: build(CMDS.info) },
    "9help_option":  { title: "⚙ أوامر الرولات",    desc: build(CMDS.roles) },
    "10help_option": { title: "⚙ أوامر التذكرة",    desc: build(CMDS.tickets, "/") },
    "12help_option": { title: "⚙ أوامر الكت",       desc: build(CMDS.tweets) },
    "3help_option":  { title: "⚙ أوامر الترحيب",    desc: "هنا قائمة أوامر الترحيب..." },
    "13help_option": { title: "⚙ أوامر الإفتارت",   desc: build(CMDS.avatars) },
    "4help_option":  { title: "⚙ أوامر الحماية",    desc: build(CMDS.protection) },
    "7help_option":  { title: "⚙ أوامر مالك البوت", desc: build(CMDS.owners) },
};

client.on("interactionCreate", async (interaction) => {
    if (!interaction.guild) return;

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // حماية عامة: لو ما أحد رد على الزر/القائمة خلال 2.5 ثانية نسوي deferUpdate
    // (قبل كذا كان يسوي defer فوراً ويكسر أي ملف يرد بـ reply/editReply،
    //  وهذا سبب اختفاء القوائم وفشل التكت)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    try {
        if (interaction.isButton() || interaction.isSelectMenu()) {
            setTimeout(() => {
                if (!interaction.deferred && !interaction.replied) {
                    interaction.deferUpdate().catch(() => {});
                }
            }, 2500);
        }
    } catch {}

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Slash Commands
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (interaction.isCommand()) {
        const cmd = client.slashCommands.get(interaction.commandName);
        if (!cmd) return interaction.reply({ content: `**❌ حدث خطأ**`, ephemeral: true }).catch(() => {});
        const args = [];
        for (let option of interaction.options.data) {
            if (option.type === "SUB_COMMAND") {
                if (option.name) args.push(option.name);
                option.options?.forEach(x => { if (x.value) args.push(x.value); });
            } else if (option.value) args.push(option.value);
        }
        interaction.member = interaction.guild.members.cache.get(interaction.user.id);

        const CCfg = require("../utils/cmdConfig");
        const realCmd = client.commands.get(cmd.name) || cmd;
        const blocked = CCfg.blockReason(interaction.guild, interaction.member, interaction.channel, cmd.name, realCmd);
        if (blocked) return interaction.reply({ content: `⛔ ${blocked}`, ephemeral: true }).catch(() => {});

        if (interaction.member && !interaction.member.permissions.has("ADMINISTRATOR") && CCfg.granted(interaction.guild, interaction.member, realCmd)) CCfg.grantPerms(interaction, interaction.member);

        Promise.resolve()
            .then(() => cmd.run(client, interaction, args))
            .then(() => client.logCommand && client.logCommand(interaction.guild, interaction.member, interaction.channel, client.commands.get(cmd.name) || cmd, args, true))
            .catch(error => {
                console.error(`[SLASH] /${cmd.name} فشل:`, error);
                const msg = { content: `❌ صار خطأ في /${cmd.name}: ${String(error.message).slice(0, 150)}`, ephemeral: true };
                (interaction.deferred || interaction.replied ? interaction.followUp(msg) : interaction.reply(msg)).catch(() => {});
            });
        return;
    }

    if (interaction.isContextMenu()) {
        const command = client.slashCommands.get(interaction.commandName);
        if (command) command.run(client, interaction);
        return;
    }

    const guildId = interaction.guild.id;
    const userId = interaction.user.id;
    const Color = db.get(`Guild_Color = ${guildId}`) || "#000000";

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // قائمة المساعدة (Help)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (interaction.isSelectMenu() && interaction.customId === "help") {
        const choice = interaction.values[0];

        // حذف القائمة
        if (choice === "8help_option") {
            await interaction.deferUpdate().catch(() => {});
            return interaction.message.delete().catch(() => {});
        }

        // رد سريع قبل ما ينتهي الوقت (3 ثواني)
        await interaction.deferReply({ ephemeral: true }).catch(() => {});

        const page = HELP_PAGES[choice];
        if (!page) {
            return interaction.editReply({ content: "**❌ خيار غير معروف**" }).catch(() => {});
        }

        const embed = new MessageEmbed()
            .setColor(Color)
            .setTitle(page.title)
            .setDescription(page.desc)
            .setFooter("Vanr", client.user.displayAvatarURL())
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] }).catch(() => {});
        return;
    }

});
