/**
 * auth.js - Autenticación, enrutamiento y carga de paneles
 */

function saveSession(user) { try { sessionStorage.setItem('voting_session',JSON.stringify(user)); } catch(e){} }
function loadSession()     { try { const r=sessionStorage.getItem('voting_session'); return r?JSON.parse(r):null; } catch(e){return null;} }
function clearSession()    { try { sessionStorage.removeItem('voting_session'); } catch(e){} }

function showPage(pageId) {
  qsAll('.page').forEach(p=>p.classList.remove('active'));
  const page=el(pageId); if(page) page.classList.add('active');
}

// ===== LOGIN =====
async function handleLogin(e) {
  e.preventDefault();
  const username=el('login-username').value.trim(), password=el('login-password').value;
  const errorEl=el('login-error');
  if(!username||!password){ showLoginError('Completa todos los campos'); return; }
  const btn=el('login-btn');
  btn.disabled=true; btn.innerHTML='<span class="spinner"></span> Verificando...';
  if(errorEl){errorEl.textContent=''; errorEl.style.display='none';}
  try {
    const result=await API.authenticate(username,password);
    if(!result.ok){ showLoginError(result.error||'Credenciales inválidas'); return; }
    AppState.user=result;
    saveSession(result);
    await routeByRole(result);
  } catch(err) {
    showLoginError('Error de conexión. Verifica tu internet.');
  } finally {
    btn.disabled=false; btn.innerHTML='<span>🔐</span> Ingresar al Sistema';
  }
}

async function routeByRole(user) {
  if (user.role==='ADMIN')      await loadAdminPanel();
  else if (user.role==='RESULTADOS') await loadResultsPanel();
  else if (user.role==='URNA')  { AppState.currentUrna=user.urnaData; await loadUrnaPanel(); }
}

function showLoginError(msg) {
  const errorEl=el('login-error');
  if(errorEl){errorEl.innerHTML='<span>⚠️</span> '+sanitize(msg);errorEl.className='alert alert-error';errorEl.style.display='flex';errorEl.style.alignItems='center';errorEl.style.gap='8px';}
}

function handleLogout() {
  showConfirmModal('Cerrar Sesión','¿Deseas cerrar tu sesión actual?',()=>{
    clearSession();
    AppState.user=null; AppState.currentUrna=null;
    if(AppState.resultsTimer){clearInterval(AppState.resultsTimer);AppState.resultsTimer=null;}
    if(AppState._urnaCheckTimer){clearInterval(AppState._urnaCheckTimer);AppState._urnaCheckTimer=null;}
    if(AppState._electionTimer){clearInterval(AppState._electionTimer);AppState._electionTimer=null;}
    const lUser=el('login-username'),lPass=el('login-password');
    if(lUser)lUser.value=''; if(lPass)lPass.value='';
    const lErr=el('login-error'); if(lErr){lErr.textContent='';lErr.style.display='none';}
    showPage('page-login');
  });
}

// ===== ADMIN — carga rápida en 2 fases =====
async function loadAdminPanel() {
  showLoading('Cargando panel...');
  try {
    // FASE 1: cargar lo crítico primero (config + elecciones + secciones + urnas)
    // Sin voters — son pesados y no son necesarios para mostrar el dashboard
    const [configRes, electionsRes, sectionsRes, urnasRes, locationsRes, usersRes] = await Promise.all([
      API.getConfig(),
      API.getElections(),
      API.getSections(),
      API.getUrnas(),
      API.getLocations(),
      API.getUsers(),
    ]);

    if(configRes.ok){
      const cfg=configRes.data;
      AppState.config={institutionName:cfg.INSTITUTION_NAME||'Institución Educativa',logoUrl:cfg.LOGO_URL||''};
    }
    AppState.elections = electionsRes.ok  ? electionsRes.data  : [];
    AppState.sections  = sectionsRes.ok   ? sectionsRes.data   : [];
    AppState.urnas     = urnasRes.ok      ? urnasRes.data      : [];
    AppState.locations = locationsRes.ok  ? locationsRes.data  : [];
    AppState.users     = usersRes.ok      ? usersRes.data      : [];
    AppState.voters    = []; // se carga en FASE 2 o cuando se necesite

    // Auto-resolver estados scheduled antes de mostrar
    resolveScheduledElections();

    updateHeaderDisplay();
    showPage('page-admin');
    navigateAdminSection('dashboard');

    // FASE 2: cargar votantes en background (no bloquea la UI)
    API.getVoters({}).then(res=>{
      if(res.ok){ AppState.voters=res.data; renderAdminDashboard(); }
    }).catch(()=>{});

    // Iniciar timer de verificación de estados programados (cada 30s)
    startElectionStateTimer();

  } catch(err) {
    showToast('Error al cargar el panel: '+err.message,'error');
    clearSession();
  } finally {
    hideLoading();
  }
}

// ===== URNA — carga optimizada =====
async function loadUrnaPanel() {
  showLoading('Cargando urna...');
  try {
    // Carga mínima: config + elecciones + secciones (candidatos y cargos solo de la elección activa)
    const [configRes, electionsRes, sectionsRes] = await Promise.all([
      API.getConfig(),
      API.getElections(),
      API.getSections()
    ]);

    if(configRes.ok){const cfg=configRes.data;AppState.config={institutionName:cfg.INSTITUTION_NAME||'Institución',logoUrl:cfg.LOGO_URL||''};}
    AppState.sections=sectionsRes.ok?sectionsRes.data:[];

    // Resolver elección activa
    const elections=electionsRes.ok?electionsRes.data:[];
    const urna=AppState.currentUrna;
    let activeElection=null;
    if(urna?.eleccionId){
      activeElection=elections.find(e=>e.id===urna.eleccionId);
    }
    if(!activeElection){
      activeElection=elections.find(e=>e.estado==='active')||
                     elections.find(e=>e.estado==='scheduled')||
                     elections.find(e=>e.estado==='paused')||null;
    }

    // Aplicar lógica de estados programados
    if(activeElection) activeElection=resolveElectionState(activeElection);

    if(activeElection && activeElection.estado==='active'){
      // Solo cargar cargos y candidatos si la elección está activa
      const [posRes,candRes]=await Promise.all([
        API.getPositions(activeElection.id),
        API.getCandidates(activeElection.id)
      ]);
      AppState.positions =posRes.ok ?posRes.data.filter(p=>p.activo) :[];
      AppState.candidates=candRes.ok?candRes.data.filter(c=>c.activo):[];
    } else {
      AppState.positions=[]; AppState.candidates=[];
    }
    AppState.currentElection=activeElection;

    updateHeaderDisplay();
    const ne=el('urna-info-name'),le=el('urna-info-location'),se=el('urna-info-sector');
    if(ne)ne.textContent=urna?.nombre||''; if(le)le.textContent=urna?.ubicacion||''; if(se)se.textContent=urna?.sector||'';

    renderUrnaPanel();
    showPage('page-urna');

    // Timer de vigilancia: verifica cada 20s si la urna fue desactivada o el estado cambió
    startUrnaWatchdog();

  } catch(err){
    showToast('Error al cargar la urna: '+err.message,'error');
    clearSession(); showPage('page-login');
  } finally {
    hideLoading();
  }
}

// ===== TIMER DE ESTADOS PROGRAMADOS (admin) =====
function startElectionStateTimer() {
  if(AppState._electionTimer) clearInterval(AppState._electionTimer);
  AppState._electionTimer = setInterval(async ()=>{
    try {
      const res=await API.getElections();
      if(!res.ok) return;
      const antes = (AppState.elections||[]).map(e=>({id:e.id,estado:e.estado}));
      AppState.elections = res.data.map(e=>resolveElectionState(e));

      // Detectar cambios de estado para notificar al admin
      AppState.elections.forEach(e=>{
        const ant = antes.find(a=>a.id===e.id);
        if(ant && ant.estado !== e.estado){
          const nombres = {active:'Activa',scheduled:'Programada',ended:'Finalizada',paused:'Pausada',inactive:'Inactiva'};
          // Solo notificar si es activación automática (scheduled→active)
          if(ant.estado==='scheduled' && e.estado==='active'){
            showToast('🟢 Votación "'+e.nombre+'" se activó automáticamente','success',7000);
          }
          if(ant.estado==='active' && e.estado==='ended'){
            showToast('🔴 Votación "'+e.nombre+'" finalizó automáticamente','warning',7000);
          }
        }
      });

      // También actualizar currentElection si está cargada
      if(AppState.currentElection){
        const updated = AppState.elections.find(e=>e.id===AppState.currentElection.id);
        if(updated) {
          AppState.currentElection = updated;
          updateHeaderDisplay();
        }
      }

      if(AppState.adminSection==='dashboard') renderAdminDashboard();
      if(AppState.adminSection==='elections') renderElectionsMgmt();
    } catch(e){}
  }, 30000);
}

// ===== WATCHDOG DE URNA =====
// Cada 20s verifica si la urna fue desactivada o la elección cambió de estado
function startUrnaWatchdog() {
  if(AppState._urnaCheckTimer) clearInterval(AppState._urnaCheckTimer);
  AppState._urnaCheckTimer = setInterval(async ()=>{
    try {
      const [electionsRes, urnasRes] = await Promise.all([
        API.getElections(),
        API.getUrnas()
      ]);

      // Verificar si esta urna sigue activa
      const urna=AppState.currentUrna;
      if(urna && urnasRes.ok){
        const urnaActual=urnasRes.data.find(u=>u.id===urna.id);
        if(urnaActual && !urnaActual.activo){
          // Urna desactivada — salir del sistema
          clearInterval(AppState._urnaCheckTimer);
          AppState._urnaCheckTimer=null;
          clearSession();
          AppState.user=null; AppState.currentUrna=null;
          showPage('page-login');
          showToast('Esta urna ha sido desactivada por el administrador','warning',8000);
          return;
        }
      }

      // Verificar si el estado de la elección cambió
      if(electionsRes.ok && AppState.currentElection){
        const elections=electionsRes.data;
        let election=elections.find(e=>e.id===AppState.currentElection.id);
        if(election){
          election=resolveElectionState(election);
          const estadoAnterior=AppState.currentElection.estado;
          if(election.estado !== estadoAnterior){
            // Estado cambió — recargar panel de urna
            AppState.currentElection=election;
            if(election.estado==='active' && AppState.positions.length===0){
              // Cargar cargos y candidatos si ahora está activa
              const [posRes,candRes]=await Promise.all([
                API.getPositions(election.id),
                API.getCandidates(election.id)
              ]);
              AppState.positions =posRes.ok ?posRes.data.filter(p=>p.activo) :[];
              AppState.candidates=candRes.ok?candRes.data.filter(c=>c.activo):[];
            }
            renderUrnaPanel();
          }
        }
      }
    } catch(e){ console.warn('Watchdog error:',e.message); }
  }, 20000); // cada 20 segundos
}

// ===== RESOLVER ESTADOS PROGRAMADOS =====
// Si una elección es 'scheduled' y ya pasó la hora de inicio → devuelve 'active'
// Si una elección es 'active' y ya pasó la hora de fin → devuelve 'ended'
// SOLO cambia el estado visualmente — el backend se actualiza via setElectionStatus
function resolveElectionState(election) {
  if(!election) return election;
  const now=new Date();
  if(election.estado==='scheduled' && election.inicioProgramado){
    const start=new Date(election.inicioProgramado);
    if(!isNaN(start) && now>=start){
      // La hora de inicio ya pasó — tratar como activa en la UI
      return {...election, estado:'active'};
    }
  }
  if(election.estado==='active' && election.finProgramado){
    const end=new Date(election.finProgramado);
    if(!isNaN(end) && now>=end){
      return {...election, estado:'ended'};
    }
  }
  return election;
}

function resolveScheduledElections() {
  AppState.elections=(AppState.elections||[]).map(e=>resolveElectionState(e));
}

// ===== RESTAURAR SESIÓN =====
async function tryRestoreSession() {
  const saved=loadSession();
  if(!saved) return false;
  showLoading('Restaurando sesión...');
  try {
    AppState.user=saved;
    if(saved.role==='URNA') AppState.currentUrna=saved.urnaData;
    await routeByRole(saved);
    return true;
  } catch(err){
    clearSession(); return false;
  } finally {
    hideLoading();
  }
}
