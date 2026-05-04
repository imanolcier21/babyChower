/* ══ INVITE PAGE JS · invite.js ══════════════════════════════════ */

let guestData = null;
let currentCount = 1;
let confirmedAlready = false;

const token = location.pathname.split('/invite/')[1];

// ── States ──────────────────────────────────────────────────────
function showState(id) {
  ['stateLoading','stateError','stateForm','stateConfirmed'].forEach(s => {
    document.getElementById(s).style.display = s === id ? '' : 'none';
  });
}

// ── Load guest ──────────────────────────────────────────────────
async function loadGuest() {
  if (!token) { showState('stateError'); return; }
  try {
    const res  = await fetch(`/api/invite/${token}`);
    const data = await res.json();
    if (!res.ok) { showState('stateError'); return; }
    guestData = data;
    renderGuest();
  } catch {
    showState('stateError');
  }
}

function renderGuest() {
  const { name, max_guests, confirmed } = guestData;

  document.getElementById('guestName').textContent = `¡Hola, ${name}! 🍯`;
  document.getElementById('maxSlots').textContent   = max_guests;
  document.getElementById('slotsPlural').textContent  = max_guests > 1 ? 's' : '';
  document.getElementById('slotsPluralR').textContent = max_guests > 1 ? 's' : '';

  currentCount = Math.min(max_guests, confirmed ?? 1);
  updateSelector();

  if (confirmed !== null && confirmed !== undefined) {
    confirmedAlready = true;
    showConfirmed(confirmed, name);
  } else {
    showState('stateForm');
  }
}

// ── Selector ─────────────────────────────────────────────────────
function updateSelector() {
  document.getElementById('selCount').textContent = currentCount;
  document.getElementById('btnMinus').disabled = currentCount <= 1;
  document.getElementById('btnPlus').disabled  = currentCount >= guestData.max_guests;
}

function changeCount(delta) {
  const next = currentCount + delta;
  if (next < 1 || next > guestData.max_guests) return;
  currentCount = next;
  updateSelector();
}

function setZero() {
  currentCount = 0;
  document.getElementById('selCount').textContent = '0';
  document.getElementById('btnMinus').disabled = true;
  document.getElementById('btnPlus').disabled  = false;
  submitRSVP();
}

// ── Submit ───────────────────────────────────────────────────────
async function submitRSVP() {
  const btn = document.getElementById('btnConfirm');
  if (btn) { btn.disabled = true; btn.textContent = 'Guardando...'; }
  try {
    const res  = await fetch(`/api/rsvp/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmed: currentCount }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    guestData.confirmed = currentCount;
    showConfirmed(currentCount, guestData.name);
  } catch (err) {
    alert(err.message || 'Error al guardar. Intenta de nuevo.');
    if (btn) { btn.disabled = false; btn.textContent = '🍯 Confirmar Asistencia'; }
  }
}

function showConfirmed(count, name) {
  const isGoing   = count > 0;
  const isPlural  = count > 1;
  document.getElementById('confirmedIcon').textContent  = isGoing ? '🎉' : '😢';
  document.getElementById('confirmedTitle').textContent = isGoing ? '¡Asistencia confirmada!' : 'Nos vemos en otra ocasión';
  document.getElementById('confirmedText').textContent  = isGoing
    ? `¡Qué emoción, ${name}! Te esperamos el 13 de Junio 🍯`
    : `Lamentamos que no puedas venir, ${name}. ¡Ya habrá otra oportunidad!`;
  document.getElementById('confirmedPill').textContent  = isGoing
    ? `✅ ${count} persona${isPlural ? 's' : ''} confirmada${isPlural ? 's' : ''}`
    : '❌ No podrá asistir';
  showState('stateConfirmed');
}

function showFormAgain() {
  confirmedAlready = false;
  currentCount = guestData.confirmed > 0 ? guestData.confirmed : 1;
  updateSelector();
  showState('stateForm');
}

// ── Init honey drips ─────────────────────────────────────────────
(function initDrips() {
  const c = document.getElementById('dripsContainer');
  if (!c) return;
  [[10,32,12,3,0.5],[25,24,10,2.8,1.2],[55,40,14,3.6,0.2],[80,28,11,3.0,1.8]].forEach(([pct,h,w,dur,delay]) => {
    const d = document.createElement('div');
    d.className = 'drip';
    d.style.cssText = `left:${pct}%;width:${w}px;--h:${h}px;--dur:${dur}s;--delay:${delay}s;`;
    c.appendChild(d);
  });
})();

// Boot
loadGuest();
