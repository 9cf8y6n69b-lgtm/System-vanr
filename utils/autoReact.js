// Voki • ريأكشن تلقائي: روم -> قائمة إيموجيات (محفوظة بـ pro.db)
const Pro = require("pro.db");

const key = g => `autoreact_${g}`;
const all = g => Pro.get(key(g)) || {};
const get = (g, ch) => all(g)[ch] || [];

function set(g, ch, emojis) {
    const map = all(g);
    if (emojis && emojis.length) map[ch] = emojis; else delete map[ch];
    Pro.set(key(g), map);
}

// يطلع الإيموجيات من نص: يونيكود + مخصصة <:name:id>
function parse(text) {
    const out = [];
    const re = /<a?:\w+:(\d+)>|(\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic})*|[0-9#*]️?⃣)/gu;
    let m;
    while ((m = re.exec(String(text || "")))) {
        const val = m[1] || m[2];
        if (val && !out.includes(val)) out.push(val);
    }
    return out.slice(0, 10);
}

const show = e => (/^\d+$/.test(e) ? `<:e:${e}>` : e);

module.exports = { all, get, set, parse, show };
