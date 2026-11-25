// ═══════════════════════════════════════════════
//  Vanr • حفظ دائم للبيانات (pro.db ⇄ MongoDB)
//  السبب: Render يمسح ملفات البوت مع كل Deploy، فكل إعداداتك (الترحيب، اللوقات، XP...)
//  كانت تضيع. الحين كل كتابة في pro.db تنحفظ في MongoDB، وعند التشغيل ترجع كلها.
//  لازم MONGO_URI في Environment (MongoDB Atlas المجاني يكفي).
// ═══════════════════════════════════════════════
const Pro = require("pro.db");

const WRITERS = ["set", "delete", "push", "add", "subtract", "pull", "unpush", "multiply", "divide", "math", "update"];
const pending = new Set();
let Model = null;
let timer = null;
let connected = false;

const topKey = key => String(key).split(".")[0];

async function flush() {
    if (!Model || !pending.size) return;

    const keys = [...pending];
    pending.clear();

    const ops = keys.map(key => {
        const value = Pro.get(key);

        return value === undefined || value === null
            ? { deleteOne: { filter: { _id: key } } }
            : { replaceOne: { filter: { _id: key }, replacement: { value }, upsert: true } };
    });

    try {
        await Model.bulkWrite(ops, { ordered: false });
    } catch (error) {
        keys.forEach(key => pending.add(key)); // نعيد المحاولة في الدورة الجاية
        console.error("[PERSIST] save error:", error.message);
    }
}

const listeners = [];
const onChange = fn => listeners.push(fn);
let counterOp = false;

function queue(key) {
    for (const fn of listeners) { try { fn(topKey(key), counterOp); } catch {} }
    if (!Model) return;
    pending.add(topKey(key));
    if (!timer) timer = setTimeout(() => { timer = null; flush(); }, 1500);
}

function patchWriters() {
    for (const name of WRITERS) {
        const original = Pro[name];
        if (typeof original !== "function") continue;

        try {
            Pro[name] = function (key, ...rest) {
                counterOp = ["add", "subtract", "multiply", "divide", "math"].includes(name);
                const result = original.call(Pro, key, ...rest);
                if (key !== undefined && key !== null) queue(key);
                return result;
            };
        } catch {}
    }
}

function localEntries() {
    try {
        const all = typeof Pro.all === "function" ? Pro.all() : [];
        return (all || [])
            .map(item => ({ key: item.ID ?? item.id ?? item.key, value: item.data ?? item.value }))
            .filter(item => item.key !== undefined);
    } catch {
        return [];
    }
}

async function init(uri) {
    patchWriters();
    if (!uri) {
        console.warn(
            "\n⚠️  [PERSIST] MONGO_URI غير محدد — الإعدادات مؤقتة وتنمسح مع كل Deploy!\n" +
            "    سوّ قاعدة MongoDB Atlas مجانية وحط رابطها في Render ← Environment باسم MONGO_URI\n"
        );
        return false;
    }

    const mongoose = require("mongoose");
    await mongoose.connect(uri);
    connected = true;
    console.log("[MONGO] Connected");

    Model = mongoose.models.VoidKV || mongoose.model(
        "VoidKV",
        new mongoose.Schema({ _id: String, value: mongoose.Schema.Types.Mixed }, { versionKey: false, minimize: false, collection: "void_kv" })
    );

    const docs = await Model.find({}).lean();

    if (docs.length) {
        for (const doc of docs) Pro.set(doc._id, doc.value);
        console.log(`[PERSIST] رجّعت ${docs.length} إعداد من قاعدة البيانات.`);
    } else {
        const local = localEntries();
        if (local.length) {
            await Model.insertMany(local.map(item => ({ _id: String(item.key), value: item.value })), { ordered: false }).catch(() => {});
            console.log(`[PERSIST] رفعت ${local.length} إعداد محلي لقاعدة البيانات.`);
        }
    }

    const shutdown = async () => { await flush(); process.exit(0); };
    process.once("SIGTERM", shutdown);
    process.once("SIGINT", shutdown);

    return true;
}

module.exports = { init, flush, onChange, isConnected: () => connected };
