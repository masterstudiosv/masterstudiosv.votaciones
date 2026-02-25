/**
 * ============================================================
 * SISTEMA DE VOTACIÓN - Configuración y Capa de API
 * config.js
 * ============================================================
 */

const APP_CONFIG = {
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbzVwnF4wuCWjjumsqfGW5RAE-gFf2d8W5B6pRS4nBvI6eFnqPiC1il8yugjL8-39ptr/exec',
  API_SECRET: 'VOTACION_MSSV_2026',
  RESULTS_REFRESH_INTERVAL: 8000,
  VOTE_SUCCESS_REDIRECT: 5,
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000,
};

// ============================================================
// CAPA DE API
// ============================================================
const API = {

  async call(action, data = {}, retries = APP_CONFIG.MAX_RETRIES) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const payload = JSON.stringify({
          action,
          data,
          secret: APP_CONFIG.API_SECRET
        });

        // URLSearchParams evita preflight CORS y sigue el 302 de Google Apps Script
        const body = new URLSearchParams({ payload });

        const res = await fetch(APP_CONFIG.APPS_SCRIPT_URL, {
          method: 'POST',
          body,
          redirect: 'follow',
        });

        const text = await res.text();
        console.log('[API] raw:', text.substring(0, 300));

        try {
          return JSON.parse(text);
        } catch {
          console.error('[API] No JSON:', text.substring(0, 500));
          throw new Error('Respuesta inválida del servidor');
        }

      } catch (err) {
        console.warn('[API] Intento ' + attempt + ' fallido:', err.message);
        if (attempt === retries) throw err;
        await sleep(APP_CONFIG.RETRY_DELAY * attempt);
      }
    }
  },

  authenticate: (username, password) =>
    API.call('authenticate', { username, password }),

  registerVote: (voteData) => API.call('registerVote', voteData),
  checkNIE: (nie) => API.call('checkNIE', { nie }),

  getConfig: () => API.call('getConfig'),
  saveConfig: (data) => API.call('saveConfig', data),
  setElectionStatus: (status, startTime, endTime) =>
    API.call('setElectionStatus', { status, startTime, endTime }),

  getCandidates: () => API.call('getCandidates'),
  saveCandidate: (data) => API.call('saveCandidate', data),
  deleteCandidate: (id) => API.call('deleteCandidate', { id }),

  getSections: () => API.call('getSections'),
  saveSection: (data) => API.call('saveSection', data),
  deleteSection: (id) => API.call('deleteSection', { id }),

  getUrnas: () => API.call('getUrnas'),
  saveUrna: (data) => API.call('saveUrna', data),
  toggleUrna: (id, activo) => API.call('toggleUrna', { id, activo }),
  toggleSector: (sector, activo) => API.call('toggleSector', { sector, activo }),

  getLocations: () => API.call('getLocations'),
  saveLocation: (data) => API.call('saveLocation', data),
  deleteLocation: (id) => API.call('deleteLocation', { id }),

  getUsers: () => API.call('getUsers'),
  saveUser: (data) => API.call('saveUser', data),
  deleteUser: (id) => API.call('deleteUser', { id }),

  getResults: () => API.call('getResults'),
};

// ============================================================
// ESTADO GLOBAL
// ============================================================
const AppState = {
  user: null,
  config: {
    institutionName: 'Institución Educativa',
    electionName: 'Elecciones Estudiantiles 2024',
    logoUrl: '',
    electionStatus: 'inactive',
    electionStartTime: '',
    electionEndTime: ''
  },
  candidates: [],
  sections: [],
  urnas: [],
  locations: [],
  users: [],
  adminSection: 'dashboard',
  currentVoteData: null,
  resultsTimer: null,
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
    overlay.innerHTML = '<div class="spinner"></div><p style="color:var(--primary-dark);font-weight:600">' + sanitize(message) + '</p>';
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
  toast.className = 'toast toast-' + type;
  toast.innerHTML = '<span>' + (icons[type]||'ℹ️') + '</span><span>' + sanitize(message) + '</span>';
  toast.onclick = () => toast.remove();
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(80px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

function showConfirmModal(title, message, onConfirm, danger = false) {
  const existing = el('confirm-modal');
  if (existing) existing.remove();
  const modal = document.createElement('div');
  modal.id = 'confirm-modal';
  modal.className = 'modal-overlay';
  modal.innerHTML =
    '<div class="modal-box" style="max-width:420px">' +
      '<div class="modal-header">' +
        '<h3 class="modal-title">' + sanitize(title) + '</h3>' +
        '<button class="modal-close" onclick="el(\'confirm-modal\').remove()">✕</button>' +
      '</div>' +
      '<div class="modal-body"><p style="color:var(--text-secondary);line-height:1.6">' + sanitize(message) + '</p></div>' +
      '<div class="modal-footer">' +
        '<button class="btn btn-ghost" onclick="el(\'confirm-modal\').remove()">Cancelar</button>' +
        '<button class="btn ' + (danger ? 'btn-danger' : 'btn-primary') + '" id="confirm-action-btn">Confirmar</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(modal);
  el('confirm-action-btn').onclick = () => { modal.remove(); onConfirm(); };
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
}

function statusBadge(status) {
  const labels = {
    active:    { text: 'Activa',     cls: 'status-active' },
    scheduled: { text: 'Programada', cls: 'status-scheduled' },
    paused:    { text: 'Pausada',    cls: 'status-paused' },
    ended:     { text: 'Finalizada', cls: 'status-ended' },
    inactive:  { text: 'Inactiva',   cls: 'status-inactive' },
  };
  const s = labels[status] || labels.inactive;
  return '<span class="header-status-badge ' + s.cls + '">' + s.text + '</span>';
}

function validateNIE(nie) {
  const cleaned = nie.replace(/\s/g, '');
  return /^[0-9A-Za-z\-]{6,20}$/.test(cleaned);
}

function updateHeaderDisplay() {
  const cfg = AppState.config;
  qsAll('.header-institution').forEach(function(e) {
    e.textContent = cfg.institutionName || 'Institución Educativa';
  });
  qsAll('.header-election').forEach(function(e) {
    e.textContent = cfg.electionName || '';
  });
  qsAll('.header-status-area').forEach(function(e) {
    e.innerHTML = statusBadge(cfg.electionStatus);
  });
  const loginInst = el('login-institution-name');
  const loginElec = el('login-election-name');
  const loginLogo = el('login-logo-img');
  if (loginInst) loginInst.textContent = cfg.institutionName || 'Institución Educativa';
  if (loginElec) loginElec.textContent = cfg.electionName || '';
  if (loginLogo && cfg.logoUrl) { loginLogo.src = cfg.logoUrl; loginLogo.style.display = ''; }
}
