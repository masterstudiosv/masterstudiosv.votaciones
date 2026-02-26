/**
 * SISTEMA DE VOTACIÓN v2.0 - urna.js
 * Con información completa del votante y progreso visual
 */

// ===== PANEL PRINCIPAL =====
function renderUrnaPanel() {
  const election = AppState.currentElection;
  const cont = el('urna-main-content');
  if (!cont) return;

  if (!election) {
    cont.innerHTML = renderUrnaBlocked('⚫', 'Sin votación activa', 'No hay ninguna votación configurada. Contacta al administrador.');
    return;
  }

  const estado = election.estado;
  if (estado === 'inactive')  { cont.innerHTML = renderUrnaBlocked('⚫','Sin votación activa','El administrador aún no ha iniciado la votación.'); return; }
  if (estado === 'scheduled') { cont.innerHTML = renderUrnaBlocked('⏰','Votación programada',`La votación comenzará el ${formatTimeSV(election.inicioProgramado)}.`); return; }
  if (estado === 'paused')    { cont.innerHTML = renderUrnaBlocked('⏸','Votación pausada','La votación ha sido pausada temporalmente. Espera indicaciones del administrador.'); return; }
  if (estado === 'ended')     { cont.innerHTML = renderUrnaBlocked('🏁','Votación finalizada','La votación ha concluido. Gracias por participar.'); return; }

  renderVoterIDForm();
}

function renderUrnaBlocked(icon, title, msg) {
  return `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:400px;text-align:center;padding:40px">
    <div style="font-size:5rem;margin-bottom:20px">${icon}</div>
    <h2 style="color:var(--primary-dark);margin-bottom:12px;font-size:1.5rem">${sanitize(title)}</h2>
    <p style="color:var(--text-secondary);max-width:420px;line-height:1.8;font-size:.95rem">${sanitize(msg)}</p>
  </div>`;
}

// ===== PASO 1: INGRESAR NIE/DUI =====
function renderVoterIDForm() {
  const cont = el('urna-main-content'); if (!cont) return;
  const election = AppState.currentElection;
  const tipoId = election?.tipoId || 'NIE';
  // Limpiar votos seleccionados
  for (const k in selectedVotes) delete selectedVotes[k];
  AppState.currentVoteData = null;

  cont.innerHTML = `
    <div style="max-width:520px;margin:0 auto;padding:24px 20px">

      <!-- Paso indicador -->
      ${renderStepIndicator(1, AppState.positions.length)}

      <!-- Título -->
      <div style="text-align:center;margin-bottom:28px">
        <div style="font-size:3.5rem;margin-bottom:10px">🗳️</div>
        <h2 style="color:var(--primary-dark);margin-bottom:6px;font-size:1.3rem">Identificación del Votante</h2>
        <p style="color:var(--text-secondary);font-size:.9rem">Ingresa tu número de ${sanitize(tipoId)} para continuar</p>
      </div>

      <!-- Formulario -->
      <div class="card" style="padding:28px">
        <div class="form-group" style="margin-bottom:20px">
          <label class="form-label" style="text-align:center;display:block;font-size:.95rem;margin-bottom:10px">
            Número de <strong>${sanitize(tipoId)}</strong>
          </label>
          <input
            type="text"
            id="voter-input-id"
            class="form-input"
            style="font-size:1.4rem;text-align:center;letter-spacing:3px;font-weight:700;padding:16px"
            placeholder="${tipoId}"
            maxlength="12"
            oninput="this.value=this.value.replace(/[^0-9]/g,'')"
            onkeydown="if(event.key==='Enter')verifyVoterID()"
            autocomplete="off">
          <div style="font-size:.75rem;color:var(--text-light);text-align:center;margin-top:6px">
            Solo números · Entre 6 y 12 dígitos
          </div>
        </div>
        <div id="voter-id-error" class="alert alert-error" style="display:none;margin-bottom:16px"></div>
        <button class="btn btn-primary btn-lg" style="width:100%;font-size:1rem;padding:14px" onclick="verifyVoterID()">
          🔍 Verificar y Continuar
        </button>
      </div>
    </div>`;

  setTimeout(() => el('voter-input-id')?.focus(), 150);
}

// ===== VERIFICAR NIE/DUI =====
async function verifyVoterID() {
  const input = el('voter-input-id');
  const value = input?.value?.trim() || '';
  const errEl = el('voter-id-error');
  errEl.style.display = 'none';

  if (value.length < 6 || value.length > 12) {
    errEl.textContent = 'El identificador debe tener entre 6 y 12 dígitos';
    errEl.style.display = 'flex';
    return;
  }

  showLoading('Verificando...');
  try {
    const res = await API.getVoterByID(value);
    if (!res.ok) {
      errEl.textContent = res.error || 'Identificador no registrado en el padrón';
      errEl.style.display = 'flex';
      if (input) input.value = '';
      return;
    }

    const voter = res.data;
    const urna = AppState.currentUrna;
    const sections = AppState.sections || [];

    // VALIDACION 1: El votante debe pertenecer a una sección asignada a ESTA votación
    const eleccionId = AppState.currentElection && AppState.currentElection.id;
    if (eleccionId && voter.seccionId) {
      // Usar seccionEleccionIds devuelto por el backend (ya tiene el nombre real)
      const seccionEleccionIds = voter.seccionEleccionIds || [];
      const seccionNombreReal = voter.seccionNombre || voter.seccionId;
      // Solo validar si la sección tiene votaciones asignadas
      if (seccionEleccionIds.length > 0 && !seccionEleccionIds.includes(eleccionId)) {
        errEl.textContent = 'Este votante pertenece a la sección "' + seccionNombreReal + '" que no está asignada a esta votación.';
        errEl.style.display = 'flex';
        errEl.style.background = '#FFEBEE';
        errEl.style.color = '#B71C1C';
        if (input) input.value = '';
        return;
      }
    }

    // VALIDACION 2: Secciones permitidas de la urna (si está configurado)
    if (urna && urna.seccionesPermitidas) {
      const perms = urna.seccionesPermitidas.split(',').filter(Boolean);
      if (perms.length > 0) {
        if (!voter.seccionId || !perms.includes(voter.seccionId)) {
          const nombreSeccion = voter.seccionId
            ? ((sections.find(s=>s.id===voter.seccionId)||{}).nombre || voter.seccionNombre || voter.seccionId)
            : 'Sin sección';
          errEl.textContent = 'Acceso denegado. "' + nombreSeccion + '" no está autorizada en esta urna.';
          errEl.style.display = 'flex';
          errEl.style.background = '#FFEBEE';
          errEl.style.color = '#B71C1C';
          errEl.style.borderColor = '#EF9A9A';
          if (input) input.value = '';
          return;
        }
      }
    }

    // Verificar votos ya emitidos
    const checkRes = await API.checkVoterID(value, AppState.currentElection.id);
    const votedPositions = checkRes.ok ? checkRes.votedPositions : [];
    const allPositions = AppState.positions.filter(p => p.activo);

    if (allPositions.length > 0 && votedPositions.length >= allPositions.length) {
      errEl.textContent = '✅ Este votante ya emitió todos sus votos en esta votación.';
      errEl.style.display = 'flex';
      errEl.style.background = '#E8F5E9';
      errEl.style.color = '#2E7D32';
      errEl.style.borderColor = '#A5D6A7';
      if (input) input.value = '';
      return;
    }

    AppState.currentVoteData = { voter, votedPositions };
    renderVoterConfirmScreen(voter, votedPositions);

  } catch(err) {
    errEl.textContent = 'Error de conexión: ' + err.message;
    errEl.style.display = 'flex';
  } finally {
    hideLoading();
  }
}

// ===== PASO 2: CONFIRMAR DATOS DEL VOTANTE =====
function renderVoterConfirmScreen(voter, votedPositions) {
  const cont = el('urna-main-content'); if (!cont) return;
  const allPositions = AppState.positions.filter(p => p.activo);
  const pendingCount = allPositions.filter(p => !votedPositions.includes(p.id)).length;

  cont.innerHTML = `
    <div style="max-width:580px;margin:0 auto;padding:24px 20px">

      ${renderStepIndicator(1.5, allPositions.length)}

      <div style="text-align:center;margin-bottom:24px">
        <h2 style="color:var(--primary-dark);font-size:1.2rem">Confirma tus datos antes de votar</h2>
      </div>

      <!-- Tarjeta de datos del votante -->
      <div class="card" style="border:2px solid var(--primary-light);background:linear-gradient(135deg,#f0f7ff,#fff);margin-bottom:20px">
        <div style="display:flex;align-items:center;gap:16px;padding:4px 0 16px">
          <div style="width:64px;height:64px;border-radius:50%;background:var(--primary-dark);display:flex;align-items:center;justify-content:center;font-size:1.8rem;flex-shrink:0">👤</div>
          <div style="flex:1">
            <div style="font-size:1.15rem;font-weight:800;color:var(--primary-dark);line-height:1.2">${sanitize(voter.apellidos)}, ${sanitize(voter.nombres)}</div>
            <div style="margin-top:8px;display:flex;gap:12px;flex-wrap:wrap">
              <span style="background:#E3F2FD;color:#1565C0;padding:3px 10px;border-radius:6px;font-size:.82rem;font-weight:600">
                ${AppState.currentElection?.tipoId||'ID'}: ${sanitize(voter.identificador)}
              </span>
              <span style="background:#E8F5E9;color:#2E7D32;padding:3px 10px;border-radius:6px;font-size:.82rem;font-weight:600">
                📚 ${sanitize(voter.seccionNombre||'Sin sección')}
              </span>
            </div>
          </div>
        </div>
        <div style="border-top:1px solid var(--border);padding-top:14px;display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:.85rem;color:var(--text-secondary)">
            ${votedPositions.length > 0 ? `Ya votaste en <strong>${votedPositions.length}</strong> cargo(s)` : 'Aún no has votado'}
          </span>
          <span style="font-size:.85rem;font-weight:700;color:var(--primary-dark)">
            Pendiente: <strong>${pendingCount} cargo(s)</strong>
          </span>
        </div>
      </div>

      <!-- Progreso de cargos -->
      <div class="card" style="margin-bottom:20px">
        <div style="font-weight:700;color:var(--primary-dark);margin-bottom:14px;font-size:.9rem">📋 Cargos a votar:</div>
        ${allPositions.map(p => {
          const done = votedPositions.includes(p.id);
          return `<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)">
            <div style="width:28px;height:28px;border-radius:50%;background:${done?'#4CAF50':'var(--primary-light)'};display:flex;align-items:center;justify-content:center;font-size:.85rem;color:#fff;flex-shrink:0">
              ${done?'✓':p.orden||''}
            </div>
            <span style="font-weight:600;color:${done?'var(--text-light)':'var(--text-primary)'};text-decoration:${done?'line-through':'none'}">${sanitize(p.nombre)}</span>
            ${done?'<span style="margin-left:auto;font-size:.75rem;color:#4CAF50;font-weight:700">✅ Votado</span>':'<span style="margin-left:auto;font-size:.75rem;color:var(--primary-dark);font-weight:700">⏳ Pendiente</span>'}
          </div>`;
        }).join('')}
      </div>

      <div style="display:flex;gap:12px">
        <button class="btn btn-ghost" style="flex:1" onclick="renderVoterIDForm()">← Cancelar</button>
        <button class="btn btn-primary btn-lg" style="flex:2" onclick="renderVotingScreen()">
          ✅ Sí, soy yo — Comenzar a votar
        </button>
      </div>
    </div>`;
}

// ===== PASO 3: PANTALLA DE VOTACIÓN =====
const selectedVotes = {};

function renderVotingScreen() {
  const cont = el('urna-main-content'); if (!cont) return;
  const voter = AppState.currentVoteData?.voter;
  const votedPositions = AppState.currentVoteData?.votedPositions || [];
  const allPositions = AppState.positions.filter(p => p.activo);
  const pendingPositions = allPositions.filter(p => !votedPositions.includes(p.id));
  const candidates = AppState.candidates.filter(c => c.activo);

  // Mostrar el primer cargo pendiente
  AppState.currentPositionIndex = 0;
  AppState.pendingPositions = pendingPositions;
  renderPositionVoting(0);
}

function renderPositionVoting(posIndex) {
  const cont = el('urna-main-content'); if (!cont) return;
  const voter = AppState.currentVoteData?.voter;
  const pendingPositions = AppState.pendingPositions || [];
  const allPositions = AppState.positions.filter(p => p.activo);
  const votedPositions = AppState.currentVoteData?.votedPositions || [];

  if (posIndex >= pendingPositions.length) {
    showVoteConfirmModal();
    return;
  }

  const pos = pendingPositions[posIndex];
  const posCandidates = AppState.candidates.filter(c => c.activo && c.posicionId === pos.id);
  const totalPending = pendingPositions.length;
  const doneInSession = Object.keys(selectedVotes).length;

  cont.innerHTML = `
    <div style="max-width:680px;margin:0 auto;padding:20px">

      <!-- Barra de info del votante (compacta) -->
      <div style="background:var(--bg-soft);border:1px solid var(--primary-light);border-radius:10px;padding:12px 16px;margin-bottom:20px;display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <span style="font-size:1.4rem">👤</span>
        <div style="flex:1">
          <strong style="font-size:.88rem;color:var(--primary-dark)">${sanitize(voter?.apellidos)}, ${sanitize(voter?.nombres)}</strong>
          <span style="font-size:.78rem;color:var(--text-secondary);margin-left:10px">${sanitize(voter?.identificador)} · ${sanitize(voter?.seccionNombre||'')}</span>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="confirmCancelVote()">✕ Cancelar</button>
      </div>

      <!-- Progreso de cargos -->
      ${renderVotingProgress(allPositions, votedPositions, pendingPositions, posIndex)}

      <!-- Cargo actual -->
      <div class="card" style="margin-bottom:20px">
        <div class="card-header">
          <div>
            <div style="font-size:.75rem;color:var(--text-secondary);margin-bottom:2px">CARGO ${posIndex+1} DE ${totalPending}</div>
            <div class="card-title" style="font-size:1.1rem">🏆 ${sanitize(pos.nombre)}</div>
          </div>
          <span style="font-size:.82rem;color:var(--text-secondary)">${posCandidates.length} candidato(s)</span>
        </div>
        <p style="font-size:.82rem;color:var(--text-secondary);margin-bottom:16px">Haz clic en el candidato de tu preferencia para seleccionarlo</p>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:14px">
          ${posCandidates.length === 0
            ? '<p style="color:var(--text-light);padding:20px;text-align:center">No hay candidatos para este cargo</p>'
            : posCandidates.map(c => `
              <div class="candidate-card ${selectedVotes[pos.id]?.candId===c.id?'selected':''}"
                id="ccard-${c.id}"
                onclick="selectCandidateVote('${pos.id}','${sanitize(pos.nombre)}','${c.id}','${sanitize(c.nombre)}',this)">
                <div class="candidate-photo">
                  ${c.fotoUrl?`<img src="${sanitize(c.fotoUrl)}" alt="${sanitize(c.nombre)}" onerror="this.parentElement.innerHTML='<span style=font-size:2.5rem>👤</span>'">` : '<span style="font-size:2.5rem">👤</span>'}
                </div>
                <div class="candidate-name">${sanitize(c.nombre)}</div>
                ${c.seccion?`<div class="candidate-section">${sanitize(c.seccion)}</div>`:''}
                <div class="candidate-select-indicator">✓ Seleccionado</div>
              </div>`).join('')}
        </div>
      </div>

      <!-- Botones de navegación -->
      <div id="vote-error" class="alert alert-error" style="display:none;margin-bottom:12px"></div>
      <div style="display:flex;gap:12px;justify-content:space-between">
        <div>
          ${posIndex > 0 ? `<button class="btn btn-ghost" onclick="renderPositionVoting(${posIndex-1})">← Anterior</button>` : ''}
        </div>
        <div style="display:flex;gap:10px">
          ${posIndex < totalPending-1
            ? `<button class="btn btn-primary btn-lg" onclick="goToNextPosition(${posIndex})">Siguiente cargo →</button>`
            : `<button class="btn btn-success btn-lg" onclick="goToNextPosition(${posIndex})">✅ Revisar y Confirmar</button>`
          }
        </div>
      </div>
    </div>`;
}

function renderVotingProgress(allPositions, votedPositions, pendingPositions, currentPendingIndex) {
  const pendingSet = new Set(pendingPositions.map(p=>p.id));
  return `<div style="display:flex;gap:4px;align-items:center;margin-bottom:20px;flex-wrap:wrap">
    ${allPositions.map((p,i) => {
      const isDone = votedPositions.includes(p.id);
      const isPending = pendingSet.has(p.id);
      const pendingIdx = pendingPositions.findIndex(pp=>pp.id===p.id);
      const isCurrent = isPending && pendingIdx === currentPendingIndex;
      const isSelected = isPending && selectedVotes[p.id];
      let bg, color, label;
      if (isDone)      { bg='#4CAF50'; color='#fff'; label='✓'; }
      else if (isCurrent){ bg='var(--primary-dark)'; color='#fff'; label=String(i+1); }
      else if (isSelected){ bg='#2196F3'; color='#fff'; label='✓'; }
      else             { bg='#e0e0e0'; color='#666'; label=String(i+1); }
      return `<div style="display:flex;flex-direction:column;align-items:center;gap:3px">
        <div style="width:32px;height:32px;border-radius:50%;background:${bg};color:${color};display:flex;align-items:center;justify-content:center;font-size:.8rem;font-weight:700;transition:all .3s">${label}</div>
        <div style="font-size:.65rem;color:var(--text-light);text-align:center;max-width:60px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${sanitize(p.nombre)}</div>
      </div>
      ${i<allPositions.length-1?'<div style="flex:1;height:2px;background:#e0e0e0;margin-bottom:16px;min-width:8px"></div>':''}`;
    }).join('')}
  </div>`;
}

function selectCandidateVote(posId, posNombre, candId, candNombre, cardEl) {
  // Deseleccionar todas las tarjetas del mismo cargo
  qsAll('.candidate-card').forEach(c => c.classList.remove('selected'));
  cardEl.classList.add('selected');
  selectedVotes[posId] = { posId, posNombre, candId, candNombre };
  // Ocultar error si había
  const errEl = el('vote-error');
  if (errEl) errEl.style.display = 'none';
}

function goToNextPosition(currentIndex) {
  const pendingPositions = AppState.pendingPositions || [];
  const pos = pendingPositions[currentIndex];
  const errEl = el('vote-error');

  if (!selectedVotes[pos?.id]) {
    if (errEl) { errEl.textContent = 'Debes seleccionar un candidato para continuar'; errEl.style.display = 'flex'; }
    return;
  }

  const nextIndex = currentIndex + 1;
  if (nextIndex >= pendingPositions.length) {
    showVoteConfirmModal();
  } else {
    renderPositionVoting(nextIndex);
  }
}

function confirmCancelVote() {
  showConfirmModal('Cancelar votación', '¿Deseas cancelar? Los votos seleccionados se perderán.', () => {
    for (const k in selectedVotes) delete selectedVotes[k];
    AppState.currentVoteData = null;
    renderVoterIDForm();
  });
}

// ===== PASO 4: CONFIRMAR VOTO =====
function showVoteConfirmModal() {
  const voter = AppState.currentVoteData?.voter;
  const votes = Object.values(selectedVotes);

  const m = document.createElement('div'); m.className='modal-overlay'; m.id='vote-confirm-modal';
  m.innerHTML = `<div class="modal-box" style="max-width:520px">
    <div class="modal-header" style="background:var(--primary-dark);border-radius:12px 12px 0 0;padding:16px 20px">
      <h3 class="modal-title" style="color:#fff">✅ Confirmar tu Voto</h3>
    </div>
    <div class="modal-body">
      <!-- Datos del votante -->
      <div style="background:var(--bg-soft);border-radius:8px;padding:12px 16px;margin-bottom:16px;border-left:4px solid var(--primary-dark)">
        <div style="font-weight:700;color:var(--primary-dark)">${sanitize(voter?.apellidos)}, ${sanitize(voter?.nombres)}</div>
        <div style="font-size:.82rem;color:var(--text-secondary)">${sanitize(voter?.identificador)} · ${sanitize(voter?.seccionNombre||'')}</div>
      </div>

      <p style="color:var(--text-secondary);font-size:.88rem;margin-bottom:14px;font-weight:600">Estás votando por:</p>

      ${votes.map(v=>`
        <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border:1px solid var(--border);border-radius:8px;margin-bottom:8px;background:#fff">
          <div>
            <div style="font-size:.75rem;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.5px">${sanitize(v.posNombre)}</div>
            <div style="font-weight:700;color:var(--primary-dark);font-size:.95rem;margin-top:2px">${sanitize(v.candNombre)}</div>
          </div>
          <div style="width:32px;height:32px;border-radius:50%;background:#E8F5E9;display:flex;align-items:center;justify-content:center;font-size:1rem">✅</div>
        </div>`).join('')}

      <div class="alert alert-warning" style="margin-top:14px">
        ⚠️ <strong>Esta acción no se puede deshacer.</strong> Una vez confirmado, tu voto quedará registrado permanentemente.
      </div>
    </div>
    <div class="modal-footer" style="gap:12px">
      <button class="btn btn-ghost" style="flex:1" onclick="el('vote-confirm-modal').remove()">← Corregir voto</button>
      <button class="btn btn-success btn-lg" style="flex:2" onclick="submitVote()">🗳️ Confirmar Voto</button>
    </div></div>`;
  document.body.appendChild(m);
}

// ===== ENVIAR VOTO =====
async function submitVote() {
  el('vote-confirm-modal')?.remove();
  showLoading('Registrando voto...');
  const voter = AppState.currentVoteData?.voter;
  const urna = AppState.currentUrna;

  try {
    const votes = Object.values(selectedVotes);
    let allOk = true;
    let lastError = '';

    for (const v of votes) {
      const res = await API.registerVote({
        eleccionId: AppState.currentElection.id,
        identificador: voter.identificador,
        apellidos: voter.apellidos,
        nombres: voter.nombres,
        seccion: voter.seccionNombre,
        posicionId: v.posId,
        posicionNombre: v.posNombre,
        candidatoId: v.candId,
        candidatoNombre: v.candNombre,
        urnaId: urna.id,
      });
      if (!res.ok) { allOk = false; lastError = res.error||'Error'; break; }
    }

    if (allOk) {
      for (const k in selectedVotes) delete selectedVotes[k];
      AppState.currentVoteData = null;
      showVoteSuccessScreen(voter);
    } else {
      showToast('Error al registrar voto: ' + lastError, 'error');
    }
  } catch(err) {
    showToast('Error de conexión: ' + err.message, 'error');
  } finally {
    hideLoading();
  }
}

// ===== PASO 5: ÉXITO =====
function showVoteSuccessScreen(voter) {
  const cont = el('urna-main-content'); if (!cont) return;
  let countdown = APP_CONFIG.VOTE_SUCCESS_REDIRECT;

  cont.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:450px;text-align:center;padding:40px">
      <div style="font-size:5.5rem;margin-bottom:16px;animation:pulse 1.2s ease-in-out infinite">✅</div>
      <h2 style="color:var(--success);margin-bottom:8px;font-size:1.5rem">¡Voto Registrado Exitosamente!</h2>
      <div style="background:#E8F5E9;border:1px solid #A5D6A7;border-radius:10px;padding:14px 24px;margin:16px 0;max-width:400px">
        <div style="font-weight:700;color:#1B5E20;font-size:1rem">${sanitize(voter?.apellidos)}, ${sanitize(voter?.nombres)}</div>
        <div style="font-size:.82rem;color:#388E3C;margin-top:4px">${sanitize(voter?.identificador)} · ${sanitize(voter?.seccionNombre||'')}</div>
      </div>
      <p style="color:var(--text-secondary);font-size:.9rem;margin-bottom:8px">Tu voto ha sido registrado de forma segura.</p>
      <div id="success-countdown" style="margin-top:20px;font-size:.95rem;color:var(--text-light)">
        Siguiente votante en <strong id="countdown-num" style="color:var(--primary-dark);font-size:1.2rem">${countdown}</strong> segundos...
      </div>
      <button class="btn btn-primary" style="margin-top:16px" onclick="renderVoterIDForm()">
        Siguiente votante ahora →
      </button>
    </div>`;

  const interval = setInterval(() => {
    countdown--;
    const num = el('countdown-num');
    if (num) num.textContent = countdown;
    if (countdown <= 0) { clearInterval(interval); renderVoterIDForm(); }
  }, 1000);
}

// ===== INDICADOR DE PASOS =====
function renderStepIndicator(currentStep, totalPositions) {
  const steps = [
    { n:1, label:'Identificación' },
    { n:2, label:'Confirmar datos' },
    { n:3, label:'Votar' },
    { n:4, label:'Confirmar' },
    { n:5, label:'Listo' }
  ];
  return `<div style="display:flex;align-items:center;justify-content:center;margin-bottom:28px;gap:0">
    ${steps.map((s,i) => {
      const done = currentStep > s.n;
      const active = currentStep >= s.n && currentStep < s.n+1;
      return `
        <div style="display:flex;flex-direction:column;align-items:center;gap:4px">
          <div style="width:30px;height:30px;border-radius:50%;background:${done?'#4CAF50':active?'var(--primary-dark)':'#e0e0e0'};color:${done||active?'#fff':'#999'};display:flex;align-items:center;justify-content:center;font-size:.82rem;font-weight:700;transition:all .3s">${done?'✓':s.n}</div>
          <div style="font-size:.62rem;color:${active?'var(--primary-dark)':'#aaa'};font-weight:${active?'700':'400'};white-space:nowrap">${s.label}</div>
        </div>
        ${i<steps.length-1?`<div style="width:28px;height:2px;background:${done?'#4CAF50':'#e0e0e0'};margin-bottom:18px;transition:all .3s"></div>`:''}`;
    }).join('')}
  </div>`;
}