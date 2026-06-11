/* ══ MAIN PAGE JS · main.js ══════════════════════════════════════ */

// ── Bubbles ─────────────────────────────────────────────────────
(function initBubbles() {
  const container = document.getElementById('dripsContainer');
  if (!container) return;
  [[8,35,10,3.0,0.0],[18,50,14,4.0,0.9],[30,28,10,2.6,1.7],[42,45,16,3.5,0.4],
   [55,55,12,4.5,1.3],[65,32,10,2.8,2.1],[76,48,14,3.8,0.6],[88,38,11,3.2,1.9]
  ].forEach(([pct,h,w,dur,delay]) => {
    const d = document.createElement('div');
    d.className = 'drip';
    d.style.cssText = `left:${pct}%;width:${w}px;height:${w}px;--h:${h}px;--dur:${dur}s;--delay:${delay}s;`;
    container.appendChild(d);
  });
})();

// ── Floating ocean elements ─────────────────────────────────────
(function initFloating() {
  const wrap = document.getElementById('floatingEl');
  if (!wrap) return;
  [
    { el:'🐠', x:5,  y:15, fd:5.5, fd2:1.0, rot:'-5deg',  rot2:'8deg'   },
    { el:'🌊', x:88, y:20, fd:4.5, fd2:0.3, rot:'10deg',  rot2:'-5deg'  },
    { el:'🐡', x:12, y:72, fd:6.0, fd2:0.8, rot:'0deg',   rot2:'12deg'  },
    { el:'🐚', x:85, y:65, fd:5.0, fd2:1.5, rot:'-8deg',  rot2:'5deg'   },
    { el:'🐟', x:50, y:7,  fd:7.0, fd2:0.2, rot:'5deg',   rot2:'-10deg' },
    { el:'🌿', x:3,  y:48, fd:5.5, fd2:2.0, rot:'15deg',  rot2:'-5deg'  },
    { el:'⭐', x:92, y:52, fd:6.5, fd2:0.5, rot:'-15deg', rot2:'8deg'   },
    { el:'🦀', x:73, y:10, fd:4.0, fd2:1.0, rot:'0deg',   rot2:'20deg'  },
  ].forEach(({ el, x, y, fd, fd2, rot, rot2 }) => {
    const span = document.createElement('span');
    span.className = 'float-el';
    span.textContent = el;
    span.style.cssText = `left:${x}%;top:${y}%;--fd:${fd}s;--fdelay:${fd2}s;--rot:${rot};--rot2:${rot2};`;
    wrap.appendChild(span);
  });
})();

// ── Countdown ───────────────────────────────────────────────────
(function initCountdown() {
  const target = new Date('2026-06-13T12:00:00');
  const els = {
    days:    document.getElementById('cd-days'),
    hours:   document.getElementById('cd-hours'),
    minutes: document.getElementById('cd-minutes'),
    seconds: document.getElementById('cd-seconds'),
  };
  if (!els.days) return;
  const pad = n => String(n).padStart(2, '0');
  function tick() {
    const diff = target - new Date();
    if (diff <= 0) { Object.values(els).forEach(e => e.textContent = '00'); return; }
    els.days.textContent    = pad(Math.floor(diff / 86400000));
    els.hours.textContent   = pad(Math.floor((diff % 86400000) / 3600000));
    els.minutes.textContent = pad(Math.floor((diff % 3600000) / 60000));
    els.seconds.textContent = pad(Math.floor((diff % 60000) / 1000));
  }
  tick(); setInterval(tick, 1000);
})();

// ── Scroll fade-in ──────────────────────────────────────────────
(function initFadeIn() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
  }, { threshold: 0.08, rootMargin: '0px 0px -20px 0px' });
  document.querySelectorAll('.fade-in').forEach(el => obs.observe(el));
  setTimeout(() => {
    document.querySelectorAll('.fade-in:not(.visible)').forEach(el => {
      if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('visible');
    });
  }, 100);
})();

// ══ RSVP SEARCH ═══════════════════════════════════════════════════

let rsvpGuest      = null;   // currently selected guest
let rsvpCount      = 1;      // current selector value
let searchTimeout  = null;
let searchResults  = [];     // last search results (indexed for safe onclick)

// ── Debounced search ────────────────────────────────────────────
function onRsvpSearch(value) {
  clearTimeout(searchTimeout);
  const hint    = document.getElementById('rsvpHint');
  const results = document.getElementById('rsvpResults');

  if (value.trim().length < 2) {
    results.style.display = 'none';
    hint.style.display    = '';
    hint.textContent      = 'Escribe al menos 2 letras para buscar';
    return;
  }
  hint.style.display = 'none';
  searchTimeout = setTimeout(() => doSearch(value.trim()), 320);
}

async function doSearch(query) {
  const results = document.getElementById('rsvpResults');
  results.style.display = '';
  results.innerHTML = `<div class="rsvp-no-results">🔍 Buscando...</div>`;
  try {
    const res  = await fetch(`/api/search?name=${encodeURIComponent(query)}`);
    const data = await res.json();
    if (!data.length) {
      results.innerHTML = `<div class="rsvp-no-results">😔 No encontramos ese nombre. Verifica con quien organizó el evento.</div>`;
      return;
    }
    searchResults = data;  // store so selectGuest(i) can reference them
    results.innerHTML = data.map((g, i) => {
      const done  = g.confirmed !== null && g.confirmed !== undefined;
      const badge = done
        ? `<span class="rsvp-result-status rsvp-rs-confirmed">✅ Confirmó</span>`
        : `<span class="rsvp-result-status rsvp-rs-pending">⏳ Pendiente</span>`;
      return `<div class="rsvp-result-item" onclick="selectGuest(${i})">
        <div>
          <div class="rsvp-result-name">${g.name}</div>
          <div class="rsvp-result-slots">${g.max_guests} lugar${g.max_guests > 1 ? 'es' : ''}</div>
        </div>
        ${badge}
      </div>`;
    }).join('');
  } catch {
    results.innerHTML = `<div class="rsvp-no-results">❌ Error al buscar. Intenta de nuevo.</div>`;
  }
}

// ── Select guest → show form ────────────────────────────────────
function selectGuest(index) {
  rsvpGuest = searchResults[index];

  // Hide search, show form
  document.getElementById('rsvpSearchWrap').style.display = 'none';
  const wrap = document.getElementById('rsvpFormWrap');
  wrap.style.display = '';

  document.getElementById('rsvpFormName').textContent = `¡Hola, ${rsvpGuest.name}! 🐠`;
  document.getElementById('rsvpFormSlots').innerHTML  =
    `Tienes <strong>${rsvpGuest.max_guests}</strong> lugar${rsvpGuest.max_guests > 1 ? 'es' : ''} reservado${rsvpGuest.max_guests > 1 ? 's' : ''}`;

  // Reset sub-states
  document.getElementById('rsvpSuccess').style.display      = 'none';
  document.getElementById('rsvpAlreadyDone').style.display  = 'none';
  document.getElementById('rsvpFormInputs').style.display   = '';

  if (rsvpGuest.confirmed !== null && rsvpGuest.confirmed !== undefined) {
    showAlreadyConfirmed();
  } else {
    rsvpCount = Math.min(1, rsvpGuest.max_guests);
    updateRsvpSelector();
  }

  wrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function showAlreadyConfirmed() {
  const c = rsvpGuest.confirmed;
  document.getElementById('rsvpFormInputs').style.display  = 'none';
  document.getElementById('rsvpAlreadyDone').style.display = '';
  document.getElementById('rsvpConfirmedPill').textContent = c > 0
    ? `✅ ${c} persona${c > 1 ? 's' : ''} confirmada${c > 1 ? 's' : ''}`
    : '❌ Confirmó que no puede asistir';
}

function showRsvpForm() {
  rsvpCount = rsvpGuest.confirmed > 0 ? rsvpGuest.confirmed : 1;
  updateRsvpSelector();
  document.getElementById('rsvpAlreadyDone').style.display = 'none';
  document.getElementById('rsvpFormInputs').style.display  = '';
}

// ── Selector ─────────────────────────────────────────────────────
function updateRsvpSelector() {
  document.getElementById('rsvpSelCount').textContent   = rsvpCount;
  document.getElementById('rsvpBtnMinus').disabled      = rsvpCount <= 1;
  document.getElementById('rsvpBtnPlus').disabled       = rsvpCount >= rsvpGuest.max_guests;
}
function rsvpChangeCount(d) {
  const n = rsvpCount + d;
  if (n < 1 || n > rsvpGuest.max_guests) return;
  rsvpCount = n; updateRsvpSelector();
}
function rsvpSetZero() { rsvpCount = 0; submitMainRsvp(); }

// ── Submit ───────────────────────────────────────────────────────
async function submitMainRsvp() {
  const btn = document.getElementById('rsvpConfirmBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Guardando...'; }
  try {
    const res  = await fetch(`/api/rsvp/${rsvpGuest.token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmed: rsvpCount }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    rsvpGuest.confirmed = rsvpCount;
    showRsvpSuccess(rsvpCount);
  } catch (err) {
    alert(err.message || 'Error al guardar. Intenta de nuevo.');
    if (btn) { btn.disabled = false; btn.textContent = '🐠 Confirmar Asistencia'; }
  }
}

function showRsvpSuccess(count) {
  document.getElementById('rsvpFormInputs').style.display  = 'none';
  document.getElementById('rsvpAlreadyDone').style.display = 'none';
  const s = document.getElementById('rsvpSuccess');
  s.style.display = '';
  document.getElementById('rsvpSuccessIcon').textContent  = count > 0 ? '🎉' : '😢';
  document.getElementById('rsvpSuccessTitle').textContent = count > 0 ? '¡Asistencia confirmada!' : 'Nos vemos en otra ocasión';
  
  const amazonLink = "https://www.amazon.com.mx/baby-reg/abilene-lara-junio-2026-jiutepec/1356QXCJCBP6B?ref_=cm_sw_r_apann_dp_1YYK21F87JKS4QM25NMM&language=en-US";
  
  document.getElementById('rsvpSuccessText').innerHTML  = count > 0
    ? `¡Qué emoción, ${rsvpGuest.name}! Te esperamos el 14 de Junio 🌊<br><br>
       🎁 <strong>Mesa de regalos:</strong> <br>
       <a href="${amazonLink}" target="_blank" style="color:var(--honey); text-decoration:underline;">Ver en Amazon</a><br><br>
       <em>✉️ Nota: También habrá "lluvia de sobres" el día del evento por si gustan apoyar a los papás.</em>`
    : `Lamentamos que no puedas asistir, ${rsvpGuest.name}. ¡Habrá otras oportunidades!`;
}

// ── Reset (back to search) ────────────────────────────────────────
function resetRsvp() {
  rsvpGuest = null;
  document.getElementById('rsvpSearchInput').value     = '';
  document.getElementById('rsvpResults').style.display = 'none';
  document.getElementById('rsvpHint').style.display    = '';
  document.getElementById('rsvpHint').textContent      = 'Escribe al menos 2 letras para buscar';
  document.getElementById('rsvpSearchWrap').style.display = '';
  document.getElementById('rsvpFormWrap').style.display   = 'none';
  document.getElementById('rsvpSearchWrap').scrollIntoView({ behavior: 'smooth', block: 'center' });
}
