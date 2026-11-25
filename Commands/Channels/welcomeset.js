// ═══════════════════════════════════════════════
//  Voki • الترحيب: أمر واحد (welcome / ترحيب / welcomeset)
//  1) شاشة البداية: اختر قسم  [صورة] أو [إيمبد]  (أو الإعدادات)
//  2) تسوي الإعداد خطوة خطوة بأزرار، وبعدها لوحة الإعدادات الكاملة
// ═══════════════════════════════════════════════
const { MessageEmbed, MessageActionRow, MessageButton, MessageSelectMenu } = require("discord.js");
const Pro = require("pro.db");
const WC = require("../../utils/welcomeCfg");
const { owners } = require(`${process.cwd()}/config`);

const MODE_LABEL = { embed: "إيمبد", image: "صورة فقط", both: "إيمبد + صورة", text: "نص فقط" };
const onOff = v => (v ? "✅" : "▫️");
const BASE = () => new MessageEmbed().setColor("#2b2d31");

const button = (id, label, style = "SECONDARY", disabled = false) =>
    new MessageButton().setCustomId(id).setLabel(label).setStyle(style).setDisabled(disabled);

// ───────────── لوحة الإعدادات الكاملة ─────────────
function panelEmbed(guild, c) {
    return BASE()
        .setAuthor({ name: `${guild.name} • لوحة الترحيب`, iconURL: guild.iconURL({ dynamic: true }) || undefined })
        .setDescription(
            `**الحالة:** ${c.enabled ? "✅ شغال" : "⛔ مطفي"}\n` +
            `**الروم:** ${c.channelId ? `<#${c.channelId}>` : "⚠️ غير محدد"}\n` +
            `**الشكل:** ${MODE_LABEL[c.mode]}${["image", "both"].includes(c.mode) && !WC.getTemplate(guild.id) ? "  ⚠️ ما فيه تصميم صورة" : ""}\n\n` +
            `${onOff(c.avatar)} صورة العضو • ${onOff(c.name)} اسمه • ${onOff(c.mention)} منشنه\n` +
            `${onOff(c.inviter)} منشن الداعي • ${onOff(c.count)} رقم العضو\n` +
            `${onOff(c.imgAvatar)} صورته على الصورة • ${onOff(c.imgName)} اسمه على الصورة\n\n` +
            `**العنوان:** ${c.title || "—"}\n` +
            `**اللون:** \`${c.color}\` • **الفوتر:** ${c.footer || "—"}\n` +
            `**حذف تلقائي:** ${c.deleteAfter ? `${c.deleteAfter}ث` : "لا"} • **رتبة تلقائية:** ${c.roleId ? `<@&${c.roleId}>` : "لا"}\n\n` +
            `**النص:**\n${c.text}`
        )
        .setFooter({ text: "المتغيرات: {user} {name} {tag} {id} {server} {count} {inviter} {inviter_name} {code}" });
}

function panelRows(c, disabled = false) {
    const b = (id, label, style) => button(`ws:${id}`, label, style, disabled);
    const t = (id, label, on) => b(id, label, on ? "SUCCESS" : "SECONDARY");

    return [
        new MessageActionRow().addComponents(
            new MessageSelectMenu()
                .setCustomId("ws:mode")
                .setPlaceholder("شكل الترحيب")
                .setDisabled(disabled)
                .addOptions(Object.entries(MODE_LABEL).map(([value, label]) => ({ label, value, default: c.mode === value })))
        ),
        new MessageActionRow().addComponents(
            t("avatar", "صورة العضو", c.avatar), t("name", "اسمه", c.name), t("mention", "منشنه", c.mention),
            t("inviter", "منشن الداعي", c.inviter), t("count", "رقم العضو", c.count)
        ),
        new MessageActionRow().addComponents(
            t("imgAvatar", "صورته على الصورة", c.imgAvatar), t("imgName", "اسم على الصورة", c.imgName),
            t("enabled", c.enabled ? "إيقاف الترحيب" : "تشغيل الترحيب", c.enabled),
            b("test", "تجربة", "PRIMARY"), b("reset", "إعادة ضبط", "DANGER")
        ),
        new MessageActionRow().addComponents(
            b("channel", "الروم"), b("text", "النص"), b("title", "العنوان"), b("color", "اللون"), b("footer", "الفوتر")
        ),
        new MessageActionRow().addComponents(
            b("delete", "حذف تلقائي"), b("role", "رتبة تلقائية"),
            b("wi", "إعداد صورة", "PRIMARY"), b("we", "إعداد إيمبد", "PRIMARY"), b("close", "إغلاق", "DANGER")
        )
    ];
}

// ───────────── أدوات الأسئلة ─────────────
const clear = v => ["off", "حذف", "لا", "مسح"].includes(String(v).trim().toLowerCase());
const tidy = (msg, ms = 4000) => setTimeout(() => msg.delete().catch(() => {}), ms);

async function ask(channel, userId, prompt) {
    const q = await channel.send(prompt).catch(() => null);
    if (!q) return null;

    const got = await channel.awaitMessages({ filter: m => m.author.id === userId, max: 1, time: 60000 }).then(c => c.first()).catch(() => null);

    q.delete().catch(() => {});
    if (got) got.delete().catch(() => {});
    if (!got) channel.send("⌛ انتهى الوقت.").then(m => tidy(m)).catch(() => {});

    return got || null;
}

// يعرض أزرار ويرجع اللي ضغطه (أو null)
async function choose(channel, userId, embed, buttons) {
    const rows = [];
    for (let i = 0; i < buttons.length; i += 5) rows.push(new MessageActionRow().addComponents(buttons.slice(i, i + 5)));

    const msg = await channel.send({ embeds: [embed], components: rows }).catch(() => null);
    if (!msg) return null;

    const click = await msg.awaitMessageComponent({ filter: i => i.user.id === userId, time: 60000 }).catch(() => null);
    if (click) await click.deferUpdate().catch(() => {});

    msg.delete().catch(() => {});
    return click ? click.customId : null;
}

// ───────────── معالج الإعداد (صورة / إيمبد) ─────────────
async function wizard(client, message, kind) {
    const g = message.guild.id;
    const ch = message.channel;
    const user = message.author.id;
    const helpers = (client.commands.get("welcome") || {}).helpers;

    if (!helpers) {
        ch.send("❌ ملف welcome.js ناقص (helpers).").then(m => tidy(m, 6000));
        return false;
    }

    const isEmbed = kind === "embed";

    // 1) استقبال الصورة
    const prompt = await ch.send({
        embeds: [BASE()
            .setTitle(isEmbed ? "📋 إعداد الإيمبد" : "🖼 إعداد الصورة")
            .setDescription(
                "أرسل **صورة التصميم** هنا في الشات (60 ثانية).\n" +
                (isEmbed ? "أو اضغط **تخطي** لإيمبد بدون صورة." : "مثال: بانر أو خلفية، ويفضل يكون فيها دائرة بيضاء مكان صورة العضو.")
            )],
        components: isEmbed ? [new MessageActionRow().addComponents(button("wz:skip", "تخطي (بدون صورة)", "SECONDARY"))] : []
    }).catch(() => null);

    if (!prompt) return false;

    const gotImage = ch.awaitMessages({ filter: m => m.author.id === user && m.attachments.size > 0, max: 1, time: 60000 })
        .then(c => c.first() || null).catch(() => null);

    const gotSkip = isEmbed
        ? prompt.awaitMessageComponent({ filter: i => i.user.id === user, time: 60000 })
            .then(async i => { await i.deferUpdate().catch(() => {}); return "skip"; }).catch(() => null)
        : new Promise(() => {});

    const first = await Promise.race([gotImage, gotSkip]);
    prompt.delete().catch(() => {});

    if (!first) { ch.send("⌛ انتهى الوقت.").then(m => tidy(m)); return false; }

    // تخطي الصورة (إيمبد فقط)
    if (first === "skip") {
        WC.set(g, { mode: "embed" });
        return true;
    }

    const imageMessage = first;
    const attachment = imageMessage.attachments.first();

    if (!attachment.contentType || !attachment.contentType.startsWith("image/")) {
        ch.send("❌ الملف مو صورة.").then(m => tidy(m));
        return false;
    }
    if (attachment.size > helpers.MAX_SIZE) {
        ch.send("❌ الصورة أكبر من 5 ميجابايت.").then(m => tidy(m));
        return false;
    }

    // 2) تجهيز الصورة + مكان صورة العضو
    let downloaded;
    try { downloaded = await helpers.downloadImage(attachment.url); }
    catch { ch.send("❌ ما قدرت أحمّل الصورة.").then(m => tidy(m)); return false; }

    let circle = null;
    try {
        circle = await helpers.detectWhiteCircle(downloaded.buffer);
    } catch (error) {
        if (!["WHITE_CIRCLE_NOT_FOUND", "MULTIPLE_WHITE_CIRCLES"].includes(error.message)) {
            console.error("[WELCOME] detect:", error);
            ch.send("❌ صار خطأ بقراءة الصورة.").then(m => tidy(m));
            return false;
        }

        const why = error.message === "MULTIPLE_WHITE_CIRCLES" ? "لقيت أكثر من دائرة بيضاء" : "ما لقيت دائرة بيضاء";

        const pick = await choose(ch, user,
            BASE().setTitle("📍 مكان صورة العضو").setDescription(`${why} في التصميم.\nاختر **تخطي** لاستخدام التصميم بدون صورة العضو، أو اختر مكانها:`),
            [
                button("pos:skip", "تخطي (بدون صورة العضو)", "DANGER"),
                button("pos:center", "وسط", "PRIMARY"), button("pos:right", "يمين", "PRIMARY"),
                button("pos:left", "يسار", "PRIMARY"), button("pos:top", "فوق", "PRIMARY"), button("pos:bottom", "تحت", "PRIMARY")
            ]);

        if (!pick) { ch.send("⌛ انتهى الوقت.").then(m => tidy(m)); return false; }

        if (pick === "pos:skip") {
            circle = { x: 0, y: 0, radius: 0, none: true };
        } else {
            const spots = { center: [0.5, 0.5], right: [0.82, 0.5], left: [0.18, 0.5], top: [0.5, 0.24], bottom: [0.5, 0.76] };
            const spot = spots[pick.replace("pos:", "")];
            const { loadImage } = require("canvas");
            const img = await loadImage(downloaded.buffer);

            circle = {
                x: Math.round(img.width * spot[0]),
                y: Math.round(img.height * spot[1]),
                radius: Math.round(Math.min(img.width, img.height) * 0.16)
            };
        }
    }

    // 3) داخل الإيمبد أو صورة لحالها؟
    let mode = "both";

    if (!isEmbed) {
        const inside = await choose(ch, user,
            BASE().setTitle("🖼 كيف تبي الصورة؟").setDescription("**داخل الإيمبد** أو **صورة لحالها** بدون إيمبد؟"),
            [button("in:embed", "داخل الإيمبد", "PRIMARY"), button("in:plain", "صورة لحالها", "SECONDARY")]);

        if (!inside) { ch.send("⌛ انتهى الوقت.").then(m => tidy(m)); return false; }
        mode = inside === "in:embed" ? "both" : "image";
    }

    // 4) حفظ
    const old = Pro.get(`welcome_system_${g}`) || {};
    const cfg = WC.get(g);

    Pro.set(`welcome_system_${g}`, {
        enabled: true,
        template: downloaded.buffer.toString("base64"),
        fileName: attachment.name || "welcome-template.png",
        circle,
        extraText: old.extraText || "",
        channelId: cfg.channelId || old.channelId || null
    });

    WC.set(g, { mode, imgAvatar: !circle.none, enabled: true });

    // 5) الروم إذا ما كان محدد
    if (!WC.get(g).channelId) {
        const got = await ask(ch, user, "📢 منشن روم الترحيب:");
        const target = got && got.mentions.channels.first();
        if (target && target.isText()) WC.set(g, { channelId: target.id });
    }

    return true;
}

module.exports = {
    name: "welcomeset",
    aliases: ["ترحيب-خيارات", "welcomeopt", "خيارات-الترحيب", "لوحة-الترحيب"],

    run: async (client, message) => {
        if (!message.guild) return;
        if (!message.member.permissions.has("MANAGE_GUILD") && !owners.includes(message.author.id)) return message.react("❌").catch(() => {});

        const g = message.guild.id;
        const guild = message.guild;

        // ───── شاشة البداية ─────
        const startEmbed = BASE()
            .setAuthor({ name: `${guild.name} • الترحيب`, iconURL: guild.iconURL({ dynamic: true }) || undefined })
            .setDescription("اختر القسم اللي تبي تسوي له ترحيب:\n\n🖼 **صورة** — ترسل التصميم، وتختار تطلع داخل إيمبد أو لحالها.\n📋 **إيمبد** — نفس الخطوات، لكن الترحيب يطلع إيمبد.\n⚙️ **الإعدادات** — تعدّل كل شي (نص، ألوان، روم، رتبة...).");

        const startRow = (disabled = false) => [new MessageActionRow().addComponents(
            button("ws:wi", "صورة", "PRIMARY", disabled), button("ws:we", "إيمبد", "PRIMARY", disabled),
            button("ws:settings", "الإعدادات", "SECONDARY", disabled), button("ws:close", "إغلاق", "DANGER", disabled)
        )];

        const panel = await message.channel.send({ embeds: [startEmbed], components: startRow() });

        let screen = "start";
        let busy = false;

        const showSettings = () => { screen = "settings"; return panel.edit({ embeds: [panelEmbed(guild, WC.get(g))], components: panelRows(WC.get(g)) }).catch(() => {}); };
        const refresh = () => panel.edit({ embeds: [panelEmbed(guild, WC.get(g))], components: panelRows(WC.get(g)) }).catch(() => {});

        const collector = panel.createMessageComponentCollector({ time: 20 * 60 * 1000 });

        collector.on("collect", async interaction => {
            if (interaction.user.id !== message.author.id) {
                return interaction.reply({ content: "هذي اللوحة مو لك.", ephemeral: true }).catch(() => {});
            }

            const action = interaction.customId.replace("ws:", "");
            const c = WC.get(g);

            try {
                if (busy) return interaction.reply({ content: "كمّل الخطوة الحالية أول.", ephemeral: true }).catch(() => {});

                if (action === "close") {
                    collector.stop("closed");
                    return interaction.update({ components: screen === "start" ? startRow(true) : panelRows(c, true) });
                }

                if (action === "settings") {
                    screen = "settings";
                    return interaction.update({ embeds: [panelEmbed(guild, c)], components: panelRows(c) });
                }

                if (action === "mode") {
                    WC.set(g, { mode: interaction.values[0] });
                    return interaction.update({ embeds: [panelEmbed(guild, WC.get(g))], components: panelRows(WC.get(g)) });
                }

                if (["avatar", "name", "mention", "inviter", "count", "imgAvatar", "imgName", "enabled"].includes(action)) {
                    WC.set(g, { [action]: !c[action] });
                    return interaction.update({ embeds: [panelEmbed(guild, WC.get(g))], components: panelRows(WC.get(g)) });
                }

                if (action === "reset") {
                    WC.reset(g);
                    return interaction.update({ embeds: [panelEmbed(guild, WC.get(g))], components: panelRows(WC.get(g)) });
                }

                if (action === "test") {
                    await interaction.deferUpdate();
                    const target = guild.channels.cache.get(c.channelId) || message.channel;
                    const payload = await WC.build(message.member, { user: message.author, code: "TEST" }, c);
                    return target.send(payload).catch(error => message.channel.send(`❌ ${error.message}`));
                }

                await interaction.deferUpdate();
                const user = message.author.id;
                const ch = message.channel;

                if (action === "wi" || action === "we") {
                    busy = true;
                    const ok = await wizard(client, message, action === "wi" ? "image" : "embed");
                    busy = false;

                    if (ok) {
                        // معاينة سريعة ثم لوحة الإعدادات
                        const now = WC.get(g);
                        if (now.channelId) {
                            const target = guild.channels.cache.get(now.channelId);
                            if (target) target.send(await WC.build(message.member, { user: message.author, code: "TEST" }, now)).catch(() => {});
                        }
                    }

                    return showSettings();
                }

                busy = true;

                if (action === "channel") {
                    const got = await ask(ch, user, "📢 منشن روم الترحيب:");
                    const target = got && got.mentions.channels.first();
                    if (target && target.isText()) WC.set(g, { channelId: target.id });
                } else if (action === "text") {
                    const got = await ask(ch, user, "✏️ اكتب نص الترحيب (للسطر الجديد اكتب `\\n`):\nالمتغيرات: `{user}` `{name}` `{server}` `{count}` `{inviter}` `{inviter_name}` `{code}`");
                    if (got && got.content) WC.set(g, { text: got.content.slice(0, 1500) });
                } else if (action === "title") {
                    const got = await ask(ch, user, "✏️ اكتب عنوان الإيمبد (أو `حذف`):");
                    if (got) WC.set(g, { title: clear(got.content) ? "" : got.content.slice(0, 200) });
                } else if (action === "footer") {
                    const got = await ask(ch, user, "✏️ اكتب الفوتر (أو `حذف`):");
                    if (got) WC.set(g, { footer: clear(got.content) ? "" : got.content.slice(0, 200) });
                } else if (action === "color") {
                    const got = await ask(ch, user, "🎨 اكتب لون هيكس مثل `#ffffff`:");
                    if (got && /^#?[0-9a-f]{6}$/i.test(got.content.trim())) {
                        const v = got.content.trim();
                        WC.set(g, { color: v.startsWith("#") ? v : `#${v}` });
                    }
                } else if (action === "delete") {
                    const got = await ask(ch, user, "⏱ اكتب عدد الثواني لحذف الرسالة (0 = ما تتحذف):");
                    const sec = got ? parseInt(got.content) : NaN;
                    if (!isNaN(sec) && sec >= 0 && sec <= 3600) WC.set(g, { deleteAfter: sec });
                } else if (action === "role") {
                    const got = await ask(ch, user, "🎭 منشن الرتبة التلقائية (أو `حذف`):");
                    if (got && clear(got.content)) WC.set(g, { roleId: null });
                    else if (got && got.mentions.roles.first() && got.mentions.roles.first().editable) WC.set(g, { roleId: got.mentions.roles.first().id });
                    else if (got) ch.send("❌ رتبة غير صالحة، أو رتبة البوت أقل منها.").then(m => tidy(m, 5000));
                }

                busy = false;
                return refresh();
            } catch (error) {
                busy = false;
                console.error("[WELCOMESET] error:", error);
            }
        });

        collector.on("end", (_, reason) => {
            if (reason !== "closed") panel.edit({ components: screen === "start" ? startRow(true) : panelRows(WC.get(g), true) }).catch(() => {});
        });
    }
};
