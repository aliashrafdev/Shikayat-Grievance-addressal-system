// ---------- Settings ----------
const KEY = "civicGrievances";
const OFFICER_PASSWORD = "ward123";   // demo only; real systems verify on a server
const TOTAL_WARDS = 20;
const CATEGORIES = ["Sanitation", "Roads", "Encroachment", "Drainage", "Stray Animals", "Noise"];
const STATUSES = ["Pending", "In Progress", "Resolved"];
let loggedWard = null;                // which ward the officer is logged into

// ---------- Data layer: stored in the browser's localStorage ----------
function getAll() { return JSON.parse(localStorage.getItem(KEY)) || []; }
function saveAll(list) { localStorage.setItem(KEY, JSON.stringify(list)); }
function nextId() { return "CGR-" + (1001 + getAll().length); }   // CGR-1001, CGR-1002...
function esc(text) {                  // stops users injecting HTML into the page
  const d = document.createElement("div");
  d.textContent = text;
  return d.innerHTML;
}
function fmt(iso) { return new Date(iso).toLocaleString(); }
function toast(text) {
  const t = document.getElementById("toast");
  t.textContent = text;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2200);
}

// ---------- Fill dropdowns from the settings above ----------
function fillSelect(id, options, firstLabel) {
  const el = document.getElementById(id);
  el.innerHTML = (firstLabel ? `<option value="">${firstLabel}</option>` : "") +
    options.map(o => `<option value="${o}">${o}</option>`).join("");
}
const wardList = Array.from({ length: TOTAL_WARDS }, (_, i) => i + 1);
fillSelect("category", CATEGORIES, "Select category");
fillSelect("ward", wardList, "Select ward");
fillSelect("officerWard", wardList);
fillSelect("categoryFilter", CATEGORIES, "All categories");
document.getElementById("officerWard").innerHTML =
  wardList.map(w => `<option value="${w}">Ward ${w}</option>`).join("");

// ---------- Navigation: show one section at a time ----------
document.querySelectorAll(".tab").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab, .view").forEach(el => el.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.view).classList.add("active");
  });
});

// ---------- 1. Submit ----------
const desc = document.getElementById("description");
desc.addEventListener("input", () => {
  document.getElementById("counter").textContent = desc.value.length + " / 300";
});

document.getElementById("grievanceForm").addEventListener("submit", e => {
  e.preventDefault();
  const now = new Date().toISOString();
  const g = {
    id: nextId(),
    name: document.getElementById("name").value.trim(),
    phone: document.getElementById("phone").value.trim(),
    category: document.getElementById("category").value,
    ward: Number(document.getElementById("ward").value),
    description: desc.value.trim(),
    status: "Pending",
    date: now,
    history: [{ status: "Pending", note: "Grievance registered", date: now }]
  };
  const list = getAll();
  list.push(g);
  saveAll(list);

  const msg = document.getElementById("submitMsg");
  msg.className = "msg ok";
  msg.textContent = `Submitted to Ward ${g.ward}. Your tracking ID is ${g.id}. Please save it.`;
  e.target.reset();
  document.getElementById("counter").textContent = "0 / 300";
});

// ---------- 2. Track ----------
document.getElementById("trackBtn").addEventListener("click", () => {
  const id = document.getElementById("trackId").value.trim().toUpperCase();
  const box = document.getElementById("trackResult");
  const g = getAll().find(item => item.id === id);

  if (!g) {
    box.innerHTML = '<p class="msg err">No grievance found with that ID.</p>';
    return;
  }
  box.innerHTML = `
    <div class="result">
      <p><b>${g.id}</b> <span class="badge ${g.status.replace(" ", "-")}">${g.status}</span></p>
      <p><b>${esc(g.category)}</b> | Ward ${g.ward} | Filed ${fmt(g.date)}</p>
      <p>${esc(g.description)}</p>
      <b>Progress</b>
      <ul class="timeline">
        ${g.history.map(h => `<li><b>${h.status}</b>: ${esc(h.note)}<small>${fmt(h.date)}</small></li>`).join("")}
      </ul>
    </div>`;
});

// ---------- 3. Ward officer ----------
const loginBox = document.getElementById("loginBox");
const panel = document.getElementById("officerPanel");

document.getElementById("loginBtn").addEventListener("click", () => {
  const msg = document.getElementById("loginMsg");
  if (document.getElementById("officerPass").value !== OFFICER_PASSWORD) {
    msg.className = "msg err";
    msg.textContent = "Wrong password.";
    return;
  }
  loggedWard = Number(document.getElementById("officerWard").value);
  msg.textContent = "";
  loginBox.hidden = true;
  panel.hidden = false;
  document.getElementById("panelTitle").textContent = "Ward " + loggedWard + " grievances";
  renderOfficer();
});

document.getElementById("logoutBtn").addEventListener("click", () => {
  loggedWard = null;
  panel.hidden = true;
  loginBox.hidden = false;
  document.getElementById("officerPass").value = "";
});

document.getElementById("statusFilter").addEventListener("change", renderOfficer);
document.getElementById("categoryFilter").addEventListener("change", renderOfficer);

function renderOfficer() {
  // an officer only sees grievances of their own ward
  const mine = getAll().filter(g => g.ward === loggedWard);
  const sf = document.getElementById("statusFilter").value;
  const cf = document.getElementById("categoryFilter").value;
  const shown = mine
    .filter(g => sf === "All" || g.status === sf)
    .filter(g => !cf || g.category === cf)
    .reverse();                                   // newest first

  const count = s => mine.filter(g => g.status === s).length;
  document.getElementById("stats").innerHTML =
    `<div class="stat"><b>${mine.length}</b>Total</div>
     <div class="stat"><b>${count("Pending")}</b>Pending</div>
     <div class="stat"><b>${count("In Progress")}</b>In progress</div>
     <div class="stat"><b>${count("Resolved")}</b>Resolved</div>`;

  const box = document.getElementById("list");
  if (shown.length === 0) {
    box.innerHTML = '<p class="msg">No grievances to show.</p>';
    return;
  }
  box.innerHTML = shown.map(g => `
    <div class="card" data-id="${g.id}" data-status="${g.status}">
      <div class="card-top">
        <span><b>${g.id}</b> <span class="tag">${esc(g.category)}</span></span>
        <span class="badge ${g.status.replace(" ", "-")}">${g.status}</span>
      </div>
      <p>${esc(g.description)}</p>
      <small>${esc(g.name)} | ${esc(g.phone)} | ${fmt(g.date)}</small>
      <div class="actions">
        <select class="newStatus">
          ${STATUSES.map(s => `<option ${s === g.status ? "selected" : ""}>${s}</option>`).join("")}
        </select>
        <input type="text" class="remark" placeholder="Remark for citizen (optional)">
        <button class="primary saveBtn">Update</button>
      </div>
    </div>`).join("");
}

// One click listener for every Update button (event delegation)
document.getElementById("list").addEventListener("click", e => {
  if (!e.target.classList.contains("saveBtn")) return;
  const card = e.target.closest(".card");
  const newStatus = card.querySelector(".newStatus").value;
  const remark = card.querySelector(".remark").value.trim();

  const list = getAll();
  const g = list.find(item => item.id === card.dataset.id);
  if (newStatus === g.status && !remark) {
    toast("Change the status or add a remark first");
    return;
  }
  g.status = newStatus;
  g.history.push({ status: newStatus, note: remark || "Status updated by ward officer", date: new Date().toISOString() });
  saveAll(list);
  renderOfficer();
  toast(g.id + " updated");
});
