// mcolors = نفس أمر colors
// (النسخة القديمة كانت تسجّل مستمع interactionCreate جديد مع كل استخدام، وهذا يكرر الردود ويسبب أخطاء)
const colors = require("./colors");

module.exports = {
  name: "mcolors",
  description: "Shows server colors",
  run: (client, message, args) => colors.run(client, message, args),
};
