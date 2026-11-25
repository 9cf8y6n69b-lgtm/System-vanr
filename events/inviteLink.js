// يطبع رابط إضافة البوت للسيرفر في الكونسول عند التشغيل
const client = require("../index");

client.once("ready", () => {
    const url = `https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`;
    console.log(`\n✦ Vanr جاهز: ${client.user.tag}\n✦ رابط إضافة البوت للسيرفر:\n${url}\n`);
});
