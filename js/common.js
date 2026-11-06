/* ===== ฟังก์ชันที่ใช้ร่วมกันทุกแท็บ ===== */

function toast(msg = "คัดลอกแล้ว", ms = 1400) {
  const t = document.getElementById("toast");
  t.textContent = msg; t.classList.add("show");
  clearTimeout(t._timer); t._timer = setTimeout(() => t.classList.remove("show"), ms);
}
window.addEventListener("error", e => toast("เกิดข้อผิดพลาด: " + e.message, 5000));

/* ---------- ที่เก็บข้อมูล (กันพัง) ---------- */
function showStorageWarn() { document.getElementById("storageWarn").classList.add("show"); }
function storeGet(k) {
  try { return localStorage.getItem(k); }
  catch { showStorageWarn(); return null; }
}
function storeSet(k, v) {
  try { localStorage.setItem(k, v); return true; }
  catch { showStorageWarn(); return false; }
}

/* ---------- แสดงคำว่า "บันทึกแล้ว" ชั่วคราว ---------- */
function flashSaved(el) {
  if (!el) return;
  el.classList.add("show");
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove("show"), 1200);
}

/* ---------- กดซ้ำเพื่อยืนยัน ---------- */
function confirmClick(btn, armedLabel, action) {
  if (btn.dataset.armed) { action(); return; }
  const oldLabel = btn.textContent;
  btn.dataset.armed = "1";
  btn.textContent = armedLabel;
  btn.classList.add("armed");
  setTimeout(() => {
    if (!btn.isConnected) return;
    delete btn.dataset.armed;
    btn.textContent = oldLabel;
    btn.classList.remove("armed");
  }, 3000);
}

/* ---------- อื่นๆ ---------- */
function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
}
const uid = () => "t" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function copyText(text, msg) {
  if (!text) { toast("ไม่มีข้อความให้คัดลอก"); return; }
  try { await navigator.clipboard.writeText(text); }
  catch {
    const ta = document.createElement("textarea");
    ta.value = text; document.body.appendChild(ta); ta.select();
    document.execCommand("copy"); ta.remove();
  }
  toast(msg || "คัดลอกแล้ว");
}