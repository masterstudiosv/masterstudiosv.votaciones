/**
 * ============================================================
 * SISTEMA DE VOTACIÓN - Configuración y Capa de API
 * config.js
 * ============================================================
 */

const APP_CONFIG = {
  // ⚠️ REEMPLAZAR con la URL de tu Google Apps Script desplegado
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbwnS67LxZxWAbbA9maB5L-FMgzQbuLEKLA2VM0H2qWOtZ1BfIy4nBAFFy91Asxf-eZDIQ/exec',
  
  // ⚠️ DEBE COINCIDIR con API_SECRET en Code.gs
  API_SECRET: 'VOTACION_MSSV_2026',
  
  // Configuraciones generales
  RESULTS_REFRESH_INTERVAL: 8000,  // ms
  VOTE_SUCCESS_REDIRECT: 5,         // segundos antes de regresar
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000,
};

// ============================================================
// CAPA DE API - Todas las llamadas al backend
// ============================================================
const API = {
  
  async call(action, data = {}, retries = APP_CONFIG.MAX_RETRIES) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const res = await fetch(APP_CONFIG.APPS_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({
            action,
            data,
            secret: APP_CONFIG.API_SECRET
          })
        });
        
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        
        const result = await res.json();
        return result;
        
      } catch (err) {
        if (attempt === retries) throw err;
        await sleep(APP_CONFIG.RETRY_DELAY * attempt);
      }
    }
  },

  // Autenticación
  authenticate: (username, password) =>
    API.call('authenticate', { username, password }),

  // Votos
  registerVote: (voteData) => API.call('registerVote', voteData),
  checkNIE: (nie) => API.call('checkNIE', { nie }),

  // Configuración
  getConfig: () => API.call('getConfig'),
  saveConfig: (data) => API.call('saveConfig', data),
  setElectionStatus: (status, startTime, endTime) =>
    API.call('setElectionStatus', { status, startTime, endTime }),

  // Candidatos
  getCandidates: () => API.call('getCandidates'),
  saveCandidate: (data) => API.call('saveCandidate', data),
  deleteCandidate: (id) => API.call('deleteCandidate', { id }),

  // Secciones
  getSections: () => API.call('getSections'),
  saveSection: (data) => API.call('saveSection', data),
  deleteSection: (id) => API.call('deleteSection', { id }),

  // Urnas
  getUrnas: () => API.call('getUrnas'),
  saveUrna: (data) => API.call('saveUrna', data),
  toggleUrna: (id, activo) => API.call('toggleUrna', { id, activo }),
  toggleSector: (sector, activo) => API.call('toggleSector', { sector, activo }),

  // Ubicaciones
  getLocations: () => API.call('getLocations'),
  saveLocation: (data) => API.call('saveLocation', data),
  deleteLocation: (id) => API.call('deleteLocation', { id }),

  // Usuarios
  getUsers: () => API.call('getUsers'),
  saveUser: (data) => API.call('saveUser', data),
  deleteUser: (id) => API.call('deleteUser', { id }),

  // Resultados
  getResults: () => API.call('getResults'),
};

// ============================================================
// ESTADO GLOBAL DE LA APLICACIÓN
// ============================================================
const AppState = {
  // Usuario autenticado
  user: null,
  
  // Configuración del sistema
  config: {
    institutionName: 'Institución Educativa',
    electionName: 'Elecciones Estudiantiles 2024',
    logoUrl: '',
    electionStatus: 'inactive',
    electionStartTime: '',
    electionEndTime: ''
  },

  // Datos del sistema
  candidates: [],
  sections: [],
  urnas: [],
  locations: [],
  users: [],

  // Panel de admin activo
  adminSection: 'dashboard',
  
  // Datos temporales de votación
  currentVoteData: null,

  // Timer para resultados
  resultsTimer: null,
  
  // Urna actual (para rol URNA)
  currentUrna: null,
};

// ============================================================
// UTILIDADES
// ============================================================
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function formatTimeSV(isoString) {
  if (!isoString) return '';
  try {
    return new Date(isoString).toLocaleString('es-SV', {
      timeZone: 'America/El_Salvador',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
      hour12: false
    });
  } catch { return isoString; }
}

function el(id) { return document.getElementById(id); }
function qs(selector, parent = document) { return parent.querySelector(selector); }
function qsAll(selector, parent = document) { return [...parent.querySelectorAll(selector)]; }

function sanitize(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#039;');
}

function showLoading(message = 'Procesando...') {
  let overlay = el('global-loading');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'global-loading';
    overlay.className = 'overlay-loading';
    overlay.innerHTML = `<div class="spinner"></div><p style="color:var(--primary-dark);font-weight:600">${sanitize(message)}</p>`;
    document.body.appendChild(overlay);
  } else {
    overlay.querySelector('p').textContent = message;
    overlay.style.display = 'flex';
  }
}

function hideLoading() {
  const overlay = el('global-loading');
  if (overlay) overlay.style.display = 'none';
}

// Toast notifications
function showToast(message, type = 'info', duration = 4000) {
  let container = el('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${sanitize(message)}</span>`;
  toast.onclick = () => toast.remove();

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(80px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// Modal genérico de confirmación
function showConfirmModal(title, message, onConfirm, danger = false) {
  const existing = el('confirm-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'confirm-modal';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-box" style="max-width:420px">
      <div class="modal-header">
        <h3 class="modal-title">${sanitize(title)}</h3>
        <button class="modal-close" onclick="el('confirm-modal').remove()">✕</button>
      </div>
      <div class="modal-body">
        <p style="color:var(--text-secondary);line-height:1.6">${sanitize(message)}</p>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="el('confirm-modal').remove()">Cancelar</button>
        <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="confirm-action-btn">Confirmar</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  el('confirm-action-btn').onclick = () => {
    modal.remove();
    onConfirm();
  };
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
}

// Status badge
function statusBadge(status) {
  const labels = {
    active:     { text: 'Activa',      cls: 'status-active' },
    scheduled:  { text: 'Programada',  cls: 'status-scheduled' },
    paused:     { text: 'Pausada',     cls: 'status-paused' },
    ended:      { text: 'Finalizada',  cls: 'status-ended' },
    inactive:   { text: 'Inactiva',    cls: 'status-inactive' },
  };
  const s = labels[status] || labels.inactive;
  return `<span class="header-status-badge ${s.cls}">${s.text}</span>`;
}

// Validar NIE (formato básico El Salvador)
function validateNIE(nie) {
  const cleaned = nie.replace(/\s/g, '');
  // NIE salvadoreño: entre 8-12 dígitos o con guiones
  return /^[0-9A-Za-z\-]{6,20}$/.test(cleaned);
}

// Actualizar header con config actual
function updateHeaderDisplay() {
  const cfg = AppState.config;
  
  qsAll('.header-institution').forEach(el => {
    el.textContent = cfg.institutionName || 'Institución Educativa';
  });
  qsAll('.header-election').forEach(el => {
    el.textContent = cfg.electionName || '';
  });
  qsAll('.header-status-area').forEach(el => {
    el.innerHTML = statusBadge(cfg.electionStatus);
  });
  qsAll('.header-logo-wrap img').forEach(img => {
    if (cfg.logoUrl) {
      img.src = cfg.logoUrl;
      img.style.display = '';
    }
  });

  // Login page
  const loginInst = el('login-institution-name');
  const loginElec = el('login-election-name');
  const loginLogo = el('login-logo-img');
  if (loginInst) loginInst.textContent = cfg.institutionName || 'Institución Educativa';
  if (loginElec) loginElec.textContent = cfg.electionName || '';
  if (loginLogo && cfg.logoUrl) { loginLogo.src = cfg.logoUrl; loginLogo.style.display = ''; }
}
