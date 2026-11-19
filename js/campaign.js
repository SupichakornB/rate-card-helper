/* ===== แท็บ: For Campaign ===== */
(() => {
const $ = id => document.getElementById(id);

// ถ้าแคมเปญเดิมไม่ขึ้นหลังอัปเดต ให้เปลี่ยน CP_KEY เป็นชื่อ key ที่ไฟล์ campaign.js เดิมใช้
const CP_KEY = "cp_campaigns_v1";
const FIELD_KEY = "cp_fields_v1";

const DEFAULT_FIELDS = [
  { key: "name", label: "ชื่อแอค", placeholder: "เช่น mint.review" },
  { key: "link", label: "ลิงก์", placeholder: "https://..." }
];
const DEFAULT_CAMPAIGNS = [
  { title: "รีวิวสินค้า", normal: "สวัสดีค่ะช่อง {name} ({link}) ทางเราสนใจร่วมงานรีวิวสินค้ากับช่องค่ะ ไม่ทราบว่าสะดวกรับงานไหมคะ", email: "" }
];

const loadList = (key, fallback) => {
  try { const v = JSON.parse(storeGet(key)); if (Array.isArray(v)) return v; } catch {}
  return fallback;
};

/* ================= ช่องข้อมูลบัญชี ================= */
let fields = loadList(FIELD_KEY, DEFAULT_FIELDS).map(f => ({
  id: f.id || uid(), key: f.key, label: f.label, placeholder: f.placeholder || "", value: ""
}));

const saveFields = () =>
  storeSet(FIELD_KEY, JSON.stringify(fields.map(({ id, key, label, placeholder }) => ({ id, key, label, placeholder }))));

function renderFields() {
  const box = $("cpFields");
  box.innerHTML = "";
  if (!fields.length) {
    box.innerHTML = `<div class="empty">ยังไม่มีช่องข้อมูล กด "+ เพิ่มช่อง"</div>`;
    return;
  }
  fields.forEach(f => {
    const el = document.createElement("div");
    el.className = "cp-field";
    el.innerHTML = `
      <div class="cp-field-head">
        <span class="cp-field-label"></span>
        <code></code>
        <button type="button" class="small plain cp-field-del">ลบช่อง</button>
      </div>
      <input class="cp-field-val">`;
    el.querySelector(".cp-field-label").textContent = f.label;
    el.querySelector("code").textContent = `{${f.key}}`;
    const inp = el.querySelector(".cp-field-val");
    inp.value = f.value || "";
    inp.placeholder = f.placeholder || `กรอก${f.label}`;
    inp.oninput = () => { f.value = inp.value; renderResult(); };

    const del = el.querySelector(".cp-field-del");
    del.onclick = () => confirmClick(del, "กดอีกครั้งเพื่อลบ", () => {
      fields = fields.filter(x => x.id !== f.id);
      saveFields(); renderFields(); renderVars(); renderResult();
      toast(`ลบช่อง ${f.label} แล้ว`);
    });
    box.appendChild(el);
  });
}

function renderVars() {
  const box = $("cpVars");
  box.innerHTML = `<span class="hint">ตัวแปรในข้อความ:</span>` + (fields.length
    ? fields.map(f => `<code>{${escapeHtml(f.key)}}</code><span class="hint">${escapeHtml(f.label)}</span>`).join("")
    : `<span class="hint">ยังไม่มี เพิ่มได้ที่ "+ เพิ่มช่อง" ในข้อมูลบัญชี</span>`);
}

/* --- ฟอร์มเพิ่มช่อง --- */
const addForm = $("cpAddFieldForm");
const showAddForm = show => {
  addForm.style.display = show ? "flex" : "none";
  if (show) { $("cpNewLabel").value = ""; $("cpNewKey").value = ""; $("cpNewLabel").focus(); }
};
$("cpAddField").onclick = () => showAddForm(addForm.style.display === "none");
$("cpAddFieldCancel").onclick = () => showAddForm(false);

function addField() {
  const label = $("cpNewLabel").value.trim();
  const key = $("cpNewKey").value.trim().replace(/^\{+|\}+$/g, "");
  if (!label) { toast("ใส่ชื่อช่องก่อน เช่น ชื่อเล่น"); return; }
  if (!key) { toast("ใส่ตัวแปรก่อน เช่น nick"); return; }
  if (!/^[A-Za-z0-9_ก-๙]+$/.test(key)) { toast("ตัวแปรใช้ได้เฉพาะตัวอักษร ตัวเลข และ _ (ห้ามเว้นวรรค)"); return; }
  if (fields.some(f => f.key.toLowerCase() === key.toLowerCase())) { toast(`มีตัวแปร {${key}} อยู่แล้ว`); return; }

  fields.push({ id: uid(), key, label, placeholder: "", value: "" });
  saveFields(); renderFields(); renderVars(); renderResult();
  showAddForm(false);
  toast(`เพิ่มช่อง ${label} แล้ว ใช้ {${key}} ในข้อความได้เลย`, 3000);
}
$("cpAddFieldOk").onclick = addField;
["cpNewLabel", "cpNewKey"].forEach(id =>
  $(id).addEventListener("keydown", e => { if (e.key === "Enter") addField(); }));

$("cpClear").onclick = () => {
  fields.forEach(f => { f.value = ""; });
  renderFields(); renderResult();
  toast("ล้างช่องแล้ว");
};

/* ================= แคมเปญ ================= */
/* ===== โหลดแคมเปญ + กู้แคมเปญจากเวอร์ชันเก่าอัตโนมัติ ===== */
const MIGRATED_KEY = "cp_migrated_v1";
const SKIP_KEYS = new Set([CP_KEY, FIELD_KEY, "rc_tiers_v2", "rc_saved_v1", MIGRATED_KEY]);
const pickStr = (o, names) => {
  for (const n of names) if (typeof o[n] === "string" && o[n].trim()) return o[n];
  return "";
};

// แปลงข้อมูลแคมเปญรูปแบบเก่าให้เป็นรูปแบบใหม่
function normalizeOld(o) {
  if (!o || typeof o !== "object") return null;
  if ("op" in o || "savedAt" in o || ("key" in o && "label" in o)) return null; // ข้ามข้อมูลแท็บอื่น
  const title = pickStr(o, ["title", "name", "label", "campaign", "campaignName"]);
  const normal = pickStr(o, ["normal", "tpl", "template", "msg", "message", "text", "content", "body", "normalTpl", "tplNormal"]);
  const email = pickStr(o, ["email", "emailTpl", "tplEmail", "mail", "emailMsg", "emailText"]);
  if (!normal && !email) return null;
  return { id: o.id || uid(), title, normal, email };
}

// ค้นทุก key ในเบราว์เซอร์ เพื่อหาแคมเปญชุดเดิม
function findOldCampaigns() {
  let keys = [];
  try { keys = Object.keys(localStorage); } catch { return []; }
  let best = [], bestScore = -1;
  keys.forEach(k => {
    if (SKIP_KEYS.has(k)) return;
    let v;
    try { v = JSON.parse(localStorage.getItem(k)); } catch { return; }
    const arrays = Array.isArray(v) ? [v]
      : (v && typeof v === "object" ? Object.values(v).filter(Array.isArray) : []);
    arrays.forEach(arr => {
      const list = arr.map(normalizeOld).filter(Boolean);
      if (!list.length || list.length < arr.length / 2) return;
      const score = list.length + (/cp|camp/i.test(k) ? 100 : 0);
      if (score > bestScore) { bestScore = score; best = list; }
    });
  });
  return best;
}

const sameCp = (a, b) =>
  (a.title || "").trim() === (b.title || "").trim() && (a.normal || "").trim() === (b.normal || "").trim();
const isDefaultCp = c => DEFAULT_CAMPAIGNS.some(d => sameCp(c, d));

let campaigns = loadList(CP_KEY, []).map(c => ({
  id: c.id || uid(), title: c.title || "", normal: c.normal || "", email: c.email || ""
}));

// ยังไม่เคยกู้ ให้หาแคมเปญเดิมแล้วรวมกับที่มีอยู่ (ไม่ลบอะไรทิ้ง)
if (storeGet(MIGRATED_KEY) !== "1") {
  const old = findOldCampaigns();
  if (old.length) {
    const mine = campaigns.filter(c => !isDefaultCp(c) && !old.some(o => sameCp(o, c)));
    campaigns = [...old, ...mine];
    storeSet(CP_KEY, JSON.stringify(campaigns));
    storeSet(MIGRATED_KEY, "1");
    setTimeout(() => toast(`กู้คืนแคมเปญเดิม ${old.length} อันแล้ว`, 3500), 300);
  }
}

// ใช้แคมเปญตัวอย่างเฉพาะตอนที่ไม่เคยมีข้อมูลเลยจริงๆ
if (!campaigns.length && storeGet(CP_KEY) == null) {
  campaigns = DEFAULT_CAMPAIGNS.map(c => ({ id: uid(), ...c }));
}
let selectedId = null;
let mode = "normal";

const saveCampaigns = () => {
  if (storeSet(CP_KEY, JSON.stringify(campaigns))) flashSaved($("cpSavedFlag"));
};
const cpName = c => (c.title || "").trim() || "(ยังไม่ตั้งชื่อ)";

function renderSettings() {
  const list = $("cpList");
  list.innerHTML = "";
  if (!campaigns.length) {
    list.innerHTML = `<div class="empty">ยังไม่มีแคมเปญ กด "เพิ่มแคมเปญ" เพื่อสร้างอันแรก</div>`;
    return;
  }
  campaigns.forEach((c, idx) => {
    const box = document.createElement("div");
    box.className = "tier-box";
    box.innerHTML = `
      <div class="tier-row">
        <span class="tier-num">แคมเปญ ${idx + 1}</span>
        <input class="cp-title" placeholder="ชื่อแคมเปญ เช่น รีวิวสกินแคร์">
        <button class="small del" type="button">ลบ</button>
      </div>
      <span class="sub-label">ข้อความปกติ</span>
      <textarea class="tpl-normal" placeholder="ข้อความปกติ"></textarea>
      <span class="sub-label">ข้อความ Email (เว้นว่างได้)</span>
      <textarea class="tpl-email" placeholder="ข้อความสำหรับส่ง Email"></textarea>`;
    const title = box.querySelector(".cp-title");
    const normal = box.querySelector(".tpl-normal");
    const email = box.querySelector(".tpl-email");
    title.value = c.title;
    normal.value = c.normal;
    email.value = c.email;

    title.oninput = () => { c.title = title.value; renderButtons(); saveCampaigns(); };
    normal.oninput = () => { c.normal = normal.value; renderResult(); saveCampaigns(); };
    email.oninput = () => { c.email = email.value; renderResult(); saveCampaigns(); };

    const del = box.querySelector(".del");
    del.onclick = () => confirmClick(del, "กดอีกครั้งเพื่อลบ", () => {
      campaigns = campaigns.filter(x => x.id !== c.id);
      if (selectedId === c.id) selectedId = null;
      renderSettings(); renderButtons(); renderResult(); saveCampaigns();
      toast("ลบแคมเปญแล้ว");
    });
    list.appendChild(box);
  });
}

$("cpAdd").onclick = () => {
  campaigns.push({ id: uid(), title: "", normal: "สวัสดีค่ะช่อง {name} ", email: "" });
  renderSettings(); renderButtons(); saveCampaigns();
  const boxes = document.querySelectorAll("#cpList .tier-box");
  const last = boxes[boxes.length - 1];
  if (last) {
    last.classList.add("new");
    last.scrollIntoView({ behavior: "smooth", block: "center" });
    last.querySelector(".cp-title").focus({ preventScroll: true });
    setTimeout(() => last.classList.remove("new"), 2000);
  }
};

function renderButtons() {
  const box = $("cpBtns");
  if (!campaigns.length) {
    box.innerHTML = `<span class="no-tier">ยังไม่มีแคมเปญ เพิ่มได้ที่ "ตั้งค่าแคมเปญและข้อความ"</span>`;
    return;
  }
  box.innerHTML = campaigns.map(c =>
    `<button class="tier-btn${c.id === selectedId ? " active" : ""}" data-id="${c.id}">
      <span class="tb-title">${escapeHtml(cpName(c))}</span>
    </button>`).join("");
  box.querySelectorAll(".tier-btn").forEach(b => b.onclick = () => {
    selectedId = selectedId === b.dataset.id ? null : b.dataset.id;
    renderButtons(); renderResult();
  });
}

/* ================= ผลลัพธ์ข้อความ ================= */
function fill(tpl) {
  let out = tpl || "";
  fields.forEach(f => { out = out.split(`{${f.key}}`).join((f.value || "").trim()); });
  return out.replace(/[ \t]{2,}/g, " ");
}

function renderResult() {
  const box = $("cpResult");
  const c = campaigns.find(x => x.id === selectedId);
  if (!c) { box.classList.remove("show"); return; }
  box.classList.add("show");

  document.querySelectorAll("#cpMode button").forEach(b => b.classList.toggle("active", b.dataset.mode === mode));
  $("cpModeLabel").textContent = mode === "email" ? "ข้อความสำหรับ Email" : "ข้อความปกติ";

  const tpl = mode === "email" ? c.email : c.normal;
  $("cpMsg").value = fill(tpl);

  const warns = [];
  if (mode === "email" && !c.email.trim()) warns.push("แคมเปญนี้ยังไม่ได้ตั้งข้อความ Email");
  const used = [...new Set([...(tpl || "").matchAll(/\{([^{}\s]+)\}/g)].map(m => m[1]))];
  const empty = used
    .map(k => fields.find(f => f.key === k))
    .filter(f => f && !(f.value || "").trim())
    .map(f => f.label);
  const unknown = used.filter(k => !fields.some(f => f.key === k));
  if (empty.length) warns.push(`ยังไม่ได้กรอก: ${empty.join(", ")}`);
  if (unknown.length) warns.push(`ไม่มีช่องสำหรับ ${unknown.map(k => `{${k}}`).join(", ")}`);
  $("cpWarn").textContent = warns.join(" | ");
}

document.querySelectorAll("#cpMode button").forEach(b => b.onclick = () => {
  mode = b.dataset.mode;
  renderResult();
});
$("cpCopy").onclick = () => {
  const text = $("cpMsg").value.trim();
  text ? copyText(text) : toast("ยังไม่มีข้อความ");
};

renderFields();
renderVars();
renderSettings();
renderButtons();
renderResult();
})();