
const Pro = require("pro.db");
const WC = require("../../utils/welcomeCfg");
const https = require("https");
const { createCanvas, loadImage } = require("canvas");

const MAX_SIZE = 5 * 1024 * 1024;
const PREFIX = "welcome_system_";

function downloadImage(url, redirects = 0) {
    return new Promise((resolve, reject) => {
        if (redirects > 4) return reject(new Error("Too many redirects"));

        https.get(url, res => {
            if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
                res.resume();
                if (!res.headers.location) return reject(new Error("Invalid redirect"));
                return resolve(downloadImage(res.headers.location, redirects + 1));
            }

            if (res.statusCode !== 200) {
                res.resume();
                return reject(new Error("Image download failed"));
            }

            const type = res.headers["content-type"] || "";
            if (!type.startsWith("image/")) {
                res.resume();
                return reject(new Error("Not an image"));
            }

            const chunks = [];
            let size = 0;

            res.on("data", chunk => {
                size += chunk.length;

                if (size > MAX_SIZE) {
                    res.destroy(new Error("Image exceeds 5 MB"));
                    return;
                }

                chunks.push(chunk);
            });

            res.on("end", () => {
                resolve({
                    buffer: Buffer.concat(chunks),
                    contentType: type
                });
            });

            res.on("error", reject);
        }).on("error", reject);
    });
}

// اكتشاف مساحة بيضاء مصمتة وشبه دائرية
async function detectWhiteCircle(buffer) {
    const image = await loadImage(buffer);

    const scale = Math.min(1, 360 / image.width);
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));

    const scan = createCanvas(width, height);
    const ctx = scan.getContext("2d");

    ctx.drawImage(image, 0, 0, width, height);

    const pixels = ctx.getImageData(0, 0, width, height).data;
    const count = width * height;

    const mask = new Uint8Array(count);
    const visited = new Uint8Array(count);
    const queue = new Int32Array(count);

    for (let i = 0; i < count; i++) {
        const p = i * 4;

        if (
            pixels[p + 3] > 220 &&
            pixels[p] > 228 &&
            pixels[p + 1] > 228 &&
            pixels[p + 2] > 228
        ) {
            mask[i] = 1;
        }
    }

    const candidates = [];

    for (let start = 0; start < count; start++) {
        if (!mask[start] || visited[start]) continue;

        let head = 0;
        let tail = 0;
        let area = 0;
        let perimeter = 0;

        let minX = width;
        let minY = height;
        let maxX = -1;
        let maxY = -1;

        queue[tail++] = start;
        visited[start] = 1;

        while (head < tail) {
            const index = queue[head++];
            const x = index % width;
            const y = Math.floor(index / width);

            area++;

            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);

            const neighbors = [
                [x - 1, y],
                [x + 1, y],
                [x, y - 1],
                [x, y + 1]
            ];

            for (const [nx, ny] of neighbors) {
                if (
                    nx < 0 || ny < 0 ||
                    nx >= width || ny >= height
                ) {
                    perimeter++;
                    continue;
                }

                const ni = ny * width + nx;

                if (!mask[ni]) {
                    perimeter++;
                } else if (!visited[ni]) {
                    visited[ni] = 1;
                    queue[tail++] = ni;
                }
            }
        }

        const w = maxX - minX + 1;
        const h = maxY - minY + 1;

        if (w < 18 || h < 18) continue;

        const aspect = Math.min(w, h) / Math.max(w, h);
        const fill = area / (w * h);

        const circularity = perimeter
            ? (4 * Math.PI * area) / (perimeter * perimeter)
            : 0;

        if (
            aspect >= 0.82 &&
            fill >= 0.55 &&
            fill <= 0.92 &&
            circularity >= 0.48
        ) {
            candidates.push({
                x: ((minX + maxX) / 2) / scale,
                y: ((minY + maxY) / 2) / scale,
                radius: (Math.min(w, h) / 2) / scale,
                score: Math.abs(0.785 - fill) + Math.abs(1 - aspect)
            });
        }
    }

    candidates.sort((a, b) => a.score - b.score);

    if (!candidates.length) {
        throw new Error("WHITE_CIRCLE_NOT_FOUND");
    }

    if (
        candidates.length > 1 &&
        candidates[1].score - candidates[0].score < 0.08
    ) {
        throw new Error("MULTIPLE_WHITE_CIRCLES");
    }

    return {
        x: candidates[0].x,
        y: candidates[0].y,
        radius: candidates[0].radius
    };
}

function collectOne(channel, filter) {
    return channel.awaitMessages({
        filter,
        max: 1,
        time: 60000,
        errors: ["time"]
    }).then(collected => collected.first());
}

async function makeWelcomeImage(member, saved) {
    const template = await loadImage(
        Buffer.from(saved.template, "base64")
    );

    const canvas = createCanvas(template.width, template.height);
    const ctx = canvas.getContext("2d");

    ctx.drawImage(template, 0, 0);

    const avatarUrl = member.user.displayAvatarURL({
        format: "png",
        dynamic: false,
        size: 512
    });

    const avatar = await loadImage(avatarUrl);
    const { x, y, radius } = saved.circle;

    ctx.save();

    ctx.beginPath();
    ctx.arc(x, y, radius * 0.94, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    ctx.drawImage(
        avatar,
        x - radius * 0.94,
        y - radius * 0.94,
        radius * 1.88,
        radius * 1.88
    );

    ctx.restore();

    return canvas.toBuffer("image/png");
}

module.exports = {
    name: "welcome",
    aliases: ["ترحيب"],

    run: async (client, message, args) => {
        if (!message.guild) return;

        if (!message.member.permissions.has("MANAGE_GUILD")) {
            return message.reply("❌ تحتاج صلاحية إدارة السيرفر.");
        }

        const key = `${PREFIX}${message.guild.id}`;
        const action = (args[0] || "").toLowerCase();
        const current = Pro.get(key);

        if (["حذف", "delete"].includes(action)) {
            Pro.delete(key);
            return message.reply("🗑️ تم حذف إعدادات الترحيب.");
        }

        if (["ايقاف", "إيقاف", "off"].includes(action)) {
            if (!current) {
                return message.reply("❌ ما فيه إعدادات ترحيب.");
            }

            current.enabled = false;
            Pro.set(key, current);

            return message.reply("⏸️ تم إيقاف الترحيب.");
        }

        if (["تشغيل", "on"].includes(action)) {
            if (!current || !current.template || !current.channelId) {
                return message.reply("❌ إعداد الترحيب غير مكتمل.");
            }

            current.enabled = true;
            Pro.set(key, current);

            return message.reply("✅ تم تشغيل الترحيب.");
        }

        if (["عرض", "show"].includes(action)) {
            if (!current || !current.template) {
                return message.reply("❌ ما فيه تصميم محفوظ.");
            }

            return message.channel.send({
                files: [{
                    attachment: Buffer.from(current.template, "base64"),
                    name: "welcome-template.png"
                }]
            });
        }

        if (["تجربة", "test"].includes(action)) {
            if (!current || !current.template || !current.channelId) {
                return message.reply("❌ إعداد الترحيب غير مكتمل.");
            }

            const target = message.guild.channels.cache.get(current.channelId);

            if (!target) {
                return message.reply("❌ روم الترحيب غير موجود.");
            }

            const preview = await makeWelcomeImage(message.member, current);

            return target.send({
                content:
                    `🧪 معاينة الترحيب — أهلاً ${message.author}` +
                    (current.extraText ? `\n${current.extraText}` : ""),
                files: [{
                    attachment: preview,
                    name: "welcome-preview.png"
                }]
            });
        }

        await message.reply(
            "🖼️ أرسل صورة تصميم الترحيب خلال 60 ثانية.\n" +
            "مهم: مكان صورة العضو لازم يكون دائرة بيضاء مصمتة وواضحة، وليس مجرد إطار."
        );

        try {
            const imageMessage = await collectOne(
                message.channel,
                m => m.author.id === message.author.id &&
                    m.attachments.size > 0
            );

            const attachment = imageMessage.attachments.first();

            if (
                !attachment.contentType ||
                !attachment.contentType.startsWith("image/")
            ) {
                return message.channel.send("❌ الملف المرسل ليس صورة.");
            }

            if (attachment.size > MAX_SIZE) {
                return message.channel.send("❌ حجم الصورة أكبر من 5 ميجابايت.");
            }

            const downloaded = await downloadImage(attachment.url);

            let circle;

            try {
                circle = await detectWhiteCircle(downloaded.buffer);
            } catch (error) {
                if (error.message === "WHITE_CIRCLE_NOT_FOUND") {
                    // ما فيه دائرة بيضاء: نخلي العضو يختار مكان صورته بنفسه
                    await message.channel.send(
                        "ℹ️ ما لقيت دائرة بيضاء في التصميم.\n" +
                        "• اكتب `تخطي` عشان أستخدم التصميم **بدون صورة العضو**.\n" +
                        "• أو اختر مكان صورة العضو: `وسط` `يمين` `يسار` `فوق` `تحت`"
                    );

                    const posMessage = await collectOne(
                        message.channel,
                        m => m.author.id === message.author.id
                    );

                    const spots = {
                        "وسط": [0.5, 0.5], "center": [0.5, 0.5],
                        "يمين": [0.82, 0.5], "right": [0.82, 0.5],
                        "يسار": [0.18, 0.5], "left": [0.18, 0.5],
                        "فوق": [0.5, 0.24], "top": [0.5, 0.24],
                        "تحت": [0.5, 0.76], "bottom": [0.5, 0.76]
                    };

                    const answerPos = posMessage.content.trim().toLowerCase();
                    const spot = spots[answerPos];
                    const noAvatar = ["تخطي", "تخطى", "skip", "بدون", "none", "no", "لا"].includes(answerPos);

                    if (noAvatar) {
                        circle = { x: 0, y: 0, radius: 0, none: true };
                    } else if (!spot) {
                        return message.channel.send("❌ اختيار غير معروف. أعد المحاولة واختر: تخطي / وسط / يمين / يسار / فوق / تحت.");
                    }

                    if (!noAvatar) {
                        const img = await loadImage(downloaded.buffer);

                        circle = {
                            x: Math.round(img.width * spot[0]),
                            y: Math.round(img.height * spot[1]),
                            radius: Math.round(Math.min(img.width, img.height) * 0.16)
                        };
                    }
                } else

                if (error.message === "MULTIPLE_WHITE_CIRCLES") {
                    return message.channel.send(
                        "⚠️ لقيت أكثر من دائرة بيضاء محتملة. خلّ في التصميم دائرة واحدة واضحة ثم أعد الأمر."
                    );
                } else {
                    throw error;
                }
            }

            await message.channel.send(
                "✅ تم تحديد الدائرة البيضاء.\n" +
                "تبي تضيف عبارة تظهر مع الترحيب؟ اكتب العبارة أو اكتب لا."
            );

            const textMessage = await collectOne(
                message.channel,
                m => m.author.id === message.author.id
            );

            const answer = textMessage.content.trim();

            const extraText = [
                "لا",
                "لا شكرا",
                "لا شكرًا",
                "no",
                "none"
            ].includes(answer.toLowerCase())
                ? ""
                : answer.slice(0, 150);

            await message.channel.send(
                "📢 أرسل منشن روم الترحيب خلال 60 ثانية."
            );

            const channelMessage = await collectOne(
                message.channel,
                m => m.author.id === message.author.id &&
                    m.mentions.channels.size > 0
            );

            const target = channelMessage.mentions.channels.first();

            if (!target || target.type !== "GUILD_TEXT") {
                return message.channel.send("❌ اختر رومًا كتابيًا صحيحًا.");
            }

            const botMember = message.guild.me;

            if (!target.permissionsFor(botMember).has([
                "SEND_MESSAGES",
                "ATTACH_FILES"
            ])) {
                return message.channel.send(
                    "❌ البوت يحتاج صلاحية إرسال الرسائل وإرفاق الملفات في الروم المحدد."
                );
            }

            WC.set(message.guild.id, { imgAvatar: !circle.none });

            Pro.set(key, {
                enabled: true,
                template: downloaded.buffer.toString("base64"),
                fileName: attachment.name || "welcome-template.png",
                circle,
                extraText,
                channelId: target.id
            });

            return message.channel.send(
                `✅ اكتمل إعداد الترحيب وحُفظ التصميم.\n` +
                `📍 روم الترحيب: ${target}\n` +
                "اكتب `welcome تجربة` لمعاينة البطاقة."
            );

        } catch (error) {
            if (error.message === "time") {
                return message.channel.send(
                    "⌛ انتهى وقت الإعداد. اكتب welcome للمحاولة من جديد."
                );
            }

            console.error("[WELCOME SETUP ERROR]:", error);

            return message.channel.send(
                "❌ صار خطأ أثناء الإعداد. راجع سجل Render."
            );
        }
    }
};

// ───────────── الأمر الجديد: welcome / ترحيب يفتح لوحة welcomeset ─────────────
const _welcome = module.exports;
_welcome.helpers = { downloadImage, detectWhiteCircle, MAX_SIZE };
_welcome.legacyRun = _welcome.run;
_welcome.run = (client, message, args) => client.commands.get("welcomeset").run(client, message, args);
