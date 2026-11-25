// ═══════════════════════════════════════════════
//  Vanr • تجهيز السيرفر
//  vanrsetup            ← اسم السيرفر + صورته + رفع الإيموجيات
//  vanrsetup name       ← الاسم فقط
//  vanrsetup icon       ← الصورة فقط
//  vanrsetup emojis     ← الإيموجيات فقط
//  vanrsetup server     ← رتب + رومات + كاتيغوريات + ربط اللوقات/XP/الحماية
//  vanrsetup stickers   ← رفع الستكرات
//  vanrsetup full       ← كل شي (اسم + صورة + إيموجيات + سيرفر + ستكرات)
// ═══════════════════════════════════════════════
const fs = require("fs");
const { MessageEmbed } = require("discord.js");
const { owners } = require(`${process.cwd()}/config`);
const V = require("../../utils/vanr");
const S = require("../../utils/vanrServer");

module.exports = {
    name: "vanrsetup",
    aliases: ["فويد", "تجهيز"],

    run: async (client, message, args = []) => {
        if (!message.guild) return;

        const allowed =
            owners.includes(message.author.id) ||
            message.member.permissions.has("ADMINISTRATOR");

        if (!allowed) return message.react("❌").catch(() => {});

        const part = (args[0] || "all").toLowerCase();
        const doName = ["all", "full", "name", "اسم"].includes(part);
        const doIcon = ["all", "full", "icon", "صورة"].includes(part);
        const doEmojis = ["all", "full", "emojis", "ايموجي", "إيموجي"].includes(part);
        const doServer = ["full", "server", "سيرفر"].includes(part);
        const doStickers = ["full", "stickers", "ستكرات", "ستيكر"].includes(part);

        const lines = [];

        if (doName) {
            try {
                await message.guild.setName(V.BRAND, "Vanr setup");
                lines.push(`✦ اسم السيرفر ← **${V.BRAND}**`);
            } catch (error) {
                lines.push(`✖ الاسم: ${error.message}`);
            }
        }

        if (doIcon) {
            try {
                if (!fs.existsSync(V.ICON_PATH)) throw new Error("ملف assets/vanr-icon.png غير موجود");
                await message.guild.setIcon(V.ICON_PATH, "Vanr setup");
                lines.push("✦ صورة السيرفر ← تم تحديثها");
            } catch (error) {
                lines.push(`✖ الصورة: ${error.message}`);
            }
        }

        if (doEmojis) {
            try {
                const report = await V.uploadEmojis(message.guild);

                lines.push(
                    `✦ الإيموجيات ← جديد ${report.created.length} • موجود ${report.existed.length}` +
                    (report.failed.length ? ` • فشل ${report.failed.length}\n\`${report.failed.join("\n")}\`` : "")
                );
            } catch (error) {
                lines.push(`✖ الإيموجيات: ${error.message}`);
            }
        }

        if (doServer) {
            try {
                const r = await S.buildServer(message.guild);
                lines.push(
                    `✦ السيرفر ← رتب جديدة ${r.rolesCreated} • رومات جديدة ${r.channelsCreated}` +
                    (r.bound.length ? `\n${r.bound.map(b => `   ↳ ${b}`).join("\n")}` : "") +
                    (r.failed.length ? `\n✖ فشل:\n\`${r.failed.join("\n")}\`` : "")
                );
            } catch (error) {
                lines.push(`✖ السيرفر: ${error.message}`);
            }
        }

        if (doStickers) {
            try {
                const r = await S.uploadStickers(message.guild);
                lines.push(
                    `✦ الستكرات ← جديد ${r.created.length} • موجود ${r.existed.length}` +
                    (r.skipped.length ? ` • ما اتسع ${r.skipped.length} (حد السيرفر ${r.limit})` : "") +
                    (r.failed.length ? `\n✖ \`${r.failed.join("\n")}\`` : "")
                );
            } catch (error) {
                lines.push(`✖ الستكرات: ${error.message}`);
            }
        }

        if (!lines.length) {
            lines.push("الاستخدام: `vanrsetup` أو `vanrsetup name|icon|emojis|server|stickers|full`");
        }

        return message.reply({
            embeds: [
                new MessageEmbed()
                    .setColor(V.COLOR)
                    .setTitle("Vanr • تجهيز السيرفر")
                    .setDescription(lines.join("\n"))
            ]
        });
    }
};
