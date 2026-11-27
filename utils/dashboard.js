// ═══════════════════════════════════════════════
//  Vanr • داشبورد ويب (نفس سيرفر Render)
//  يفتح على رابط الخدمة نفسه. لازم تضيف في Render > Environment:
//      DASH_PASSWORD = كلمة سر قوية
//  بدونها الداشبورد مقفل.
// ═══════════════════════════════════════════════
const crypto = require("crypto");
const Pro = require("pro.db");

const LOG_TYPES = require(`${process.cwd()}/Extras/logTypes`);
const CC = require("./cmdConfig");
const F = require("./filters");
const SC = require("./shortcuts");
const AR = require("./autoReact");
const TA = require("./ticketAdmin");
const P = require("./protection");
const PR = require("./personalRoles");
const lazy = name => { try { return require(name); } catch { return null; } };
const WC = lazy("./welcomeCfg");

const fs = require("fs");
const path = require("path");
const CLIENT_JS = fs.readFileSync(path.join(__dirname, "dashboardClient.js"), "utf8").replace(/<\/script>/gi, "<\\/script>");
const PASSWORD = process.env.DASH_PASSWORD || "";
const SECRET = crypto.createHash("sha256").update(`${PASSWORD}|${process.env.TOKEN || ""}|vanr`).digest();
const TTL = 12 * 3600 * 1000;
const attempts = new Map();

const sign = v => crypto.createHmac("sha256", SECRET).update(v).digest("hex");
const safeEq = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };

function makeSession() { const exp = Date.now() + TTL; return `${exp}.${sign(String(exp))}`; }
function validSession(cookie) {
    const m = /(?:^|;\s*)vanr_sess=([^;]+)/.exec(cookie || "");
    if (!m) return false;
    const [exp, sig] = m[1].split(".");
    return Number(exp) > Date.now() && safeEq(sig || "", sign(String(exp)));
}
const csrfOf = cookie => sign(`csrf|${(/(?:^|;\s*)vanr_sess=([^;]+)/.exec(cookie || "") || [])[1] || ""}`);

const json = (res, code, data) => { res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }); res.end(JSON.stringify(data)); };

function readBody(req) {
    return new Promise((resolve, reject) => {
        let size = 0; const chunks = [];
        req.on("data", c => { size += c.length; if (size > 7 * 1024 * 1024) { reject(new Error("too large")); req.destroy(); } else chunks.push(c); });
        req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
        req.on("error", reject);
    });
}

const PUNISH_KEYS = Object.keys(F.PUNISH);
const cleanPunish = p => (PUNISH_KEYS.includes(p) ? p : "delete");
const idOk = v => /^\d{15,25}$/.test(String(v));

function xpData(guild) {
    const XP = lazy("./xp");
    if (!XP) return null;
    const top = XP.leaderboard(guild.id, "total").slice(0, 15).map(i => ({ id: i.userId, name: (guild.members.cache.get(i.userId) || {}).displayName || i.userId, level: XP.levelInfo(i.value).level, xp: i.value }));
    return { enabled: XP.isEnabled(guild.id), channelId: XP.getLevelChannelId(guild.id), roles: XP.getRoleRewards(guild.id), top };
}

const allKeys = prefix => (typeof Pro.all === "function" ? Pro.all() : []).filter(x => String(x.ID).startsWith(prefix)).map(x => ({ id: x.ID, data: x.data }));
const str = (v, n) => String(v === undefined || v === null ? "" : v).slice(0, n);
const bool = v => !!v;

function guildData(client, guild) {
    const lg = Pro.get(`lg_cfg_${guild.id}`) || {};
    const g = guild.id;
    return {
        id: g, name: guild.name,
        overview: (() => {
            const ch = guild.channels.cache, mem = guild.members.cache;
            return {
                members: guild.memberCount, humans: mem.filter(x => !x.user.bot).size, bots: mem.filter(x => x.user.bot).size,
                online: guild.presences ? guild.presences.cache.filter(p => p.status && p.status !== "offline").size : 0,
                channels: ch.size, text: ch.filter(c => c.type === "GUILD_TEXT").size, voice: ch.filter(c => c.type === "GUILD_VOICE" || c.type === "GUILD_STAGE_VOICE").size,
                inVoice: ch.filter(c => c.type === "GUILD_VOICE" || c.type === "GUILD_STAGE_VOICE").reduce((a, c) => a + c.members.size, 0),
                categories: ch.filter(c => c.type === "GUILD_CATEGORY").size, roles: guild.roles.cache.size, emojis: guild.emojis.cache.size,
                boosts: guild.premiumSubscriptionCount || 0, boostTier: guild.premiumTier, created: guild.createdTimestamp, icon: guild.iconURL({ size: 128, dynamic: true }),
                commands: client.commands.size, ping: Math.round((client.ws && client.ws.ping) || 0), uptime: Math.round(process.uptime()),
                memory: Math.round(process.memoryUsage().rss / 1048576), servers: client.guilds.cache.size
            };
        })(),
        channels: guild.channels.cache.filter(c => c.isText && c.isText() && c.type !== "GUILD_NEWS_THREAD").map(c => ({ id: c.id, name: c.name })),
        categories: guild.channels.cache.filter(c => c.type === "GUILD_CATEGORY").map(c => ({ id: c.id, name: c.name })),
        roles: guild.roles.cache.filter(r => r.id !== guild.id).map(r => ({ id: r.id, name: r.name })),
        logTypes: LOG_TYPES.map(t => ({ key: t.key, label: t.label, emoji: t.emoji })),
        logs: lg.types || {},
        punish: F.PUNISH,
        filters: F.get(g),
        welcome: WC ? WC.get(g) : null,
        welcomeTpl: (() => { const t = Pro.get(`welcome_system_${g}`); return t && t.template ? { has: true, circle: t.circle || { x: 0, y: 0, radius: 0, none: true }, v: String(t.template.length) } : { has: false }; })(),
        ticket: TA.load(g),
        xp: xpData(guild),
        protection: {
            features: Object.entries(P.FEATURES).map(([key, f]) => ({ key, label: f.label, on: !!f.get(g) })),
            limit: P.getLimit(g), window: P.getWindowSec(g), raidAction: P.getRaidAction(g), joinDays: P.getJoinDays(g),
            wanti: Pro.get(`wanti_list = ${g}`) || [], aprot: Pro.get(`aprot_list = ${g}`) || []
        },
        misc: { roleRoom: PR.getRoom(g), securityLog: Pro.get(`security_log = ${g}`) || null },
        commands: [...client.commands.values()].map(c => ({ name: c.name, dir: c.directory || "General", desc: c.description || "", cfg: CC.get(g, c.name) })).sort((a, b) => a.name.localeCompare(b.name)),
        cmdGlobal: CC.getGlobal(g),
        shortcuts: SC.all(g),
        autoreact: AR.all(g)
    };
}

const SECRET_KEY = /token|password|mongo|secret/i;

async function api(client, req, res, url) {
    if (req.method !== "GET" && (req.headers["x-csrf"] !== csrfOf(req.headers.cookie) || !String(req.headers["content-type"] || "").includes("application/json"))) {
        return json(res, 403, { error: "csrf" });
    }

    if (url.pathname === "/api/guilds") return json(res, 200, { csrf: csrfOf(req.headers.cookie), guilds: [...client.guilds.cache.values()].map(g => ({ id: g.id, name: g.name })) });

    if (url.pathname.startsWith("/api/backup")) {
        const B = require("./backup");
        try {
            if (req.method === "GET") return json(res, 200, { status: B.status(), items: await B.list(25).catch(e => { return { error: e.message }; }) });
            const body = JSON.parse((await readBody(req)) || "{}");
            if (url.pathname === "/api/backup/now") return json(res, 200, { ok: true, ...(await B.send("يدوي من الداشبورد")) });
            if (url.pathname === "/api/backup/restore") {
                const r = body.id ? await B.restoreFrom(String(body.id), "merge") : await B.restoreAll();
                return json(res, 200, { ok: true, ...r });
            }
            if (url.pathname === "/api/backup/upload") {
                const b64 = String(body.data || "").replace(/^data:[^,]*,/, "");
                const r = B.restore(Buffer.from(b64, "base64"), "merge");
                return json(res, 200, { ok: true, ...r });
            }
        } catch (e) { return json(res, 400, { error: e.message }); }
        return json(res, 404, { error: "not found" });
    }

    const m = /^\/api\/guild\/(\d+)(?:\/(\w+))?$/.exec(url.pathname);
    if (!m) return json(res, 404, { error: "not found" });

    const guild = client.guilds.cache.get(m[1]);
    if (!guild) return json(res, 404, { error: "guild" });
    if (req.method === "GET" && !m[2]) return json(res, 200, guildData(client, guild));

    if (req.method === "GET" && m[2] === "welcomeimg") {
        const t = Pro.get(`welcome_system_${guild.id}`);
        if (!t || !t.template) { res.writeHead(404); return res.end(); }
        const buf = Buffer.from(t.template, "base64");
        const type = buf[0] === 0xff ? "image/jpeg" : buf.slice(0, 4).toString() === "RIFF" ? "image/webp" : "image/png";
        res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-store" });
        return res.end(buf);
    }

    if (req.method === "GET" && m[2] === "members") {
        const q = (url.searchParams.get("q") || "").trim().slice(0, 32);
        if (!q) return json(res, 200, []);
        const found = /^\d{15,25}$/.test(q) ? [await guild.members.fetch(q).catch(() => null)].filter(Boolean) : [...(await guild.members.fetch({ query: q, limit: 10 }).catch(() => new Map())).values()];
        return json(res, 200, found.map(x => ({ id: x.id, tag: x.user.tag, name: x.displayName })));
    }

    if (req.method === "GET" && m[2] === "raw") {
        const q = (url.searchParams.get("q") || guild.id).slice(0, 80);
        const k = url.searchParams.get("k");
        if (k) {
            if (SECRET_KEY.test(k)) return json(res, 403, { error: "hidden" });
            return json(res, 200, { key: k, value: Pro.get(k) });
        }
        const all = (typeof Pro.all === "function" ? Pro.all() : []).map(x => x.ID || x.id).filter(Boolean);
        return json(res, 200, all.filter(key => key.includes(q) && !SECRET_KEY.test(key)).slice(0, 300));
    }

    const body = JSON.parse((await readBody(req)) || "{}");
    const chOk = id => id === null || (idOk(id) && guild.channels.cache.has(id));

    switch (m[2]) {
        case "logs": {
            if (!LOG_TYPES.some(t => t.key === body.key) || !chOk(body.channelId)) return json(res, 400, { error: "bad" });
            const c = Pro.get(`lg_cfg_${guild.id}`) || {}; c.types = c.types || {};
            if (body.channelId) c.types[body.key] = body.channelId; else delete c.types[body.key];
            Pro.set(`lg_cfg_${guild.id}`, c);
            return json(res, 200, { ok: true });
        }
        case "filters": {
            const cur = F.get(guild.id), b = body || {};
            cur.words.enabled = !!(b.words && b.words.enabled);
            cur.words.list = [...new Set(((b.words && b.words.list) || []).map(w => String(w).trim().slice(0, 40)).filter(Boolean))].slice(0, 500);
            cur.words.punish = [0, 1, 2].map(i => cleanPunish(b.words && b.words.punish && b.words.punish[i]));
            for (const k of ["spam", "invites", "links"]) { cur[k].enabled = !!(b[k] && b[k].enabled); cur[k].punish = cleanPunish(b[k] && b[k].punish); }
            cur.spam.count = Math.min(10, Math.max(2, Number(b.spam && b.spam.count) || 3));
            cur.spam.seconds = Math.min(120, Math.max(5, Number(b.spam && b.spam.seconds) || 20));
            cur.links.allow = [...new Set(((b.links && b.links.allow) || []).map(d => String(d).toLowerCase().trim().slice(0, 80)).filter(Boolean))].slice(0, 100);
            cur.exemptRoles = ((b.exemptRoles) || []).filter(r => guild.roles.cache.has(r)).slice(0, 25);
            F.save(guild.id, cur);
            return json(res, 200, { ok: true });
        }
        case "command": {
            if (!client.commands.has(body.name)) return json(res, 400, { error: "bad" });
            const aliases = [...new Set((body.aliases || []).map(a => String(a).toLowerCase().trim()).filter(a => a && a.length <= 30 && !CC.taken(client, guild.id, a, body.name)))].slice(0, 10);
            CC.set(guild.id, body.name, {
                disabled: !!body.disabled, aliases,
                roleIds: (Array.isArray(body.roleIds) ? body.roleIds : []).filter(r => idOk(r) && guild.roles.cache.has(r)).slice(0, 25),
                channelId: body.channelId && chOk(body.channelId) ? body.channelId : null
            });
            return json(res, 200, { ok: true });
        }
        case "cmdglobal": {
            CC.setGlobal(guild.id, (Array.isArray(body.roleIds) ? body.roleIds : []).filter(r => idOk(r) && guild.roles.cache.has(r)).slice(0, 25));
            return json(res, 200, { ok: true });
        }
        case "shortcut": {
            const word = String(body.word || "").toLowerCase().trim();
            if (!word || /\s/.test(word) || client.commands.has(word)) return json(res, 400, { error: "bad word" });
            if (body.remove) SC.remove(guild.id, word);
            else if (String(body.full || "").trim()) SC.set(guild.id, word, String(body.full).slice(0, 200));
            else return json(res, 400, { error: "bad" });
            return json(res, 200, { ok: true });
        }
        case "welcome": {
            if (!WC) return json(res, 500, { error: "welcome unavailable" });
            const b = body, cur = {};
            cur.enabled = !!b.enabled;
            if (b.channelId !== undefined) cur.channelId = chOk(b.channelId) ? b.channelId : null;
            cur.mode = ["embed", "image", "both", "text"].includes(b.mode) ? b.mode : "both";
            cur.text = String(b.text || "").slice(0, 2000);
            cur.title = String(b.title || "").slice(0, 256);
            cur.footer = String(b.footer || "").slice(0, 256);
            cur.color = /^#[0-9a-f]{6}$/i.test(b.color) ? b.color : "#2b2d31";
            for (const k of ["avatar", "name", "mention", "inviter", "count", "imgAvatar", "imgName"]) cur[k] = !!b[k];
            cur.deleteAfter = Math.min(3600, Math.max(0, Number(b.deleteAfter) || 0));
            cur.roleId = b.roleId && guild.roles.cache.has(b.roleId) ? b.roleId : null;
            WC.set(guild.id, cur);
            return json(res, 200, { ok: true });
        }
        case "ticket": {
            const b = body, cur = TA.load(guild.id);
            for (const k of ["panelChannelId", "requestChannelId"]) cur[k] = chOk(b[k]) ? b[k] : null;
            cur.ticketCategoryId = b.ticketCategoryId && guild.channels.cache.has(b.ticketCategoryId) ? b.ticketCategoryId : null;
            cur.reviewerRoleIds = (b.reviewerRoleIds || []).filter(r => guild.roles.cache.has(r)).slice(0, 25);
            cur.categories = (b.categories || []).filter(c => c && String(c.name || "").trim()).slice(0, 25).map((c, i) => ({
                id: String(c.id || `cat_${Date.now().toString(36)}${i}`).slice(0, 40),
                name: String(c.name).slice(0, 80), description: String(c.description || "").slice(0, 100),
                emoji: TA.cleanEmoji(c.emoji), roleId: c.roleId && guild.roles.cache.has(c.roleId) ? c.roleId : null
            }));
            cur.panelMode = b.panelMode === "image" ? "image" : "embed";
            cur.transferSections = (Array.isArray(b.transferSections) ? b.transferSections : []).slice(0, 25).map((x, i) => ({
                id: String((x && x.id) || `s${Date.now().toString(36)}${i}`).replace(/[^\w]/g, "").slice(0, 30) || `s${i}`,
                name: String((x && x.name) || "").trim().slice(0, 80),
                roleIds: (Array.isArray(x && x.roleIds) ? x.roleIds : []).filter(r => guild.roles.cache.has(r)).slice(0, 10)
            })).filter(x => x.name && x.roleIds.length);
            for (const k of ["panelText", "requestText", "ticketText", "acceptedText", "pointText"]) cur[k] = String(b[k] || "").slice(0, 2000);
            TA.save(guild.id, cur);
            return json(res, 200, { ok: true });
        }
        case "welcomedefault": {
            const V = require("./vanr"), f = path.join(V.DESIGNS_DIR, "welcome.png");
            if (!fs.existsSync(f)) return json(res, 404, { error: "no design" });
            const key = `welcome_system_${guild.id}`, cur = Pro.get(key) || {};
            cur.template = fs.readFileSync(f).toString("base64"); cur.fileName = "vanr-welcome.png"; cur.circle = { ...V.WELCOME_CIRCLE };
            Pro.set(key, cur);
            if (WC) WC.set(guild.id, { imgAvatar: true });
            return json(res, 200, { ok: true });
        }
        case "welcomeimg": {
            const key = `welcome_system_${guild.id}`;
            const cur = Pro.get(key) || {};
            if (body.remove) { delete cur.template; delete cur.circle; delete cur.fileName; Pro.set(key, cur); return json(res, 200, { ok: true }); }

            if (body.image) {
                const mm = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(body.image));
                if (!mm || mm[2].length > 4 * 1024 * 1024 * 1.4) return json(res, 400, { error: "صورة غير صالحة أو أكبر من 4MB" });
                cur.template = mm[2];
                cur.fileName = `welcome-template.${mm[1] === "jpeg" ? "jpg" : mm[1]}`;
            }
            if (!cur.template) return json(res, 400, { error: "ارفع صورة أول" });

            const c = body.circle || {}, num = v => Math.min(10000, Math.max(0, Math.round(Number(v) || 0)));
            cur.circle = c.none ? { x: 0, y: 0, radius: 0, none: true } : { x: num(c.x), y: num(c.y), radius: Math.max(10, num(c.radius)) };
            Pro.set(key, cur);
            if (WC) WC.set(guild.id, { imgAvatar: !cur.circle.none });
            return json(res, 200, { ok: true });
        }
        case "ticketpanel": {
            const cur = TA.load(guild.id), target = guild.channels.cache.get(cur.panelChannelId);
            if (!target || !cur.categories.length) return json(res, 400, { error: "حدد روم اللوحة وأضف قسم أول" });
            await target.send(TA.buildPanel(guild, cur));
            return json(res, 200, { ok: true });
        }
        case "xp": {
            Pro.set(`xp_disabled = ${guild.id}`, body.enabled ? false : true);
            if (chOk(body.channelId) && body.channelId) Pro.set(`xp_channel = ${guild.id}`, body.channelId); else Pro.delete(`xp_channel = ${guild.id}`);
            const roles = (body.roles || []).filter(r => guild.roles.cache.has(r.roleId) && Number(r.level) >= 1).map(r => ({ level: Math.min(1000, Number(r.level)), roleId: r.roleId })).slice(0, 50);
            Pro.set(`xp_roles = ${guild.id}`, roles);
            return json(res, 200, { ok: true });
        }
        case "xpreset": {
            const XP = lazy("./xp");
            if (!XP || !idOk(body.userId)) return json(res, 400, { error: "bad" });
            XP.resetUser(guild.id, body.userId);
            return json(res, 200, { ok: true });
        }
        case "protection": {
            for (const [key, on] of Object.entries(body.features || {})) if (P.FEATURES[key]) P.setOn(guild.id, key, !!on);
            const num = (v, lo, hi, d) => Math.min(hi, Math.max(lo, Number(v) || d));
            Pro.set(`security_limit = ${guild.id}`, num(body.limit, 1, 50, 5));
            Pro.set(`sloprot = ${guild.id}`, num(body.window, 5, 3600, 60));
            Pro.set(`rjoin_days = ${guild.id}`, num(body.joinDays, 1, 365, 30));
            if (["prison", "kick", "ban"].includes(body.raidAction)) Pro.set(`setrjoin = ${guild.id}`, body.raidAction);
            for (const [k, key] of [["wanti", "wanti_list"], ["aprot", "aprot_list"]]) {
                if (Array.isArray(body[k])) Pro.set(`${key} = ${guild.id}`, [...new Set(body[k].map(String).filter(idOk))].slice(0, 100));
            }
            return json(res, 200, { ok: true });
        }
        case "misc": {
            if (body.roleRoom !== undefined) PR.setRoom(guild.id, chOk(body.roleRoom) ? body.roleRoom : null);
            if (body.securityLog !== undefined) { if (body.securityLog && chOk(body.securityLog)) Pro.set(`security_log = ${guild.id}`, body.securityLog); else Pro.delete(`security_log = ${guild.id}`); }
            return json(res, 200, { ok: true });
        }
        case "member": {
            if (!idOk(body.userId)) return json(res, 400, { error: "ID غلط" });
            const reason = `Vanr Dashboard: ${String(body.reason || "").slice(0, 150) || "بدون سبب"}`;
            const mem = await guild.members.fetch(body.userId).catch(() => null);
            try {
                switch (body.action) {
                    case "timeout": if (!mem) throw new Error("العضو مو بالسيرفر"); await mem.timeout(Math.min(40320, Math.max(1, Number(body.minutes) || 10)) * 60000, reason); break;
                    case "untimeout": if (!mem) throw new Error("العضو مو بالسيرفر"); await mem.timeout(null, reason); break;
                    case "kick": if (!mem) throw new Error("العضو مو بالسيرفر"); await mem.kick(reason); break;
                    case "ban": await guild.members.ban(body.userId, { reason }); break;
                    case "unban": await guild.members.unban(body.userId, reason); break;
                    case "addrole": case "removerole": {
                        const role = guild.roles.cache.get(body.roleId);
                        if (!mem || !role) throw new Error("العضو أو الرتبة غير موجودة");
                        await (body.action === "addrole" ? mem.roles.add(role, reason) : mem.roles.remove(role, reason));
                        break;
                    }
                    default: return json(res, 400, { error: "bad action" });
                }
            } catch (error) { return json(res, 200, { ok: false, error: String(error.message).slice(0, 200) }); }
            return json(res, 200, { ok: true });
        }
        case "send": {
            const ch = guild.channels.cache.get(body.channelId);
            if (!ch || !ch.isText()) return json(res, 400, { error: "الروم غلط" });
            const payload = { allowedMentions: { parse: ["users", "roles"] } };
            const text = String(body.content || "").slice(0, 2000);
            if (text) payload.content = text;
            const e = body.embed || {};
            if (e.title || e.description || e.image) {
                const { MessageEmbed } = require("discord.js");
                const emb = new MessageEmbed().setColor(/^#[0-9a-f]{6}$/i.test(e.color) ? e.color : "#2b2d31");
                if (e.title) emb.setTitle(String(e.title).slice(0, 256));
                if (e.description) emb.setDescription(String(e.description).slice(0, 4000));
                if (/^https:\/\//.test(e.image || "")) emb.setImage(e.image);
                payload.embeds = [emb];
            }
            if (!payload.content && !payload.embeds) return json(res, 400, { error: "اكتب شي" });
            await ch.send(payload);
            return json(res, 200, { ok: true });
        }
        case "rawset": {
            const k = String(body.key || "");
            if (!k || SECRET_KEY.test(k)) return json(res, 400, { error: "bad key" });
            if (body.delete) Pro.delete(k); else Pro.set(k, body.value);
            return json(res, 200, { ok: true });
        }
        case "prole": {
            if ("room" in body) { if (!chOk(body.room)) return json(res, 400, { error: "bad" }); PR.setRoom(guild.id, body.room || null); }
            if (body.deleteUser && idOk(body.deleteUser)) {
                const rid = PR.getRoleId(guild.id, body.deleteUser), role = rid && guild.roles.cache.get(rid);
                if (role) await role.delete("Vanr dashboard").catch(() => {});
                PR.clear(guild.id, body.deleteUser);
            }
            return json(res, 200, { ok: true });
        }
        case "warns": {
            if (!idOk(body.userId)) return json(res, 400, { error: "bad id" });
            if (body.reset) Pro.set(`warns_${body.userId}`, 0);
            return json(res, 200, { warns: Number(Pro.get(`warns_${body.userId}`)) || 0 });
        }
        case "autoreact": {
            if (!idOk(body.channelId) || !chOk(body.channelId)) return json(res, 400, { error: "bad" });
            AR.set(guild.id, body.channelId, AR.parse((body.emojis || []).join(" ")));
            return json(res, 200, { ok: true });
        }
    }
    return json(res, 404, { error: "not found" });
}

function handler(client) {
    return async (req, res) => {
        try {
            const url = new URL(req.url, "http://x");

            // صحة الخدمة (Render)
            if (url.pathname === "/health") { res.writeHead(200); return res.end("ok"); }

            if (!PASSWORD) {
                res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
                return res.end("<meta charset=utf-8><body style='font-family:sans-serif;background:#111;color:#eee;padding:40px'>Vanr bot is running.<br>للداشبورد: أضف DASH_PASSWORD في Environment على Render.");
            }

            if (url.pathname === "/login" && req.method === "POST") {
                const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
                const a = attempts.get(ip) || { n: 0, t: Date.now() };
                if (Date.now() - a.t > 10 * 60 * 1000) { a.n = 0; a.t = Date.now(); }
                if (a.n >= 5) { res.writeHead(429); return res.end("too many attempts"); }

                const pass = new URLSearchParams(await readBody(req)).get("password") || "";
                if (safeEq(pass, PASSWORD)) {
                    attempts.delete(ip);
                    res.writeHead(302, { "Set-Cookie": `vanr_sess=${makeSession()}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${TTL / 1000}`, Location: "/" });
                    return res.end();
                }
                a.n++; attempts.set(ip, a);
                res.writeHead(302, { Location: "/?e=1" });
                return res.end();
            }

            if (url.pathname === "/logout") {
                res.writeHead(302, { "Set-Cookie": "vanr_sess=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0", Location: "/" });
                return res.end();
            }

            const authed = validSession(req.headers.cookie);

            if (url.pathname.startsWith("/api/")) {
                if (!authed) return json(res, 401, { error: "auth" });
                return await api(client, req, res, url);
            }

            res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
            return res.end(authed ? PAGE : LOGIN(url.searchParams.get("e")));
        } catch (error) {
            console.error("[DASH]", error.message);
            if (!res.headersSent) json(res, 500, { error: "server" });
        }
    };
}

const CSS = `:root{--bg:#0e0f11;--card:#17181b;--line:#2a2c31;--tx:#eee;--mu:#9aa0a8;--ac:#f5b942}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--tx);font-family:system-ui,"Segoe UI",Tahoma,sans-serif}a{color:var(--ac)}input,select,textarea,button{font:inherit;color:var(--tx);background:#1f2125;border:1px solid var(--line);border-radius:8px;padding:8px 10px}button{cursor:pointer;background:var(--ac);color:#111;border:0;font-weight:700}button.s{background:#2a2c31;color:var(--tx)}button.d{background:#e74c3c;color:#fff}`;

const LOGIN = err => `<!doctype html><html dir=rtl lang=ar><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>Vanr Dashboard</title><style>${CSS}body{display:grid;place-items:center;min-height:100vh}form{background:var(--card);padding:28px;border-radius:16px;border:1px solid var(--line);display:grid;gap:12px;width:min(92vw,340px)}h1{margin:0;color:var(--ac)}</style><form method=post action=/login><h1>Vanr</h1><div style="color:var(--mu)">لوحة التحكم</div><input type=password name=password placeholder="كلمة السر" autofocus required>${err ? "<div style='color:#e74c3c'>كلمة السر غلط</div>" : ""}<button>دخول</button></form></html>`;

const PAGE = `<!doctype html><html dir=rtl lang=ar><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>Vanr Dashboard</title><style>${CSS}
header{display:flex;gap:12px;align-items:center;padding:12px 18px;border-bottom:1px solid var(--line);position:sticky;top:0;background:var(--bg);z-index:5}header h1{margin:0;color:var(--ac);font-size:20px;cursor:pointer}header .sp{flex:1}
#burger{font-size:22px;line-height:1;padding:6px 12px;background:#1f2125;color:var(--tx);border:1px solid var(--line)}
#drawer{position:fixed;top:0;right:0;height:100%;width:300px;max-width:85vw;background:#121316;border-left:1px solid var(--line);transform:translateX(105%);transition:.2s;z-index:20;overflow:auto;padding:16px}
#drawer.open{transform:none}#shade{position:fixed;inset:0;background:rgba(0,0,0,.55);display:none;z-index:10}#shade.open{display:block}
#drawer h3{margin:4px 0 14px;color:var(--ac)}#drawer button{display:block;width:100%;text-align:right;margin:3px 0;background:transparent;color:var(--tx);border:1px solid transparent;padding:10px 12px;border-radius:10px;font-size:15px}
#drawer button:hover{background:#1f2125}#drawer button.on{background:var(--ac);color:#111;font-weight:700}
#crumb{padding:14px 18px 0;max-width:980px;margin:auto;font-size:20px;font-weight:700}
main{padding:0 18px 40px;max-width:980px;margin:auto}.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px;margin:10px 0}
.row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:6px 0}.row>label{min-width:150px}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px}
.stats{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}.stats .card{margin:0}.stats .n{font-size:28px;color:var(--ac);font-weight:800}
.hero{display:flex;gap:14px;align-items:center}.hero img{width:64px;height:64px;border-radius:16px}
.muted{color:var(--mu);font-size:13px}.toast{position:fixed;bottom:18px;left:18px;background:#2ecc71;color:#111;padding:10px 16px;border-radius:10px;display:none;font-weight:700;z-index:30}
textarea{width:100%;min-height:90px}input[type=text],input:not([type]),select{min-width:0}.chip{display:inline-block;background:#26282d;border-radius:999px;padding:2px 10px;margin:2px;font-size:12px}</style>
<header><h1 onclick="TAB='overview';render()">Vanr</h1><select id=g></select><span class=sp></span><a href=/logout>خروج</a><button id=burger onclick=toggleMenu() aria-label=menu>☰</button></header>
<div id=shade onclick=toggleMenu()></div><aside id=drawer><h3>القائمة</h3><div id=tabs></div></aside>
<div id=crumb></div><main id=main></main><div class=toast id=toast>تم الحفظ</div>
<script>${CLIENT_JS}</script></html>`;

module.exports = { handler };
