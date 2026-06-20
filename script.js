// ============================================================
//  SCRIPT CON FIREBASE (Firestore + Authentication)
// ============================================================

import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  writeBatch
} from 'firebase/firestore';

// ----- CONFIGURACIÓN DE FIREBASE (PEGA TUS CREDENCIALES) -----
const firebaseConfig = {
  apiKey: "AIzaSyA4vWcnuFpSGSOlMGM_ExOCUQSj3i7b7QE",
  authDomain: "guardias-sindicato.firebaseapp.com",
  projectId: "guardias-sindicato",
  storageBucket: "guardias-sindicato.firebasestorage.app",
  messagingSenderId: "824607541170",
  appId: "1:824607541170:web:7eadf833f2fa1340fec6ab",
  measurementId: "G-X9ZRE2NB47"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// ----- VARIABLES GLOBALES -----
let workers = [];
let guards = [];
let guardDays = [];
let currentYear = 2026;
let lastWorkerIndexForDays = 0;
let currentUser = null; // { uid, email, role, workerId }

// Vistas, paginación, etc.
let currentView = 'table';
let currentCalendarYear = 2026;
let currentCalendarMonth = 5;
let currentPage = 1;
const rowsPerPage = 20;
let currentFilteredGuards = [];
let currentSortColumn = 'date';
let currentSortOrder = 'asc';
let currentEditingGuard = null;
let currentEditingDay = null;

// ----- REFERENCIAS A COLECCIONES -----
const workersRef = collection(db, 'workers');
const guardsRef = collection(db, 'guards');
const guardDaysRef = collection(db, 'guardDays');
const configRef = doc(db, 'config', 'main');

// ============================================================
//  FUNCIONES DE CARGA (LEER DESDE FIRESTORE)
// ============================================================

async function loadWorkers() {
  const snapshot = await getDocs(workersRef);
  workers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function loadGuards() {
  const snapshot = await getDocs(guardsRef);
  guards = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function loadGuardDays() {
  const snapshot = await getDocs(guardDaysRef);
  guardDays = snapshot.docs.map(doc => doc.id); // el id es la fecha
}

async function loadConfig() {
  const docSnap = await getDoc(configRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    currentYear = data.currentYear || 2026;
    lastWorkerIndexForDays = data.lastWorkerIndexForDays || 0;
  } else {
    // Configuración por defecto
    await setDoc(configRef, { currentYear: 2026, lastWorkerIndexForDays: 0 });
  }
}

// Carga inicial de todos los datos
async function loadAllData() {
  await Promise.all([loadWorkers(), loadGuards(), loadGuardDays(), loadConfig()]);
  guards.sort((a, b) => a.date.localeCompare(b.date));
  refreshUI();
}

// ============================================================
//  FUNCIONES DE ESCRITURA (GUARDAR EN FIRESTORE)
// ============================================================

// --- Trabajadores ---
async function addWorkerToFirestore(name) {
  const id = Date.now().toString(); // <-- string
  await setDoc(doc(db, 'workers', id), { id, name });
}

async function updateWorkerInFirestore(id, name) {
  await updateDoc(doc(db, 'workers', id), { name });
}

async function deleteWorkerFromFirestore(id) {
  await deleteDoc(doc(db, 'workers', id));
}

// --- Guardias ---
async function addGuardToFirestore(guard) {
  const id = guard.id ? guard.id.toString() : Date.now().toString();
  // Asegurar que workerId sea string o null
  const workerId = guard.workerId !== undefined && guard.workerId !== null ? String(guard.workerId) : null;
  await setDoc(doc(db, 'guards', id), { ...guard, id, workerId });
}

async function updateGuardInFirestore(id, data) {
  // Asegurar que workerId sea string o null si se está actualizando
  if (data.workerId !== undefined) {
    data.workerId = data.workerId !== null ? String(data.workerId) : null;
  }
  await updateDoc(doc(db, 'guards', id), data);
}

async function deleteGuardFromFirestore(id) {
  await deleteDoc(doc(db, 'guards', id));
}

// --- Días de guardia ---
async function addGuardDayToFirestore(date) {
  await setDoc(doc(db, 'guardDays', date), { date });
}

async function deleteGuardDayFromFirestore(date) {
  await deleteDoc(doc(db, 'guardDays', date));
}

// --- Configuración ---
async function updateConfigInFirestore(year, lastIndex) {
  await updateDoc(configRef, { currentYear: year, lastWorkerIndexForDays: lastIndex });
}

// ============================================================
//  AUTENTICACIÓN
// ============================================================

async function login(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    throw new Error(error.message);
  }
}

async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, provider);
    // El usuario ya está autenticado, onAuthStateChanged se encargará del resto
    return result.user;
  } catch (error) {
    if (error.code === 'auth/popup-closed-by-user') {
      // El usuario cerró la ventana emergente, no hacemos nada
      return null;
    } else if (error.code === 'auth/account-exists-with-different-credential') {
      alert('Ya existe una cuenta con este email usando otro método de autenticación. Por favor, inicia sesión con ese método.');
      return null;
    } else {
      alert('Error al iniciar sesión con Google: ' + error.message);
      return null;
    }
  }
}

function logout() {
  return signOut(auth);
}

// ============================================================
//  FUNCIONES DE UI (ADAPTADAS A FIRESTORE)
// ============================================================

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[m]);
}

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

// ----- RENDERIZAR LISTA DE TRABAJADORES -----
function renderWorkersList() {
  const container = document.getElementById('workersList');
  if (!container) return;
  if (workers.length === 0) {
    container.innerHTML = '<p>No hay trabajadores.<br>Añade uno.</p>';
    return;
  }
  container.innerHTML = '';
  workers.forEach((worker) => {
    const tag = document.createElement('div');
    tag.className = 'worker-tag';
    tag.innerHTML = `<span>👤 ${escapeHtml(worker.name)}</span>
                     <button class="edit-worker" data-id="${worker.id}">✏️</button>
                     <button class="delete-worker" data-id="${worker.id}">🗑️</button>`;
    container.appendChild(tag);
  });

  // Editar trabajador (sin parseInt)
  document.querySelectorAll('.edit-worker').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!isAdmin()) return alert('No tienes permisos.');
      const id = btn.dataset.id; // <-- string
      const worker = workers.find(w => w.id === id);
      if (worker) {
        const newName = prompt('Editar nombre:', worker.name);
        if (newName && newName.trim()) {
          await updateWorkerInFirestore(id, newName.trim());
          await loadWorkers();
          refreshUI();
        }
      }
    });
  });

  // Eliminar trabajador (sin parseInt)
  document.querySelectorAll('.delete-worker').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!isAdmin()) return alert('No tienes permisos.');
      const id = btn.dataset.id; // <-- string
      const worker = workers.find(w => w.id === id);
      if (!worker) return;

      const workerGuards = guards.filter(g => g.workerId === id);
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
        opcion = prompt(mensaje, '1');
        if (opcion === null || opcion === '4') return;
      } else {
        if (!confirm(mensaje)) return;
        opcion = '1';
      }

      if (opcion === '1') {
        // Eliminar trabajador y sus guardias
        await deleteWorkerFromFirestore(id);
        for (const g of workerGuards) {
          await deleteGuardFromFirestore(g.id);
        }
        alert(`Trabajador "${worker.name}" eliminado junto con sus ${guardCount} guardias.`);
      } else if (opcion === '2') {
        // Solo eliminar trabajador
        await deleteWorkerFromFirestore(id);
        alert(`Trabajador "${worker.name}" eliminado. Se conservaron ${guardCount} guardias.`);
      } else if (opcion === '3') {
        if (workers.length === 1) {
          alert('No hay otros trabajadores para reasignar.');
          return;
        }
        const otherWorkers = workers.filter(w => w.id !== id);
        let workerListStr = otherWorkers.map((w, idx) => `${idx+1}. ${w.name}`).join('\n');
        let newWorkerIndex = prompt(
          `Selecciona el trabajador que recibirá las ${guardCount} guardias:\n${workerListStr}`,
          '1'
        );
        if (newWorkerIndex === null) return;
        newWorkerIndex = parseInt(newWorkerIndex) - 1;
        if (isNaN(newWorkerIndex) || newWorkerIndex < 0 || newWorkerIndex >= otherWorkers.length) {
          alert('Opción inválida.');
          return;
        }
        const newWorker = otherWorkers[newWorkerIndex];
        // Reasignar guardias
        for (const g of workerGuards) {
          await updateGuardInFirestore(g.id, { workerId: newWorker.id });
        }
        await deleteWorkerFromFirestore(id);
        alert(`Trabajador "${worker.name}" eliminado. ${guardCount} guardias reasignadas a "${newWorker.name}".`);
      }
      await loadAllData();
      refreshUI();
    });
  });
}

// ----- AÑADIR TRABAJADOR -----
async function addWorker() {
  if (!isAdmin()) return alert('No tienes permisos.');
  const input = document.getElementById('workerName');
  const name = input.value.trim();
  if (!name) return alert('Escribe un nombre');
  if (workers.some(w => w.name.toLowerCase() === name.toLowerCase()))
    return alert('Ya existe');
  await addWorkerToFirestore(name);
  await loadWorkers();
  input.value = '';
  refreshUI();
}

// ----- RENDERIZAR DÍAS DE GUARDIA -----
function renderGuardDaysList() {
  const container = document.getElementById('guardDaysList');
  if (!container) return;
  if (guardDays.length === 0) {
    container.innerHTML = '<p>No hay días definidos. Añade fechas.</p>';
    return;
  }
  const sorted = [...guardDays].sort();
  container.innerHTML = '';
  for (const day of sorted) {
    const tag = document.createElement('div');
    tag.className = 'day-tag';
    tag.innerHTML = `<span>📅 ${formatDate(day)}</span>
                     <button class="edit-day" data-date="${day}">✏️</button>
                     <button class="remove-day" data-date="${day}">✖️</button>`;
    container.appendChild(tag);
  }

  document.querySelectorAll('.remove-day').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!isAdmin()) return alert('No tienes permisos.');
      const date = btn.dataset.date;
      if (confirm(`¿Eliminar ${date}?`)) {
        await deleteGuardDayFromFirestore(date);
        // Eliminar guardias de ese día
        const guardsToDelete = guards.filter(g => g.date === date);
        for (const g of guardsToDelete) {
          await deleteGuardFromFirestore(g.id);
        }
        await loadAllData();
        refreshUI();
      }
    });
  });

  document.querySelectorAll('.edit-day').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!isAdmin()) return alert('No tienes permisos.');
      openEditDayModal(btn.dataset.date);
    });
  });
}

// ----- AÑADIR DÍA DE GUARDIA -----
async function addGuardDay() {
  if (!isAdmin()) return alert('No tienes permisos.');
  const newDate = document.getElementById('newGuardDay').value;
  if (!newDate) return alert('Selecciona fecha');
  if (guardDays.includes(newDate)) return alert('Ya existe');
  await addGuardDayToFirestore(newDate);
  await loadGuardDays();
  renderGuardDaysList();
  document.getElementById('newGuardDay').value = new Date().toISOString().split('T')[0];
  alert('Día añadido.');
}

// ----- GENERAR GUARDIAS DESDE DÍAS -----
async function generateGuardsFromDays() {
  if (!isAdmin()) return alert('No tienes permisos.');
  if (!workers.length) return alert('No hay trabajadores.');
  if (!guardDays.length) return alert('No hay días definidos.');
  const sortedDays = [...guardDays].sort();
  const existingDates = new Set(guards.filter(g => guardDays.includes(g.date)).map(g => g.date));
  const newDays = sortedDays.filter(date => !existingDates.has(date));
  if (!newDays.length) return alert('Todos los días ya tienen guardia.');

  let maxId = guards.length ? Math.max(...guards.map(g => parseInt(g.id))) : 0;
  let workerIndex = lastWorkerIndexForDays;
  const newGuards = [];
  for (const date of newDays) {
    const worker = workers[workerIndex % workers.length];
    const id = (++maxId).toString();
    const newGuard = {
      id,
      date,
      workerId: worker.id, // worker.id ya es string
      completed: false,
      catedra: '',
      notes: ''
    };
    newGuards.push(newGuard);
    await addGuardToFirestore(newGuard);
    workerIndex++;
  }
  lastWorkerIndexForDays = workerIndex % workers.length;
  await updateConfigInFirestore(currentYear, lastWorkerIndexForDays);
  await loadAllData();
  refreshUI();
  alert(`Generadas ${newGuards.length} guardias nuevas.`);
}

// ----- GENERAR GUARDIAS PARA UN AÑO -----
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
      newGuards.push({
        id: 0,
        date: formatted,
        workerId: worker.id, // string
        completed: false,
        catedra: '',
        notes: ''
      });
      workerIndex++;
    }
    current.setDate(current.getDate() + 1);
  }
  return newGuards;
}

async function regenerateGuards() {
  if (!isAdmin()) return alert('No tienes permisos.');
  if (!workers.length) return alert('No hay trabajadores.');
  const year = parseInt(document.getElementById('yearSelect').value);
  currentYear = year;
  await updateConfigInFirestore(year, lastWorkerIndexForDays);
  // Eliminar guardias de ese año
  const guardsToDelete = guards.filter(g => parseInt(g.date.split('-')[0]) === year);
  for (const g of guardsToDelete) {
    await deleteGuardFromFirestore(g.id);
  }
  // Generar nuevas guardias
  const newGuards = generateGuardsForYear(year);
  let maxId = guards.length ? Math.max(...guards.map(g => parseInt(g.id))) : 0;
  for (const g of newGuards) {
    g.id = (++maxId).toString();
    await addGuardToFirestore(g);
  }
  await loadAllData();
  refreshUI();
  alert(`Guardias generadas para ${year}. Total: ${newGuards.length}.`);
}

// ----- GUARDIA MANUAL -----
function openManualModal() {
  if (!isAdmin()) return alert('No tienes permisos.');
  if (!workers.length) return alert('Primero añade trabajadores.');
  const searchInput = document.getElementById('searchWorkerInput');
  if (searchInput) searchInput.value = '';
  renderWorkerSelectForManual('');
  document.getElementById('manualDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('manualCatedra').value = '';
  document.getElementById('manualNotes').value = '';
  document.getElementById('manualModal').style.display = 'flex';
  setTimeout(() => searchInput && searchInput.focus(), 100);
}

function renderWorkerSelectForManual(filterText = '') {
  const workerSelect = document.getElementById('manualWorker');
  if (!workerSelect) return;
  const filtered = workers.filter(w =>
    w.name.toLowerCase().includes(filterText.toLowerCase())
  );
  workerSelect.innerHTML = '<option value="">— Sin asignar —</option>';
  if (!filtered.length) {
    const opt = document.createElement('option');
    opt.disabled = true;
    opt.textContent = 'No hay coincidencias';
    workerSelect.appendChild(opt);
  } else {
    filtered.forEach(w => {
      const opt = document.createElement('option');
      opt.value = w.id; // string
      opt.textContent = w.name;
      workerSelect.appendChild(opt);
    });
    workerSelect.selectedIndex = 0;
  }
}

async function saveManualGuard() {
  if (!isAdmin()) return alert('No tienes permisos.');
  const fechaStr = document.getElementById('manualDate').value;
  const workerSelect = document.getElementById('manualWorker');
  const workerId = workerSelect.value ? String(workerSelect.value) : null; // <-- string
  const catedra = document.getElementById('manualCatedra').value.trim();
  const notes = document.getElementById('manualNotes').value.trim();
  if (!fechaStr) return alert('Selecciona fecha.');
  const maxId = guards.length ? Math.max(...guards.map(g => parseInt(g.id))) : 0;
  const newGuard = {
    id: (maxId + 1).toString(),
    date: fechaStr,
    workerId,
    completed: false,
    catedra,
    notes
  };
  await addGuardToFirestore(newGuard);
  await loadAllData();
  refreshUI();
  alert('Guardia añadida.');
  closeManualModal();
}

function closeManualModal() {
  document.getElementById('manualModal').style.display = 'none';
}

function bindManualSearchEvent() {
  const searchInput = document.getElementById('searchWorkerInput');
  if (searchInput)
    searchInput.addEventListener('input', (e) =>
      renderWorkerSelectForManual(e.target.value)
    );
}

// ----- ORDENAMIENTO Y FILTRADO -----
function sortGuards(guardsArray) {
  const sorted = [...guardsArray];
  sorted.sort((a, b) => {
    let valA, valB;
    switch (currentSortColumn) {
      case 'date': valA = a.date; valB = b.date; break;
      case 'worker':
        const wa = a.workerId ? workers.find(w => w.id === a.workerId) : null;
        const wb = b.workerId ? workers.find(w => w.id === b.workerId) : null;
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

function getVisibleGuards() {
  if (isAdmin()) {
    return [...guards];
  } else {
    return guards.filter(g => g.workerId === currentUser.workerId);
  }
}

function applyFiltersAndRenderTable() {
  const filterDay = document.getElementById('filterDay')?.value || 'all';
  const filterMonth = document.getElementById('filterMonth')?.value || 'all';
  const filterYear = document.getElementById('filterYear')?.value || 'all';
  const filterWorker = document.getElementById('filterWorker')?.value || 'all';
  const filterCatedra = document.getElementById('filterCatedra')?.value || 'all';

  let filtered = getVisibleGuards();

  if (filterDay !== 'all')
    filtered = filtered.filter(g => parseInt(g.date.split('-')[2]) === parseInt(filterDay));
  if (filterMonth !== 'all')
    filtered = filtered.filter(g => parseInt(g.date.split('-')[1]) === parseInt(filterMonth));
  if (filterYear !== 'all')
    filtered = filtered.filter(g => parseInt(g.date.split('-')[0]) === parseInt(filterYear));
  if (filterWorker === 'none')
    filtered = filtered.filter(g => g.workerId == null);
  else if (filterWorker !== 'all')
    filtered = filtered.filter(g => g.workerId === filterWorker); // ambos string
  if (filterCatedra !== 'all')
    filtered = filtered.filter(g => (g.catedra || '') === filterCatedra);

  filtered = sortGuards(filtered);
  currentFilteredGuards = filtered;
  currentPage = 1;
  renderGuardsTablePage();
}

// ----- MOSTRAR NOTA -----
function showNote(guardId) {
  const guard = guards.find(g => g.id === guardId);
  if (!guard || !guard.notes) return;
  const modal = document.getElementById('noteModal');
  const content = document.getElementById('noteContent');
  content.textContent = guard.notes;
  modal.style.display = 'flex';
}

function closeNoteModal() {
  document.getElementById('noteModal').style.display = 'none';
}

// ----- RENDERIZAR TABLA -----
function renderGuardsTablePage() {
  const tbody = document.getElementById('guardsTableBody');
  if (!tbody) return;
  const totalPages = Math.ceil(currentFilteredGuards.length / rowsPerPage);
  const start = (currentPage - 1) * rowsPerPage;
  const pageGuards = currentFilteredGuards.slice(start, start + rowsPerPage);
  if (!pageGuards.length) {
    tbody.innerHTML = '<tr><td colspan="6">No hay guardias que coincidan.</td></tr>';
    renderPaginationControls(0);
    return;
  }
  tbody.innerHTML = '';
  const isAdminUser = isAdmin();
  for (const guard of pageGuards) {
    // Comparar como strings
    const worker = guard.workerId ? workers.find(w => String(w.id) === String(guard.workerId)) : null;
    const workerName = worker ? worker.name : (guard.workerId ? '❌ Eliminado' : 'Sin asignar');
    const row = tbody.insertRow();

    const td1 = row.insertCell(0);
    td1.textContent = formatDate(guard.date);
    td1.setAttribute('data-label', '📅 Fecha');

    const td2 = row.insertCell(1);
    td2.textContent = workerName;
    td2.setAttribute('data-label', '👤 Trabajador');

    const td3 = row.insertCell(2);
    td3.setAttribute('data-label', '✅ Realizada');
    const chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.checked = guard.completed;
    chk.addEventListener('change', async () => {
      if (!isAdminUser) return alert('No tienes permisos para modificar.');
      await updateGuardInFirestore(guard.id, { completed: chk.checked });
      await loadGuards();
      renderSummary();
      applyFiltersAndRenderTable();
    });
    td3.appendChild(chk);

    const td4 = row.insertCell(3);
    td4.textContent = guard.catedra || '';
    td4.setAttribute('data-label', '🏛️ Cátedra');

    const td5 = row.insertCell(4);
    td5.setAttribute('data-label', '📝 Notas');
    if (guard.notes) {
      const noteBtn = document.createElement('button');
      noteBtn.textContent = '📝';
      noteBtn.className = 'btn-note';
      noteBtn.setAttribute('aria-label', 'Ver nota');
      noteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showNote(guard.id);
      });
      td5.appendChild(noteBtn);
    }

    const td6 = row.insertCell(5);
    td6.setAttribute('data-label', '⚙️ Acciones');
    if (isAdminUser) {
      const editBtn = document.createElement('button');
      editBtn.textContent = '✏️ Editar';
      editBtn.className = 'btn-edit';
      editBtn.addEventListener('click', () => openEditModal(guard));
      td6.appendChild(editBtn);
      const delBtn = document.createElement('button');
      delBtn.textContent = '🗑️ Eliminar';
      delBtn.className = 'btn-edit';
      delBtn.style.backgroundColor = '#f8d7da';
      delBtn.style.color = '#721c24';
      delBtn.addEventListener('click', () => deleteGuard(guard.id));
      td6.appendChild(delBtn);
    } else {
      td6.textContent = '—';
    }
  }
  renderPaginationControls(totalPages);
  updateSortIndicators();
}

function renderPaginationControls(totalPages) {
  const container = document.getElementById('paginationControls');
  if (!container) return;
  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }
  let html = `<button ${currentPage === 1 ? 'disabled' : ''} data-page="${currentPage-1}">◀ Anterior</button>`;
  let start = Math.max(1, currentPage - 3);
  let end = Math.min(totalPages, currentPage + 3);
  if (end - start < 6) start = Math.max(1, end - 6);
  for (let i = start; i <= end; i++)
    html += `<button class="${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
  html += `<button ${currentPage === totalPages ? 'disabled' : ''} data-page="${currentPage+1}">Siguiente ▶</button>`;
  container.innerHTML = html;
  container.querySelectorAll('button[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = parseInt(btn.dataset.page);
      if (!isNaN(page) && page >= 1 && page <= totalPages) {
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
      if (currentSortColumn === col)
        currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
      else {
        currentSortColumn = col;
        currentSortOrder = 'asc';
      }
      applyFiltersAndRenderTable();
    });
  });
}

// ----- ELIMINAR GUARDIA -----
async function deleteGuard(guardId) {
  if (!isAdmin()) return alert('No tienes permisos.');
  if (confirm('¿Eliminar esta guardia?')) {
    await deleteGuardFromFirestore(guardId);
    await loadGuards();
    applyFiltersAndRenderTable();
    renderSummary();
    if (currentView === 'calendar') renderCalendar();
  }
}

// ----- EDITAR GUARDIA -----
function openEditModal(guard) {
  if (!isAdmin()) return alert('No tienes permisos.');
  currentEditingGuard = guard;
  const modal = document.getElementById('editModal');
  const dateInput = document.getElementById('editDate');
  const workerSelect = document.getElementById('editWorker');
  const completedCheck = document.getElementById('editCompleted');
  const catedraInput = document.getElementById('editCatedra');
  const notesInput = document.getElementById('editNotes');
  workerSelect.innerHTML = '<option value="">— Sin asignar —</option>';
  workers.forEach(w => {
    const opt = document.createElement('option');
    opt.value = w.id; // string
    opt.textContent = w.name;
    if (w.id === guard.workerId) opt.selected = true;
    workerSelect.appendChild(opt);
  });
  if (guard.workerId == null) workerSelect.value = '';
  else workerSelect.value = guard.workerId;
  dateInput.value = guard.date;
  completedCheck.checked = guard.completed;
  catedraInput.value = guard.catedra || '';
  notesInput.value = guard.notes || '';
  modal.style.display = 'flex';
}

async function saveEditGuard() {
  if (!isAdmin()) return alert('No tienes permisos.');
  if (!currentEditingGuard) return;
  const newDate = document.getElementById('editDate').value;
  const workerSelect = document.getElementById('editWorker');
  const newWorkerId = workerSelect.value ? String(workerSelect.value) : null; // <-- string
  const newCompleted = document.getElementById('editCompleted').checked;
  const newCatedra = document.getElementById('editCatedra').value.trim();
  const newNotes = document.getElementById('editNotes').value.trim();
  if (!newDate) return alert('Selecciona fecha');

  await updateGuardInFirestore(currentEditingGuard.id, {
    date: newDate,
    workerId: newWorkerId,
    completed: newCompleted,
    catedra: newCatedra,
    notes: newNotes
  });
  await loadAllData();
  closeModal();
  refreshUI();
  alert('Guardia actualizada.');
}

function closeModal() {
  document.getElementById('editModal').style.display = 'none';
  currentEditingGuard = null;
}

// ----- CALENDARIO -----
function renderCalendar() {
  const container = document.getElementById('calendarGrid');
  if (!container) return;
  const firstDay = new Date(currentCalendarYear, currentCalendarMonth, 1);
  const startWeekDay = firstDay.getDay();
  const daysInMonth = new Date(currentCalendarYear, currentCalendarMonth + 1, 0).getDate();
  const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  document.getElementById('currentMonthYear').textContent =
    `${monthNames[currentCalendarMonth]} ${currentCalendarYear}`;
  let grid = '';
  const weekdays = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  weekdays.forEach(d => grid += `<div class="calendar-day-header">${d}</div>`);
  for (let i = 0; i < startWeekDay; i++)
    grid += `<div class="calendar-day-cell calendar-empty"></div>`;
  const visibleGuards = getVisibleGuards();
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${currentCalendarYear}-${String(currentCalendarMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const guardsOfDay = visibleGuards.filter(g => g.date === dateStr);
    let cellClass = 'calendar-day-cell';
    if (!guardsOfDay.length) cellClass += ' calendar-empty';
    grid += `<div class="${cellClass}" data-date="${dateStr}">
              <div class="calendar-day-number">${d}</div>`;
    if (guardsOfDay.length) {
      grid += `<div style="font-size:0.6rem; display:flex; flex-direction:column; gap:1px; max-height:60px; overflow-y:auto;">`;
      guardsOfDay.forEach(g => {
        const worker = g.workerId ? workers.find(w => String(w.id) === String(g.workerId)) : null;
        const name = worker ? worker.name : (g.workerId ? '❌' : 'Sin asignar');
        const completedClass = g.completed ? 'completed' : '';
        grid += `<div class="calendar-day-guard ${completedClass}" style="margin:0; padding:0 0.1rem; background:${g.completed ? 'var(--success-light)' : 'var(--primary-light)'};">${escapeHtml(name)} ${g.completed ? '✅' : '⏳'}</div>`;
      });
      grid += `</div>`;
    }
    grid += `</div>`;
  }
  container.innerHTML = grid;
  document.querySelectorAll('.calendar-day-cell[data-date]').forEach(cell => {
    cell.addEventListener('click', () => {
      if (!isAdmin()) {
        alert('Solo los administradores pueden editar guardias.');
        return;
      }
      const date = cell.dataset.date;
      const guardsOfDay = getVisibleGuards().filter(g => g.date === date);
      if (guardsOfDay.length) {
        openEditModal(guardsOfDay[0]);
      } else {
        alert(`No hay guardias para ${formatDate(date)}. Puedes añadirla manualmente.`);
      }
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

// ----- REPORTES -----
function updateReportYearFilter() {
  const select = document.getElementById('reportYear');
  if (!select) return;
  const years = [...new Set(guards.map(g => parseInt(g.date.split('-')[0])))].sort((a,b) => a-b);
  const currentVal = select.value;
  select.innerHTML = '<option value="all">Todos</option>';
  years.forEach(y => {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    select.appendChild(opt);
  });
  if (currentVal !== 'all' && years.includes(parseInt(currentVal))) {
    select.value = currentVal;
  } else {
    select.value = 'all';
  }
}

function getFilteredGuardsForReport() {
  let filtered = getVisibleGuards();
  const year = document.getElementById('reportYear')?.value || 'all';
  const month = document.getElementById('reportMonth')?.value || 'all';
  if (year !== 'all') {
    filtered = filtered.filter(g => parseInt(g.date.split('-')[0]) === parseInt(year));
  }
  if (month !== 'all') {
    filtered = filtered.filter(g => parseInt(g.date.split('-')[1]) === parseInt(month));
  }
  return filtered;
}

function renderSummary() {
  const container = document.getElementById('summaryStats');
  const catedraContainer = document.getElementById('catedraStats');
  if (!container || !catedraContainer) return;

  const filterValue = document.getElementById('summaryFilter')?.value || 'all';
  const filteredGuards = getFilteredGuardsForReport();

  if (!workers.length && !filteredGuards.length) {
    container.innerHTML = '<p>No hay trabajadores ni guardias para el período seleccionado.</p>';
    catedraContainer.innerHTML = '<p>No hay datos.</p>';
    return;
  }
  if (!filteredGuards.length) {
    container.innerHTML = '<p>No hay guardias para el período seleccionado.</p>';
    catedraContainer.innerHTML = '<p>No hay datos.</p>';
    return;
  }

  const total = filteredGuards.length;
  const completedTotal = filteredGuards.filter(g => g.completed).length;
  const sinAsignar = filteredGuards.filter(g => g.workerId == null).length;

  let filteredWorkers = [...workers];
  if (filterValue === 'noGuards') {
    filteredWorkers = workers.filter(w => !filteredGuards.some(g => g.workerId === w.id));
  } else if (filterValue === 'noCompleted') {
    filteredWorkers = workers.filter(w => {
      const wg = filteredGuards.filter(g => g.workerId === w.id);
      return wg.length && wg.every(g => !g.completed);
    });
  }

  let html = `<div class="stat-card" style="background:#e6f7f0;">
                <h3>📊 Guardias Totales (período)</h3>
                <p>${completedTotal}/${total}</p>
                <div style="font-size:0.85rem;">${Math.round((completedTotal/total)*100)}% completado</div>
                ${sinAsignar > 0 ? `<div style="color:var(--gray-600); font-size:0.85rem;">⚠️ ${sinAsignar} guardias sin asignar</div>` : ''}
              </div>`;

  if (!filteredWorkers.length && filterValue !== 'all') {
    html += '<p>No hay trabajadores que coincidan con el filtro.</p>';
  } else {
    let workersToShow = filteredWorkers;
    if (filterValue === 'all') {
      workersToShow = workers.filter(w => filteredGuards.some(g => g.workerId === w.id));
      if (workersToShow.length === 0) {
        html += `<p style="grid-column:1/-1; text-align:center; color:var(--gray-600);">Ningún trabajador tiene guardias en el período seleccionado.</p>`;
      }
    }
    const workersWithCount = workersToShow.map(w => {
      const wg = filteredGuards.filter(g => g.workerId === w.id);
      return { worker: w, count: wg.length, completed: wg.filter(g => g.completed).length };
    });
    workersWithCount.sort((a,b) => b.count - a.count);
    for (const { worker: w, count: assigned, completed } of workersWithCount) {
      const percent = assigned ? Math.round((completed/assigned)*100) : 0;
      html += `<div class="stat-card"><h3>👤 ${escapeHtml(w.name)}</h3>
               <p>${completed}/${assigned}</p>
               <div style="font-size:0.85rem;">${percent}% completado</div></div>`;
    }
  }
  container.innerHTML = html;

  // Estadísticas por cátedra
  const catedraMap = new Map();
  filteredGuards.forEach(g => {
    const catedra = g.catedra || 'Sin cátedra';
    if (!catedraMap.has(catedra)) catedraMap.set(catedra, { total: 0, completed: 0 });
    const stats = catedraMap.get(catedra);
    stats.total++;
    if (g.completed) stats.completed++;
  });
  let catedraHtml = '';
  if (catedraMap.size === 0) {
    catedraHtml = '<p>No hay cátedras definidas en las guardias.</p>';
  } else {
    const sorted = Array.from(catedraMap.entries()).sort((a,b) => b[1].total - a[1].total);
    for (const [catedra, stats] of sorted) {
      const percent = stats.total ? Math.round((stats.completed/stats.total)*100) : 0;
      catedraHtml += `<div class="stat-card" style="border-left-color: var(--success);">
                        <h3>🏛️ ${escapeHtml(catedra)}</h3>
                        <p>${stats.completed}/${stats.total}</p>
                        <div style="font-size:0.85rem;">${percent}% realizadas</div>
                      </div>`;
    }
  }
  catedraContainer.innerHTML = catedraHtml;
}

// ----- EXPORTAR/IMPORTAR COMPLETO (Firestore) -----
async function exportToJSON() {
  if (!isAdmin()) return alert('No tienes permisos.');
  let fileName = prompt('Nombre del archivo:', `guardias_sindicato_${currentYear}`);
  if (!fileName) return;
  if (!fileName.endsWith('.json')) fileName += '.json';
  const exportData = {
    workers,
    guards,
    guardDays,
    currentYear,
    lastWorkerIndexForDays,
    exportDate: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.download = fileName;
  a.href = URL.createObjectURL(blob);
  a.click();
  URL.revokeObjectURL(a.href);
}

async function importFromJSON(file) {
  if (!isAdmin()) return alert('No tienes permisos.');
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.workers || !data.guards || data.currentYear === undefined)
        throw new Error('Formato inválido');
      const batch = writeBatch(db);
      // Limpiar datos existentes (opcional: borrar colecciones)
      // Para evitar duplicados, recogemos los documentos existentes y los eliminamos
      const snapshots = await Promise.all([
        getDocs(workersRef),
        getDocs(guardsRef),
        getDocs(guardDaysRef)
      ]);
      snapshots[0].docs.forEach(d => batch.delete(d.ref));
      snapshots[1].docs.forEach(d => batch.delete(d.ref));
      snapshots[2].docs.forEach(d => batch.delete(d.ref));

      // Insertar nuevos datos
      for (const w of data.workers) {
        const id = String(w.id);
        const ref = doc(db, 'workers', id);
        batch.set(ref, { ...w, id });
      }
      for (const g of data.guards) {
        const id = String(g.id);
        const workerId = g.workerId !== undefined && g.workerId !== null ? String(g.workerId) : null;
        const ref = doc(db, 'guards', id);
        batch.set(ref, { ...g, id, workerId });
      }
      for (const d of (data.guardDays || [])) {
        const ref = doc(db, 'guardDays', d);
        batch.set(ref, { date: d });
      }
      // Configuración
      batch.set(configRef, {
        currentYear: data.currentYear,
        lastWorkerIndexForDays: data.lastWorkerIndexForDays || 0
      });
      await batch.commit();
      await loadAllData();
      refreshUI();
      alert('Datos importados correctamente.');
    } catch (err) {
      alert('Error al importar: ' + err.message);
    }
  };
  reader.readAsText(file);
}

async function exportWorkers() {
  if (!isAdmin()) return alert('No tienes permisos.');
  if (!workers.length) return alert('No hay trabajadores.');
  const exportObj = { workers, exportDate: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.download = `trabajadores_${new Date().toISOString().split('T')[0]}.json`;
  a.href = URL.createObjectURL(blob);
  a.click();
  URL.revokeObjectURL(a.href);
}

async function importWorkersFromJSON(file) {
  if (!isAdmin()) return alert('No tienes permisos.');
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = JSON.parse(e.target.result);
      let newWorkers = Array.isArray(data) ? data : data.workers;
      if (!newWorkers || !Array.isArray(newWorkers)) throw new Error('Formato inválido');
      if (newWorkers.length === 0) {
        if (confirm('Borrar todos los trabajadores actuales?')) {
          const batch = writeBatch(db);
          const workersSnap = await getDocs(workersRef);
          workersSnap.docs.forEach(d => batch.delete(d.ref));
          // También borrar guardias y días
          const guardsSnap = await getDocs(guardsRef);
          guardsSnap.docs.forEach(d => batch.delete(d.ref));
          const daysSnap = await getDocs(guardDaysRef);
          daysSnap.docs.forEach(d => batch.delete(d.ref));
          await batch.commit();
          await loadAllData();
          refreshUI();
          alert('Datos borrados.');
        }
        return;
      }
      if (!newWorkers.every(w => w.id && typeof w.name === 'string'))
        throw new Error('Estructura incorrecta');
      // Sobrescribir trabajadores
      const batch = writeBatch(db);
      // Eliminar trabajadores existentes
      const workersSnap = await getDocs(workersRef);
      workersSnap.docs.forEach(d => batch.delete(d.ref));
      // Eliminar guardias y días para evitar inconsistencias
      const guardsSnap = await getDocs(guardsRef);
      guardsSnap.docs.forEach(d => batch.delete(d.ref));
      const daysSnap = await getDocs(guardDaysRef);
      daysSnap.docs.forEach(d => batch.delete(d.ref));

      for (const w of newWorkers) {
        const id = String(w.id);
        const ref = doc(db, 'workers', id);
        batch.set(ref, { ...w, id });
      }
      await batch.commit();
      await loadAllData();
      refreshUI();
      alert(`Importados ${newWorkers.length} trabajadores. Guardias eliminadas.`);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };
  reader.readAsText(file);
}

function handleImportWorkers(event) {
  if (!isAdmin()) return alert('No tienes permisos.');
  const file = event.target.files[0];
  if (!file) return;
  if (confirm('Se reemplazarán trabajadores y se borrarán guardias. ¿Continuar?'))
    importWorkersFromJSON(file);
  event.target.value = '';
}

// ----- DÍAS: EXPORT/IMPORT -----
function exportDaysToJSON() {
  if (!isAdmin()) return alert('No tienes permisos.');
  if (!guardDays.length) return alert('No hay días para exportar.');
  const data = { guardDays, exportDate: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.download = `dias_guardia_${currentYear}.json`;
  a.href = URL.createObjectURL(blob);
  a.click();
  URL.revokeObjectURL(a.href);
}

async function importDaysFromJSON(file) {
  if (!isAdmin()) return alert('No tienes permisos.');
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.guardDays || !Array.isArray(data.guardDays))
        throw new Error('Formato inválido');
      // Borrar días existentes
      const snapshot = await getDocs(guardDaysRef);
      const batch = writeBatch(db);
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
      for (const d of data.guardDays) {
        const ref = doc(db, 'guardDays', d);
        batch.set(ref, { date: d });
      }
      await batch.commit();
      await loadGuardDays();
      renderGuardDaysList();
      alert('Días importados.');
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };
  reader.readAsText(file);
}

// ----- EDITAR DÍA -----
function openEditDayModal(oldDate) {
  currentEditingDay = oldDate;
  const modal = document.getElementById('editDayModal');
  document.getElementById('originalDaySpan').textContent = formatDate(oldDate);
  document.getElementById('editDayInput').value = oldDate;
  modal.style.display = 'flex';
}

async function saveDayEdit() {
  if (!isAdmin()) return alert('No tienes permisos.');
  if (!currentEditingDay) return;
  const newDate = document.getElementById('editDayInput').value;
  if (!newDate) return alert('Selecciona fecha');
  if (guardDays.includes(newDate) && newDate !== currentEditingDay)
    return alert('Ya existe');
  // Actualizar en Firestore
  await deleteGuardDayFromFirestore(currentEditingDay);
  await addGuardDayToFirestore(newDate);
  // Actualizar guardias que tengan esa fecha
  const guardsToUpdate = guards.filter(g => g.date === currentEditingDay);
  for (const g of guardsToUpdate) {
    await updateGuardInFirestore(g.id, { date: newDate });
  }
  await loadAllData();
  closeDayModal();
  refreshUI();
  alert('Día actualizado.');
}

function closeDayModal() {
  document.getElementById('editDayModal').style.display = 'none';
  currentEditingDay = null;
}

// ----- LIMPIAR TODO -----
async function clearAllData() {
  if (!isAdmin()) return alert('No tienes permisos.');
  if (!confirm('⚠️ Eliminará TODOS los datos. ¿Continuar?')) return;
  const collections = ['workers', 'guards', 'guardDays'];
  const batch = writeBatch(db);
  for (const col of collections) {
    const snapshot = await getDocs(collection(db, col));
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
  }
  // Resetear config
  batch.set(configRef, { currentYear: 2026, lastWorkerIndexForDays: 0 });
  await batch.commit();
  await loadAllData();
  refreshUI();
  alert('Todos los datos eliminados.');
}

// ----- REINICIAR CHECKBOX -----
async function resetAllChecks() {
  if (!isAdmin()) return alert('No tienes permisos.');
  if (guards.length && confirm('Desmarcar todas las guardias como no realizadas?')) {
    const batch = writeBatch(db);
    for (const g of guards) {
      const ref = doc(db, 'guards', g.id);
      batch.update(ref, { completed: false });
    }
    await batch.commit();
    await loadGuards();
    refreshUI();
  }
}

// ============================================================
//  VISTAS Y NAVEGACIÓN
// ============================================================

function setView(view) {
  currentView = view;
  const tableViewBtn = document.getElementById('tableViewBtn');
  const calendarViewBtn = document.getElementById('calendarViewBtn');
  const tableViewSection = document.getElementById('tableViewSection');
  const calendarViewSection = document.getElementById('calendarViewSection');
  const filtersSection = document.getElementById('filtersSection');
  const gestionView = document.getElementById('viewGestion');

  if (view === 'table') {
    tableViewBtn.classList.add('active');
    calendarViewBtn.classList.remove('active');
    tableViewSection.style.display = 'block';
    calendarViewSection.style.display = 'none';
    filtersSection.style.display = 'block';
    gestionView.classList.remove('view-calendar');
    gestionView.classList.add('view-table');
    applyFiltersAndRenderTable();
    setTimeout(() => bindSortingEvents(), 10);
  } else {
    calendarViewBtn.classList.add('active');
    tableViewBtn.classList.remove('active');
    tableViewSection.style.display = 'none';
    calendarViewSection.style.display = 'block';
    filtersSection.style.display = 'none';
    gestionView.classList.remove('view-table');
    gestionView.classList.add('view-calendar');
    renderCalendar();
  }
}

function setActiveView(view) {
  document.getElementById('viewGestion').style.display = 'none';
  document.getElementById('viewReportes').style.display = 'none';
  document.getElementById('viewConfig').style.display = 'none';

  const activeView = document.getElementById(`view${view}`);
  activeView.style.display = 'block';

  document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active-view'));
  activeView.classList.add('active-view');

  const navBtns = document.querySelectorAll('.main-nav .btn');
  navBtns.forEach(btn => btn.classList.remove('active', 'primary'));
  navBtns.forEach(btn => btn.classList.add('outline'));

  const activeBtn = document.getElementById(`nav${view}`);
  if (activeBtn) {
    activeBtn.classList.remove('outline');
    activeBtn.classList.add('active', 'primary');
  }

  if (view === 'Reportes') {
    renderSummary();
  }
  if (view === 'Gestion') {
    if (currentView === 'table') {
      document.getElementById('tableViewSection').style.display = 'block';
      document.getElementById('calendarViewSection').style.display = 'none';
      applyFiltersAndRenderTable();
    } else {
      document.getElementById('tableViewSection').style.display = 'none';
      document.getElementById('calendarViewSection').style.display = 'block';
      renderCalendar();
    }
  }
}

// ----- PERÍODO Y PDF -----
function getPeriodInfo(view) {
  if (view === 'Gestion') {
    const tableViewSection = document.getElementById('tableViewSection');
    const isTable = tableViewSection.style.display !== 'none';
    if (isTable) {
      const year = document.getElementById('filterYear')?.value || 'all';
      const month = document.getElementById('filterMonth')?.value || 'all';
      const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
      const monthName = month === 'all' ? 'todos los meses' : monthNames[parseInt(month)-1];
      const yearText = year === 'all' ? 'todos los años' : year;
      return `Período: ${monthName} ${yearText}`;
    } else {
      const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
      return `Período: ${monthNames[currentCalendarMonth]} ${currentCalendarYear}`;
    }
  } else if (view === 'Reportes') {
    const year = document.getElementById('reportYear')?.value || 'all';
    const month = document.getElementById('reportMonth')?.value || 'all';
    const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const monthName = month === 'all' ? 'todos los meses' : monthNames[parseInt(month)-1];
    const yearText = year === 'all' ? 'todos los años' : year;
    return `Período: ${monthName} ${yearText}`;
  }
  return '';
}

function exportToPdf() {
  const activeView = document.querySelector('.view-section.active-view');
  if (!activeView) return;
  const viewId = activeView.id;
  const viewName = viewId.replace('view', '');
  const periodInfo = getPeriodInfo(viewName);
  if (viewName === 'Gestion') {
    const el = document.getElementById('gestionPeriodInfo');
    if (el) el.textContent = periodInfo;
  } else if (viewName === 'Reportes') {
    const el = document.getElementById('reportesPeriodInfo');
    if (el) el.textContent = periodInfo;
  }
  setTimeout(() => { window.print(); }, 100);
}

// ============================================================
//  ROLES Y UI
// ============================================================

function isAdmin() {
  return currentUser && currentUser.role === 'admin';
}

function applyRoleBasedUI() {
  const isAdminUser = isAdmin();
  const navReportes = document.getElementById('navReportes');
  if (navReportes) navReportes.style.display = isAdminUser ? '' : 'none';
  const navConfig = document.getElementById('navConfig');
  if (navConfig) navConfig.style.display = isAdminUser ? '' : 'none';
  const addManualContainer = document.getElementById('addManualContainer');
  if (addManualContainer) addManualContainer.style.display = isAdminUser ? '' : 'none';
  const userInfo = document.getElementById('userInfo');
  if (userInfo && currentUser) {
    userInfo.textContent = `👤 ${currentUser.email}`;
  }
  const filterWorker = document.getElementById('filterWorker');
  if (filterWorker && !isAdminUser) {
    filterWorker.style.display = 'none';
  } else if (filterWorker) {
    filterWorker.style.display = '';
  }
  const downloadJsonBtn = document.getElementById('downloadJsonBtn');
  if (downloadJsonBtn) {
    downloadJsonBtn.style.display = isAdminUser ? '' : 'none';
  }
}

// ============================================================
//  REFRESCO UI
// ============================================================

function refreshUI() {
  renderWorkersList();
  renderGuardDaysList();
  if (currentView === 'table') {
    applyFiltersAndRenderTable();
    setTimeout(() => bindSortingEvents(), 10);
  } else renderCalendar();
  renderSummary();
  updateFilterWorkerSelect();
  updateFilterYearSelect();
  updateFilterCatedraSelect();
  updateReportYearFilter();
  document.getElementById('yearSelect').value = currentYear;
  applyRoleBasedUI();
}

// ----- ACTUALIZAR FILTROS -----
function updateFilterWorkerSelect() {
  const select = document.getElementById('filterWorker');
  if (!select) return;
  const currentVal = select.value;
  select.innerHTML = '<option value="all">Todos los trabajadores</option><option value="none">Sin asignar</option>';
  workers.forEach(w => {
    const opt = document.createElement('option');
    opt.value = w.id;
    opt.textContent = w.name;
    select.appendChild(opt);
  });
  if (currentVal !== 'all' && currentVal !== 'none' && workers.some(w => w.id === currentVal)) {
    select.value = currentVal;
  } else {
    select.value = 'all';
  }
}

function updateFilterYearSelect() {
  const select = document.getElementById('filterYear');
  if (!select) return;
  const years = [...new Set(guards.map(g => parseInt(g.date.split('-')[0])))].sort((a,b) => a-b);
  const currentVal = select.value;
  select.innerHTML = '<option value="all">Todos los años</option>';
  years.forEach(y => {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    select.appendChild(opt);
  });
  select.value = (currentVal !== 'all' && years.includes(parseInt(currentVal))) ? currentVal : 'all';
}

function updateFilterCatedraSelect() {
  const select = document.getElementById('filterCatedra');
  if (!select) return;
  const currentVal = select.value;
  const valores = [...new Set(guards.map(g => g.catedra).filter(c => c && c.trim() !== ''))].sort();
  select.innerHTML = '<option value="all">Todas las cátedras</option>';
  valores.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    select.appendChild(opt);
  });
  if (currentVal !== 'all' && valores.includes(currentVal)) {
    select.value = currentVal;
  } else {
    select.value = 'all';
  }
}

// ============================================================
//  AUTENTICACIÓN - EVENTOS GLOBALES
// ============================================================

async function handleLogin() {
  const email = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value.trim();
  const errorEl = document.getElementById('loginError');
  if (!email || !password) {
    errorEl.textContent = '⚠️ Ingresa email y contraseña.';
    errorEl.style.display = 'block';
    return;
  }
  try {
    await login(email, password);
    // onAuthStateChanged se encarga del resto
  } catch (error) {
    errorEl.textContent = '❌ ' + error.message;
    errorEl.style.display = 'block';
  }
}

async function handleGoogleLogin() {
  const errorEl = document.getElementById('loginError');
  errorEl.style.display = 'none';
  await signInWithGoogle();
  // onAuthStateChanged se encarga del resto
}

function handleLogout() {
  logout();
}

// ----- OBTENER ROL DESDE FIRESTORE -----
async function getUserRole(uid) {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return userDoc.data();
    }
    return { role: 'worker', workerId: null };
  } catch (e) {
    return { role: 'worker', workerId: null };
  }
}

// ----- ESCUCHAR CAMBIOS DE AUTENTICACIÓN -----
onAuthStateChanged(auth, async (user) => {
  if (user) {
    const userData = await getUserRole(user.uid);
    currentUser = {
      uid: user.uid,
      email: user.email,
      role: userData.role || 'worker',
      workerId: userData.workerId || null
    };
    document.getElementById('loginModal').style.display = 'none';
    document.getElementById('appContent').style.display = 'block';
    await loadAllData();
    setActiveView('Gestion');
    setView('table');
  } else {
    currentUser = null;
    document.getElementById('loginModal').style.display = 'flex';
    document.getElementById('appContent').style.display = 'none';
  }
});

// ============================================================
//  VINCULAR EVENTOS
// ============================================================

function bindEvents() {
  document.getElementById('addWorkerBtn')?.addEventListener('click', addWorker);
  document.getElementById('clearAllDataBtn')?.addEventListener('click', clearAllData);
  document.getElementById('addGuardDayBtn')?.addEventListener('click', addGuardDay);
  document.getElementById('generateFromDaysBtn')?.addEventListener('click', generateGuardsFromDays);
  document.getElementById('exportDaysBtn')?.addEventListener('click', exportDaysToJSON);
  document.getElementById('importDaysInput')?.addEventListener('change', (e) => {
    if (e.target.files[0]) importDaysFromJSON(e.target.files[0]);
    e.target.value = '';
  });
  document.getElementById('generateBtn')?.addEventListener('click', regenerateGuards);
  document.getElementById('addManualGuardBtn')?.addEventListener('click', openManualModal);
  document.getElementById('exportDataBtn')?.addEventListener('click', exportToJSON);
  document.getElementById('importFileInput')?.addEventListener('change', (e) => {
    if (e.target.files[0]) importFromJSON(e.target.files[0]);
    e.target.value = '';
  });
  document.getElementById('resetAllChecksBtn')?.addEventListener('click', resetAllChecks);
  document.getElementById('clearFiltersBtn')?.addEventListener('click', () => {
    document.getElementById('filterDay').value = 'all';
    document.getElementById('filterMonth').value = 'all';
    document.getElementById('filterYear').value = 'all';
    document.getElementById('filterWorker').value = 'all';
    document.getElementById('filterCatedra').value = 'all';
    applyFiltersAndRenderTable();
  });
  document.getElementById('filterDay')?.addEventListener('change', applyFiltersAndRenderTable);
  document.getElementById('filterMonth')?.addEventListener('change', applyFiltersAndRenderTable);
  document.getElementById('filterYear')?.addEventListener('change', applyFiltersAndRenderTable);
  document.getElementById('filterWorker')?.addEventListener('change', applyFiltersAndRenderTable);
  document.getElementById('filterCatedra')?.addEventListener('change', applyFiltersAndRenderTable);
  document.getElementById('summaryFilter')?.addEventListener('change', renderSummary);
  document.getElementById('tableViewBtn')?.addEventListener('click', () => setView('table'));
  document.getElementById('calendarViewBtn')?.addEventListener('click', () => setView('calendar'));
  document.getElementById('prevMonthBtn')?.addEventListener('click', () => changeMonth(-1));
  document.getElementById('nextMonthBtn')?.addEventListener('click', () => changeMonth(1));
  document.getElementById('saveEditBtn')?.addEventListener('click', saveEditGuard);
  document.getElementById('cancelEditBtn')?.addEventListener('click', closeModal);
  document.querySelector('.close')?.addEventListener('click', closeModal);
  document.getElementById('saveManualBtn')?.addEventListener('click', saveManualGuard);
  document.getElementById('cancelManualBtn')?.addEventListener('click', closeManualModal);
  document.querySelector('.close-manual')?.addEventListener('click', closeManualModal);
  document.getElementById('saveDayEditBtn')?.addEventListener('click', saveDayEdit);
  document.getElementById('cancelDayEditBtn')?.addEventListener('click', closeDayModal);
  document.querySelector('.close-day')?.addEventListener('click', closeDayModal);
  document.querySelector('.close-note')?.addEventListener('click', closeNoteModal);
  document.getElementById('closeNoteBtn')?.addEventListener('click', closeNoteModal);
  window.addEventListener('click', (e) => {
    if (e.target === document.getElementById('editModal')) closeModal();
    if (e.target === document.getElementById('manualModal')) closeManualModal();
    if (e.target === document.getElementById('editDayModal')) closeDayModal();
    if (e.target === document.getElementById('noteModal')) closeNoteModal();
  });
  document.getElementById('workerName')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addWorker();
  });
  document.getElementById('exportWorkersBtn')?.addEventListener('click', exportWorkers);
  document.getElementById('importWorkersInput')?.addEventListener('change', handleImportWorkers);
  bindManualSearchEvent();

  document.getElementById('navGestion')?.addEventListener('click', () => setActiveView('Gestion'));
  document.getElementById('navReportes')?.addEventListener('click', () => setActiveView('Reportes'));
  document.getElementById('navConfig')?.addEventListener('click', () => setActiveView('Config'));

  document.getElementById('exportPdfGestionBtn')?.addEventListener('click', exportToPdf);
  document.getElementById('exportPdfReportesBtn')?.addEventListener('click', exportToPdf);

  document.getElementById('applyReportFiltersBtn')?.addEventListener('click', renderSummary);
  document.getElementById('reportYear')?.addEventListener('change', renderSummary);
  document.getElementById('reportMonth')?.addEventListener('change', renderSummary);

  document.getElementById('loginBtn')?.addEventListener('click', handleLogin);
  document.getElementById('googleLoginBtn')?.addEventListener('click', handleGoogleLogin);
  document.getElementById('loginPassword')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleLogin();
  });
  document.getElementById('loginUsername')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleLogin();
  });
  document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);

  document.getElementById('showPasswordCheckbox')?.addEventListener('change', function () {
    const passwordInput = document.getElementById('loginPassword');
    passwordInput.type = this.checked ? 'text' : 'password';
  });

  document.getElementById('toggleFiltersBtn')?.addEventListener('click', function () {
    const content = document.getElementById('filtersContent');
    if (content.style.display === 'none') {
      content.style.display = 'block';
      this.textContent = '🔼 Ocultar filtros';
    } else {
      content.style.display = 'none';
      this.textContent = '🔽 Filtros';
    }
  });

  document.getElementById('downloadJsonBtn')?.addEventListener('click', exportToJSON);
}

// ----- INICIO -----
bindEvents();

console.log('✅ App conectada a Firebase con Google Auth');