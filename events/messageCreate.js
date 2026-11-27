
const client = require("../index");
const https = require("https");
const { MessageEmbed } = require("discord.js");
const Pro = require("pro.db");
const Vanr = require("../utils/vanr");
const CC = require("../utils/cmdConfig");
const SC = require("../utils/shortcuts");

// كاش الكوول داون
const cooldowns = new Map();

// تحميل botinfo
let botinfo;

try {
    botinfo = require(`${process.cwd()}/botinfo.json`);
} catch (error) {
    botinfo = {
        ai: {
            enabled: false
        }
    };
}

// =========================================
// الحدث الرئيسي
// =========================================

// حماية من تكرار المعالجة لنفس الرسالة داخل نفس العملية
const handled = new Set();

client.on("messageCreate", async (message) => {
    try {
        if (!message.guild || message.author.bot) return;

        if (handled.has(message.id)) return;
        handled.add(message.id);
        setTimeout(() => handled.delete(message.id), 60 * 1000);

        // =========================================
        // تشغيل جميع الأوامر بدون Prefix
        // =========================================

        // بادئة اختيارية (! أو -) + اختصارات كاملة
        const commandText = SC.normalize(message.guild.id, message.content);

        if (!commandText) return;

        const commandArgs = commandText.split(/\s+/g);
        const commandName = commandArgs.shift().toLowerCase();

        // البحث عن الأمر بالاسم أو الاختصار
        const command = CC.find(client, message.guild.id, commandName);

        // تنفيذ الأمر
        if (command) {
            // إعدادات الأمر من الهيلب (تعطيل / رتبة / روم)
            const blocked = CC.blockReason(message.guild, message.member, message.channel, command.name, command);

            if (blocked) {
                message.reply({ content: `⛔ ${blocked}`, allowedMentions: { repliedUser: false } })
                    .then(m => setTimeout(() => m.delete().catch(() => {}), 5000)).catch(() => {});
                return;
            }

            if (message.member && !message.member.permissions.has("ADMINISTRATOR") && CC.granted(message.guild, message.member, command)) CC.grantPerms(message, message.member);

            try {
                // أوامر القائمة في botinfo.json (vanrBanner) ترد إمبداتها بصورة Vanr تلقائياً
                await Vanr.runWithBanner(commandName, () =>
                    command.run(client, message, commandArgs)
                );

                if (client.logCommand) client.logCommand(message.guild, message.member, message.channel, command, commandArgs);
            } catch (error) {
                console.error(
                    `[Command Error - ${commandName}]:`,
                    error
                );

                message.reply({
                    content: "**❌ حدث خطأ أثناء تنفيذ هذا الأمر.**"
                }).catch(() => {});
            }

            return;
        }

        // =========================================
        // نظام الذكاء الاصطناعي
        // =========================================

        if (!botinfo.ai?.enabled) return;

        if (
            !botinfo.ai?.apiKey ||
            botinfo.ai.apiKey.includes("ضع_مفتاح")
        ) {
            return;
        }

        const ai = botinfo.ai;
        const content = message.content.trim();

        if (!content || content.length < 2) return;

        // الشاتات المسموحة
        if (
            ai.allowedChannelIds?.length &&
            !ai.allowedChannelIds.includes(message.channel.id)
        ) {
            return;
        }

        // الشاتات المحظورة
        if (ai.blockedChannelIds?.includes(message.channel.id)) {
            return;
        }

        // تحديد متى يرد الذكاء الاصطناعي
        let shouldRespond = false;

        if (ai.triggerMode === "mention") {
            if (message.mentions.has(client.user)) {
                shouldRespond = true;
            }
        } else if (ai.triggerMode === "keywords") {
            const lower = content.toLowerCase();

            shouldRespond = ai.triggerWords?.some(
                word => lower.includes(word.toLowerCase())
            );
        } else if (ai.triggerMode === "all") {
            shouldRespond = true;
        }

        if (!shouldRespond) return;

        // الكوول داون
        const key =
            `${message.author.id}-${message.channel.id}`;

        const lastUsed = cooldowns.get(key);
        const cdMs = (ai.cooldownSeconds || 10) * 1000;

        if (lastUsed && Date.now() - lastUsed < cdMs) {
            const remaining = Math.ceil(
                (cdMs - (Date.now() - lastUsed)) / 1000
            );

            const embed = new MessageEmbed()
                .setColor("#e74c3c")
                .setDescription(
                    `⏳ **انتظر ${remaining} ثانية قبل السؤال مجدداً**`
                );

            const msg = await message.reply({
                embeds: [embed]
            });

            setTimeout(() => {
                msg.delete().catch(() => {});
            }, 3000);

            return;
        }

        // مؤشر الكتابة
        message.channel.sendTyping().catch(() => {});

        // تنظيف المنشن
        const cleanContent = content
            .replace(/<@!?\d+>/g, "")
            .trim();

        if (!cleanContent) return;

        try {
            const answer = await askClaude(
                cleanContent,
                ai.systemPrompt,
                ai.apiKey,
                ai.model,
                ai.maxTokens
            );

            cooldowns.set(key, Date.now());

            const Color =
                Pro.get(`Guild_Color = ${message.guild.id}`) ||
                "#000000";

            const embed = new MessageEmbed()
                .setColor(Color)
                .setDescription(answer)
                .setFooter(
                    `${botinfo.botName || "Vanr"} 🤖`,
                    client.user.displayAvatarURL()
                );

            await message.reply({
                embeds: [embed]
            });

        } catch (error) {
            console.error("[AI Error]:", error.message);
        }

    } catch (error) {
        console.error("[MESSAGE CREATE ERROR]:", error);
    }
});

// =========================================
// Claude API
// =========================================

function askClaude(
    question,
    systemPrompt,
    apiKey,
    model,
    maxTokens
) {
    return new Promise((resolve, reject) => {

        const body = JSON.stringify({
            model: model || "claude-haiku-4-5-20251001",
            max_tokens: maxTokens || 400,

            system:
                systemPrompt ||
                "أنت مساعد ذكي باللغة العربية، أجب باختصار.",

            messages: [
                {
                    role: "user",
                    content: question
                }
            ]
        });

        const req = https.request(
            {
                hostname: "api.anthropic.com",
                path: "/v1/messages",
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": apiKey,
                    "anthropic-version": "2023-06-01",
                    "Content-Length": Buffer.byteLength(body)
                }
            },

            (res) => {
                let data = "";

                res.on("data", chunk => {
                    data += chunk;
                });

                res.on("end", () => {
                    try {
                        const json = JSON.parse(data);

                        if (json.error) {
                            return reject(
                                new Error(json.error.message)
                            );
                        }

                        if (json.content?.[0]?.text) {
                            return resolve(
                                json.content[0].text
                            );
                        }

                        reject(new Error("لا يوجد رد"));

                    } catch (error) {
                        reject(
                            new Error("خطأ في قراءة الرد")
                        );
                    }
                });
            }
        );

        req.setTimeout(15000, () => {
            req.destroy();
            reject(new Error("timeout"));
        });

        req.on("error", reject);

        req.write(body);
        req.end();
    });
}

// =========================================
// NOVANIGHT SYSTEM BOT
// =========================================
