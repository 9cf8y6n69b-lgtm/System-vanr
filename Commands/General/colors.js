const Discord = require("discord.js");
const db = require("pro.db");
const { createCanvas, loadImage } = require("canvas");

module.exports = {
  name: "colors",
  aliases: ["الوان"],
  description: "Shows server colors",
  run: async (client, message) => {
    try {
    const colorRoles = message.guild.roles.cache.filter(
      (role) => /^\d+$/.test(role.name)
    );

    if (colorRoles.size === 0) {
      return message.reply("**لا يوجد اللوان فالسيرفر .**");
    }

    const sortedRoles = colorRoles.sort(
      (roleA, roleB) => roleB.position - roleA.position
    );

    let canvasHeight = 330;
    if (sortedRoles.size > 11) canvasHeight = 400;
    if (sortedRoles.size > 22) canvasHeight = 500;
    if (sortedRoles.size > 34) canvasHeight = 600;

    const colrsList = createCanvas(1200, canvasHeight);

    const Url = db.get("Url = [ Colors ]");

    let backgroundImage;
    try {
      backgroundImage = await loadImage(Url || require("path").join(process.cwd(), "assets", "voki-banner.jpg"));
    } catch (error) {
      console.error("Error loading background image:", error);
    }

    const ctx = colrsList.getContext("2d");
    if (backgroundImage) {
      ctx.drawImage(backgroundImage, 0, 0, 1200, canvasHeight);
    }

    let x = 20;
    let y = 145;

    sortedRoles.forEach((colorRole) => {
      x += 90;
      if (x > 1080) {
        x = 110;
        y += 90;
      }

      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
      ctx.fillStyle = colorRole.hexColor;

      const borderRadius = 15;
      ctx.beginPath();
      ctx.moveTo(x + borderRadius, y);
      ctx.lineTo(x + 70 - borderRadius, y);
      ctx.quadraticCurveTo(x + 70, y, x + 70, y + borderRadius);
      ctx.lineTo(x + 70, y + 70 - borderRadius);
      ctx.quadraticCurveTo(x + 70, y + 70, x + 70 - borderRadius, y + 70);
      ctx.lineTo(x + borderRadius, y + 70);
      ctx.quadraticCurveTo(x, y + 70, x, y + 70 - borderRadius);
      ctx.lineTo(x, y + borderRadius);
      ctx.quadraticCurveTo(x, y, x + borderRadius, y);
      ctx.closePath();
      ctx.fill();

      ctx.shadowColor = "black";
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      ctx.shadowBlur = 2;

      const colorNumber = colorRole.name;
      const cellWidth = 70;
      const cellHeight = 70;

      ctx.font = "32px Arial";
      ctx.lineWidth = 3;
      ctx.strokeStyle = "white";
      ctx.strokeText(colorNumber.toString(), x + cellWidth / 2, y + cellHeight / 2);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(colorNumber.toString(), x + cellWidth / 2, y + cellHeight / 2);

      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    });

    const buffer = colrsList.toBuffer("image/png");
    const attachment = { attachment: buffer, name: "img.png" };

    // ===== قوائم دائمة (25 لون لكل قائمة، حد أقصى 5) — التفاعل في events/colorsMenu.js =====
    const roleList = [...sortedRoles.values()].slice(0, 125);
    const rows = [];

    for (let i = 0; i < roleList.length; i += 25) {
      const chunk = roleList.slice(i, i + 25);

      rows.push(
        new Discord.MessageActionRow().addComponents(
          new Discord.MessageSelectMenu()
            .setCustomId(`color_pick_${i / 25}`)
            .setPlaceholder(`اختر لونك (${chunk[0].name} - ${chunk[chunk.length - 1].name})`)
            .addOptions(
              chunk.map((r) => ({
                label: `لون ${r.name}`,
                description: r.hexColor,
                value: r.id,
              }))
            )
        )
      );
    }

    await message.channel.send({ files: [attachment], components: rows });
    } catch (err) {
      console.error(err);
      return message.channel.send(
        "```" + String(err.stack || err).slice(0, 1500) + "```"
      );
    }
  },
};
