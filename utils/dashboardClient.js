// ───────── واجهة الداشبورد (تشتغل في المتصفح) ─────────
let CSRF = "", G = null, TAB = "overview";
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const val = id => $("#" + id).value;
const chk = id => $("#" + id).checked;
const lines = id => val(id).split("\n").map(x => x.trim()).filter(Boolean);

async function api(path, body) {
    const o = body ? { method: "POST", headers: { "content-type": "application/json", "x-csrf": CSRF }, body: JSON.stringify(body) } : {};
    const r = await fetch(path, o);
    if (r.status === 401) location.reload();
    if (!r.ok) { toast("فشل: " + r.status, true); throw new Error(r.status); }
    return r.json();
}
const post = (name, body) => api(`/api/guild/${G.id}/${name}`, body);
async function reload() { G = await api("/api/guild/" + G.id); }

function toast(t, bad) {
    const e = $("#toast");
    e.textContent = t || "تم الحفظ";
    e.style.background = bad ? "#e74c3c" : "#2ecc71";
    e.style.display = "block";
    setTimeout(() => (e.style.display = "none"), 1800);
}

const chanOpts = (sel, none = "— بدون —") => `<option value="">${none}</option>` + G.channels.map(c => `<option value="${c.id}"${c.id === sel ? " selected" : ""}># ${esc(c.name)}</option>`).join("");
const roleOpts = (sel, none = "— بدون —") => `<option value="">${none}</option>` + G.roles.map(r => `<option value="${r.id}"${r.id === sel ? " selected" : ""}>${esc(r.name)}</option>`).join("");
const punOpts = sel => Object.entries(G.punish).map(([k, v]) => `<option value="${k}"${k === sel ? " selected" : ""}>${esc(v)}</option>`).join("");
const box = (id, on, label) => `<label><input type=checkbox id="${id}" ${on ? "checked" : ""}> ${label}</label>`;
const roleMulti = (id, sel) => `<select id="${id}" multiple size=6 style="width:100%">${G.roles.map(r => `<option value="${r.id}"${(sel || []).includes(r.id) ? " selected" : ""}>${esc(r.name)}</option>`).join("")}</select>`;
const picked = id => [...$("#" + id).selectedOptions].map(o => o.value);

const GROUPS = [
    ["🏠 الرئيسية", { overview: "الإحصائيات" }],
    ["⚙️ الأنظمة", { welcome: "الترحيب", tickets: "التكت", xp: "الخبرة والمستويات", roles: "رومات خاصة", autoreact: "الريأكشن التلقائي" }],
    ["🛡️ الحماية والإدارة", { logs: "اللوقات", filters: "الفلاتر", protect: "الحماية", members: "الأعضاء والعقوبات" }],
    ["🧩 الأوامر", { commands: "كل الأوامر", shortcuts: "الاختصارات", send: "إرسال رسالة" }],
    ["💾 النظام", { backup: "النسخ الاحتياطي", raw: "متقدم (بيانات خام)" }]
];
const TABS = Object.assign({}, ...GROUPS.map(g => g[1]));
const VIEWS = {};
function toggleMenu(force) {
    const open = force === undefined ? !$("#drawer").classList.contains("open") : force;
    $("#drawer").classList.toggle("open", open); $("#shade").classList.toggle("open", open);
}
function render() {
    $("#tabs").innerHTML = GROUPS.map(([title, items]) => `<div class=muted style="margin:14px 6px 4px">${title}</div>` +
        Object.entries(items).map(([k, v]) => `<button class="${k === TAB ? "on" : ""}" onclick="TAB='${k}';render();toggleMenu(false)">${v}</button>`).join("")).join("");
    $("#crumb").textContent = TABS[TAB] || "";
    toggleMenu(false);
    VIEWS[TAB]();
}
async function load() { G = await api("/api/guild/" + val("g")); render(); }

// ───────── نظرة عامة ─────────
VIEWS.overview = () => {
    const s = G.overview;
    const stat = (n, l) => `<div class=card><div class=n>${n}</div><div class=muted>${l}</div></div>`;
    const on = G.protection.features.filter(f => f.on).length;
    const days = Math.floor((Date.now() - s.created) / 864e5);
    const up = s.uptime >= 3600 ? `${Math.floor(s.uptime / 3600)}س ${Math.floor((s.uptime % 3600) / 60)}د` : `${Math.floor(s.uptime / 60)}د`;
    $("#main").innerHTML = `<div class="card hero">${s.icon ? `<img src="${esc(s.icon)}">` : ""}<div><div style="font-size:22px;font-weight:800">${esc(G.name)}</div><div class=muted>عمر السيرفر ${days} يوم • بوست ${s.boosts} (مستوى ${String(s.boostTier).replace("TIER_", "").replace("NONE", "0")})</div></div></div>
        <div class=stats>${stat(s.members, "الأعضاء")}${stat(s.humans, "أشخاص")}${stat(s.bots, "بوتات")}${stat(s.online, "متصلين")}${stat(s.inVoice, "في الصوت الحين")}
        ${stat(s.text, "رومات كتابية")}${stat(s.voice, "رومات صوتية")}${stat(s.categories, "كاتيغوري")}${stat(s.roles, "الرتب")}${stat(s.emojis, "الإيموجيات")}</div>
        <h3 style="margin:22px 0 4px">البوت</h3>
        <div class=stats>${stat(s.commands, "الأوامر")}${stat(s.ping + "ms", "الاستجابة")}${stat(up, "مدة التشغيل")}${stat(s.memory + "MB", "الذاكرة")}${stat(s.servers, "السيرفرات")}
        ${stat(Object.keys(G.logs).filter(k => G.logs[k]).length + "/" + G.logTypes.length, "لوقات مفعلة")}${stat(on + "/" + G.protection.features.length, "حمايات شغالة")}
        ${stat(G.xp && G.xp.enabled ? "شغال" : "مطفي", "الخبرة")}${stat(G.welcome && G.welcome.enabled ? "شغال" : "مطفي", "الترحيب")}${stat(Object.keys(G.shortcuts || {}).length, "اختصارات")}</div>
        <div class=card style="margin-top:14px"><div class=muted>كل الأقسام والتحكم من القائمة ☰ فوق يمين.</div></div>`;
};

// ───────── اللوقات ─────────
VIEWS.logs = () => {
    $("#main").innerHTML = `<div class=card><div class=row><b>كل اللوقات في روم واحد:</b><select id=lall>${chanOpts("")}</select><button onclick=setAllLogs()>تطبيق</button></div></div>
    <div class=grid>${G.logTypes.map(t => `<div class=card><div>${t.emoji} <b>${esc(t.label)}</b></div><select onchange="setLog('${t.key}',this.value)">${chanOpts(G.logs[t.key])}</select></div>`).join("")}</div>`;
};
async function setLog(k, v) { await post("logs", { key: k, channelId: v || null }); G.logs[k] = v || undefined; toast(); }
async function setAllLogs() { const c = val("lall"); if (!c) return; for (const t of G.logTypes) await post("logs", { key: t.key, channelId: c }); await reload(); render(); toast(); }

// ───────── الفلاتر ─────────
VIEWS.filters = () => {
    const f = G.filters;
    const sec = (k, n) => `<div class=card><div class=row><b>${n}</b>${box("f_" + k + "_on", f[k].enabled, "مفعل")}</div><div class=row><label>العقوبة</label><select id="f_${k}_p">${punOpts(f[k].punish)}</select></div></div>`;
    $("#main").innerHTML = `<div class=card><div class=row><b>الكلمات المحظورة</b>${box("w_on", f.words.enabled, "مفعل")}</div><textarea id=w_list placeholder="كلمة بكل سطر">${esc(f.words.list.join("\n"))}</textarea>
        ${[0, 1, 2].map(i => `<div class=row><label>عقوبة المخالفة ${i + 1}</label><select id=w_p${i}>${punOpts(f.words.punish[i])}</select></div>`).join("")}</div>
        ${sec("spam", "النص المتكرر")}<div class=card><div class=row><label>عدد الرسائل المتشابهة</label><input id=sp_n type=number min=2 max=10 value=${f.spam.count}><label>خلال (ثانية)</label><input id=sp_s type=number min=5 max=120 value=${f.spam.seconds}></div></div>
        ${sec("invites", "دعوات ديسكورد")}${sec("links", "الروابط الخارجية")}
        <div class=card><b>الدومينات المسموحة</b><textarea id=l_allow>${esc(f.links.allow.join("\n"))}</textarea></div>
        <div class=card><b>رتب مستثناة</b><div class=muted>Ctrl للاختيار المتعدد</div>${roleMulti("ex", f.exemptRoles)}</div><button onclick=saveFilters()>حفظ الفلاتر</button>`;
};
async function saveFilters() {
    await post("filters", {
        words: { enabled: chk("w_on"), list: lines("w_list"), punish: [0, 1, 2].map(i => val("w_p" + i)) },
        spam: { enabled: chk("f_spam_on"), punish: val("f_spam_p"), count: +val("sp_n"), seconds: +val("sp_s") },
        invites: { enabled: chk("f_invites_on"), punish: val("f_invites_p") },
        links: { enabled: chk("f_links_on"), punish: val("f_links_p"), allow: lines("l_allow") },
        exemptRoles: picked("ex")
    });
    await reload(); toast();
}

// ───────── الحماية ─────────
VIEWS.protect = () => {
    const p = G.protection;
    $("#main").innerHTML = `<div class=grid>${p.features.map(f => `<div class=card><div class=row><b>${esc(f.label)}</b><span style=flex:1></span>${box("pf_" + f.key, f.on, "شغال")}</div></div>`).join("")}</div>
    <div class=card><b>الإعدادات الرقمية</b>
        <div class=row><label>حد الأكشنز</label><input id=p_limit type=number min=1 max=50 value=${p.limit}></div>
        <div class=row><label>المدة (ثانية)</label><input id=p_win type=number min=5 max=600 value=${p.window}></div>
        <div class=row><label>عقوبة الريد</label><select id=p_raid>${["prison", "kick", "ban"].map(a => `<option ${a === p.raidAction ? "selected" : ""}>${a}</option>`).join("")}</select></div>
        <div class=row><label>أيام عمر الحساب (حماية الجوين)</label><input id=p_days type=number min=1 max=365 value=${p.joinDays}></div></div>
    <button onclick=saveProtect()>حفظ الحماية</button>
    <div class=card><b>المستثنين من الحماية العادية (ايدي بكل سطر)</b><textarea id=p_wanti>${esc(p.wanti.join("\n"))}</textarea><b>المستثنين من المتقدمة</b><textarea id=p_aprot>${esc(p.aprot.join("\n"))}</textarea></div>`;
};
async function saveProtect() {
    const features = {}; G.protection.features.forEach(f => (features[f.key] = chk("pf_" + f.key)));
    await post("protection", { features, limit: +val("p_limit"), window: +val("p_win"), raidAction: val("p_raid"), joinDays: +val("p_days"), wanti: lines("p_wanti"), aprot: lines("p_aprot") });
    await reload(); toast();
}

// ───────── الترحيب ─────────
VIEWS.welcome = () => {
    const w = G.welcome;
    $("#main").innerHTML = `<div class=card><div class=row>${box("w_en", w.enabled, "الترحيب شغال")}</div>
        <div class=row><label>الروم</label><select id=w_ch>${chanOpts(w.channelId)}</select></div>
        <div class=row><label>النوع</label><select id=w_mode>${[["both", "صورة + إمبد"], ["embed", "إمبد فقط"], ["image", "صورة فقط"], ["text", "نص فقط"]].map(([k, v]) => `<option value=${k} ${k === w.mode ? "selected" : ""}>${v}</option>`).join("")}</select></div>
        <div class=row><label>رتبة تلقائية</label><select id=w_role>${roleOpts(w.roleId)}</select></div>
        <div class=row><label>عنوان الإمبد</label><input id=w_title value="${esc(w.title)}" style="flex:1"></div>
        <div class=row><label>اللون</label><input id=w_color value="${esc(w.color)}" style="width:110px"><label>حذف بعد (ثانية، 0 = لا)</label><input id=w_del type=number min=0 max=600 value=${w.deleteAfter}></div>
        <div class=row><label>الفوتر</label><input id=w_foot value="${esc(w.footer)}" style="flex:1"></div>
        <textarea id=w_text>${esc(w.text)}</textarea><div class=muted>المتغيرات: {user} {name} {tag} {id} {server} {count} {inviter} {inviter_name} {code}</div>
        <div class=row>${[["avatar", "صورة العضو بالإمبد"], ["name", "اسم العضو"], ["mention", "منشن العضو"], ["inviter", "منشن الداعي"], ["count", "رقم العضو"], ["imgAvatar", "صورة العضو على الصورة"], ["imgName", "اسم العضو على الصورة"]].map(([k, l]) => box("w_" + k, w[k], l)).join("")}</div></div>
        <button onclick=saveWelcome()>حفظ الترحيب</button>
        <div class=card style="margin-top:12px"><b>صورة الترحيب</b>
        <div class=muted>ارفع تصميم، واضغط على الصورة لتحديد مكان صورة العضو، وغير الحجم بالسلايدر.</div>
        <div class=row><button onclick=wDefault()>🎨 تطبيق تصميم Vanr الجاهز</button></div>
        <div class=row><input type=file id=wf accept="image/png,image/jpeg,image/webp" onchange=wPick(this)>${box("wc_none", G.welcomeTpl.has && G.welcomeTpl.circle.none, "بدون صورة العضو (بدون دائرة)")}${G.welcomeTpl.has ? `<button class=d onclick=wRemoveImg()>حذف الصورة</button>` : ""}</div>
        <div class=row><label>حجم الدائرة</label><input type=range id=wc_r min=20 max=600 value=${(G.welcomeTpl.circle && G.welcomeTpl.circle.radius) || 120} oninput=wDraw() style="flex:1"></div>
        <div style="overflow:auto"><canvas id=wcv style="max-width:100%;border:1px solid var(--line);border-radius:10px;cursor:crosshair"></canvas></div>
        <div class=row><button onclick=saveWelcomeImg()>حفظ الصورة والدائرة</button><span class=muted id=wimsg></span></div></div>`;
    wLoad();
};
async function wDefault() { if (!confirm("يستبدل صورة الترحيب بتصميم Vanr الجاهز؟")) return; await post("welcomedefault", {}); await reload(); VIEWS.welcome(); toast("انطبق التصميم"); }
async function saveWelcome() {
    const b = { enabled: chk("w_en"), channelId: val("w_ch") || null, mode: val("w_mode"), roleId: val("w_role") || null, title: val("w_title"), color: val("w_color"), footer: val("w_foot"), deleteAfter: +val("w_del"), text: val("w_text") };
    ["avatar", "name", "mention", "inviter", "count", "imgAvatar", "imgName"].forEach(k => (b[k] = chk("w_" + k)));
    await post("welcome", b); await reload(); toast();
}

let WI = { img: null, data: null, x: 0, y: 0 };
function wLoad() {
    WI = { img: null, data: null, x: 0, y: 0 };
    if (!G.welcomeTpl.has) { $("#wimsg").textContent = "ما فيه صورة، ارفع واحدة"; return; }
    const im = new Image();
    im.onload = () => { WI.img = im; WI.x = G.welcomeTpl.circle.x || im.width / 2; WI.y = G.welcomeTpl.circle.y || im.height / 2; wDraw(); };
    im.src = `/api/guild/${G.id}/welcomeimg?v=${G.welcomeTpl.v}`;
}
function wPick(inp) {
    const f = inp.files[0]; if (!f) return;
    if (f.size > 4 * 1024 * 1024) { toast("الصورة أكبر من 4MB", true); return; }
    const r = new FileReader();
    r.onload = () => { WI.data = r.result; const im = new Image(); im.onload = () => { WI.img = im; WI.x = im.width / 2; WI.y = im.height / 2; wDraw(); }; im.src = r.result; };
    r.readAsDataURL(f);
}
function wDraw() {
    const cv = $("#wcv"); if (!cv || !WI.img) return;
    cv.width = WI.img.width; cv.height = WI.img.height;
    const ctx = cv.getContext("2d"); ctx.drawImage(WI.img, 0, 0);
    if (!chk("wc_none")) {
        const rad = +val("wc_r") * 0.94;
        ctx.save(); ctx.beginPath(); ctx.arc(WI.x, WI.y, rad, 0, Math.PI * 2); ctx.clip();
        const g = ctx.createLinearGradient(WI.x - rad, WI.y - rad, WI.x + rad, WI.y + rad); g.addColorStop(0, "#7a8cff"); g.addColorStop(1, "#c77dff");
        ctx.fillStyle = g; ctx.fillRect(WI.x - rad, WI.y - rad, rad * 2, rad * 2); ctx.restore();
        ctx.lineWidth = Math.max(3, cv.width / 300); ctx.strokeStyle = "#fff"; ctx.beginPath(); ctx.arc(WI.x, WI.y, +val("wc_r"), 0, Math.PI * 2); ctx.stroke();
    }
    cv.onclick = e => { const b = cv.getBoundingClientRect(); WI.x = Math.round((e.clientX - b.left) * cv.width / b.width); WI.y = Math.round((e.clientY - b.top) * cv.height / b.height); wDraw(); };
    $("#wc_none").onchange = wDraw;
    $("#wimsg").textContent = `${cv.width}×${cv.height} • مكان الدائرة (${WI.x}, ${WI.y})`;
}
async function saveWelcomeImg() {
    if (!WI.img) { toast("ارفع صورة أول", true); return; }
    await post("welcomeimg", { image: WI.data || undefined, circle: { x: WI.x, y: WI.y, radius: +val("wc_r"), none: chk("wc_none") } });
    await reload(); toast("انحفظت صورة الترحيب"); VIEWS.welcome();
}
async function wRemoveImg() { if (!confirm("تحذف صورة الترحيب؟")) return; await post("welcomeimg", { remove: true }); await reload(); VIEWS.welcome(); toast(); }

// ───────── التكت ─────────
VIEWS.tickets = () => {
    const t = G.ticket;
    const cats = t.categories.map((c, i) => `<div class=row data-c="${i}"><input class=c_name value="${esc(c.name)}" placeholder="الاسم"><input class=c_desc value="${esc(c.description)}" placeholder="الوصف" style="flex:1"><input class=c_emoji value="${esc(c.emoji || "")}" placeholder="إيموجي" style="width:80px"><select class=c_role>${roleOpts(c.roleId, "كل الرتب")}</select><button class=d onclick="this.parentElement.remove()">حذف</button><input type=hidden class=c_id value="${esc(c.id)}"></div>`).join("");
    $("#main").innerHTML = `<div class=card><b>الرومات والرتب</b>
        <div class=row><label>روم اللوحة</label><select id=t_panel>${chanOpts(t.panelChannelId)}</select></div>
        <div class=row><label>روم الريكوست</label><select id=t_req>${chanOpts(t.requestChannelId)}</select></div>
        <div class=row><label>كاتيغوري التكت</label><select id=t_cat>${G.categories.map(c => `<option value="${c.id}" ${c.id === t.ticketCategoryId ? "selected" : ""}>${esc(c.name)}</option>`).join("")}<option value="" ${t.ticketCategoryId ? "" : "selected"}>— بدون —</option></select></div>
        <div class=row><label>رتب الدعم</label></div>${roleMulti("t_roles", t.reviewerRoleIds)}</div>
        <div class=card><b>الأقسام</b><div id=t_cats>${cats}</div><button class=s onclick=addTicketCat()>+ إضافة قسم</button></div>
        <div class=card><b>شكل اللوحة</b><div class=row><label>النمط</label><select id=t_mode><option value=embed ${t.panelMode !== "image" ? "selected" : ""}>إمبد + صورة + أقسام</option><option value=image ${t.panelMode === "image" ? "selected" : ""}>صورة + أقسام فقط (بدون إمبد)</option></select></div></div>
        <div class=card><b>النصوص</b>${[["panelText", "نص اللوحة"], ["requestText", "نص الريكوست"], ["ticketText", "نص داخل التكت"], ["acceptedText", "DM القبول"], ["pointText", "DM النقطة"]].map(([k, l]) => `<div class=muted>${l}</div><textarea id=tx_${k}>${esc(t[k])}</textarea>`).join("")}<div class=muted>المتغيرات: {user} {number} {category} {staff} {ticket} {admin}</div></div>
        <div class=row><button onclick=saveTickets()>حفظ</button><button class=s onclick=sendPanel()>حفظ + إرسال اللوحة</button></div><div class=muted>صور اللوحة والريكوست من أمر <code>تكت</code> في ديسكورد.</div>`;
};
function addTicketCat() {
    const d = document.createElement("div"); d.className = "row"; d.dataset.c = "new";
    d.innerHTML = `<input class=c_name placeholder="الاسم"><input class=c_desc placeholder="الوصف" style="flex:1"><input class=c_emoji placeholder="إيموجي" style="width:80px"><select class=c_role>${roleOpts("", "كل الرتب")}</select><button class=d onclick="this.parentElement.remove()">حذف</button><input type=hidden class=c_id value="">`;
    $("#t_cats").appendChild(d);
}
function ticketBody() {
    const b = { panelChannelId: val("t_panel") || null, requestChannelId: val("t_req") || null, ticketCategoryId: val("t_cat") || null, panelMode: val("t_mode"), reviewerRoleIds: picked("t_roles"), categories: [...document.querySelectorAll("#t_cats .row")].map(r => ({ id: r.querySelector(".c_id").value, name: r.querySelector(".c_name").value, description: r.querySelector(".c_desc").value, emoji: r.querySelector(".c_emoji").value, roleId: r.querySelector(".c_role").value || null })) };
    ["panelText", "requestText", "ticketText", "acceptedText", "pointText"].forEach(k => (b[k] = val("tx_" + k)));
    return b;
}
async function saveTickets() { await post("ticket", ticketBody()); await reload(); toast(); }
async function sendPanel() { await post("ticket", ticketBody()); const r = await post("ticketpanel", {}); await reload(); toast(r.ok ? "تم الحفظ والإرسال" : "فشل الإرسال", !r.ok); }

// ───────── الخبرة ─────────
VIEWS.xp = () => {
    const x = G.xp;
    $("#main").innerHTML = `<div class=card><div class=row>${box("x_en", x.enabled, "نظام الخبرة شغال")}</div><div class=row><label>روم إشعارات اللفل</label><select id=x_ch>${chanOpts(x.channelId, "نفس روم الرسالة")}</select></div></div>
    <div class=card><b>رتب المكافآت</b><div id=x_rw>${x.roles.sort((a, b) => a.level - b.level).map(r => `<div class=row><label>لفل</label><input class=r_lvl type=number min=1 max=1000 value=${r.level} style="width:90px"><select class=r_role>${roleOpts(r.roleId)}</select><button class=d onclick="this.parentElement.remove()">حذف</button></div>`).join("")}</div><button class=s onclick=addReward()>+ إضافة مكافأة</button></div><button onclick=saveXp()>حفظ</button><div class=card><b>أعلى 15 بالخبرة</b>${x.top.map((t, i) => `<div class=row><span>${i + 1}. ${esc(t.name)}</span><span class=chip>لفل ${t.level}</span><span class=muted>${t.xp} XP</span><span style=flex:1></span><button class=d onclick="xpReset('${t.id}')">تصفير</button></div>`).join("") || "<div class=muted>ما فيه بيانات</div>"}</div>`;
};
function addReward() { const d = document.createElement("div"); d.className = "row"; d.innerHTML = `<label>لفل</label><input class=r_lvl type=number min=1 max=1000 style="width:90px"><select class=r_role>${roleOpts("")}</select><button class=d onclick="this.parentElement.remove()">حذف</button>`; $("#x_rw").appendChild(d); }
async function saveXp() {
    const rewards = [...document.querySelectorAll("#x_rw .row")].map(r => ({ level: +r.querySelector(".r_lvl").value, roleId: r.querySelector(".r_role").value })).filter(r => r.level && r.roleId);
    await post("xp", { enabled: chk("x_en"), channelId: val("x_ch") || null, roles: rewards }); await reload(); toast();
}

async function xpReset(u) { if (!confirm("تصفر خبرة العضو؟")) return; await post("xpreset", { userId: u }); await reload(); render(); toast(); }

// ───────── الرولات الشخصية ─────────
VIEWS.roles = () => {
    const m = G.misc;
    $("#main").innerHTML = `<div class=card><div class=row><label>روم تعديل الرولات (رولي)</label><select id=pr_room>${chanOpts(m.roleRoom)}</select></div>
        <div class=row><label>روم لوق الحماية</label><select id=pr_sec>${chanOpts(m.securityLog)}</select></div></div><button onclick=saveRoom()>حفظ</button>`;
};
async function saveRoom() { await post("misc", { roleRoom: val("pr_room") || null, securityLog: val("pr_sec") || null }); await reload(); toast(); }

// ───────── العقوبات ─────────
VIEWS.members = () => {
    $("#main").innerHTML = `<div class=card><b>إجراء على عضو</b>
        <div class=row><input id=mq placeholder="اسم العضو أو الايدي" style="flex:1"><button class=s onclick=findMember()>بحث</button></div><div id=mres></div>
        <div class=row><input id=mu placeholder="ايدي العضو" style="width:220px"><input id=mr placeholder="السبب" style="flex:1"><input id=mm type=number min=1 value=10 style="width:90px" title="دقايق التايم أوت"></div>
        <div class=row><button onclick="mAct('timeout')">تايم أوت</button><button class=s onclick="mAct('untimeout')">فك تايم أوت</button><button class=d onclick="mAct('kick')">طرد</button><button class=d onclick="mAct('ban')">حظر</button><button class=s onclick="mAct('unban')">فك حظر</button></div>
        <div class=row><select id=mrole>${roleOpts("", "اختر رتبة")}</select><button class=s onclick="mAct('addrole')">إعطاء رتبة</button><button class=s onclick="mAct('removerole')">سحب رتبة</button></div></div>
    <div class=card><b>تحذيرات عضو</b><div class=row><input id=wu placeholder="ايدي العضو"><button onclick=lookWarn()>بحث</button><span id=wr class=muted></span></div></div>`;
};
async function findMember() {
    const r = await api(`/api/guild/${G.id}/members?q=${encodeURIComponent(val("mq"))}`);
    $("#mres").innerHTML = r.map(m => `<div class=row><span>${esc(m.name)} <span class=muted>${esc(m.tag)}</span></span><button class=s onclick="$('#mu').value='${m.id}';$('#wu').value='${m.id}'">اختيار</button></div>`).join("") || "<div class=muted>ما لقيت</div>";
}
async function mAct(action) {
    if (["ban", "kick"].includes(action) && !confirm("متأكد؟")) return;
    const r = await post("member", { action, userId: val("mu"), reason: val("mr"), minutes: +val("mm"), roleId: val("mrole") || null });
    toast(r.ok ? "تم" : (r.error || "فشل"), !r.ok);
}
async function lookWarn() {
    const r = await post("warns", { userId: val("wu") });
    $("#wr").innerHTML = `التحذيرات: <b>${r.warns}</b> ${r.warns ? `<button class=d onclick=resetWarn()>تصفير</button>` : ""}`;
}
async function resetWarn() { await post("warns", { userId: val("wu"), reset: true }); lookWarn(); toast(); }

// ───────── متقدم: مفاتيح قاعدة البيانات ─────────
VIEWS.raw = () => {
    $("#main").innerHTML = `<div class=card><b>مفاتيح القاعدة (متقدم)</b><div class=muted>للخبراء فقط، تعديل خاطئ ممكن يخرب إعدادات. المفاتيح السرية مخفية.</div>
        <div class=row><input id=rq value="${G.id}" style="flex:1"><button onclick=rawList()>بحث</button></div><div id=rl></div><div id=rv></div></div>`;
    rawList();
};
async function rawList() {
    const r = await api(`/api/guild/${G.id}/raw?q=${encodeURIComponent(val("rq"))}`);
    $("#rl").innerHTML = r.map(k => `<div class=row><code style="flex:1;word-break:break-all">${esc(k)}</code><button class=s onclick='rawOpen(${JSON.stringify(k).replace(/'/g, "&#39;")})'>فتح</button></div>`).join("") || "<div class=muted>ما فيه</div>";
}
async function rawOpen(k) {
    const r = await api(`/api/guild/${G.id}/raw?k=${encodeURIComponent(k)}`);
    $("#rv").innerHTML = `<b>${esc(k)}</b><textarea id=rjson style="min-height:160px;direction:ltr">${esc(JSON.stringify(r.value, null, 2))}</textarea>
        <div class=row><button id=rsave>حفظ</button><button class=d id=rdel>حذف المفتاح</button></div>`;
    $("#rsave").onclick = async () => { try { await post("rawset", { key: k, value: JSON.parse(val("rjson")) }); toast(); } catch { toast("JSON غلط", true); } };
    $("#rdel").onclick = async () => { if (confirm("تحذف المفتاح؟")) { await post("rawset", { key: k, delete: true }); rawList(); $("#rv").innerHTML = ""; toast(); } };
}

// ───────── الأوامر ─────────
VIEWS.commands = () => { $("#main").innerHTML = `<div class=card><b>رتب تستخدم كل الأوامر</b><div class=muted>أي عضو معه إحدى هذي الرتب يقدر يستخدم أي أمر (عدا أوامر المالك) حتى لو ما عنده صلاحية. اضغط Ctrl/⌘ لاختيار أكثر من رتبة.</div>${roleMulti("cg_roles", G.cmdGlobal)}<div class=row><button onclick=saveCmdGlobal()>حفظ</button></div></div><input id=q placeholder="ابحث عن أمر..." oninput=cmdList() style="width:100%"><div id=cl></div>`; cmdList(); };
function cmdList() {
    const q = (val("q") || "").toLowerCase();
    const list = G.commands.filter(c => !q || c.name.includes(q) || c.desc.toLowerCase().includes(q));
    $("#cl").innerHTML = list.slice(0, 60).map(c => `<div class=card><div class=row><b>${esc(c.name)}</b><span class=chip>${esc(c.dir)}</span><span class=muted>${esc(c.desc)}</span></div>
        <div class=row>${box("d_" + c.name, c.cfg.disabled, "معطل")}<input id="a_${c.name}" placeholder="اختصارات بمسافة" value="${esc(c.cfg.aliases.join(" "))}"><span class=muted>الرتب المسموحة:</span>${roleMulti("r_" + c.name, c.cfg.roleIds)}<select id="c_${c.name}">${chanOpts(c.cfg.channelId, "كل الرومات")}</select><button onclick="saveCmd('${c.name}')">حفظ</button></div></div>`).join("") + (list.length > 60 ? `<div class=muted>يعرض أول 60 من ${list.length}، استخدم البحث.</div>` : "");
}
async function saveCmdGlobal() { await post("cmdglobal", { roleIds: picked("cg_roles") }); await reload(); toast(); }
async function saveCmd(n) { await post("command", { name: n, disabled: chk("d_" + n), aliases: val("a_" + n).split(/\s+/).filter(Boolean), roleIds: picked("r_" + n), channelId: val("c_" + n) || null }); await reload(); toast(); }

// ───────── الاختصارات ─────────
VIEWS.shortcuts = () => {
    $("#main").innerHTML = `<div class=card><div class=row><input id=sw placeholder="الكلمة (مثل ب)"><input id=sf placeholder="الأمر كامل (مثل ban)" style="flex:1"><button onclick=addSc()>إضافة</button></div><div class=muted>"ب @عضو" ← "ban @عضو"</div></div>` +
        Object.entries(G.shortcuts).map(([k, v]) => `<div class=card><div class=row><b>${esc(k)}</b> ← <code>${esc(v)}</code><span style=flex:1></span><button class=d onclick="rmSc('${esc(k)}')">حذف</button></div></div>`).join("");
};
async function addSc() { await post("shortcut", { word: val("sw"), full: val("sf") }); await reload(); VIEWS.shortcuts(); toast(); }
async function rmSc(w) { await post("shortcut", { word: w, remove: true }); await reload(); VIEWS.shortcuts(); toast(); }

// ───────── الريأكشن التلقائي ─────────
VIEWS.autoreact = () => {
    $("#main").innerHTML = `<div class=card><div class=row><select id=ac>${chanOpts("", "اختر الروم")}</select><input id=ae placeholder="الإيموجيات بمسافة 🔥 ❤️" style="flex:1"><button onclick=addAr()>حفظ</button></div></div>` +
        Object.entries(G.autoreact).map(([c, e]) => `<div class=card><div class=row><b># ${esc((G.channels.find(x => x.id === c) || { name: c }).name)}</b><span>${e.map(x => (/^\d+$/.test(x) ? "[مخصص]" : x)).join(" ")}</span><span style=flex:1></span><button class=d onclick="rmAr('${c}')">حذف</button></div></div>`).join("");
};
async function addAr() { await post("autoreact", { channelId: val("ac"), emojis: val("ae").split(/\s+/).filter(Boolean) }); await reload(); VIEWS.autoreact(); toast(); }
async function rmAr(c) { await post("autoreact", { channelId: c, emojis: [] }); await reload(); VIEWS.autoreact(); toast(); }

// ───────── إرسال رسالة ─────────
VIEWS.backup = async () => {
    $("#main").innerHTML = `<div class=card>جاري التحميل...</div>`;
    const r = await api("/api/backup");
    const st = r.status, items = Array.isArray(r.items) ? r.items : [];
    $("#main").innerHTML = `<div class=card><b>النسخ الاحتياطي</b>
        <div class=muted>الروم: <code>${esc(st.channel)}</code> • آخر نسخة: ${st.lastSent ? new Date(st.lastSent).toLocaleString("ar") : "—"} ${st.dirty ? "• فيه تعديلات بالانتظار" : ""}</div>
        ${st.lastError ? `<div style="color:#e74c3c">آخر خطأ: ${esc(st.lastError)}</div>` : ""}
        ${r.items && r.items.error ? `<div style="color:#e74c3c">${esc(r.items.error)}</div>` : ""}
        <div class=row><button onclick=bkNow()>📦 نسخة الحين</button><button onclick=bkRestore("")>♻️ استرجاع شامل (كل النسخ)</button><label class=muted>استرجاع من ملف:</label><input type=file id=bkf accept=".gz,.json" onchange=bkUpload(this)></div>
        <div class=muted>الاسترجاع دمج: القديم يرجع، والجديد اللي مو بالنسخة ما ينحذف.</div></div>
        <div class=card><b>آخر النسخ في الروم</b>${items.map(i => `<div class=row><span>${new Date(i.at).toLocaleString("ar")} • ${i.count || "?"} إعداد • ${(i.size / 1024).toFixed(1)}KB</span><span class=sp></span><button onclick="bkRestore('${i.id}')">استرجاع</button></div>`).join("") || "<div class=muted>ما فيه نسخ</div>"}</div>`;
};
async function bkNow() { try { const r = await api("/api/backup/now", {}); toast("انرسلت النسخة (" + r.count + ")"); VIEWS.backup(); } catch { toast("فشلت النسخة", true); } }
async function bkRestore(id) { if (!confirm(id ? "تسترجع هذي النسخة؟ (دمج، ما ينحذف الجديد)" : "استرجاع شامل: يدمج كل النسخ ويرجع كل شيء. تكمل؟")) return; try { const r = await api("/api/backup/restore", id ? { id } : { all: true }); await reload(); toast("رجعت " + r.applied + " إعداد"); } catch { toast("فشل الاسترجاع", true); } }
function bkUpload(inp) {
    const f = inp.files[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = async () => { try { const r = await api("/api/backup/upload", { data: rd.result }); await reload(); toast("رجعت " + r.applied + " إعداد"); } catch { toast("ملف غير صالح", true); } };
    rd.readAsDataURL(f);
}

VIEWS.send = () => {
    $("#main").innerHTML = `<div class=card><b>إرسال رسالة / إمبد من البوت</b>
        <div class=row><label>الروم</label><select id=s_ch>${chanOpts("", "اختر الروم")}</select></div>
        <textarea id=s_content placeholder="نص الرسالة (اختياري)"></textarea>
        <div class=row>${box("s_emb", false, "إرسالها كإمبد")}</div>
        <div class=row><input id=s_title placeholder="عنوان الإمبد" style="flex:1"><input id=s_color placeholder="#2b2d31" style="width:110px"></div>
        <textarea id=s_desc placeholder="وصف الإمبد"></textarea><input id=s_img placeholder="رابط صورة (اختياري)" style="width:100%"></div>
        <button onclick=sendMsg()>إرسال</button>`;
};
async function sendMsg() {
    const r = await post("send", { channelId: val("s_ch"), content: val("s_content"), embed: chk("s_emb") ? { title: val("s_title"), color: val("s_color"), description: val("s_desc"), image: val("s_img") } : null });
    toast(r.ok ? "انرسلت" : "ما انرسلت", !r.ok);
}

(async () => {
    const r = await api("/api/guilds"); CSRF = r.csrf;
    $("#g").innerHTML = r.guilds.map(g => `<option value="${g.id}">${esc(g.name)}</option>`).join("");
    $("#g").onchange = load;
    if (r.guilds.length) load(); else $("#main").innerHTML = "<div class=card>البوت مو في أي سيرفر</div>";
})();
