/**
 * ============================================================
 * PANEL DE ADMINISTRADOR - Funcionalidad Completa
 * admin.js
 * ============================================================
 */

// ===== NAVEGACIÓN EN SIDEBAR =====
function navigateAdminSection(section) {
  AppState.adminSection = section;
  
  qsAll('.panel-section').forEach(s => s.classList.remove('active'));
  qsAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  
  const target = el(`admin-section-${section}`);
  if (target) target.classList.add('active');
  
  const link = qs(`[data-section="${section}"]`);
  if (link) link.classList.add('active');

  // Cargar contenido según sección
  switch(section) {
    case 'dashboard':   renderAdminDashboard();   break;
    case 'election':    renderElectionConfig();   break;
    case 'candidates':  renderCandidatesMgmt();   break;
    case 'sections':    renderSectionsMgmt();     break;
    case 'urnas':       renderUrnasMgmt();        break;
    case 'locations':   renderLocationsMgmt();    break;
    case 'users':       renderUsersMgmt();        break;
    case 'settings':    renderSettingsMgmt();     break;
  }
}

// ===== DASHBOARD =====
function renderAdminDashboard() {
  const cont = el('admin-section-dashboard');
  if (!cont) return;

  const activeUrnas = AppState.urnas.filter(u => u.activo).length;
  const status = AppState.config.electionStatus;
  
  cont.innerHTML = `
    <div class="section-title">📊 Panel de Control</div>
    
    <div class="stats-grid">
      <div class="stat-card">
        <span class="stat-icon">🗳️</span>
        <div class="stat-value">${AppState.urnas.length}</div>
        <div class="stat-label">Urnas totales</div>
      </div>
      <div class="stat-card">
        <span class="stat-icon">✅</span>
        <div class="stat-value">${activeUrnas}</div>
        <div class="stat-label">Urnas activas</div>
      </div>
      <div class="stat-card">
        <span class="stat-icon">👤</span>
        <div class="stat-value">${AppState.candidates.length}</div>
        <div class="stat-label">Candidatos</div>
      </div>
      <div class="stat-card">
        <span class="stat-icon">🏫</span>
        <div class="stat-value">${AppState.sections.length}</div>
        <div class="stat-label">Secciones</div>
      </div>
    </div>

    <div class="card" style="margin-bottom:24px">
      <div class="card-header">
        <div class="card-title">⚡ Control de Votación</div>
        <div id="dashboard-status-badge"></div>
      </div>
      <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center">
        <button class="btn btn-success" onclick="controlElection('active')" ${status === 'active' ? 'disabled' : ''}>
          ▶️ Iniciar Votación
        </button>
        <button class="btn btn-warning" onclick="controlElection('paused')" ${status !== 'active' ? 'disabled' : ''}>
          ⏸ Pausar
        </button>
        <button class="btn btn-danger" onclick="controlElection('ended')" ${status === 'ended' ? 'disabled' : ''}>
          ⏹ Finalizar
        </button>
        <button class="btn btn-outline btn-sm" onclick="controlElection('inactive')">
          🔄 Reiniciar
        </button>
      </div>
      <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border)">
        <small style="color:var(--text-light)">
          Inicio programado: <strong>${formatTimeSV(AppState.config.electionStartTime) || 'No configurado'}</strong> &nbsp;|&nbsp;
          Fin programado: <strong>${formatTimeSV(AppState.config.electionEndTime) || 'No configurado'}</strong>
        </small>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
      <div class="card">
        <div class="card-title" style="margin-bottom:16px">🏫 Accesos rápidos</div>
        <div style="display:flex;flex-direction:column;gap:8px">
          <button class="btn btn-outline btn-sm" onclick="navigateAdminSection('candidates')">👤 Gestionar Candidatos</button>
          <button class="btn btn-outline btn-sm" onclick="navigateAdminSection('urnas')">🗳️ Gestionar Urnas</button>
          <button class="btn btn-outline btn-sm" onclick="navigateAdminSection('users')">👥 Gestionar Usuarios</button>
          <button class="btn btn-outline btn-sm" onclick="navigateAdminSection('election')">📅 Configurar Horario</button>
        </div>
      </div>
      <div class="card">
        <div class="card-title" style="margin-bottom:16px">🗳️ Estado de Urnas</div>
        <div style="display:flex;flex-direction:column;gap:6px;max-height:200px;overflow-y:auto">
          ${AppState.urnas.length === 0 ? '<p style="color:var(--text-light);font-size:.85rem">No hay urnas registradas</p>' :
            AppState.urnas.map(u => `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)">
                <div>
                  <strong style="font-size:.85rem">${sanitize(u.nombre)}</strong>
                  <small style="color:var(--text-light);display:block">${sanitize(u.ubicacion)}</small>
                </div>
                <span class="badge ${u.activo ? 'badge-active' : 'badge-inactive'}">${u.activo ? '● Activa' : '● Inactiva'}</span>
              </div>
            `).join('')
          }
        </div>
      </div>
    </div>
  `;

  // Actualizar badge de estado
  const badgeEl = el('dashboard-status-badge');
  if (badgeEl) badgeEl.innerHTML = statusBadge(status);
}

// ===== CONTROL DE ELECCIÓN =====
async function controlElection(newStatus) {
  const labels = { active: 'INICIAR', paused: 'PAUSAR', ended: 'FINALIZAR', inactive: 'REINICIAR', scheduled: 'PROGRAMAR' };
  showConfirmModal(
    `${labels[newStatus]} Votación`,
    `¿Confirmas ${labels[newStatus].toLowerCase()} la votación?`,
    async () => {
      showLoading('Actualizando estado...');
      try {
        const res = await API.setElectionStatus(newStatus);
        if (res.ok) {
          AppState.config.electionStatus = newStatus;
          updateHeaderDisplay();
          renderAdminDashboard();
          showToast(`Estado actualizado: ${newStatus}`, 'success');
        } else {
          showToast(res.error || 'Error al actualizar', 'error');
        }
      } catch (err) {
        showToast('Error de conexión: ' + err.message, 'error');
      } finally {
        hideLoading();
      }
    },
    newStatus === 'ended'
  );
}

// ===== CONFIGURACIÓN DE ELECCIÓN =====
function renderElectionConfig() {
  const cont = el('admin-section-election');
  if (!cont) return;

  cont.innerHTML = `
    <div class="section-title">📅 Configuración de Votación</div>
    
    <div class="card" style="max-width:640px">
      <div class="card-header">
        <div class="card-title">🕐 Horario Automático (Hora El Salvador)</div>
      </div>
      <div class="form-group">
        <label class="form-label">Fecha y hora de INICIO</label>
        <input type="datetime-local" id="ec-start" class="form-input" 
               value="${AppState.config.electionStartTime ? AppState.config.electionStartTime.slice(0,16) : ''}">
        <div style="font-size:.78rem;color:var(--text-light);margin-top:4px">Zona horaria: América/El_Salvador (UTC-6)</div>
      </div>
      <div class="form-group">
        <label class="form-label">Fecha y hora de FIN</label>
        <input type="datetime-local" id="ec-end" class="form-input"
               value="${AppState.config.electionEndTime ? AppState.config.electionEndTime.slice(0,16) : ''}">
      </div>
      <div class="alert alert-info">
        ⚡ Al guardar el horario, el estado de votación cambiará a <strong>Programada</strong>. El sistema la activará y finalizará automáticamente según los tiempos configurados.
      </div>
      <div style="display:flex;gap:12px;margin-top:8px">
        <button class="btn btn-primary" onclick="saveElectionSchedule()">💾 Guardar Horario Programado</button>
        <button class="btn btn-ghost" onclick="clearElectionSchedule()">🗑️ Limpiar Horario</button>
      </div>
    </div>
  `;
}

async function saveElectionSchedule() {
  const start = el('ec-start').value;
  const end   = el('ec-end').value;
  
  if (!start && !end) {
    showToast('Ingresa al menos una fecha', 'warning'); return;
  }

  if (start && end && new Date(start) >= new Date(end)) {
    showToast('La fecha de fin debe ser posterior al inicio', 'warning'); return;
  }

  showLoading('Guardando horario...');
  try {
    const res = await API.setElectionStatus('scheduled', start, end);
    if (res.ok) {
      AppState.config.electionStatus    = 'scheduled';
      AppState.config.electionStartTime = start;
      AppState.config.electionEndTime   = end;
      updateHeaderDisplay();
      showToast('Horario programado correctamente', 'success');
    } else {
      showToast(res.error || 'Error al guardar', 'error');
    }
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  } finally {
    hideLoading();
  }
}

async function clearElectionSchedule() {
  showLoading('Limpiando...');
  try {
    await API.saveConfig({ ELECTION_START_TIME: '', ELECTION_END_TIME: '' });
    AppState.config.electionStartTime = '';
    AppState.config.electionEndTime   = '';
    renderElectionConfig();
    showToast('Horario eliminado', 'success');
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  } finally {
    hideLoading();
  }
}

// ===== GESTIÓN DE CANDIDATOS =====
function renderCandidatesMgmt() {
  const cont = el('admin-section-candidates');
  if (!cont) return;

  cont.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px">
      <div class="section-title" style="margin-bottom:0">👤 Candidatos</div>
      <button class="btn btn-primary" onclick="openCandidateModal()">+ Agregar Candidato</button>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th>Foto</th><th>Nombre</th><th>Sección</th><th>Cargo</th><th>Estado</th><th>Acciones</th>
        </tr></thead>
        <tbody>
          ${AppState.candidates.length === 0
            ? `<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--text-light)">No hay candidatos registrados</td></tr>`
            : AppState.candidates.map(c => `
              <tr>
                <td>
                  ${c.fotoUrl
                    ? `<img src="${sanitize(c.fotoUrl)}" style="width:40px;height:40px;border-radius:50%;object-fit:cover" onerror="this.style.display='none'">`
                    : `<div style="width:40px;height:40px;border-radius:50%;background:var(--bg-soft);display:flex;align-items:center;justify-content:center;font-size:1.2rem">👤</div>`
                  }
                </td>
                <td><strong>${sanitize(c.nombre)}</strong></td>
                <td>${sanitize(c.seccion)}</td>
                <td>${sanitize(c.cargo)}</td>
                <td><span class="badge ${c.activo ? 'badge-active' : 'badge-inactive'}">${c.activo ? '● Activo' : '● Inactivo'}</span></td>
                <td>
                  <div style="display:flex;gap:6px">
                    <button class="btn btn-ghost btn-sm" onclick="openCandidateModal('${c.id}')">✏️ Editar</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteCandidate('${c.id}')">🗑️</button>
                  </div>
                </td>
              </tr>
            `).join('')
          }
        </tbody>
      </table>
    </div>
  `;
}

function openCandidateModal(id = null) {
  const cand = id ? AppState.candidates.find(c => c.id === id) : null;
  const sectionOptions = AppState.sections.map(s =>
    `<option value="${sanitize(s.nombre)}" ${cand && cand.seccion === s.nombre ? 'selected' : ''}>${sanitize(s.nombre)}</option>`
  ).join('');

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'candidate-modal';
  modal.innerHTML = `
    <div class="modal-box">
      <div class="modal-header">
        <h3 class="modal-title">${id ? '✏️ Editar' : '➕ Nuevo'} Candidato</h3>
        <button class="modal-close" onclick="el('candidate-modal').remove()">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Nombre Completo *</label>
          <input type="text" id="cand-nombre" class="form-input" value="${cand ? sanitize(cand.nombre) : ''}" placeholder="Nombre del candidato">
        </div>
        <div class="form-group">
          <label class="form-label">Sección *</label>
          <select id="cand-seccion" class="form-input form-select">
            <option value="">Seleccionar sección...</option>
            ${sectionOptions}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Cargo al que aspira *</label>
          <input type="text" id="cand-cargo" class="form-input" value="${cand ? sanitize(cand.cargo) : ''}" placeholder="Ej: Presidente Estudiantil">
        </div>
        <div class="form-group">
          <label class="form-label">URL de foto (opcional)</label>
          <input type="url" id="cand-foto" class="form-input" value="${cand ? sanitize(cand.fotoUrl || '') : ''}" placeholder="https://...">
          <div style="font-size:.75rem;color:var(--text-light);margin-top:4px">Sube la foto a Google Drive o Imgur y pega la URL directa</div>
        </div>
        <div id="cand-error" class="alert alert-error" style="display:none"></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="el('candidate-modal').remove()">Cancelar</button>
        <button class="btn btn-primary" onclick="saveCandidate('${id || ''}')">💾 Guardar</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
}

async function saveCandidate(id = '') {
  const nombre  = el('cand-nombre').value.trim();
  const seccion = el('cand-seccion').value;
  const cargo   = el('cand-cargo').value.trim();
  const fotoUrl = el('cand-foto').value.trim();
  const errEl   = el('cand-error');

  if (!nombre || !seccion || !cargo) {
    errEl.textContent = 'Nombre, sección y cargo son obligatorios';
    errEl.style.display = 'flex'; return;
  }

  showLoading('Guardando candidato...');
  try {
    const res = await API.saveCandidate({ id: id || null, nombre, seccion, cargo, fotoUrl });
    if (res.ok) {
      const fresh = await API.getCandidates();
      if (fresh.ok) AppState.candidates = fresh.data;
      el('candidate-modal')?.remove();
      renderCandidatesMgmt();
      showToast('Candidato guardado', 'success');
    } else {
      errEl.textContent = res.error || 'Error al guardar';
      errEl.style.display = 'flex';
    }
  } catch (err) {
    errEl.textContent = 'Error: ' + err.message;
    errEl.style.display = 'flex';
  } finally {
    hideLoading();
  }
}

async function deleteCandidate(id) {
  showConfirmModal('Eliminar Candidato', '¿Estás seguro de eliminar este candidato? Esta acción no se puede deshacer.', async () => {
    showLoading('Eliminando...');
    try {
      const res = await API.deleteCandidate(id);
      if (res.ok) {
        AppState.candidates = AppState.candidates.filter(c => c.id !== id);
        renderCandidatesMgmt();
        showToast('Candidato eliminado', 'success');
      } else {
        showToast(res.error || 'Error al eliminar', 'error');
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    } finally {
      hideLoading();
    }
  }, true);
}

// ===== GESTIÓN DE SECCIONES =====
function renderSectionsMgmt() {
  const cont = el('admin-section-sections');
  if (!cont) return;

  cont.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px">
      <div class="section-title" style="margin-bottom:0">🏫 Secciones Académicas</div>
      <button class="btn btn-primary" onclick="openSectionModal()">+ Agregar Sección</button>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Nombre</th><th>Estado</th><th>Acciones</th></tr></thead>
        <tbody>
          ${AppState.sections.length === 0
            ? `<tr><td colspan="3" style="text-align:center;padding:32px;color:var(--text-light)">No hay secciones registradas</td></tr>`
            : AppState.sections.map(s => `
              <tr>
                <td><strong>${sanitize(s.nombre)}</strong></td>
                <td><span class="badge ${s.activo ? 'badge-active' : 'badge-inactive'}">${s.activo ? '● Activa' : '● Inactiva'}</span></td>
                <td>
                  <div style="display:flex;gap:6px">
                    <button class="btn btn-ghost btn-sm" onclick="openSectionModal('${s.id}')">✏️ Editar</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteSection('${s.id}')">🗑️</button>
                  </div>
                </td>
              </tr>
            `).join('')
          }
        </tbody>
      </table>
    </div>
  `;
}

function openSectionModal(id = null) {
  const sec = id ? AppState.sections.find(s => s.id === id) : null;
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'section-modal';
  modal.innerHTML = `
    <div class="modal-box" style="max-width:420px">
      <div class="modal-header">
        <h3 class="modal-title">${id ? '✏️ Editar' : '➕ Nueva'} Sección</h3>
        <button class="modal-close" onclick="el('section-modal').remove()">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Nombre de la Sección *</label>
          <input type="text" id="sec-nombre" class="form-input" value="${sec ? sanitize(sec.nombre) : ''}" placeholder="Ej: 9° Grado Sección A">
        </div>
        <div id="sec-error" class="alert alert-error" style="display:none"></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="el('section-modal').remove()">Cancelar</button>
        <button class="btn btn-primary" onclick="saveSection('${id || ''}')">💾 Guardar</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
}

async function saveSection(id = '') {
  const nombre = el('sec-nombre').value.trim();
  const errEl  = el('sec-error');
  if (!nombre) { errEl.textContent = 'El nombre es obligatorio'; errEl.style.display = 'flex'; return; }

  showLoading('Guardando sección...');
  try {
    const res = await API.saveSection({ id: id || null, nombre });
    if (res.ok) {
      const fresh = await API.getSections();
      if (fresh.ok) AppState.sections = fresh.data;
      el('section-modal')?.remove();
      renderSectionsMgmt();
      showToast('Sección guardada', 'success');
    } else {
      errEl.textContent = res.error || 'Error'; errEl.style.display = 'flex';
    }
  } catch (err) {
    errEl.textContent = 'Error: ' + err.message; errEl.style.display = 'flex';
  } finally {
    hideLoading();
  }
}

async function deleteSection(id) {
  showConfirmModal('Eliminar Sección', '¿Eliminar esta sección?', async () => {
    showLoading('Eliminando...');
    try {
      const res = await API.deleteSection(id);
      if (res.ok) {
        AppState.sections = AppState.sections.filter(s => s.id !== id);
        renderSectionsMgmt();
        showToast('Sección eliminada', 'success');
      } else showToast(res.error || 'Error', 'error');
    } catch (err) { showToast('Error: ' + err.message, 'error'); }
    finally { hideLoading(); }
  }, true);
}

// ===== GESTIÓN DE UBICACIONES =====
function renderLocationsMgmt() {
  const cont = el('admin-section-locations');
  if (!cont) return;

  cont.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px">
      <div class="section-title" style="margin-bottom:0">📍 Ubicaciones / Sectores</div>
      <button class="btn btn-primary" onclick="openLocationModal()">+ Agregar Ubicación</button>
    </div>
    <div class="alert alert-info">💡 Las ubicaciones y sectores se usan para organizar y agrupar las urnas. Crea primero tus ubicaciones y luego asígnalas a las urnas.</div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Nombre</th><th>Tipo</th><th>Acciones</th></tr></thead>
        <tbody>
          ${AppState.locations.length === 0
            ? `<tr><td colspan="3" style="text-align:center;padding:32px;color:var(--text-light)">No hay ubicaciones registradas</td></tr>`
            : AppState.locations.map(l => `
              <tr>
                <td><strong>${sanitize(l.nombre)}</strong></td>
                <td>${sanitize(l.tipo || '—')}</td>
                <td>
                  <div style="display:flex;gap:6px">
                    <button class="btn btn-ghost btn-sm" onclick="openLocationModal('${l.id}')">✏️ Editar</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteLocation('${l.id}')">🗑️</button>
                  </div>
                </td>
              </tr>
            `).join('')
          }
        </tbody>
      </table>
    </div>
  `;
}

function openLocationModal(id = null) {
  const loc = id ? AppState.locations.find(l => l.id === id) : null;
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'location-modal';
  modal.innerHTML = `
    <div class="modal-box" style="max-width:420px">
      <div class="modal-header">
        <h3 class="modal-title">${id ? '✏️ Editar' : '➕ Nueva'} Ubicación</h3>
        <button class="modal-close" onclick="el('location-modal').remove()">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Nombre de la Ubicación *</label>
          <input type="text" id="loc-nombre" class="form-input" value="${loc ? sanitize(loc.nombre) : ''}" placeholder="Ej: Edificio Básica">
        </div>
        <div class="form-group">
          <label class="form-label">Tipo (Sector/Bloque)</label>
          <input type="text" id="loc-tipo" class="form-input" value="${loc ? sanitize(loc.tipo || '') : ''}" placeholder="Ej: Básica, Media, Dirección...">
        </div>
        <div id="loc-error" class="alert alert-error" style="display:none"></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="el('location-modal').remove()">Cancelar</button>
        <button class="btn btn-primary" onclick="saveLocation('${id || ''}')">💾 Guardar</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
}

async function saveLocation(id = '') {
  const nombre = el('loc-nombre').value.trim();
  const tipo   = el('loc-tipo').value.trim();
  const errEl  = el('loc-error');
  if (!nombre) { errEl.textContent = 'El nombre es obligatorio'; errEl.style.display = 'flex'; return; }

  showLoading('Guardando...');
  try {
    const res = await API.saveLocation({ id: id || null, nombre, tipo });
    if (res.ok) {
      const fresh = await API.getLocations();
      if (fresh.ok) AppState.locations = fresh.data;
      el('location-modal')?.remove();
      renderLocationsMgmt();
      showToast('Ubicación guardada', 'success');
    } else { errEl.textContent = res.error || 'Error'; errEl.style.display = 'flex'; }
  } catch (err) { errEl.textContent = 'Error: ' + err.message; errEl.style.display = 'flex'; }
  finally { hideLoading(); }
}

async function deleteLocation(id) {
  showConfirmModal('Eliminar Ubicación', '¿Eliminar esta ubicación?', async () => {
    showLoading('Eliminando...');
    try {
      const res = await API.deleteLocation(id);
      if (res.ok) {
        AppState.locations = AppState.locations.filter(l => l.id !== id);
        renderLocationsMgmt();
        showToast('Ubicación eliminada', 'success');
      } else showToast(res.error || 'Error', 'error');
    } catch (err) { showToast('Error: ' + err.message, 'error'); }
    finally { hideLoading(); }
  }, true);
}

// ===== GESTIÓN DE URNAS =====
function renderUrnasMgmt() {
  const cont = el('admin-section-urnas');
  if (!cont) return;

  // Agrupar por sector
  const sectors = [...new Set(AppState.urnas.map(u => u.sector || 'Sin sector'))];

  cont.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px">
      <div class="section-title" style="margin-bottom:0">🗳️ Urnas de Votación</div>
      <button class="btn btn-primary" onclick="openUrnaModal()">+ Agregar Urna</button>
    </div>

    <div class="alert alert-info" style="margin-bottom:20px">
      📌 Máximo 30 urnas activas simultáneamente. Las urnas desactivadas no permitirán iniciar sesión ni votar.
    </div>

    ${sectors.length > 1 ? `
      <div class="card" style="margin-bottom:20px">
        <div class="card-title" style="margin-bottom:14px">⚡ Control por Sector</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          ${sectors.map(s => `
            <div style="display:flex;align-items:center;gap:8px;padding:8px 14px;border:1px solid var(--border);border-radius:8px">
              <span style="font-weight:600;font-size:.88rem">${sanitize(s)}</span>
              <button class="btn btn-success btn-sm" onclick="toggleSectorAll('${sanitize(s)}', true)">Activar</button>
              <button class="btn btn-danger btn-sm" onclick="toggleSectorAll('${sanitize(s)}', false)">Desactivar</button>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}

    <div class="table-wrap">
      <table>
        <thead><tr><th>Urna</th><th>Usuario</th><th>Ubicación</th><th>Sector</th><th>Estado</th><th>Acciones</th></tr></thead>
        <tbody>
          ${AppState.urnas.length === 0
            ? `<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--text-light)">No hay urnas registradas</td></tr>`
            : AppState.urnas.map(u => `
              <tr>
                <td><strong>${sanitize(u.nombre)}</strong></td>
                <td><code style="font-size:.82rem;background:var(--bg-soft);padding:2px 6px;border-radius:4px">${sanitize(u.username)}</code></td>
                <td>${sanitize(u.ubicacion)}</td>
                <td>${sanitize(u.sector || '—')}</td>
                <td><span class="badge ${u.activo ? 'badge-active' : 'badge-inactive'}">${u.activo ? '● Activa' : '● Inactiva'}</span></td>
                <td>
                  <div style="display:flex;gap:6px">
                    <button class="btn btn-ghost btn-sm" onclick="openUrnaModal('${u.id}')">✏️</button>
                    <button class="btn ${u.activo ? 'btn-warning' : 'btn-success'} btn-sm" onclick="toggleUrnaStatus('${u.id}', ${!u.activo})">
                      ${u.activo ? '⏸ Desact.' : '▶️ Activar'}
                    </button>
                  </div>
                </td>
              </tr>
            `).join('')
          }
        </tbody>
      </table>
    </div>
  `;
}

function openUrnaModal(id = null) {
  const urna = id ? AppState.urnas.find(u => u.id === id) : null;
  const locOptions = AppState.locations.map(l =>
    `<option value="${sanitize(l.nombre)}" ${urna && urna.ubicacion === l.nombre ? 'selected' : ''}>${sanitize(l.nombre)}</option>`
  ).join('');

  const sectors = [...new Set(AppState.locations.map(l => l.tipo).filter(Boolean))];
  const sectorOptions = sectors.map(s =>
    `<option value="${sanitize(s)}" ${urna && urna.sector === s ? 'selected' : ''}>${sanitize(s)}</option>`
  ).join('');

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'urna-modal';
  modal.innerHTML = `
    <div class="modal-box">
      <div class="modal-header">
        <h3 class="modal-title">${id ? '✏️ Editar' : '➕ Nueva'} Urna</h3>
        <button class="modal-close" onclick="el('urna-modal').remove()">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Nombre de la Urna *</label>
          <input type="text" id="urna-nombre" class="form-input" value="${urna ? sanitize(urna.nombre) : ''}" placeholder="Ej: Urna 1">
        </div>
        <div class="form-group">
          <label class="form-label">Ubicación / Dirección física *</label>
          <select id="urna-ubicacion" class="form-input form-select">
            <option value="">Seleccionar ubicación...</option>
            ${locOptions}
          </select>
          <div style="font-size:.75rem;color:var(--text-light);margin-top:4px">Si no ves la ubicación, créala primero en "Ubicaciones"</div>
        </div>
        <div class="form-group">
          <label class="form-label">Sector / Bloque *</label>
          <select id="urna-sector" class="form-input form-select">
            <option value="">Seleccionar sector...</option>
            ${sectorOptions}
            <option value="${urna ? sanitize(urna.sector || '') : ''}" ${urna && !sectors.includes(urna.sector) ? 'selected' : ''}>
              ${urna && !sectors.includes(urna.sector) ? sanitize(urna.sector || '') : ''}
            </option>
          </select>
        </div>
        <hr style="border:none;border-top:1px solid var(--border);margin:16px 0">
        <div class="form-group">
          <label class="form-label">Usuario de acceso *</label>
          <input type="text" id="urna-username" class="form-input" value="${urna ? sanitize(urna.username) : ''}" placeholder="Ej: urna1">
          <div style="font-size:.75rem;color:var(--text-light);margin-top:4px">Con este usuario la urna inicia sesión</div>
        </div>
        <div class="form-group">
          <label class="form-label">Contraseña ${id ? '(dejar vacío para mantener)' : '*'}</label>
          <input type="password" id="urna-password" class="form-input" placeholder="${id ? 'Nueva contraseña (opcional)' : 'Contraseña'}">
        </div>
        <div id="urna-error" class="alert alert-error" style="display:none"></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="el('urna-modal').remove()">Cancelar</button>
        <button class="btn btn-primary" onclick="saveUrna('${id || ''}')">💾 Guardar</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
}

async function saveUrna(id = '') {
  const nombre    = el('urna-nombre').value.trim();
  const ubicacion = el('urna-ubicacion').value;
  const sector    = el('urna-sector').value;
  const username  = el('urna-username').value.trim();
  const password  = el('urna-password').value;
  const errEl     = el('urna-error');

  if (!nombre || !ubicacion || !username) {
    errEl.textContent = 'Nombre, ubicación y usuario son obligatorios';
    errEl.style.display = 'flex'; return;
  }
  if (!id && !password) {
    errEl.textContent = 'La contraseña es obligatoria para urnas nuevas';
    errEl.style.display = 'flex'; return;
  }
  
  // Verificar límite de 30 urnas
  if (!id && AppState.urnas.length >= 30) {
    errEl.textContent = 'Límite máximo de 30 urnas alcanzado';
    errEl.style.display = 'flex'; return;
  }

  showLoading('Guardando urna...');
  try {
    const res = await API.saveUrna({ id: id || null, nombre, ubicacion, sector, username, password: password || null });
    if (res.ok) {
      const fresh = await API.getUrnas();
      if (fresh.ok) AppState.urnas = fresh.data;
      el('urna-modal')?.remove();
      renderUrnasMgmt();
      showToast('Urna guardada correctamente', 'success');
    } else { errEl.textContent = res.error || 'Error'; errEl.style.display = 'flex'; }
  } catch (err) { errEl.textContent = 'Error: ' + err.message; errEl.style.display = 'flex'; }
  finally { hideLoading(); }
}

async function toggleUrnaStatus(id, activo) {
  const action = activo ? 'activar' : 'desactivar';
  showConfirmModal(`${activo ? 'Activar' : 'Desactivar'} Urna`, `¿Deseas ${action} esta urna?`, async () => {
    showLoading('Actualizando...');
    try {
      const res = await API.toggleUrna(id, activo);
      if (res.ok) {
        const fresh = await API.getUrnas();
        if (fresh.ok) AppState.urnas = fresh.data;
        renderUrnasMgmt();
        showToast(`Urna ${activo ? 'activada' : 'desactivada'}`, 'success');
      } else showToast(res.error || 'Error', 'error');
    } catch (err) { showToast('Error: ' + err.message, 'error'); }
    finally { hideLoading(); }
  });
}

async function toggleSectorAll(sector, activo) {
  const action = activo ? 'activar' : 'desactivar';
  showConfirmModal(`${activo ? 'Activar' : 'Desactivar'} Sector`, `¿${action.charAt(0).toUpperCase()+action.slice(1)} todas las urnas del sector "${sector}"?`, async () => {
    showLoading('Actualizando sector...');
    try {
      const res = await API.toggleSector(sector, activo);
      if (res.ok) {
        const fresh = await API.getUrnas();
        if (fresh.ok) AppState.urnas = fresh.data;
        renderUrnasMgmt();
        showToast(`${res.count || 0} urnas actualizadas en sector ${sector}`, 'success');
      } else showToast(res.error || 'Error', 'error');
    } catch (err) { showToast('Error: ' + err.message, 'error'); }
    finally { hideLoading(); }
  });
}

// ===== GESTIÓN DE USUARIOS =====
function renderUsersMgmt() {
  const cont = el('admin-section-users');
  if (!cont) return;

  const nonUrnaUsers = AppState.users.filter(u => u.role !== 'URNA');
  const roleColors = { ADMIN: '#1565C0', RESULTADOS: '#2E7D32' };
  const roleBg     = { ADMIN: '#E3F2FD', RESULTADOS: '#E8F5E9' };

  cont.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px">
      <div class="section-title" style="margin-bottom:0">👥 Usuarios del Sistema</div>
      <button class="btn btn-primary" onclick="openUserModal()">+ Agregar Usuario</button>
    </div>
    <div class="alert alert-warning" style="margin-bottom:20px">
      ⚠️ Los usuarios de tipo URNA se crean automáticamente al registrar una urna. Aquí solo administras usuarios ADMIN y RESULTADOS.
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Nombre</th><th>Usuario</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr></thead>
        <tbody>
          ${nonUrnaUsers.length === 0
            ? `<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--text-light)">No hay usuarios registrados</td></tr>`
            : nonUrnaUsers.map(u => `
              <tr>
                <td><strong>${sanitize(u.nombre)}</strong></td>
                <td><code style="font-size:.82rem;background:var(--bg-soft);padding:2px 6px;border-radius:4px">${sanitize(u.username)}</code></td>
                <td>
                  <span style="padding:3px 10px;border-radius:999px;font-size:.74rem;font-weight:700;
                               background:${roleBg[u.role]||'#f5f5f5'};color:${roleColors[u.role]||'#555'}">
                    ${u.role}
                  </span>
                </td>
                <td><span class="badge ${u.activo ? 'badge-active' : 'badge-inactive'}">${u.activo ? '● Activo' : '● Inactivo'}</span></td>
                <td>
                  <div style="display:flex;gap:6px">
                    <button class="btn btn-ghost btn-sm" onclick="openUserModal('${u.id}')">✏️ Editar</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteUser('${u.id}')">🗑️</button>
                  </div>
                </td>
              </tr>
            `).join('')
          }
        </tbody>
      </table>
    </div>
  `;
}

function openUserModal(id = null) {
  const user = id ? AppState.users.find(u => u.id === id) : null;
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'user-modal';
  modal.innerHTML = `
    <div class="modal-box" style="max-width:440px">
      <div class="modal-header">
        <h3 class="modal-title">${id ? '✏️ Editar' : '➕ Nuevo'} Usuario</h3>
        <button class="modal-close" onclick="el('user-modal').remove()">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Nombre Completo *</label>
          <input type="text" id="user-nombre" class="form-input" value="${user ? sanitize(user.nombre) : ''}" placeholder="Nombre del usuario">
        </div>
        <div class="form-group">
          <label class="form-label">Nombre de Usuario *</label>
          <input type="text" id="user-username" class="form-input" value="${user ? sanitize(user.username) : ''}" placeholder="username">
        </div>
        <div class="form-group">
          <label class="form-label">Rol *</label>
          <select id="user-role" class="form-input form-select">
            <option value="ADMIN"      ${user && user.role==='ADMIN'      ? 'selected' : ''}>ADMIN</option>
            <option value="RESULTADOS" ${user && user.role==='RESULTADOS' ? 'selected' : ''}>RESULTADOS</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Contraseña ${id ? '(vacío = no cambiar)' : '*'}</label>
          <input type="password" id="user-password" class="form-input" placeholder="${id ? 'Nueva contraseña (opcional)' : 'Contraseña'}">
        </div>
        <div id="user-error" class="alert alert-error" style="display:none"></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="el('user-modal').remove()">Cancelar</button>
        <button class="btn btn-primary" onclick="saveUser('${id || ''}')">💾 Guardar</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
}

async function saveUser(id = '') {
  const nombre   = el('user-nombre').value.trim();
  const username = el('user-username').value.trim();
  const role     = el('user-role').value;
  const password = el('user-password').value;
  const errEl    = el('user-error');

  if (!nombre || !username) {
    errEl.textContent = 'Nombre y usuario son obligatorios'; errEl.style.display = 'flex'; return;
  }
  if (!id && !password) {
    errEl.textContent = 'La contraseña es obligatoria para nuevos usuarios'; errEl.style.display = 'flex'; return;
  }

  showLoading('Guardando usuario...');
  try {
    const res = await API.saveUser({ id: id || null, nombre, username, role, password: password || null });
    if (res.ok) {
      const fresh = await API.getUsers();
      if (fresh.ok) AppState.users = fresh.data;
      el('user-modal')?.remove();
      renderUsersMgmt();
      showToast('Usuario guardado', 'success');
    } else { errEl.textContent = res.error || 'Error'; errEl.style.display = 'flex'; }
  } catch (err) { errEl.textContent = 'Error: ' + err.message; errEl.style.display = 'flex'; }
  finally { hideLoading(); }
}

async function deleteUser(id) {
  showConfirmModal('Eliminar Usuario', '¿Eliminar este usuario?', async () => {
    showLoading('Eliminando...');
    try {
      const res = await API.deleteUser(id);
      if (res.ok) {
        AppState.users = AppState.users.filter(u => u.id !== id);
        renderUsersMgmt();
        showToast('Usuario eliminado', 'success');
      } else showToast(res.error || 'Error', 'error');
    } catch (err) { showToast('Error: ' + err.message, 'error'); }
    finally { hideLoading(); }
  }, true);
}

// ===== CONFIGURACIÓN GENERAL =====
function renderSettingsMgmt() {
  const cont = el('admin-section-settings');
  if (!cont) return;

  const cfg = AppState.config;
  cont.innerHTML = `
    <div class="section-title">⚙️ Configuración General</div>
    
    <div class="card" style="max-width:640px">
      <div class="card-header">
        <div class="card-title">🏫 Información Institucional</div>
      </div>
      <div class="form-group">
        <label class="form-label">Nombre de la Institución *</label>
        <input type="text" id="set-inst" class="form-input" value="${sanitize(cfg.institutionName)}" placeholder="Nombre completo de la institución">
      </div>
      <div class="form-group">
        <label class="form-label">Nombre / Descripción de la Votación *</label>
        <input type="text" id="set-elec" class="form-input" value="${sanitize(cfg.electionName)}" placeholder="Ej: Elecciones Estudiantiles 2024">
      </div>
      <div class="form-group">
        <label class="form-label">URL del Logo Institucional</label>
        <input type="url" id="set-logo" class="form-input" value="${sanitize(cfg.logoUrl)}" placeholder="https://... (URL directa a la imagen)">
        ${cfg.logoUrl ? `<img src="${sanitize(cfg.logoUrl)}" style="height:60px;margin-top:10px;border-radius:8px;border:1px solid var(--border)" onerror="this.style.display='none'">` : ''}
        <div style="font-size:.75rem;color:var(--text-light);margin-top:6px">
          💡 Sube tu logo a Google Drive (como imagen compartida pública), Imgur, o cualquier hosting de imágenes y pega la URL directa aquí.
        </div>
      </div>
      <div id="settings-error" class="alert alert-error" style="display:none"></div>
      <button class="btn btn-primary" onclick="saveSettings()">💾 Guardar Configuración</button>
    </div>
  `;
}

async function saveSettings() {
  const instName  = el('set-inst').value.trim();
  const elecName  = el('set-elec').value.trim();
  const logoUrl   = el('set-logo').value.trim();
  const errEl     = el('settings-error');

  if (!instName || !elecName) {
    errEl.textContent = 'Nombre de institución y votación son obligatorios';
    errEl.style.display = 'flex'; return;
  }

  showLoading('Guardando configuración...');
  try {
    const res = await API.saveConfig({
      INSTITUTION_NAME: instName,
      ELECTION_NAME:    elecName,
      LOGO_URL:         logoUrl
    });
    if (res.ok) {
      AppState.config.institutionName = instName;
      AppState.config.electionName    = elecName;
      AppState.config.logoUrl         = logoUrl;
      updateHeaderDisplay();
      renderSettingsMgmt();
      showToast('Configuración guardada correctamente', 'success');
    } else {
      errEl.textContent = res.error || 'Error al guardar'; errEl.style.display = 'flex';
    }
  } catch (err) {
    errEl.textContent = 'Error: ' + err.message; errEl.style.display = 'flex';
  } finally {
    hideLoading();
  }
}
