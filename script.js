// ---------- MODELO ----------
let workers = [];
let guards = [];
let guardDays = [];
let currentYear = 2026;
let lastWorkerIndexForDays = 0;

// Vistas
let currentView = "table";
let currentCalendarYear = 2026;
let currentCalendarMonth = 5;

// Paginación
let currentPage = 1;
const rowsPerPage = 20;
let currentFilteredGuards = [];

// Ordenamiento
let currentSortColumn = 'date';
let currentSortOrder = 'asc';

// LocalStorage keys
const STORAGE_WORKERS = "sindicato_workers";
const STORAGE_GUARDS = "sindicato_guards";
const STORAGE_YEAR = "sindicato_year";
const STORAGE_DAYS = "sindicato_guardDays";
const STORAGE_LAST_INDEX = "sindicato_lastIndexDays";

let currentEditingGuard = null;
let currentEditingDay = null;

// ---------- FUNCIONES DE PERSISTENCIA ----------
function saveData() {
  localStorage.setItem(STORAGE_WORKERS, JSON.stringify(workers));
  localStorage.setItem(STORAGE_GUARDS, JSON.stringify(guards));
  localStorage.setItem(STORAGE_YEAR, currentYear.toString());
  localStorage.setItem(STORAGE_DAYS, JSON.stringify(guardDays));
  localStorage.setItem(STORAGE_LAST_INDEX, lastWorkerIndexForDays.toString());
}

function loadData() {
  const storedWorkers = localStorage.getItem(STORAGE_WORKERS);
  const storedGuards = localStorage.getItem(STORAGE_GUARDS);
  const storedYear = localStorage.getItem(STORAGE_YEAR);
  const storedDays = localStorage.getItem(STORAGE_DAYS);
  const storedLastIndex = localStorage.getItem(STORAGE_LAST_INDEX);
  if (storedWorkers) workers = JSON.parse(storedWorkers);
  if (storedGuards) guards = JSON.parse(storedGuards);
  if (storedYear) currentYear = parseInt(storedYear);
  if (storedDays) guardDays = JSON.parse(storedDays);
  if (storedLastIndex) lastWorkerIndexForDays = parseInt(storedLastIndex);

  document.getElementById("yearSelect").value = currentYear;
  updateFilterWorkerSelect();
  updateFilterYearSelect();
  updateFilterCatedraSelect();
}

// ---------- UTILS ----------
function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/[&<>]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[m]);
}

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

// ---------- TRABAJADORES ----------
function renderWorkersList() {
  const container = document.getElementById("workersList");
  if (!container) return;
  if (workers.length === 0) {
    container.innerHTML = "<p>No hay trabajadores. Añade uno.</p>";
    return;
  }
  container.innerHTML = "";
  workers.forEach((worker) => {
    const tag = document.createElement("div");
    tag.className = "worker-tag";
    tag.innerHTML = `<span>👤 ${escapeHtml(worker.name)}</span><button class="edit-worker" data-id="${worker.id}">✏️</button><button class="delete-worker" data-id="${worker.id}">🗑️</button>`;
    container.appendChild(tag);
  });

  document.querySelectorAll(".edit-worker").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = parseInt(btn.dataset.id);
      const worker = workers.find((w) => w.id === id);
      if (worker) {
        const newName = prompt("Editar nombre:", worker.name);
        if (newName && newName.trim()) {
          worker.name = newName.trim();
          saveData();
          refreshUI();
        }
      }
    });
  });

  document.querySelectorAll(".delete-worker").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = parseInt(btn.dataset.id);
      const worker = workers.find((w) => w.id === id);
      if (!worker) return;

      const workerGuards = guards.filter((g) => g.workerId === id);
      const guardCount = workerGuards.length;

      let mensaje = `¿Eliminar trabajador "${worker.name}"?`;
      if (guardCount > 0) {
        mensaje += `\n\nTiene ${guardCount} guardias asignadas. ¿Qué deseas hacer?\n`;
        mensaje += `1. Eliminar trabajador y TODAS sus guardias.\n`;
        mensaje += `2. Eliminar trabajador pero CONSERVAR sus guardias (quedarán sin asignar).\n`;
        mensaje += `3. Reasignar sus guardias a otro trabajador.\n`;
        mensaje += `4. Cancelar.`;
      } else {
        mensaje += `\n\nNo tiene guardias asignadas. ¿Confirmas eliminación?`;
      }

      let opcion = null;
      if (guardCount > 0) {
        opcion = prompt(mensaje, "1");
        if (opcion === null || opcion === "4") return;
      } else {
        if (!confirm(mensaje)) return;
        opcion = "1";
      }

      if (opcion === "1") {
        workers = workers.filter((w) => w.id !== id);
        guards = guards.filter((g) => g.workerId !== id);
        alert(`Trabajador "${worker.name}" eliminado junto con sus ${guardCount} guardias.`);
      } else if (opcion === "2") {
        workers = workers.filter((w) => w.id !== id);
        alert(`Trabajador "${worker.name}" eliminado. Se conservaron ${guardCount} guardias.`);
      } else if (opcion === "3") {
        if (workers.length === 1) {
          alert("No hay otros trabajadores para reasignar.");
          return;
        }
        const otherWorkers = workers.filter((w) => w.id !== id);
        let workerListStr = otherWorkers.map((w, idx) => `${idx + 1}. ${w.name}`).join("\n");
        let newWorkerIndex = prompt(`Selecciona el trabajador que recibirá las ${guardCount} guardias:\n${workerListStr}`, "1");
        if (newWorkerIndex === null) return;
        newWorkerIndex = parseInt(newWorkerIndex) - 1;
        if (isNaN(newWorkerIndex) || newWorkerIndex < 0 || newWorkerIndex >= otherWorkers.length) {
          alert("Opción inválida.");
          return;
        }
        const newWorker = otherWorkers[newWorkerIndex];
        for (let guard of guards) {
          if (guard.workerId === id) guard.workerId = newWorker.id;
        }
        workers = workers.filter((w) => w.id !== id);
        saveData();
        refreshUI();
        alert(`Trabajador "${worker.name}" eliminado. ${guardCount} guardias reasignadas a "${newWorker.name}".`);
        return;
      }
      saveData();
      refreshUI();
    });
  });
}

function addWorker() {
  const input = document.getElementById("workerName");
  const name = input.value.trim();
  if (!name) return alert("Escribe un nombre");
  if (workers.some((w) => w.name.toLowerCase() === name.toLowerCase())) return alert("Ya existe");
  workers.push({ id: Date.now(), name });
  saveData();
  input.value = "";
  refreshUI();
  alert("Trabajador añadido.");
}

// ---------- EXPORTAR/IMPORTAR TRABAJADORES ----------
function exportWorkers() {
  if (workers.length === 0) { alert("No hay trabajadores."); return; }
  const exportObj = { workers, exportDate: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.download = `trabajadores_${new Date().toISOString().split("T")[0]}.json`;
  a.href = URL.createObjectURL(blob);
  a.click();
  URL.revokeObjectURL(a.href);
}

function importWorkersFromJSON(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      let newWorkers = Array.isArray(data) ? data : data.workers;
      if (!newWorkers || !Array.isArray(newWorkers)) throw new Error("Formato inválido");
      if (newWorkers.length === 0) {
        if (confirm("Borrar todos los trabajadores actuales?")) {
          workers = []; guards = []; lastWorkerIndexForDays = 0;
          saveData(); refreshUI();
          alert("Datos borrados.");
        }
        return;
      }
      if (!newWorkers.every(w => w.id && typeof w.name === "string")) throw new Error("Estructura incorrecta");
      workers = newWorkers;
      guards = [];
      lastWorkerIndexForDays = 0;
      saveData();
      refreshUI();
      alert(`Importados ${workers.length} trabajadores. Guardias eliminadas.`);
    } catch (err) { alert("Error: " + err.message); }
  };
  reader.readAsText(file);
}

function handleImportWorkers(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (confirm("Se reemplazarán trabajadores y se borrarán guardias. ¿Continuar?")) importWorkersFromJSON(file);
  event.target.value = "";
}

// ---------- DÍAS DE GUARDIA ----------
function renderGuardDaysList() {
  const container = document.getElementById("guardDaysList");
  if (!container) return;
  if (guardDays.length === 0) {
    container.innerHTML = "<p>No hay días definidos. Añade fechas.</p>";
    return;
  }
  const sorted = [...guardDays].sort();
  container.innerHTML = "";
  for (const day of sorted) {
    const tag = document.createElement("div");
    tag.className = "day-tag";
    tag.innerHTML = `<span>📅 ${formatDate(day)}</span>
                     <button class="edit-day" data-date="${day}">✏️</button>
                     <button class="remove-day" data-date="${day}">✖️</button>`;
    container.appendChild(tag);
  }
  document.querySelectorAll(".remove-day").forEach(btn => {
    btn.addEventListener("click", () => {
      const date = btn.dataset.date;
      if (confirm(`¿Eliminar ${date}?`)) {
        guardDays = guardDays.filter(d => d !== date);
        saveData();
        renderGuardDaysList();
        if (confirm("¿Eliminar también las guardias de ese día?")) {
          guards = guards.filter(g => g.date !== date);
          saveData();
          refreshUI();
        } else refreshUI();
      }
    });
  });
  document.querySelectorAll(".edit-day").forEach(btn => {
    btn.addEventListener("click", () => openEditDayModal(btn.dataset.date));
  });
}

function openEditDayModal(oldDate) {
  currentEditingDay = oldDate;
  const modal = document.getElementById("editDayModal");
  document.getElementById("originalDaySpan").textContent = formatDate(oldDate);
  document.getElementById("editDayInput").value = oldDate;
  modal.style.display = "flex";
}

function saveDayEdit() {
  if (!currentEditingDay) return;
  const newDate = document.getElementById("editDayInput").value;
  if (!newDate) return alert("Selecciona fecha");
  if (guardDays.includes(newDate) && newDate !== currentEditingDay) return alert("Ya existe");
  const index = guardDays.indexOf(currentEditingDay);
  if (index !== -1) guardDays[index] = newDate;
  guardDays.sort();
  const guardToUpdate = guards.find(g => g.date === currentEditingDay);
  if (guardToUpdate) guardToUpdate.date = newDate;
  guards.sort((a,b) => a.date.localeCompare(b.date));
  saveData();
  closeDayModal();
  refreshUI();
  alert("Día actualizado.");
}

function closeDayModal() {
  document.getElementById("editDayModal").style.display = "none";
  currentEditingDay = null;
}

function addGuardDay() {
  const newDate = document.getElementById("newGuardDay").value;
  if (!newDate) return alert("Selecciona fecha");
  if (guardDays.includes(newDate)) return alert("Ya existe");
  guardDays.push(newDate);
  guardDays.sort();
  saveData();
  renderGuardDaysList();
  document.getElementById("newGuardDay").value = new Date().toISOString().split("T")[0];
  alert("Día añadido.");
}

function generateGuardsFromDays() {
  if (!workers.length) return alert("No hay trabajadores.");
  if (!guardDays.length) return alert("No hay días definidos.");
  const sortedDays = [...guardDays].sort();
  const existingDates = new Set(guards.filter(g => guardDays.includes(g.date)).map(g => g.date));
  const newDays = sortedDays.filter(date => !existingDates.has(date));
  if (!newDays.length) return alert("Todos los días ya tienen guardia.");
  const otherGuards = guards.filter(g => !guardDays.includes(g.date));
  const newGuards = [];
  let workerIndex = lastWorkerIndexForDays;
  let maxId = guards.length ? Math.max(...guards.map(g => g.id)) : 0;
  for (const date of newDays) {
    const worker = workers[workerIndex % workers.length];
    newGuards.push({ id: ++maxId, date, workerId: worker.id, completed: false, catedra: '', notes: '' });
    workerIndex++;
  }
  lastWorkerIndexForDays = workerIndex % workers.length;
  guards = [...otherGuards, ...guards.filter(g => guardDays.includes(g.date)), ...newGuards];
  guards.sort((a,b) => a.date.localeCompare(b.date));
  saveData();
  refreshUI();
  alert(`Generadas ${newGuards.length} guardias nuevas.`);
}

function exportDaysToJSON() {
  if (!guardDays.length) return alert("No hay días para exportar.");
  const data = { guardDays, exportDate: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.download = `dias_guardia_${currentYear}.json`;
  a.href = URL.createObjectURL(blob);
  a.click();
  URL.revokeObjectURL(a.href);
}

function importDaysFromJSON(file) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.guardDays || !Array.isArray(data.guardDays)) throw new Error("Formato inválido");
      guardDays = data.guardDays.sort();
      saveData();
      renderGuardDaysList();
      alert("Días importados.");
    } catch (err) { alert("Error: " + err.message); }
  };
  reader.readAsText(file);
}

// ---------- GENERACIÓN AUTOMÁTICA MULTI-AÑO ----------
function generateGuardsForYear(year) {
  if (!workers.length) return [];
  const newGuards = [];
  let workerIndex = 0;
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);
  let current = new Date(start);
  while (current <= end) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const worker = workers[workerIndex % workers.length];
      const formatted = `${current.getFullYear()}-${String(current.getMonth()+1).padStart(2,'0')}-${String(current.getDate()).padStart(2,'0')}`;
      newGuards.push({ id: 0, date: formatted, workerId: worker.id, completed: false, catedra: '', notes: '' });
      workerIndex++;
    }
    current.setDate(current.getDate() + 1);
  }
  return newGuards;
}

function regenerateGuards() {
  if (!workers.length) return alert("No hay trabajadores.");
  const year = parseInt(document.getElementById("yearSelect").value);
  currentYear = year;
  guards = guards.filter(g => parseInt(g.date.split("-")[0]) !== year);
  const newGuards = generateGuardsForYear(year);
  let maxId = guards.length ? Math.max(...guards.map(g => g.id)) : 0;
  newGuards.forEach(g => g.id = ++maxId);
  guards = [...guards, ...newGuards];
  guards.sort((a,b) => a.date.localeCompare(b.date));
  saveData();
  refreshUI();
  alert(`Guardias generadas para ${year}. Total laborables: ${newGuards.length}.`);
}

// ---------- GUARDIAS MANUALES CON BÚSQUEDA ----------
function openManualModal() {
  if (!workers.length) return alert("Primero añade trabajadores.");
  const searchInput = document.getElementById("searchWorkerInput");
  if (searchInput) searchInput.value = "";
  renderWorkerSelectForManual("");
  document.getElementById("manualDate").value = new Date().toISOString().split("T")[0];
  document.getElementById("manualCatedra").value = "";
  document.getElementById("manualNotes").value = "";
  document.getElementById("manualModal").style.display = "flex";
  setTimeout(() => searchInput && searchInput.focus(), 100);
}

function renderWorkerSelectForManual(filterText = "") {
  const workerSelect = document.getElementById("manualWorker");
  if (!workerSelect) return;
  const filtered = workers.filter(w => w.name.toLowerCase().includes(filterText.toLowerCase()));
  workerSelect.innerHTML = "";
  if (!filtered.length) {
    const opt = document.createElement("option");
    opt.disabled = true;
    opt.textContent = "No hay coincidencias";
    workerSelect.appendChild(opt);
  } else {
    filtered.forEach(w => {
      const opt = document.createElement("option");
      opt.value = w.id;
      opt.textContent = w.name;
      workerSelect.appendChild(opt);
    });
    workerSelect.selectedIndex = 0;
  }
}

function saveManualGuard() {
  const fechaStr = document.getElementById("manualDate").value;
  const workerSelect = document.getElementById("manualWorker");
  const workerId = parseInt(workerSelect.value);
  const catedra = document.getElementById("manualCatedra").value.trim();
  const notes = document.getElementById("manualNotes").value.trim();
  if (!fechaStr || isNaN(workerId)) return alert("Selecciona fecha y trabajador.");
  const existing = guards.find(g => g.date === fechaStr);
  if (existing) {
    if (confirm(`Ya existe guardia el ${formatDate(fechaStr)}. ¿Sobrescribir?`)) {
      existing.workerId = workerId;
      existing.completed = false;
      existing.catedra = catedra;
      existing.notes = notes;
      saveData();
      refreshUI();
      alert("Guardia actualizada.");
      closeManualModal();
    }
  } else {
    const maxId = guards.length ? Math.max(...guards.map(g => g.id)) : 0;
    guards.push({ id: maxId + 1, date: fechaStr, workerId, completed: false, catedra, notes });
    guards.sort((a,b) => a.date.localeCompare(b.date));
    saveData();
    refreshUI();
    alert("Guardia añadida manualmente.");
    closeManualModal();
  }
}

function closeManualModal() {
  document.getElementById("manualModal").style.display = "none";
}

function bindManualSearchEvent() {
  const searchInput = document.getElementById("searchWorkerInput");
  if (searchInput) searchInput.addEventListener("input", e => renderWorkerSelectForManual(e.target.value));
}

// ---------- ORDENAMIENTO DE TABLA ----------
function sortGuards(guardsArray) {
  const sorted = [...guardsArray];
  sorted.sort((a, b) => {
    let valA, valB;
    switch (currentSortColumn) {
      case 'date': valA = a.date; valB = b.date; break;
      case 'worker':
        const wa = workers.find(w => w.id === a.workerId);
        const wb = workers.find(w => w.id === b.workerId);
        valA = wa ? wa.name : '';
        valB = wb ? wb.name : '';
        break;
      case 'completed': valA = a.completed ? 1 : 0; valB = b.completed ? 1 : 0; break;
      case 'catedra': valA = (a.catedra || '').toLowerCase(); valB = (b.catedra || '').toLowerCase(); break;
      case 'notes': valA = (a.notes || '').toLowerCase(); valB = (b.notes || '').toLowerCase(); break;
      default: return 0;
    }
    if (valA < valB) return currentSortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return currentSortOrder === 'asc' ? 1 : -1;
    return 0;
  });
  return sorted;
}

function applyFiltersAndRenderTable() {
  const filterDay = document.getElementById("filterDay")?.value || "all";
  const filterMonth = document.getElementById("filterMonth")?.value || "all";
  const filterYear = document.getElementById("filterYear")?.value || "all";
  const filterWorker = document.getElementById("filterWorker")?.value || "all";
  const filterCatedra = document.getElementById("filterCatedra")?.value || "all";
  let filtered = [...guards];
  if (filterDay !== "all") filtered = filtered.filter(g => parseInt(g.date.split("-")[2]) === parseInt(filterDay));
  if (filterMonth !== "all") filtered = filtered.filter(g => parseInt(g.date.split("-")[1]) === parseInt(filterMonth));
  if (filterYear !== "all") filtered = filtered.filter(g => parseInt(g.date.split("-")[0]) === parseInt(filterYear));
  if (filterWorker !== "all") filtered = filtered.filter(g => g.workerId === parseInt(filterWorker));
  if (filterCatedra !== "all") filtered = filtered.filter(g => (g.catedra || '') === filterCatedra);
  filtered = sortGuards(filtered);
  currentFilteredGuards = filtered;
  currentPage = 1;
  renderGuardsTablePage();
}

function renderGuardsTablePage() {
  const tbody = document.getElementById("guardsTableBody");
  if (!tbody) return;
  const totalPages = Math.ceil(currentFilteredGuards.length / rowsPerPage);
  const start = (currentPage - 1) * rowsPerPage;
  const pageGuards = currentFilteredGuards.slice(start, start + rowsPerPage);
  if (!pageGuards.length) {
    tbody.innerHTML = '<tr><td colspan="6">No hay guardias que coincidan.</td></tr>';
    renderPaginationControls(0);
    return;
  }
  tbody.innerHTML = "";
  for (const guard of pageGuards) {
    const worker = workers.find(w => w.id === guard.workerId);
    const workerName = worker ? worker.name : "❌ Eliminado";
    const row = tbody.insertRow();
    row.insertCell(0).textContent = formatDate(guard.date);
    row.insertCell(1).textContent = workerName;
    const chkCell = row.insertCell(2);
    const chk = document.createElement("input");
    chk.type = "checkbox";
    chk.checked = guard.completed;
    chk.addEventListener("change", () => {
      guard.completed = chk.checked;
      saveData();
      renderSummary();
      applyFiltersAndRenderTable();
    });
    chkCell.appendChild(chk);
    // Cátedra
    row.insertCell(3).textContent = guard.catedra || '';
    // Notas
    const notesCell = row.insertCell(4);
    if (guard.notes) {
      const icon = document.createElement("span");
      icon.textContent = "📝";
      icon.title = guard.notes;
      notesCell.appendChild(icon);
    } else {
      notesCell.textContent = "";
    }
    // Acciones
    const actionsCell = row.insertCell(5);
    const editBtn = document.createElement("button");
    editBtn.textContent = "✏️ Editar";
    editBtn.className = "btn-edit";
    editBtn.addEventListener("click", () => openEditModal(guard));
    actionsCell.appendChild(editBtn);
    const delBtn = document.createElement("button");
    delBtn.textContent = "🗑️ Eliminar";
    delBtn.className = "btn-edit";
    delBtn.style.backgroundColor = "#f8d7da";
    delBtn.style.color = "#721c24";
    delBtn.addEventListener("click", () => deleteGuard(guard.id));
    actionsCell.appendChild(delBtn);
  }
  renderPaginationControls(totalPages);
  updateSortIndicators();
}

function renderPaginationControls(totalPages) {
  const container = document.getElementById("paginationControls");
  if (!container) return;
  if (totalPages <= 1) { container.innerHTML = ""; return; }
  let html = `<button ${currentPage === 1 ? "disabled" : ""} data-page="${currentPage-1}">◀ Anterior</button>`;
  let start = Math.max(1, currentPage-3);
  let end = Math.min(totalPages, currentPage+3);
  if (end-start < 6) start = Math.max(1, end-6);
  for (let i=start; i<=end; i++) html += `<button class="${i===currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
  html += `<button ${currentPage===totalPages ? "disabled" : ""} data-page="${currentPage+1}">Siguiente ▶</button>`;
  container.innerHTML = html;
  container.querySelectorAll("button[data-page]").forEach(btn => {
    btn.addEventListener("click", () => {
      const page = parseInt(btn.dataset.page);
      if (!isNaN(page) && page>=1 && page<=totalPages) {
        currentPage = page;
        renderGuardsTablePage();
      }
    });
  });
}

function updateSortIndicators() {
  const headers = document.querySelectorAll('#guardsTable th');
  if (headers.length < 5) return;
  const setArrow = (th, active) => {
    if (!th) return;
    const arrow = currentSortOrder === 'asc' ? ' ▲' : ' ▼';
    const text = th.innerText.replace(/[ ▲▼]/g, '');
    th.innerText = active ? text + arrow : text;
  };
  setArrow(headers[0], currentSortColumn === 'date');
  setArrow(headers[1], currentSortColumn === 'worker');
  setArrow(headers[2], currentSortColumn === 'completed');
  setArrow(headers[3], currentSortColumn === 'catedra');
  setArrow(headers[4], currentSortColumn === 'notes');
}

function bindSortingEvents() {
  const headers = document.querySelectorAll('#guardsTable th');
  if (headers.length < 5) return;
  const columns = ['date', 'worker', 'completed', 'catedra', 'notes'];
  headers.forEach((th, index) => {
    th.addEventListener('click', () => {
      const col = columns[index];
      if (currentSortColumn === col) currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
      else { currentSortColumn = col; currentSortOrder = 'asc'; }
      applyFiltersAndRenderTable();
    });
  });
}

// ---------- ELIMINAR GUARDIA ----------
function deleteGuard(guardId) {
  if (confirm("¿Eliminar esta guardia?")) {
    guards = guards.filter(g => g.id !== guardId);
    saveData();
    applyFiltersAndRenderTable();
    renderSummary();
    if (currentView === "calendar") renderCalendar();
  }
}

// ---------- EDITAR GUARDIA ----------
function openEditModal(guard) {
  currentEditingGuard = guard;
  const modal = document.getElementById("editModal");
  const dateInput = document.getElementById("editDate");
  const workerSelect = document.getElementById("editWorker");
  const completedCheck = document.getElementById("editCompleted");
  const catedraInput = document.getElementById("editCatedra");
  const notesInput = document.getElementById("editNotes");
  workerSelect.innerHTML = "";
  workers.forEach(w => {
    const opt = document.createElement("option");
    opt.value = w.id;
    opt.textContent = w.name;
    if (w.id === guard.workerId) opt.selected = true;
    workerSelect.appendChild(opt);
  });
  dateInput.value = guard.date;
  completedCheck.checked = guard.completed;
  catedraInput.value = guard.catedra || '';
  notesInput.value = guard.notes || '';
  modal.style.display = "flex";
}

function saveEditGuard() {
  if (!currentEditingGuard) return;
  const newDate = document.getElementById("editDate").value;
  const newWorkerId = parseInt(document.getElementById("editWorker").value);
  const newCompleted = document.getElementById("editCompleted").checked;
  const newCatedra = document.getElementById("editCatedra").value.trim();
  const newNotes = document.getElementById("editNotes").value.trim();
  if (!newDate) return alert("Selecciona fecha");
  if (newDate !== currentEditingGuard.date) {
    const existing = guards.find(g => g.date === newDate && g.id !== currentEditingGuard.id);
    if (existing) {
      if (!confirm(`Ya existe guardia el ${newDate}. ¿Intercambiar fechas?`)) return;
      const old = currentEditingGuard.date;
      currentEditingGuard.date = existing.date;
      existing.date = old;
    } else {
      currentEditingGuard.date = newDate;
    }
    guards.sort((a,b) => a.date.localeCompare(b.date));
  }
  currentEditingGuard.workerId = newWorkerId;
  currentEditingGuard.completed = newCompleted;
  currentEditingGuard.catedra = newCatedra;
  currentEditingGuard.notes = newNotes;
  saveData();
  closeModal();
  refreshUI();
}

function closeModal() {
  document.getElementById("editModal").style.display = "none";
  currentEditingGuard = null;
}

// ---------- CALENDARIO ----------
function renderCalendar() {
  const container = document.getElementById("calendarGrid");
  if (!container) return;
  const firstDay = new Date(currentCalendarYear, currentCalendarMonth, 1);
  const startWeekDay = firstDay.getDay();
  const daysInMonth = new Date(currentCalendarYear, currentCalendarMonth+1, 0).getDate();
  const monthNames = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  document.getElementById("currentMonthYear").textContent = `${monthNames[currentCalendarMonth]} ${currentCalendarYear}`;
  let grid = "";
  const weekdays = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
  weekdays.forEach(d => grid += `<div class="calendar-day-header">${d}</div>`);
  for (let i=0; i<startWeekDay; i++) grid += `<div class="calendar-day-cell calendar-empty"></div>`;
  for (let d=1; d<=daysInMonth; d++) {
    const dateStr = `${currentCalendarYear}-${String(currentCalendarMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const guard = guards.find(g => g.date === dateStr);
    const worker = guard ? workers.find(w => w.id === guard.workerId) : null;
    const workerName = worker ? worker.name : "";
    const completed = guard ? guard.completed : false;
    let cellClass = "calendar-day-cell";
    if (!guard) cellClass += " calendar-empty";
    grid += `<div class="${cellClass}" data-date="${dateStr}">
              <div class="calendar-day-number">${d}</div>`;
    if (guard) grid += `<div class="calendar-day-guard ${completed ? 'completed' : ''}">${escapeHtml(workerName)}<br>${completed ? "✅" : "⏳"}</div>`;
    grid += `</div>`;
  }
  container.innerHTML = grid;
  document.querySelectorAll(".calendar-day-cell[data-date]").forEach(cell => {
    cell.addEventListener("click", () => {
      const date = cell.dataset.date;
      const guard = guards.find(g => g.date === date);
      if (guard) openEditModal(guard);
      else alert(`No hay guardia para ${formatDate(date)}. Puedes añadirla manualmente.`);
    });
  });
}

function changeMonth(delta) {
  let newMonth = currentCalendarMonth + delta;
  let newYear = currentCalendarYear;
  if (newMonth < 0) { newMonth = 11; newYear--; }
  if (newMonth > 11) { newMonth = 0; newYear++; }
  currentCalendarYear = newYear;
  currentCalendarMonth = newMonth;
  renderCalendar();
}

// ---------- RESUMEN ----------
function renderSummary() {
  const container = document.getElementById("summaryStats");
  if (!container) return;
  const filterValue = document.getElementById("summaryFilter")?.value || "all";
  if (!workers.length) { container.innerHTML = "<p>No hay trabajadores.</p>"; return; }
  if (!guards.length) { container.innerHTML = "<p>No hay guardias generadas.</p>"; return; }
  let filteredWorkers = [...workers];
  if (filterValue === "noGuards") filteredWorkers = workers.filter(w => !guards.some(g => g.workerId === w.id));
  else if (filterValue === "noCompleted") filteredWorkers = workers.filter(w => {
    const wg = guards.filter(g => g.workerId === w.id);
    return wg.length && wg.every(g => !g.completed);
  });
  if (!filteredWorkers.length) { container.innerHTML = "<p>No hay trabajadores que coincidan.</p>"; return; }
  const total = guards.length;
  const completedTotal = guards.filter(g => g.completed).length;
  let html = `<div class="stat-card" style="background:#e6f7f0;"><h3>📊 Guardias Totales</h3><p>${completedTotal}/${total}</p><p class="percent-text">${Math.round(completedTotal/total*100)}% completado</p></div>`;
  for (const w of filteredWorkers) {
    const wg = guards.filter(g => g.workerId === w.id);
    const assigned = wg.length;
    const completed = wg.filter(g => g.completed).length;
    const percent = assigned ? Math.round(completed/assigned*100) : 0;
    html += `<div class="stat-card"><h3>👤 ${escapeHtml(w.name)}</h3><p>${completed}/${assigned}</p><div class="progress">${percent}% completado</div></div>`;
  }
  container.innerHTML = html;
}

// ---------- EXPORTAR/IMPORTAR COMPLETO ----------
function exportToJSON() {
  let fileName = prompt("Nombre del archivo:", `guardias_sindicato_${currentYear}`);
  if (!fileName) return;
  if (!fileName.endsWith(".json")) fileName += ".json";
  const exportData = { workers, guards, guardDays, currentYear, lastWorkerIndexForDays, exportDate: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.download = fileName;
  a.href = URL.createObjectURL(blob);
  a.click();
  URL.revokeObjectURL(a.href);
}

function importFromJSON(file) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.workers || !data.guards || data.currentYear === undefined) throw new Error("Formato inválido");
      workers = data.workers;
      guards = data.guards.map(g => ({ ...g, catedra: g.catedra || '', notes: g.notes || '' }));
      currentYear = data.currentYear;
      guardDays = data.guardDays || [];
      lastWorkerIndexForDays = data.lastWorkerIndexForDays || 0;
      saveData();
      document.getElementById("yearSelect").value = currentYear;
      refreshUI();
      alert("Datos importados.");
    } catch (err) { alert("Error: " + err.message); }
  };
  reader.readAsText(file);
}

function exportToCSV() {
  if (!guards.length) return alert("No hay guardias.");
  const rows = [["Fecha","Trabajador","Realizada","Cátedra","Notas"]];
  [...guards].sort((a,b)=>a.date.localeCompare(b.date)).forEach(g => {
    const worker = workers.find(w => w.id === g.workerId);
    rows.push([formatDate(g.date), worker ? worker.name : "Desconocido", g.completed ? "Sí" : "No", g.catedra || "", g.notes || ""]);
  });
  const csv = rows.map(r => r.join(",")).join("\n");
  const blob = new Blob(["\uFEFF"+csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.download = `guardias_${currentYear}.csv`;
  a.href = URL.createObjectURL(blob);
  a.click();
  URL.revokeObjectURL(a.href);
}

// ---------- VISTAS ----------
function setView(view) {
  currentView = view;
  const tableViewBtn = document.getElementById("tableViewBtn");
  const calendarViewBtn = document.getElementById("calendarViewBtn");
  const tableViewSection = document.getElementById("tableViewSection");
  const calendarViewSection = document.getElementById("calendarViewSection");
  const filtersSection = document.getElementById("filtersSection");
  if (view === "table") {
    tableViewBtn.classList.add("active");
    calendarViewBtn.classList.remove("active");
    tableViewSection.style.display = "block";
    calendarViewSection.style.display = "none";
    filtersSection.style.display = "block";
    applyFiltersAndRenderTable();
    setTimeout(() => bindSortingEvents(), 10);
  } else {
    calendarViewBtn.classList.add("active");
    tableViewBtn.classList.remove("active");
    tableViewSection.style.display = "none";
    calendarViewSection.style.display = "block";
    filtersSection.style.display = "none";
    renderCalendar();
  }
}

// ---------- LIMPIEZA Y EJEMPLO ----------
function clearAllData() {
  if (confirm("⚠️ Eliminará TODOS los datos. ¿Continuar?")) {
    workers = []; guards = []; guardDays = []; lastWorkerIndexForDays = 0; currentYear = 2026;
    saveData();
    refreshUI();
    alert("Todos los datos eliminados.");
  }
}

// ---------- REFRESCO ----------
function updateFilterWorkerSelect() {
  const select = document.getElementById("filterWorker");
  if (!select) return;
  const currentVal = select.value;
  select.innerHTML = '<option value="all">Todos los trabajadores</option>';
  workers.forEach(w => {
    const opt = document.createElement("option");
    opt.value = w.id;
    opt.textContent = w.name;
    select.appendChild(opt);
  });
  select.value = currentVal !== "all" && workers.some(w => w.id == currentVal) ? currentVal : "all";
}

function updateFilterYearSelect() {
  const select = document.getElementById("filterYear");
  if (!select) return;
  const years = [...new Set(guards.map(g => parseInt(g.date.split("-")[0])))].sort((a,b)=>a-b);
  const currentVal = select.value;
  select.innerHTML = '<option value="all">Todos los años</option>';
  years.forEach(y => {
    const opt = document.createElement("option");
    opt.value = y;
    opt.textContent = y;
    select.appendChild(opt);
  });
  select.value = currentVal !== "all" && years.includes(parseInt(currentVal)) ? currentVal : "all";
}

function updateFilterCatedraSelect() {
  const select = document.getElementById("filterCatedra");
  if (!select) return;
  const currentVal = select.value;
  // Obtener valores únicos de cátedra (excluyendo vacío)
  const valores = [...new Set(guards.map(g => g.catedra).filter(c => c && c.trim() !== ''))].sort();
  select.innerHTML = '<option value="all">Todas las cátedras</option>';
  valores.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    select.appendChild(opt);
  });
  // Restaurar selección si aún existe
  if (currentVal !== "all" && valores.includes(currentVal)) {
    select.value = currentVal;
  } else {
    select.value = "all";
  }
}

function refreshUI() {
  renderWorkersList();
  renderGuardDaysList();
  if (currentView === "table") {
    applyFiltersAndRenderTable();
    setTimeout(() => bindSortingEvents(), 10);
  } else renderCalendar();
  renderSummary();
  updateFilterWorkerSelect();
  updateFilterYearSelect();
  updateFilterCatedraSelect();
  document.getElementById("yearSelect").value = currentYear;
}

// ---------- EVENTOS ----------
function bindEvents() {
  document.getElementById("addWorkerBtn")?.addEventListener("click", addWorker);
  document.getElementById("clearAllDataBtn")?.addEventListener("click", clearAllData);
  document.getElementById("addGuardDayBtn")?.addEventListener("click", addGuardDay);
  document.getElementById("generateFromDaysBtn")?.addEventListener("click", generateGuardsFromDays);
  document.getElementById("exportDaysBtn")?.addEventListener("click", exportDaysToJSON);
  document.getElementById("importDaysInput")?.addEventListener("change", e => { if(e.target.files[0]) importDaysFromJSON(e.target.files[0]); e.target.value=""; });
  document.getElementById("generateBtn")?.addEventListener("click", regenerateGuards);
  document.getElementById("addManualGuardBtn")?.addEventListener("click", openManualModal);
  document.getElementById("exportDataBtn")?.addEventListener("click", exportToJSON);
  document.getElementById("exportCsvBtn")?.addEventListener("click", exportToCSV);
  document.getElementById("importFileInput")?.addEventListener("change", e => { if(e.target.files[0]) importFromJSON(e.target.files[0]); e.target.value=""; });
  document.getElementById("resetAllChecksBtn")?.addEventListener("click", () => { if(guards.length && confirm("Desmarcar todas?")) { guards.forEach(g=>g.completed=false); saveData(); refreshUI(); } });
  document.getElementById("clearFiltersBtn")?.addEventListener("click", () => {
    document.getElementById("filterDay").value = "all";
    document.getElementById("filterMonth").value = "all";
    document.getElementById("filterYear").value = "all";
    document.getElementById("filterWorker").value = "all";
    document.getElementById("filterCatedra").value = "all";
    applyFiltersAndRenderTable();
  });
  document.getElementById("filterDay")?.addEventListener("change", applyFiltersAndRenderTable);
  document.getElementById("filterMonth")?.addEventListener("change", applyFiltersAndRenderTable);
  document.getElementById("filterYear")?.addEventListener("change", applyFiltersAndRenderTable);
  document.getElementById("filterWorker")?.addEventListener("change", applyFiltersAndRenderTable);
  document.getElementById("filterCatedra")?.addEventListener("change", applyFiltersAndRenderTable);
  document.getElementById("summaryFilter")?.addEventListener("change", renderSummary);
  document.getElementById("tableViewBtn")?.addEventListener("click", () => setView("table"));
  document.getElementById("calendarViewBtn")?.addEventListener("click", () => setView("calendar"));
  document.getElementById("prevMonthBtn")?.addEventListener("click", () => changeMonth(-1));
  document.getElementById("nextMonthBtn")?.addEventListener("click", () => changeMonth(1));
  document.getElementById("saveEditBtn")?.addEventListener("click", saveEditGuard);
  document.getElementById("cancelEditBtn")?.addEventListener("click", closeModal);
  document.querySelector(".close")?.addEventListener("click", closeModal);
  document.getElementById("saveManualBtn")?.addEventListener("click", saveManualGuard);
  document.getElementById("cancelManualBtn")?.addEventListener("click", closeManualModal);
  document.querySelector(".close-manual")?.addEventListener("click", closeManualModal);
  document.getElementById("saveDayEditBtn")?.addEventListener("click", saveDayEdit);
  document.getElementById("cancelDayEditBtn")?.addEventListener("click", closeDayModal);
  document.querySelector(".close-day")?.addEventListener("click", closeDayModal);
  window.addEventListener("click", e => {
    if(e.target === document.getElementById("editModal")) closeModal();
    if(e.target === document.getElementById("manualModal")) closeManualModal();
    if(e.target === document.getElementById("editDayModal")) closeDayModal();
  });
  document.getElementById("workerName")?.addEventListener("keypress", e => { if(e.key === "Enter") addWorker(); });
  document.getElementById("exportWorkersBtn")?.addEventListener("click", exportWorkers);
  document.getElementById("importWorkersInput")?.addEventListener("change", handleImportWorkers);
  bindManualSearchEvent();
}

// ---------- INICIO ----------
function init() {
  loadData();
  bindEvents();
  refreshUI();
  setView("table");
}
init();