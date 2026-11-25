// Voki • الرولات الشخصية: كل عضو له رول واحد يعدله بنفسه
const Pro = require("pro.db");

const ownKey = (g, u) => `myrole = ${g} = ${u}`;   // نفس المفتاح القديم عشان يتوافق
const getRoleId = (g, u) => Pro.get(ownKey(g, u)) || null;
const setRole = (g, u, roleId) => Pro.set(ownKey(g, u), roleId);
const clear = (g, u) => Pro.delete(ownKey(g, u));
const roomKey = g => `role_room = ${g}`;
const getRoom = g => Pro.get(roomKey(g)) || null;
const setRoom = (g, ch) => ch ? Pro.set(roomKey(g), ch) : Pro.delete(roomKey(g));

module.exports = { getRoleId, setRole, clear, getRoom, setRoom };
