/**
 * SISTEMA DE VOTACION v2.0 - config.js
 */

var APP_CONFIG = {
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbwCs0FrfFSLOC4Wp3LbueJG8cfi73xApcnUC3eto8kWmm0XbdWG3ZXQQ6CuXgqfWzq1cw/exec',
  API_SECRET: 'VOTACION_MSSV_2026',
  RESULTS_REFRESH_INTERVAL: 5000,
  VOTE_SUCCESS_REDIRECT: 5,
  MAX_RETRIES: 2,
  RETRY_DELAY: 1500,
};

var API = {
  call: async function(action, data, retries) {
    data = data || {};
    retries = (retries !== undefined) ? retries : APP_CONFIG.MAX_RETRIES;
    var lastError;
    for (var attempt = 1; attempt <= retries; attempt++) {
      try {
        var payload = JSON.stringify({
          action: action,
          data: data,
          secret: APP_CONFIG.API_SECRET
        });
        // Google Apps Script requiere URLSearchParams con key "payload"
        // NO usar Content-Type: application/json porque activa preflight CORS y falla
        var formData = new URLSearchParams();
        formData.append('payload', payload);

        var res = await fetch(APP_CONFIG.APPS_SCRIPT_URL, {
          method: 'POST',
          body: formData,
          redirect: 'follow',
        });

        var text = await res.text();
        var trimmed = text.trim();

        // Si Google devuelve HTML (error de permisos/deployment), detectarlo
        if (trimmed.startsWith('<') || trimmed.includes('<!DOCTYPE') || trimmed.includes('<html')) {
          throw new Error('ERROR_DEPLOYMENT: El script no está desplegado correctamente. Ve a Apps Script → Desplegar → Administrar deployments → edita el deployment activo → cambia "Quién puede acceder" a "Cualquier persona" → Guardar → Nueva versión.');
        }

        return JSON.parse(trimmed);
      } catch(err) {
        lastError = err;
        console.warn('[API] Intento ' + attempt + '/' + retries + ' fallido:', err.message);
        if (attempt < retries) await sleep(APP_CONFIG.RETRY_DELAY);
      }
    }
    throw lastError;
  },

  authenticate:            function(u,p)           { return API.call('authenticate',      {username:u, password:p}); },
  getConfig:               function()               { return API.call('getConfig');                                  },
  saveConfig:              function(d)              { return API.call('saveConfig',        d);                       },
  getElections:            function()               { return API.call('getElections');                               },
  saveElection:            function(d)              { return API.call('saveElection',      d);                       },
  setElectionStatus:       function(d)              { return API.call('setElectionStatus', d);                       },
  autoActivateElection:    function(id)             { return API.call('autoActivateElection', {id:id});                },
  getElectionDetail:       function(id)             { return API.call('getElectionDetail', {id:id});                 },
  toggleResultsVisibility: function(id,clave,m)     { return API.call('toggleResultsVisibility',{id:id,claveControl:clave,mostrar:m}); },
  getPositions:            function(eleccionId)     { return API.call('getPositions',      {electionId:eleccionId}); },
  savePosition:            function(d)              { return API.call('savePosition',      d);                       },
  deletePosition:          function(d)              { return API.call('deletePosition',    typeof d==='string'?{id:d}:d); },
  getCandidates:           function(eleccionId)     { return API.call('getCandidates',     {electionId:eleccionId}); },
  saveCandidate:           function(d)              { return API.call('saveCandidate',     d);                       },
  deleteCandidate:         function(d)              { return API.call('deleteCandidate',   typeof d==='string'?{id:d}:d); },
  getSections:             function()               { return API.call('getSections');                                },
  saveSection:             function(d)              { return API.call('saveSection',       d);                       },
  deleteSection:           function(id)             { return API.call('deleteSection',     {id:id});                 },
  getVoters:               function(d)              { return API.call('getVoters',         d||{});                   },
  saveVoter:               function(d)              { return API.call('saveVoter',         d);                       },
  deleteVoter:             function(d)              { return API.call('deleteVoter',       typeof d==='string'?{id:d}:d); },
  importVoters:            function(d)              { return API.call('importVoters',      typeof d==='object'&&d.voters?d:{voters:d}); },
  getUrnas:                function()               { return API.call('getUrnas');                                   },
  saveUrna:                function(d)              { return API.call('saveUrna',          d);                       },
  deleteUrna:              function(id)             { return API.call('deleteUrna',        {id:id});                 },
  toggleUrna:              function(id,activo)      { return API.call('toggleUrna',        {id:id,activo:activo});   },
  toggleSector:            function(sector,activo)  { return API.call('toggleSector',      {sector:sector,activo:activo}); },
  getLocations:            function(eId)            { return API.call('getLocations',      eId?{eleccionId:eId}:{});  },
  saveLocation:            function(d)              { return API.call('saveLocation',      d);                       },
  deleteLocation:          function(id)             { return API.call('deleteLocation',    {id:id});                 },
  getUsers:                function()               { return API.call('getUsers');                                   },
  saveUser:                function(d)              { return API.call('saveUser',          d);                       },
  deleteUser:              function(id)             { return API.call('deleteUser',        {id:id});                 },
  toggleUser:              function(id,activo)      { return API.call('toggleUser',        {id:id,activo:activo});   },
  registerVote:            function(d)              { return API.call('registerVote',      d);                       },
  checkVoterID:            function(ident,elecId)   { return API.call('checkVoterID',      {identificador:ident, eleccionId:elecId}); },
  getVoterByID:            function(ident)          { return API.call('getVoterByID',      {identificador:ident});   },
  getResults:              function(eleccionId)     { return API.call('getResults',        {eleccionId:eleccionId}); },
  getAudit:                function(d)              { return API.call('getAudit',          d);                       },
};

// ===== UTILIDADES =====
function sleep(ms) { return new Promise(function(r){ setTimeout(r,ms); }); }
function el(id) { return document.getElementById(id); }
function qs(s,p) { return (p||document).querySelector(s); }
function qsAll(s,p) { return Array.from((p||document).querySelectorAll(s)); }

function sanitize(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

function formatTimeSV(v) {
  if (!v) return '-';
  try {
    var s = String(v).trim();
    // Si ya parece fecha formateada de Sheets (ej: "15/01/2026, 08:30:00") devolverla limpia
    if (/^\d{2}\/\d{2}\/\d{4},?\s\d{2}:\d{2}/.test(s)) return s.replace(',','');
    // datetime-local viene sin timezone (ej: "2026-01-15T08:30") — forzar zona SV
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) s = s + ':00';
    var d = new Date(s);
    if (isNaN(d.getTime())) return String(v);
    return d.toLocaleString('es-SV',{
      timeZone:'America/El_Salvador', year:'numeric', month:'2-digit',
      day:'2-digit', hour:'2-digit', minute:'2-digit', hour12:false
    });
  } catch(e) { return String(v); }
}

function showLoading(msg) {
  msg = msg || 'Procesando...';
  var o = el('global-loading');
  if (!o) {
    o = document.createElement('div');
    o.id = 'global-loading';
    o.className = 'overlay-loading';
    o.innerHTML = '<div class="spinner"></div><p style="color:var(--primary-dark);font-weight:600;margin-top:12px"></p>';
    document.body.appendChild(o);
  }
  var p = o.querySelector('p');
  if (p) p.textContent = msg;
  o.style.display = 'flex';
}
function hideLoading() {
  var o = el('global-loading');
  if (o) o.style.display = 'none';
}

function showToast(msg, type, dur) {
  type = type || 'info'; dur = dur || 4000;
  var c = el('toast-container');
  if (!c) {
    c = document.createElement('div');
    c.id = 'toast-container'; c.className = 'toast-container';
    document.body.appendChild(c);
  }
  var t = document.createElement('div');
  var icons = {success:'✅', error:'❌', warning:'⚠️', info:'ℹ️'};
  t.className = 'toast toast-' + type;
  t.innerHTML = '<span>' + (icons[type]||'ℹ️') + '</span><span style="margin-left:8px">' + sanitize(msg) + '</span>';
  t.onclick = function(){ t.remove(); };
  c.appendChild(t);
  setTimeout(function(){
    t.style.opacity = '0'; t.style.transform = 'translateX(80px)';
    t.style.transition = 'all 0.3s ease';
    setTimeout(function(){ if (t.parentNode) t.remove(); }, 300);
  }, dur);
}

function showConfirmModal(title, msg, onConfirm, danger) {
  var old = el('confirm-modal'); if (old) old.remove();
  var m = document.createElement('div');
  m.id = 'confirm-modal'; m.className = 'modal-overlay';
  m.innerHTML =
    '<div class="modal-box" style="max-width:420px">' +
    '<div class="modal-header">' +
      '<h3 class="modal-title">' + sanitize(title) + '</h3>' +
      '<button class="modal-close" onclick="document.getElementById(\'confirm-modal\').remove()">✕</button>' +
    '</div>' +
    '<div class="modal-body"><p style="color:var(--text-secondary);line-height:1.6">' + sanitize(msg) + '</p></div>' +
    '<div class="modal-footer">' +
      '<button class="btn btn-ghost" onclick="document.getElementById(\'confirm-modal\').remove()">Cancelar</button>' +
      '<button class="btn ' + (danger?'btn-danger':'btn-primary') + '" id="confirm-action-btn">Confirmar</button>' +
    '</div></div>';
  document.body.appendChild(m);
  document.getElementById('confirm-action-btn').onclick = function(){ m.remove(); onConfirm(); };
  m.onclick = function(e){ if (e.target===m) m.remove(); };
}

function statusBadge(status) {
  var map = {
    active:   {t:'Activa',    c:'status-active'},
    scheduled:{t:'Programada',c:'status-scheduled'},
    paused:   {t:'Pausada',   c:'status-paused'},
    ended:    {t:'Finalizada',c:'status-ended'},
    inactive: {t:'Inactiva',  c:'status-inactive'}
  };
  var s = map[status] || map.inactive;
  return '<span class="header-status-badge ' + s.c + '">' + s.t + '</span>';
}
function statusLabel(status) {
  var map = {active:'Activa',scheduled:'Programada',paused:'Pausada',ended:'Finalizada',inactive:'Inactiva'};
  return map[status]||'Inactiva';
}

function updateSidebarFooter() {
  var cfg = AppState.config || {};
  var year = new Date().getFullYear();
  var ye = el('sidebar-year'); if (ye) ye.textContent = year;
  var fl = el('sidebar-footer-logo');
  if (fl) fl.innerHTML = cfg.logoUrl
    ? '<img src="'+cfg.logoUrl+'" style="width:40px;height:40px;border-radius:50%;object-fit:contain" onerror="this.parentElement.textContent=\'🏫\'">'
    : '🏫';
  var ft = qs('.sidebar-footer-text');
  if (ft) ft.innerHTML = '&copy; '+year+' '+sanitize(cfg.institutionName||'Institucion')+'<br>Todos los derechos reservados';
}

function updateHeaderDisplay() {
  var cfg = AppState.config || {};
  qsAll('.header-institution').forEach(function(e){ e.textContent = cfg.institutionName||'Institucion Educativa'; });
  qsAll('.header-election-name').forEach(function(e){ e.textContent = (AppState.currentElection&&AppState.currentElection.nombre)||''; });
  var _elecForHeader = AppState.currentElection;
  if (_elecForHeader && typeof resolveElectionState === 'function') _elecForHeader = resolveElectionState(_elecForHeader);
  qsAll('.header-status-area').forEach(function(e){ e.innerHTML = statusBadge((_elecForHeader&&_elecForHeader.estado)||'inactive'); });
  var pairs = [['admin-header-logo','admin-header-placeholder'],['results-header-logo','results-header-placeholder'],['urna-header-logo','urna-header-placeholder']];
  pairs.forEach(function(p){
    var img=el(p[0]), ph=el(p[1]);
    if (cfg.logoUrl){ if(img){img.src=cfg.logoUrl;img.style.display='';} if(ph)ph.style.display='none'; }
    else { if(img)img.style.display='none'; if(ph)ph.style.display=''; }
  });
  var li=el('login-institution-name'), ll=el('login-logo-img'), lp=el('login-logo-placeholder');
  if (li) li.textContent = cfg.institutionName||'Institucion Educativa';
  if (cfg.logoUrl){ if(ll){ll.src=cfg.logoUrl;ll.style.display='';} if(lp)lp.style.display='none'; }
  updateSidebarFooter();
}

async function exportToPDF(title, htmlContent) {
  var win = window.open('','_blank');
  if (!win) {
    // Ventanas emergentes bloqueadas — mostrar instrucciones claras
    var msg = document.createElement('div');
    msg.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#F57F17;color:#fff;padding:16px 20px;z-index:9999;font-size:.92rem;display:flex;align-items:center;justify-content:space-between;box-shadow:0 2px 8px rgba(0,0,0,.3)';
    msg.innerHTML = '<span>⚠️ <strong>Ventanas emergentes bloqueadas.</strong> Para descargar el PDF: haz clic en el ícono 🚫 o ⊕ en la barra de dirección del navegador → "Permitir siempre ventanas emergentes de este sitio" → intenta de nuevo.</span><button onclick="this.parentElement.remove()" style="background:rgba(255,255,255,.3);border:none;color:#fff;padding:6px 12px;border-radius:6px;cursor:pointer;margin-left:16px;font-weight:700">✕ Cerrar</button>';
    document.body.appendChild(msg);
    setTimeout(function(){ if(msg.parentNode) msg.remove(); }, 12000);
    return;
  }
  win.document.write(
    '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>'+sanitize(title)+'</title>'+
    '<style>body{font-family:Arial,sans-serif;margin:30px;color:#1a1a1a;font-size:12px;}'+
    'h1{color:#1565C0;border-bottom:3px solid #1565C0;padding-bottom:10px;font-size:20px;}'+
    'h2{color:#1565C0;font-size:15px;margin-top:20px;}'+
    'table{width:100%;border-collapse:collapse;margin:10px 0;}'+
    'th{background:#1565C0;color:#fff;padding:8px;text-align:left;font-size:11px;}'+
    'td{padding:7px 8px;border-bottom:1px solid #eee;font-size:11px;}'+
    'tr:nth-child(even){background:#f5f8ff;}'+
    '.stat-box{display:inline-block;padding:10px 16px;margin:5px;border:1px solid #ddd;border-radius:8px;text-align:center;min-width:100px;}'+
    '.stat-val{font-size:22px;font-weight:bold;color:#1565C0;}'+
    '.stat-lbl{font-size:10px;color:#666;}'+
    '@media print{body{margin:15px;}}</style></head><body>'+
    htmlContent+
    '<div style="margin-top:30px;border-top:1px solid #ddd;padding-top:10px;font-size:10px;color:#999;text-align:center">Sistema de Votacion Institucional</div>'+
    '<scr'+'ipt>window.onload=function(){window.print();}</scr'+'ipt>'+
    '</body></html>'
  );
  win.document.close();
}
