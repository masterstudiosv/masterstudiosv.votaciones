/**
 * ============================================================
 * AUTENTICACIÓN Y ENRUTAMIENTO
 * auth.js
 * ============================================================
 */

// ===== PÁGINAS (mostrar/ocultar) =====
function showPage(pageId) {
  qsAll('.page').forEach(p => p.classList.remove('active'));
  const page = el(pageId);
  if (page) page.classList.add('active');
}

// ===== INICIAR SESIÓN =====
async function handleLogin(e) {
  e.preventDefault();
  
  const username = el('login-username').value.trim();
  const password = el('login-password').value;
  const errorEl  = el('login-error');
  
  if (!username || !password) {
    showLoginError('Completa todos los campos');
    return;
  }

  const btn = el('login-btn');
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> Verificando...`;
  if (errorEl) errorEl.textContent = '';

  try {
    const result = await API.authenticate(username, password);
    
    if (!result.ok) {
      showLoginError(result.error || 'Credenciales inválidas');
      return;
    }

    AppState.user = result;
    
    if (result.role === 'ADMIN') {
      await loadAdminPanel();
    } else if (result.role === 'RESULTADOS') {
      await loadResultsPanel();
    } else if (result.role === 'URNA') {
      AppState.currentUrna = result.urnaData;
      await loadUrnaPanel();
    }

  } catch (err) {
    showLoginError('Error de conexión. Verifica tu internet e intenta de nuevo.');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<span>🔐</span> Ingresar al Sistema`;
  }
}

function showLoginError(msg) {
  const errorEl = el('login-error');
  if (errorEl) {
    errorEl.textContent = msg;
    errorEl.className = 'alert alert-error';
  }
}

// ===== CERRAR SESIÓN =====
function handleLogout() {
  showConfirmModal('Cerrar Sesión', '¿Deseas cerrar tu sesión actual?', () => {
    AppState.user = null;
    AppState.currentUrna = null;
    if (AppState.resultsTimer) {
      clearInterval(AppState.resultsTimer);
      AppState.resultsTimer = null;
    }
    
    // Limpiar campos de login
    const lUser = el('login-username');
    const lPass = el('login-password');
    if (lUser) lUser.value = '';
    if (lPass) lPass.value = '';
    const lErr = el('login-error');
    if (lErr) { lErr.textContent = ''; lErr.className = ''; }
    
    showPage('page-login');
  });
}

// ===== CARGAR PANEL ADMIN =====
async function loadAdminPanel() {
  showLoading('Cargando panel administrativo...');
  try {
    // Cargar datos en paralelo
    const [configRes, candidatesRes, sectionsRes, urnasRes, locationsRes, usersRes] = await Promise.all([
      API.getConfig(),
      API.getCandidates(),
      API.getSections(),
      API.getUrnas(),
      API.getLocations(),
      API.getUsers()
    ]);

    if (configRes.ok) {
      const cfg = configRes.data;
      AppState.config = {
        institutionName:  cfg.INSTITUTION_NAME || 'Institución Educativa',
        electionName:     cfg.ELECTION_NAME    || '',
        logoUrl:          cfg.LOGO_URL         || '',
        electionStatus:   cfg.ELECTION_STATUS  || 'inactive',
        electionStartTime:cfg.ELECTION_START_TIME || '',
        electionEndTime:  cfg.ELECTION_END_TIME   || '',
      };
    }

    AppState.candidates = candidatesRes.ok ? candidatesRes.data : [];
    AppState.sections   = sectionsRes.ok   ? sectionsRes.data   : [];
    AppState.urnas      = urnasRes.ok      ? urnasRes.data      : [];
    AppState.locations  = locationsRes.ok  ? locationsRes.data  : [];
    AppState.users      = usersRes.ok      ? usersRes.data      : [];

    updateHeaderDisplay();
    renderAdminDashboard();
    showPage('page-admin');
    navigateAdminSection('dashboard');

  } catch (err) {
    showToast('Error al cargar el panel: ' + err.message, 'error');
  } finally {
    hideLoading();
  }
}

// ===== CARGAR PANEL RESULTADOS =====
async function loadResultsPanel() {
  showLoading('Cargando resultados...');
  try {
    const configRes = await API.getConfig();
    if (configRes.ok) {
      const cfg = configRes.data;
      AppState.config = {
        institutionName:  cfg.INSTITUTION_NAME  || 'Institución Educativa',
        electionName:     cfg.ELECTION_NAME     || '',
        logoUrl:          cfg.LOGO_URL          || '',
        electionStatus:   cfg.ELECTION_STATUS   || 'inactive',
        electionStartTime:cfg.ELECTION_START_TIME || '',
        electionEndTime:  cfg.ELECTION_END_TIME   || '',
      };
    }
    updateHeaderDisplay();
    await refreshResults();
    showPage('page-results');

    // Auto-refresh cada N segundos
    if (AppState.resultsTimer) clearInterval(AppState.resultsTimer);
    AppState.resultsTimer = setInterval(refreshResults, APP_CONFIG.RESULTS_REFRESH_INTERVAL);

  } catch (err) {
    showToast('Error al cargar resultados: ' + err.message, 'error');
  } finally {
    hideLoading();
  }
}

// ===== CARGAR PANEL URNA =====
async function loadUrnaPanel() {
  showLoading('Cargando urna...');
  try {
    const [configRes, candidatesRes, sectionsRes] = await Promise.all([
      API.getConfig(),
      API.getCandidates(),
      API.getSections()
    ]);

    if (configRes.ok) {
      const cfg = configRes.data;
      AppState.config = {
        institutionName:  cfg.INSTITUTION_NAME  || 'Institución Educativa',
        electionName:     cfg.ELECTION_NAME     || '',
        logoUrl:          cfg.LOGO_URL          || '',
        electionStatus:   cfg.ELECTION_STATUS   || 'inactive',
        electionStartTime:cfg.ELECTION_START_TIME || '',
        electionEndTime:  cfg.ELECTION_END_TIME   || '',
      };
    }

    AppState.candidates = candidatesRes.ok ? candidatesRes.data.filter(c => c.activo) : [];
    AppState.sections   = sectionsRes.ok   ? sectionsRes.data.filter(s => s.activo)   : [];

    updateHeaderDisplay();
    renderUrnaPanel();
    showPage('page-urna');

  } catch (err) {
    showToast('Error al cargar la urna: ' + err.message, 'error');
  } finally {
    hideLoading();
  }
}
