/**
 * SISTEMA DE VOTACIÓN v2.0 - admin.js COMPLETO v3
 */

// ===== NAVEGACIÓN =====
function navigateAdminSection(section) {
  AppState.adminSection = section;
  qsAll('.panel-section').forEach(s=>s.classList.remove('active'));
  qsAll('.sidebar-link').forEach(l=>l.classList.remove('active'));
  el('admin-section-'+section)?.classList.add('active');
  qs('[data-section="'+section+'"]')?.classList.add('active');
  const renders = {
    dashboard: renderAdminDashboard,
    elections: renderElectionsMgmt,
    candidates: renderCandidatesMgmt,
    sections: renderSectionsMgmt,
    voters: renderVotersMgmt,
    urnas: renderUrnasMgmt,
    locations: renderLocationsMgmt,
    users: renderUsersMgmt,
    settings: renderSettingsMgmt,
    audit: renderAuditLog,
  };
  if (renders[section]) renders[section]();
}

// ===== DASHBOARD =====
function renderAdminDashboard() {
  const cont = el('admin-section-dashboard');
  if (!cont) return;
  const elections = AppState.elections || [];
  const active = elections.filter(e=>e.estado==='active');
  cont.innerHTML = `
    <div class="section-title">📊 Panel de Control</div>
    <div class="stats-grid">
      <div class="stat-card"><span class="stat-icon">🗳️</span><div class="stat-value">${elections.length}</div><div class="stat-label">Votaciones creadas</div></div>
      <div class="stat-card"><span class="stat-icon">✅</span><div class="stat-value">${active.length}</div><div class="stat-label">Votaciones activas</div></div>
      <div class="stat-card"><span class="stat-icon">👥</span><div class="stat-value">${(AppState.voters||[]).length}</div><div class="stat-label">Votantes en padrón</div></div>
      <div class="stat-card"><span class="stat-icon">🏛️</span><div class="stat-value">${(AppState.urnas||[]).filter(u=>u.activo).length}</div><div class="stat-label">Urnas activas</div></div>
    </div>
    <div class="card" style="margin-bottom:24px">
      <div class="card-header">
        <div class="card-title">🗳️ Votaciones Recientes</div>
        <button class="btn btn-primary btn-sm" onclick="navigateAdminSection('elections')">Ver todas</button>
      </div>
      ${elections.length===0?'<p style="color:var(--text-light);text-align:center;padding:24px">No hay votaciones creadas aún</p>':
        elections.slice(-5).reverse().map(e=>`
          <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--border)">
            <div>
              <strong style="font-size:.92rem">${sanitize(e.nombre)}</strong>
              <div style="font-size:.75rem;color:var(--text-light)">Creada: ${formatTimeSV(e.creado)}</div>
            </div>
            <div style="display:flex;align-items:center;gap:8px">
              ${statusBadge(e.estado)}
              <button class="btn btn-outline btn-sm" onclick="openElectionControl('${e.id}')">Controlar</button>
            </div>
          </div>`).join('')}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
      <div class="card">
        <div class="card-title" style="margin-bottom:16px">⚡ Accesos rápidos</div>
        <div style="display:flex;flex-direction:column;gap:8px">
          <button class="btn btn-outline btn-sm" onclick="navigateAdminSection('elections')">🗳️ Nueva Votación</button>
          <button class="btn btn-outline btn-sm" onclick="navigateAdminSection('voters')">👥 Gestionar Padrón</button>
          <button class="btn btn-outline btn-sm" onclick="navigateAdminSection('urnas')">🏛️ Gestionar Urnas</button>
          <button class="btn btn-outline btn-sm" onclick="navigateAdminSection('audit')">📋 Ver Auditoría</button>
        </div>
      </div>
      <div class="card">
        <div class="card-title" style="margin-bottom:16px">🏛️ Estado de Urnas</div>
        <div style="max-height:200px;overflow-y:auto">
          ${(AppState.urnas||[]).length===0?'<p style="color:var(--text-light);font-size:.85rem">No hay urnas</p>':
            (AppState.urnas||[]).map(u=>`
              <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border)">
                <div><strong style="font-size:.82rem">${sanitize(u.nombre)}</strong><small style="color:var(--text-light);display:block">${sanitize(u.ubicacion)}</small></div>
                <span class="badge ${u.activo?'badge-active':'badge-inactive'}">${u.activo?'● Activa':'● Inactiva'}</span>
              </div>`).join('')}
        </div>
      </div>
    </div>`;
}

// ===== VOTACIONES =====
function renderElectionsMgmt() {
  const cont = el('admin-section-elections');
  if (!cont) return;
  const elections = AppState.elections || [];
  cont.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px">
      <div class="section-title" style="margin-bottom:0">🗳️ Votaciones</div>
      <button class="btn btn-primary" onclick="openElectionModal()">+ Nueva Votación</button>
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>Nombre</th><th>Descripción</th><th>Estado</th><th>Creada</th><th>Resultados</th><th>Acciones</th></tr></thead>
      <tbody>
        ${elections.length===0?'<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--text-light)">No hay votaciones creadas</td></tr>':
          elections.map(e=>`
            <tr>
              <td><strong>${sanitize(e.nombre)}</strong></td>
              <td style="font-size:.82rem;color:var(--text-secondary)">${sanitize(e.descripcion||'—')}</td>
              <td>${statusBadge(e.estado)}</td>
              <td style="font-size:.8rem">${formatTimeSV(e.creado)}</td>
              <td><span class="badge ${e.mostrarResultados?'badge-active':'badge-inactive'}">${e.mostrarResultados?'Visibles':'Ocultos'}</span></td>
              <td><div style="display:flex;gap:6px;flex-wrap:wrap">
                <button class="btn btn-primary btn-sm" onclick="openElectionControl('${e.id}')">⚡ Controlar</button>
                <button class="btn btn-outline btn-sm" onclick="openElectionConfig('${e.id}')">⚙️ Config</button>
                <button class="btn btn-ghost btn-sm" onclick="openExportModal('${e.id}')">📄 Exportar</button>
              </div></td>
            </tr>`).join('')}
      </tbody>
    </table></div>`;
}

function openElectionModal(id=null) {
  const e = id ? (AppState.elections||[]).find(x=>x.id===id) : null;
  const m = document.createElement('div');
  m.className='modal-overlay'; m.id='election-modal';
  m.innerHTML=`<div class="modal-box">
    <div class="modal-header"><h3 class="modal-title">${id?'✏️ Editar':'➕ Nueva'} Votación</h3>
      <button class="modal-close" onclick="el('election-modal').remove()">✕</button></div>
    <div class="modal-body">
      <div class="form-group"><label class="form-label">Nombre de la Votación *</label>
        <input type="text" id="elec-nombre" class="form-input" value="${e?sanitize(e.nombre):''}" placeholder="Ej: Elecciones CDE 2026"></div>
      <div class="form-group"><label class="form-label">Descripción</label>
        <input type="text" id="elec-desc" class="form-input" value="${e?sanitize(e.descripcion||''):''}" placeholder="Descripción breve"></div>
      <div class="form-group"><label class="form-label">Tipo de Identificador</label>
        <select id="elec-tipo" class="form-input form-select">
          <option value="NIE" ${!e||e.tipoId==='NIE'?'selected':''}>NIE</option>
          <option value="DUI" ${e&&e.tipoId==='DUI'?'selected':''}>DUI</option>
        </select></div>
      ${id?`<div class="form-group"><label class="form-label">🔑 Clave de Control *</label>
        <input type="password" id="elec-clave" class="form-input" placeholder="Ingresa la clave de esta votación"></div>`:''}
      <div id="elec-error" class="alert alert-error" style="display:none"></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="el('election-modal').remove()">Cancelar</button>
      <button class="btn btn-primary" onclick="saveElection('${id||''}')">💾 Guardar</button>
    </div></div>`;
  document.body.appendChild(m);
  m.onclick=ev=>{if(ev.target===m)m.remove();};
}

async function saveElection(id='') {
  const nombre=el('elec-nombre').value.trim(), desc=el('elec-desc').value.trim(), tipo=el('elec-tipo').value;
  const clave=id?el('elec-clave')?.value:null, errEl=el('elec-error');
  if(!nombre){errEl.textContent='El nombre es obligatorio';errEl.style.display='flex';return;}
  showLoading('Guardando...');
  try{
    const res=await API.saveElection({id:id||null,nombre,descripcion:desc,tipoId:tipo,claveControl:clave,usuario:'ADMIN'});
    if(res.ok){
      if(!id&&res.claveControl){el('election-modal')?.remove();showKeyModal(res.claveControl,nombre);}
      else{el('election-modal')?.remove();showToast('Votación guardada','success');}
      const fresh=await API.getElections(); if(fresh.ok) AppState.elections=fresh.data;
      renderElectionsMgmt();
    } else{errEl.textContent=res.error||'Error';errEl.style.display='flex';}
  }catch(err){errEl.textContent='Error: '+err.message;errEl.style.display='flex';}
  finally{hideLoading();}
}

function showKeyModal(clave,nombre) {
  const m=document.createElement('div');m.className='modal-overlay';m.id='key-modal';
  m.innerHTML=`<div class="modal-box" style="max-width:460px;text-align:center">
    <div class="modal-header" style="justify-content:center"><h3 class="modal-title">🔑 Clave de Control Generada</h3></div>
    <div class="modal-body">
      <p style="color:var(--text-secondary);margin-bottom:20px">Clave para <strong>${sanitize(nombre)}</strong>.<br><span style="color:var(--error);font-weight:700">Guárdala ahora — no se puede recuperar después.</span></p>
      <div style="background:var(--bg-soft);border:2px solid var(--primary-light);border-radius:12px;padding:20px;margin:16px 0">
        <div style="font-size:1.6rem;font-weight:800;color:var(--primary-dark);letter-spacing:3px">${sanitize(clave)}</div>
      </div>
      <button class="btn btn-outline btn-sm" onclick="navigator.clipboard.writeText('${sanitize(clave)}').then(()=>showToast('Clave copiada','success'))">📋 Copiar clave</button>
    </div>
    <div class="modal-footer" style="justify-content:center">
      <button class="btn btn-primary" onclick="el('key-modal').remove()">✅ Ya la guardé</button>
    </div></div>`;
  document.body.appendChild(m);
}

// ===== CONTROL DE VOTACIÓN =====
function openElectionControl(id) {
  const e=(AppState.elections||[]).find(x=>x.id===id); if(!e) return;
  const m=document.createElement('div');m.className='modal-overlay';m.id='election-control-modal';
  m.innerHTML=`<div class="modal-box">
    <div class="modal-header">
      <h3 class="modal-title">⚡ Controlar: ${sanitize(e.nombre)}</h3>
      <button class="modal-close" onclick="el('election-control-modal').remove()">✕</button></div>
    <div class="modal-body">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;flex-wrap:wrap">
        <span>Estado actual:</span>${statusBadge(e.estado)}
        <span style="margin-left:auto">Resultados: <strong>${e.mostrarResultados?'Visibles':'Ocultos'}</strong></span>
      </div>
      <div class="form-group"><label class="form-label">🔑 Clave de Control *</label>
        <input type="password" id="ctrl-clave" class="form-input" placeholder="Clave de esta votación"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
        <button class="btn btn-success" onclick="doElectionControl('${id}','active')" ${e.estado==='active'?'disabled':''}>▶️ Iniciar</button>
        <button class="btn btn-warning" onclick="doElectionControl('${id}','paused')" ${e.estado!=='active'?'disabled':''}>⏸ Pausar</button>
        <button class="btn btn-danger" onclick="doElectionControl('${id}','ended')" ${e.estado==='ended'?'disabled':''}>⏹ Finalizar</button>
        <button class="btn btn-outline" onclick="doElectionControl('${id}','inactive')">🔄 Reiniciar</button>
      </div>
      <div style="border-top:1px solid var(--border);padding-top:14px">
        <button class="btn btn-${e.mostrarResultados?'warning':'success'} btn-sm" onclick="doToggleResults('${id}',${!e.mostrarResultados})">
          ${e.mostrarResultados?'🙈 Ocultar Resultados':'👁️ Mostrar Resultados'}
        </button>
      </div>
      <div style="border-top:1px solid var(--border);padding-top:14px;margin-top:14px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div><label class="form-label">Inicio programado</label>
            <input type="datetime-local" id="ctrl-start" class="form-input" value="${e.inicioProgramado?String(e.inicioProgramado).slice(0,16):''}"></div>
          <div><label class="form-label">Fin programado</label>
            <input type="datetime-local" id="ctrl-end" class="form-input" value="${e.finProgramado?String(e.finProgramado).slice(0,16):''}"></div>
        </div>
        <button class="btn btn-primary btn-sm" style="margin-top:10px" onclick="doElectionControl('${id}','scheduled')">📅 Programar</button>
      </div>
      <div id="ctrl-error" class="alert alert-error" style="display:none;margin-top:12px"></div>
    </div></div>`;
  document.body.appendChild(m);
  m.onclick=ev=>{if(ev.target===m)m.remove();};
}

async function doElectionControl(id,estado) {
  const clave=el('ctrl-clave')?.value, start=el('ctrl-start')?.value, end=el('ctrl-end')?.value, errEl=el('ctrl-error');
  if(!clave){errEl.textContent='Ingresa la clave de control';errEl.style.display='flex';return;}
  showLoading('Actualizando...');
  try{
    const res=await API.setElectionStatus({id,estado,claveControl:clave,inicioProgramado:start||'',finProgramado:end||'',usuario:'ADMIN'});
    if(res.ok){
      const fresh=await API.getElections(); if(fresh.ok) AppState.elections=fresh.data;
      el('election-control-modal')?.remove(); renderElectionsMgmt(); showToast('Estado actualizado: '+estado,'success');
    } else{errEl.textContent=res.error||'Error';errEl.style.display='flex';}
  }catch(err){errEl.textContent='Error: '+err.message;errEl.style.display='flex';}
  finally{hideLoading();}
}

async function doToggleResults(id,mostrar) {
  const clave=el('ctrl-clave')?.value, errEl=el('ctrl-error');
  if(!clave){errEl.textContent='Ingresa la clave de control';errEl.style.display='flex';return;}
  showLoading('Actualizando...');
  try{
    const res=await API.toggleResultsVisibility(id,clave,mostrar);
    if(res.ok){
      const fresh=await API.getElections(); if(fresh.ok) AppState.elections=fresh.data;
      el('election-control-modal')?.remove(); renderElectionsMgmt(); showToast(mostrar?'Resultados visibles':'Resultados ocultos','success');
    } else{errEl.textContent=res.error||'Error';errEl.style.display='flex';}
  }catch(err){errEl.textContent='Error: '+err.message;errEl.style.display='flex';}
  finally{hideLoading();}
}

// ===== CONFIGURAR VOTACIÓN (CARGOS + CANDIDATOS) =====
async function openElectionConfig(id) {
  const e=(AppState.elections||[]).find(x=>x.id===id); if(!e) return;
  AppState.currentElection=e;
  showLoading('Cargando configuración...');
  try{
    const [posRes,candRes]=await Promise.all([API.getPositions(id),API.getCandidates(id)]);
    AppState.positions=posRes.ok?posRes.data:[];
    AppState.candidates=candRes.ok?candRes.data:[];
  }finally{hideLoading();}
  const m=document.createElement('div');m.className='modal-overlay';m.id='elec-config-modal';
  m.style.alignItems='flex-start';m.style.paddingTop='20px';
  m.innerHTML=`<div class="modal-box" style="max-width:700px;max-height:90vh">
    <div class="modal-header">
      <h3 class="modal-title">⚙️ Configurar: ${sanitize(e.nombre)}</h3>
      <button class="modal-close" onclick="el('elec-config-modal').remove()">✕</button></div>
    <div class="modal-body" style="overflow-y:auto;max-height:75vh">
      <div class="tabs">
        <button class="tab-btn active" onclick="switchElecConfigTab('positions',this)">🏆 Cargos</button>
        <button class="tab-btn" onclick="switchElecConfigTab('candidates',this)">👤 Candidatos</button>
      </div>
      <div id="elec-tab-positions"></div>
      <div id="elec-tab-candidates" style="display:none"></div>
    </div></div>`;
  document.body.appendChild(m);
  m.onclick=ev=>{if(ev.target===m)m.remove();};
  renderPositionsTab();
}

function switchElecConfigTab(tab,btn) {
  qsAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  el('elec-tab-positions').style.display=tab==='positions'?'':'none';
  el('elec-tab-candidates').style.display=tab==='candidates'?'':'none';
  if(tab==='candidates') renderCandidatesTab();
}

function renderPositionsTab() {
  const cont=el('elec-tab-positions'); if(!cont) return;
  const positions=AppState.positions||[];
  cont.innerHTML=`<div style="display:flex;justify-content:flex-end;margin-bottom:12px">
    <button class="btn btn-primary btn-sm" onclick="openPositionModal()">+ Agregar Cargo</button></div>
    <div class="table-wrap"><table>
      <thead><tr><th>Orden</th><th>Nombre del Cargo</th><th>Acciones</th></tr></thead>
      <tbody>${positions.length===0?'<tr><td colspan="3" style="text-align:center;padding:24px;color:var(--text-light)">No hay cargos creados</td></tr>':
        positions.map(p=>`<tr>
          <td>${p.orden}</td>
          <td><strong>${sanitize(p.nombre)}</strong></td>
          <td><div style="display:flex;gap:6px">
            <button class="btn btn-ghost btn-sm" onclick="openPositionModal('${p.id}')">✏️</button>
            <button class="btn btn-danger btn-sm" onclick="deletePosition('${p.id}')">🗑️</button>
          </div></td></tr>`).join('')}
      </tbody></table></div>`;
}

function openPositionModal(id=null) {
  const p=id?(AppState.positions||[]).find(x=>x.id===id):null;
  const m=document.createElement('div');m.className='modal-overlay';m.id='position-modal';m.style.zIndex='1100';
  m.innerHTML=`<div class="modal-box" style="max-width:400px">
    <div class="modal-header"><h3 class="modal-title">${id?'✏️ Editar':'➕ Nuevo'} Cargo</h3>
      <button class="modal-close" onclick="el('position-modal').remove()">✕</button></div>
    <div class="modal-body">
      <div class="form-group"><label class="form-label">Nombre del Cargo *</label>
        <input type="text" id="pos-nombre" class="form-input" value="${p?sanitize(p.nombre):''}" placeholder="Ej: Presidente, Secretario..."></div>
      <div class="form-group"><label class="form-label">Orden</label>
        <input type="number" id="pos-orden" class="form-input" value="${p?p.orden:(AppState.positions||[]).length+1}" min="1"></div>
      <div id="pos-error" class="alert alert-error" style="display:none"></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="el('position-modal').remove()">Cancelar</button>
      <button class="btn btn-primary" onclick="savePosition('${id||''}')">💾 Guardar</button>
    </div></div>`;
  document.body.appendChild(m);
  m.onclick=ev=>{if(ev.target===m)m.remove();};
}

async function savePosition(id='') {
  const nombre=el('pos-nombre').value.trim(), orden=parseInt(el('pos-orden').value)||1, errEl=el('pos-error');
  if(!nombre){errEl.textContent='El nombre es obligatorio';errEl.style.display='flex';return;}
  showLoading('Guardando...');
  try{
    const res=await API.savePosition({id:id||null,eleccionId:AppState.currentElection.id,nombre,orden});
    if(res.ok){
      const fresh=await API.getPositions(AppState.currentElection.id); if(fresh.ok) AppState.positions=fresh.data;
      el('position-modal')?.remove(); renderPositionsTab(); showToast('Cargo guardado','success');
    } else{errEl.textContent=res.error||'Error';errEl.style.display='flex';}
  }catch(err){errEl.textContent='Error: '+err.message;errEl.style.display='flex';}
  finally{hideLoading();}
}

async function deletePosition(id) {
  showConfirmModal('Eliminar Cargo','¿Eliminar este cargo?',async()=>{
    showLoading('Eliminando...');
    try{
      await API.deletePosition(id);
      const fresh=await API.getPositions(AppState.currentElection.id); if(fresh.ok) AppState.positions=fresh.data;
      renderPositionsTab(); showToast('Cargo eliminado','success');
    }catch(err){showToast('Error: '+err.message,'error');}
    finally{hideLoading();}
  },true);
}

function renderCandidatesTab() {
  const cont=el('elec-tab-candidates'); if(!cont) return;
  const candidates=AppState.candidates||[];
  const positions=AppState.positions||[];
  cont.innerHTML=`<div style="display:flex;justify-content:flex-end;margin-bottom:12px">
    <button class="btn btn-primary btn-sm" onclick="openCandidateModal()">+ Agregar Candidato</button></div>
    ${positions.length===0?'<div class="alert alert-warning">Primero crea los cargos en la pestaña Cargos</div>':''}
    <div class="table-wrap"><table>
      <thead><tr><th>Foto</th><th>Nombre</th><th>Cargo</th><th>Sección</th><th>Acciones</th></tr></thead>
      <tbody>${candidates.length===0?'<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--text-light)">No hay candidatos</td></tr>':
        candidates.map(c=>`<tr>
          <td>${c.fotoUrl?`<img src="${sanitize(c.fotoUrl)}" style="width:36px;height:36px;border-radius:50%;object-fit:cover" onerror="this.style.display='none'">`:'👤'}</td>
          <td><strong>${sanitize(c.nombre)}</strong></td>
          <td><span class="badge badge-online">${sanitize(c.posicionNombre)}</span></td>
          <td>${sanitize(c.seccion||'—')}</td>
          <td><div style="display:flex;gap:6px">
            <button class="btn btn-ghost btn-sm" onclick="openCandidateModal('${c.id}')">✏️</button>
            <button class="btn btn-danger btn-sm" onclick="deleteCandidateAdmin('${c.id}')">🗑️</button>
          </div></td></tr>`).join('')}
      </tbody></table></div>`;
}

function openCandidateModal(id=null) {
  const c=id?(AppState.candidates||[]).find(x=>x.id===id):null;
  const posOpts=(AppState.positions||[]).map(p=>`<option value="${p.id}" data-nombre="${sanitize(p.nombre)}" ${c&&c.posicionId===p.id?'selected':''}>${sanitize(p.nombre)}</option>`).join('');
  const secOpts=(AppState.sections||[]).map(s=>`<option value="${sanitize(s.nombre)}" ${c&&c.seccion===s.nombre?'selected':''}>${sanitize(s.nombre)}</option>`).join('');
  const m=document.createElement('div');m.className='modal-overlay';m.id='candidate-modal';m.style.zIndex='1100';
  m.innerHTML=`<div class="modal-box">
    <div class="modal-header"><h3 class="modal-title">${id?'✏️ Editar':'➕ Nuevo'} Candidato</h3>
      <button class="modal-close" onclick="el('candidate-modal').remove()">✕</button></div>
    <div class="modal-body">
      <div class="form-group"><label class="form-label">Cargo *</label>
        <select id="cand-pos" class="form-input form-select"><option value="">Seleccionar...</option>${posOpts}</select></div>
      <div class="form-group"><label class="form-label">Nombre Completo *</label>
        <input type="text" id="cand-nombre" class="form-input" value="${c?sanitize(c.nombre):''}" placeholder="Nombre del candidato"></div>
      <div class="form-group"><label class="form-label">Sección</label>
        <select id="cand-seccion" class="form-input form-select"><option value="">Sin sección...</option>${secOpts}</select></div>
      <div class="form-group"><label class="form-label">URL de foto</label>
        <input type="url" id="cand-foto" class="form-input" value="${c?sanitize(c.fotoUrl||''):''}" placeholder="https://..."></div>
      <div id="cand-error" class="alert alert-error" style="display:none"></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="el('candidate-modal').remove()">Cancelar</button>
      <button class="btn btn-primary" onclick="saveCandidateAdmin('${id||''}')">💾 Guardar</button>
    </div></div>`;
  document.body.appendChild(m);
  m.onclick=ev=>{if(ev.target===m)m.remove();};
}

async function saveCandidateAdmin(id='') {
  const posEl=el('cand-pos'), posId=posEl.value, posNombre=posEl.options[posEl.selectedIndex]?.dataset?.nombre||'';
  const nombre=el('cand-nombre').value.trim(), seccion=el('cand-seccion').value, fotoUrl=el('cand-foto').value.trim(), errEl=el('cand-error');
  if(!posId||!nombre){errEl.textContent='Cargo y nombre son obligatorios';errEl.style.display='flex';return;}
  showLoading('Guardando...');
  try{
    const res=await API.saveCandidate({id:id||null,eleccionId:AppState.currentElection.id,posicionId:posId,posicionNombre:posNombre,nombre,seccion,fotoUrl});
    if(res.ok){
      const fresh=await API.getCandidates(AppState.currentElection.id); if(fresh.ok) AppState.candidates=fresh.data;
      el('candidate-modal')?.remove(); renderCandidatesTab(); showToast('Candidato guardado','success');
    } else{errEl.textContent=res.error||'Error';errEl.style.display='flex';}
  }catch(err){errEl.textContent='Error: '+err.message;errEl.style.display='flex';}
  finally{hideLoading();}
}

async function deleteCandidateAdmin(id) {
  showConfirmModal('Eliminar Candidato','¿Eliminar este candidato?',async()=>{
    showLoading('Eliminando...');
    try{
      await API.deleteCandidate(id);
      AppState.candidates=(AppState.candidates||[]).filter(c=>c.id!==id);
      renderCandidatesTab(); showToast('Candidato eliminado','success');
    }catch(err){showToast('Error: '+err.message,'error');}
    finally{hideLoading();}
  },true);
}

// ===== PADRÓN DE VOTANTES =====
function renderVotersMgmt() {
  const cont=el('admin-section-voters'); if(!cont) return;
  const elections=AppState.elections||[];
  const elecOpts=elections.map(e=>`<option value="${e.id}" ${AppState.votersElectionId===e.id?'selected':''}>${sanitize(e.nombre)}</option>`).join('');
  const sections=AppState.sections||[];
  const secFilterOpts=sections.map(s=>`<option value="${s.id}">${sanitize(s.nombre)}</option>`).join('');
  const voters=AppState.voters||[];
  cont.innerHTML=`
    <div class="section-title">👥 Padrón de Votantes</div>
    <p style="color:var(--text-secondary);font-size:.85rem;margin-bottom:16px">Registra a los alumnos, trabajadores o civiles habilitados para votar. Cada uno se asigna a una sección.</p>
    <div class="card" style="margin-bottom:20px;padding:16px 20px">
      <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
        <div style="font-weight:600;font-size:.88rem;color:var(--primary-dark)">🗳️ Votación del padrón:</div>
        <select id="voters-election-select" class="form-input form-select" style="max-width:300px" onchange="AppState.votersElectionId=this.value">
          <option value="">— Selecciona una votación —</option>${elecOpts}
        </select>
        <div style="margin-left:auto;display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-ghost btn-sm" onclick="downloadVotersTemplate()">📋 Plantilla CSV</button>
          <button class="btn btn-ghost btn-sm" onclick="openImportVotersModal()">📥 Importar CSV</button>
          <button class="btn btn-primary btn-sm" onclick="openVoterModal()">+ Agregar Votante</button>
        </div>
      </div>
    </div>
    <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap">
      <select id="voter-filter-sec" class="form-input form-select" style="max-width:220px" onchange="filterVoters()">
        <option value="">Todas las secciones</option>${secFilterOpts}
      </select>
      <input type="text" id="voter-search" class="form-input" style="max-width:240px" placeholder="🔍 Buscar por NIE/DUI o nombre..." oninput="filterVoters()">
      <span style="align-self:center;font-size:.85rem;color:var(--text-secondary)">Total: <strong>${voters.length}</strong> votantes</span>
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>Identificador</th><th>Apellidos</th><th>Nombres</th><th>Sección</th><th>Estado</th><th>Acciones</th></tr></thead>
      <tbody id="voters-tbody">${renderVotersRows(voters)}</tbody>
    </table></div>`;
}

function downloadVotersTemplate() {
  const csv='Identificador,Apellidos,Nombres\n12345678,García López,Juan Carlos\n87654321,Martínez Pérez,María Elena';
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download='plantilla_votantes.csv';a.click();
  URL.revokeObjectURL(url);
  showToast('Plantilla descargada','success');
}

function renderVotersRows(voters) {
  if(!voters||voters.length===0) return '<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--text-light)">No hay votantes registrados</td></tr>';
  return voters.map(v=>{
    const sec=(AppState.sections||[]).find(s=>s.id===v.seccionId);
    const secName=sec?sec.nombre:(v.seccionNombre||'—');
    return `<tr>
      <td><code style="background:var(--bg-soft);padding:2px 6px;border-radius:4px;font-size:.82rem">${sanitize(v.identificador)}</code></td>
      <td>${sanitize(v.apellidos)}</td>
      <td>${sanitize(v.nombres)}</td>
      <td><span style="font-size:.82rem;font-weight:600;color:var(--primary-dark)">${sanitize(secName)}</span></td>
      <td><span class="badge ${v.activo?'badge-active':'badge-inactive'}">${v.activo?'● Activo':'● Inactivo'}</span></td>
      <td><div style="display:flex;gap:6px">
        <button class="btn btn-ghost btn-sm" onclick="openVoterModal('${v.id}')">✏️</button>
        <button class="btn btn-danger btn-sm" onclick="deleteVoter('${v.id}')">🗑️</button>
      </div></td></tr>`;
  }).join('');
}

function filterVoters() {
  const secFilter=el('voter-filter-sec')?.value||'';
  const search=(el('voter-search')?.value||'').toLowerCase();
  const filtered=(AppState.voters||[]).filter(v=>{
    const matchSec=!secFilter||v.seccionId===secFilter;
    const matchSearch=!search||(v.identificador||'').toLowerCase().includes(search)||(v.apellidos||'').toLowerCase().includes(search)||(v.nombres||'').toLowerCase().includes(search);
    return matchSec&&matchSearch;
  });
  const tbody=el('voters-tbody');
  if(tbody) tbody.innerHTML=renderVotersRows(filtered);
}

function openVoterModal(id=null) {
  const v=id?(AppState.voters||[]).find(x=>x.id===id):null;
  const secOpts=(AppState.sections||[]).map(s=>`<option value="${s.id}" data-nombre="${sanitize(s.nombre)}" ${v&&v.seccionId===s.id?'selected':''}>${sanitize(s.nombre)}</option>`).join('');
  const idLabel=(AppState.currentElection?.tipoId)||'NIE/DUI';
  const m=document.createElement('div');m.className='modal-overlay';m.id='voter-modal';
  m.innerHTML=`<div class="modal-box">
    <div class="modal-header"><h3 class="modal-title">${id?'✏️ Editar':'➕ Nuevo'} Votante</h3>
      <button class="modal-close" onclick="el('voter-modal').remove()">✕</button></div>
    <div class="modal-body">
      <div class="form-group"><label class="form-label">${idLabel} *</label>
        <input type="text" id="voter-id" class="form-input" value="${v?sanitize(v.identificador):''}" placeholder="${idLabel} del votante" maxlength="12" oninput="this.value=this.value.replace(/[^0-9]/g,'')"></div>
      <div class="form-group"><label class="form-label">Apellidos *</label>
        <input type="text" id="voter-apellidos" class="form-input" value="${v?sanitize(v.apellidos):''}" placeholder="Apellidos completos"></div>
      <div class="form-group"><label class="form-label">Nombres *</label>
        <input type="text" id="voter-nombres" class="form-input" value="${v?sanitize(v.nombres):''}" placeholder="Nombres completos"></div>
      <div class="form-group"><label class="form-label">Sección *</label>
        <select id="voter-seccion" class="form-input form-select"><option value="">Seleccionar sección...</option>${secOpts}</select></div>
      <div id="voter-error" class="alert alert-error" style="display:none"></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="el('voter-modal').remove()">Cancelar</button>
      <button class="btn btn-primary" onclick="saveVoter('${id||''}')">💾 Guardar</button>
    </div></div>`;
  document.body.appendChild(m);
  m.onclick=ev=>{if(ev.target===m)m.remove();};
}

async function saveVoter(id='') {
  const identificador=el('voter-id').value.trim(), apellidos=el('voter-apellidos').value.trim(), nombres=el('voter-nombres').value.trim();
  const secEl=el('voter-seccion'), seccionId=secEl.value, seccionNombre=secEl.options[secEl.selectedIndex]?.dataset?.nombre||'';
  const errEl=el('voter-error');
  if(!identificador||!apellidos||!nombres||!seccionId){errEl.textContent='Todos los campos son obligatorios';errEl.style.display='flex';return;}
  if(identificador.length<6||identificador.length>12){errEl.textContent='El identificador debe tener entre 6 y 12 dígitos';errEl.style.display='flex';return;}
  showLoading('Guardando...');
  try{
    const res=await API.saveVoter({id:id||null,identificador,apellidos,nombres,seccionId,seccionNombre});
    if(res.ok){
      const fresh=await API.getVoters({}); if(fresh.ok) AppState.voters=fresh.data;
      el('voter-modal')?.remove(); renderVotersMgmt(); showToast('Votante guardado','success');
    } else{errEl.textContent=res.error||'Error';errEl.style.display='flex';}
  }catch(err){errEl.textContent='Error: '+err.message;errEl.style.display='flex';}
  finally{hideLoading();}
}

async function deleteVoter(id) {
  showConfirmModal('Eliminar Votante','¿Eliminar este votante del padrón?',async()=>{
    showLoading('Eliminando...');
    try{
      const res=await API.deleteVoter(id);
      if(res.ok){AppState.voters=(AppState.voters||[]).filter(v=>v.id!==id);renderVotersMgmt();showToast('Votante eliminado','success');}
      else showToast(res.error||'Error','error');
    }catch(err){showToast('Error: '+err.message,'error');}
    finally{hideLoading();}
  },true);
}

// ===== IMPORTAR VOTANTES =====
function openImportVotersModal() {
  const secOpts=(AppState.sections||[]).map(s=>`<option value="${s.id}" data-nombre="${sanitize(s.nombre)}">${sanitize(s.nombre)}</option>`).join('');
  const m=document.createElement('div');m.className='modal-overlay';m.id='import-modal';
  m.innerHTML=`<div class="modal-box">
    <div class="modal-header"><h3 class="modal-title">📥 Importar Votantes desde CSV</h3>
      <button class="modal-close" onclick="el('import-modal').remove()">✕</button></div>
    <div class="modal-body">
      <div class="alert alert-info" style="margin-bottom:14px">
        CSV con 3 columnas: <strong>Identificador, Apellidos, Nombres</strong>
        <button class="btn btn-ghost btn-sm" style="margin-left:8px" onclick="downloadVotersTemplate()">📋 Plantilla</button>
      </div>
      <div class="form-group"><label class="form-label">¿A qué sección pertenecen? *</label>
        <select id="import-seccion" class="form-input form-select">
          <option value="">— Selecciona la sección —</option>${secOpts}
        </select></div>
      <div class="form-group"><label class="form-label">Archivo CSV</label>
        <input type="file" id="import-file" class="form-input" accept=".csv" onchange="previewImport(this)"></div>
      <div id="import-preview" style="margin-top:12px"></div>
      <div id="import-error" class="alert alert-error" style="display:none"></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="el('import-modal').remove()">Cancelar</button>
      <button class="btn btn-primary" id="import-btn" onclick="doImportVoters()" disabled>📥 Importar</button>
    </div></div>`;
  document.body.appendChild(m);
  m.onclick=ev=>{if(ev.target===m)m.remove();};
}

let importPreviewData=[];
function previewImport(input) {
  const file=input.files[0]; if(!file) return;
  const reader=new FileReader();
  reader.onload=function(e){
    const text=e.target.result;
    const lines=text.split('\n').filter(l=>l.trim());
    importPreviewData=[];
    const errors=[];
    const startLine=lines[0]&&(lines[0].toLowerCase().includes('identificador')||lines[0].toLowerCase().includes('nie')||lines[0].toLowerCase().includes('dui'))?1:0;
    lines.slice(startLine).forEach((line,i)=>{
      const parts=line.split(',').map(p=>p.replace(/"/g,'').trim());
      if(parts.length<2) return;
      const [ident,apell,nomb]=parts;
      if(!ident||ident.length<6||ident.length>12){errors.push('Fila '+(i+startLine+1)+': inválido ('+ident+')');return;}
      importPreviewData.push({identificador:ident,apellidos:apell||'',nombres:nomb||''});
    });
    const prev=el('import-preview');
    prev.innerHTML=`<div class="alert alert-${errors.length?'warning':'success'}">
      <strong>${importPreviewData.length}</strong> registros listos${errors.length?` · <span style="color:var(--error)">${errors.length} con errores</span>`:''}
      ${errors.length?'<br><small style="color:var(--error)">'+errors.slice(0,3).join(' | ')+'</small>':''}
    </div>
    <div style="max-height:150px;overflow-y:auto;margin-top:8px;border:1px solid var(--border);border-radius:8px">
      <table style="width:100%;font-size:.78rem">
        <thead><tr><th style="padding:5px 8px;background:var(--bg-soft)">Identificador</th><th style="padding:5px 8px;background:var(--bg-soft)">Apellidos</th><th style="padding:5px 8px;background:var(--bg-soft)">Nombres</th></tr></thead>
        <tbody>${importPreviewData.slice(0,8).map(v=>`<tr><td style="padding:4px 8px">${sanitize(v.identificador)}</td><td style="padding:4px 8px">${sanitize(v.apellidos)}</td><td style="padding:4px 8px">${sanitize(v.nombres)}</td></tr>`).join('')}
        ${importPreviewData.length>8?`<tr><td colspan="3" style="text-align:center;padding:5px;color:var(--text-light)">...y ${importPreviewData.length-8} más</td></tr>`:''}
        </tbody></table>
    </div>`;
    el('import-btn').disabled=importPreviewData.length===0;
  };
  reader.readAsText(file);
}

async function doImportVoters() {
  if(!importPreviewData.length) return;
  const secEl=el('import-seccion');
  const seccionId=secEl?.value, seccionNombre=secEl?.options[secEl.selectedIndex]?.dataset?.nombre||'';
  if(!seccionId){showToast('Selecciona una sección primero','warning');return;}
  const withSection=importPreviewData.map(v=>({...v,seccionId,seccionNombre}));
  showLoading('Importando votantes...');
  try{
    const res=await API.importVoters(withSection);
    if(res.ok){
      const fresh=await API.getVoters({}); if(fresh.ok) AppState.voters=fresh.data;
      el('import-modal')?.remove(); renderVotersMgmt();
      showToast(`✅ Importados: ${res.imported} · Omitidos: ${res.skipped}`,'success');
    } else showToast(res.error||'Error al importar','error');
  }catch(err){showToast('Error: '+err.message,'error');}
  finally{hideLoading();}
}

// ===== EXPORTAR =====
function openExportModal(electionId) {
  const e=(AppState.elections||[]).find(x=>x.id===electionId); if(!e) return;
  const m=document.createElement('div');m.className='modal-overlay';m.id='export-modal';
  m.innerHTML=`<div class="modal-box" style="max-width:420px">
    <div class="modal-header"><h3 class="modal-title">📄 Exportar: ${sanitize(e.nombre)}</h3>
      <button class="modal-close" onclick="el('export-modal').remove()">✕</button></div>
    <div class="modal-body">
      <p style="color:var(--text-secondary);margin-bottom:20px">¿Qué deseas exportar?</p>
      <div style="display:flex;flex-direction:column;gap:12px">
        <button class="btn btn-primary" onclick="exportVotersPDF('${electionId}')">👥 Lista de Votantes (quién votó / no)</button>
        <button class="btn btn-success" onclick="exportResultsPDF('${electionId}')">📊 Resultados Completos</button>
      </div>
    </div></div>`;
  document.body.appendChild(m);
  m.onclick=ev=>{if(ev.target===m)m.remove();};
}

async function exportVotersPDF(electionId) {
  el('export-modal')?.remove();
  showLoading('Generando reporte...');
  try{
    const [resultsRes,votersRes]=await Promise.all([API.getResults(electionId),API.getVoters({})]);
    if(!resultsRes.ok){showToast('Error','error');return;}
    const data=resultsRes.data, allVoters=votersRes.data||(AppState.voters||[]), election=data.election;
    const votedIDSet=new Set((data.votedIDs||[]).map(id=>String(id).toUpperCase()));
    const voted=allVoters.filter(v=>votedIDSet.has(String(v.identificador).toUpperCase()));
    const notVoted=allVoters.filter(v=>!votedIDSet.has(String(v.identificador).toUpperCase()));
    const html=`<h1>📋 Lista de Participación</h1>
      <p><strong>Votación:</strong> ${sanitize(election.nombre)}</p>
      <p><strong>Generado:</strong> ${new Date().toLocaleString('es-SV',{timeZone:'America/El_Salvador',hour12:false})}</p>
      <div style="margin:16px 0">
        <div class="stat-box"><div class="stat-val">${allVoters.length}</div><div class="stat-lbl">Registrados</div></div>
        <div class="stat-box"><div class="stat-val">${voted.length}</div><div class="stat-lbl">Votaron</div></div>
        <div class="stat-box"><div class="stat-val">${notVoted.length}</div><div class="stat-lbl">No votaron</div></div>
      </div>
      <h2>✅ SÍ votaron (${voted.length})</h2>
      <table><thead><tr><th>Identificador</th><th>Apellidos</th><th>Nombres</th><th>Sección</th></tr></thead>
      <tbody>${voted.map(v=>`<tr><td>${sanitize(v.identificador)}</td><td>${sanitize(v.apellidos)}</td><td>${sanitize(v.nombres)}</td><td>${sanitize(v.seccionNombre||'')}</td></tr>`).join('')||'<tr><td colspan="4" style="text-align:center">—</td></tr>'}
      </tbody></table>
      <h2 style="margin-top:20px">❌ NO votaron (${notVoted.length})</h2>
      <table><thead><tr><th>Identificador</th><th>Apellidos</th><th>Nombres</th><th>Sección</th></tr></thead>
      <tbody>${notVoted.map(v=>`<tr><td>${sanitize(v.identificador)}</td><td>${sanitize(v.apellidos)}</td><td>${sanitize(v.nombres)}</td><td>${sanitize(v.seccionNombre||'')}</td></tr>`).join('')||'<tr><td colspan="4" style="text-align:center">—</td></tr>'}
      </tbody></table>`;
    await exportToPDF('Participación - '+election.nombre,html);
  }catch(err){showToast('Error: '+err.message,'error');}
  finally{hideLoading();}
}

async function exportResultsPDF(electionId) {
  el('export-modal')?.remove();
  showLoading('Generando resultados...');
  try{
    const res=await API.getResults(electionId);
    if(!res.ok){showToast('Error','error');return;}
    const data=res.data, election=data.election, positions=data.positions||[], byPos=data.byPosition||{};
    let posHtml='';
    positions.forEach(p=>{
      const posData=byPos[p.id]; if(!posData) return;
      const cands=Object.values(posData.byCandidato||{}).sort((a,b)=>b.count-a.count);
      posHtml+=`<h2>🏆 ${sanitize(p.nombre)}</h2>
        <table><thead><tr><th>#</th><th>Candidato</th><th>Votos</th><th>%</th></tr></thead><tbody>
        ${cands.map((c,i)=>`<tr><td>${i===0?'🥇':i===1?'🥈':i===2?'🥉':'#'+(i+1)}</td><td><strong>${sanitize(c.nombre)}</strong></td><td>${c.count}</td><td>${posData.total>0?((c.count/posData.total)*100).toFixed(1):0}%</td></tr>`).join('')}
        </tbody></table>`;
    });
    const html=`<h1>📊 Resultados Oficiales</h1>
      <p><strong>Votación:</strong> ${sanitize(election.nombre)}</p>
      <p><strong>Generado:</strong> ${new Date().toLocaleString('es-SV',{timeZone:'America/El_Salvador',hour12:false})}</p>
      <div style="margin:16px 0">
        <div class="stat-box"><div class="stat-val">${data.totalVotes}</div><div class="stat-lbl">Votos totales</div></div>
        <div class="stat-box"><div class="stat-val">${data.uniqueVoters}</div><div class="stat-lbl">Votantes únicos</div></div>
        <div class="stat-box"><div class="stat-val">${data.totalRegistered}</div><div class="stat-lbl">Registrados</div></div>
        <div class="stat-box"><div class="stat-val">${data.activeUrnas}</div><div class="stat-lbl">Urnas activas</div></div>
      </div>
      ${posHtml}
      <h2>🗳️ Por Urna</h2>
      <table><thead><tr><th>Urna</th><th>Votos</th><th>%</th></tr></thead><tbody>
      ${Object.values(data.byUrna||{}).sort((a,b)=>b.count-a.count).map(u=>`<tr><td>${sanitize(u.nombre)}</td><td>${u.count}</td><td>${data.totalVotes>0?((u.count/data.totalVotes)*100).toFixed(1):0}%</td></tr>`).join('')||'<tr><td colspan="3" style="text-align:center">—</td></tr>'}
      </tbody></table>`;
    await exportToPDF('Resultados - '+election.nombre,html);
  }catch(err){showToast('Error: '+err.message,'error');}
  finally{hideLoading();}
}

// ===== CANDIDATOS (acceso directo) =====
function renderCandidatesMgmt() {
  const cont=el('admin-section-candidates'); if(!cont) return;
  cont.innerHTML=`<div class="section-title">👤 Candidatos</div>
    <div class="alert alert-info">Para gestionar candidatos, ve a <strong>🗳️ Votaciones → ⚙️ Config</strong> de la votación correspondiente.</div>
    <button class="btn btn-primary" style="margin-top:16px" onclick="navigateAdminSection('elections')">Ir a Votaciones →</button>`;
}

// ===== SECCIONES =====
function renderSectionsMgmt() {
  const cont=el('admin-section-sections'); if(!cont) return;
  const sections=AppState.sections||[];
  cont.innerHTML=`
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px">
      <div class="section-title" style="margin-bottom:0">🏫 Secciones Académicas</div>
      <button class="btn btn-primary" onclick="openSectionModal()">+ Agregar Sección</button>
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>Nombre</th><th>Tipo</th><th>Votaciones asignadas</th><th>Estado</th><th>Acciones</th></tr></thead>
      <tbody>${sections.length===0?'<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--text-light)">No hay secciones</td></tr>':
        sections.map(s=>{
          const assigned=(s.eleccionIds||[]).map(eid=>{
            const e=(AppState.elections||[]).find(x=>x.id===eid);
            return e?`<span class="badge badge-online" style="margin:2px">${sanitize(e.nombre)}</span>`:'';
          }).join('');
          return `<tr>
            <td><strong>${sanitize(s.nombre)}</strong></td>
            <td style="font-size:.78rem;color:var(--text-secondary)">${sanitize(s.tipo||'—')}</td>
            <td>${assigned||'<span style="color:var(--text-light);font-size:.8rem">Sin asignar</span>'}</td>
            <td><span class="badge ${s.activo?'badge-active':'badge-inactive'}">${s.activo?'● Activa':'● Inactiva'}</span></td>
            <td><div style="display:flex;gap:6px">
              <button class="btn btn-ghost btn-sm" onclick="openSectionModal('${s.id}')">✏️</button>
              <button class="btn btn-danger btn-sm" onclick="deleteSectionAdmin('${s.id}')">🗑️</button>
            </div></td></tr>`;
        }).join('')}
      </tbody></table></div>`;
}

function openSectionModal(id=null) {
  const s=id?(AppState.sections||[]).find(x=>x.id===id):null;
  const tipos=['Primera Infancia','Básica','Tercer Ciclo','Bachillerato / Media','Educación Superior','Civiles','Trabajadores','Otro'];
  const tipoOpts=tipos.map(t=>`<option value="${t}" ${s&&s.tipo===t?'selected':''}>${t}</option>`).join('');
  const elecOpts=(AppState.elections||[]).map(e=>{
    const sel=(s?.eleccionIds||[]).includes(e.id)?'selected':'';
    return `<option value="${e.id}" ${sel}>${sanitize(e.nombre)}</option>`;
  }).join('');
  const m=document.createElement('div');m.className='modal-overlay';m.id='section-modal';
  m.innerHTML=`<div class="modal-box" style="max-width:480px">
    <div class="modal-header"><h3 class="modal-title">${id?'✏️ Editar':'➕ Nueva'} Sección</h3>
      <button class="modal-close" onclick="el('section-modal').remove()">✕</button></div>
    <div class="modal-body">
      <div class="form-group"><label class="form-label">Nombre de la Sección *</label>
        <input type="text" id="sec-nombre" class="form-input" value="${s?sanitize(s.nombre):''}" placeholder="Ej: 9° Grado Sección A"></div>
      <div class="form-group"><label class="form-label">Tipo de Sección</label>
        <select id="sec-tipo" class="form-input form-select"><option value="">Seleccionar...</option>${tipoOpts}</select></div>
      <div class="form-group">
        <label class="form-label">¿A qué votación(es) pertenece?</label>
        <select id="sec-elecciones" class="form-input" multiple style="height:100px">${elecOpts}</select>
        <div style="font-size:.75rem;color:var(--text-light);margin-top:4px">Ctrl+clic para elegir varias</div>
      </div>
      <div id="sec-error" class="alert alert-error" style="display:none"></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="el('section-modal').remove()">Cancelar</button>
      <button class="btn btn-primary" onclick="saveSectionAdmin('${id||''}')">💾 Guardar</button>
    </div></div>`;
  document.body.appendChild(m);
  m.onclick=ev=>{if(ev.target===m)m.remove();};
}

async function saveSectionAdmin(id='') {
  const nombre=el('sec-nombre').value.trim(), tipo=el('sec-tipo').value, errEl=el('sec-error');
  const eleccionIds=[...el('sec-elecciones').selectedOptions].map(o=>o.value);
  if(!nombre){errEl.textContent='El nombre es obligatorio';errEl.style.display='flex';return;}
  showLoading('Guardando...');
  try{
    const res=await API.saveSection({id:id||null,nombre,tipo,eleccionIds});
    if(res.ok){
      const fresh=await API.getSections(); if(fresh.ok) AppState.sections=fresh.data;
      el('section-modal')?.remove(); renderSectionsMgmt(); showToast('Sección guardada','success');
    } else{errEl.textContent=res.error||'Error';errEl.style.display='flex';}
  }catch(err){errEl.textContent='Error: '+err.message;errEl.style.display='flex';}
  finally{hideLoading();}
}

async function deleteSectionAdmin(id) {
  showConfirmModal('Eliminar Sección','¿Eliminar esta sección?',async()=>{
    showLoading('Eliminando...');
    try{
      const res=await API.deleteSection(id);
      if(res.ok){AppState.sections=(AppState.sections||[]).filter(s=>s.id!==id);renderSectionsMgmt();showToast('Sección eliminada','success');}
      else showToast(res.error||'Error','error');
    }catch(err){showToast('Error: '+err.message,'error');}
    finally{hideLoading();}
  },true);
}

// ===== URNAS =====
function renderUrnasMgmt() {
  const cont=el('admin-section-urnas'); if(!cont) return;
  const urnas=AppState.urnas||[];
  const sectors=[...new Set(urnas.map(u=>u.sector).filter(Boolean))];
  cont.innerHTML=`
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px">
      <div class="section-title" style="margin-bottom:0">🏛️ Urnas</div>
      <button class="btn btn-primary" onclick="openUrnaModal()">+ Agregar Urna</button>
    </div>
    ${sectors.length>0?`<div class="card" style="margin-bottom:20px">
      <div class="card-title" style="margin-bottom:12px">⚡ Control por Sector</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        ${sectors.map(s=>`<div style="display:flex;align-items:center;gap:8px;padding:8px 14px;border:1px solid var(--border);border-radius:8px">
          <span style="font-weight:600;font-size:.88rem">${sanitize(s)}</span>
          <button class="btn btn-success btn-sm" onclick="toggleSectorAdmin('${sanitize(s)}',true)">Activar todo</button>
          <button class="btn btn-danger btn-sm" onclick="toggleSectorAdmin('${sanitize(s)}',false)">Desactivar todo</button>
        </div>`).join('')}
      </div></div>`:''}
    <div class="table-wrap"><table>
      <thead><tr><th>Urna</th><th>Usuario</th><th>Ubicación</th><th>Sector</th><th>Votación</th><th>Estado</th><th>Acciones</th></tr></thead>
      <tbody>${urnas.length===0?'<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text-light)">No hay urnas registradas</td></tr>':
        urnas.map(u=>{
          const elec=(AppState.elections||[]).find(e=>e.id===u.eleccionId);
          return `<tr>
            <td><strong>${sanitize(u.nombre)}</strong></td>
            <td><code style="font-size:.8rem;background:var(--bg-soft);padding:2px 6px;border-radius:4px">${sanitize(u.username)}</code></td>
            <td>${sanitize(u.ubicacion)}</td>
            <td>${sanitize(u.sector||'—')}</td>
            <td style="font-size:.78rem">${elec?`<span class="badge badge-online">${sanitize(elec.nombre)}</span>`:'<span style="color:var(--text-light)">Sin asignar</span>'}</td>
            <td><span class="badge ${u.activo?'badge-active':'badge-inactive'}">${u.activo?'● Activa':'● Inactiva'}</span></td>
            <td><div style="display:flex;gap:6px">
              <button class="btn btn-ghost btn-sm" onclick="openUrnaModal('${u.id}')">✏️</button>
              <button class="btn ${u.activo?'btn-warning':'btn-success'} btn-sm" onclick="toggleUrnaAdmin('${u.id}',${!u.activo})">${u.activo?'⏸':'▶️'}</button>
              <button class="btn btn-danger btn-sm" onclick="deleteUrnaAdmin('${u.id}')">🗑️</button>
            </div></td></tr>`;
        }).join('')}
      </tbody></table></div>`;
}

function openUrnaModal(id=null) {
  const urnas=AppState.urnas||[];
  const elections=AppState.elections||[];
  const locations=AppState.locations||[];
  const sections=AppState.sections||[];
  const u=id?urnas.find(x=>x.id===id):null;
  const locOpts=locations.map(l=>`<option value="${sanitize(l.nombre)}" ${u&&u.ubicacion===l.nombre?'selected':''}>${sanitize(l.nombre)}</option>`).join('');
  const sectors=[...new Set(locations.map(l=>l.tipo).filter(Boolean))];
  const secOpts=sectors.map(s=>`<option value="${sanitize(s)}" ${u&&u.sector===s?'selected':''}>${sanitize(s)}</option>`).join('');
  const sectionOpts=sections.map(s=>{
    const perms=u?.seccionesPermitidas?u.seccionesPermitidas.split(','):[];
    return `<option value="${s.id}" ${perms.includes(s.id)?'selected':''}>${sanitize(s.nombre)}</option>`;
  }).join('');
  const elecOpts=elections.map(e=>`<option value="${e.id}" ${u&&u.eleccionId===e.id?'selected':''}>${sanitize(e.nombre)}</option>`).join('');
  const m=document.createElement('div');m.className='modal-overlay';m.id='urna-modal';
  m.innerHTML=`<div class="modal-box">
    <div class="modal-header"><h3 class="modal-title">${id?'✏️ Editar':'➕ Nueva'} Urna</h3>
      <button class="modal-close" onclick="el('urna-modal').remove()">✕</button></div>
    <div class="modal-body">
      <div class="form-group"><label class="form-label">¿Para qué votación es esta urna? *</label>
        <select id="urna-eleccion" class="form-input form-select">
          <option value="">— Selecciona una votación —</option>${elecOpts}
        </select></div>
      <div class="form-group"><label class="form-label">Nombre de la Urna *</label>
        <input type="text" id="urna-nombre" class="form-input" value="${u?sanitize(u.nombre):''}" placeholder="Ej: Urna 1"></div>
      <div class="form-group"><label class="form-label">Ubicación *</label>
        <select id="urna-ubicacion" class="form-input form-select"><option value="">Seleccionar...</option>${locOpts}</select></div>
      <div class="form-group"><label class="form-label">Sector</label>
        <select id="urna-sector" class="form-input form-select"><option value="">Sin sector</option>${secOpts}</select></div>
      <div class="form-group"><label class="form-label">Secciones permitidas (opcional)</label>
        <select id="urna-secciones" class="form-input" multiple style="height:80px">${sectionOpts}</select>
        <div style="font-size:.75rem;color:var(--text-light);margin-top:4px">Ctrl+clic para elegir varias. Si no seleccionas, acepta todas.</div></div>
      <hr style="border:none;border-top:1px solid var(--border);margin:14px 0">
      <div class="form-group"><label class="form-label">Usuario de acceso *</label>
        <input type="text" id="urna-username" class="form-input" value="${u?sanitize(u.username):''}" placeholder="Ej: urna1"></div>
      <div class="form-group"><label class="form-label">Contraseña ${id?'(vacío = no cambiar)':' *'}</label>
        <input type="password" id="urna-password" class="form-input" placeholder="${id?'Nueva contraseña (opcional)':'Contraseña'}"></div>
      <div id="urna-error" class="alert alert-error" style="display:none"></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="el('urna-modal').remove()">Cancelar</button>
      <button class="btn btn-primary" onclick="saveUrnaAdmin('${id||''}')">💾 Guardar</button>
    </div></div>`;
  document.body.appendChild(m);
  m.onclick=ev=>{if(ev.target===m)m.remove();};
}

async function saveUrnaAdmin(id='') {
  const eleccionId=el('urna-eleccion').value;
  const nombre=el('urna-nombre').value.trim(), ubicacion=el('urna-ubicacion').value, sector=el('urna-sector').value;
  const username=el('urna-username').value.trim(), password=el('urna-password').value;
  const seccionesPermitidas=[...el('urna-secciones').selectedOptions].map(o=>o.value).join(',');
  const errEl=el('urna-error');
  if(!eleccionId){errEl.textContent='Selecciona una votación';errEl.style.display='flex';return;}
  if(!nombre||!ubicacion||!username){errEl.textContent='Nombre, ubicación y usuario son obligatorios';errEl.style.display='flex';return;}
  if(!id&&!password){errEl.textContent='La contraseña es obligatoria';errEl.style.display='flex';return;}
  showLoading('Guardando...');
  try{
    const res=await API.saveUrna({id:id||null,nombre,ubicacion,sector,username,password:password||null,seccionesPermitidas,eleccionId});
    if(res.ok){
      const fresh=await API.getUrnas(); if(fresh.ok) AppState.urnas=fresh.data;
      el('urna-modal')?.remove(); renderUrnasMgmt(); showToast('Urna guardada','success');
    } else{errEl.textContent=res.error||'Error';errEl.style.display='flex';}
  }catch(err){errEl.textContent='Error: '+err.message;errEl.style.display='flex';}
  finally{hideLoading();}
}

async function toggleUrnaAdmin(id,activo) {
  showLoading('Actualizando...');
  try{
    const res=await API.toggleUrna(id,activo);
    if(res.ok){const fresh=await API.getUrnas();if(fresh.ok)AppState.urnas=fresh.data;renderUrnasMgmt();showToast(`Urna ${activo?'activada':'desactivada'}`,'success');}
    else showToast(res.error||'Error','error');
  }catch(err){showToast('Error: '+err.message,'error');}
  finally{hideLoading();}
}

async function deleteUrnaAdmin(id) {
  showConfirmModal('Eliminar Urna','¿Eliminar esta urna? Solo es posible si no tiene votos.',async()=>{
    showLoading('Eliminando...');
    try{
      const res=await API.deleteUrna(id);
      if(res.ok){AppState.urnas=(AppState.urnas||[]).filter(u=>u.id!==id);renderUrnasMgmt();showToast('Urna eliminada','success');}
      else showToast('No se puede eliminar: '+(res.error||''),'error');
    }catch(err){showToast('Error: '+err.message,'error');}
    finally{hideLoading();}
  },true);
}

async function toggleSectorAdmin(sector,activo) {
  showLoading('Actualizando sector...');
  try{
    const res=await API.toggleSector(sector,activo);
    if(res.ok){const fresh=await API.getUrnas();if(fresh.ok)AppState.urnas=fresh.data;renderUrnasMgmt();showToast(`Sector actualizado`,'success');}
    else showToast(res.error||'Error','error');
  }catch(err){showToast('Error: '+err.message,'error');}
  finally{hideLoading();}
}

// ===== UBICACIONES =====
function renderLocationsMgmt() {
  const cont=el('admin-section-locations'); if(!cont) return;
  const locations=AppState.locations||[];
  cont.innerHTML=`
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px">
      <div class="section-title" style="margin-bottom:0">📍 Ubicaciones</div>
      <button class="btn btn-primary" onclick="openLocationModal()">+ Agregar</button>
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>Nombre</th><th>Tipo/Sector</th><th>Votación asignada</th><th>Acciones</th></tr></thead>
      <tbody>${locations.length===0?'<tr><td colspan="4" style="text-align:center;padding:32px;color:var(--text-light)">No hay ubicaciones</td></tr>':
        locations.map(l=>{
          const elec=(AppState.elections||[]).find(e=>e.id===l.eleccionId);
          return `<tr>
            <td><strong>${sanitize(l.nombre)}</strong></td>
            <td>${sanitize(l.tipo||'—')}</td>
            <td>${elec?`<span class="badge badge-online">${sanitize(elec.nombre)}</span>`:'<span style="color:var(--text-light);font-size:.8rem">Sin asignar</span>'}</td>
            <td><div style="display:flex;gap:6px">
              <button class="btn btn-ghost btn-sm" onclick="openLocationModal('${l.id}')">✏️</button>
              <button class="btn btn-danger btn-sm" onclick="deleteLocationAdmin('${l.id}')">🗑️</button>
            </div></td></tr>`;
        }).join('')}
      </tbody></table></div>`;
}

function openLocationModal(id=null) {
  const locations=AppState.locations||[];
  const elections=AppState.elections||[];
  const l=id?locations.find(x=>x.id===id):null;
  const elecOpts=elections.map(e=>`<option value="${e.id}" ${l&&l.eleccionId===e.id?'selected':''}>${sanitize(e.nombre)}</option>`).join('');
  const m=document.createElement('div');m.className='modal-overlay';m.id='location-modal';
  m.innerHTML=`<div class="modal-box" style="max-width:440px">
    <div class="modal-header"><h3 class="modal-title">${id?'✏️ Editar':'➕ Nueva'} Ubicación</h3>
      <button class="modal-close" onclick="el('location-modal').remove()">✕</button></div>
    <div class="modal-body">
      <div class="form-group"><label class="form-label">¿Para qué votación es esta ubicación?</label>
        <select id="loc-eleccion" class="form-input form-select">
          <option value="">— Selecciona una votación —</option>${elecOpts}
        </select></div>
      <div class="form-group"><label class="form-label">Nombre *</label>
        <input type="text" id="loc-nombre" class="form-input" value="${l?sanitize(l.nombre):''}" placeholder="Ej: Edificio Básica, Aula 3..."></div>
      <div class="form-group"><label class="form-label">Tipo/Sector</label>
        <input type="text" id="loc-tipo" class="form-input" value="${l?sanitize(l.tipo||''):''}" placeholder="Ej: Básica, Media, Bachillerato..."></div>
      <div id="loc-error" class="alert alert-error" style="display:none"></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="el('location-modal').remove()">Cancelar</button>
      <button class="btn btn-primary" onclick="saveLocationAdmin('${id||''}')">💾 Guardar</button>
    </div></div>`;
  document.body.appendChild(m);
  m.onclick=ev=>{if(ev.target===m)m.remove();};
}

async function saveLocationAdmin(id='') {
  const eleccionId=el('loc-eleccion').value;
  const nombre=el('loc-nombre').value.trim(), tipo=el('loc-tipo').value.trim(), errEl=el('loc-error');
  if(!nombre){errEl.textContent='El nombre es obligatorio';errEl.style.display='flex';return;}
  showLoading('Guardando...');
  try{
    const res=await API.saveLocation({id:id||null,nombre,tipo,eleccionId});
    if(res.ok){const fresh=await API.getLocations();if(fresh.ok)AppState.locations=fresh.data;el('location-modal')?.remove();renderLocationsMgmt();showToast('Ubicación guardada','success');}
    else{errEl.textContent=res.error||'Error';errEl.style.display='flex';}
  }catch(err){errEl.textContent='Error: '+err.message;errEl.style.display='flex';}
  finally{hideLoading();}
}

async function deleteLocationAdmin(id) {
  showConfirmModal('Eliminar Ubicación','¿Eliminar esta ubicación?',async()=>{
    showLoading('Eliminando...');
    try{
      const res=await API.deleteLocation(id);
      if(res.ok){AppState.locations=(AppState.locations||[]).filter(l=>l.id!==id);renderLocationsMgmt();showToast('Ubicación eliminada','success');}
      else showToast(res.error||'Error','error');
    }catch(err){showToast('Error: '+err.message,'error');}
    finally{hideLoading();}
  },true);
}

// ===== USUARIOS =====
function renderUsersMgmt() {
  const cont=el('admin-section-users'); if(!cont) return;
  const nonUrna=(AppState.users||[]).filter(u=>u.role!=='URNA');
  cont.innerHTML=`
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px">
      <div class="section-title" style="margin-bottom:0">👤 Usuarios del Sistema</div>
      <button class="btn btn-primary" onclick="openUserModal()">+ Agregar</button>
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>Nombre</th><th>Usuario</th><th>Rol</th><th>Votaciones</th><th>Estado</th><th>Acciones</th></tr></thead>
      <tbody>${nonUrna.length===0?'<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--text-light)">No hay usuarios</td></tr>':
        nonUrna.map(u=>{
          const elecBadges=(u.eleccionIds||[]).map(eid=>{
            const e=(AppState.elections||[]).find(x=>x.id===eid);
            return e?`<span class="badge badge-online" style="margin:1px;font-size:.7rem">${sanitize(e.nombre)}</span>`:'';
          }).join('');
          return `<tr>
            <td><strong>${sanitize(u.nombre)}</strong></td>
            <td><code style="font-size:.82rem;background:var(--bg-soft);padding:2px 6px;border-radius:4px">${sanitize(u.username)}</code></td>
            <td><span style="padding:3px 10px;border-radius:999px;font-size:.74rem;font-weight:700;background:${u.role==='ADMIN'?'#E3F2FD':'#E8F5E9'};color:${u.role==='ADMIN'?'#1565C0':'#2E7D32'}">${u.role}</span></td>
            <td>${u.role==='ADMIN'?'<span style="font-size:.78rem;color:var(--text-light)">Todas</span>':(elecBadges||'<span style="font-size:.78rem;color:var(--text-light)">Sin asignar</span>')}</td>
            <td><span class="badge ${u.activo?'badge-active':'badge-inactive'}">${u.activo?'● Activo':'● Inactivo'}</span></td>
            <td><div style="display:flex;gap:6px">
              <button class="btn btn-ghost btn-sm" onclick="openUserModal('${u.id}')">✏️</button>
              <button class="btn ${u.activo?'btn-warning':'btn-success'} btn-sm" onclick="toggleUserAdmin('${u.id}',${!u.activo})">${u.activo?'⏸':'▶️'}</button>
              <button class="btn btn-danger btn-sm" onclick="deleteUserAdmin('${u.id}')">🗑️</button>
            </div></td></tr>`;
        }).join('')}
      </tbody></table></div>`;
}

function openUserModal(id=null) {
  const users=AppState.users||[];
  const elections=AppState.elections||[];
  const u=id?users.find(x=>x.id===id):null;
  const elecOpts=elections.map(e=>{
    const sel=(u?.eleccionIds||[]).includes(e.id)?'selected':'';
    return `<option value="${e.id}" ${sel}>${sanitize(e.nombre)}</option>`;
  }).join('');
  const m=document.createElement('div');m.className='modal-overlay';m.id='user-modal';
  m.innerHTML=`<div class="modal-box" style="max-width:480px">
    <div class="modal-header"><h3 class="modal-title">${id?'✏️ Editar':'➕ Nuevo'} Usuario</h3>
      <button class="modal-close" onclick="el('user-modal').remove()">✕</button></div>
    <div class="modal-body">
      <div class="form-group"><label class="form-label">Nombre *</label>
        <input type="text" id="user-nombre" class="form-input" value="${u?sanitize(u.nombre):''}" placeholder="Nombre completo"></div>
      <div class="form-group"><label class="form-label">Usuario *</label>
        <input type="text" id="user-username" class="form-input" value="${u?sanitize(u.username):''}" placeholder="username"></div>
      <div class="form-group"><label class="form-label">Rol *</label>
        <select id="user-role" class="form-input form-select" onchange="toggleUserElections(this.value)">
          <option value="ADMIN" ${!u||u.role==='ADMIN'?'selected':''}>ADMIN - Acceso total</option>
          <option value="RESULTADOS" ${u&&u.role==='RESULTADOS'?'selected':''}>RESULTADOS - Solo ver resultados</option>
        </select></div>
      <div id="user-elections-group" class="form-group" style="${u&&u.role==='RESULTADOS'?'':'display:none'}">
        <label class="form-label">¿Qué votaciones puede ver?</label>
        <select id="user-elecciones" class="form-input" multiple style="height:90px">${elecOpts}</select>
        <div style="font-size:.75rem;color:var(--text-light);margin-top:4px">Ctrl+clic para elegir varias</div>
      </div>
      <div class="form-group"><label class="form-label">Contraseña ${id?'(vacío = no cambiar)':' *'}</label>
        <input type="password" id="user-password" class="form-input" placeholder="${id?'Nueva contraseña':'Contraseña'}"></div>
      <div id="user-error" class="alert alert-error" style="display:none"></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="el('user-modal').remove()">Cancelar</button>
      <button class="btn btn-primary" onclick="saveUserAdmin('${id||''}')">💾 Guardar</button>
    </div></div>`;
  document.body.appendChild(m);
  m.onclick=ev=>{if(ev.target===m)m.remove();};
  toggleUserElections(u?.role||'ADMIN');
}

function toggleUserElections(role) {
  const grp=el('user-elections-group');
  if(grp) grp.style.display=role==='RESULTADOS'?'':'none';
}

async function saveUserAdmin(id='') {
  const nombre=el('user-nombre').value.trim(), username=el('user-username').value.trim();
  const role=el('user-role').value, password=el('user-password').value, errEl=el('user-error');
  if(!nombre||!username){errEl.textContent='Nombre y usuario son obligatorios';errEl.style.display='flex';return;}
  if(!id&&!password){errEl.textContent='La contraseña es obligatoria';errEl.style.display='flex';return;}
  showLoading('Guardando...');
  try{
    const elecSelect=el('user-elecciones');
    const eleccionIds=elecSelect?[...elecSelect.selectedOptions].map(o=>o.value):[];
    const res=await API.saveUser({id:id||null,nombre,username,role,password:password||null,eleccionIds});
    if(res.ok){const fresh=await API.getUsers();if(fresh.ok)AppState.users=fresh.data;el('user-modal')?.remove();renderUsersMgmt();showToast('Usuario guardado','success');}
    else{errEl.textContent=res.error||'Error';errEl.style.display='flex';}
  }catch(err){errEl.textContent='Error: '+err.message;errEl.style.display='flex';}
  finally{hideLoading();}
}

async function toggleUserAdmin(id,activo) {
  showLoading('Actualizando...');
  try{
    const res=await API.toggleUser(id,activo);
    if(res.ok){const fresh=await API.getUsers();if(fresh.ok)AppState.users=fresh.data;renderUsersMgmt();showToast(`Usuario ${activo?'activado':'desactivado'}`,'success');}
    else showToast(res.error||'Error','error');
  }catch(err){showToast('Error: '+err.message,'error');}
  finally{hideLoading();}
}

async function deleteUserAdmin(id) {
  showConfirmModal('Eliminar Usuario','¿Eliminar este usuario?',async()=>{
    showLoading('Eliminando...');
    try{
      const res=await API.deleteUser(id);
      if(res.ok){AppState.users=(AppState.users||[]).filter(u=>u.id!==id);renderUsersMgmt();showToast('Usuario eliminado','success');}
      else showToast(res.error||'Error','error');
    }catch(err){showToast('Error: '+err.message,'error');}
    finally{hideLoading();}
  },true);
}

// ===== AUDITORÍA =====
function renderAuditLog() {
  const cont=el('admin-section-audit'); if(!cont) return;
  const elections=AppState.elections||[];
  cont.innerHTML=`
    <div class="section-title">📋 Registro de Auditoría</div>
    <div class="alert alert-info" style="margin-bottom:20px">ℹ️ Registro de solo lectura. Selecciona una votación para ver o descargar su registro.</div>
    ${elections.length===0?'<div class="alert alert-warning">No hay votaciones creadas aún.</div>':`
      <div class="table-wrap"><table>
        <thead><tr><th>Votación</th><th>Estado</th><th>Creada</th><th>Acciones</th></tr></thead>
        <tbody>
          ${elections.map(e=>`<tr>
            <td><strong>${sanitize(e.nombre)}</strong></td>
            <td>${statusBadge(e.estado)}</td>
            <td style="font-size:.82rem">${formatTimeSV(e.creado)}</td>
            <td><div style="display:flex;gap:8px">
              <button class="btn btn-outline btn-sm" onclick="viewAuditElection('${e.id}','${sanitize(e.nombre).replace(/'/g,"\\'")}')">🔍 Observar</button>
              <button class="btn btn-ghost btn-sm" onclick="downloadAuditPDF('${e.id}','${sanitize(e.nombre).replace(/'/g,"\\'")}')">📄 PDF</button>
            </div></td>
          </tr>`).join('')}
        </tbody>
      </table></div>`}
    <div id="audit-detail" style="margin-top:24px"></div>`;
}

async function viewAuditElection(electionId,nombre) {
  const cont=el('audit-detail'); if(!cont) return;
  cont.innerHTML=`<div style="text-align:center;padding:24px"><div class="spinner spinner-dark" style="width:28px;height:28px;border-width:3px;margin:0 auto"></div><p style="margin-top:8px;color:var(--text-secondary)">Cargando...</p></div>`;
  try{
    const res=await API.getAudit({eleccionId:electionId});
    if(!res.ok){cont.innerHTML=`<div class="alert alert-error">Error al cargar</div>`;return;}
    const audits=res.data||[];
    cont.innerHTML=`<div class="card">
      <div class="card-header">
        <div class="card-title">📋 Auditoría: ${sanitize(nombre)}</div>
        <div style="display:flex;gap:8px">
          <span style="align-self:center;font-size:.8rem;color:var(--text-secondary)">${audits.length} registros</span>
          <button class="btn btn-ghost btn-sm" onclick="el('audit-detail').innerHTML=''">✕ Cerrar</button>
        </div>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>Timestamp</th><th>Usuario</th><th>Acción</th><th>Detalle</th></tr></thead>
        <tbody>${audits.length===0?'<tr><td colspan="4" style="text-align:center;padding:24px;color:var(--text-light)">Sin registros</td></tr>':
          audits.map(a=>`<tr>
            <td style="font-size:.78rem;white-space:nowrap">${sanitize(a.timestamp)}</td>
            <td><strong style="font-size:.82rem">${sanitize(a.usuario)}</strong></td>
            <td><span style="font-size:.75rem;background:var(--bg-soft);padding:2px 8px;border-radius:4px">${sanitize(a.accion)}</span></td>
            <td style="font-size:.8rem">${sanitize(a.detalle)}</td>
          </tr>`).join('')}
        </tbody></table></div></div>`;
  }catch(err){cont.innerHTML=`<div class="alert alert-error">Error: ${sanitize(err.message)}</div>`;}
}

async function downloadAuditPDF(electionId,nombre) {
  showLoading('Generando PDF...');
  try{
    const res=await API.getAudit({eleccionId:electionId});
    if(!res.ok){showToast('Error','error');return;}
    const audits=res.data||[];
    const html=`<h1>📋 Auditoría</h1>
      <p><strong>Votación:</strong> ${sanitize(nombre)}</p>
      <p><strong>Registros:</strong> ${audits.length}</p>
      <p><strong>Generado:</strong> ${new Date().toLocaleString('es-SV',{timeZone:'America/El_Salvador',hour12:false})}</p>
      <table><thead><tr><th>Timestamp</th><th>Usuario</th><th>Acción</th><th>Detalle</th></tr></thead>
      <tbody>${audits.map(a=>`<tr><td>${sanitize(a.timestamp)}</td><td>${sanitize(a.usuario)}</td><td>${sanitize(a.accion)}</td><td>${sanitize(a.detalle)}</td></tr>`).join('')||'<tr><td colspan="4" style="text-align:center">Sin registros</td></tr>'}
      </tbody></table>`;
    await exportToPDF('Auditoría - '+nombre,html);
  }catch(err){showToast('Error: '+err.message,'error');}
  finally{hideLoading();}
}

// ===== CONFIGURACIÓN =====
function renderSettingsMgmt() {
  const cont=el('admin-section-settings'); if(!cont) return;
  const cfg=AppState.config||{};
  cont.innerHTML=`<div class="section-title">⚙️ Configuración General</div>
    <div class="card" style="max-width:640px">
      <div class="card-header"><div class="card-title">🏫 Información Institucional</div></div>
      <div class="form-group"><label class="form-label">Nombre de la Institución *</label>
        <input type="text" id="set-inst" class="form-input" value="${sanitize(cfg.institutionName||'')}" placeholder="Nombre completo"></div>
      <div class="form-group"><label class="form-label">URL del Logo</label>
        <input type="url" id="set-logo" class="form-input" value="${sanitize(cfg.logoUrl||'')}" placeholder="https://...">
        ${cfg.logoUrl?`<img src="${sanitize(cfg.logoUrl)}" style="height:60px;margin-top:10px;border-radius:8px;border:1px solid var(--border)" onerror="this.style.display='none'">`:''}
      </div>
      <div id="settings-error" class="alert alert-error" style="display:none"></div>
      <button class="btn btn-primary" onclick="saveSettingsAdmin()">💾 Guardar Configuración</button>
    </div>`;
}

async function saveSettingsAdmin() {
  const instName=el('set-inst').value.trim(), logoUrl=el('set-logo').value.trim(), errEl=el('settings-error');
  if(!instName){errEl.textContent='El nombre es obligatorio';errEl.style.display='flex';return;}
  showLoading('Guardando...');
  try{
    const res=await API.saveConfig({INSTITUTION_NAME:instName,LOGO_URL:logoUrl});
    if(res.ok){AppState.config.institutionName=instName;AppState.config.logoUrl=logoUrl;updateHeaderDisplay();renderSettingsMgmt();showToast('Configuración guardada','success');}
    else{errEl.textContent=res.error||'Error';errEl.style.display='flex';}
  }catch(err){errEl.textContent='Error: '+err.message;errEl.style.display='flex';}
  finally{hideLoading();}
}