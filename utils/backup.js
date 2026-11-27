// ═══════════════════════════════════════════════
//  Vanr • النسخ الاحتياطي
//  - أي تعديل → نسخة (gzip JSON) تنرسل لروم النسخ بعد دقيقتين من آخر تعديل
//  - عند التشغيل: يكمّل أي إعداد ناقص من آخر نسخة (بدون ما يمسح أو يغيّر الجديد)
//  - الاسترجاع = دمج: القديم يرجع، والجديد اللي مو بالنسخة ما ينحذف
// ═══════════════════════════════════════════════
const fs = require("fs");
const path = require("path");
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
let peak = 0; // أكبر عدد إعدادات شفناه بنسخة (حماية من نسخة فاضية بعد مسح)

// ملفات خارج قاعدة البيانات تنحفظ مع النسخة
const EXTRA_FILES = ["autorole.js", "pointss.json"];

const status = () => ({ channel: CHANNEL_ID, lastSent, lastError, dirty });

function entries() {
    const all = typeof Pro.all === "function" ? Pro.all() : [];
    return (all || [])
        .map(i => ({ k: String(i.ID ?? i.id ?? i.key), v: i.data ?? i.value }))
        .filter(i => i.k && i.k !== "undefined" && !SECRET_KEY.test(i.k) && i.v !== undefined);
}

function snapshot() {
    const list = entries();
    const files = {};
    for (const f of EXTRA_FILES) {
        try { const t = fs.readFileSync(path.join(process.cwd(), f), "utf8"); if (t.length < 2 * 1024 * 1024) files[f] = t; } catch {}
    }
    const json = JSON.stringify({ app: "vanr", v: 2, at: Date.now(), entries: list, files });
    return { buffer: zlib.gzipSync(Buffer.from(json), { level: 9 }), count: list.length, hash: crypto.createHash("sha1").update(JSON.stringify(list) + JSON.stringify(files)).digest("hex") };
}

const stamp = () => new Date().toISOString().replace(/[:T]/g, "-").slice(0, 19);

async function channel() {
    if (!client) throw new Error("البوت مو جاهز");
    let ch = await client.channels.fetch(CHANNEL_ID).catch(() => null);
    if (!ch) {
        // لو الرقم حق شخص (مو روم) نرسل له خاص
        const user = await client.users.fetch(CHANNEL_ID).catch(() => null);
        ch = user ? await user.createDM().catch(() => null) : null;
    }
    if (!ch || !ch.send) throw new Error("ما لقيت الروم/الشخص، أو البوت ما يقدر يرسل له (فعّل الخاص لو شخص)");
    return ch;
}

async function send(reason = "تعديل", force = true) {
    const snap = snapshot();
    if (!force && peak > 20 && snap.count < peak * 0.6) throw new Error(`النسخة التلقائية انلغت: الإعدادات الحالية (${snap.count}) أقل بكثير من آخر نسخة (${peak}). استرجع النسخة أول.`);
    if (snap.buffer.length > MAX_BYTES) throw new Error("حجم النسخة أكبر من حد ديسكورد");
    const ch = await channel();
    const name = `vanr-backup-${stamp()}.json.gz`;
    const msg = await ch.send({
        content: `📦 **نسخة احتياطية** • ${reason}\n\`${snap.count}\` إعداد • \`${(snap.buffer.length / 1024).toFixed(1)}KB\` • <t:${Math.floor(Date.now() / 1000)}:R>`,
        files: [{ attachment: snap.buffer, name }]
    });
    lastHash = snap.hash; lastSent = Date.now(); peak = Math.max(peak, snap.count); lastError = null; dirty = false;
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
            await send("تعديل تلقائي", false);
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
            if (/^(vanr|voki|void)-backup-.*\.json(\.gz)?$/i.test(a.name || "")) out.push({ id: m.id, name: a.name, url: a.url, size: a.size, at: m.createdTimestamp, count: Number((/`(\d+)` إعداد/.exec(m.content || "") || [])[1]) || 0 });
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
    if (!data || !["vanr", "voki", "void"].includes(data.app) || !Array.isArray(data.entries)) throw new Error("الملف مو نسخة Vanr صحيحة");
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
            if (mode === "fill" && Pro.get(k) != null) { skipped++; continue; }
            Pro.set(k, v); applied++;
        }
    } finally { restoring = false; }
    let filesRestored = 0;
    for (const [f, text] of Object.entries(data.files || {})) {
        if (!EXTRA_FILES.includes(f) || typeof text !== "string") continue;
        try {
            const fp = path.join(process.cwd(), f);
            const cur = fs.existsSync(fp) ? fs.readFileSync(fp, "utf8").trim() : "";
            if (mode === "merge" || !cur || cur === "{}" || cur === "[]") { fs.writeFileSync(fp, text); filesRestored++; }
        } catch {}
    }
    try { require("./ticketAdmin").restoreImages(client); } catch {}
    return { applied, skipped, total: data.entries.length, at: data.at, files: filesRestored };
}

async function restoreFrom(id, mode = "merge") {
    const items = await list(100);
    const item = id ? items.find(i => i.id === id || i.name === id) : items[0];
    if (!item) throw new Error("ما لقيت نسخة");
    return { ...restore(await download(item.url), mode), name: item.name };
}

// استرجاع شامل: يدمج كل النسخ (الأقدم أول ثم الأحدث فالأحدث يغلب) — يرجع كل شيء كان موجود بأي نسخة
async function restoreAll(limit = 30) {
    const items = (await list(100)).slice(0, limit).reverse();
    if (!items.length) throw new Error("ما لقيت نسخ");
    const keys = new Set();
    let files = 0, used = 0;
    restoring = true;
    try {
        for (const it of items) {
            try {
                const data = parse(await download(it.url));
                for (const { k, v } of data.entries) {
                    if (typeof k !== "string" || SECRET_KEY.test(k) || k.includes(".") || k.startsWith("__")) continue;
                    Pro.set(k, v); keys.add(k);
                }
                for (const [f, text] of Object.entries(data.files || {})) {
                    if (EXTRA_FILES.includes(f) && typeof text === "string") { try { fs.writeFileSync(path.join(process.cwd(), f), text); files++; } catch {} }
                }
                used++;
            } catch (e) { console.error("[BACKUP] skip", it.name, e.message); }
        }
    } finally { restoring = false; }
    try { require("./ticketAdmin").restoreImages(client); } catch {}
    dirty = true; schedule();
    return { applied: keys.size, backups: used, files, name: `${used} نسخة` };
}

// عند التشغيل: يكمّل الناقص من النسخ (الأحدث يملي أول والأقدم يكمّل الناقص فقط)
async function bootRestore() {
    try {
        const items = await list(15);
        if (!items.length) { console.log("[BACKUP] ما فيه نسخ سابقة في الروم."); return; }
        peak = Math.max(0, ...items.slice(0, 10).map(i => i.count || 0));
        let total = 0;
        for (const it of items) {
            try { total += restore(await download(it.url), "fill").applied; } catch (e) { console.error("[BACKUP] skip", it.name, e.message); }
        }
        console.log(`[BACKUP] كمّلت ${total} إعداد ناقص من ${items.length} نسخة`);
        if (total) { dirty = true; schedule(); }
    } catch (e) { lastError = e.message; console.error("[BACKUP] boot:", e.message); }
}

function start(c) {
    client = c;
    persist.onChange(touch);
    bootRestore().then(() => { lastHash = snapshot().hash; });
}

module.exports = { start, send, list, restore, restoreFrom, restoreAll, download, status, parse, CHANNEL_ID };
