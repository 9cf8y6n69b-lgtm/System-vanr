// يحتفظ بآخر رسائل كل عضو (بالذاكرة) عشان نعرضها عند التحذير حتى لو انحذفت
const recent = new Map(); // "guild:user" -> [{id, content, channelName, time, attachments, deleted}]
const owner = new Map();  // messageId -> "guild:user"

function record(message) {
    if (!message.guild || !message.author || message.author.bot) return;

    const key = `${message.guild.id}:${message.author.id}`;
    const list = recent.get(key) || [];

    list.push({
        id: message.id,
        content: message.content || "",
        channelName: message.channel.name || "-",
        time: message.createdTimestamp || Date.now(),
        attachments: message.attachments ? [...message.attachments.values()].map(a => a.name || "file") : [],
        deleted: false
    });

    while (list.length > 15) { owner.delete(list.shift().id); }

    recent.set(key, list);
    owner.set(message.id, key);
}

function markDeleted(messageId) {
    const key = owner.get(messageId);
    if (!key) return;

    const item = (recent.get(key) || []).find(m => m.id === messageId);
    if (item) item.deleted = true;
}

function last(guildId, userId, count = 5) {
    return (recent.get(`${guildId}:${userId}`) || []).slice(-count);
}

module.exports = { record, markDeleted, last };
