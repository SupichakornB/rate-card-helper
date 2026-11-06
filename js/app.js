/* ===== สลับแท็บ ===== */
(() => {
const TAB_KEY = "rc_tab";

function showTab(name) {
  document.querySelectorAll(".tab").forEach(b => b.classList.toggle("active", b.dataset.tab === name));
  document.querySelectorAll(".tab-page").forEach(p => p.classList.toggle("active", p.id === "tab-" + name));
  document.body.dataset.tab = name;
  storeSet(TAB_KEY, name);
}

document.querySelectorAll(".tab").forEach(b => b.onclick = () => showTab(b.dataset.tab));
showTab(storeGet(TAB_KEY) === "campaign" ? "campaign" : "finder");
})();