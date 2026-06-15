// ---------- MODELO ----------
let workers = [];
let guards = [];
let guardDays = []; // fechas "YYYY-MM-DD" definidas por el usuario
let currentYear = 2026;
let lastWorkerIndexForDays = 0; // índice usado para rotación continua

// Vistas
let currentView = "table"; // 'table' o 'calendar'
let currentCalendarYear = 2026;
let currentCalendarMonth = 5; // junio 2026 (0-index, 5 = junio)

// Paginación tabla
let currentPage = 1;
const rowsPerPage = 20;
let currentFilteredGuards = [];

// Claves localStorage
const STORAGE_WORKERS = "sindicato_workers";
const STORAGE_GUARDS = "sindicato_guards";
const STORAGE_YEAR = "sindicato_year";
const STORAGE_DAYS = "sindicato_guardDays";
const STORAGE_LAST_INDEX = "sindicato_lastIndexDays";

let currentEditingGuard = null;
let currentEditingDay = null; // para editar día definido

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
}

// ---------- UTILS ----------
function escapeHtml(str) {
  if (!str) return "";
  return str.replace(
    /[&<>]/g,
    (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[m],
  );
}

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

// ---------- TRABAJADORES (CRUD) ----------
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

  // ---------- ELIMINAR TRABAJADOR CON OPCIONES ----------
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
        alert(
          `Trabajador "${worker.name}" eliminado junto con sus ${guardCount} guardias.`,
        );
      } else if (opcion === "2") {
        workers = workers.filter((w) => w.id !== id);
        alert(
          `Trabajador "${worker.name}" eliminado. Se conservaron ${guardCount} guardias (aparecerán como "❌ Eliminado" en la tabla).`,
        );
      } else if (opcion === "3") {
        if (workers.length === 1) {
          alert(
            "No hay otros trabajadores para reasignar las guardias. Elimina el trabajador sin reasignar.",
          );
          return;
        }
        const otherWorkers = workers.filter((w) => w.id !== id);
        let workerListStr = otherWorkers
          .map((w, idx) => `${idx + 1}. ${w.name}`)
          .join("\n");
        let newWorkerIndex = prompt(
          `Selecciona el trabajador que recibirá las ${guardCount} guardias:\n${workerListStr}`,
          "1",
        );
        if (newWorkerIndex === null) return;
        newWorkerIndex = parseInt(newWorkerIndex) - 1;
        if (
          isNaN(newWorkerIndex) ||
          newWorkerIndex < 0 ||
          newWorkerIndex >= otherWorkers.length
        ) {
          alert("Opción inválida. No se realizó ningún cambio.");
          return;
        }
        const newWorker = otherWorkers[newWorkerIndex];
        for (let guard of guards) {
          if (guard.workerId === id) {
            guard.workerId = newWorker.id;
          }
        }
        workers = workers.filter((w) => w.id !== id);
        saveData();
        refreshUI();
        alert(
          `Trabajador "${worker.name}" eliminado. Sus ${guardCount} guardias fueron reasignadas a "${newWorker.name}".`,
        );
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
  if (workers.some((w) => w.name.toLowerCase() === name.toLowerCase()))
    return alert("Ya existe");
  workers.push({ id: Date.now(), name });
  saveData();
  input.value = "";
  refreshUI();
  alert("Trabajador añadido.");
}

// ---------- EXPORTAR / IMPORTAR TRABAJADORES ----------
function exportWorkers() {
  if (workers.length === 0) {
    alert("No hay trabajadores para exportar.");
    return;
  }
  const exportObj = {
    workers: workers,
    exportDate: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(exportObj, null, 2)], {
    type: "application/json",
  });
  const a = document.createElement("a");
  const today = new Date().toISOString().split("T")[0];
  a.download = `trabajadores_${today}.json`;
  a.href = URL.createObjectURL(blob);
  a.click();
  URL.revokeObjectURL(a.href);
}

function importWorkersFromJSON(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      let newWorkers = null;
      if (Array.isArray(data)) {
        newWorkers = data;
      } else if (data.workers && Array.isArray(data.workers)) {
        newWorkers = data.workers;
      } else {
        throw new Error(
          'Formato inválido: se esperaba un array de trabajadores o un objeto con propiedad "workers".',
        );
      }
      if (newWorkers.length === 0) {
        if (
          confirm(
            "El archivo no contiene trabajadores. ¿Deseas borrar todos los trabajadores actuales?",
          )
        ) {
          workers = [];
          guards = []; // Al no haber trabajadores, las guardias quedarían huérfanas
          lastWorkerIndexForDays = 0;
          saveData();
          refreshUI();
          alert("Todos los trabajadores y guardias han sido eliminados.");
        }
        return;
      }
      // Validar estructura básica
      if (!newWorkers.every((w) => w.id && typeof w.name === "string")) {
        throw new Error(
          'Algún trabajador no tiene los campos "id" y "name" válidos.',
        );
      }
      // Reemplazar trabajadores
      workers = newWorkers;
      // Limpiar guardias y contador de rotación para evitar inconsistencias
      guards = [];
      lastWorkerIndexForDays = 0;
      saveData();
      refreshUI();
      alert(
        `Se importaron ${workers.length} trabajadores. Las guardias existentes se han eliminado para mantener la coherencia. Puedes regenerar las guardias desde los días definidos o con la generación automática.`,
      );
    } catch (err) {
      alert("Error al importar: " + err.message);
    }
  };
  reader.readAsText(file);
}

function handleImportWorkers(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (
    confirm(
      "Al importar trabajadores se reemplazará la lista actual y se borrarán TODAS las guardias existentes (se conservarán los días definidos). ¿Continuar?",
    )
  ) {
    importWorkersFromJSON(file);
  }
  event.target.value = ""; // permitir importar el mismo archivo otra vez
}

// ---------- DÍAS DE GUARDIA (CRUD + rotación continua) ----------
function renderGuardDaysList() {
  const container = document.getElementById("guardDaysList");
  if (!container) return;
  if (guardDays.length === 0) {
    container.innerHTML =
      "<p>No hay días definidos. Añade fechas específicas para las guardias.</p>";
    return;
  }
  const sorted = [...guardDays].sort();
  container.innerHTML = "";
  for (const day of sorted) {
    const tag = document.createElement("div");
    tag.className = "day-tag";
    const formatted = formatDate(day);
    tag.innerHTML = `<span>📅 ${formatted}</span>
                        <button class="edit-day" data-date="${day}">✏️</button>
                        <button class="remove-day" data-date="${day}">✖️</button>`;
    container.appendChild(tag);
  }
  // Eliminar día
  document.querySelectorAll(".remove-day").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const date = btn.dataset.date;
      if (confirm(`¿Eliminar el día ${date} de la lista?`)) {
        guardDays = guardDays.filter((d) => d !== date);
        saveData();
        renderGuardDaysList();
        if (
          confirm("¿Deseas eliminar también las guardias asignadas a ese día?")
        ) {
          guards = guards.filter((g) => g.date !== date);
          saveData();
          refreshUI();
        } else {
          refreshUI();
        }
      }
    });
  });
  // Editar día
  document.querySelectorAll(".edit-day").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const oldDate = btn.dataset.date;
      openEditDayModal(oldDate);
    });
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
  if (!newDate) {
    alert("Selecciona una fecha.");
    return;
  }
  if (guardDays.includes(newDate) && newDate !== currentEditingDay) {
    alert("Esa fecha ya está en la lista.");
    return;
  }
  const index = guardDays.indexOf(currentEditingDay);
  if (index !== -1) guardDays[index] = newDate;
  guardDays.sort();
  const guardToUpdate = guards.find((g) => g.date === currentEditingDay);
  if (guardToUpdate) {
    guardToUpdate.date = newDate;
    guards.sort((a, b) => a.date.localeCompare(b.date));
  }
  saveData();
  closeDayModal();
  refreshUI();
  alert("Día actualizado correctamente.");
}

function closeDayModal() {
  document.getElementById("editDayModal").style.display = "none";
  currentEditingDay = null;
}

function addGuardDay() {
  const dateInput = document.getElementById("newGuardDay");
  const newDate = dateInput.value;
  if (!newDate) return alert("Selecciona una fecha");
  if (guardDays.includes(newDate)) return alert("Ese día ya está en la lista");
  guardDays.push(newDate);
  guardDays.sort();
  saveData();
  renderGuardDaysList();
  dateInput.value = new Date().toISOString().split("T")[0];
  alert("Día añadido a la lista de guardias.");
}

// Generar guardias SOLO para los días NUEVOS que no tengan guardia asignada
function generateGuardsFromDays() {
  if (workers.length === 0) {
    alert("No hay trabajadores. Añade al menos uno.");
    return;
  }
  if (guardDays.length === 0) {
    alert("No hay días definidos. Añade días de guardia primero.");
    return;
  }

  const sortedDays = [...guardDays].sort();

  // Separar los días que ya tienen guardia de los que no
  const existingGuardsForDays = guards.filter((g) =>
    guardDays.includes(g.date),
  );
  const existingDates = new Set(existingGuardsForDays.map((g) => g.date));
  const newDays = sortedDays.filter((date) => !existingDates.has(date));

  if (newDays.length === 0) {
    alert("Todos los días ya tienen guardia asignada. No hay días nuevos.");
    return;
  }

  // Conservar todas las guardias existentes (no se tocan)
  const otherGuards = guards.filter((g) => !guardDays.includes(g.date));

  // Generar nuevas guardias solo para los días nuevos, continuando la rotación
  const newGuards = [];
  let workerIndex = lastWorkerIndexForDays;
  let maxId = guards.length > 0 ? Math.max(...guards.map((g) => g.id)) : 0;

  for (const date of newDays) {
    const worker = workers[workerIndex % workers.length];
    newGuards.push({
      id: ++maxId,
      date: date,
      workerId: worker.id,
      completed: false,
    });
    workerIndex++;
  }

  // Actualizar el último índice usado (para la próxima vez)
  lastWorkerIndexForDays = workerIndex % workers.length;

  // Combinar: guardias existentes (incluyendo las de días ya cubiertos) + las nuevas
  const combined = [...otherGuards, ...existingGuardsForDays, ...newGuards];
  combined.sort((a, b) => a.date.localeCompare(b.date));
  guards = combined;

  saveData();
  refreshUI();
  alert(
    `Se generaron ${newGuards.length} guardias para los días nuevos. Se conservaron ${existingGuardsForDays.length} guardias existentes.`,
  );
}

// Exportar SOLO los días definidos a JSON
function exportDaysToJSON() {
  if (guardDays.length === 0) {
    alert("No hay días definidos para exportar.");
    return;
  }
  const data = { guardDays: guardDays, exportDate: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `dias_guardia_${currentYear}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function importDaysFromJSON(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.guardDays || !Array.isArray(data.guardDays))
        throw new Error("Formato inválido");
      guardDays = data.guardDays;
      guardDays.sort();
      saveData();
      renderGuardDaysList();
      alert("Días importados correctamente.");
    } catch (err) {
      alert("Error: " + err.message);
    }
  };
  reader.readAsText(file);
}

// ---------- GENERACIÓN AUTOMÁTICA TRADICIONAL (todos laborables) ----------
function generateGuardsForYear(year) {
  if (workers.length === 0) return [];
  const newGuards = [];
  let guardId = 1;
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);
  let dayPointer = new Date(startDate);
  let workerIndex = 0;

  while (dayPointer <= endDate) {
    const dayOfWeek = dayPointer.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    if (!isWeekend) {
      const worker = workers[workerIndex % workers.length];
      const formattedDate = `${dayPointer.getFullYear()}-${String(dayPointer.getMonth() + 1).padStart(2, "0")}-${String(dayPointer.getDate()).padStart(2, "0")}`;
      newGuards.push({
        id: guardId++,
        date: formattedDate,
        workerId: worker.id,
        completed: false,
      });
      workerIndex++;
    }
    dayPointer.setDate(dayPointer.getDate() + 1);
  }
  return newGuards;
}

function regenerateGuards() {
  if (workers.length === 0) {
    alert("No hay trabajadores.");
    return;
  }
  const year = parseInt(document.getElementById("yearSelect").value);
  currentYear = year;
  // Conservar guardias de fines de semana
  const weekendGuards = guards.filter((g) => {
    const date = new Date(g.date);
    const day = date.getDay();
    return day === 0 || day === 6;
  });
  const newLaborableGuards = generateGuardsForYear(currentYear);
  const combined = [...newLaborableGuards];
  for (const wg of weekendGuards) {
    if (!combined.some((g) => g.date === wg.date)) combined.push(wg);
  }
  combined.sort((a, b) => a.date.localeCompare(b.date));
  combined.forEach((g, idx) => {
    g.id = idx + 1;
  });
  guards = combined;
  saveData();
  refreshUI();
  alert(
    `Guardias regeneradas para ${currentYear}. Días laborables: ${newLaborableGuards.length}`,
  );
}

// ---------- GUARDIAS MANUALES ----------
function openManualModal() {
  if (workers.length === 0) {
    alert("Primero añade trabajadores.");
    return;
  }
  const workerSelect = document.getElementById("manualWorker");
  workerSelect.innerHTML = "";
  workers.forEach((w) => {
    const opt = document.createElement("option");
    opt.value = w.id;
    opt.textContent = w.name;
    workerSelect.appendChild(opt);
  });
  document.getElementById("manualDate").value = new Date()
    .toISOString()
    .split("T")[0];
  document.getElementById("manualModal").style.display = "flex";
}

function saveManualGuard() {
  const fechaStr = document.getElementById("manualDate").value;
  const workerId = parseInt(document.getElementById("manualWorker").value);
  if (!fechaStr) {
    alert("Selecciona una fecha.");
    return;
  }
  const year = parseInt(fechaStr.split("-")[0]);
  if (year !== currentYear) {
    if (confirm(`La fecha es de ${year}. ¿Cambiar año y regenerar?`)) {
      document.getElementById("yearSelect").value = year;
      currentYear = year;
      regenerateGuards();
      closeManualModal();
    }
    return;
  }
  const existing = guards.find((g) => g.date === fechaStr);
  if (existing) {
    if (confirm(`Ya existe guardia el ${fechaStr}. ¿Sobrescribir?`)) {
      existing.workerId = workerId;
      existing.completed = false;
      saveData();
      refreshUI();
      alert("Guardia actualizada.");
      closeManualModal();
    }
  } else {
    const maxId = guards.length > 0 ? Math.max(...guards.map((g) => g.id)) : 0;
    guards.push({ id: maxId + 1, date: fechaStr, workerId, completed: false });
    guards.sort((a, b) => a.date.localeCompare(b.date));
    saveData();
    refreshUI();
    alert("Guardia añadida manualmente.");
    closeManualModal();
  }
}

function closeManualModal() {
  document.getElementById("manualModal").style.display = "none";
}

// ---------- TABLA CON PAGINACIÓN Y FILTROS ----------
function updateFilterWorkerSelect() {
  const select = document.getElementById("filterWorker");
  if (!select) return;
  const currentVal = select.value;
  select.innerHTML = '<option value="all">Todos los trabajadores</option>';
  workers.forEach((w) => {
    const opt = document.createElement("option");
    opt.value = w.id;
    opt.textContent = w.name;
    select.appendChild(opt);
  });
  select.value =
    currentVal !== "all" && workers.some((w) => w.id == currentVal)
      ? currentVal
      : "all";
}

function updateFilterYearSelect() {
  const select = document.getElementById("filterYear");
  if (!select) return;
  const yearsSet = new Set();
  guards.forEach((g) => {
    const y = parseInt(g.date.split("-")[0]);
    if (!isNaN(y)) yearsSet.add(y);
  });
  const years = Array.from(yearsSet).sort((a, b) => a - b);
  const currentVal = select.value;
  select.innerHTML = '<option value="all">Todos los años</option>';
  years.forEach((y) => {
    const opt = document.createElement("option");
    opt.value = y;
    opt.textContent = y;
    select.appendChild(opt);
  });
  select.value =
    currentVal !== "all" && years.includes(parseInt(currentVal))
      ? currentVal
      : "all";
}

function applyFiltersAndRenderTable() {
  const filterDay = document.getElementById("filterDay")?.value || "all";
  const filterMonth = document.getElementById("filterMonth")?.value || "all";
  const filterYear = document.getElementById("filterYear")?.value || "all";
  const filterWorker = document.getElementById("filterWorker")?.value || "all";

  let filtered = [...guards].sort((a, b) => a.date.localeCompare(b.date));
  if (filterDay !== "all")
    filtered = filtered.filter(
      (g) => parseInt(g.date.split("-")[2]) === parseInt(filterDay),
    );
  if (filterMonth !== "all")
    filtered = filtered.filter(
      (g) => parseInt(g.date.split("-")[1]) === parseInt(filterMonth),
    );
  if (filterYear !== "all")
    filtered = filtered.filter(
      (g) => parseInt(g.date.split("-")[0]) === parseInt(filterYear),
    );
  if (filterWorker !== "all")
    filtered = filtered.filter((g) => g.workerId === parseInt(filterWorker));

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
  if (pageGuards.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="4">No hay guardias que coincidan con los filtros.</td></tr>';
    renderPaginationControls(0);
    return;
  }
  tbody.innerHTML = "";
  for (const guard of pageGuards) {
    const worker = workers.find((w) => w.id === guard.workerId);
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
    });
    chkCell.appendChild(chk);
    const actionsCell = row.insertCell(3);
    const editBtn = document.createElement("button");
    editBtn.textContent = "✏️ Editar";
    editBtn.className = "btn-edit";
    editBtn.style.marginRight = "5px";
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
}

function renderPaginationControls(totalPages) {
  const container = document.getElementById("paginationControls");
  if (!container) return;
  if (totalPages <= 1) {
    container.innerHTML = "";
    return;
  }
  let html = `<button ${currentPage === 1 ? "disabled" : ""} data-page="${currentPage - 1}">◀ Anterior</button>`;
  let startPage = Math.max(1, currentPage - 3);
  let endPage = Math.min(totalPages, currentPage + 3);
  if (endPage - startPage < 6) {
    if (startPage === 1) endPage = Math.min(totalPages, startPage + 6);
    else startPage = Math.max(1, endPage - 6);
  }
  for (let i = startPage; i <= endPage; i++)
    html += `<button class="${i === currentPage ? "active" : ""}" data-page="${i}">${i}</button>`;
  html += `<button ${currentPage === totalPages ? "disabled" : ""} data-page="${currentPage + 1}">Siguiente ▶</button>`;
  container.innerHTML = html;
  container.querySelectorAll("button[data-page]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const page = parseInt(btn.dataset.page);
      if (!isNaN(page) && page >= 1 && page <= totalPages) {
        currentPage = page;
        renderGuardsTablePage();
      }
    });
  });
}

function deleteGuard(guardId) {
  if (confirm("¿Eliminar esta guardia?")) {
    guards = guards.filter((g) => g.id !== guardId);
    saveData();
    applyFiltersAndRenderTable();
    renderSummary();
    if (currentView === "calendar") renderCalendar();
  }
}

function openEditModal(guard) {
  currentEditingGuard = guard;
  const modal = document.getElementById("editModal");
  const dateInput = document.getElementById("editDate");
  const workerSelect = document.getElementById("editWorker");
  const completedCheck = document.getElementById("editCompleted");
  workerSelect.innerHTML = "";
  workers.forEach((w) => {
    const opt = document.createElement("option");
    opt.value = w.id;
    opt.textContent = w.name;
    if (w.id === guard.workerId) opt.selected = true;
    workerSelect.appendChild(opt);
  });
  dateInput.value = guard.date;
  completedCheck.checked = guard.completed;
  modal.style.display = "flex";
}

function saveEditGuard() {
  if (!currentEditingGuard) return;
  const newDate = document.getElementById("editDate").value;
  const newWorkerId = parseInt(document.getElementById("editWorker").value);
  const newCompleted = document.getElementById("editCompleted").checked;
  if (!newDate) {
    alert("Selecciona fecha");
    return;
  }
  if (newDate !== currentEditingGuard.date) {
    const existing = guards.find(
      (g) => g.date === newDate && g.id !== currentEditingGuard.id,
    );
    if (existing) {
      if (!confirm(`Ya existe guardia el ${newDate}. ¿Intercambiar fechas?`))
        return;
      const old = currentEditingGuard.date;
      currentEditingGuard.date = existing.date;
      existing.date = old;
    } else {
      currentEditingGuard.date = newDate;
    }
    guards.sort((a, b) => a.date.localeCompare(b.date));
  }
  currentEditingGuard.workerId = newWorkerId;
  currentEditingGuard.completed = newCompleted;
  saveData();
  closeModal();
  refreshUI();
}

function closeModal() {
  document.getElementById("editModal").style.display = "none";
  currentEditingGuard = null;
}

// ---------- VISTA DE CALENDARIO ----------
function renderCalendar() {
  const container = document.getElementById("calendarGrid");
  if (!container) return;
  const firstDayOfMonth = new Date(
    currentCalendarYear,
    currentCalendarMonth,
    1,
  );
  const startDayOfWeek = firstDayOfMonth.getDay();
  const daysInMonth = new Date(
    currentCalendarYear,
    currentCalendarMonth + 1,
    0,
  ).getDate();
  const monthNames = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];
  document.getElementById("currentMonthYear").textContent =
    `${monthNames[currentCalendarMonth]} ${currentCalendarYear}`;
  let gridHtml = "";
  const weekdays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  for (let w of weekdays)
    gridHtml += `<div class="calendar-day-header">${w}</div>`;
  for (let i = 0; i < startDayOfWeek; i++)
    gridHtml += `<div class="calendar-day-cell calendar-empty"></div>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${currentCalendarYear}-${String(currentCalendarMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const guard = guards.find((g) => g.date === dateStr);
    const worker = guard ? workers.find((w) => w.id === guard.workerId) : null;
    const workerName = worker ? worker.name : "";
    const completed = guard ? guard.completed : false;
    let cellClass = "calendar-day-cell";
    if (!guard) cellClass += " calendar-empty";
    gridHtml += `<div class="${cellClass}" data-date="${dateStr}">
                        <div class="calendar-day-number">${d}</div>`;
    if (guard) {
      gridHtml += `<div class="calendar-day-guard ${completed ? "completed" : ""}">
                            ${escapeHtml(workerName)}<br>
                            ${completed ? "✅" : "⏳"}
                         </div>`;
    }
    gridHtml += `</div>`;
  }
  container.innerHTML = gridHtml;
  document.querySelectorAll(".calendar-day-cell[data-date]").forEach((cell) => {
    cell.addEventListener("click", () => {
      const date = cell.dataset.date;
      const guard = guards.find((g) => g.date === date);
      if (guard) openEditModal(guard);
      else
        alert(
          `No hay guardia asignada para ${formatDate(date)}. Puedes añadirla manualmente.`,
        );
    });
  });
}

function changeMonth(delta) {
  let newMonth = currentCalendarMonth + delta;
  let newYear = currentCalendarYear;
  if (newMonth < 0) {
    newMonth = 11;
    newYear--;
  }
  if (newMonth > 11) {
    newMonth = 0;
    newYear++;
  }
  currentCalendarYear = newYear;
  currentCalendarMonth = newMonth;
  renderCalendar();
}

// ---------- RESUMEN Y ESTADÍSTICAS ----------
function renderSummary() {
  const container = document.getElementById("summaryStats");
  if (!container) return;
  const filterValue = document.getElementById("summaryFilter")?.value || "all";
  if (workers.length === 0) {
    container.innerHTML = "<p>No hay trabajadores.</p>";
    return;
  }
  if (guards.length === 0) {
    container.innerHTML = "<p>No hay guardias generadas.</p>";
    return;
  }
  let filteredWorkers = [...workers];
  if (filterValue === "noGuards") {
    filteredWorkers = workers.filter(
      (w) => guards.filter((g) => g.workerId === w.id).length === 0,
    );
  } else if (filterValue === "noCompleted") {
    filteredWorkers = workers.filter((w) => {
      const wg = guards.filter((g) => g.workerId === w.id);
      return wg.length > 0 && wg.every((g) => !g.completed);
    });
  }
  if (filteredWorkers.length === 0) {
    container.innerHTML =
      "<p>No hay trabajadores que coincidan con el filtro.</p>";
    return;
  }
  const totalGuards = guards.length;
  const completedGuards = guards.filter((g) => g.completed).length;
  let html = `<div class="stat-card" style="background:#e6f7f0;"><h3>📊 Guardias Totales </h3><p>${completedGuards}/${totalGuards}</p><p>${Math.round((completedGuards / totalGuards) * 100)}% completado</p></div>`;
  for (const w of filteredWorkers) {
    const wg = guards.filter((g) => g.workerId === w.id);
    const assigned = wg.length;
    const completed = wg.filter((g) => g.completed).length;
    const percent = assigned ? Math.round((completed / assigned) * 100) : 0;
    html += `<div class="stat-card"><h3>👤 ${escapeHtml(w.name)}</h3><p>${completed}/${assigned}</p><div class="progress">${percent}%</div></div>`;
  }
  container.innerHTML = html;
}

// ---------- EXPORTACIÓN / IMPORTACIÓN COMPLETA ----------
function exportToJSON() {
  let fileName = prompt(
    "Nombre del archivo:",
    `guardias_sindicato_${currentYear}`,
  );
  if (!fileName) return;
  if (!fileName.toLowerCase().endsWith(".json")) fileName += ".json";
  const exportData = {
    workers,
    guards,
    guardDays,
    currentYear,
    lastWorkerIndexForDays,
    exportDate: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: "application/json",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(a.href);
}

function importFromJSON(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.workers || !data.guards || data.currentYear === undefined)
        throw new Error("Formato inválido");
      workers = data.workers;
      guards = data.guards;
      currentYear = data.currentYear;
      guardDays = data.guardDays || [];
      lastWorkerIndexForDays = data.lastWorkerIndexForDays || 0;
      saveData();
      document.getElementById("yearSelect").value = currentYear;
      refreshUI();
      alert("Datos importados correctamente.");
    } catch (err) {
      alert("Error: " + err.message);
    }
  };
  reader.readAsText(file);
}

function exportToCSV() {
  if (guards.length === 0) {
    alert("No hay guardias para exportar.");
    return;
  }
  let csvRows = [["Fecha", "Trabajador", "Realizada"]];
  const sorted = [...guards].sort((a, b) => a.date.localeCompare(b.date));
  for (const g of sorted) {
    const worker = workers.find((w) => w.id === g.workerId);
    const workerName = worker ? worker.name : "Desconocido";
    csvRows.push([formatDate(g.date), workerName, g.completed ? "Sí" : "No"]);
  }
  const csvContent = csvRows.map((row) => row.join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.setAttribute("download", `guardias_${currentYear}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ---------- VISTA TOGGLE ----------
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
  } else {
    calendarViewBtn.classList.add("active");
    tableViewBtn.classList.remove("active");
    tableViewSection.style.display = "none";
    calendarViewSection.style.display = "block";
    filtersSection.style.display = "none";
    renderCalendar();
  }
}

// ---------- DATOS DE EJEMPLO Y LIMPIEZA ----------
function loadExampleWorkers() {
  if (
    workers.length > 0 &&
    !confirm("¿Sobrescribir los trabajadores actuales?")
  )
    return;
  workers = [
    { id: Date.now() + 1, name: "Ana Rodríguez" },
    { id: Date.now() + 2, name: "Luis Pérez" },
    { id: Date.now() + 3, name: "Carmen Gómez" },
    { id: Date.now() + 4, name: "Jorge Fernández" },
  ];
  saveData();
  refreshUI();
  alert("Trabajadores de ejemplo cargados.");
}

function clearAllData() {
  if (
    !confirm(
      "⚠️ Eliminará TODOS los trabajadores, guardias y días definidos. ¿Continuar?",
    )
  )
    return;
  workers = [];
  guards = [];
  guardDays = [];
  lastWorkerIndexForDays = 0;
  currentYear = 2026;
  saveData();
  refreshUI();
  alert("Todos los datos han sido eliminados.");
}

// ---------- REFRESCO GENERAL ----------
function refreshUI() {
  renderWorkersList();
  renderGuardDaysList();
  if (currentView === "table") {
    applyFiltersAndRenderTable();
  } else {
    renderCalendar();
  }
  renderSummary();
  updateFilterWorkerSelect();
  updateFilterYearSelect();
  document.getElementById("yearSelect").value = currentYear;
}

// ---------- EVENTOS ----------
function bindEvents() {
  document.getElementById("addWorkerBtn")?.addEventListener("click", addWorker);
  document
    .getElementById("loadExampleBtn")
    ?.addEventListener("click", loadExampleWorkers);
  document
    .getElementById("clearAllDataBtn")
    ?.addEventListener("click", clearAllData);
  document
    .getElementById("addGuardDayBtn")
    ?.addEventListener("click", addGuardDay);
  document
    .getElementById("generateFromDaysBtn")
    ?.addEventListener("click", generateGuardsFromDays);
  document
    .getElementById("exportDaysBtn")
    ?.addEventListener("click", exportDaysToJSON);
  document
    .getElementById("importDaysInput")
    ?.addEventListener("change", (e) => {
      if (e.target.files[0]) importDaysFromJSON(e.target.files[0]);
      e.target.value = "";
    });
  document
    .getElementById("generateBtn")
    ?.addEventListener("click", regenerateGuards);
  document
    .getElementById("addManualGuardBtn")
    ?.addEventListener("click", openManualModal);
  document
    .getElementById("exportDataBtn")
    ?.addEventListener("click", exportToJSON);
  document
    .getElementById("exportCsvBtn")
    ?.addEventListener("click", exportToCSV);
  document
    .getElementById("importFileInput")
    ?.addEventListener("change", (e) => {
      if (e.target.files[0]) importFromJSON(e.target.files[0]);
      e.target.value = "";
    });
  document
    .getElementById("resetAllChecksBtn")
    ?.addEventListener("click", () => {
      if (guards.length && confirm("Desmarcar todas?")) {
        guards.forEach((g) => (g.completed = false));
        saveData();
        refreshUI();
      }
    });
  document.getElementById("clearFiltersBtn")?.addEventListener("click", () => {
    document.getElementById("filterDay").value = "all";
    document.getElementById("filterMonth").value = "all";
    document.getElementById("filterYear").value = "all";
    document.getElementById("filterWorker").value = "all";
    applyFiltersAndRenderTable();
  });
  document
    .getElementById("filterDay")
    ?.addEventListener("change", applyFiltersAndRenderTable);
  document
    .getElementById("filterMonth")
    ?.addEventListener("change", applyFiltersAndRenderTable);
  document
    .getElementById("filterYear")
    ?.addEventListener("change", applyFiltersAndRenderTable);
  document
    .getElementById("filterWorker")
    ?.addEventListener("change", applyFiltersAndRenderTable);
  document
    .getElementById("summaryFilter")
    ?.addEventListener("change", renderSummary);
  document
    .getElementById("tableViewBtn")
    ?.addEventListener("click", () => setView("table"));
  document
    .getElementById("calendarViewBtn")
    ?.addEventListener("click", () => setView("calendar"));
  document
    .getElementById("prevMonthBtn")
    ?.addEventListener("click", () => changeMonth(-1));
  document
    .getElementById("nextMonthBtn")
    ?.addEventListener("click", () => changeMonth(1));
  document
    .getElementById("saveEditBtn")
    ?.addEventListener("click", saveEditGuard);
  document
    .getElementById("cancelEditBtn")
    ?.addEventListener("click", closeModal);
  document.querySelector(".close")?.addEventListener("click", closeModal);
  document
    .getElementById("saveManualBtn")
    ?.addEventListener("click", saveManualGuard);
  document
    .getElementById("cancelManualBtn")
    ?.addEventListener("click", closeManualModal);
  document
    .querySelector(".close-manual")
    ?.addEventListener("click", closeManualModal);
  document
    .getElementById("saveDayEditBtn")
    ?.addEventListener("click", saveDayEdit);
  document
    .getElementById("cancelDayEditBtn")
    ?.addEventListener("click", closeDayModal);
  document
    .querySelector(".close-day")
    ?.addEventListener("click", closeDayModal);
  window.addEventListener("click", (e) => {
    if (e.target === document.getElementById("editModal")) closeModal();
    if (e.target === document.getElementById("manualModal")) closeManualModal();
    if (e.target === document.getElementById("editDayModal")) closeDayModal();
  });
  document.getElementById("workerName")?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") addWorker();
  });

  // Nuevos eventos para exportar/importar trabajadores
  document
    .getElementById("exportWorkersBtn")
    ?.addEventListener("click", exportWorkers);
  document
    .getElementById("importWorkersInput")
    ?.addEventListener("change", handleImportWorkers);
}

// ---------- INICIALIZACIÓN ----------
function init() {
  loadData();
  bindEvents();
  refreshUI();
  setView("table");
  if (guards.length === 0 && workers.length > 0) {
    console.log(
      'Usa "Generar Guardias Automáticamente" o define días y genera.',
    );
  }
}
init();
