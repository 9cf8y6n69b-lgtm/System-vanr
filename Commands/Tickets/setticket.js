// تم استبدال هذا الأمر بنظام التكت الجديد (أمر: تكت)
module.exports = {
    name: "setticket",
    aliases: [],
    run: async (client, message) => {
        return message.reply(
            "**نظام التكت القديم تم استبداله.**\nاستخدم الأمر `تكت` لإعداد اللوحة والريكوست، و`تحويلات` لإضافة جهات التحويل."
        ).catch(() => {});
    }
};
