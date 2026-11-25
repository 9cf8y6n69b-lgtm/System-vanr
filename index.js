// ═══════════════════════════════════════════════
//  Voki • الملف الرئيسي
//  شغّله من داخل مجلد البوت:  node index.js
// ═══════════════════════════════════════════════
try { require("dotenv").config(); } catch {}

const { Client, Collection, Intents } = require("discord.js");

let config = {};
try { config = require("./config.json"); } catch {}

const TOKEN = process.env.TOKEN || config.token;
const MONGO_URI = process.env.MONGO_URI || config.db;

if (!TOKEN) {
    console.error("❌ ما فيه توكن. حطه في ملف .env بهذا الشكل:  TOKEN=xxxxx");
    process.exit(1);
}

// سيرفر صغير عشان Render (Web Service) يلقى بورت مفتوح ولا يعتبر الخدمة فاشلة
let webHandler = (req, res) => { res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" }); res.end("Voki bot is running"); };
require("http")
    .createServer((req, res) => webHandler(req, res))
    .listen(process.env.PORT || 3000, () => console.log(`[WEB] listening on ${process.env.PORT || 3000}`));

const client = new Client({
    intents: Object.values(Intents.FLAGS), // لازم تفعّل Presence + Server Members + Message Content من Developer Portal
    partials: ["MESSAGE", "CHANNEL", "REACTION", "GUILD_MEMBER", "USER"]
});

client.setMaxListeners(0);
client.commands = new Collection();
client.slashCommands = new Collection();

// ⚠️ لازم يتصدّر العميل قبل تحميل أي ملف يسوي require("../index")
module.exports = client;

// الداشبورد (يحتاج DASH_PASSWORD في Environment)
try { webHandler = require("./utils/dashboard").handler(client); } catch (error) { console.error("[DASH] ما اشتغل:", error.message); }

process.on("unhandledRejection", error => console.error("[unhandledRejection]", error));
process.on("uncaughtException", error => console.error("[uncaughtException]", error));

// صور Voki التلقائية على إمبدات بعض الأوامر (القائمة في botinfo.json)
require("./utils/voki").installBannerPatch();

// ───────── تشخيص: يكشف لو Message Content مو مفعّل (وقتها الأوامر ما تشتغل أبداً) ─────────
let warnedEmpty = false;

client.on("messageCreate", message => {
    if (process.env.DEBUG_MESSAGES) {
        console.log(`[MSG] ${message.guild ? message.guild.name : "DM"} #${message.channel.name || "-"} ${message.author.tag}: ${message.content}`);
    }

    if (
        !warnedEmpty &&
        message.guild &&
        !message.author.bot &&
        !message.content &&
        !message.attachments.size &&
        !message.embeds.length &&
        !message.stickers.size
    ) {
        warnedEmpty = true;
        console.error(
            "\n⚠️  وصلت رسالة بدون محتوى. غالباً Message Content Intent مو مفعّل.\n" +
            "    افتح Developer Portal ← Bot ← Privileged Gateway Intents ← فعّل Message Content Intent ثم أعد التشغيل.\n"
        );
    }
});

async function main() {
    // 0) حفظ دائم: يرجّع الإعدادات من MongoDB قبل تحميل أي شي
    try {
        await require("./utils/persist").init(MONGO_URI);
    } catch (error) {
        console.error("[PERSIST] فشل الاتصال بـ MongoDB:", error.message);
    }

    // 1) الأوامر + الأحداث (ننتظرها قبل الدخول عشان ما تضيع أول رسائل)
    await require("./handler")(client);

    // 2) الأحداث القديمة (لوقات، رد تلقائي، رول تلقائي...)
    try {
        require("./Extras/Guild/Index.js");
    } catch (error) {
        console.error("[EXTRAS] فشل تحميل Extras/Guild/Index.js:", error);
    }

    client.once("ready", () => {
        try { require("./utils/backup").start(client); } catch (e) { console.error("[BACKUP]", e.message); }
        console.log(`✦ Voki online: ${client.user.tag} | ${client.commands.size} أمر | ${client.guilds.cache.size} سيرفر`);
        console.log("  لو الأوامر ما ترد: شغّل البوت بـ DEBUG_MESSAGES=1 node index.js وشوف هل تظهر الرسائل.");
    });

    // 4) الدخول مع رسائل خطأ مفهومة
    try {
        await client.login(TOKEN);
    } catch (error) {
        console.error("\n❌ فشل تسجيل الدخول:", error.message);

        if (/disallowed intents/i.test(error.message)) {
            console.error(
                "السبب: الـ Intents المميزة مو مفعلة. من Developer Portal ← Bot فعّل الثلاثة:\n" +
                "  • Presence Intent  • Server Members Intent  • Message Content Intent\n"
            );
        } else if (/invalid token|an invalid token/i.test(error.message)) {
            console.error("السبب: التوكن غلط أو انعمل له Reset. خذ توكن جديد وحطه في .env\n");
        }

        process.exit(1);
    }
}

main();
