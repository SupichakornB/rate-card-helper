/* ===== แท็บ: For Campaign ===== */
(() => {
const $ = id => document.getElementById(id);
const STORE_KEY = "rc_campaigns_v1";

const DEFAULT_CAMPAIGNS = [
  {
    title: "Campaign A",
    tpl: "สวัสดีค่ะ {name} {link}",
    emailTpl: "เรียน คุณ{name}\n\n\n{link}\n\nหากมีข้อสงสัย สามารถตอบกลับอีเมลนี้ได้เลยค่ะ\n\nขอแสดงความนับถือ"
  },
  {
    title: "Campaign B",
    tpl: "สวัสดีค่ะ {name}  {link} ",
    emailTpl: "เรียน คุณ{name}\n\n\n{link}\n\nรบกวนตรวจสอบรายละเอียด หากมีข้อสงสัยสามารถตอบกลับอีเมลนี้ได้เลยค่ะ\n\nขอแสดงความนับถือ"
  },
  {
    title: "Campaign C",
    tpl: "สวัสดีค่ะ {name} {link}",
    emailTpl: "เรียน คุณ{name}\n\n\n{link}\n\nขอบคุณค่ะ\n\nขอแสดงความนับถือ"
  }
];


function load() {
  try {
    const s = JSON.parse(storeGet(STORE_KEY));
    if (Array.isArray(s) && s.length > 0) {
      return s.map(c => ({
        id: c.id || uid(), title: c.title || "", tpl: c.tpl || "", emailTpl: c.emailTpl || ""
      }));
    }
  } catch {}
  return DEFAULT_CAMPAIGNS.map(c => ({ id: uid(), ...c }));
}
let campaigns = load();
let selectedId = null;
let mode = "normal"; // "normal" | "email"

const save = () => { 
  try {
    if (storeSet(STORE_KEY, JSON.stringify(campaigns))) flashSaved($("cpSavedFlag"));
  } catch(e) { console.error(e); }
};
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
    box.dataset.id = c.id;
    box.innerHTML = `
      <div class="tier-row">
        <span class="tier-num">แคมเปญ ${idx + 1}</span>
        <input class="cp-title" placeholder="ชื่อแคมเปญสั้นๆ เช่น ส่งบรีฟ">
        <button class="small del" type="button">ลบ</button>
      </div>
      <span class="tpl-label">ข้อความปกติ</span>
      <textarea class="tpl" placeholder="ข้อความปกติ ใช้ {name} และ {link} ได้"></textarea>
      <span class="tpl-label">ข้อความสำหรับ Email</span>
      <textarea class="tpl-email email-tpl" placeholder="ข้อความสำหรับส่ง Email (เว้นว่างได้)"></textarea>`;
    
    const title = box.querySelector(".cp-title");
    const tpl = box.querySelector(".tpl");
    const emailTpl = box.querySelector(".tpl-email");
    title.value = c.title;
    tpl.value = c.tpl;
    emailTpl.value = c.emailTpl;

    title.oninput = () => { c.title = title.value; renderButtons(); save(); };
    tpl.oninput = () => { c.tpl = tpl.value; renderResult(); save(); };
    emailTpl.oninput = () => { c.emailTpl = emailTpl.value; renderResult(); save(); };

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
    renderResult();
    return;
  }
  campaigns.forEach(c => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "tier-btn" + (c.id === selectedId ? " active" : "");
    b.textContent = label(c);
    b.onclick = () => {
      if (selectedId === c.id) selectedId = null;
      else { selectedId = c.id; mode = "normal"; }
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

  const isEmail = mode === "email";
  const tpl = isEmail ? c.emailTpl : c.tpl;

  document.querySelectorAll("#cpMode button").forEach(b => b.classList.toggle("active", b.dataset.mode === mode));
  $("cpModeLabel").textContent = isEmail ? "ข้อความ Email" : "ข้อความปกติ";
  box.classList.toggle("email", isEmail);
  box.classList.add("show");

  $("cpMsg").value = tpl.trim() ? buildMessage(tpl) : "";

  let warn = "";
  if (!tpl.trim()) {
    warn = isEmail ? "แคมเปญนี้ยังไม่ได้ตั้งข้อความ Email" : "แคมเปญนี้ยังไม่ได้ตั้งข้อความปกติ";
  } else {
    const missing = [];
    if (tpl.includes("{name}") && !$("cpName").value.trim()) missing.push("ชื่อแอค");
    if (tpl.includes("{link}") && !$("cpLink").value.trim()) missing.push("ลิงก์");
    if (missing.length) warn = `ยังไม่ได้กรอก${missing.join(" และ ")}`;
  }
  $("cpWarn").textContent = warn;
}

/* ---------- Events ---------- */
document.querySelectorAll("#cpMode button").forEach(b => b.onclick = () => {
  mode = b.dataset.mode;
  renderResult();
});

$("cpName").oninput = renderResult;
$("cpLink").oninput = renderResult;
$("cpClear").onclick = () => {
  $("cpName").value = ""; $("cpLink").value = "";
  renderResult(); $("cpName").focus();
};
$("cpCopy").onclick = () => copyText($("cpMsg").value);

$("cpAdd").onclick = () => {
  const newCampaign = { id: uid(), title: "", tpl: "สวัสดีค่ะ {name} ", emailTpl: "เรียน คุณ{name}\n\n" };
  campaigns.push(newCampaign);
  selectedId = newCampaign.id; // เลือกแคมเปญใหม่อัตโนมัติ
  mode = "normal";
  
  renderSettings();
  renderButtons();
  save();

  // เลื่อนหน้าจอไปที่ช่องกรอกชื่อของแคมเปญใหม่
  const boxes = document.querySelectorAll("#cpList .tier-box");
  const last = boxes[boxes.length - 1];
  if (last) {
    last.classList.add("new");
    last.scrollIntoView({ behavior: "smooth", block: "center" });
    const titleInput = last.querySelector(".cp-title");
    if (titleInput) titleInput.focus({ preventScroll: true });
    setTimeout(() => last.classList.remove("new"), 2000);
  }
};

const btnReset = $("cpReset");
btnReset.onclick = () => confirmClick(btnReset, "กดอีกครั้งเพื่อยืนยัน", () => {
  campaigns = DEFAULT_CAMPAIGNS.map(c => ({ id: uid(), ...c }));
  selectedId = null;
  mode = "normal";
  renderSettings(); renderButtons(); save();
  toast("คืนค่าเริ่มต้นแล้ว");
});

renderSettings();
renderButtons();
})();