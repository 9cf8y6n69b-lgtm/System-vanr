const { MessageEmbed } = require("discord.js");
const Pro = require(`pro.db`);
const fs = require("fs");
const path = require("path");

module.exports = {
  name: 'aiset',
  aliases: ['setai', 'ذكاءاعدادات'],
  run: async (client, message, args) => {
    const Color = Pro.get(`Guild_Color = ${message.guild.id}`) || message.guild.me.displayHexColor || `#000000`;
    const { owners } = require(`${process.cwd()}/config`);
    if (!owners.includes(message.author.id) && !message.member.permissions.has('ADMINISTRATOR')) return message.react('❌');

    const botinfoPath = path.join(process.cwd(), "botinfo.json");
    let botinfo;
    try { botinfo = JSON.parse(fs.readFileSync(botinfoPath, "utf8")); } catch { return message.react('❌'); }

    const sub = args[0]?.toLowerCase();

    // ─── بدون أمر: عرض الحالة ───────────────────────────────
    if (!sub) {
      const ai = botinfo.ai || {};
      const hasKey = ai.apiKey && !ai.apiKey.includes("ضع_مفتاح");

      const embed = new MessageEmbed()
        .setColor(`${Color}`)
        .setTitle("🤖 إعدادات الذكاء الاصطناعي")
        .addField("الحالة", ai.enabled ? "✅ مفعّل" : "❌ معطّل", true)
        .addField("المفتاح", hasKey ? "✅ محدد" : "❌ غير محدد", true)
        .addField("وضع الرد", ai.triggerMode || "mention", true)
        .addField("كوول داون", `${ai.cooldownSeconds || 10} ثانية`, true)
        .addField("الأوامر المتاحة",
          "`=aiset on` - تفعيل الذكاء\n" +
          "`=aiset off` - تعطيل الذكاء\n" +
          "`=aiset mode [mention/keywords/all]` - وضع الرد\n" +
          "`=aiset prompt [نص]` - تغيير شخصية الذكاء\n" +
          "`=aiset cooldown [ثواني]` - تغيير الكوول داون\n" +
          "`=aiset addchannel` - إضافة شات مسموح\n" +
          "`=aiset removechannel` - إزالة شات\n" +
          "`=aiset clearchannels` - السماح لكل الشاتات\n" +
          "`=aiset status` - عرض الإعدادات"
        )
        .setFooter(client.user.username, client.user.displayAvatarURL());
      return message.reply({ embeds: [embed] });
    }

    const save = () => fs.writeFileSync(botinfoPath, JSON.stringify(botinfo, null, 2), "utf8");

    // ─── on / off ────────────────────────────────────────────
    if (sub === "on") {
      botinfo.ai.enabled = true; save();
      return message.reply({ embeds: [new MessageEmbed().setColor(`${Color}`).setDescription("**✅ تم تفعيل الذكاء الاصطناعي**")] });
    }
    if (sub === "off") {
      botinfo.ai.enabled = false; save();
      return message.reply({ embeds: [new MessageEmbed().setColor(`${Color}`).setDescription("**✅ تم تعطيل الذكاء الاصطناعي**")] });
    }

    // ─── mode ─────────────────────────────────────────────────
    if (sub === "mode") {
      const mode = args[1]?.toLowerCase();
      if (!["mention", "keywords", "all"].includes(mode)) {
        return message.reply({ embeds: [new MessageEmbed().setColor(`${Color}`).setDescription(
          "**❌ الأوضاع المتاحة:**\n`mention` - يرد فقط لما تمنشنه\n`keywords` - يرد لما يجد كلمة من قائمة المحددة\n`all` - يرد على كل رسالة"
        )] });
      }
      botinfo.ai.triggerMode = mode; save();
      return message.reply({ embeds: [new MessageEmbed().setColor(`${Color}`).setDescription(`**✅ تم تغيير وضع الرد إلى: \`${mode}\`**`)] });
    }

    // ─── prompt ───────────────────────────────────────────────
    if (sub === "prompt") {
      const prompt = args.slice(1).join(" ");
      if (!prompt) return message.react('❌');
      botinfo.ai.systemPrompt = prompt; save();
      return message.reply({ embeds: [new MessageEmbed().setColor(`${Color}`).setDescription(`**✅ تم تغيير شخصية الذكاء الاصطناعي**\n\`\`\`${prompt.substring(0, 200)}\`\`\``)] });
    }

    // ─── cooldown ─────────────────────────────────────────────
    if (sub === "cooldown") {
      const secs = parseInt(args[1]);
      if (isNaN(secs) || secs < 1 || secs > 300) {
        return message.reply({ embeds: [new MessageEmbed().setColor(`${Color}`).setDescription("**❌ أدخل رقم بين 1 و 300 ثانية**")] });
      }
      botinfo.ai.cooldownSeconds = secs; save();
      return message.reply({ embeds: [new MessageEmbed().setColor(`${Color}`).setDescription(`**✅ تم تغيير الكوول داون إلى ${secs} ثانية**`)] });
    }

    // ─── addchannel ───────────────────────────────────────────
    if (sub === "addchannel") {
      const ch = message.mentions.channels.first() || message.channel;
      if (!botinfo.ai.allowedChannelIds) botinfo.ai.allowedChannelIds = [];
      if (botinfo.ai.allowedChannelIds.includes(ch.id)) {
        return message.reply({ embeds: [new MessageEmbed().setColor(`${Color}`).setDescription(`**⚠️ ${ch} موجود أصلاً**`)] });
      }
      botinfo.ai.allowedChannelIds.push(ch.id); save();
      return message.reply({ embeds: [new MessageEmbed().setColor(`${Color}`).setDescription(`**✅ تم إضافة ${ch} لقائمة شاتات الذكاء**`)] });
    }

    // ─── removechannel ────────────────────────────────────────
    if (sub === "removechannel") {
      const ch = message.mentions.channels.first() || message.channel;
      botinfo.ai.allowedChannelIds = (botinfo.ai.allowedChannelIds || []).filter(id => id !== ch.id); save();
      return message.reply({ embeds: [new MessageEmbed().setColor(`${Color}`).setDescription(`**✅ تم إزالة ${ch} من قائمة شاتات الذكاء**`)] });
    }

    // ─── clearchannels ────────────────────────────────────────
    if (sub === "clearchannels") {
      botinfo.ai.allowedChannelIds = []; save();
      return message.reply({ embeds: [new MessageEmbed().setColor(`${Color}`).setDescription(`**✅ تم السماح للذكاء بالرد في كل الشاتات**`)] });
    }

    // ─── status ───────────────────────────────────────────────
    if (sub === "status") {
      const ai = botinfo.ai || {};
      const channels = ai.allowedChannelIds?.length
        ? ai.allowedChannelIds.map(id => `<#${id}>`).join(" ")
        : "كل الشاتات";

      const embed = new MessageEmbed()
        .setColor(`${Color}`)
        .setTitle("📊 حالة الذكاء الاصطناعي التفصيلية")
        .addField("الحالة", ai.enabled ? "✅ مفعّل" : "❌ معطّل", true)
        .addField("الموديل", ai.model || "claude-haiku", true)
        .addField("وضع الرد", ai.triggerMode || "mention", true)
        .addField("كوول داون", `${ai.cooldownSeconds || 10} ث`, true)
        .addField("الحد الأقصى للرد", `${ai.maxTokens || 400} توكن`, true)
        .addField("الشاتات المسموحة", channels, false)
        .addField("الشخصية", `\`\`\`${(ai.systemPrompt || "").substring(0, 150)}...\`\`\``, false)
        .setFooter(client.user.username, client.user.displayAvatarURL());
      return message.reply({ embeds: [embed] });
    }

    message.reply({ embeds: [new MessageEmbed().setColor(`${Color}`).setDescription("**❌ أمر غير معروف - اكتب `=aiset` للمساعدة**")] });
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌙 تم البرمجة بواسطة : TRY
// 🏪 المتجر : NOVANIGHT SYSTEM BOT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
