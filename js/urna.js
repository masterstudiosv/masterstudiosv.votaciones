/**
 * ============================================================
 * PANEL DE URNA - Proceso de Votación Completo
 * urna.js
 * ============================================================
 */

// ===== RENDERIZAR PANEL DE URNA =====
function renderUrnaPanel() {
  const cont = el('urna-panel-content');
  if (!cont) return;

  const urna  = AppState.currentUrna;
  const status = AppState.config.electionStatus;

  // Verificar si puede votar
  if (!canVoteNow(status)) {
    renderVotingBlocked(cont, status);
    return;
  }

  // Mostrar formulario de datos del votante
  renderVoterForm(cont);
}

function canVoteNow(status) {
  return status === 'active';
}

// ===== VOTACIÓN BLOQUEADA =====
function renderVotingBlocked(cont, status) {
  const messages = {
    inactive:  { icon: '🔒', title: 'Votación No Disponible', msg: 'La votación aún no ha sido configurada.' },
    scheduled: { icon: '⏰', title: 'Votación Programada',    msg: `La votación comenzará en el horario programado.` },
    paused:    { icon: '⏸️', title: 'Votación Pausada',       msg: 'La votación está temporalmente suspendida. Espera instrucciones.' },
    ended:     { icon: '🏁', title: 'Votación Finalizada',    msg: 'El proceso de votación ha concluido. Gracias por tu participación.' },
  };

  const info = messages[status] || messages.inactive;

  cont.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:60vh;text-align:center;padding:48px 24px">
      <div style="font-size:5rem;margin-bottom:24px">${info.icon}</div>
      <h2 style="font-size:1.8rem;font-weight:800;color:var(--primary-dark);margin-bottom:14px">${info.title}</h2>
      <p style="font-size:1.05rem;color:var(--text-secondary);max-width:460px;line-height:1.7">${info.msg}</p>
      ${status === 'scheduled' && AppState.config.electionStartTime ? `
        <div style="margin-top:24px;padding:16px 24px;background:var(--bg-soft);border-radius:12px;border:1px solid var(--border)">
          <p style="font-size:.88rem;color:var(--text-secondary)">Inicio programado:</p>
          <p style="font-size:1.2rem;font-weight:700;color:var(--primary)">${formatTimeSV(AppState.config.electionStartTime)}</p>
        </div>
      ` : ''}
      <button class="btn btn-outline" style="margin-top:24px" onclick="refreshUrnaStatus()">🔄 Actualizar Estado</button>
    </div>
  `;
}

async function refreshUrnaStatus() {
  showLoading('Verificando estado...');
  try {
    const res = await API.getConfig();
    if (res.ok) {
      AppState.config.electionStatus = res.data.ELECTION_STATUS || 'inactive';
      updateHeaderDisplay();
    }
    renderUrnaPanel();
  } catch (err) {
    showToast('Error al actualizar: ' + err.message, 'error');
  } finally {
    hideLoading();
  }
}

// ===== FORMULARIO DE DATOS DEL VOTANTE =====
function renderVoterForm(cont) {
  const sections = AppState.sections;
  const sectionOptions = sections.map(s =>
    `<option value="${sanitize(s.nombre)}">${sanitize(s.nombre)}</option>`
  ).join('');

  cont.innerHTML = `
    <div style="display:flex;align-items:flex-start;justify-content:center;padding:32px 16px;min-height:70vh">
      <div style="background:#fff;border-radius:var(--radius-lg);border:1px solid var(--border);box-shadow:var(--shadow-md);padding:40px;width:100%;max-width:520px">
        
        <div style="text-align:center;margin-bottom:32px">
          <div style="font-size:2.5rem;margin-bottom:10px">🗳️</div>
          <h2 style="font-size:1.4rem;font-weight:800;color:var(--primary-dark)">Identificación del Votante</h2>
          <p style="color:var(--text-secondary);font-size:.9rem;margin-top:6px">
            Ingresa tus datos para continuar al proceso de votación
          </p>
        </div>

        <div class="form-group">
          <label class="form-label">NIE (Número de Identificación Estudiantil) *</label>
          <input type="text" id="voter-nie" class="form-input" placeholder="Ingresa tu NIE" autocomplete="off" maxlength="20"
                 oninput="this.value=this.value.toUpperCase()">
          <div style="font-size:.76rem;color:var(--text-light);margin-top:4px">Tu NIE único de estudiante</div>
        </div>

        <div class="form-group">
          <label class="form-label">Sección Académica *</label>
          <select id="voter-seccion" class="form-input form-select">
            <option value="">Selecciona tu sección...</option>
            ${sectionOptions}
          </select>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
          <div class="form-group">
            <label class="form-label">Número de Lista *</label>
            <input type="number" id="voter-lista" class="form-input" placeholder="Ej: 15" min="1" max="100">
          </div>
          <div></div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
          <div class="form-group">
            <label class="form-label">Primer Nombre *</label>
            <input type="text" id="voter-nombre" class="form-input" placeholder="Tu primer nombre" autocomplete="off"
                   oninput="this.value=this.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ ]/g,'')">
          </div>
          <div class="form-group">
            <label class="form-label">Primer Apellido *</label>
            <input type="text" id="voter-apellido" class="form-input" placeholder="Tu primer apellido" autocomplete="off"
                   oninput="this.value=this.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ ]/g,'')">
          </div>
        </div>

        <div id="voter-error" class="alert alert-error" style="display:none;margin-bottom:16px"></div>

        <button class="btn btn-primary btn-full btn-lg" id="voter-continue-btn" onclick="handleVoterFormSubmit()">
          Continuar a Votación →
        </button>

        <div style="margin-top:20px;padding-top:20px;border-top:1px solid var(--border);text-align:center">
          <div style="display:flex;align-items:center;justify-content:center;gap:8px;font-size:.8rem;color:var(--text-light)">
            <span>🗳️</span>
            <span>Urna: <strong>${sanitize(AppState.currentUrna?.nombre || '')}</strong></span>
            <span>·</span>
            <span>📍 ${sanitize(AppState.currentUrna?.ubicacion || '')}</span>
          </div>
        </div>
      </div>
    </div>
  `;

  // Focus en NIE
  setTimeout(() => el('voter-nie')?.focus(), 100);
}

// ===== VALIDAR Y PASAR A CANDIDATOS =====
async function handleVoterFormSubmit() {
  const nie      = el('voter-nie').value.trim().toUpperCase();
  const seccion  = el('voter-seccion').value;
  const lista    = el('voter-lista').value.trim();
  const nombre   = el('voter-nombre').value.trim();
  const apellido = el('voter-apellido').value.trim();
  const errEl    = el('voter-error');
  const btn      = el('voter-continue-btn');

  // Validaciones
  if (!nie || !seccion || !lista || !nombre || !apellido) {
    showError(errEl, 'Todos los campos son obligatorios');
    return;
  }

  if (!validateNIE(nie)) {
    showError(errEl, 'El NIE ingresado no tiene un formato válido');
    el('voter-nie').focus();
    return;
  }

  if (isNaN(parseInt(lista)) || parseInt(lista) < 1) {
    showError(errEl, 'El número de lista debe ser un número válido');
    return;
  }

  // Verificar estado de votación
  if (!canVoteNow(AppState.config.electionStatus)) {
    renderUrnaPanel();
    return;
  }

  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> Verificando NIE...`;
  errEl.style.display = 'none';

  try {
    // Verificar si ya votó
    const checkRes = await API.checkNIE(nie);
    if (!checkRes.ok) {
      showError(errEl, 'Error de conexión al verificar NIE. Intenta de nuevo.');
      return;
    }

    if (checkRes.exists) {
      showError(errEl, '⚠️ Este NIE ya emitió su voto anteriormente. No se permite votar dos veces.');
      el('voter-nie').value = '';
      el('voter-nie').focus();
      return;
    }

    // Guardar datos temporales y mostrar candidatos
    AppState.currentVoteData = { nie, seccion, lista, nombre, apellido };
    renderCandidatesView();

  } catch (err) {
    showError(errEl, 'Error de conexión: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Continuar a Votación →';
  }
}

function showError(errEl, msg) {
  errEl.textContent = msg;
  errEl.style.display = 'flex';
  errEl.style.alignItems = 'center';
  errEl.style.gap = '8px';
  errEl.innerHTML = `<span>⚠️</span><span>${sanitize(msg)}</span>`;
}

// ===== VISTA DE CANDIDATOS =====
function renderCandidatesView() {
  const cont = el('urna-panel-content');
  const vd   = AppState.currentVoteData;
  const candidates = AppState.candidates;

  const activeCandidates = candidates.filter(c => c.activo);

  cont.innerHTML = `
    <div style="padding:28px 24px">
      <div style="background:#fff;border-radius:var(--radius);border:1px solid var(--border);padding:20px;margin-bottom:28px;display:flex;align-items:center;gap:16px;box-shadow:var(--shadow-sm)">
        <div style="width:48px;height:48px;background:var(--bg-soft);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.4rem;flex-shrink:0">👤</div>
        <div>
          <div style="font-weight:700;font-size:1.05rem;color:var(--primary-dark)">${sanitize(vd.nombre)} ${sanitize(vd.apellido)}</div>
          <div style="font-size:.82rem;color:var(--text-secondary)">NIE: ${sanitize(vd.nie)} · Sección: ${sanitize(vd.seccion)} · Lista: ${sanitize(vd.lista)}</div>
        </div>
        <button class="btn btn-ghost btn-sm" style="margin-left:auto" onclick="renderUrnaPanel()">← Regresar</button>
      </div>

      <div style="text-align:center;margin-bottom:24px">
        <h2 style="font-size:1.3rem;font-weight:800;color:var(--primary-dark)">Selecciona tu Candidato</h2>
        <p style="color:var(--text-secondary);font-size:.9rem;margin-top:4px">Haz clic en el candidato de tu preferencia</p>
      </div>

      ${activeCandidates.length === 0
        ? `<div style="text-align:center;padding:48px;color:var(--text-light)">
             <div style="font-size:3rem">⚠️</div>
             <p>No hay candidatos disponibles. Contacta al administrador.</p>
           </div>`
        : `<div class="candidates-grid">
            ${activeCandidates.map(c => `
              <div class="candidate-card" onclick="selectCandidate('${c.id}','${sanitize(c.nombre)}')">
                ${c.fotoUrl
                  ? `<img src="${sanitize(c.fotoUrl)}" class="candidate-photo" alt="${sanitize(c.nombre)}" onerror="this.outerHTML='<div class=candidate-photo-placeholder>👤</div>'">`
                  : `<div class="candidate-photo-placeholder">👤</div>`
                }
                <div class="candidate-name">${sanitize(c.nombre)}</div>
                <div class="candidate-section">${sanitize(c.seccion)}</div>
                <div class="candidate-position">${sanitize(c.cargo)}</div>
                <button class="btn btn-primary btn-sm" style="margin-top:14px;width:100%" onclick="selectCandidate('${c.id}','${sanitize(c.nombre)}');event.stopPropagation()">
                  Votar por este candidato
                </button>
              </div>
            `).join('')}
           </div>`
      }

      <div style="text-align:center;margin-top:32px">
        <button class="btn btn-ghost btn-sm" onclick="renderUrnaPanel()">← Cancelar y volver al inicio</button>
      </div>
    </div>
  `;
}

// ===== SELECCIONAR CANDIDATO =====
function selectCandidate(candidatoId, candidatoNombre) {
  // Modal de confirmación obligatorio
  const vd = AppState.currentVoteData;
  const cand = AppState.candidates.find(c => c.id === candidatoId);

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'vote-confirm-modal';
  modal.innerHTML = `
    <div class="modal-box" style="max-width:460px;text-align:center">
      <div class="modal-header" style="justify-content:center;border-bottom:none;padding-bottom:0">
        <h3 class="modal-title" style="font-size:1.2rem">✅ Confirmar Tu Voto</h3>
      </div>
      <div class="modal-body">
        <p style="color:var(--text-secondary);margin-bottom:20px;font-size:.92rem">
          Estás a punto de emitir tu voto. Esta acción es <strong>irreversible</strong>.
        </p>
        
        <div style="background:var(--bg-soft);border-radius:var(--radius);padding:20px;margin-bottom:20px;border:2px solid var(--accent-light)">
          ${cand?.fotoUrl ? `<img src="${sanitize(cand.fotoUrl)}" style="width:70px;height:70px;border-radius:50%;object-fit:cover;margin-bottom:12px" onerror="this.style.display='none'">` : `<div style="font-size:3rem;margin-bottom:8px">👤</div>`}
          <div style="font-size:1.2rem;font-weight:800;color:var(--primary-dark)">${sanitize(candidatoNombre)}</div>
          ${cand ? `<div style="font-size:.85rem;color:var(--text-secondary);margin-top:4px">${sanitize(cand.cargo)}</div>` : ''}
        </div>

        <div style="text-align:left;padding:14px;background:#FFF3E0;border-radius:8px;border:1px solid #FFCC80;font-size:.83rem;color:#E65100">
          <strong>Datos del votante:</strong><br>
          NIE: ${sanitize(vd.nie)} · ${sanitize(vd.nombre)} ${sanitize(vd.apellido)}<br>
          Sección: ${sanitize(vd.seccion)} · Lista: ${sanitize(vd.lista)}
        </div>
      </div>
      <div class="modal-footer" style="justify-content:center;gap:16px">
        <button class="btn btn-ghost btn-lg" onclick="el('vote-confirm-modal').remove()">❌ Cancelar</button>
        <button class="btn btn-success btn-lg" id="confirm-vote-btn" onclick="submitVote('${candidatoId}','${sanitize(candidatoNombre)}')">
          ✅ Confirmar Mi Voto
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  // NO cerrar al hacer clic fuera - confirmación es obligatoria
}

// ===== ENVIAR VOTO =====
async function submitVote(candidatoId, candidatoNombre) {
  const btn = el('confirm-vote-btn');
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> Registrando voto...`;

  const vd   = AppState.currentVoteData;
  const urna = AppState.currentUrna;

  try {
    const res = await API.registerVote({
      nie:            vd.nie,
      nombre:         vd.nombre,
      apellido:       vd.apellido,
      seccion:        vd.seccion,
      lista:          vd.lista,
      candidatoId,
      candidatoNombre,
      urnaId:         urna.id,
    });

    el('vote-confirm-modal')?.remove();

    if (res.ok) {
      showVoteSuccess(candidatoNombre, vd.nombre);
    } else if (res.duplicate) {
      showToast('⚠️ Este NIE ya votó anteriormente', 'error', 6000);
      AppState.currentVoteData = null;
      renderUrnaPanel();
    } else {
      showToast('Error al registrar el voto: ' + (res.error || 'Error desconocido'), 'error', 6000);
      if (res.error?.includes('pausada') || res.error?.includes('finaliz') || res.error?.includes('inactiv')) {
        await refreshUrnaStatus();
      }
    }

  } catch (err) {
    el('vote-confirm-modal')?.remove();
    showToast('Error de conexión: ' + err.message, 'error', 6000);
  }
}

// ===== PANTALLA DE ÉXITO =====
function showVoteSuccess(candidatoNombre, voterName) {
  AppState.currentVoteData = null;

  const successDiv = document.createElement('div');
  successDiv.className = 'vote-success-screen';
  successDiv.id = 'vote-success-screen';

  let countdown = APP_CONFIG.VOTE_SUCCESS_REDIRECT;
  
  successDiv.innerHTML = `
    <div class="success-icon">✅</div>
    <h1 class="success-title">¡Voto Registrado!</h1>
    <p class="success-subtitle">
      <strong>${sanitize(voterName)}</strong>, tu voto ha sido registrado correctamente.<br>
      Gracias por participar en el proceso democrático.
    </p>
    <div class="success-countdown">
      <span>Regresando al inicio en</span>
      <div class="countdown-circle" id="countdown-num">${countdown}</div>
      <span>segundos</span>
    </div>
  `;

  document.body.appendChild(successDiv);

  const timer = setInterval(() => {
    countdown--;
    const num = el('countdown-num');
    if (num) num.textContent = countdown;
    if (countdown <= 0) {
      clearInterval(timer);
      successDiv.remove();
      // Verificar estado y regresar a pantalla de votación (NO logout)
      refreshUrnaStatus();
    }
  }, 1000);
}
