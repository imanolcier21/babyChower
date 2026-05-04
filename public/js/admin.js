/* ══ ADMIN JS · admin.js ═════════════════════════════════════════ */

let adminPassword = '';
let allGuests = [];
let baseUrl = '';

// ── Login ────────────────────────────────────────────────────────
async function doLogin() {
  const pw = document.getElementById('loginPassword').value;
  if (!pw) return;
  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw }),
    });
    if (!res.ok) {
      const err = document.getElementById('loginError');
      err.textContent = '❌ Contraseña incorrecta';
      err.style.display = '';
      return;
    }
    adminPassword = pw;
    document.getElementById('loginWrap').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';
    loadAll();
  } catch {
    showToast('Error de conexión', 'error');
  }
}

function doLogout() {
  adminPassword = '';
  document.getElementById('loginWrap').style.display = '';
  document.getElementById('dashboard').style.display = 'none';
  document.getElementById('loginPassword').value = '';
}

// ── Auth header ──────────────────────────────────────────────────
function authH() { return { 'Content-Type': 'application/json', 'x-admin-password': adminPassword }; }

// ── Load everything ──────────────────────────────────────────────
async function loadAll() {
  await Promise.all([loadStats(), loadGuests(), loadSettings()]);
}

async function loadStats() {
  const res = await fetch('/api/admin/stats', { headers: authH() });
  const data = await res.json();
  document.getElementById('statTotalGuests').textContent = data.totalGuests;
  document.getElementById('statTotalSlots').textContent = data.totalSlots;
  document.getElementById('statConfirmed').textContent = data.responded;
  document.getElementById('statPending').textContent = data.notResponded;
  document.getElementById('statConfirmedSlots').textContent = data.confirmedSlots;
}

async function loadGuests() {
  const res = await fetch('/api/admin/guests', { headers: authH() });
  allGuests = await res.json();
  renderTable(allGuests);
}

async function loadSettings() {
  try {
    const res = await fetch('/api/admin/settings', { headers: authH() });
    const data = await res.json();
    baseUrl = data.base_url || '';
    updateBaseUrlDisplay();
  } catch { }
}

function updateBaseUrlDisplay() {
  const el = document.getElementById('baseUrlDisplay');
  const getBase = () => baseUrl || location.origin;

  const showUrl = (url) => {
    el.innerHTML = `<strong style="color:var(--ocean-light)">${url}</strong>
      <button class="btn-set-url" onclick="copyEventUrl()">📋 Copiar URL del evento</button>`;
  };

  if (baseUrl) {
    showUrl(baseUrl);
  } else {
    fetch('/api/server-info').then(r => r.json()).then(d => {
      if (d.ips && d.ips.length > 0) baseUrl = `http://${d.ips[0]}:${d.port}`;
      else baseUrl = location.origin;
      showUrl(baseUrl);
    }).catch(() => { baseUrl = location.origin; showUrl(baseUrl); });
  }
}

function copyEventUrl() {
  const url = baseUrl || location.origin;
  navigator.clipboard.writeText(url).then(() => {
    showToast('📋 URL del evento copiada. ¡Compártela por WhatsApp!', 'success');
  }).catch(() => { prompt('Copia esta URL del evento:', url); });
}

// ── Render table ─────────────────────────────────────────────────
function renderTable(guests) {
  const tbody = document.getElementById('guestsBody');
  if (!guests.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><span class="ei">🐠</span><br>No hay invitados aún. ¡Agrega el primero!</div></td></tr>`;
    return;
  }
  tbody.innerHTML = guests.map(g => {
    const statusBadge = g.confirmed === null || g.confirmed === undefined
      ? `<span class="status-badge status-pending">⏳ Pendiente</span>`
      : g.confirmed > 0
        ? `<span class="status-badge status-confirmed">✅ Confirmó</span>`
        : `<span class="status-badge status-declined">❌ No va</span>`;
    const confCount = g.confirmed === null || g.confirmed === undefined
      ? '—'
      : `${g.confirmed} / ${g.max_guests}`;
    return `
      <tr id="row-${g.id}">
        <td>
          <div class="guest-name">${escHtml(g.name)}</div>
          ${g.notes ? `<div class="guest-phone">📝 ${escHtml(g.notes)}</div>` : ''}
        </td>
        <td><div class="guest-phone">${g.phone ? `📱 ${escHtml(g.phone)}` : '—'}</div></td>
        <td><strong style="color:var(--ocean-pale)">${g.max_guests}</strong></td>
        <td>${statusBadge}</td>
        <td><strong style="color:var(--seagrass)">${confCount}</strong></td>
        <td>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <button class="action-btn action-reset" onclick="resetGuest(${g.id})" ${g.confirmed === null ? 'disabled style="opacity:.35"' : ''}>↩ Reset</button>
            <button class="action-btn action-copy" onclick="openEdit(${g.id})" style="border-color:rgba(0,180,216,.3);color:var(--ocean-light)">✏️ Editar</button>
            <button class="action-btn action-delete" onclick="deleteGuest(${g.id})">🗑</button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

// ── Filter ───────────────────────────────────────────────────────
function filterGuests() {
  const q = document.getElementById('searchInput').value.toLowerCase();
  renderTable(allGuests.filter(g => g.name.toLowerCase().includes(q) || (g.phone && g.phone.includes(q))));
}

// ── Add guest ────────────────────────────────────────────────────
async function addGuest() {
  const name = document.getElementById('addName').value.trim();
  const phone = document.getElementById('addPhone').value.trim();
  const max_guests = parseInt(document.getElementById('addMax').value) || 1;
  const notes = document.getElementById('addNotes').value.trim();
  if (!name) { showToast('El nombre es requerido', 'error'); return; }

  const res = await fetch('/api/admin/guests', {
    method: 'POST',
    headers: authH(),
    body: JSON.stringify({ name, phone, max_guests, notes }),
  });
  const data = await res.json();
  if (!res.ok) { showToast(data.error, 'error'); return; }

  document.getElementById('addName').value = '';
  document.getElementById('addPhone').value = '';
  document.getElementById('addMax').value = '1';
  document.getElementById('addNotes').value = '';

  showToast(`✅ ${name} agregado`, 'success');
  loadAll();
}

// ── Copy link ────────────────────────────────────────────────────
function copyLink(token) {
  const url = `${baseUrl}/invite/${token}`;
  navigator.clipboard.writeText(url).then(() => {
    showToast('🔗 Link copiado al portapapeles', 'success');
  }).catch(() => {
    prompt('Copia este link:', url);
  });
}

// ── Reset RSVP ───────────────────────────────────────────────────
async function resetGuest(id) {
  if (!confirm('¿Resetear la respuesta de este invitado?')) return;
  await fetch(`/api/admin/guests/${id}/reset`, { method: 'POST', headers: authH() });
  showToast('↩ RSVP reiniciado', 'success');
  loadAll();
}

// ── Delete ───────────────────────────────────────────────────────
async function deleteGuest(id) {
  if (!confirm('¿Eliminar este invitado? Esta acción no se puede deshacer.')) return;
  await fetch(`/api/admin/guests/${id}`, { method: 'DELETE', headers: authH() });
  showToast('🗑 Invitado eliminado', 'success');
  loadAll();
}

// ── Edit modal ───────────────────────────────────────────────────
function openEdit(id) {
  const g = allGuests.find(x => x.id === id);
  if (!g) return;
  document.getElementById('editId').value = g.id;
  document.getElementById('editName').value = g.name;
  document.getElementById('editPhone').value = g.phone || '';
  document.getElementById('editMax').value = g.max_guests;
  document.getElementById('editNotes').value = g.notes || '';
  document.getElementById('editModal').style.display = '';
}

function closeEdit() { document.getElementById('editModal').style.display = 'none'; }

async function saveEdit() {
  const id = document.getElementById('editId').value;
  const name = document.getElementById('editName').value.trim();
  const phone = document.getElementById('editPhone').value.trim();
  const max_guests = parseInt(document.getElementById('editMax').value);
  const notes = document.getElementById('editNotes').value.trim();
  const res = await fetch(`/api/admin/guests/${id}`, {
    method: 'PUT',
    headers: authH(),
    body: JSON.stringify({ name, phone, max_guests, notes }),
  });
  if (res.ok) { showToast('💾 Cambios guardados', 'success'); closeEdit(); loadAll(); }
  else { showToast('Error al guardar', 'error'); }
}

// ── Settings modal ────────────────────────────────────────────────
function openSettings() {
  document.getElementById('baseUrlInput').value = baseUrl;
  document.getElementById('newPasswordInput').value = '';
  document.getElementById('settingsModal').style.display = '';
}
function closeSettings() { document.getElementById('settingsModal').style.display = 'none'; }

async function saveSettings() {
  const base_url = document.getElementById('baseUrlInput').value.trim();
  const new_password = document.getElementById('newPasswordInput').value.trim();
  const body = { base_url };
  if (new_password) body.new_password = new_password;

  const res = await fetch('/api/admin/settings', { method: 'PUT', headers: authH(), body: JSON.stringify(body) });
  if (res.ok) {
    if (new_password) adminPassword = new_password;
    baseUrl = base_url;
    updateBaseUrlDisplay();
    showToast('⚙️ Configuración guardada', 'success');
    closeSettings();
  } else { showToast('Error al guardar configuración', 'error'); }
}

// ── Toast ────────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${type === 'success' ? '✅' : '❌'}</span><span>${msg}</span>`;
  document.getElementById('toastContainer').appendChild(t);
  setTimeout(() => { t.style.animation = 'toastOut .3s forwards'; setTimeout(() => t.remove(), 300); }, 3000);
}

// ── Util ─────────────────────────────────────────────────────────
function escHtml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

// Boot
document.getElementById('loginPassword').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
