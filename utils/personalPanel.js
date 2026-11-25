// Vanr • لوحة الرول الشخصي (Embed مخفي + أزرار)
const { MessageEmbed, MessageActionRow, MessageButton } = require("discord.js");
const PR = require("./personalRoles");

const btn = (id, label, style = "SECONDARY") => new MessageButton().setCustomId(id).setLabel(label).setStyle(style);

function main(guild, userId) {
    const roleId = PR.getRoleId(guild.id, userId);
    const role = roleId && guild.roles.cache.get(roleId);

    if (!role) {
        return { embeds: [new MessageEmbed().setColor("#2b2d31").setDescription("ما عندك رول شخصي. اطلب من الإدارة تسوي لك واحد بـ `r @أنت اسم`.")], components: [] };
    }

    const embed = new MessageEmbed()
        .setColor(role.color || "#2b2d31")
        .setTitle("لوحة رولك الشخصي")
        .setDescription(`${role}`)
        .addFields(
            { name: "الاسم", value: role.name, inline: true },
            { name: "اللون", value: role.hexColor, inline: true },
            { name: "الأعضاء", value: String(role.members.size), inline: true }
        );

    return {
        embeds: [embed],
        components: [
            new MessageActionRow().addComponents(btn("pr_color", "تغيير اللون", "PRIMARY"), btn("pr_name", "تغيير الاسم", "PRIMARY"), btn("pr_emoji", "إضافة إيموجي", "PRIMARY")),
            new MessageActionRow().addComponents(btn("pr_give", "إعطاء الرول", "SUCCESS"), btn("pr_take", "سحب الرول"), btn("pr_list", "قائمة الحاملين")),
            new MessageActionRow().addComponents(btn("pr_del", "حذف الرول", "DANGER"))
        ]
    };
}

module.exports = { main };
