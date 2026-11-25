const { MessageEmbed } = require("discord.js");
const Pro = require(`pro.db`);
const https = require("https");

let botinfo;
try { botinfo = require(`${process.cwd()}/botinfo.json`); } catch { botinfo = {}; }

module.exports = {
  name: 'ai',
  aliases: ['ذكاء', 'سؤال', 'كلم'],
  run: async (client, message, args) => {
    const Color = Pro.get(`Guild_Color = ${message.guild.id}`) || message.guild.me.displayHexColor || `#000000`;

    const ai = botinfo.ai || {};

    if (!ai.apiKey || ai.apiKey.includes("ضع_مفتاح")) {
      const embed = new MessageEmbed()
        .setColor(`${Color}`)
        .setTitle("⚙️ الذكاء الاصطناعي غير مفعّل")
        .setDescription("**افتح ملف `botinfo.json` وأضف مفتاح API في خانة:**\n```\n\"apiKey\": \"sk-ant-...\"\n```\n[احصل على المفتاح من هنا](https://console.anthropic.com/)")
        .setFooter(client.user.username, client.user.displayAvatarURL());
      return message.reply({ embeds: [embed] });
    }

    const question = args.join(' ');
    if (!question) {
      const embed = new MessageEmbed()
        .setColor(`${Color}`)
        .setDescription(`**❌ اكتب سؤالك بعد الأمر**\n\`=ai كيف أفتح تذكرة؟\``);
      return message.reply({ embeds: [embed] });
    }

    message.channel.sendTyping().catch(() => {});

    const loadEmbed = new MessageEmbed().setColor(`${Color}`).setDescription(`**⏳ جاري التفكير...**`);
    const loadMsg = await message.reply({ embeds: [loadEmbed] });

    try {
      const answer = await askClaude(question, ai.systemPrompt, ai.apiKey, ai.model, ai.maxTokens);

      const embed = new MessageEmbed()
        .setColor(`${Color}`)
        .setAuthor(`🙋 ${message.author.username}`, message.author.displayAvatarURL({ dynamic: true }))
        .addField('السؤال', question, false)
        .addField(`🤖 ${botinfo.botName || 'Voki'}`, answer, false)
        .setFooter(`${botinfo.embedFooter || 'Voki'}`, client.user.displayAvatarURL())
        .setTimestamp();

      loadMsg.edit({ embeds: [embed] });
    } catch (e) {
      loadMsg.edit({ embeds: [new MessageEmbed().setColor(`${Color}`).setDescription(`**❌ خطأ: ${e.message}**`)] });
    }
  }
};

function askClaude(question, systemPrompt, apiKey, model, maxTokens) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: model || "claude-haiku-4-5-20251001",
      max_tokens: maxTokens || 400,
      system: systemPrompt || "أنت مساعد ذكي باللغة العربية.",
      messages: [{ role: "user", content: question }],
    });
    const req = https.request({
      hostname: "api.anthropic.com", path: "/v1/messages", method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01", "Content-Length": Buffer.byteLength(body) }
    }, (res) => {
      let data = "";
      res.on("data", c => data += c);
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          if (json.error) return reject(new Error(json.error.message));
          if (json.content?.[0]?.text) return resolve(json.content[0].text);
          reject(new Error("لا يوجد رد"));
        } catch { reject(new Error("خطأ في قراءة الرد")); }
      });
    });
    req.setTimeout(15000, () => { req.destroy(); reject(new Error("انتهى وقت الاتصال")); });
    req.on("error", reject);
    req.write(body); req.end();
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌙 تم البرمجة بواسطة : TRY
// 🏪 المتجر : NOVANIGHT SYSTEM BOT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
