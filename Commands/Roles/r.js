// r — (1) إنشاء رول شخصي:  -r @عضو اسم الرول
//     (2) إزالة رول من الكل: r all @رول  (الأصلي)
const { MessageEmbed } = require("discord.js");
const Pro = require(`pro.db`);
const PR = require("../../utils/personalRoles");

module.exports = {
  name: 'r',
  aliases: ['إزالةكل'],
  run: async (client, message, args) => {
    const Color = Pro.get(`Guild_Color = ${message.guild.id}`) || message.guild.me.displayHexColor || `#000000`;
    if (!message.member.permissions.has('MANAGE_ROLES')) return message.react('❌');

    const info = text => message.reply({ embeds: [new MessageEmbed().setColor(`${Color}`).setDescription(text)], allowedMentions: { repliedUser: false } });

    // ─── إزالة رول من الكل ───
    if (args[0] === 'all') {
      const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[1]?.replace('-', ''));
      if (!role) return info(`**❌ الاستخدام الصحيح:\nr all @رول**`);

      const msg = await message.reply({ embeds: [new MessageEmbed().setColor(`${Color}`).setDescription(`**⏳ جاري إزالة الرول من جميع الأعضاء...**`)] });

      await message.guild.members.fetch();
      const members = message.guild.members.cache.filter(m => !m.user.bot && m.roles.cache.has(role.id));

      let count = 0;
      for (const [, m] of members) { await m.roles.remove(role).catch(() => {}); count++; }

      return msg.edit({ embeds: [new MessageEmbed().setColor(`${Color}`).setDescription(`**✅ تم إزالة ${role} من \`${count}\` عضو**`)] });
    }

    // ─── إنشاء رول شخصي ───
    const target = message.mentions.members.first() || message.guild.members.cache.get(args.find(a => /^\d{15,}$/.test(a)));
    const name = args.filter(a => !/^<@!?\d+>$/.test(a) && !/^\d{15,}$/.test(a)).join(' ').trim();

    if (!target || !name) return info(`**❌ الاستخدام:\n\`r @العضو اسم الرول\`**`);
    if (name.length > 100) return info(`**❌ الاسم طويل (أقصى 100 حرف).**`);

    const existing = PR.getRoleId(message.guild.id, target.id);
    if (existing && message.guild.roles.cache.has(existing)) {
      return info(`**❌ ${target} عنده رول شخصي مسبقاً: <@&${existing}>**`);
    }

    const me = message.guild.me;
    if (!me.permissions.has('MANAGE_ROLES')) return info(`**❌ البوت ما عنده صلاحية Manage Roles.**`);

    try {
      const role = await message.guild.roles.create({ name, color: '#99aab5', reason: `Voki: رول شخصي لـ ${target.user.tag} بواسطة ${message.author.tag}` });

      // نخليه تحت أعلى رول للبوت قدر الإمكان
      await role.setPosition(Math.max(1, me.roles.highest.position - 1)).catch(() => {});
      await target.roles.add(role, 'Voki: رول شخصي');

      PR.setRole(message.guild.id, target.id, role.id);

      const room = PR.getRoom(message.guild.id);
      return info(`**✅ تم إنشاء ${role} وإعطاؤه لـ ${target}.**${room ? `\nيعدله من <#${room}> بكتابة \`رولي\`` : `\nيعدله بكتابة \`رولي\``}`);
    } catch (error) {
      console.error('[PROLE] create:', error.message);
      return info(`**❌ ما قدرت أنشئ الرول (تأكد أن رتبة البوت أعلى رتب الأعضاء).**`);
    }
  }
};
