// ═══════════════════════════════════════════════
//  Voki • النسخ الاحتياطي
//  - أي تعديل → نسخة (gzip JSON) تنرسل لروم النسخ بعد دقيقتين من آخر تعديل
//  - عند التشغيل: يكمّل أي إعداد ناقص من آخر نسخة (بدون ما يمسح أو يغيّر الجديد)
//  - الاسترجاع = دمج: القديم يرجع، والجديد اللي مو بالنسخة ما ينحذف
// ═══════════════════════════════════════════════
const zlib = require("zlib");
const crypto = require("crypto");
const Pro = require("pro.db");
const persist = require("./persist");

const CHANNEL_ID = process.env.BACKUP_CHANNEL_ID || "1345715711095472280";
const SECRET_KEY = /token|password|mongo|secret/i;
const NOISY = /^(xp|level|lvl|msgs?|messages?|stats?|cooldown|voice_time|vtime|invites?_count|spam)/i;
const DELAY = 2 * 60 * 1000;
const MIN_GAP = 5 * 60 * 1000;
const MAX_BYTES = 24 * 1024 * 1024;

let client = null;
let timer = null;
let dirty = false;
let restoring = false;
let lastHash = null;
let lastSent = 0;
let lastError = null;

const status = () => ({ channel: CHANNEL_ID, lastSent, lastError, dirty });

function entries() {
    const all = typeof Pro.all === "function" ? Pro.all() : [];
    return (all || [])
        .map(i => ({ k: String(i.ID ?? i.id ?? i.key), v: i.data ?? i.value }))
        .filter(i => i.k && i.k !== "undefined" && !SECRET_KEY.test(i.k) && i.v !== undefined);
}

function snapshot() {
    const list = entries();
    const json = JSON.stringify({ app: "voki", v: 1, at: Date.now(), entries: list });
    return { buffer: zlib.gzipSync(Buffer.from(json), { level: 9 }), count: list.length, hash: crypto.createHash("sha1").update(JSON.stringify(list)).digest("hex") };
}

const stamp = () => new Date().toISOString().replace(/[:T]/g, "-").slice(0, 19);

async function channel() {
    if (!client) throw new Error("البوت مو جاهز");
    const ch = await client.channels.fetch(CHANNEL_ID);
    if (!ch || !ch.send) throw new Error("روم النسخ غير موجود أو البوت ما يشوفه");
    return ch;
}

async function send(reason = "تعديل") {
    const snap = snapshot();
    if (snap.buffer.length > MAX_BYTES) throw new Error("حجم النسخة أكبر من حد ديسكورد");
    const ch = await channel();
    const name = `voki-backup-${stamp()}.json.gz`;
    const msg = await ch.send({
        content: `📦 **نسخة احتياطية** • ${reason}\n\`${snap.count}\` إعداد • \`${(snap.buffer.length / 1024).toFixed(1)}KB\` • <t:${Math.floor(Date.now() / 1000)}:R>`,
        files: [{ attachment: snap.buffer, name }]
    });
    lastHash = snap.hash; lastSent = Date.now(); lastError = null; dirty = false;
    return { id: msg.id, name, count: snap.count, size: snap.buffer.length };
}

function schedule() {
    if (timer || !client) return;
    const wait = Math.max(DELAY, MIN_GAP - (Date.now() - lastSent));
    timer = setTimeout(async () => {
        timer = null;
        if (!dirty) return;
        try {
            if (snapshot().hash === lastHash) { dirty = false; return; }
            await send("تعديل تلقائي");
        } catch (e) { lastError = e.message; console.error("[BACKUP]", e.message); dirty = true; }
    }, wait);
}

function touch(key, counter) {
    if (restoring || counter || SECRET_KEY.test(key) || NOISY.test(key)) return;
    dirty = true;
    schedule();
}

async function list(limit = 25) {
    const ch = await channel();
    const msgs = await ch.messages.fetch({ limit: 100 });
    const out = [];
    for (const m of msgs.values()) {
        for (const a of m.attachments.values()) {
            if (/^voki-backup-.*\.json(\.gz)?$/i.test(a.name || "")) out.push({ id: m.id, name: a.name, url: a.url, size: a.size, at: m.createdTimestamp });
        }
    }
    return out.sort((a, b) => b.at - a.at).slice(0, limit);
}

async function download(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`تحميل الملف فشل (${res.status})`);
    return Buffer.from(await res.arrayBuffer());
}

function parse(buffer) {
    let raw = buffer;
    if (raw[0] === 0x1f && raw[1] === 0x8b) raw = zlib.gunzipSync(raw);
    const data = JSON.parse(raw.toString("utf8"));
    if (!data || data.app !== "voki" || !Array.isArray(data.entries)) throw new Error("الملف مو نسخة Voki صحيحة");
    return data;
}

// mode: "merge" = يكتب فوق نفس المفاتيح ويترك الباقي | "fill" = يكمّل الناقص فقط
function restore(buffer, mode = "merge") {
    const data = parse(buffer);
    let applied = 0, skipped = 0;
    restoring = true;
    try {
        for (const { k, v } of data.entries) {
            if (typeof k !== "string" || SECRET_KEY.test(k) || k.includes(".") || k.startsWith("__")) { skipped++; continue; }
            if (mode === "fill" && Pro.get(k) !== undefined) { skipped++; continue; }
            Pro.set(k, v); applied++;
        }
    } finally { restoring = false; }
    try { require("./ticketAdmin").restoreImages(client); } catch {}
    try { require("./welcomeCfg"); } catch {}
    return { applied, skipped, total: data.entries.length, at: data.at };
}

async function restoreFrom(id, mode = "merge") {
    const items = await list(100);
    const item = id ? items.find(i => i.id === id || i.name === id) : items[0];
    if (!item) throw new Error("ما لقيت نسخة");
    return { ...restore(await download(item.url), mode), name: item.name };
}

// عند التشغيل: يكمّل الناقص من آخر نسخة
async function bootRestore() {
    try {
        const items = await list(1);
        if (!items.length) { console.log("[BACKUP] ما فيه نسخ سابقة في الروم."); return; }
        const r = restore(await download(items[0].url), "fill");
        console.log(`[BACKUP] كمّلت ${r.applied} إعداد ناقص من ${items[0].name}`);
        if (r.applied) { dirty = true; }
    } catch (e) { lastError = e.message; console.error("[BACKUP] boot:", e.message); }
}

function start(c) {
    client = c;
    persist.onChange(touch);
    bootRestore().then(() => { lastHash = snapshot().hash; });
}

module.exports = { start, send, list, restore, restoreFrom, download, status, parse, CHANNEL_ID };
