// =========================
// Income & Expenses Tracker
// Made by Daniel Louis for his mum
// Daily + Weekly + Weekly Saved Entry + Edit Button
// =========================

const STORAGE_KEY = "income_expense_entries_v4";
const WEEKLY_STORAGE_KEY = "income_expense_weekly_v1";

const el = {
  // tabs
  tabDaily: document.getElementById("tabDaily"),
  tabWeekly: document.getElementById("tabWeekly"),
  panelDaily: document.getElementById("panelDaily"),
  panelWeekly: document.getElementById("panelWeekly"),

  // daily inputs
  date: document.getElementById("date"),
  income: document.getElementById("income"),
  expenses: document.getElementById("expenses"),
  desc: document.getElementById("desc"),
  addBtn: document.getElementById("addBtn"),
  clearBtn: document.getElementById("clearBtn"),
  status: document.getElementById("status"),

  // daily totals + table
  tbodyDaily: document.getElementById("tbodyDaily"),
  totalIncome: document.getElementById("totalIncome"),
  totalExpenses: document.getElementById("totalExpenses"),
  profit: document.getElementById("profit"),

  // weekly view
  weekPicker: document.getElementById("weekPicker"),
  weekRangeText: document.getElementById("weekRangeText"),
  weekIncome: document.getElementById("weekIncome"),
  weekExpenses: document.getElementById("weekExpenses"),
  weekProfit: document.getElementById("weekProfit"),
  tbodyWeekly: document.getElementById("tbodyWeekly"),

  // weekly saved entry
  weekNote: document.getElementById("weekNote"),
  saveWeekBtn: document.getElementById("saveWeekBtn"),
  weekStatus: document.getElementById("weekStatus"),
  tbodyWeeklySaved: document.getElementById("tbodyWeeklySaved"),
};

let editingId = null; // which entry is currently being edited

function money(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return "0.00";
  return num.toFixed(2);
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveEntries(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function loadWeeklyRecords() {
  try {
    const raw = localStorage.getItem(WEEKLY_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveWeeklyRecords(records) {
  localStorage.setItem(WEEKLY_STORAGE_KEY, JSON.stringify(records));
}

let entries = loadEntries();
let weeklyRecords = loadWeeklyRecords();

function setStatus(msg) {
  el.status.textContent = msg;
  if (!msg) return;
  setTimeout(() => (el.status.textContent = ""), 1800);
}

function setWeekStatus(msg) {
  el.weekStatus.textContent = msg;
  if (!msg) return;
  setTimeout(() => (el.weekStatus.textContent = ""), 1800);
}

// Monday-start week: returns {start: Date, end: Date}
function getWeekBounds(anyDate) {
  const d = new Date(anyDate);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diffToMon = (day === 0) ? -6 : (1 - day); // Sunday => go back 6
  const start = new Date(d);
  start.setDate(d.getDate() + diffToMon);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start, end };
}

function toISODate(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatRange(start, end) {
  return `${toISODate(start)}  to  ${toISODate(end)}`;
}

function computeAllTotals() {
  let inc = 0, exp = 0;
  for (const e of entries) {
    inc += Number(e.income) || 0;
    exp += Number(e.expenses) || 0;
  }
  el.totalIncome.textContent = money(inc);
  el.totalExpenses.textContent = money(exp);
  el.profit.textContent = money(inc - exp);
}

function renderEntryRow(e) {
  // if this row is in edit mode
  if (editingId === e.id) {
    return `
      <td><input class="tableInput" type="date" data-field="date" value="${e.date || ""}"></td>
      <td><input class="tableInput" type="text" data-field="desc" maxlength="80" value="${escapeHtml(e.desc || "")}"></td>
      <td class="num"><input class="tableInput" type="number" min="0" step="0.01" data-field="income" value="${Number(e.income) || 0}"></td>
      <td class="num"><input class="tableInput" type="number" min="0" step="0.01" data-field="expenses" value="${Number(e.expenses) || 0}"></td>
      <td class="actions">
        <button data-action="save" data-id="${e.id}">Save</button>
        <button class="danger" data-action="cancel" data-id="${e.id}">Cancel</button>
      </td>
    `;
  }

  // normal row
  return `
    <td>${e.date || ""}</td>
    <td>${escapeHtml(e.desc || "")}</td>
    <td class="num">${money(e.income)}</td>
    <td class="num">${money(e.expenses)}</td>
    <td class="actions">
      <button data-action="edit" data-id="${e.id}">Edit</button>
      <button class="danger" data-action="delete" data-id="${e.id}">Delete</button>
    </td>
  `;
}

function renderDaily() {
  el.tbodyDaily.innerHTML = "";

  if (entries.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="5" class="muted">No daily entries yet.</td>`;
    el.tbodyDaily.appendChild(tr);
    computeAllTotals();
    return;
  }

  const sorted = [...entries].sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  for (const e of sorted) {
    const tr = document.createElement("tr");
    tr.innerHTML = renderEntryRow(e);
    el.tbodyDaily.appendChild(tr);
  }

  computeAllTotals();
}

function renderWeekly() {
  el.tbodyWeekly.innerHTML = "";

  if (!el.weekPicker.value) {
    el.weekRangeText.textContent = "Pick a date to view that week.";
    el.weekIncome.textContent = "0.00";
    el.weekExpenses.textContent = "0.00";
    el.weekProfit.textContent = "0.00";
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="5" class="muted">No week selected.</td>`;
    el.tbodyWeekly.appendChild(tr);
    return;
  }

  const { start, end } = getWeekBounds(el.weekPicker.value);
  const startISO = toISODate(start);
  const endISO = toISODate(end);

  el.weekRangeText.textContent = formatRange(start, end);

  const weekEntries = entries
    .filter(e => e.date && e.date >= startISO && e.date <= endISO)
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""));

  let inc = 0, exp = 0;
  for (const e of weekEntries) {
    inc += Number(e.income) || 0;
    exp += Number(e.expenses) || 0;
  }

  el.weekIncome.textContent = money(inc);
  el.weekExpenses.textContent = money(exp);
  el.weekProfit.textContent = money(inc - exp);

  if (weekEntries.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="5" class="muted">No entries in this week.</td>`;
    el.tbodyWeekly.appendChild(tr);
    return;
  }

  for (const e of weekEntries) {
    const tr = document.createElement("tr");
    tr.innerHTML = renderEntryRow(e);
    el.tbodyWeekly.appendChild(tr);
  }
}

function renderWeeklySaved() {
  el.tbodyWeeklySaved.innerHTML = "";

  if (!weeklyRecords.length) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="6" class="muted">No saved weekly entries yet. Pick a week and click “Save Weekly Entry”.</td>`;
    el.tbodyWeeklySaved.appendChild(tr);
    return;
  }

  const sorted = [...weeklyRecords].sort((a, b) => (b.start || "").localeCompare(a.start || ""));

  for (const w of sorted) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${w.start} to ${w.end}</td>
      <td>${escapeHtml(w.note || "")}</td>
      <td class="num">${money(w.income)}</td>
      <td class="num">${money(w.expenses)}</td>
      <td class="num">${money(w.profit)}</td>
      <td class="actions">
        <button class="danger" data-weekid="${w.weekId}">Delete</button>
      </td>
    `;
    el.tbodyWeeklySaved.appendChild(tr);
  }
}

function addEntry() {
  const date = el.date.value.trim();
  const incomeVal = el.income.value === "" ? 0 : Number(el.income.value);
  const expensesVal = el.expenses.value === "" ? 0 : Number(el.expenses.value);
  const desc = el.desc.value.trim();

  if (!date) return setStatus("Please choose a date.");
  if (!desc) return setStatus("Please add a description.");

  if (!Number.isFinite(incomeVal) || incomeVal < 0) return setStatus("Income must be 0 or more.");
  if (!Number.isFinite(expensesVal) || expensesVal < 0) return setStatus("Expenses must be 0 or more.");

  const entry = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
    date,
    income: incomeVal,
    expenses: expensesVal,
    desc,
  };

  entries.push(entry);
  saveEntries(entries);

  // keep weekly view synced to this date
  el.weekPicker.value = date;

  renderDaily();
  renderWeekly();

  el.income.value = "";
  el.expenses.value = "";
  el.desc.value = "";
  setStatus("Daily entry added.");
  el.desc.focus();
}

function deleteEntry(id) {
  if (editingId === id) editingId = null;
  entries = entries.filter(e => e.id !== id);
  saveEntries(entries);
  renderDaily();
  renderWeekly();
  setStatus("Entry deleted.");
}

function clearAll() {
  if (!confirm("Clear all daily entries? This cannot be undone.")) return;
  editingId = null;
  entries = [];
  saveEntries(entries);
  renderDaily();
  renderWeekly();
  setStatus("All daily entries cleared.");
}

function beginEdit(id) {
  editingId = id;
  renderDaily();
  renderWeekly();
}

function cancelEdit(id) {
  if (editingId === id) editingId = null;
  renderDaily();
  renderWeekly();
}

function saveEdit(id, rowEl) {
  const date = rowEl.querySelector('[data-field="date"]')?.value?.trim();
  const desc = rowEl.querySelector('[data-field="desc"]')?.value?.trim();
  const incomeVal = Number(rowEl.querySelector('[data-field="income"]')?.value);
  const expensesVal = Number(rowEl.querySelector('[data-field="expenses"]')?.value);

  if (!date) return setStatus("Date is required.");
  if (!desc) return setStatus("Description is required.");
  if (!Number.isFinite(incomeVal) || incomeVal < 0) return setStatus("Income must be 0 or more.");
  if (!Number.isFinite(expensesVal) || expensesVal < 0) return setStatus("Expenses must be 0 or more.");

  const idx = entries.findIndex(e => e.id === id);
  if (idx < 0) return;

  entries[idx] = { ...entries[idx], date, desc, income: incomeVal, expenses: expensesVal };
  saveEntries(entries);
  editingId = null;

  // keep weekly picker reasonable (optional)
  el.weekPicker.value = date;

  renderDaily();
  renderWeekly();
  setStatus("Entry updated.");
}

function saveWeeklyEntry() {
  if (!el.weekPicker.value) return setWeekStatus("Pick a date for the week first.");

  const { start, end } = getWeekBounds(el.weekPicker.value);
  const startISO = toISODate(start);
  const endISO = toISODate(end);
  const weekId = `${startISO}_to_${endISO}`;

  const weekEntries = entries.filter(e => e.date && e.date >= startISO && e.date <= endISO);

  let inc = 0, exp = 0;
  for (const e of weekEntries) {
    inc += Number(e.income) || 0;
    exp += Number(e.expenses) || 0;
  }

  const note = (el.weekNote?.value || "").trim();

  const record = {
    weekId,
    start: startISO,
    end: endISO,
    income: inc,
    expenses: exp,
    profit: inc - exp,
    note,
    savedAt: new Date().toISOString()
  };

  const existingIndex = weeklyRecords.findIndex(w => w.weekId === weekId);
  if (existingIndex >= 0) {
    weeklyRecords[existingIndex] = record;
    setWeekStatus("Weekly entry updated.");
  } else {
    weeklyRecords.push(record);
    setWeekStatus("Weekly entry saved.");
  }

  saveWeeklyRecords(weeklyRecords);
  renderWeeklySaved();
}

function deleteWeeklySaved(weekId) {
  weeklyRecords = weeklyRecords.filter(w => w.weekId !== weekId);
  saveWeeklyRecords(weeklyRecords);
  renderWeeklySaved();
  setWeekStatus("Saved weekly entry deleted.");
}

function switchTo(which) {
  const daily = which === "daily";
  el.tabDaily.setAttribute("aria-selected", daily ? "true" : "false");
  el.tabWeekly.setAttribute("aria-selected", daily ? "false" : "true");
  el.panelDaily.classList.toggle("hidden", !daily);
  el.panelWeekly.classList.toggle("hidden", daily);

  if (!daily) {
    renderWeekly();
    renderWeeklySaved();
  }
}

// Events
el.addBtn.addEventListener("click", addEntry);
el.clearBtn.addEventListener("click", clearAll);

function handleRowActions(e) {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;

  const action = btn.getAttribute("data-action");
  const id = btn.getAttribute("data-id");
  if (!id) return;

  const rowEl = btn.closest("tr");

  if (action === "delete") return deleteEntry(id);
  if (action === "edit") return beginEdit(id);
  if (action === "cancel") return cancelEdit(id);
  if (action === "save") return saveEdit(id, rowEl);
}

// Daily row actions
el.tbodyDaily.addEventListener("click", handleRowActions);
// Weekly row actions (same entries)
el.tbodyWeekly.addEventListener("click", handleRowActions);

el.weekPicker.addEventListener("input", () => renderWeekly());
el.saveWeekBtn.addEventListener("click", saveWeeklyEntry);

el.tbodyWeeklySaved.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-weekid]");
  if (!btn) return;
  deleteWeeklySaved(btn.getAttribute("data-weekid"));
});

el.tabDaily.addEventListener("click", () => switchTo("daily"));
el.tabWeekly.addEventListener("click", () => switchTo("weekly"));

// Defaults: set date inputs to today
const today = new Date();
const yyyy = today.getFullYear();
const mm = String(today.getMonth() + 1).padStart(2, "0");
const dd = String(today.getDate()).padStart(2, "0");
const todayISO = `${yyyy}-${mm}-${dd}`;

if (!el.date.value) el.date.value = todayISO;
if (!el.weekPicker.value) el.weekPicker.value = todayISO;

// Initial render
renderDaily();
renderWeekly();
renderWeeklySaved();