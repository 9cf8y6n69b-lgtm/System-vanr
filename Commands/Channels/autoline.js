
const { MessageEmbed } = require("discord.js");
const Pro = require("pro.db");
const https = require("https");

const MAX_SIZE = 5 * 1024 * 1024;

function downloadImage(url, redirects = 0) {
    return new Promise((resolve, reject) => {
        if (redirects > 3) {
            return reject(new Error("Too many redirects"));
        }

        https.get(url, (res) => {
            if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
                res.resume();

                if (!res.headers.location) {
                    return reject(new Error("Invalid redirect"));
                }

                return resolve(
                    downloadImage(res.headers.location, redirects + 1)
                );
            }

            if (res.statusCode !== 200) {
                res.resume();
                return reject(new Error("Image download failed"));
            }

            const contentType = res.headers["content-type"] || "";

            if (!contentType.startsWith("image/")) {
                res.resume();
                return reject(new Error("Not an image"));
            }

            const chunks = [];
            let size = 0;

            res.on("data", chunk => {
                size += chunk.length;

                if (size > MAX_SIZE) {
                    res.destroy(new Error("Image is too large"));
                    return;
                }

                chunks.push(chunk);
            });

            res.on("end", () => {
                resolve({
                    buffer: Buffer.concat(chunks),
                    contentType
                });
            });

            res.on("error", reject);
        }).on("error", reject);
    });
}

module.exports = {
    name: "autoline",
    aliases: ["autoline-set", "فاصل"],

    run: async (client, message, args) => {
        if (!message.member.permissions.has("MANAGE_CHANNELS")) {
            return message.reply("❌ تحتاج صلاحية إدارة القنوات.");
        }

        const action = (args[0] || "").toLowerCase();

        const mentionedChannel = message.mentions.channels.first();

        const channel =
            mentionedChannel || message.channel;

        const key =
            `autoline_image_${message.guild.id}_${channel.id}`;

        // حذف صورة الفاصل
        if (action === "حذف" || action === "delete") {
            Pro.delete(key);

            return message.reply(
                `🗑️ تم حذف صورة الفاصل من ${channel}.`
            );
        }

        // إيقاف الفاصل
        if (action === "ايقاف" || action === "إيقاف") {
            const data = Pro.get(key);

            if (!data || !data.image) {
                return message.reply(
                    "❌ لا توجد صورة فاصل محفوظة لهذه القناة."
                );
            }

            data.enabled = false;
            Pro.set(key, data);

            return message.reply(
                "⏸️ تم إيقاف الفاصل التلقائي."
            );
        }

        // تشغيل الفاصل
        if (action === "تشغيل") {
            const data = Pro.get(key);

            if (!data || !data.image) {
                return message.reply(
                    "❌ لم يتم حفظ صورة فاصل لهذه القناة."
                );
            }

            data.enabled = true;
            Pro.set(key, data);

            return message.reply(
                "✅ تم تشغيل الفاصل التلقائي."
            );
        }

        // عرض الصورة المحفوظة
        if (action === "عرض") {
            const data = Pro.get(key);

            if (!data || !data.image) {
                return message.reply(
                    "❌ لا توجد صورة محفوظة."
                );
            }

            return message.channel.send({
                files: [{
                    attachment: Buffer.from(
                        data.image,
                        "base64"
                    ),
                    name: data.fileName || "autoline.png"
                }]
            });
        }

        // صورة مرفقة مع الأمر نفسه
        const direct = message.attachments.first();

        if (direct && direct.contentType && direct.contentType.startsWith("image/") && direct.size <= MAX_SIZE) {
            const downloaded = await downloadImage(direct.url).catch(() => null);

            if (!downloaded) return message.reply("❌ تعذر تحميل الصورة.");

            Pro.set(key, {
                enabled: true,
                image: downloaded.buffer.toString("base64"),
                contentType: downloaded.contentType,
                fileName: direct.name || "autoline.png"
            });

            return message.reply(`✅ تم حفظ الخط وتفعيله في ${channel}.`);
        }

        // طلب صورة جديدة
        await message.reply(
            `🖼️ أرسل صورة الفاصل الآن خلال 60 ثانية.\nالقناة المستهدفة: ${channel}`
        );

        try {
            const collected = await message.channel.awaitMessages({
                filter: m =>
                    m.author.id === message.author.id &&
                    m.attachments.size > 0,

                max: 1,
                time: 60000,
                errors: ["time"]
            });

            const image = collected.first().attachments.first();

            if (!image.contentType ||
                !image.contentType.startsWith("image/")) {
                return message.channel.send(
                    "❌ الملف المرسل ليس صورة."
                );
            }

            if (image.size > MAX_SIZE) {
                return message.channel.send(
                    "❌ حجم الصورة أكبر من 5 ميجابايت."
                );
            }

            const downloaded = await downloadImage(image.url);

            const data = {
                enabled: true,
                image: downloaded.buffer.toString("base64"),
                contentType: downloaded.contentType,
                fileName: image.name || "autoline.png"
            };

            Pro.set(key, data);

            return message.channel.send(
                `✅ تم حفظ صورة الفاصل واعتمادها للقناة ${channel}.\nسيتم إرسالها بعد رسائل الأعضاء تلقائيًا.`
            );

        } catch (error) {
            console.error("[AUTOLINE ERROR]:", error);

            if (error.message === "time") {
                return message.channel.send(
                    "⌛ انتهى الوقت. أعد أمر autoline للمحاولة."
                );
            }

            return message.channel.send(
                "❌ تعذر حفظ الصورة. حاول مرة أخرى."
            );
        }
    }
};
