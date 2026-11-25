const client = require("../index");
const Cache = require("../utils/messageCache");

client.on("messageCreate", message => Cache.record(message));
client.on("messageDelete", message => Cache.markDeleted(message.id));
client.on("messageDeleteBulk", messages => messages.forEach(m => Cache.markDeleted(m.id)));
