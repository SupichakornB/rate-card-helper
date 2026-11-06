/* ===== แท็บ: For Campaign ===== */
(() => {
const $ = id => document.getElementById(id);
const STORE_KEY = "rc_campaigns_v1";

const DEFAULT_CAMPAIGNS = [
  { title: "ยืนยันรับงาน", tpl: "สวัสดีค่ะ {name} ขอบคุณที่ร่วมแคมเปญกับเรานะคะ รายละเอียดแคมเปญดูได้ที่ลิงก์นี้ค่ะ {link}" },
  { title: "ส่งบรีฟ",      tpl: "สวัสดีค่ะ {name} ทางเราส่งบรีฟงานให้ตามลิงก์นี้นะคะ {link} หากมีข้อสงสัยสอบถามได้เลยค่ะ" },
  { title: "ติดตามงาน",    tpl: "สวัสดีค่ะ {name} ขอติดตามความคืบหน้าของคลิปนะคะ ส่งลิงก์คลิปได้ที่นี่ค่ะ {link}" }
];

function load() {
  try {
    const s = JSON.parse(storeGet(STORE_KEY));
    if (Array.isArray(s)) return s.map(c => ({ id: c.id || uid(), title: c.title || "", tpl: c.tpl || "" }));
  } catch {}
  return DEFAULT_CAMPAIGNS.map(c => ({ id: uid(), ...c }));
}
let campaigns = load();
let selectedId = null;

const save = () => { if (storeSet(STORE_KEY, JSON.stringify(campaigns))) flashSaved($("cpSavedFlag")); };
const label = c => c.title.trim() || "(ยังไม่ตั้งชื่อ)";

function buildMessage(tpl) {
  return tpl
    .replaceAll("{name}", $("cpName").value.trim())
    .replaceAll("{link}", $("cpLink").value.trim())
    .replace(/[ \t]{2,}/g, " ");
}

/* ---------- ตั้งค่าแคมเปญ ---------- */
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
        <input class="cp-title" placeholder="ชื่อแคมเปญสั้นๆ เช่น ส่งบรีฟ">
        <button class="small del">ลบ</button>
      </div>
      <textarea class="tpl" placeholder="ข้อความของแคมเปญนี้ ใช้ {name} และ {link} ได้"></textarea>`;
    const title = box.querySelector(".cp-title");
    const tpl = box.querySelector(".tpl");
    title.value = c.title;
    tpl.value = c.tpl;

    title.oninput = () => { c.title = title.value; renderButtons(); save(); };
    tpl.oninput = () => { c.tpl = tpl.value; renderResult(); save(); };

    const del = box.querySelector(".del");
    del.onclick = () => confirmClick(del, "กดอีกครั้งเพื่อลบ", () => {
      campaigns = campaigns.filter(x => x.id !== c.id);
      if (selectedId === c.id) selectedId = null;
      renderSettings(); renderButtons(); save();
      toast("ลบแคมเปญแล้ว");
    });
    list.appendChild(box);
  });
}

/* ---------- ปุ่มเลือกแคมเปญ ---------- */
function renderButtons() {
  const wrap = $("cpBtns");
  wrap.innerHTML = "";
  if (!campaigns.length) {
    wrap.innerHTML = `<span class="no-tier">ยังไม่มีแคมเปญ เพิ่มได้ที่ "ตั้งค่าแคมเปญและข้อความ"</span>`;
  }
  campaigns.forEach(c => {
    const b = document.createElement("button");
    b.className = "tier-btn" + (c.id === selectedId ? " active" : "");
    b.textContent = label(c);
    b.onclick = () => {
      selectedId = selectedId === c.id ? null : c.id;
      renderButtons();
    };
    wrap.appendChild(b);
  });
  renderResult();
}

/* ---------- ผลลัพธ์ ---------- */
function renderResult() {
  const box = $("cpResult");
  const c = campaigns.find(x => x.id === selectedId);
  if (!c) { box.classList.remove("show"); return; }

  $("cpMsg").value = buildMessage(c.tpl);
  box.classList.add("show");

  const missing = [];
  if (c.tpl.includes("{name}") && !$("cpName").value.trim()) missing.push("ชื่อแอค");
  if (c.tpl.includes("{link}") && !$("cpLink").value.trim()) missing.push("ลิงก์");
  $("cpWarn").textContent = missing.length ? `ยังไม่ได้กรอก${missing.join(" และ ")}` : "";
}

/* ---------- Events ---------- */
$("cpName").oninput = renderResult;
$("cpLink").oninput = renderResult;
$("cpClear").onclick = () => {
  $("cpName").value = ""; $("cpLink").value = "";
  renderResult(); $("cpName").focus();
};
$("cpCopy").onclick = () => copyText($("cpMsg").value);

$("cpAdd").onclick = () => {
  campaigns.push({ id: uid(), title: "", tpl: "สวัสดีค่ะ {name} " });
  renderSettings(); renderButtons(); save();
  const boxes = document.querySelectorAll("#cpList .tier-box");
  const last = boxes[boxes.length - 1];
  if (last) {
    last.classList.add("new");
    last.scrollIntoView({ behavior: "smooth", block: "center" });
    last.querySelector(".cp-title").focus({ preventScroll: true });
    setTimeout(() => last.classList.remove("new"), 2000);
  }
};

const btnReset = $("cpReset");
btnReset.onclick = () => confirmClick(btnReset, "กดอีกครั้งเพื่อยืนยัน", () => {
  campaigns = DEFAULT_CAMPAIGNS.map(c => ({ id: uid(), ...c }));
  selectedId = null;
  renderSettings(); renderButtons(); save();
  toast("คืนค่าเริ่มต้นแล้ว");
});

renderSettings();
renderButtons();
})();