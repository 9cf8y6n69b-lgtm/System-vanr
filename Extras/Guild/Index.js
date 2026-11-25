let client = require('../..')
const { Modal } = require("discord.js")
const   { MessageActionRow , MessageButton , MessageEmbed  } = require(`discord.js`)
const Data = require(`pro.db`)
const { prefix, owners } = require(`${process.cwd()}/config`);
client.config = require(`${process.cwd()}/config`);
const config = require(`${process.cwd()}/config`);
const { MessageAttachment } = require("discord.js");
const Discord = require(`discord.js`)
const db = require(`pro.db`)
const fs = require(`fs`)

// https://discord.gg
// ----------------------------------------------------------------------
// https://discord.gg

const B = new MessageActionRow().addComponents(
  new MessageButton()
    .setCustomId(`DD`)
    .setStyle(`DANGER`)
    .setEmoji(`🗑`),
  new MessageButton()
    .setCustomId(`D`)
    .setStyle(`SECONDARY`)
  //  .setLabel(`اضافه شخص`)
    .setEmoji(`➕`),
)
client.on(`interactionCreate`, async function (Message) {
  if (Message.isSelectMenu()) {
    if (Message.customId === `M0`) {

      const Channel = db.get(`Channel = [${Message.guild.id}]`)
      const Role    = db.get(`Role = [${Message.guild.id}]`)
      const Cat     = db.get(`Cat = [${Message.guild.id}]`)
      const Parent  = Message.guild.channels.cache.find(C => C.id === Cat)

      if (db.get(`member${Message.user.id}`) === true)
        return Message.reply({ content: `**عذرًا لا يمكنك فتح تذكرة لوجود تذكرة خاصة بك .**`, ephemeral: true })

      if (!Parent)
        return Message.reply({ content: `**❌ لم يتم تعيين الكاتيقوري - استخدم =setcategory**`, ephemeral: true })

      if (!Role)
        return Message.reply({ content: `**❌ لم يتم تعيين رول الدعم - استخدم =settrole**`, ephemeral: true })

      const selectedValue = Message.values[0]
      const ticketOptions = db.get(`TicketOptions = [${Message.guild.id}]`) || []
      const selectedOption = ticketOptions.find(o => o.value === selectedValue)

      let channelName = `ticket-${Message.user.username}`
      if (selectedOption && selectedOption.label) {
        const cleanLabel = selectedOption.label.replace(/[^\w\s\u0600-\u06FF]/g, '').trim().replace(/\s+/g, '-')
        channelName = `ticket-${cleanLabel || Message.user.username}`
      } else if (selectedValue === 'M1') {
        channelName = `تذكرة-${Message.user.username}`
      } else if (selectedValue === 'M2') {
        channelName = `استفسار-${Message.user.username}`
      } else if (selectedValue === 'M3') {
        channelName = `شكوى-${Message.user.username}`
      }

      try {
        const Cahnnels = await Message.guild.channels.create(channelName, {
          type: 'text',
          parent: Parent.id,
          permissionOverwrites: [
            { id: Message.user.id,              allow: ['VIEW_CHANNEL', 'SEND_MESSAGES'] },
            { id: `${Role}`,                    allow: ['VIEW_CHANNEL', 'SEND_MESSAGES'] },
            { id: Message.guild.roles.everyone, deny:  ['VIEW_CHANNEL'] },
          ],
        })

        db.set(`channel${Cahnnels.id}`, Message.user.id)
        db.set(`member${Message.user.id}`, true)

        await Message.reply({ content: `**✅ تم إنشاء تذكرتك ${Cahnnels}**`, ephemeral: true })

        const Image = db.get(`TicketImage = [${Message.guild.id}]`) || db.get(`Image = [${Message.guild.id}]`)
        const Color = db.get(`Guild_Color = ${Message.guild.id}`) || `#000000`

        const welcomeEmbed = new MessageEmbed()
          .setColor(Color)
          .setDescription(`**مرحباً ${Message.user} 🌙**\n${selectedOption ? `**نوع التذكرة:** ${selectedOption.label}` : ''}\n\nيرجى شرح مشكلتك وسيتم الرد عليك قريباً`)
          .setFooter(`Vanr`, Message.guild.iconURL())
          .setTimestamp()

        if (Image) welcomeEmbed.setThumbnail(Image)

        await Cahnnels.send({
          content: `${Message.user} | <@&${Role}>`,
          embeds: [welcomeEmbed],
          components: [B]
        })

      } catch (e) {
        console.error('[Ticket Error]:', e.message)
        Message.reply({ content: `**❌ خطأ: ${e.message}**`, ephemeral: true }).catch(() => {})
      }
    }
  }
})
const { createTranscript } = require("discord-html-transcripts");

client.on('interactionCreate', async interaction => {
  if (interaction.isButton()) {
    if (interaction.customId === "DD") {
      const Role = db.get(`Role = [${interaction.guild.id}]`);
      if (!interaction.member.roles.cache.has(`${Role}`)) {
        return await interaction.reply({ content: `** لا تستطيع تنفيذ هذا الإجراء  ..** 🚫`, ephemeral: true });
      }
      
      const Channel = client.channels.cache.find(C => C.id == `${db.get(`Channel = [${interaction.guild.id}]`)}`);
      if (!Channel) return;
      
      const transcript = await createTranscript(interaction.channel, {
        returnType: 'buffer',
        returnType: false,
        minify: true,
        saveImages: true,
        useCDN: true,
        poweredBy: false,
        fileName: `${interaction.channel.name}.html`,
      });
      
      const Color = db.get(`Guild_Color = ${interaction.guild.id}`) || interaction.guild.me.displayHexColor || `#000000`;
      if (!Color) return;
      
      const embed = new MessageEmbed()
        .setColor(`${Color || interaction.guild.me.displayHexColor || `#000000`}`)
        .setAuthor(`${interaction.user.tag}`, interaction.user.avatarURL({ dynamic: true, size: 1024, format: 'png' }))
        .setDescription(`**إغلاق تذكرة**\n**
        تذكرة : <@${db.get(`channel${interaction.channel.id}`)}>
        بواسطة : ${interaction.user}
        اسم التذكرة : ${interaction.channel.name}
        id : ${db.get(`channel${interaction.channel.id}`)}**`)
        .setFooter({ text: `${interaction.guild.name}`, iconURL: interaction.guild.iconURL() })
        .setTimestamp();
      
      await interaction.reply({ content: `**${interaction.channel} : سيتم حذف التذكرة خلال ثواني**` });
      await Channel.send({ embeds: [embed] });
      await Channel.send({ files: [transcript] });


      if (db.get(`channel${interaction.channel.id}`)) {
        let Member = client.users.cache.find((x) => x.id == db.get(`channel${interaction.channel.id}`))
        db.delete(`member${Member.id}`)
        db.delete(`channel${interaction.channel.id}`)
      }
      
      await interaction.channel.delete()
    } else if (interaction.customId === "D") {
      const { Client, Collection, MessageAttachment, WebhookClient, Intents, MessageButton, MessageEmbed, MessageSelectMenu, MessageActionRow, MessageModal, Role, Modal, TextInputComponent } = require("discord.js");
      const Services = new Modal().setCustomId(`add`).setTitle(`اضافه شخص`);
      const Service_1 = new TextInputComponent().setCustomId('Ad').setLabel(`ايدي`).setStyle(`SHORT`).setPlaceholder(' ').setRequired(true)
      const Service1 = new MessageActionRow().addComponents(Service_1);
      Services.addComponents(Service1);
      interaction.showModal(Services);
    }
  } else if (interaction.isModalSubmit()) {
    if (interaction.customId === "add") {
      const Service1 = interaction.fields.getTextInputValue('Ad');
      const Member = await interaction.guild.members.cache.get(Service1)
      const channel = interaction.channel
   
        await channel.permissionOverwrites.edit(Member, { VIEW_CHANNEL: true, SEND_MESSAGES: true });
        await interaction.reply({ content: `**تم إضافة الشخص لتذكرة : ${Member}**`, ephemeral: true }).catch(() => { })
      
    }
  }
})

// https://discord.gg/7lm
// ----------------------------------------------------------------------
// https://discord.gg/7lm

client.on("messageDelete", async (message) => {
  let channe4l = "log-messages";
  // if (message.author.bot) return;
  if (message.channel.type === "DM") return;
  if (!message.guild.me.permissions.has("EMBED_LINKS")) return;
  if (!message.guild.me.permissions.has("MANAGE_MESSAGES")) return;
  var logChannel = message.guild.channels.cache.find((c) => c.name === channe4l);
  if (!logChannel) return;
  let messageDelete = new Discord.MessageEmbed()
    .setColor("#0e4a48")
    .setAuthor(message.author.username, message.author.avatarURL({ dynamic: true }))
    .setDescription(`**Messag Delete**\n\n**By : <@${message.author.id}>**\n**In : ${message.channel}**\n\`\`\`Message : ${message.content || ": No Message"}\`\`\`\ `)
    .setThumbnail(
      "https://cdn.discordapp.com/attachments/1093303174774927511/1138876390612144148/D301A2E9-13FD-48E5-93B9-CF7A2FAE42B8.png"
    )
    .setFooter(client.user.username, client.user.displayAvatarURL())

  // Check if there are any attachments
  if (message.attachments.size > 0) {

  }

  logChannel.send({ embeds: [messageDelete] });
});


client.on("messageDelete", async (message) => {
  let channelName = "log-pic";
  if (message.author.bot) return;
  if (message.channel.type === "DM") return;
  if (!message.guild.me.permissions.has("EMBED_LINKS")) return;
  if (!message.guild.me.permissions.has("MANAGE_MESSAGES")) return;
  var logChannel = message.guild.channels.cache.find((c) => c.name === channelName);
  if (!logChannel) return;
  if (message.attachments.size > 0) {
    for (const attachment of message.attachments.values()) {
      if (attachment.contentType.startsWith("image/") || attachment.contentType.startsWith("video/")) {
        logChannel.send({ files: [attachment.url] });

        setTimeout(() => {
          let messageDelete = new Discord.MessageEmbed()
            .setColor("#0e4a48")
            .setAuthor(message.author.username, message.author.avatarURL({ dynamic: true }))
            .setDescription(`**Delete image**\n\n**Sent By:** <@${message.author.id}>\n**Pic In **${message.channel}\n\`\`\`Message : No Message\`\`\` `)
            .setThumbnail("https://cdn.discordapp.com/attachments/1093303174774927511/1138876390612144148/D301A2E9-13FD-48E5-93B9-CF7A2FAE42B8.png")
            .setFooter(client.user.username, client.user.displayAvatarURL())

          logChannel.send({ embeds: [messageDelete] });
        }, 4000); // 4 seconds delay
      }
    }
  }
});

client.on("messageUpdate", async (oldMessage, newMessage) => {
  let channel = "log-messages";
  if (oldMessage.author.bot) return;
  if (oldMessage.channel.type === "DM") return;
  if (!oldMessage.guild.me.permissions.has("EMBED_LINKS")) return;
  if (!oldMessage.guild.me.permissions.has("MANAGE_MESSAGES")) return;

  var logChannel = oldMessage.guild.channels.cache.find(
    (c) => c.name === channel
  );
  if (!logChannel) return;

  if (oldMessage.content.startsWith("https://")) {
    for (const attachment of oldMessage.attachments.values()) {
      logChannel.send({ files: [attachment.url] });
    }
    return;
  }

  let messageUpdate = new Discord.MessageEmbed()
    .setAuthor(oldMessage.author.username, oldMessage.author.avatarURL({ dynamic: true }))
    .setThumbnail(
      "https://cdn.discordapp.com/attachments/1093303174774927511/1138875547066314772/0DB13224-1283-4BF9-B8F5-93975DE3F7C2.png"
    )
    .setColor("#0e4a48")
    .setDescription(`**Edit Message**\n\n**By : ** <@${oldMessage.author.id}>\n**In ${oldMessage.channel}**\n**Message : [Click Here](${oldMessage.url})**\n**Old Message :**\n\`\`\`${oldMessage.content}\`\`\`\n**New Message:**\`\`\`${newMessage.content}\`\`\` `)
    .setFooter(client.user.username, client.user.displayAvatarURL())
  logChannel.send({ embeds: [messageUpdate] });
});

// https://discord.gg/7lm
// ----------------------------------------------------------------------
// https://discord.gg/7lm

client.on('channelCreate', async (channel) => {
  if (!channel.guild) return;
  if (!channel.guild.me.permissions.has('EMBED_LINKS')) return;
  if (!channel.guild.me.permissions.has('VIEW_AUDIT_LOG')) return;
  let channelName = "log-channels";
  var logChannel = channel.guild.channels.cache.find(c => c.name === channelName);
  if (!logChannel) return;

  if (channel.type === 'GUILD_TEXT') {
    var roomType = 'Text';
  } else if (channel.type === 'GUILD_VOICE') {
    var roomType = 'Voice';
  } else if (channel.type === 'GUILD_CATEGORY') {
    var roomType = 'Category';
  }

  channel.guild.fetchAuditLogs().then(logs => {
    var userID = logs.entries.first().executor.id;
    client.users.fetch(userID).then(user => {
      let channelCreate = new Discord.MessageEmbed()
        .setAuthor(user.username, user.avatarURL({ dynamic: true }))
        .setThumbnail('https://cdn.discordapp.com/attachments/1093303174774927511/1138891156818772018/8C926555-671C-4F9C-9136-DAD2229375B4.png')
        .setDescription(`**Channel Create**\n\n**By : <@${userID}>**\n**Channel : <#${channel.id}>**\n**Create : ${roomType}**\n\`\`\`✅ - ${channel.id}\`\`\``)
        .setColor(`#6d5873`)
        .setFooter(client.user.username, client.user.displayAvatarURL())
      logChannel.send({ embeds: [channelCreate] });
    });
  });
});


client.on('channelDelete',  async channel => { 
  if(!channel.guild) return;
  if(!channel.guild.me.permissions.has('EMBED_LINKS')) return;
  if(!channel.guild.me.permissions.has('VIEW_AUDIT_LOG')) return;
  let channe3l = "log-channels";
  var logChannel = channel.guild.channels.cache.find(c => c.name === channe3l);
  if(!logChannel) return; 

  if(channel.type === 'GUILD_TEXT') { 
      var roomType = 'Text';
  }else
  if(channel.type === 'GUILD_VOICE') { 
      var roomType = 'Voice';
  }else
  if(channel.type === 'GUILD_CATEGORY') { 
      var roomType = 'Category';
  }

  channel.guild.fetchAuditLogs().then(logs => {
      var userID = logs.entries.first().executor.id;
      client.users.fetch(userID).then(user => {

      let channelDelete = new Discord.MessageEmbed()
      .setAuthor(user.username, user.avatarURL({ dynamic: true }))
      .setDescription(`**Channel Delete**\n\n**By : <@${userID}>**\n**Channel :${channel.name}**\n**Create : ${roomType}**\n\`\`\`❌ - ${channel.id}\`\`\``)
      .setColor(`#6d5873`)
      .setTimestamp()
      .setThumbnail(`https://cdn.discordapp.com/attachments/1093303174774927511/1138891157523402772/40A15AD6-0C21-43A5-A70A-6ED69615C182.png`)
      .setFooter(client.user.username, client.user.displayAvatarURL())
      logChannel.send({ embeds: [channelDelete] }); 
    });
  })
});

client.on('channelUpdate', async (oldChannel, newChannel) => {
  let channe3l = "log-channels";
  if(!oldChannel.guild) return;

  var logChannel = oldChannel.guild.channels.cache.find(c => c.name === channe3l);
  if(!logChannel) return;

  if(oldChannel.type === 'GUILD_TEXT') {
      var channelType = 'Text';
  }else
  if(oldChannel.type === 'GUILD_VOICE') {
      var channelType = 'Voice';
  }else
  if(oldChannel.type === 'GUILD_CATEGORY') {
      var channelType = 'Category';
  }
 
  oldChannel.guild.fetchAuditLogs().then(logs => { 
      var userID = logs.entries.first().executor.id;
      client.users.fetch(userID).then(user => {

      if(oldChannel.name !== newChannel.name) {
          let newName = new Discord.MessageEmbed()
          .setAuthor(user.username, user.avatarURL({ dynamic: true }))
          .setThumbnail('https://cdn.discordapp.com/attachments/1093303174774927511/1138891156818772018/8C926555-671C-4F9C-9136-DAD2229375B4.png')
          .setColor(`#6d5873`)
          .setDescription(`**CHANNEL EDIT**\n\n**By : <@${userID}>**\n**Id : ${userID}**\n**Channel : <#${oldChannel.id}>**\n\`\`\`✅ - ${oldChannel.name} => ${newChannel.name}\`\`\``)
          .setFooter(client.user.username, client.user.displayAvatarURL())
          logChannel.send({ embeds: [newName] }); 
      }

  })
})
});

// https://discord.gg/7lm
// ----------------------------------------------------------------------
// https://discord.gg/7lm

client.on('guildMemberUpdate', async (oldMember, newMember) => {
  let channel = "log-nickname";
  var logChannel = oldMember.guild.channels.cache.find(c => c.name === channel);
  if (!logChannel) return;

  oldMember.guild.fetchAuditLogs({ limit: 1, type: 'MEMBER_UPDATE' }).then(logs => {
    var userID = logs.entries.first().executor.id;

    if (oldMember.nickname !== newMember.nickname) {
      if (oldMember.nickname === null) {
        var oldNM = '\`\`Original Name\`\`';
      } else {
        var oldNM = oldMember.nickname;
      }
      if (newMember.nickname === null) {
        var newNM = '\`\`Original Name\`\`';
      } else {
        var newNM = newMember.nickname;
      }
      let updateNickname = new Discord.MessageEmbed()
        .setAuthor(oldMember.guild.name, oldMember.guild.iconURL({ dynamic: true, size: 1024, format: 'png' }))
        .setThumbnail('https://cdn.discordapp.com/attachments/1091536665912299530/1153870210470781008/BF6ECA69-026C-4335-9FC6-DF96E467BE9D.png')
        .setColor(`#c037d1`)
        .setDescription(`**Change Nickname**\n\n**To : ${oldMember}**\n**By:** <@${userID}>\n\`\`\`${oldNM} => ${newNM}\`\`\` `)
        .setFooter(client.user.username, client.user.displayAvatarURL())

      logChannel.send({ embeds: [updateNickname] });
    }
  });
});


// https://discord.gg/7lm
// ----------------------------------------------------------------------
// https://discord.gg/7lm

let tracker;
try {
  const { inviteTracker } = require("discord-inviter");
  tracker = new inviteTracker(client);
} catch (error) {
  console.error("[EXTRAS] discord-inviter غير متاح:", error.message);
  tracker = new (require("events"))();
}
tracker.on("guildMemberAdd", async (member, inviter) => { 
  let channel1Name = "log-join-leave";
  let logChannel = member.guild.channels.cache.find((c) => c.name === channel1Name);
  if (!logChannel) return;
  if(!member.guild.id.includes(`${logChannel.guild.id}`)) return;
  if(member.user.bot) return;
  let serverMembersCount = member.guild.memberCount;

  const fetchedLogs = await member.guild.fetchAuditLogs({
    limit: 1,
    type: 'BOT_ADD',
  });
  const BotLog = fetchedLogs.entries.first();
  const { executor } = BotLog;
  const invites = await member.guild.invites.fetch();
  const inviterInvite = invites.find((invite) => invite.inviter.id === executor.id);
  const inviteURL = inviterInvite ? `${inviterInvite.code}` : 'Invite URL not found';

  let i1nviter = new Discord.MessageEmbed()
   .setAuthor(member.user.username, member.user.displayAvatarURL({ dynamic: true, size: 1024, format: 'png' }))
   .setThumbnail('https://cdn.discordapp.com/attachments/1091536665912299530/1153822727531147284/D8B5B65D-9A17-4CEF-A04E-7DA3B13985DD.png')
    .setColor('#292450')
    .setDescription(`**User join**\n\n**User: ${member && member.user ? `<@${member.user.id}>` : 'Unknown User'}**\n**By: ${inviter}**\n**Joined at: **(<t:${parseInt(member && member.user ? member.user.createdAt / 1000 : 0)}:R>)\n**Url:** \`${inviteURL}\`\n**Devices: ${member && member.presence ? member.presence.status : 'Unknown Status'}${member && member.presence && member.presence.status === 'offline' ? ' (Offline)' : ''}**\n**Members: ${serverMembersCount}**`)
    .setFooter(inviter.username, inviter.displayAvatarURL({ dynamic: true }));
logChannel.send({ embeds: [i1nviter] });
  })

function Days(date) {
  let now = new Date();
  let diff = now.getTime() - date.getTime();
  let days = Math.floor(diff / 86400000);
  return days + (days == 1 ? " day" : " days") + " ago";
}

client.on('guildMemberRemove', async member => { 
  let channel = "log-join-leave";
  var logChannel = member.guild.channels.cache.find(c => c.name === channel); 
  if(!logChannel) return; 

  let leaveMember = new Discord.MessageEmbed()
  .setAuthor(member.user.username, member.user.displayAvatarURL({ dynamic: true, size: 1024, format: 'png' }))
  .setThumbnail('https://cdn.discordapp.com/attachments/1091536665912299530/1153822715388637194/AFB742D0-5B6A-4C25-BF91-FBA284280087.png')
  .setColor(`#292450`)
  .setDescription(`**User Leave**\n\n**User : <@${member.user.id}>**\n**Joined Discord : (<t:${parseInt(member.user.createdAt / 1000)}:R>)**\n**User id :${member.user.id}**`)
  .setFooter(client.user.username, client.user.displayAvatarURL())
  logChannel.send({ embeds: [leaveMember] });
});

// https://discord.gg/7lm
// ----------------------------------------------------------------------
// https://discord.gg/7lm

client.on("inviteCreate", async (invite) => {
  let channel = "log-links";
  var logChannel = invite.guild.channels.cache.find(c => c.name === channel);
  if (!logChannel) return;
  if (!invite.guild.id.includes(`${logChannel.guild.id}`)) return;
  const fetchedLogs = await invite.guild.fetchAuditLogs({
    limit: 1,
    type: 'INVITE_CREATE',
  });
  const InviteLog = fetchedLogs.entries.first();
  const { executor } = InviteLog;

  let embed = new Discord.MessageEmbed()
    .setAuthor(executor.tag, executor.displayAvatarURL({ dynamic: true, size: 1024, format: 'png' }))
    .setDescription(`**Invite Created**\n\n**By : ${executor}**\n**Create In : ${invite.channel}**\n**Code : \`${invite.code}\`**\n**Max User : \`${invite.maxUses}\`**\n**Ends Within :** \`${invite.expiresTimestamp ? new Date(invite.expiresTimestamp).toLocaleString() : 'Never'}\`\n\`\`\`${invite.url}\`\`\``)
    .setColor(`#286554`)
    .setTimestamp()
    .setFooter(invite.guild.name, invite.guild.iconURL({ dynamic: true }))
    .setThumbnail(`https://cdn.discordapp.com/attachments/1093303174774927511/1138893392919658627/13AA3EF6-F41C-40BA-890B-5D4CFBFC8F81.png`);

  logChannel.send({ embeds: [embed] });
});

// https://discord.gg/7lm
// ----------------------------------------------------------------------
// https://discord.gg/7lm

client.on("guildMemberAdd", async (member) => {
  const fetchedLogs = await member.guild.fetchAuditLogs({
    limit: 1,
    type: 'BOT_ADD',
  });
  const BotLog = fetchedLogs.entries.first();
  const { executor, target } = BotLog;
  if (member.user.bot) {
    let channel = "log-bots";
    var logChannel = member.guild.channels.cache.find(c => c.name === channel);
    if (!logChannel) return;
    if (!member.guild.id.includes(`${logChannel.guild.id}`)) return;
    let embed = new Discord.MessageEmbed()
      .setDescription(`**Invite Bots**\n\n**By : ${executor}**\n**Bot : ${member}**\n**Age : (<t:${parseInt(member.user.createdAt / 1000)}:R>)**\n**Id : ${member.id}**`)
      .setColor(`#6e2f51`)
      .setFooter(client.user.username, client.user.displayAvatarURL())
      .setThumbnail(`https://cdn.discordapp.com/attachments/1147204910337757225/1154648106122616892/C1957198-3BD3-4294-B533-2EDC8E271BBA.png`);

    logChannel.send({ embeds: [embed] });

    // Add the kick button
    let kickButton = new Discord.MessageButton()
      .setCustomId('kickButton')
      .setLabel('Kick Bot')
      .setStyle('DANGER');

    let row = new Discord.MessageActionRow()
      .addComponents(kickButton);

      const message = await logChannel.send({ content: 'Click the button to kick the bot:', embeds: [embed], components: [row] });

    const filter = (interaction) => interaction.customId === 'kickButton' && interaction.user.id === member.guild.ownerId;

    const collector = message.createMessageComponentCollector({ filter, time: 15000 });

    collector.on('collect', async (interaction) => {
      await interaction.reply({ content: 'Kicking the bot...', ephemeral: true });
      await member.kick('Kicked by owner');
    });

    collector.on('end', () => {
      message.edit({ components: [] });
    });
  }

  function Days(date) {
    let now = new Date();
    let diff = now.getTime() - date.getTime();
    let days = Math.floor(diff / 86400000);
    return days + (days == 1 ? " day" : " days") + " ago";
  }
});

// https://discord.gg/7lm
// ----------------------------------------------------------------------
// https://discord.gg/7lm

client.on("inviteDelete", async (invite) => {
  let channel = "log-links";
  var logChannel = invite.guild.channels.cache.find(c => c.name === channel); 
  if(!logChannel) return;
  if(!invite.guild.id.includes(`${logChannel.guild.id}`)) return;
  const fetchedLogs = await invite.guild.fetchAuditLogs({
    limit: 1,
    type: 'INVITE_DELETE',
  });
  const InviteLog = fetchedLogs.entries.first();
  const { executor, target } = InviteLog;

  let embed = new Discord.MessageEmbed()
    .setDescription(`**Invite Deleted**\n\n**Created By:** \`\`\`${target.inviter.tag}\`\`\`\n**Deleted By:** \`\`\`${executor.tag}\`\`\`\n**Invite Url:** ${invite.url}`)
    .setColor(`#286554`)
    .setFooter(client.user.username, client.user.displayAvatarURL())
    .setThumbnail(`https://cdn.discordapp.com/attachments/1093303174774927511/1138893392919658627/13AA3EF6-F41C-40BA-890B-5D4CFBFC8F81.png`);
  logChannel.send({ embeds: [embed] });
});

// https://discord.gg/7lm
// ----------------------------------------------------------------------
// https://discord.gg/7lm

client.on('guildMemberUpdate', async (oldMember, newMember) => { 
  let channel = "log-roles";
  var logChannel = oldMember.guild.channels.cache.find(c => c.name === channel); 
  if (!logChannel) return;
  if (!oldMember.guild.id.includes(`${logChannel.guild.id}`)) return;
  if (!newMember.guild.id.includes(`${logChannel.guild.id}`)) return;
  
  const fetchedLogs = await oldMember.guild.fetchAuditLogs({
    limit: 1,
    type: 'MEMBER_ROLE_UPDATE',
  });
  
  const RoleLog = fetchedLogs.entries.first();
  const { executor } = RoleLog;
  
  const removedRoles = oldMember.roles.cache.filter(role => !newMember.roles.cache.has(role.id));
  if (removedRoles.size > 0) {
    let embed = new Discord.MessageEmbed()
     .setAuthor(executor.tag, executor.avatarURL({ dynamic: true, size: 1024, format: 'png' }))
      .setDescription(`**Edit Member**\n\n**To : ${executor}**\n**By : <@${newMember.user.id}>**\n\`\`\`❌ - ${removedRoles.map(r => r.name)}\`\`\`\ `)
      .setColor(`#493d5d`)
      .setThumbnail('https://cdn.discordapp.com/attachments/1091536665912299530/1164975437320044564/F2090C33-D3A6-4816-BDBA-2AC2E4FDDA92.png?ex=65452aec&is=6532b5ec&hm=64a949b42b78aedd0bdeb626125a30f48eded796cbac1c589292444d1b555fa4&')
      .setFooter(client.user.username, client.user.displayAvatarURL())
      logChannel.send({embeds: [embed]});
  }
  
  const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
  if (addedRoles.size > 0) {
    let embed = new Discord.MessageEmbed()
    .setAuthor(executor.tag, executor.avatarURL({ dynamic: true, size: 1024, format: 'png' }))
    .setDescription(`**Edit Member**\n\n**To : ${executor}**\n**By : <@${newMember.user.id}>**\n\`\`\`✅ - ${addedRoles.map(r => r.name)}\`\`\`\ `)
    .setThumbnail('https://cdn.discordapp.com/attachments/1091536665912299530/1164975437320044564/F2090C33-D3A6-4816-BDBA-2AC2E4FDDA92.png?ex=65452aec&is=6532b5ec&hm=64a949b42b78aedd0bdeb626125a30f48eded796cbac1c589292444d1b555fa4&')
    .setColor(`#493d5d`)
    .setFooter(client.user.username, client.user.displayAvatarURL())
      
    logChannel.send({embeds: [embed]});
  }
});

client.on('roleCreate', async (role) => {
  let channel = "log-roles";
  if (!role.guild.me.permissions.has('EMBED_LINKS')) return;
  if (!role.guild.me.permissions.has('VIEW_AUDIT_LOG')) return;

  var logChannel = role.guild.channels.cache.find((c) => c.name === channel);
  if (!logChannel) return;

  role.guild.fetchAuditLogs().then((logs) => {
    var userID = logs.entries.first().executor.id;
    var usertag = logs.entries.first().executor.tag;
    var userAvatar = logs.entries.first().executor.avatarURL({ dynamic: true });

    let roleCreate = new Discord.MessageEmbed()
    .setAuthor(usertag, userAvatar)
    .setThumbnail('https://cdn.discordapp.com/attachments/1091536665912299530/1153814321877495879/07D149C2-6EAC-4543-B8C8-04F8B543EEA3.png')
      .setDescription(`**Create Role**\n\n**By : <@${userID}>**\n**Role : ${role.name}**`)
      .setColor(`#857f99`)
      .setFooter(client.user.username, client.user.displayAvatarURL())
    logChannel.send({ embeds: [roleCreate] });
  });
});


client.on('roleDelete', async (role) => {
  let channel = "log-roles";
  if (!role.guild.me.permissions.has('EMBED_LINKS')) return;
  if (!role.guild.me.permissions.has('VIEW_AUDIT_LOG')) return;

  var logChannel = role.guild.channels.cache.find((c) => c.name === channel);
  if (!logChannel) return;

  role.guild.fetchAuditLogs().then((logs) => {
    var userID = logs.entries.first().executor.id;
    var usertag = logs.entries.first().executor.tag;
    var userAvatar = logs.entries.first().executor.avatarURL({ dynamic: true });

    let roleDelete = new Discord.MessageEmbed()
    .setAuthor(usertag, userAvatar)
      .setThumbnail(`https://cdn.discordapp.com/attachments/1091536665912299530/1153820347053920356/40A15AD6-0C21-43A5-A70A-6ED69615C182.png`)
      .setDescription(`**Role Delete**\n\n**Role : ${role.name}**\n**By : <@${userID}>**`)
      .setColor(`#857f99`)
      .setFooter(client.user.username, client.user.displayAvatarURL())
    logChannel.send({ embeds: [roleDelete] });
  });
});


client.on('roleUpdate', async (oldRole, newRole) => {
  let channel = "log-roles";
  if (!oldRole.guild.me.permissions.has('EMBED_LINKS')) return;
  if (!oldRole.guild.me.permissions.has('VIEW_AUDIT_LOG')) return;

  var logChannel = oldRole.guild.channels.cache.find((c) => c.name === channel);
  if (!logChannel) return;

  oldRole.guild.fetchAuditLogs().then((logs) => {
    var userID = logs.entries.first().executor.id;
    var usertag = logs.entries.first().executor.tag;
    var userAvatar = logs.entries.first().executor.avatarURL({ dynamic: true });


      let roleUpdateName = new Discord.MessageEmbed()
        .setAuthor(usertag, userAvatar)
        .setThumbnail(`https://cdn.discordapp.com/attachments/1091536665912299530/1164981210846605432/8C926555-671C-4F9C-9136-DAD2229375B4.png?ex=6545304c&is=6532bb4c&hm=8a5a4ec52a8f981a8af903a006bf85724abb877fe21eba0fe1d759c80b393d8c&`)
        .setColor(`#6d5873`)
        .setDescription(`**Edit Role**\n\n**Role : <@&${oldRole.id}>**\n**By : <@${userID}>**\n\`\`\`${oldRole.name} => ${newRole.name} ⇃\`\`\`\ `)
        .setFooter(client.user.username, client.user.displayAvatarURL())

      logChannel.send({ embeds: [roleUpdateName] });


      let permissionsAdded = [];
      let permissionsRemoved = [];
      
      newRole.permissions.toArray().forEach(perm => {
        if (!oldRole.permissions.has(perm)) {
          permissionsAdded.push(perm);
        }
      });
      
      oldRole.permissions.toArray().forEach(perm => {
        if (!newRole.permissions.has(perm)) {
          permissionsRemoved.push(perm);
        }
      });
      
      if (permissionsAdded.length > 0 || permissionsRemoved.length > 0) {
        let formattedPermissionsAdded = permissionsAdded.map(perm => `\`\`\`✅ - ${perm}\`\`\`\ `).join('\n');
        let formattedPermissionsRemoved = permissionsRemoved.map(perm => `\`\`\`❌ - ${perm}\`\`\`\ `).join('\n');
      
        let roleUpdateName = new Discord.MessageEmbed()
          .setAuthor(usertag, userAvatar)
          .setThumbnail('https://cdn.discordapp.com/attachments/1091536665912299530/1164975437320044564/F2090C33-D3A6-4816-BDBA-2AC2E4FDDA92.png?ex=65452aec&is=6532b5ec&hm=64a949b42b78aedd0bdeb626125a30f48eded796cbac1c589292444d1b555fa4&')
          .setColor(`#493d5d`)
          .setDescription(`**Edit Role**\n\n**By : <@${userID}>**\n**Role : <@&${oldRole.id}>**\n${formattedPermissionsAdded}${formattedPermissionsRemoved}`)
          .setFooter(client.user.username, client.user.displayAvatarURL())
      
        logChannel.send({ embeds: [roleUpdateName] });
      }
      
      
    if (oldRole.hexColor !== newRole.hexColor) {
      if (oldRole.hexColor === '#000000') {
        var oldColor = '`Default`';
      } else {
        var oldColor = oldRole.hexColor;
      }
      if (newRole.hexColor === '#000000') {
        var newColor = '`Default`';
      } else {
        var newColor = newRole.hexColor;
      }

      let roleUpdateColor = new Discord.MessageEmbed()
        .setTitle('Role Color Update')
        .setAuthor(usertag, userAvatar)
        .setThumbnail('https://cdn.discordapp.com/emojis/911385098413281300.png?size=80')
        .setColor(`#857f99`)
        .setDescription(
          `**Info Of User:**\n\`\`\`UpdateBy: ${usertag}\nUserID: ${userID}\`\`\`\n**Info Of Role:**\n\`\`\`RoleName: ${oldRole.name}\nOldColor: ${oldColor}\nNewColor: ${newColor}\nRoleID: ${oldRole.id}\`\`\``)
          .setFooter(client.user.username, client.user.displayAvatarURL())

      logChannel.send({ embeds: [roleUpdateColor] });
    }
  });
});

// https://discord.gg/7lm
// ----------------------------------------------------------------------
// https://discord.gg/7lm

client.on('voiceStateUpdate', async (oldState, newState) => { 
  let channe5l = "log-vjoin-vexit";
  var logChannel = oldState.member.guild.channels.cache.find(c => c.name === channe5l); 
  if (!logChannel) return;
  if (oldState.member.bot) return;
  if (newState.member.bot) return;
  if (!newState.guild.id.includes(`${logChannel.guild.id}`)) return;
  if (!oldState.guild.id.includes(`${logChannel.guild.id}`)) return;
    
  if (!oldState.channelId && newState.channelId) {
    let entryTime = new Date().toLocaleTimeString('ar-EG', { hour: 'numeric', minute: 'numeric', hour12: true });
    let embed = new Discord.MessageEmbed()
      .setAuthor(newState.member.user.username, newState.member.user.displayAvatarURL())
      .setDescription(`**Join Voice**\n\n**Voice : <#${newState.channel.id}>**\n**User : <@${oldState.member.user.id}>**\n**Time : ${entryTime}**`)
      .setColor(`#183955`)
      .setFooter(client.user.username, client.user.displayAvatarURL())
      .setThumbnail(`https://cdn.discordapp.com/attachments/1093303174774927511/1138889079963009137/8B73770E-31D7-489A-8BF6-152D91D6D76A.png`);
    return logChannel.send({embeds: [embed]});
  }
  
  if (oldState.channelId && !newState.channelId && oldState.member.user.bot === false) {
    let entryTime = new Date().toLocaleTimeString('ar-EG', { hour: 'numeric', minute: 'numeric', hour12: true });
    let embed = new Discord.MessageEmbed()
    .setAuthor(oldState.member.user.username, oldState.member.user.displayAvatarURL())
    .setDescription(`**Leave Voice**\n\n**Voice : <#${oldState.channel.id}>**\n**User : <@${oldState.member.user.id}>**\n**Time : ${entryTime}**`)
      .setColor(`#183955`)
      .setFooter(client.user.username, client.user.displayAvatarURL())
      .setThumbnail(`https://cdn.discordapp.com/attachments/1093303174774927511/1138889077123465416/IMG_2593.png`);
    return logChannel.send({embeds: [embed]});
  }

  let channe7l = "log-move";
  var logChannel = oldState.member.guild.channels.cache.find(c => c.name === channe7l); 
  if (!logChannel) return;
  if (oldState.channelId !== newState.channelId) {
    let embed = new Discord.MessageEmbed()
    .setAuthor(oldState.member.user.username, oldState.member.user.displayAvatarURL())
    .setDescription(`**Voice Moved**\n\n**User : <@${newState.member.user.id}>**\n**Voice : <#${(oldState.channel?.id)}>**\n**Moved : <#${(newState.channel?.id)}>**\n\`\`\`${(oldState.channel?.name)} => ${(newState.channel?.name)}\`\`\`\ `)
      .setColor(`#4e9ca5`)
      .setFooter(client.user.username, client.user.displayAvatarURL())
      .setThumbnail(`https://cdn.discordapp.com/attachments/1093303174774927511/1138889767468146738/E242A7A8-FDB5-4F44-86F4-AE2161BFA543.png`);
    return logChannel.send({embeds: [embed]});
  }
});

// https://discord.gg/7lm
// ----------------------------------------------------------------------
// https://discord.gg/7lm

client.on('guildBanAdd', async (member) => {
  let channel = "log-ban-unban";
  var logChannel = member.guild.channels.cache.find((c) => c.name === channel);
  if (!logChannel) return;

  const fetchedLogs = await member.guild.fetchAuditLogs({
    limit: 1,
    type: 'MEMBER_BAN_ADD',
  });
  const BanLog = fetchedLogs.entries.first();
  const { executor, reason } = BanLog; // Extract the reason from the BanLog

  let Embed = new Discord.MessageEmbed()
   .setAuthor(member.user.username, member.user.displayAvatarURL({ dynamic: true, size: 1024, format: 'png' }))
    .setDescription(`**Ban Member**\n\n**To : <@${member.user.id}>**\n**By : ${executor}**\n\`\`\`Reason : ${reason || 'No reason'}\`\`\``)
    .setColor(`#880013`)
    .setFooter(member.guild.name, member.guild.iconURL({ dynamic: true }))
    .setThumbnail(
      'https://cdn.discordapp.com/attachments/1093303174774927511/1138892172574326874/82073587-11BA-4E4B-AC8F-8857CD89282F.png'
    );

  logChannel.send({ embeds: [Embed] });
});

client.on('guildBanRemove', async (member) => {
  let channel = "log-ban-unban";
  var logChannel = member.guild.channels.cache.find((c) => c.name === channel);
  if (!logChannel) return;
  const fetchedLogs = await member.guild.fetchAuditLogs({
    limit: 1,
    type: 'MEMBER_BAN_REMOVE',
  });
  const BanLog = fetchedLogs.entries.first();
  const { executor } = BanLog;

  if (!logChannel) return;

  let Embed = new Discord.MessageEmbed()
    .setAuthor(member.user.username, member.user.displayAvatarURL({ dynamic: true, size: 1024, format: 'png' }))
    .setDescription(`**UnBan Member**\n\n**To : <@${member.user.id}>**\n**By : ${executor}**\n\`\`\`Reason : No reason\`\`\`\ `)
    .setColor(`#880013`)
    .setFooter(member.guild.name, member.guild.iconURL({ dynamic: true }))
    .setThumbnail(
      'https://cdn.discordapp.com/attachments/1093303174774927511/1138891905283928174/551F8C85-8827-41AF-9286-256F63BE2129.png'
    );

  logChannel.send({ embeds: [Embed] });
});

// https://discord.gg/7lm
// ----------------------------------------------------------------------
// https://discord.gg/7lm

client.on('guildMemberRemove', async member => {
  let channel = "log-kick";
  var logChannel = member.guild.channels.cache.find((c) => c.name === channel);
  if (!logChannel) return;

  const fetchedLogs = await member.guild.fetchAuditLogs({
    limit: 1
  });
  const kickLog = fetchedLogs.entries.first();
  const { executor, target } = kickLog;

  if (kickLog.action == 'MEMBER_KICK' && kickLog.target.id == `${member.user.id}`) {
    let channel = "log-kick";
    var logChannel = member.guild.channels.cache.find((c) => c.name === channel);
    if (!logChannel) return;

    let Embed = new Discord.MessageEmbed()
    .setAuthor(member.user.username, member.user.displayAvatarURL({ dynamic: true, size: 1024, format: 'png' }))
      .setDescription(`**Kick Member**\n\n**To : <@${member.user.id}>**\n**By : ${executor}**\n\`\`\`Reason : No reason\`\`\`\ `)
      .setColor(`#101a3a`)
      .setFooter(member.guild.name, member.guild.iconURL({ dynamic: true }))
      .setThumbnail(`https://cdn.discordapp.com/attachments/1093303174774927511/1138886169384472627/F4570260-9C71-432E-87CC-59C7B4B13FD4.png`);

    logChannel.send({ embeds: [Embed] });
  }
});

// https://discord.gg/7lm
// ----------------------------------------------------------------------
// https://discord.gg/7lm

// (الخط القديم نُقل إلى events/autoline.js)
// https://discord.gg/7lm
// ----------------------------------------------------------------------
// https://discord.gg/7lm

let { joinVoiceChannel } = require("@discordjs/voice");
        client.on("ready", async () => {
            let Voice = await Data.get(`Voice_${client.user.id}`)
            const channel = client.channels.cache.get(Voice);
            if (!channel || channel.type !== "GUILD_VOICE") { return }
            const GUILD = channel.guild;
            const connection = joinVoiceChannel({
              channelId: Voice,
              guildId: GUILD.id,
              adapterCreator: GUILD.voiceAdapterCreator,
              selfDeaf: true
            });
            connection;
          })

// https://discord.gg/7lm
// ----------------------------------------------------------------------
// https://discord.gg/7lm

client.on("messageCreate", async (message) => {
    if(message.author.bot) return
  const reactData = Data.get(`RoomInfo_${message.channel.id}`);
  if (!reactData) return;

  const channel = message.guild.channels.cache.get(reactData.Channel_Id);
  if (!channel) return;

  const emoji1 = reactData.Emoji1_Id || await client.emojis.cache.find(emoji => emoji.id === reactData.Emoji1_Id)
  const emoji2 = reactData.Emoji2_Id || await client.emojis.cache.find(emoji => emoji.id === reactData.Emoji2_Id)

  if (emoji1) await message.react(emoji1);
  if (emoji2) await message.react(emoji2);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  const words = Data.get(`word_${message.guild.id}`);
  if (!Array.isArray(words) || words.length === 0) return;
  words.forEach((word) => {
    if (message.content.includes(word)) {
      message.delete();
    }
  });
});

// https://discord.gg/7lm
// ----------------------------------------------------------------------
// https://discord.gg/7lm

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  const words = Data.get(`word_${message.guild.id}`);
  if (!Array.isArray(words) || words.length === 0) return;
  words.forEach((word) => {
    if (message.content.includes(word)) {
      message.delete();
    }
  });
});

// https://discord.gg/7lm
// ----------------------------------------------------------------------
// https://discord.gg/7lm
const { createCanvas, registerFont } = require("canvas")

const interval = 50000;
client.on('ready', async () => {
    setInterval(async () => {
        try {
            const Url = db.get(`Url = [ Colors ]`);
            const channel_id = await db.get("Channel = [ Colors ]");
            if (!channel_id) return;
            const channel = client.channels.cache.get(channel_id);
            if (!channel) return;
            const colorRoles = channel.guild.roles.cache.filter(
                (role) => !isNaN(role.name) && !role.name.includes(".")
            );

            const sortedRoles = colorRoles.sort((roleA, roleB) => roleB.position - roleA.position);

            // ✦ لا نحذف ولا نعيد إرسال اللوحة إلا إذا تغيّرت الألوان (كانت تنحذف كل 50 ثانية وتختفي القائمة)
            const panelSig = JSON.stringify([Url || "", sortedRoles.map((r) => [r.id, r.name, r.hexColor])]);
            const sigKey = `ColorsPanelSig = [${channel.id}]`;
            const msgKey = `ColorsPanelMsg = [${channel.id}]`;
            const lastMsgId = db.get(msgKey);
            if (db.get(sigKey) === panelSig && lastMsgId) {
                const stillThere = await channel.messages.fetch(lastMsgId).catch(() => null);
                if (stillThere) return;
            }

            let minRange = 1;
            let maxRange = 11;
            let canvasHeight = 330;

            if (sortedRoles.size > 11) {
                minRange = 12;
                maxRange = 15;
                canvasHeight = 400;
            } if (sortedRoles.size > 22) {
                minRange = 22;
                maxRange = 33;
                canvasHeight = 500;
            } if (sortedRoles.size > 34) {
                minRange = 34;
                maxRange = 44;
                canvasHeight = 600;
            }

            const colrsList = createCanvas(1200, canvasHeight);

            const { loadImage } = require("canvas");
            let backgroundImage;
            try {
                backgroundImage = await loadImage(Url || require("path").join(process.cwd(), "assets", "vanr-banner.jpg"));
            } catch (error) {
                console.error("Error loading background image:", error);
            }

            const ctx = colrsList.getContext("2d");
            if (backgroundImage) {
                ctx.drawImage(backgroundImage, 0, 0, 1200, canvasHeight);
            } else {
                ctx.clearRect(0, 0, colrsList.width, colrsList.height);
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
                const fontSize = "32px";
                const cellWidth = 70;
                const cellHeight = 70;

                ctx.font = fontSize + " Arial";
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

            const attachment = new MessageAttachment(colrsList.toBuffer(), "img.png");

            // قوائم دائمة (25 لون لكل قائمة) — التفاعل معها في events/colorsMenu.js
            const panelRows = [];
            const panelRoles = [...sortedRoles.values()].slice(0, 125);
            for (let i = 0; i < panelRoles.length; i += 25) {
                const chunk = panelRoles.slice(i, i + 25);
                panelRows.push(
                    new MessageActionRow().addComponents(
                        new MessageSelectMenu()
                            .setCustomId(`color_pick_${i / 25}`)
                            .setPlaceholder(`قم باختيار اللون المناسب (${chunk[0].name} - ${chunk[chunk.length - 1].name})`)
                            .addOptions(chunk.map((r) => ({ label: `لون ${r.name}`, description: r.hexColor, value: r.id })))
                    )
                );
            }

            await channel.bulkDelete(100).catch(() => {});
            const message = await channel.send({
                files: [attachment],
                components: panelRows,
            });

            db.set(sigKey, panelSig);
            db.set(msgKey, message.id);

        } catch (error) {
            console.error("Error:", error);
        }
    }, interval);
});

////////////////////////////////////////////////////////////////////////
const interva1l = 50000;
client.on('ready', async () => {
    setInterval(async () => {
        try {
            const Url = db.get(`Url = [ Colors ]`);
            const channel_id = await db.get("avtclear");
            if (!channel_id) return;
            const channel = client.channels.cache.get(channel_id);
            if (!channel) return;
            const colorRoles = channel.guild.roles.cache.filter(
                (role) => !isNaN(role.name) && !role.name.includes(".")
            );

            const sortedRoles = colorRoles.sort((roleA, roleB) => roleB.position - roleA.position);

            let minRange = 1;
            let maxRange = 11;
            let canvasHeight = 330;

            if (sortedRoles.size > 11) {
                minRange = 12;
                maxRange = 15;
                canvasHeight = 400;
            } if (sortedRoles.size > 22) {
                minRange = 22;
                maxRange = 33;
                canvasHeight = 500;
            } if (sortedRoles.size > 34) {
                minRange = 34;
                maxRange = 44;
                canvasHeight = 600;
            }

            const colrsList = createCanvas(1200, canvasHeight);

            let backgroundImage;
            if (Url) {
                try {
                    backgroundImage = await loadImage(Url);
                } catch (error) {
                    console.error("Error loading background image:", error);
                }
            }

            const ctx = colrsList.getContext("2d");
            if (backgroundImage) {
                ctx.drawImage(backgroundImage, 0, 0, 1200, 500);
            } else {
                ctx.clearRect(0, 0, colrsList.width, colrsList.height);
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
                const fontSize = "32px";
                const cellWidth = 70;
                const cellHeight = 70;

                ctx.font = fontSize + " Arial";
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

            channel.bulkDelete(100);
            const attachment = new MessageAttachment(colrsList.toBuffer(), "img.png");
            await channel.send({ files: [attachment], });
            
channel.send(`\`${prefix}link\` لأرسال رابط سيرفرك
\`${prefix}change\` لتحويل الصورة من ملون إلى رمادي
\`${prefix}color\` تحويل الصورة من رمادي إلى مُلونة
\`${prefix}banner\` تحصل على بنر أي شخص بواسطة الأيدي 
\`${prefix}avt\` تجيب أفتار شخص بواسطة الأيدي
            `);

           

        } catch (error) {
            console.error("Error:", error);
        }
    }, interva1l);
});

// https://discord.gg/7lm
// ----------------------------------------------------------------------
// https://discord.gg/7lm

client.on(`messageCreate`, message => {
      const Color = db.get(`Guild_Color = ${message.guild?.id}`)|| `#000000`
            if (!Color) return;
  if (message.content == (prefix + "bserver")) {
          let setchannek = Data.get(`setChannel_${message.guild.id}`)
  if (message.channel.id !== setchannek) return;
    let embed = new MessageEmbed()
      .setTitle(`Banner Server`)
      .setImage(message.guild.bannerURL({ dynamic: true, size: 1024 }))
      .setURL(message.guild.bannerURL({ dynamic: true, size: 1024 }))
      .setColor(`${Color  || `#000000`}`)
    message.reply({ embeds: [embed] })
  }
})

// https://discord.gg/7lm
// ----------------------------------------------------------------------
// https://discord.gg/7lm

client.on('messageCreate', async (message) => {
  return; // ← انتقل إلى events/protection.js (antilink)
  if (!message.guild || !message.guild.id) return;

  const antiLinksEnabled = db.get(`antilinks-${message.guild.id}`);
  if (antiLinksEnabled !== 'on') return;

  const discordInviteRegex = /(http[s]?:\/\/)?discord\.gg\/[\w-]{2,}/g;
  const containsDiscordInvite = discordInviteRegex.test(message.content);

  if (containsDiscordInvite) {
    try {
      if (message.deletable && !message.member.permissions.has('ADMINISTRATOR')) {
        await message.delete();

        const member = message.member;
        const muteRole = message.guild.roles.cache.find(role => role.name === 'Muted');
        if (!muteRole) return;

        await member.roles.add(muteRole);
        message.channel.send(`✅**تم إسكات ${member.user.tag} من السيرفر!**🤐`).then(msg => {
          setTimeout(() => {
            msg.delete();
          }, 4000);
        });


        setTimeout(async () => {
          await member.roles.remove(muteRole);
        }, 30 * 60 * 1000); // 30 minutes
      }
    } catch (error) {
      console.error(`Error muting member: ${error}`);
    }
  }
});

// https://discord.gg/7lm
// ----------------------------------------------------------------------
// https://discord.gg/7lm

client.on('guildMemberAdd', async(member) => {
    return; // ← انتقل إلى events/protection.js (antibots)
    if(!member.user.bot) return;

    if(db.get(`antibots-${member.guild.id}`) == 'on') {
        if(!member.kickable) return;
        member.kick('AntiBot Is Turned ON');
    }
})

// https://discord.gg/7lm
// ----------------------------------------------------------------------
// https://discord.gg/7lm

client.on("interactionCreate", interaction => {
  const Color = db.get(`Guild_Color = ${interaction.guild?.id}`)  || `#000000`
   if (!Color) return;
if (!interaction.isSelectMenu()) return;
if (interaction.values == "1help_option") {
  let replyembed = new Discord.MessageEmbed()
.setColor(`${Color || `#000000`}`)
.setTitle('آلاوامر ألعامه ')

.setDescription(`
**#** : \`${prefix}help\` : **قائمه المساعدة**
**#** : \`${prefix}semoji\` : **ارسال صورة الايموجي**
**#** : \`${prefix}id\` : **يظهر المعرف الخاص بك**
**#** : \`${prefix}link\` : **نسخ رابط للسيرفر**
**#** : \`${prefix}invites\` : **عدد دعواتك**
**#** : \`${prefix}top-invites\` : **قائمة اعلى الدعوات**
**#** : \`${prefix}change\` : **تحويل الصوره الى رمادي**
**#** : \`${prefix}user\` : **معلومات العضو**
**#** : \`${prefix}banner\` : **بنر العضو**
**#** : \`${prefix}avatar\` : **افتار العضو**
**#** : \`${prefix}server\` : **عرض معلومات عن السيرفر**
**#** : \`${prefix}circle\` : **تحويل الصوره الي شكل دئري**
**#** : \`${prefix}roll\` : **رمي نرد**
**#** : \`${prefix}colors\` : **علبة الالوان**
**#** : \`${prefix}mcolors\` : **قائمة الالوان**
**#** : \`${prefix}color\` : **اختيار لون**`)
  interaction.update({ embeds: [replyembed] });
}
if (interaction.values == "2help_option") {
  let replyembed = new Discord.MessageEmbed()
.setColor(`${Color || `#000000`}`)
.setTitle('آوامر ألادارة')
.setDescription(`
**#** : \`${prefix}ban\` : **حظر العضو**
**#** : \`${prefix}kick\` : **طرد عضو من السيرفر**
**#** : \`${prefix}setnick\` : **تغيير اسم عضو داخل السيرفر**
**#** : \`${prefix}clear\` : **مسح رسائل الشات**
**#** : \`${prefix}move\` : **سحب عضو الى روم اخر**
**#** : \`${prefix}moveme\` : **توديك لعضو بروم اخر**
**#** : \`${prefix}mute\` : **اسكات كتابي**
**#** : \`${prefix}unmute\` : **الغاء الاسكات الكتابي**
**#** : \`${prefix}unvmute\` : **فك ميوت صوتي عن عضو**
**#** : \`${prefix}vmute\` : **اسكات عضو من الفويس**
**#** : \`${prefix}prison\` : **سجن عضو**
**#** : \`${prefix}unprison\` : **فك سجن عضو**
**#** : \`${prefix}warn\` : **اعطاء تحذير لعضو**
**#** : \`${prefix}warnings\` : **الحصول على قائمة التحذيرات لعضو**
**#** : \`${prefix}remove-warn\` :  **إزاله تحذير اعضاء**
**#** : \`${prefix}timeout\` : **اعطاء تايم اوت**
**#** : \`${prefix}unban\` : **الغاء الحظر من شخص**
**#** : \`${prefix}unban-all\` : **الغاء المحظورين من السيرفر**
**#** : \`${prefix}allbans\` : **قائمة المحظورين**`)
  interaction.update({ embeds: [replyembed] });
}

if (interaction.values == "5help_option") {
  let replyembed = new Discord.MessageEmbed()
.setColor(`${Color || `#000000`}`)
.setTitle('آوامر  ألاعدادات')
.setDescription(`
**#** : \`${prefix}imagechat\` : **تحديد صوره لعلبة الالوان**
**#** : \`${prefix}setclear\` : **تحديد شات المسح التلقائي**
**#** : \`${prefix}allow\` : **السماح لعضو او رول لاستعمال امر**
**#** : \`${prefix}ctcolors\` : **انشاء الوان تلقائي**
**#** : \`${prefix}setline\` : **تحديد الخط التلقائي**
**#** : \`${prefix}cline\` : **تحديد رومات الخط التلقائي**
**#** : \`${prefix}setreact\` :** رياكشن تلقائي بالشات**
**#** : \`${prefix}unreact\` : **حذف شات الرياكشن التلقائي**
**#** : \`${prefix}setcommandchannel\` : تعين شات الاوامر**
**#** : \`${prefix}log-creat\` : **انشاء شاتات اللوق**
**#** : \`${prefix}log-delete\` : **حذف شاتات اللوق**
**#** : \`${prefix}autoreply\` : **رد تلقائي على رساله معينه**
**#** : \`${prefix}dautoreply\` : **حذف الرد التلقائي**
**#** : \`${prefix}evaluation\` : **تعيين شات التقييمات**`)


  interaction.update({ embeds: [replyembed] })
}


if (interaction.values == "11help_option") {
  let replyembed = new Discord.MessageEmbed()
.setTitle('آوامر المعلومات')
.setColor(`${Color || `#000000`}`)
.setDescription(`

**#** : \`${prefix}addemoji\` : **اضافة ايموجي للسيرفر**
**#** : \`${prefix}check\` : **اظهار من يملك الرول**
**#** : \`${prefix}hide\` : **اخفاء شات**
**#** : \`${prefix}show\` : **اظهار الشات**
**#** : \`${prefix}disapplay\` : **تعطيل المنشن والصور بالشات**
**#** : \`${prefix}applay\` : **تفعيل المنشن والصور بالشات**
**#** : \`${prefix}rooms\` : **اظهار الاعضاء بالرومات الصوتيه**
**#** : \`${prefix}server\` : **اظهار معلومات السيرفر**
**#** : \`${prefix}slowmode\` : **اضافه وقت مستقطع للشات**
**#** : \`${prefix}lock\` : **قفل شات**
**#** : \`${prefix}unlock\` : **فتح شات**`)

  interaction.update({ embeds: [replyembed] })
}


if (interaction.values == "9help_option") {
  let replyembed = new Discord.MessageEmbed()
.setTitle('آوامر ألرولات')
.setColor(`${Color || `#000000`}`)
.setDescription(`
**#** : \`${prefix}autorole\` : **اضافة رول عند الدخول للسيرفر**
**#** : \`${prefix}role\` :  **اعطاء رول , سحب رول**
**#** : \`${prefix}here\` : **اضافة رول الهير للعضو**
**#** : \`${prefix}pic\` : **اضافة رول الصور للعضو**
**#** : \`${prefix}live\` : **اعطاء رتبه السكرين**
**#** : \`${prefix}nick\` : **اعطاء رتبه تغير الآسم**
**#** : \`${prefix}allrole\` : **اعطاء رول لجميع الاعضاء**
**#** : \`${prefix}removrole\` : **إزالة رول من الجميع عن طريق الايدي**
**#** : \`${prefix}check\` : **تشييك على الاعضاء في الرول **
**#** : \`${prefix}srole\` : **انشاء رول جديد**
**#** : \`${prefix}addrole\` : **انشاء رول خاص**`)



  interaction.update({ embeds: [replyembed] })
}
if (interaction.values == "10help_option") {
  let replyembed = new Discord.MessageEmbed()
.setTitle('آوامر ألتذكرة')
.setColor(`${Color || `#000000`}`)
.setDescription(`
**#** : \`${prefix}admin\` : **فتح تذكرة****
**#** : \`${prefix}add\` : **اضافة عضو الى التذكرة**
**#** : \`${prefix}ticlog\` : **تعين شات لوج التذكرة**
**#** : \`${prefix}setticket\` : **عداد رسالة التذكرة**
**#** : \`${prefix}setcategory\` : **تحديد ايدي كاتجوري التذكرة**
**#** : \`${prefix}imaget\` : **تحديد صورة رسالة التذكرة**
**#** : \`${prefix}settrole\` : **اضافة رولات التذكرة**`)
  interaction.update({ embeds: [replyembed] })

}

if (interaction.values == "3help_option") {
  let replyembed = new Discord.MessageEmbed()
.setTitle('آوامر الترحيب')
.setColor(`${Color || `#000000`}`)
.setDescription(`
**#** : \`${prefix}img-wlc\` : **تحديد صوره الترحيب**
**#** : \`${prefix}channel-wlc\` : **تحديد شات الترحيب**
**#** : \`${prefix}message-wlc\` : **تحديد رسالة الترحيب**
**#** : \`${prefix}toggle-wlc\` : **تشغيل وايقاف الترحيب**
**#** : \`${prefix}restert-wec\` : **إعادة ظبط الترحيب**
**#** : \`${prefix}settings\` : **عرض جميع اوامر الترحيب**
**#** : \`${prefix}t\` : **تجربة احداثيات الترحيب**
`)
  interaction.update({ embeds: [replyembed] })

}

if (interaction.values == "13help_option") {
  let replyembed = new Discord.MessageEmbed()
.setTitle('آوامر الإفتارت')
.setColor(`${Color || `#000000`}`)
.setDescription(`
**#** : \`${prefix}link\` : **نشر رابط سيرفر**
**#** : \`${prefix}setlinks\` : **إنشاء شتات نشر الروابط**
**#** : \`${prefix}avtmbed list\` : **عرض شتات الإفتارت المحفوظه**
**#** : \`${prefix}avtmbed\` : **تحديد شتات الإفتارت**
**#** : \`${prefix}avtmbed off\` : **إيقاف امبيد الإفتارت**
**#** : \`${prefix}avtclear\` : **تحديد شات الإلوان الخاص بالإفتارت**
`)
  interaction.update({ embeds: [replyembed] })

}

if (interaction.values == "12help_option") {
  let replyembed = new Discord.MessageEmbed()
.setTitle('آوامر الكت')
.setColor(`${Color || `#000000`}`)
.setDescription(`
**#** : \`${prefix}image-cut\` : **تحديد صوره الكت**
**#** : \`${prefix}chat-cuts\` : **تحديد شات للكت**
**#** : \`${prefix}cut\` : **كت تويت**
**#** : \`${prefix}allow cut\` : **إضافة  رول لأستعمال الكت**
`)
  interaction.update({ embeds: [replyembed] })

}



if (interaction.values == "4help_option") {
  let replyembed = new Discord.MessageEmbed()
.setTitle('آوامر ألحماية')
.setColor(`${Color || `#000000`}`)
.setDescription(`
**#** : \`${prefix}bots\` : **اظهار البوتات الموجودة بالسيرفر**
**#** : \`${prefix}word\` : **اضافة او ازالة كلمات يعاقب كاتبها**
**#** : \`${prefix}wordlist\` : **عرض الكلامات التي يعاقب كاتبها**
**#** : \`${prefix}servername\` : **تغير اسم السيرفر**
**#** : \`${prefix}serveravatar\` : **تغير صورة السيرفر**
**#** : \`${prefix}antibots [off/on]\` : **تفعيل والغاء الحماية من البوتات**
**#** : \`${prefix}antilink [off/on]\` : **تفعيل والغاء الحماية من الروابط**
**#** : \`${prefix}antispam [off/on]\` : **تفعيل والغاء الحماية من الاسبام**
**#** : \`${prefix}antijoin [off/on]\` : **تفعيل والغاء سجن الحسابات الجديدة**`)
  interaction.update({ embeds: [replyembed] })

}


if (interaction.values == "7help_option") {
  let replyembed = new Discord.MessageEmbed()
.setColor(`${Color || `#000000`}`)
//.setTimestamp()
//.setFooter({ text: `x87.b`, iconURL: client.user.displayAvatarURL() })
.setTitle('آوامر مالك البوت')
.setDescription(`
**#** : \`${prefix}guild [start / id]\` :** اضافه والغاء اي دي السيرفر**
**#** : \`${prefix}setname\` : **تغير اسم البوت**
**#** : \`${prefix}setavatar\` : **تغير صورة البوت**
**#** : \`${prefix}send\` : **ارسال رساله لخاص العضو **
**#** : \`${prefix}say\` : **ارسال رساله عن طريق البوت**
**#** : \`${prefix}setprefix\` :** تغيير بادئه البوت**
**#** : \`${prefix}restart\` : **اعادة ضبط البوت**
**#** : \`${prefix}owners\` : **عرض قائمة الاونرات**
**#** : \`${prefix}setowner\` : **اضافة او ازالة اونر من البوت**
**#** : \`${prefix}ping\` : **سرعه الاستجابه**
**#** : \`${prefix}setecolor\` : **تغير لون الامبيد**
**#** : \`${prefix}setstatus\` : **تغير حالة البوت**
**#** : \`${prefix}bot-setvoice\` :** تعين فويس للبوت**`)

  interaction.update({ embeds: [replyembed] })
}

if (interaction.values == "8help_option") {
  interaction.message.delete()
    }
 
});

// https://discord.gg/7lm
// ----------------------------------------------------------------------
// https://discord.gg/7lm

////////// رولات السجن والميوت التلقائي
client.on("guildMemberAdd", (member) => {
  const muted = Data.get(`MutedMember_${member.id}`);
  if (!muted) return;
  let muteRole = member.guild.roles.cache.find((role) => role.name == "prison");
  member.roles.add(muteRole);
});
client.on("guildMemberAdd", (member) => {
  const muted = Data.get(`Muted_Member_${member.id}`);
  if (!muted) return;
  let muteRole = member.guild.roles.cache.find((role) => role.name == "Muted");
  member.roles.add(muteRole);
});
////// رول تلقائي
let auto = JSON.parse(fs.readFileSync("./autorole.js", 'utf8'));
client.on("messageCreate", badboy => {
  if(badboy.content.startsWith(prefix + "autorole")){
     if(badboy.author.bot || !badboy.guild) return badboy.reply({ content: "this command for server only" })

    if(!badboy.member.permissions.has("ADMINISTRATOR")) return badboy.channel.send({ content: "> **You do not have permission !!.**" })
    var role = badboy.mentions.roles.first();
    if(!role) return badboy.channel.send({ content: "**يرجى ارفاق منشن الرول .**" })
    auto[badboy.guild.id] = {
rolejoin: role.id,
    }
     fs.writeFile("./autorole.js", JSON.stringify(auto), (err) => {
if(err)
console.error(err);
 badboy.channel.send({ content: "**تم تحديد الرول بنجاح .**" })

})
  }
})

client.on('guildMemberAdd', member => {
  if(!auto[member.guild.id]) return;

 let rolejoin = member.guild.roles.cache.find(role => role.id === `${auto[member.guild.id].rolejoin}`);
if(!rolejoin) return;
  member.roles.add(rolejoin);

})  

// https://discord.gg/7lm
// ----------------------------------------------------------------------
// https://discord.gg/7lm

const {  TextInputComponent } = require("discord.js")
client.on(`interactionCreate`, async interaction => {
  const db = require(`pro.db`)
  if (interaction.isButton()) {
    if (interaction.customId === `Auto_Reply`) {
      const Services = new Modal().setCustomId(`Reply-Bot`).setTitle(`Reply`);
      const Service_1 = new TextInputComponent().setCustomId('Auto-Reply').setLabel(`إضافة رسالتك`).setStyle(`PARAGRAPH`).setPlaceholder(' ').setRequired(true)
      const Service_2 = new TextInputComponent().setCustomId('-Reply').setLabel(`إضاف الرد`).setStyle(`PARAGRAPH`).setPlaceholder(' ').setRequired(true)
      const Service1 = new MessageActionRow().addComponents(Service_1);
      const Service2 = new MessageActionRow().addComponents(Service_2);
      Services.addComponents(Service1, Service2);
      interaction.showModal(Services);
    }
  }
  if (interaction.isModalSubmit()) {
    if (interaction.customId === `Reply-Bot`) {
      const Service_1 = interaction.fields.getTextInputValue('Auto-Reply');
      const Service_2 = interaction.fields.getTextInputValue('-Reply');
      if (db.get(`Replys_${Service_1}`)) return interaction.reply({ content: `موجود بالفعل` })
      db.push(`Replys_${Service_1}`, { Word: Service_1, Reply: Service_2 })
      interaction.reply({ content: `${Service_1} | ${Service_2}` })
    }
  }
})

client.on('messageCreate', Message => {
  const db = require(`pro.db`)
  const Word = db.get(`Replys_${Message.content}`)
  if (!Word) return;
  if (Message.content.startsWith(Word[0].Word)) {
    Message.reply({ content: `${Word[0].Reply}` })
    Message.channel.sendTyping();
  }
})

// https://discord.gg/7lm
// ----------------------------------------------------------------------
// https://discord.gg/7lm

const Db = require(`pro.db`);
const { channel } = require("diagnostics_channel");
 client.on(`messageCreate`, async function (Message) {
  const Command = Message.content.split(` `)[0] === prefix + `guild`;
  if (!config.owners.includes(Message.author.id)) return;
  if (!Command) return;
  const ID = Message.content.split(` `)[1]
  if (!ID) return Message.reply({ content: `**يرجى إرفاق إيدي السيرفر المُراد نقل البوت إلية .**` })
  Db.set(`Guild`, ID)
  Message.react("✅").then(async () => {
    Message.guild.leave()
  })
})

const {Guild } = require(`${process.cwd()}/config`);
client.on('guildCreate', (guild) => {
  const Servers = Db.get(`Guild`)
  if (guild.id !== `${Servers}` && guild.id !== Guild) {
      const { owners } = require(`${process.cwd()}/config`);
      const Member = guild.members.cache.get(`${owners}`)
      if (Member) {
          Member?.send({ content: `Guild Name : ${guild.name} , Owner : <@!${guild.ownerId}> : Guild Name ${guild.id}` }).catch(() => { return })
      }
      guild.leave();
  }
});

// https://discord.gg/7lm
// ----------------------------------------------------------------------
// https://discord.gg/7lm

const spamThreshold = 7;
const spamTimeframe = 4000;
const spamCache = new Map();
const mutedUsers = new Map();
const maxContentLength = 30;

client.once('ready', async () => {

  const savedState = await db.get('spamProtection');
  if (savedState !== null) {
    spamProtectionEnabled = savedState;
  }
});

client.on('messageCreate', async (message) => {
  return; // ← انتقل إلى events/protection.js (antispam) — كان يرمي ReferenceError ويحذف أي رسالة أطول من 30 حرف
  if (message.author.bot) return;

  if (!spamProtectionEnabled) return;

  const authorId = message.author.id;
  const currentTime = Date.now();

  if (spamCache.has(authorId)) {
    const userData = spamCache.get(authorId);
    const { lastMessageTime, messageCount } = userData;

    const timeDifference = currentTime - lastMessageTime;
    if (timeDifference < spamTimeframe) {
      userData.messageCount += 1;
      spamCache.set(authorId, userData);

      if (messageCount === spamThreshold - 1) {
        message.channel.send(`**<@${authorId}>, يُرجى التوقف عن السبام! هذه هي المرة الأخيرة قبل أن يتم إعطاؤك ميوت.**`)
          .then((msg) => {
            setTimeout(() => {
              msg.delete();
            }, 3000);
          });
      } else if (messageCount >= spamThreshold) {
        const mutedUntil = mutedUsers.get(authorId);
        if (!mutedUntil) {
          const muteEndTime = currentTime + (5 * 60 * 1000); // 5 minutes in milliseconds
          mutedUsers.set(authorId, muteEndTime);
          const m = message?.guild?.roles?.cache?.find(m => m.name === "Muted");
message.member.roles.add(m)
          message.delete();
          message.channel.send(`**<@${authorId}>, تم إعطاؤك ميوت لمدة 5 دقائق بسبب السبام.**`)
            .then((msg) => {
              setTimeout(() => {
                msg.delete();
              }, 3000);
            });
          setTimeout(() => {
            mutedUsers.delete(authorId);
            const m = message?.guild?.roles?.cache?.find(m => m.name === "Muted");
message.member.roles.remove(m)
          }, 5 * 60 * 1000); // 5 minutes in tmute
        }
      }
    } else {
      userData.lastMessageTime = currentTime;
      userData.messageCount = 1;
      spamCache.set(authorId, userData);
    }
  } else {
    spamCache.set(authorId, {
      lastMessageTime: currentTime,
      messageCount: 1
    });
  }

  if (message.content.length > maxContentLength) {
    message.delete();
    message.channel.send(`**<@${authorId}>, الرجاء عدم كتابة رسائل طويلة.**`)
      .then((msg) => {
        setTimeout(() => {
          msg.delete();
        }, 3000);
      });
  }
});

// https://discord.gg/7lm
// ----------------------------------------------------------------------------------
// https://discord.gg/7lm

const moment = require('moment');
client.on('guildMemberAdd', async (member) => {
  return; // ← انتقل إلى events/protection.js (antijoin)
  const antijoinEnabled = await db.get(`antijoinEnabled_${member.guild.id}`);
  const commandEnabled = antijoinEnabled !== null ? antijoinEnabled : true;

  if (!commandEnabled) {
    return; // Don't do anything if the command is disabled
  }

  const accountCreated = member.user.createdTimestamp;
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

  if (accountCreated > thirtyDaysAgo) {
    const embed = new MessageEmbed()
    .setColor('#4b6691')
    .setTitle('Prison warning')
    .setDescription('**مرحبًا تم اكتشاف أن حسابك جديد، لذا تم سجنك.**')
    .setFooter({ text: `حُلم`, iconURL: client.user.displayAvatarURL() })
    .setTimestamp();

  member.send({ embeds: [embed] })
    .catch(console.error);


    const logChannelName = 'log-prison-unprison';
    const logChannel = member.guild.channels.cache.find(channel => channel.name === logChannelName);

    if (logChannel) {
      const logEmbed = new MessageEmbed()
        .setColor('#4b6691')
        .setTitle('Prison')
        .setDescription(`**To:** ${member}\n**By:** ${client.user}\n**Un Prison At:** \`${moment().format('HH:mm')}\`\n\`\`\`Prison: Fake Account\`\`\``)
        .setThumbnail('https://cdn.discordapp.com/attachments/1091536665912299530/1157860838833659985/B1DF7F1C-78BB-480C-BC93-C77AC0CC5231.png?ex=651a256f&is=6518d3ef&hm=6b2145a1536bbd35209f34f01471ca5cec7a2ca7950c5d3e85e0407ec384ad07&')
        .setTimestamp();
      logChannel.send({ embeds: [logEmbed] });
    }

    const prisonRole = member.guild.roles.cache.find(role => role.name === 'prison');
    if (prisonRole) {
      member.roles.add(prisonRole)
        .catch(console.error);
    } else {
      console.error('The role "prison" does not exist in the server');
    }
  }
});

// https://discord.gg/7lm 
// ----------------------------------------------------------------------------------
// https://discord.gg/7lm 

const { MessageSelectMenu } = require('discord.js');
const { Canvas, loadImage, loadFont } = require('../../utils/canvasShim');

client.setMaxListeners(0)
require('events').EventEmitter.defaultMaxListeners = 0;
//const { loadImage, loadFont } = require('../../utils/canvasShim');
const F1eed = loadImage(`${process.cwd()}/image.png`)
loadFont(`./FiraSans-Regular.ttf`, { family: 'FiraSans' });
loadFont(`./Cairo-Regular.ttf`, { family: 'Cairo' });
client.on(`messageCreate`, async function (Message) {
    if (Message.author.bot || !Message.guild) return;

    let evaluation = Data.get(`setevaluation_${Message.guild.id}`)
    if (Message.channel.id != evaluation) return;

        const member = Message.member;
        member.send(`عميلنا العزيز : <@${member.user.id}> ؛\nشكرًا لك علي تقييمك ؛\nنتمني دايمًا  أناله رضاءك ..`);
    
    if (Message.author.bot || !Message.guild) return;
    try {
        async function generateCanvas() {
            let content = Message.content;
            let contentArr = [];
            while (content.length > 45) {
                contentArr.push(content.slice(0, 45));
                content = content.slice(45);
            }
            contentArr.push(content);
            const canvas = new Canvas((await F1eed).width, (await F1eed).height)
                .printImage(await F1eed, 0, 0, (await F1eed).width, (await F1eed).height)
                .printCircularImage(await loadImage((Message.author.avatarURL() + ``).replace(`.webp`, `.png`).replace(`.gif`, `.png`)), 755.80, 258, 35.80, 35.80)
                .setTextAlign(`right`)
                .setColor('#ffffff')
                .setTextFont('25px Cairo')
                .printText(contentArr.join('\n'), 770, 130 )
                .setColor('#ffffff')
                .setTextAlign(`left`)
                .setTextFont('25px FiraSans')
                .printText(Message.author.username, 655, 270)
                .toBuffer();
            return canvas
        }
        let balancCanvas = await generateCanvas();
        await Message.channel.send({ files: [balancCanvas] })
        await Message.delete().catch(() => {return})
    } catch (NeN) {
        if (NeN.message === "ENOENT, No such file or directory 'null'") {
            async function generateCanvas() {
                let content = Message.content;
                let contentArr = [];
                while (content.length > 15) {
                    contentArr.push(content.slice(0, 15));
                    content = content.slice(15);
                }
                contentArr.push(content);
                const canvas = new Canvas((await F1eed).width, (await F1eed).height)
                    .printImage(await F1eed, 0, 0, (await F1eed).width, (await F1eed).height)
                    .printCircularImage(await loadImage((Message.author.avatarURL() + ``).replace(`.webp`, `.png`).replace(`.gif`, `.png`)), 755.80, 258, 35.80, 35.80)
                    .setTextAlign(`right`)
                    .setColor('#ff00f3')
                    .setTextFont('25px Cairo')
                    .printText(contentArr.join('\n'), 770, 130 )
                    .setColor('#ff00f3')
                    .setTextAlign(`left`)
                    .setTextFont('25px FiraSans')
                    .printText(Message.author.username, 655, 270)
                    .toBuffer();
                return canvas
            }
            let balancCanvas = await generateCanvas();
            await Message.channel.send({ files: [balancCanvas] })
            await Message.delete();
        }
    }
})

// https://discord.gg/7lm
// ----------------------------------------------------------------------------------
// https://discord.gg/7lm
 
const axios = require('axios');
client.on('messageCreate', async function (message) {
  const Pro = require('pro.db');
  let image =  Data.get("Line");
  const Channel = Pro.get(`avtchats-[${message.guild.id}]`);
  const Color = await Pro.get(`Guild_Color = ${message.guild.id}`) || '#000000';

  if (!Color || !Channel || message.author.bot || !Channel.includes(message.channel.id)) {
    return;
  }

  let imageUrls = [];
  let isImage = false;
  let isVideo = false;

  if (message.attachments.size > 0) {
    message.attachments.forEach(attachment => {
      const imageUrl = attachment.url;
      const isImageAttachment = attachment.contentType.startsWith('image/');
      const isVideoAttachment = attachment.contentType.startsWith('video/');

      if (isImageAttachment || isVideoAttachment) {
        imageUrls.push({ url: imageUrl, isImage: isImageAttachment, isVideo: isVideoAttachment });
      }
    });
  }

  const content = message.content.trim();
  if (content.startsWith('http') && (content.endsWith('.png') || content.endsWith('.jpg') || content.endsWith('.gif'))) {
    imageUrls.push({ url: content, isImage: true, isVideo: false });
  }

  if (imageUrls.length === 0) {
    return;
  }

  for (const imageUrlData of imageUrls) {
    const { url, isImage, isVideo } = imageUrlData;

    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const imageBuffer = Buffer.from(response.data, 'binary');

    const embed = new MessageEmbed()
      .setImage(`attachment://image.png`)
      .setDescription(`**By: ${message.author}**`)
      .setColor(Color);

    await message.channel.send({
      embeds: [embed],
      files: [{
        attachment: imageBuffer,
        name: 'image.png'
      }]
    }); 

  }   if (image) {
    await message.channel.send({ files: [image] });
  }

  await message.delete();
});


// https://discord.gg/7lm
// ----------------------------------------------------------------------------------
// https://discord.gg/7lm

// const { MessageSelectMenu } = require('discord.js');

client.on('messageCreate', async message => {
  if (!message.content.startsWith(prefix) || message.author.bot) return;
  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();
  if (command === 'link' || command === 'setlinks') {
    let serverName = "serv";
    let avatarName = "avvt";
    let shopName = "desi";

    let serverChannelId = db.get("serverChannel");
    let avatarChannelId = db.get("avatarChannel");
    let shopChannelId = db.get("shopChannel");

    let server = message.guild.channels.cache.get(serverChannelId);
    let avatar = message.guild.channels.cache.get(avatarChannelId);
    let Shop = message.guild.channels.cache.get(shopChannelId);

    if (!server) {
      server = await message.guild.channels.create(serverName);
      db.set("serverChannel", server.id); // Save the server channel ID in the database
    } else if (server.name !== serverName) {
      server.setName(serverName);
    }
    if (!avatar) {
      avatar = await message.guild.channels.create(avatarName);
      db.set("avatarChannel", avatar.id); // Save the avatar channel ID in the database
    } else if (avatar.name !== avatarName) {
      avatar.setName(avatarName);
    }
    if (!Shop) {
      Shop = await message.guild.channels.create(shopName);
      db.set("shopChannel", Shop.id); // Save the shop channel ID in the database
    } else if (Shop.name !== shopName) {
      Shop.setName(shopName);
    }

    let link = args.slice(0).join(' ');
    if (!link.startsWith('https://discord.gg')) {
      return await message.reply('** بارفاق رابط  .**').then(m =>
        setTimeout(() => {
          m.delete();
        }, 20000)
      );
    }
    if (!link)
      return await message.channel.send('**قم بارفاق رابط سيرفرك .**').then(m =>
        setTimeout(() => {
          m.delete();
        }, 20000)
      );
    const guild = await client.guilds.fetch(message.guild.id);
    guild.invites.fetch().then(invites => {
      const row = new MessageActionRow()
        .addComponents(
          new MessageSelectMenu()
            .setCustomId('serverType')
            .setPlaceholder('يرجي إختيار ما يُناسبك .')
            .addOptions([
              {
                label: 'عام',
                description: 'هذا الخيار لشات السيرفرات آلعامة',
                value: '1',
              },
              {
                label: 'آفتار',
                description: 'هذا الخيار لشات سيرفرات الآفتارت',
                value: '2',
              },
              {
                label: 'متجر',
                description: 'هذا الخيار لشات سيرفرات آلمتاجر',
                value: '3',
              },
            
            ]),
        );

      const embed = new MessageEmbed()
        .setTitle('اختار نوع سيرفرك');

      message.channel.send({ embeds: [embed], components: [row] }).then(messages => {
        message.delete();
        const filter = (interaction) => interaction.user.id === message.author.id;
        const collector = message.channel.createMessageComponentCollector({ filter, time: 20000 });

        collector.on('collect', async (interaction) => {
          const content = interaction.values[0];
          const serverChannelId = db.get("serverChannel"); // Retrieve the server channel ID from the database
          const avatarChannelId = db.get("avatarChannel"); // Retrieve the avatar channel ID from the database
          const shopChannelId = db.get("shopChannel"); // Retrieve the shop channel ID from the database

          if (content === '1') {
            const serverChannel = message.guild.channels.cache.get(serverChannelId);
            serverChannel.send(`**${serverName}**\n${link}`);
          }
          if (content === '2') {
            const avatarChannel = message.guild.channels.cache.get(avatarChannelId);
            avatarChannel.send(`**${avatarName}**\n${link}`);
          }
          if (content === '3') {
            const shopChannel = message.guild.channels.cache.get(shopChannelId);
            shopChannel.send(`**${shopName}**\n${link}`);
          }
     
          interaction.deleteReply();
          messages.delete();
        });

        collector.on('end', () => {
          messages.delete();
        });
      });
    });
  }
});


/// 




