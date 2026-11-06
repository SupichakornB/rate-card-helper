/* ===== แท็บ: หาอินฟลู ===== */
(() => {
const $ = id => document.getElementById(id);
const cleanTail = s => s.replace(/[)\]}>,.;:!?'"…”’]+$/, "");

/* ================= ตั้งค่าปุ่มยอดฟอล ================= */
const STORE_KEY = "rc_tiers_v2";
const OPS = ["<", "≤", "=", "≥", ">"];
const DEFAULT_TIERS = [
  { op: "<", value: "500",  tpl: "สวัสดีค่ะช่อง {name} ทางเราสนใจร่วมงานรีวิวสินค้ากับช่องค่ะ เป็นงานแลกสินค้า (Barter) ไม่ทราบว่าสะดวกรับงานไหมคะ" },
  { op: "<", value: "1000", tpl: "สวัสดีค่ะช่อง {name} ทางเราสนใจจ้างรีวิวสินค้ากับช่องค่ะ รบกวนขอ Rate Card และรายละเอียดเพิ่มเติมได้ไหมคะ" },
  { op: ">", value: "50k",  tpl: "สวัสดีค่ะช่อง {name} ทางเราสนใจร่วมงานแคมเปญกับช่องค่ะ รบกวนขอ Rate Card แพ็กเกจทั้งหมด และช่วงคิวว่างของเดือนนี้ได้ไหมคะ" }
];

function loadTiers() {
  try {
    const s = JSON.parse(storeGet(STORE_KEY));
    if (Array.isArray(s)) return s.map(t => ({ id: t.id || uid(), op: t.op || ">", value: t.value || "", tpl: t.tpl || "" }));
  } catch {}
  const oldKeys = ["500", "1000", "50k"];
  return DEFAULT_TIERS.map((t, i) => ({
    id: uid(), op: t.op, value: t.value,
    tpl: storeGet("tpl_" + oldKeys[i]) ?? t.tpl
  }));
}
let tiers = loadTiers();

function saveTiers() {
  if (storeSet(STORE_KEY, JSON.stringify(tiers))) flashSaved($("savedFlag"));
}

// "12.5k" -> 12500, "2หมื่น" -> 20000, "1,000" -> 1000
function parseNum(s) {
  if (s == null) return NaN;
  s = String(s).trim().toLowerCase().replace(/[,\s]/g, "");
  const m = s.match(/^(\d+(?:\.\d+)?)(k|m|พัน|หมื่น|แสน|ล้าน)?$/);
  if (!m) return NaN;
  const mult = { k: 1e3, m: 1e6, "พัน": 1e3, "หมื่น": 1e4, "แสน": 1e5, "ล้าน": 1e6 }[m[2]] || 1;
  return parseFloat(m[1]) * mult;
}
function compare(n, op, v) {
  switch (op) {
    case "<": return n < v;
    case "≤": return n <= v;
    case "=": return n === v;
    case "≥": return n >= v;
    case ">": return n > v;
  }
  return false;
}
const tierLabel = t => `${t.op} ${t.value || "?"}`;

function sortedTiers() {
  return tiers.slice().sort((a, b) =>
    ((parseNum(a.value) || 0) - (parseNum(b.value) || 0)) || (OPS.indexOf(a.op) - OPS.indexOf(b.op)));
}
function matchTier(n) {
  let best = null, bd = Infinity;
  tiers.forEach(t => {
    const v = parseNum(t.value);
    if (isNaN(v) || !compare(n, t.op, v)) return;
    const d = Math.abs(n - v);
    if (d < bd) { bd = d; best = t; }
  });
  return best;
}

function renderTierSettings() {
  const list = $("tierList");
  list.innerHTML = "";
  if (!tiers.length) {
    list.innerHTML = `<div class="empty">ยังไม่มีปุ่ม กด "เพิ่มปุ่ม" เพื่อสร้างเงื่อนไขแรก</div>`;
    return;
  }
  tiers.forEach((t, idx) => {
    const box = document.createElement("div");
    box.className = "tier-box";
    box.innerHTML = `
      <div class="tier-row">
        <span class="tier-num">ปุ่ม ${idx + 1}</span>
        <select class="op">${OPS.map(o => `<option ${o === t.op ? "selected" : ""}>${o}</option>`).join("")}</select>
        <input class="val" placeholder="เช่น 500, 10k">
        <span class="tier-preview"></span>
        <span class="tier-warn"></span>
        <button class="small del">ลบ</button>
      </div>
      <textarea class="tpl" placeholder="ข้อความทักของปุ่มนี้"></textarea>`;
    const opSel = box.querySelector(".op");
    const val = box.querySelector(".val");
    const tpl = box.querySelector(".tpl");
    const preview = box.querySelector(".tier-preview");
    const warn = box.querySelector(".tier-warn");
    val.value = t.value;
    tpl.value = t.tpl;

    const refreshPreview = () => {
      preview.textContent = tierLabel(t);
      warn.textContent = t.value && isNaN(parseNum(t.value)) ? "ตัวเลขไม่ถูกต้อง" : "";
    };
    refreshPreview();

    opSel.onchange = () => { t.op = opSel.value; refreshPreview(); renderCards(); saveTiers(); };
    val.oninput = () => { t.value = val.value.trim(); refreshPreview(); renderCards(); saveTiers(); };
    tpl.oninput = () => { t.tpl = tpl.value; renderCards(); saveTiers(); };

    const delBtn = box.querySelector(".del");
    delBtn.onclick = () => confirmClick(delBtn, "กดอีกครั้งเพื่อลบ", () => {
      tiers = tiers.filter(x => x.id !== t.id);
      renderTierSettings(); renderCards(); saveTiers();
      toast("ลบปุ่มแล้ว");
    });
    list.appendChild(box);
  });
}

$("btnAddTier").onclick = () => {
  tiers.push({ id: uid(), op: ">", value: "", tpl: "สวัสดีค่ะช่อง {name} " });
  renderTierSettings(); renderCards(); saveTiers();
  const boxes = document.querySelectorAll("#tierList .tier-box");
  const last = boxes[boxes.length - 1];
  if (last) {
    last.classList.add("new");
    last.scrollIntoView({ behavior: "smooth", block: "center" });
    last.querySelector(".val").focus({ preventScroll: true });
    setTimeout(() => last.classList.remove("new"), 2000);
  }
};

const btnReset = $("btnResetTier");
btnReset.onclick = () => confirmClick(btnReset, "กดอีกครั้งเพื่อยืนยัน", () => {
  tiers = DEFAULT_TIERS.map(t => ({ id: uid(), ...t }));
  renderTierSettings(); renderCards(); saveTiers();
  toast("คืนค่าเริ่มต้นแล้ว");
});

/* ================= ชื่อเล่น ================= */
const PARTICLES = ["นะคะ","นะค่ะ","นะครับ","ได้เลย","ค่ะ","ค่า","คะ","ครับ","คับ","จ้า","จ้ะ","น้า","นะ","เลย"];
const NICK_IGNORE = new Set(["ช่อง","เพจ","บัญชี","ไลน์","ติดต่อ","line","tiktok","id","ig","my","is"]);
function cleanNick(s) {
  s = s.replace(/^(น้อง|พี่|คุณ)/, "");
  let changed = true;
  while (changed) {
    changed = false;
    for (const p of PARTICLES) {
      if (s.length > p.length && s.endsWith(p)) { s = s.slice(0, -p.length); changed = true; break; }
    }
  }
  return s.trim();
}

/* ================= Parser ================= */
const IGNORE_WORDS = new Set(["id","me","for","official","oa","add","contact","ติดต่อ","http","https","www"]);

function parse(text) {
  const tiktoks = [], lines = [], nicks = [], follows = [];
  const seenTT = new Map();
  const newCard = (key, url, name, positions) =>
    ({ key, url, name, positions, lines: [], nick: "", followers: "" });

  function addTT(key, url, name, pos) {
    key = key.toLowerCase();
    if (seenTT.has(key)) { seenTT.get(key).positions.push(pos); return; }
    const obj = newCard(key, url, name, [pos]);
    seenTT.set(key, obj); tiktoks.push(obj);
  }

  let m;
  const reTT = /(?:https?:\/\/)?(?:www\.|m\.)?tiktok\.com\/@([A-Za-z0-9._]+)/gi;
  while ((m = reTT.exec(text))) {
    const user = m[1].replace(/\.+$/, "");
    addTT(user, "https://www.tiktok.com/@" + user, user, m.index);
  }
  const reShort = /(?:https?:\/\/)?(?:vt|vm)\.tiktok\.com\/[A-Za-z0-9]+\/?/gi;
  while ((m = reShort.exec(text))) {
    const url = m[0].startsWith("http") ? m[0] : "https://" + m[0];
    addTT(url, url, "", m.index);
  }
  const reTTText = /(?:tik\s*tok|ติ๊กต็อก|ติ๊กตอก|ติ๊กต๊อก)\s*(?:id)?\s*[:：\-–]?\s*@([A-Za-z0-9._]+)/gi;
  while ((m = reTTText.exec(text))) {
    const user = m[1].replace(/\.+$/, "");
    addTT(user, "https://www.tiktok.com/@" + user, user, m.index);
  }

  const lineLinkRanges = [];
  const reLineLink = /(?:https?:\/\/)?(?:line\.me|lin\.ee)\/[^\s<>"']+/gi;
  while ((m = reLineLink.exec(text))) {
    let url = cleanTail(m[0]);
    if (!url.startsWith("http")) url = "https://" + url;
    lines.push({ type: "link", value: url, pos: m.index });
    lineLinkRanges.push([m.index, m.index + m[0].length]);
  }
  const reLineId = /(?<![A-Za-z])(?:line\s*id|id\s*line|ไอดีไลน์|ไลน์\s*ไอดี|line|ไลน์|ไลน)(?![.\w])\s*(?:id)?\s*[:：=\-–]?\s*(@?[A-Za-z0-9][A-Za-z0-9._\-]{1,29})/gi;
  while ((m = reLineId.exec(text))) {
    if (lineLinkRanges.some(([s, e]) => m.index >= s && m.index < e)) continue;
    const id = cleanTail(m[1]);
    if (IGNORE_WORDS.has(id.toLowerCase().replace(/^@/, ""))) continue;
    lines.push({ type: "id", value: id, pos: m.index });
  }

  const reNick = /(?<![A-Za-z])(?:ชื่อเล่น|nick\s*name|เรียกหนูว่า|เรียกเราว่า|เรียกผมว่า|เรียกว่า|ชื่อ|name)(?!\s*[-–]?\s*(?:ช่อง|บัญชี|ผู้ใช้|tik\s*tok|ติ๊ก|ไลน์|line|เพจ|page|จริง|นามสกุล|สกุล|เสียง|ig|ไอจี|account|channel|user|ร้าน|แบรนด์|สินค้า))\s*[:：=\-–]?\s*(?:ว่า|คือ)?\s*([ก-๙A-Za-z]+)/gi;
  while ((m = reNick.exec(text))) {
    const nick = cleanNick(m[1]);
    if (!nick || NICK_IGNORE.has(nick.toLowerCase())) continue;
    nicks.push({ value: nick, pos: m.index });
  }

  const UNIT = "(?:(k|m|พัน|หมื่น|แสน|ล้าน)(?![A-Za-z]))?";
  const reFol1 = new RegExp("(?:ผู้ติดตาม|ยอดฟอล\\S{0,6}|ฟอลโล\\S{0,4}|ฟอล|followers?)\\s*(?:tik\\s*tok|ติ๊กต็อก)?\\s*[:：=\\-–]?\\s*(?:ประมาณ|กว่า|เกือบ|~|≈)?\\s*(\\d[\\d,]*(?:\\.\\d+)?)\\s*" + UNIT, "gi");
  const reFol2 = new RegExp("(\\d[\\d,]*(?:\\.\\d+)?)\\s*" + UNIT + "\\s*(?:ผู้ติดตาม|followers?|ฟอล)", "gi");
  [reFol1, reFol2].forEach(re => {
    while ((m = re.exec(text))) {
      follows.push({ value: m[1].replace(/,/g, "") + (m[2] || ""), pos: m.index });
    }
  });

  const cards = tiktoks.slice();
  let orphan = null;
  function nearest(pos) {
    let target = null, best = Infinity;
    cards.forEach(c => c.positions.forEach(p => {
      const d = Math.abs(p - pos);
      if (d < best) { best = d; target = c; }
    }));
    if (!target) {
      if (!orphan) { orphan = newCard("_orphan", "", "", []); cards.push(orphan); }
      target = orphan;
    }
    return target;
  }
  lines.forEach(l => {
    const t = nearest(l.pos);
    if (!t.lines.some(x => x.value.toLowerCase() === l.value.toLowerCase())) t.lines.push(l);
  });
  nicks.forEach(n => { const t = nearest(n.pos); if (!t.nick) t.nick = n.value; });
  follows.sort((a, b) => a.pos - b.pos)
         .forEach(f => { if (!cards.length) return; const t = nearest(f.pos); if (!t.followers) t.followers = f.value; });

  cards.forEach(c => {
    c.channel = c.name;
    c.manual = false;
    c.checked = false;
    c.msgText = "";
    const n = parseNum(c.followers);
    const mt = isNaN(n) ? null : matchTier(n);
    c.selected = mt ? mt.id : null;
  });
  return cards;
}

/* ================= รายการที่บันทึก ================= */
const SAVED_KEY = "rc_saved_v1";
let saved = (() => {
  try { const s = JSON.parse(storeGet(SAVED_KEY)); return Array.isArray(s) ? s : []; }
  catch { return []; }
})();
const persistSaved = () => storeSet(SAVED_KEY, JSON.stringify(saved));

const entryKey = s => (s.tiktok || s.lines.map(l => l.value).join("|")).toLowerCase();
const isSaved = c => {
  const k = (c.url || c.lines.map(l => l.value).join("|")).toLowerCase();
  return k && saved.some(s => entryKey(s) === k);
};
const fmtDate = ts => new Date(ts).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" });

function snapshot(c) {
  const t = tiers.find(t => t.id === c.selected);
  return {
    id: uid(),
    savedAt: Date.now(),
    nick: c.nick || "",
    channel: c.channel || "",
    tiktok: c.url || "",
    lines: c.lines.map(l => ({ type: l.type, value: l.value })),
    followers: (c.followers || "").trim(),
    tier: t ? tierLabel(t) : "",
    message: t ? (c.msgText || buildMessage(t.tpl, c)) : ""
  };
}

function saveChecked() {
  const picked = cardsState.filter(c => c.checked);
  if (!picked.length) { toast("ยังไม่ได้ติ๊กเลือกใคร"); return; }
  let added = 0, updated = 0;
  picked.forEach(c => {
    const snap = snapshot(c);
    const k = entryKey(snap);
    const idx = k ? saved.findIndex(s => entryKey(s) === k) : -1;
    if (idx >= 0) { snap.id = saved[idx].id; saved[idx] = snap; updated++; }
    else { saved.push(snap); added++; }
    c.checked = false;
  });
  persistSaved(); renderSaved(); renderCards();

  const fab = $("saveFab");
  fab.classList.remove("bump"); void fab.offsetWidth; fab.classList.add("bump");
  let msg = `บันทึกแล้ว ${added} คน`;
  if (updated) msg += ` (อัปเดตคนเดิม ${updated} คน)`;
  toast(msg, 2000);
}

function savedToText() {
  return saved.map((s, i) => [
    `คนที่ ${i + 1}`,
    `ชื่อเล่น: ${s.nick || "-"}`,
    `ชื่อช่อง: ${s.channel || "-"}`,
    `TikTok: ${s.tiktok || "-"}`,
    `LINE: ${s.lines.length ? s.lines.map(l => l.value).join(", ") : "-"}`,
    `ยอดฟอล: ${s.followers || "-"}`,
    `ปุ่มที่เลือก: ${s.tier || "-"}`,
    `ข้อความทัก: ${s.message || "-"}`
  ].join("\n")).join("\n\n");
}

function downloadCsv() {
  if (!saved.length) { toast("ยังไม่มีรายการที่บันทึก"); return; }
  const esc = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = ["คนที่","ชื่อเล่น","ชื่อช่อง","TikTok","LINE","ยอดฟอล","ปุ่มที่เลือก","ข้อความทัก","บันทึกเมื่อ"];
  const rows = saved.map((s, i) => [
    i + 1, s.nick, s.channel, s.tiktok, s.lines.map(l => l.value).join(" , "),
    s.followers, s.tier, s.message, fmtDate(s.savedAt)
  ].map(esc).join(","));
  const csv = "\uFEFF" + [head.map(esc).join(","), ...rows].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "ratecard-saved.csv";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function renderSaved() {
  const badge = $("savedBadge");
  badge.textContent = saved.length;
  badge.classList.toggle("hide", !saved.length);
  $("savedTotal").textContent = saved.length ? `(${saved.length})` : "";

  const list = $("savedList");
  list.innerHTML = "";
  if (!saved.length) {
    list.innerHTML = `<div class="empty">ยังไม่มีรายการที่บันทึก<br>ติ๊กเลือกคนในผลลัพธ์ แล้วกด "บันทึกที่เลือก"</div>`;
    return;
  }

  const dash = `<span class="hint">-</span>`;
  const copyBtn = v => v ? `<button class="small outline" data-copy="${escapeHtml(v)}">Copy</button>` : "";
  const row = (label, val, btns = "") =>
    `<div class="s-row"><span class="s-label">${label}</span><span class="s-val">${val}</span><span class="s-btns">${btns}</span></div>`;

  saved.forEach((s, i) => {
    const el = document.createElement("div");
    el.className = "s-card";
    let h = `<div class="s-head">
        <b>คนที่ ${i + 1}</b>
        <span class="s-date">บันทึกเมื่อ ${escapeHtml(fmtDate(s.savedAt))}</span>
        <button class="small del s-del">ลบ</button>
      </div>`;
    h += row("ชื่อเล่น", s.nick ? escapeHtml(s.nick) : dash, copyBtn(s.nick));
    h += row("ชื่อช่อง", s.channel ? escapeHtml(s.channel) : dash, copyBtn(s.channel));
    h += row("TikTok",
      s.tiktok ? `<a href="${escapeHtml(s.tiktok)}" target="_blank" rel="noopener">${escapeHtml(s.tiktok)}</a>` : dash,
      copyBtn(s.tiktok));
    if (s.lines.length) {
      s.lines.forEach(l => {
        if (l.type === "link") {
          h += row("LINE ลิงก์",
            `<a href="${escapeHtml(l.value)}" target="_blank" rel="noopener">${escapeHtml(l.value)}</a>`,
            `<button class="small green" data-open="${escapeHtml(l.value)}">เปิด</button>${copyBtn(l.value)}`);
        } else {
          h += row("LINE ID", `<b>${escapeHtml(l.value)}</b>`, copyBtn(l.value));
        }
      });
    } else {
      h += row("LINE", dash);
    }
    h += row("ยอดฟอล", s.followers ? escapeHtml(s.followers) : dash);
    h += row("ปุ่มที่เลือก", s.tier ? escapeHtml(s.tier) : dash);
    h += row("ข้อความทัก", s.message ? escapeHtml(s.message) : dash, copyBtn(s.message));
    el.innerHTML = h;

    el.querySelectorAll("[data-copy]").forEach(b => b.onclick = () => copyText(b.dataset.copy));
    el.querySelectorAll("[data-open]").forEach(b => b.onclick = () => window.open(b.dataset.open, "_blank"));
    const del = el.querySelector(".s-del");
    del.onclick = () => confirmClick(del, "กดอีกครั้งเพื่อลบ", () => {
      saved = saved.filter(x => x.id !== s.id);
      persistSaved(); renderSaved(); renderCards();
      toast("ลบแล้ว");
    });
    list.appendChild(el);
  });
}

function openDrawer() {
  renderSaved();
  $("drawer").classList.add("show");
  $("overlay").classList.add("show");
}
function closeDrawer() {
  $("drawer").classList.remove("show");
  $("overlay").classList.remove("show");
}
$("saveFab").onclick = openDrawer;
$("btnCloseDrawer").onclick = closeDrawer;
$("overlay").onclick = closeDrawer;
document.addEventListener("keydown", e => { if (e.key === "Escape") closeDrawer(); });
$("btnCopyAllSaved").onclick = () =>
  saved.length ? copyText(savedToText(), `คัดลอกแล้ว ${saved.length} คน`) : toast("ยังไม่มีรายการที่บันทึก");
$("btnCsv").onclick = downloadCsv;
const btnClearSaved = $("btnClearSaved");
btnClearSaved.onclick = () => {
  if (!saved.length) { toast("ยังไม่มีรายการที่บันทึก"); return; }
  confirmClick(btnClearSaved, "กดอีกครั้งเพื่อล้าง", () => {
    saved = [];
    persistSaved(); renderSaved(); renderCards();
    toast("ล้างรายการแล้ว");
  });
};

/* ================= Render การ์ด ================= */
let cardsState = [];

function buildMessage(tpl, c) {
  return tpl
    .replaceAll("{name}", c.channel || "")
    .replaceAll("{nick}", c.nick || "")
    .replaceAll("{link}", c.url || "")
    .replaceAll("{follow}", c.followers || "")
    .replace(/[ \t]{2,}/g, " ");
}

function updateSaveBar() {
  const bar = $("saveBar");
  if (!cardsState.length) { bar.style.display = "none"; return; }
  bar.style.display = "flex";
  const n = cardsState.filter(c => c.checked).length;
  $("checkCount").innerHTML = `เลือกแล้ว <b>${n}</b> จาก ${cardsState.length} คน`;
  const all = $("checkAll");
  all.checked = n === cardsState.length;
  all.indeterminate = n > 0 && n < cardsState.length;
  $("btnSaveChecked").disabled = !n;
}

function renderCards() {
  const results = $("results");
  const summary = $("summary");
  results.innerHTML = "";

  if (!cardsState.length) {
    summary.innerHTML = $("input").value.trim()
      ? `<div class="empty">ไม่พบลิงก์ TikTok หรือ LINE ในข้อความ</div>`
      : `<div class="empty">วางคอมเมนต์ด้านบน แล้วผลจะแสดงตรงนี้</div>`;
    updateSaveBar();
    return;
  }

  const ttCount = cardsState.filter(c => c.url).length;
  const lineCount = cardsState.reduce((s, c) => s + c.lines.length, 0);
  const nickCount = cardsState.filter(c => c.nick).length;
  summary.innerHTML = `<div class="chips">
      <span class="chip">TikTok <b>${ttCount}</b></span>
      <span class="chip">LINE <b>${lineCount}</b></span>
      <span class="chip">ชื่อเล่น <b>${nickCount}</b></span>
      ${ttCount > 1 ? `<button class="small outline" id="copyAllTT">Copy ลิงก์ TikTok ทั้งหมด</button>` : ""}
    </div>`;
  const btnAll = $("copyAllTT");
  if (btnAll) btnAll.onclick = () => copyText(cardsState.filter(c => c.url).map(c => c.url).join("\n"));

  const tierList = sortedTiers();

  cardsState.forEach((c, i) => {
    if (!c.manual) {
      const n = parseNum(c.followers);
      const mt = isNaN(n) ? null : matchTier(n);
      c.selected = mt ? mt.id : null;
    }
    if (c.selected && !tiers.some(t => t.id === c.selected)) c.selected = null;

    const card = document.createElement("div");
    card.className = "card" + (c.checked ? " checked" : "");
    const title = c.name ? "@" + escapeHtml(c.name) : (c.url ? "TikTok (ลิงก์สั้น)" : "ไม่พบ TikTok");
    const initial = escapeHtml((c.name || c.nick || String(i + 1)).charAt(0));
    const savedTag = isSaved(c) ? `<span class="saved-tag">บันทึกแล้ว</span>` : "";

    let html = `
      <div class="card-head">
        <label class="pick"><input type="checkbox" class="pick-box"> เลือก</label>
        <div class="avatar">${initial}</div>
        <h3><small>คนที่ ${i + 1}${savedTag}</small>${title}</h3>
        <input class="channel-input" placeholder="ชื่อช่อง (ใช้ในข้อความ)">
      </div>
      <div class="item">
        <span class="tag nick">ชื่อเล่น</span>
        <input class="nick-input" placeholder="ไม่พบชื่อเล่น (พิมพ์เองได้)">
        <button class="small outline copy-nick">Copy</button>
      </div>`;

    if (c.url) {
      html += `<div class="item">
        <span class="tag tt">TikTok</span>
        <a href="${escapeHtml(c.url)}" target="_blank" rel="noopener">${escapeHtml(c.url)}</a>
        <button class="small outline" data-copy="${escapeHtml(c.url)}">Copy</button>
      </div>`;
    }

    if (c.lines.length) {
      c.lines.forEach(l => {
        if (l.type === "link") {
          html += `<div class="item">
            <span class="tag line">LINE ลิงก์</span>
            <a href="${escapeHtml(l.value)}" target="_blank" rel="noopener">${escapeHtml(l.value)}</a>
            <button class="small green" data-open="${escapeHtml(l.value)}">เปิด</button>
            <button class="small outline" data-copy="${escapeHtml(l.value)}">Copy</button>
          </div>`;
        } else {
          html += `<div class="item">
            <span class="tag line">LINE ID</span>
            <code>${escapeHtml(l.value)}</code>
            <button class="small outline" data-copy="${escapeHtml(l.value)}">Copy</button>
          </div>`;
        }
      });
    } else {
      html += `<div class="none">ไม่พบ LINE ในคอมเมนต์นี้</div>`;
    }

    html += `
      <div class="follow-area">
        <div class="follow-top">
          <b>ยอดฟอล</b>
          <input class="fol-input" placeholder="เช่น 850 หรือ 12k">
          <span class="fol-hint"></span>
        </div>
        <div class="tier-btns">
          ${tierList.length
            ? tierList.map(t => `<button class="tier-btn" data-tier="${t.id}">${escapeHtml(tierLabel(t))}</button>`).join("")
            : `<span class="no-tier">ยังไม่มีปุ่ม เพิ่มได้ที่ "ตั้งค่าปุ่มยอดฟอลและข้อความทัก"</span>`}
        </div>
        <div class="msg-box">
          <textarea class="msg"></textarea>
          <div class="row"><button class="small copy-msg">Copy ข้อความ</button></div>
        </div>
      </div>`;

    card.innerHTML = html;

    const pickBox = card.querySelector(".pick-box");
    const channelInput = card.querySelector(".channel-input");
    const nickInput = card.querySelector(".nick-input");
    const folInput = card.querySelector(".fol-input");
    const folHint = card.querySelector(".fol-hint");
    const msgBox = card.querySelector(".msg-box");
    const msg = card.querySelector(".msg");
    pickBox.checked = !!c.checked;
    channelInput.value = c.channel;
    nickInput.value = c.nick;
    folInput.value = c.followers;

    const refresh = () => {
      card.querySelectorAll(".tier-btn").forEach(b => b.classList.toggle("active", b.dataset.tier === c.selected));
      const raw = c.followers.trim();
      let h = "", ok = false;
      if (raw) {
        const n = parseNum(raw);
        if (isNaN(n)) h = "พิมพ์เป็นตัวเลข เช่น 850, 12k";
        else {
          const mt = matchTier(n);
          if (mt) { h = `เข้าเงื่อนไขปุ่ม ${tierLabel(mt)}`; ok = true; }
          else h = "ไม่เข้าเงื่อนไขปุ่มไหน เลือกเองได้";
        }
      }
      folHint.textContent = h;
      folHint.classList.toggle("ok", ok);
      const t = tiers.find(t => t.id === c.selected);
      if (t) { msg.value = buildMessage(t.tpl, c); c.msgText = msg.value; msgBox.classList.add("show"); }
      else { c.msgText = ""; msgBox.classList.remove("show"); }
    };

    pickBox.onchange = () => {
      c.checked = pickBox.checked;
      card.classList.toggle("checked", c.checked);
      updateSaveBar();
    };
    card.querySelectorAll("[data-copy]").forEach(b => b.onclick = () => copyText(b.dataset.copy));
    card.querySelectorAll("[data-open]").forEach(b => b.onclick = () => window.open(b.dataset.open, "_blank"));
    card.querySelector(".copy-nick").onclick = () => copyText(nickInput.value.trim());
    card.querySelector(".copy-msg").onclick = () => copyText(msg.value);
    msg.oninput = () => { c.msgText = msg.value; };

    channelInput.oninput = () => { c.channel = channelInput.value.trim(); refresh(); };
    nickInput.oninput = () => { c.nick = nickInput.value.trim(); refresh(); };
    folInput.oninput = () => {
      c.followers = folInput.value;
      c.manual = false;
      const n = parseNum(c.followers);
      const mt = isNaN(n) ? null : matchTier(n);
      c.selected = mt ? mt.id : null;
      refresh();
    };
    card.querySelectorAll(".tier-btn").forEach(b => b.onclick = () => {
      c.selected = c.selected === b.dataset.tier ? null : b.dataset.tier;
      c.manual = true;
      refresh();
    });

    refresh();
    results.appendChild(card);
  });

  updateSaveBar();
}

/* ================= Events ================= */
const inputEl = $("input");
const run = () => { cardsState = parse(inputEl.value); renderCards(); };

$("btnParse").onclick = run;
$("btnClear").onclick = () => { inputEl.value = ""; run(); inputEl.focus(); };
let debounce;
inputEl.addEventListener("input", () => { clearTimeout(debounce); debounce = setTimeout(run, 300); });

$("checkAll").onchange = e => {
  cardsState.forEach(c => { c.checked = e.target.checked; });
  renderCards();
};
$("btnSaveChecked").onclick = saveChecked;

renderTierSettings();
renderCards();
renderSaved();
})();