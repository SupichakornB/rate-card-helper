/* ===== แท็บ: หาอินฟลู ===== */
(() => {
const $ = id => document.getElementById(id);
const inputEl = $("input");
const cleanTail = s => s.replace(/[)\]}>,.;:!?'"…”’]+$/, "");

/* ================= ตั้งค่าแคมเปญ + ยอดฟอล ================= */
const STORE_KEY = "rc_tiers_v2";
const OPS = ["<", "≤", "=", "≥", ">"];
const DEFAULT_TIERS = [
  { title: "แลกสินค้า",   op: "<", value: "500",  tpl: "สวัสดีค่ะช่อง {name} ทางเราสนใจร่วมงานรีวิวสินค้ากับช่องค่ะ เป็นงานแลกสินค้า (Barter) ไม่ทราบว่าสะดวกรับงานไหมคะ" },
  { title: "จ้างรีวิว",    op: "<", value: "1000", tpl: "สวัสดีค่ะช่อง {name} ทางเราสนใจจ้างรีวิวสินค้ากับช่องค่ะ รบกวนขอ Rate Card และรายละเอียดเพิ่มเติมได้ไหมคะ" },
  { title: "แคมเปญใหญ่", op: ">", value: "50k",  tpl: "สวัสดีค่ะช่อง {name} ทางเราสนใจร่วมงานแคมเปญกับช่องค่ะ รบกวนขอ Rate Card แพ็กเกจทั้งหมด และช่วงคิวว่างของเดือนนี้ได้ไหมคะ" }
];

function loadTiers() {
  try {
    const s = JSON.parse(storeGet(STORE_KEY));
    if (Array.isArray(s)) return s.map(t => ({
      id: t.id || uid(), title: t.title || "", op: t.op || ">", value: t.value || "", tpl: t.tpl || ""
    }));
  } catch {}
  const oldKeys = ["500", "1000", "50k"];
  return DEFAULT_TIERS.map((t, i) => ({
    id: uid(), title: t.title, op: t.op, value: t.value,
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

const condText = t => (t.value || "").trim() ? `${t.op} ${t.value.trim()}` : "";
const tierName = t => (t.title || "").trim() || "(ยังไม่ตั้งชื่อ)";
const tierFull = t => tierName(t) + (condText(t) ? ` (ฟอล ${condText(t)})` : "");

function sortedTiers() {
  const v = t => { const n = parseNum(t.value); return isNaN(n) ? Infinity : n; };
  return tiers.slice().sort((a, b) => {
    const va = v(a), vb = v(b);
    if (va !== vb) return va - vb;
    return isFinite(va) ? OPS.indexOf(a.op) - OPS.indexOf(b.op) : 0;
  });
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
    list.innerHTML = `<div class="empty">ยังไม่มีแคมเปญ กด "เพิ่มแคมเปญ" เพื่อสร้างอันแรก</div>`;
    return;
  }
  tiers.forEach((t, idx) => {
    const box = document.createElement("div");
    box.className = "tier-box";
    box.innerHTML = `
      <div class="tier-row">
        <span class="tier-num">แคมเปญ ${idx + 1}</span>
        <input class="cp-title" placeholder="ชื่อแคมเปญ เช่น จ้างรีวิว">
        <button class="small del" type="button">ลบ</button>
      </div>
      <div class="tier-row">
        <span class="sub-label">ยอดฟอล</span>
        <select class="op">${OPS.map(o => `<option ${o === t.op ? "selected" : ""}>${o}</option>`).join("")}</select>
        <input class="val" placeholder="เช่น 500, 10k (เว้นว่างได้)">
        <span class="sub-label">ปุ่มจะแสดงเป็น</span>
        <span class="tier-preview"></span>
        <span class="tier-warn"></span>
      </div>
      <textarea class="tpl" placeholder="ข้อความทักของแคมเปญนี้"></textarea>`;
    const title = box.querySelector(".cp-title");
    const opSel = box.querySelector(".op");
    const val = box.querySelector(".val");
    const tpl = box.querySelector(".tpl");
    const preview = box.querySelector(".tier-preview");
    const warn = box.querySelector(".tier-warn");
    title.value = t.title;
    val.value = t.value;
    tpl.value = t.tpl;

    const refreshPreview = () => {
      preview.textContent = tierFull(t);
      warn.textContent = t.value && isNaN(parseNum(t.value)) ? "ตัวเลขไม่ถูกต้อง" : "";
    };
    refreshPreview();

    title.oninput = () => { t.title = title.value; refreshPreview(); renderCards(); saveTiers(); };
    opSel.onchange = () => { t.op = opSel.value; refreshPreview(); renderCards(); saveTiers(); };
    val.oninput = () => { t.value = val.value.trim(); refreshPreview(); renderCards(); saveTiers(); };
    tpl.oninput = () => { t.tpl = tpl.value; renderCards(); saveTiers(); };

    const delBtn = box.querySelector(".del");
    delBtn.onclick = () => confirmClick(delBtn, "กดอีกครั้งเพื่อลบ", () => {
      tiers = tiers.filter(x => x.id !== t.id);
      renderTierSettings(); renderCards(); saveTiers();
      toast("ลบแคมเปญแล้ว");
    });
    list.appendChild(box);
  });
}

$("btnAddTier").onclick = () => {
  tiers.push({ id: uid(), title: "", op: ">", value: "", tpl: "สวัสดีค่ะช่อง {name} " });
  renderTierSettings(); renderCards(); saveTiers();
  const boxes = document.querySelectorAll("#tierList .tier-box");
  const last = boxes[boxes.length - 1];
  if (last) {
    last.classList.add("new");
    last.scrollIntoView({ behavior: "smooth", block: "center" });
    last.querySelector(".cp-title").focus({ preventScroll: true });
    setTimeout(() => last.classList.remove("new"), 2000);
  }
};

const btnReset = $("btnResetTier");
btnReset.onclick = () => confirmClick(btnReset, "กดอีกครั้งเพื่อยืนยัน", () => {
  tiers = DEFAULT_TIERS.map(t => ({ id: uid(), ...t }));
  renderTierSettings(); renderCards(); saveTiers();
  toast("คืนค่าเริ่มต้นแล้ว");
});

/* ================= แบ่งคอมเมนต์ด้วยบรรทัด · และบรรทัดท้ายคอมเมนต์ ================= */
const SEP_LINE = /^[ \t\u00a0]*[·•‧・∙][ \t\u00a0]*$/;
// บรรทัดท้ายคอมเมนต์ เช่น "1w Reply", "2d Like Reply", "2 สัปดาห์ ตอบกลับ"
const FOOTER_LINE = /^\s*(?:\d+\s*[A-Za-zก-๙.]{1,12}\s*)?(?:(?:like|reply|ตอบกลับ|ถูกใจ|share|แชร์|edited|แก้ไขแล้ว)\s*)+$/i;
// บรรทัดที่ดูเป็นข้อมูล (ไม่ใช่ชื่อเฟส)
const DATA_HINT = /https?:|www\.|\.com|tiktok|ติ๊กต็อก|ไลน์|line\s*id|@|:|：/i;

function splitComments(text) {
  const rows = text.replace(/\r/g, "").split("\n");
  // ไม่มีทั้งบรรทัด · และบรรทัดท้ายคอมเมนต์ = ถือว่าเป็นคอมเมนต์เดียว
  if (!rows.some(r => SEP_LINE.test(r) || FOOTER_LINE.test(r))) return [{ author: "", body: text }];

  const comments = [];
  let author = "", body = [], inSep = false, expectAuthor = false;

  const flush = () => {
    const t = body.join("\n").trim();
    if (t) comments.push({ author, body: t });
    body = [];
  };

  rows.forEach(r => {
    // บรรทัด · : บรรทัดสุดท้ายก่อนหน้าคือชื่อเฟสของคอมเมนต์ถัดไป
    if (SEP_LINE.test(r)) {
      if (!inSep) {
        let j = body.length - 1;
        while (j >= 0 && !body[j].trim()) j--;
        if (j >= 0 && !DATA_HINT.test(body[j])) {
          const next = body[j].trim();
          body.splice(j, 1);
          flush();
          author = next;
        } else if (body.some(x => x.trim())) {
          flush();
          author = "";
        }
      }
      inSep = true;
      expectAuthor = false;
      return;
    }
    inSep = false;

    // บรรทัดท้ายคอมเมนต์ : จบคอมเมนต์นี้ บรรทัดถัดไปคือชื่อเฟสคนใหม่
    if (FOOTER_LINE.test(r)) {
      flush();
      author = "";
      expectAuthor = true;
      return;
    }

    if (expectAuthor && r.trim()) {
      expectAuthor = false;
      if (!DATA_HINT.test(r)) { author = r.trim(); return; }
    }
    body.push(r);
  });
  flush();
  return comments;
}

/* ================= ตรวจจับข้อมูลในคอมเมนต์เดียว ================= */
// ลิงก์แอคเคาท์ TikTok เท่านั้น (tiktok.com/@ชื่อ)
const RE_TT_LINK = /(?:https?:\/\/)?(?:www\.|m\.)?tiktok\.com\/@([A-Za-z0-9._]+)/gi;
// ลิงก์ TikTok ทุกแบบ (รวม vt./vm. ลิงก์โพสต์) ใช้ลบออกก่อนตรวจอย่างอื่น
const RE_ANY_TT_URL = /(?:https?:\/\/)?(?:[a-z0-9]+\.)?tiktok\.com\/\S*/gi;
// พิมพ์ชื่อแอค เช่น "Tiktok: abcd", "TikTok abcd", "ติ๊กต็อก : abcd", "TikTok ID - abcd"
const RE_TT_WORD = /(?<![A-Za-z0-9.\/@])(?:tik[\s\-]?tok|ติ๊กต็อก|ติ๊กต๊อก|ติ๊กตอก|ติกต็อก|ติกตอก)(?![A-Za-z0-9])[ \t]*(?:(?:id|ไอดี|account|acc|ชื่อ|ช่อง)(?![A-Za-z])[ \t]*)?(?:[:：=\-–]\s*|[ \t]+)?@?([A-Za-z0-9_][A-Za-z0-9._]{1,29})/gi;
// แบบย่อ "TT: abcd", "TT @abcd" (ต้องมี : หรือ - หรือ @)
const RE_TT_SHORT = /(?<![A-Za-z0-9.\/@])tt(?![A-Za-z0-9])[ \t]*(?:[:：=\-–][ \t]*@?|@)([A-Za-z0-9_][A-Za-z0-9._]{1,29})/gi;
const TT_IGNORE = new Set(["live","shop","link","id","account","acc","follower","followers","official","com","www","http","https","profile","channel","name","ig","line"]);

const RE_LINE_LINK = /(?:https?:\/\/)?(?:line\.me|lin\.ee)\/[^\s<>"']+/gi;
const RE_LINE_ID = /(?<![A-Za-z])(?:line\s*id|id\s*line|ไอดีไลน์|ไลน์\s*ไอดี|line|ไลน์|ไลน)(?![.\w])\s*(?:id)?\s*[:：=\-–]?\s*(@?[A-Za-z0-9][A-Za-z0-9._\-]{1,29})/gi;
const LINE_IGNORE = new Set(["id","me","for","official","oa","add","contact","http","https","www"]);

// ชื่อเล่นแบบชัดเจน: "ชื่อเล่น : มิ้นท์", "ชื่อมิ้นท์ค่ะ", "Name: Mint"
const RE_NICK = /(?<![A-Za-z])(?:ชื่อเล่น|nick\s*name|เรียกหนูว่า|เรียกเราว่า|เรียกผมว่า|เรียกว่า|ชื่อ|name)(?!\s*[-–]?\s*(?:ช่อง|บัญชี|ผู้ใช้|tik\s*tok|ติ๊ก|ไลน์|line|เพจ|page|จริง|นามสกุล|สกุล|เสียง|ig|ไอจี|account|channel|user|ร้าน|แบรนด์|สินค้า|เฟส|facebook))\s*[:：=\-–]?\s*(?:ว่า|คือ)?\s*([ก-๙A-Za-z]+)/gi;
// เดาชื่อเล่น: "สวัสดีค่ะ มิ้นท์นะคะ"
const RE_GREET_NICK = /(?:สวัสดี|hello|hi)(?:ค่ะ|ครับ|คะ|คับ|ค่า|จ้า|จ้ะ)?[ \t,!.~]*(?:หนู|เรา|ผม|ดิฉัน|เค้า)?[ \t]*(?:ชื่อ)?[ \t]*([ก-๙A-Za-z]{2,20}?)[ \t]*(?:นะ)?[ \t]*(?:คะ|ค่ะ|ครับ|คับ|ค่า|จ้า|จ้ะ)/gi;
// เดาชื่อเล่น: บรรทัดสั้นๆ "มิ้นท์ค่ะ"
const RE_LINE_NICK = /^\s*(?:หนู|เรา|ผม)?(?:ชื่อ)?\s*([ก-๙A-Za-z]{2,15}?)\s*(?:นะ)?\s*(?:คะ|ค่ะ|ครับ|คับ|ค่า|จ้า)\s*[!.~]*\s*$/i;

const PARTICLES = ["นะคะ","นะค่ะ","นะครับ","ได้เลย","ค่ะ","ค่า","คะ","ครับ","คับ","จ้า","จ้ะ","น้า","นะ","เลย"];
const NICK_IGNORE = new Set(["ช่อง","เพจ","บัญชี","ไลน์","ติดต่อ","line","tiktok","id","ig","my","is"]);
// คำที่ไม่ใช่ชื่อแน่ๆ (ใช้ตอนเดา)
const NOT_NAME_WORDS = new Set(["ได้","ได้เลย","มา","รับ","ส่ง","ดู","ขอ","ทัก","สะดวก","ว่าง","พร้อม","หนู","เรา","ผม","ค่ะ","ครับ","สวัสดี","hello","hi","dm","ib","ok","โอเค","ใช่","ไม่","จ้า","เลย","ด้วย","แล้ว","นะ"]);
const NOT_NAME_PART = /สวัสดี|ขอบคุณ|สนใจ|รับงาน|รีวิว|ติดต่อ|ทักมา|ทักไลน์|ฝาก|ยินดี|เรท|ราคา|ไลน์|ติ๊กต็อก|ผู้ติดตาม|ฟอล|แอด|inbox|rate|card|tiktok|line/i;

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
const looksLikeName = n =>
  n && n.length >= 2 && n.length <= 15 && !NOT_NAME_WORDS.has(n.toLowerCase()) && !NOT_NAME_PART.test(n);

function guessNick(text) {
  for (const m of text.matchAll(RE_GREET_NICK)) {
    const n = cleanNick(m[1]);
    if (looksLikeName(n)) return n;
  }
  for (const line of text.split("\n")) {
    const m = line.match(RE_LINE_NICK);
    if (!m) continue;
    const n = cleanNick(m[1]);
    if (looksLikeName(n)) return n;
  }
  return "";
}

function parseComment(body) {
  // --- TikTok ---
  const accounts = [], seen = new Set();
  const addAcc = user => {
    user = user.replace(/\.+$/, "");
    if (user.length < 2) return;
    const k = user.toLowerCase();
    if (seen.has(k) || TT_IGNORE.has(k) || /^\d+(\.\d+)?[km]?$/i.test(user)) return;
    seen.add(k);
    accounts.push({ user, url: "https://www.tiktok.com/@" + user });
  };
  for (const m of body.matchAll(RE_TT_LINK)) addAcc(m[1]);

  // ลบลิงก์ TikTok ทั้งหมด (รวมลิงก์โพสต์ vt./vm.) ออกก่อนตรวจอย่างอื่น
  const text = body.replace(RE_ANY_TT_URL, " ");
  for (const m of text.matchAll(RE_TT_WORD)) addAcc(m[1]);
  for (const m of text.matchAll(RE_TT_SHORT)) addAcc(m[1]);

  // --- LINE ---
  const lines = [], linkRanges = [];
  const hasLine = v => lines.some(l => l.value.toLowerCase() === v.toLowerCase());
  for (const m of text.matchAll(RE_LINE_LINK)) {
    let url = cleanTail(m[0]);
    if (!/^https?:/i.test(url)) url = "https://" + url;
    if (!hasLine(url)) lines.push({ type: "link", value: url });
    linkRanges.push([m.index, m.index + m[0].length]);
  }
  for (const m of text.matchAll(RE_LINE_ID)) {
    if (linkRanges.some(([s, e]) => m.index >= s && m.index < e)) continue;
    const id = cleanTail(m[1]);
    if (LINE_IGNORE.has(id.toLowerCase().replace(/^@/, ""))) continue;
    if (!hasLine(id)) lines.push({ type: "id", value: id });
  }

  // --- ชื่อเล่น ---
  let nick = "", nickGuess = false;
  for (const m of text.matchAll(RE_NICK)) {
    const n = cleanNick(m[1]);
    if (n && !NICK_IGNORE.has(n.toLowerCase())) { nick = n; break; }
  }
  if (!nick) {
    nick = guessNick(text);
    nickGuess = !!nick;
  }

  // --- ยอดฟอล ---
  let followers = "";
  const UNIT = "(?:(k|m|พัน|หมื่น|แสน|ล้าน)(?![A-Za-z]))?";
  const reFol1 = new RegExp("(?:ผู้ติดตาม|ยอดฟอล\\S{0,6}|ฟอลโล\\S{0,4}|ฟอล|followers?)\\s*(?:tik\\s*tok|ติ๊กต็อก)?\\s*[:：=\\-–]?\\s*(?:ประมาณ|กว่า|เกือบ|~|≈)?\\s*(\\d[\\d,]*(?:\\.\\d+)?)\\s*" + UNIT, "i");
  const reFol2 = new RegExp("(\\d[\\d,]*(?:\\.\\d+)?)\\s*" + UNIT + "\\s*(?:ผู้ติดตาม|followers?|ฟอล)", "i");
  const fm = text.match(reFol1) || text.match(reFol2);
  if (fm) followers = fm[1].replace(/,/g, "") + (fm[2] || "");

  return { accounts, lines, nick, nickGuess, followers };
}

/* ================= Parser หลัก ================= */
let skippedCount = 0;

function parse(text) {
  const cards = [];
  const byUser = new Map();
  skippedCount = 0;

  splitComments(text).forEach(cm => {
    const info = parseComment(cm.body);

    // ไม่มี TikTok (เช่น ส่งเรทการ์ดเป็นรูป) = ข้ามทั้งคอมเมนต์
    if (!info.accounts.length) { skippedCount++; return; }

    // คนเดิมคอมเมนต์ซ้ำ = รวมข้อมูลเข้าการ์ดเดิม
    const exist = info.accounts.map(a => byUser.get(a.user.toLowerCase())).find(Boolean);
    if (exist) {
      info.accounts.forEach(a => {
        if (!exist.accounts.some(x => x.user.toLowerCase() === a.user.toLowerCase())) exist.accounts.push(a);
        byUser.set(a.user.toLowerCase(), exist);
      });
      info.lines.forEach(l => {
        if (!exist.lines.some(x => x.value.toLowerCase() === l.value.toLowerCase())) exist.lines.push(l);
      });
      if (!exist.nick && info.nick) { exist.nick = info.nick; exist.nickGuess = info.nickGuess; }
      if (!exist.followers && info.followers) exist.followers = info.followers;
      if (!exist.fbName && cm.author) exist.fbName = cm.author;
      return;
    }

    const main = info.accounts[0];
    const card = {
      accounts: info.accounts,
      url: main.url,
      name: main.user,
      fbName: cm.author || "",
      lines: info.lines,
      nick: info.nick,
      nickGuess: info.nickGuess,
      followers: info.followers,
      channel: main.user,
      manual: false,
      msgText: "",
      selected: null
    };
    const n = parseNum(card.followers);
    const mt = isNaN(n) ? null : matchTier(n);
    card.selected = mt ? mt.id : null;

    cards.push(card);
    info.accounts.forEach(a => byUser.set(a.user.toLowerCase(), card));
  });
  return cards;
}

/* ================= รายการที่เลือก ================= */
const SAVED_KEY = "rc_saved_v1";
let saved = (() => {
  try { const s = JSON.parse(storeGet(SAVED_KEY)); return Array.isArray(s) ? s : []; }
  catch { return []; }
})();

// ชื่อแอค TikTok ของรายการที่เลือก (รองรับข้อมูลเก่าที่เก็บแค่ลิงก์)
const entryUsers = s => {
  if (Array.isArray(s.accounts) && s.accounts.length) return s.accounts.map(u => String(u).toLowerCase());
  const m = (s.tiktok || "").match(/@([A-Za-z0-9._]+)/);
  return m ? [m[1].replace(/\.+$/, "").toLowerCase()] : [];
};
let pickedSet = new Set();
const refreshPickedSet = () => { pickedSet = new Set(saved.flatMap(entryUsers)); };
const isPicked = c => c.accounts.some(a => pickedSet.has(a.user.toLowerCase()));
refreshPickedSet();

function commitSaved() {
  storeSet(SAVED_KEY, JSON.stringify(saved));
  refreshPickedSet();
  renderSaved();
  renderCards();
}

const fmtDate = ts => new Date(ts).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" });

function snapshot(c) {
  const t = tiers.find(t => t.id === c.selected);
  return {
    id: uid(),
    savedAt: Date.now(),
    fbName: c.fbName || "",
    nick: c.nick || "",
    channel: c.channel || "",
    tiktok: c.url || "",
    accounts: c.accounts.map(a => a.user),
    lines: c.lines.map(l => ({ type: l.type, value: l.value })),
    followers: (c.followers || "").trim(),
    tier: t ? tierFull(t) : "",
    message: t ? (c.msgText || buildMessage(t.tpl, c)) : ""
  };
}

function pickCards(list) {
  if (!list.length) return;
  list.forEach(c => {
    const snap = snapshot(c);
    const users = new Set(snap.accounts.map(u => u.toLowerCase()));
    const idx = saved.findIndex(s => entryUsers(s).some(u => users.has(u)));
    if (idx >= 0) { snap.id = saved[idx].id; saved[idx] = snap; }
    else saved.push(snap);
  });
  commitSaved();

  const fab = $("saveFab");
  fab.classList.remove("bump"); void fab.offsetWidth; fab.classList.add("bump");
  toast(list.length === 1
    ? `เพิ่ม @${list[0].name} เข้ารายการที่เลือกแล้ว`
    : `เพิ่ม ${list.length} คนเข้ารายการที่เลือกแล้ว`, 2000);
}

function savedToText() {
  return saved.map((s, i) => [
    `คนที่ ${i + 1}`,
    `ชื่อเฟส: ${s.fbName || "-"}`,
    `ชื่อเล่น: ${s.nick || "-"}`,
    `ชื่อช่อง: ${s.channel || "-"}`,
    `TikTok: ${entryUsers(s).length ? entryUsers(s).map(u => "https://www.tiktok.com/@" + u).join(", ") : "-"}`,
    `LINE: ${s.lines.length ? s.lines.map(l => l.value).join(", ") : "-"}`,
    `ยอดฟอล: ${s.followers || "-"}`,
    `แคมเปญ: ${s.tier || "-"}`,
    `ข้อความทัก: ${s.message || "-"}`
  ].join("\n")).join("\n\n");
}

function downloadCsv() {
  if (!saved.length) { toast("ยังไม่มีรายการที่เลือก"); return; }
  const esc = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = ["คนที่","ชื่อเฟส","ชื่อเล่น","ชื่อช่อง","TikTok","LINE","ยอดฟอล","แคมเปญ","ข้อความทัก","เลือกเมื่อ"];
  const rows = saved.map((s, i) => [
    i + 1, s.fbName, s.nick, s.channel,
    entryUsers(s).map(u => "https://www.tiktok.com/@" + u).join(" , "),
    s.lines.map(l => l.value).join(" , "),
    s.followers, s.tier, s.message, fmtDate(s.savedAt)
  ].map(esc).join(","));
  const csv = "\uFEFF" + [head.map(esc).join(","), ...rows].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "ratecard-selected.csv";
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
    list.innerHTML = `<div class="empty">ยังไม่มีรายการที่เลือก<br>กด "เลือกคนนี้" ที่การ์ดในผลลัพธ์</div>`;
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
        <span class="s-date">เลือกเมื่อ ${escapeHtml(fmtDate(s.savedAt))}</span>
        <button class="small del s-del">ลบ</button>
      </div>`;
    h += row("ชื่อเฟส", s.fbName ? escapeHtml(s.fbName) : dash);
    h += row("ชื่อเล่น", s.nick ? escapeHtml(s.nick) : dash, copyBtn(s.nick));
    h += row("ชื่อช่อง", s.channel ? escapeHtml(s.channel) : dash, copyBtn(s.channel));
    const users = entryUsers(s);
    if (users.length) {
      users.forEach(u => {
        const url = "https://www.tiktok.com/@" + u;
        h += row("TikTok", `<a href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(url)}</a>`, copyBtn(url));
      });
    } else {
      h += row("TikTok", dash);
    }
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
    h += row("แคมเปญ", s.tier ? escapeHtml(s.tier) : dash);
    h += row("ข้อความทัก", s.message ? escapeHtml(s.message) : dash, copyBtn(s.message));
    el.innerHTML = h;

    el.querySelectorAll("[data-copy]").forEach(b => b.onclick = () => copyText(b.dataset.copy));
    el.querySelectorAll("[data-open]").forEach(b => b.onclick = () => window.open(b.dataset.open, "_blank"));
    const del = el.querySelector(".s-del");
    del.onclick = () => confirmClick(del, "กดอีกครั้งเพื่อลบ", () => {
      saved = saved.filter(x => x.id !== s.id);
      commitSaved();
      toast("ลบออกจากรายการแล้ว");
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
  saved.length ? copyText(savedToText(), `คัดลอกแล้ว ${saved.length} คน`) : toast("ยังไม่มีรายการที่เลือก");
$("btnCsv").onclick = downloadCsv;
const btnClearSaved = $("btnClearSaved");
btnClearSaved.onclick = () => {
  if (!saved.length) { toast("ยังไม่มีรายการที่เลือก"); return; }
  confirmClick(btnClearSaved, "กดอีกครั้งเพื่อล้าง", () => {
    saved = [];
    commitSaved();
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

function tierButtonHtml(t) {
  const cond = condText(t);
  return `<button class="tier-btn" data-tier="${t.id}">
      <span class="tb-title">${escapeHtml(tierName(t))}</span>
      ${cond ? `<span class="tb-sub">(ฟอล ${escapeHtml(cond)})</span>` : ""}
    </button>`;
}

function updateBar(visible) {
  const bar = $("saveBar");
  if (!visible.length) { bar.style.display = "none"; return; }
  bar.style.display = "flex";
  $("checkCount").innerHTML = `แสดงอยู่ <b>${visible.length}</b> คน`;
  $("btnPickAll").textContent = `เลือกทั้งหมด (${visible.length})`;
}

function renderCards() {
  const results = $("results");
  const summary = $("summary");
  results.innerHTML = "";

  const visible = cardsState.filter(c => !isPicked(c));
  const hidden = cardsState.length - visible.length;

  if (!inputEl.value.trim()) {
    summary.innerHTML = `<div class="empty">วางคอมเมนต์ด้านบน แล้วผลจะแสดงตรงนี้</div>`;
    updateBar(visible);
    return;
  }

  const chips = [`<span class="chip">พบ <b>${visible.length}</b> คน</span>`];
  if (hidden) chips.push(`<span class="chip">ซ่อน <b>${hidden}</b> คน (อยู่ในรายการที่เลือกแล้ว)</span>`);
  if (skippedCount) chips.push(`<span class="chip muted">ข้าม <b>${skippedCount}</b> คอมเมนต์ (ไม่มี TikTok)</span>`);
  if (visible.length > 1) chips.push(`<button class="small outline" id="copyAllTT">Copy ลิงก์ TikTok ทั้งหมด</button>`);
  summary.innerHTML = `<div class="chips">${chips.join("")}</div>`;
  const btnAll = $("copyAllTT");
  if (btnAll) btnAll.onclick = () => copyText(visible.map(c => c.url).join("\n"));

  if (!visible.length) {
    results.innerHTML = `<div class="empty">${cardsState.length
      ? "ทุกคนในคอมเมนต์ที่วางอยู่ในรายการที่เลือกแล้ว"
      : "ไม่พบ TikTok ในคอมเมนต์ที่วาง"}</div>`;
    updateBar(visible);
    return;
  }

  const tierList = sortedTiers();

  visible.forEach((c, i) => {
    if (!c.manual) {
      const n = parseNum(c.followers);
      const mt = isNaN(n) ? null : matchTier(n);
      c.selected = mt ? mt.id : null;
    }
    if (c.selected && !tiers.some(t => t.id === c.selected)) c.selected = null;

    const card = document.createElement("div");
    card.className = "card";
    const initial = escapeHtml(c.name.charAt(0));
    const fb = c.fbName ? ` · เฟส: <span class="fb">${escapeHtml(c.fbName)}</span>` : "";

    let html = `
      <div class="card-head">
        <div class="avatar">${initial}</div>
        <h3><small>คนที่ ${i + 1}${fb}</small>@${escapeHtml(c.name)}</h3>
        <input class="channel-input" placeholder="ชื่อช่อง (ใช้ในข้อความ)">
        <button class="small pick-btn">เลือกคนนี้</button>
      </div>
            ${c.accounts.length > 1 ? `<div style="margin-top:8px"><span class="caution">คอมเมนต์นี้มี TikTok ${c.accounts.length} แอค ข้อมูลของหลายคนอาจปนกัน ควรตรวจสอบ</span></div>` : ""}
      <div class="item">
        <span class="tag nick">ชื่อเล่น</span>
        <input class="nick-input" placeholder="ไม่มีข้อมูลชื่อเล่นในคอมเมนต์นี้ (พิมพ์เองได้)">
        ${c.nickGuess ? `<span class="caution" title="เดาจากคำลงท้าย ค่ะ/ครับ ควรตรวจสอบอีกครั้ง">อาจผิดพลาด</span>` : ""}
        <button class="small outline copy-nick">Copy</button>
      </div>`;

    c.accounts.forEach((a, k) => {
      html += `<div class="item">
        <span class="tag tt">TikTok${c.accounts.length > 1 ? " " + (k + 1) : ""}</span>
        <a href="${escapeHtml(a.url)}" target="_blank" rel="noopener">${escapeHtml(a.url)}</a>
        <button class="small outline" data-copy="${escapeHtml(a.url)}">Copy</button>
      </div>`;
    });

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
      html += `<div class="none">ไม่มีข้อมูล LINE ในคอมเมนต์นี้</div>`;
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
            ? tierList.map(tierButtonHtml).join("")
            : `<span class="no-tier">ยังไม่มีแคมเปญ เพิ่มได้ที่ "ตั้งค่าแคมเปญและข้อความทัก"</span>`}
        </div>
        <div class="msg-box">
          <textarea class="msg"></textarea>
          <div class="row"><button class="small copy-msg">Copy ข้อความ</button></div>
        </div>
      </div>`;

    card.innerHTML = html;

    const channelInput = card.querySelector(".channel-input");
    const nickInput = card.querySelector(".nick-input");
    const folInput = card.querySelector(".fol-input");
    const folHint = card.querySelector(".fol-hint");
    const msgBox = card.querySelector(".msg-box");
    const msg = card.querySelector(".msg");
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
          if (mt) { h = `เข้าเงื่อนไข ${tierFull(mt)}`; ok = true; }
          else h = "ไม่เข้าเงื่อนไขแคมเปญไหน เลือกเองได้";
        }
      }
      folHint.textContent = h;
      folHint.classList.toggle("ok", ok);
      const t = tiers.find(t => t.id === c.selected);
      if (t) { msg.value = buildMessage(t.tpl, c); c.msgText = msg.value; msgBox.classList.add("show"); }
      else { c.msgText = ""; msgBox.classList.remove("show"); }
    };

    card.querySelector(".pick-btn").onclick = () => pickCards([c]);
    card.querySelectorAll("[data-copy]").forEach(b => b.onclick = () => copyText(b.dataset.copy));
    card.querySelectorAll("[data-open]").forEach(b => b.onclick = () => window.open(b.dataset.open, "_blank"));
    card.querySelector(".copy-nick").onclick = () => copyText(nickInput.value.trim());
    card.querySelector(".copy-msg").onclick = () => copyText(msg.value);
    msg.oninput = () => { c.msgText = msg.value; };

    channelInput.oninput = () => { c.channel = channelInput.value.trim(); refresh(); };
    nickInput.oninput = () => {
      c.nick = nickInput.value.trim();
      if (c.nickGuess) {             // แก้เองแล้ว เอาป้ายเตือนออก
        c.nickGuess = false;
        card.querySelector(".caution")?.remove();
      }
      refresh();
    };
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

  updateBar(visible);
}

/* ================= Events ================= */
const run = () => { cardsState = parse(inputEl.value); renderCards(); };

$("btnParse").onclick = run;
$("btnClear").onclick = () => { inputEl.value = ""; run(); inputEl.focus(); };
let debounce;
inputEl.addEventListener("input", () => { clearTimeout(debounce); debounce = setTimeout(run, 300); });

const btnPickAll = $("btnPickAll");
btnPickAll.onclick = () => {
  const v = cardsState.filter(c => !isPicked(c));
  if (!v.length) { toast("ไม่มีคนให้เลือก"); return; }
  confirmClick(btnPickAll, `กดอีกครั้งเพื่อเลือก ${v.length} คน`, () => pickCards(v));
};

renderTierSettings();
renderSaved();
renderCards();
})();