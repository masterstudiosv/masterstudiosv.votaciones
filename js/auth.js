/**
 * ============================================================
 * AUTENTICACIÓN Y ENRUTAMIENTO
 * auth.js
 * ============================================================
 */

// ===== SESIÓN PERSISTENTE (sessionStorage) =====
// Mantiene la sesión mientras el navegador esté abierto.
// Al cerrar el navegador se borra automáticamente por seguridad.

function saveSession(user) {
  try {
    sessionStorage.setItem('voting_session', JSON.stringify(user));
  } catch(e) {}
}

function loadSession() {
  try {
    const raw = sessionStorage.getItem('voting_session');
    return raw ? JSON.parse(raw) : null;
  } catch(e) { return null; }
}

function clearSession() {
  try {
    sessionStorage.removeItem('voting_session');
  } catch(e) {}
}

// ===== PÁGINAS =====
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
  btn.innerHTML = '<span class="spinner"></span> Verificando...';
  if (errorEl) { errorEl.textContent = ''; errorEl.style.display = 'none'; }

  try {
    const result = await API.authenticate(username, password);

    if (!result.ok) {
      showLoginError(result.error || 'Credenciales inválidas');
      return;
    }

    AppState.user = result;
    saveSession(result);  // Guardar sesión

    await routeByRole(result);

  } catch (err) {
    showLoginError('Error de conexión. Verifica tu internet e intenta de nuevo.');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span>🔐</span> Ingresar al Sistema';
  }
}

// ===== ENRUTAR SEGÚN ROL =====
async function routeByRole(user) {
  if (user.role === 'ADMIN') {
    await loadAdminPanel();
  } else if (user.role === 'RESULTADOS') {
    await loadResultsPanel();
  } else if (user.role === 'URNA') {
    AppState.currentUrna = user.urnaData;
    await loadUrnaPanel();
  }
}

function showLoginError(msg) {
  const errorEl = el('login-error');
  if (errorEl) {
    errorEl.innerHTML = '<span>⚠️</span> ' + sanitize(msg);
    errorEl.className = 'alert alert-error';
    errorEl.style.display = 'flex';
    errorEl.style.alignItems = 'center';
    errorEl.style.gap = '8px';
  }
}

// ===== CERRAR SESIÓN =====
function handleLogout() {
  showConfirmModal('Cerrar Sesión', '¿Deseas cerrar tu sesión actual?', () => {
    clearSession();  // Borrar sesión guardada
    AppState.user = null;
    AppState.currentUrna = null;

    if (AppState.resultsTimer) {
      clearInterval(AppState.resultsTimer);
      AppState.resultsTimer = null;
    }

    const lUser = el('login-username');
    const lPass = el('login-password');
    if (lUser) lUser.value = '';
    if (lPass) lPass.value = '';
    const lErr = el('login-error');
    if (lErr) { lErr.textContent = ''; lErr.style.display = 'none'; }

    showPage('page-login');
  });
}

// ===== CARGAR PANEL ADMIN =====
async function loadAdminPanel() {
  showLoading('Cargando panel administrativo...');
  try {
    const [configRes, electionsRes, sectionsRes, urnasRes, locationsRes, usersRes, votersRes] = await Promise.all([
      API.getConfig(),
      API.getElections(),
      API.getSections(),
      API.getUrnas(),
      API.getLocations(),
      API.getUsers(),
      API.getVoters({})
    ]);

    if (configRes.ok) {
      const cfg = configRes.data;
      AppState.config = {
        institutionName: cfg.INSTITUTION_NAME || 'Institución Educativa',
        logoUrl:         cfg.LOGO_URL         || '',
      };
    }

    AppState.elections  = electionsRes.ok  ? electionsRes.data  : [];
    AppState.sections   = sectionsRes.ok   ? sectionsRes.data   : [];
    AppState.urnas      = urnasRes.ok      ? urnasRes.data      : [];
    AppState.locations  = locationsRes.ok  ? locationsRes.data  : [];
    AppState.users      = usersRes.ok      ? usersRes.data      : [];
    AppState.voters     = votersRes.ok     ? votersRes.data     : [];

    updateHeaderDisplay();
    showPage('page-admin');
    navigateAdminSection('dashboard');

  } catch (err) {
    showToast('Error al cargar el panel: ' + err.message, 'error');
    clearSession();
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
        institutionName:   cfg.INSTITUTION_NAME    || 'Institución Educativa',
        electionName:      cfg.ELECTION_NAME       || '',
        logoUrl:           cfg.LOGO_URL            || '',
        electionStatus:    cfg.ELECTION_STATUS     || 'inactive',
        electionStartTime: cfg.ELECTION_START_TIME || '',
        electionEndTime:   cfg.ELECTION_END_TIME   || '',
      };
    }
    updateHeaderDisplay();
    await refreshResults();
    showPage('page-results');

    if (AppState.resultsTimer) clearInterval(AppState.resultsTimer);
    AppState.resultsTimer = setInterval(refreshResults, APP_CONFIG.RESULTS_REFRESH_INTERVAL);

  } catch (err) {
    showToast('Error al cargar resultados: ' + err.message, 'error');
    clearSession();
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
        institutionName:   cfg.INSTITUTION_NAME    || 'Institución Educativa',
        electionName:      cfg.ELECTION_NAME       || '',
        logoUrl:           cfg.LOGO_URL            || '',
        electionStatus:    cfg.ELECTION_STATUS     || 'inactive',
        electionStartTime: cfg.ELECTION_START_TIME || '',
        electionEndTime:   cfg.ELECTION_END_TIME   || '',
      };
    }

    AppState.candidates = candidatesRes.ok ? candidatesRes.data.filter(c => c.activo) : [];
    AppState.sections   = sectionsRes.ok   ? sectionsRes.data.filter(s => s.activo)   : [];

    updateHeaderDisplay();

    // Actualizar info bar de urna
    const urna = AppState.currentUrna;
    if (urna) {
      const nameEl = el('urna-info-name');
      const locEl  = el('urna-info-location');
      const secEl  = el('urna-info-sector');
      if (nameEl) nameEl.textContent = urna.nombre    || '';
      if (locEl)  locEl.textContent  = urna.ubicacion || '';
      if (secEl)  secEl.textContent  = urna.sector    || '';
    }

    renderUrnaPanel();
    showPage('page-urna');

  } catch (err) {
    showToast('Error al cargar la urna: ' + err.message, 'error');
    clearSession();
  } finally {
    hideLoading();
  }
}

// ===== RESTAURAR SESIÓN AL CARGAR LA PÁGINA =====
async function tryRestoreSession() {
  const saved = loadSession();
  if (!saved) return false;  // No hay sesión guardada

  showLoading('Restaurando sesión...');
  try {
    // Verificar que las credenciales siguen siendo válidas
    // (la urna puede haber sido desactivada, etc.)
    AppState.user = saved;
    if (saved.role === 'URNA') {
      AppState.currentUrna = saved.urnaData;
    }
    await routeByRole(saved);
    return true;

  } catch (err) {
    // Si falla, limpiar sesión y mostrar login
    clearSession();
    return false;
  } finally {
    hideLoading();
  }
}