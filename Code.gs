/**
 * ============================================================
 * SISTEMA DE VOTACIÓN INSTITUCIONAL - Google Apps Script
 * Backend: Manejo seguro de votos, concurrencia, validaciones
 * ============================================================
 * INSTRUCCIONES DE DESPLIEGUE:
 * 1. Abrir Google Sheets > Extensiones > Apps Script
 * 2. Pegar este código completo en Code.gs
 * 3. Guardar y desplegar como "Aplicación web"
 *    - Ejecutar como: Yo (la cuenta propietaria)
 *    - Quién tiene acceso: Cualquier persona
 * 4. Copiar la URL de despliegue en config.js (APPS_SCRIPT_URL)
 * ============================================================
 */

// ===== CONFIGURACIÓN DE HOJAS =====
const SHEET_VOTES   = 'VOTOS';
const SHEET_BACKUP  = 'VOTOS_BACKUP';
const SHEET_CONFIG  = 'CONFIGURACION';
const SHEET_USERS   = 'USUARIOS';
const SHEET_CANDS   = 'CANDIDATOS';
const SHEET_SECTIONS= 'SECCIONES';
const SHEET_URNAS   = 'URNAS';
const SHEET_LOCS    = 'UBICACIONES';

// Clave secreta para verificar peticiones (debe coincidir con config.js)
const API_SECRET = 'SV_VOTING_SECRET_2024_CHANGE_ME';

// ===== PUNTO DE ENTRADA PRINCIPAL =====
function doPost(e) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  try {
    const body = JSON.parse(e.postData.contents);
    
    // Verificar clave secreta
    if (body.secret !== API_SECRET) {
      return buildResponse({ ok: false, error: 'Unauthorized' }, headers);
    }

    let result;
    switch (body.action) {
      case 'registerVote':    result = registerVote(body.data);    break;
      case 'checkNIE':        result = checkNIE(body.data);        break;
      case 'getConfig':       result = getConfig();                break;
      case 'saveConfig':      result = saveConfig(body.data);      break;
      case 'getUsers':        result = getUsers();                 break;
      case 'saveUser':        result = saveUser(body.data);        break;
      case 'deleteUser':      result = deleteUser(body.data);      break;
      case 'getCandidates':   result = getCandidates();            break;
      case 'saveCandidate':   result = saveCandidate(body.data);   break;
      case 'deleteCandidate': result = deleteCandidate(body.data); break;
      case 'getSections':     result = getSections();              break;
      case 'saveSection':     result = saveSection(body.data);     break;
      case 'deleteSection':   result = deleteSection(body.data);   break;
      case 'getUrnas':        result = getUrnas();                 break;
      case 'saveUrna':        result = saveUrna(body.data);        break;
      case 'toggleUrna':      result = toggleUrna(body.data);      break;
      case 'toggleSector':    result = toggleSector(body.data);    break;
      case 'getLocations':    result = getLocations();             break;
      case 'saveLocation':    result = saveLocation(body.data);    break;
      case 'deleteLocation':  result = deleteLocation(body.data);  break;
      case 'getResults':      result = getResults();               break;
      case 'setElectionStatus': result = setElectionStatus(body.data); break;
      case 'authenticate':    result = authenticate(body.data);    break;
      default: result = { ok: false, error: 'Unknown action' };
    }

    return buildResponse(result, headers);

  } catch(err) {
    return buildResponse({ ok: false, error: err.message }, headers);
  }
}

function doGet(e) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };
  if (e.parameter.action === 'health') {
    return buildResponse({ ok: true, status: 'online' }, headers);
  }
  return buildResponse({ ok: false, error: 'Use POST' }, headers);
}

function buildResponse(data, headers) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ===== HELPERS =====
function getSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    initSheet(sheet, name);
  }
  return sheet;
}

function initSheet(sheet, name) {
  const headers = {
    [SHEET_VOTES]:    ['ID','NIE','NOMBRE','APELLIDO','SECCION','LISTA','CANDIDATO_ID','CANDIDATO_NOMBRE','URNA_ID','URNA_NOMBRE','UBICACION','SECTOR','TIMESTAMP','IP'],
    [SHEET_BACKUP]:   ['ID','NIE','NOMBRE','APELLIDO','SECCION','LISTA','CANDIDATO_ID','CANDIDATO_NOMBRE','URNA_ID','URNA_NOMBRE','UBICACION','SECTOR','TIMESTAMP','IP'],
    [SHEET_CONFIG]:   ['CLAVE','VALOR'],
    [SHEET_USERS]:    ['ID','USERNAME','PASSWORD_HASH','ROLE','NOMBRE','URNA_ID','ACTIVO'],
    [SHEET_CANDS]:    ['ID','NOMBRE','SECCION','CARGO','FOTO_URL','ACTIVO'],
    [SHEET_SECTIONS]: ['ID','NOMBRE','ACTIVO'],
    [SHEET_URNAS]:    ['ID','NOMBRE','UBICACION','SECTOR','USERNAME','PASSWORD_HASH','ACTIVO'],
    [SHEET_LOCS]:     ['ID','NOMBRE','TIPO','ACTIVO'],
  };
  if (headers[name]) {
    sheet.getRange(1, 1, 1, headers[name].length).setValues([headers[name]]);
    sheet.getRange(1, 1, 1, headers[name].length)
      .setBackground('#1565C0')
      .setFontColor('#FFFFFF')
      .setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
}

function generateId() {
  return Utilities.getUuid().replace(/-/g,'').substring(0,16).toUpperCase();
}

function hashPassword(password) {
  const hash = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    password + 'SV_SALT_2024'
  );
  return hash.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
}

function getElSalvadorTime() {
  const date = new Date();
  const formatter = new Intl.DateTimeFormat('es-SV', {
    timeZone: 'America/El_Salvador',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false
  });
  return formatter.format(date);
}

// ===== AUTENTICACIÓN =====
function authenticate(data) {
  const { username, password } = data;
  const passHash = hashPassword(password);

  // Verificar admin / resultados en tabla usuarios
  const sheet = getSheet(SHEET_USERS);
  const rows = sheet.getDataRange().getValues();
  
  for (let i = 1; i < rows.length; i++) {
    const [id, uname, pHash, role, nombre, urnaId, activo] = rows[i];
    if (uname === username && pHash === passHash && activo === true) {
      if (role === 'URNA') {
        // Verificar que urna esté activa
        const urnaData = getUrnaById(urnaId);
        if (!urnaData || !urnaData.activo) {
          return { ok: false, error: 'Esta urna está desactivada' };
        }
        return { ok: true, role, nombre, urnaId, urnaData };
      }
      return { ok: true, role, nombre, userId: id };
    }
  }
  return { ok: false, error: 'Credenciales inválidas' };
}

function getUrnaById(id) {
  const sheet = getSheet(SHEET_URNAS);
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    const [uid, nombre, ubicacion, sector, username, passHash, activo] = rows[i];
    if (uid === id) return { id: uid, nombre, ubicacion, sector, activo: activo === true };
  }
  return null;
}

// ===== REGISTRO DE VOTOS CON LOCK =====
function registerVote(data) {
  const lock = LockService.getScriptLock();
  
  try {
    // Intentar obtener el lock hasta 30 segundos
    lock.waitLock(30000);

    // Verificar estado de votación
    const electionStatus = getConfigValue('ELECTION_STATUS');
    if (electionStatus !== 'active') {
      return { ok: false, error: `La votación está ${electionStatus || 'inactiva'}` };
    }

    // Verificar tiempo automático
    const autoCheck = checkElectionTime();
    if (!autoCheck.canVote) {
      return { ok: false, error: autoCheck.message };
    }

    // Verificar que la urna esté activa
    const urnaData = getUrnaById(data.urnaId);
    if (!urnaData || !urnaData.activo) {
      return { ok: false, error: 'Esta urna está desactivada' };
    }

    // Verificar NIE duplicado (búsqueda rápida en columna 1)
    const sheet = getSheet(SHEET_VOTES);
    const nies = sheet.getRange(2, 2, Math.max(sheet.getLastRow() - 1, 1), 1).getValues().flat();
    
    if (nies.includes(data.nie)) {
      return { ok: false, error: 'Este NIE ya votó anteriormente', duplicate: true };
    }

    // Registrar voto
    const id = generateId();
    const timestamp = getElSalvadorTime();

    const voteRow = [
      id,
      data.nie,
      data.nombre,
      data.apellido,
      data.seccion,
      data.lista,
      data.candidatoId,
      data.candidatoNombre,
      data.urnaId,
      urnaData.nombre,
      urnaData.ubicacion,
      urnaData.sector,
      timestamp,
      data.ip || ''
    ];

    // Registrar en hoja principal
    sheet.appendRow(voteRow);

    // Registrar en hoja de respaldo
    const backup = getSheet(SHEET_BACKUP);
    backup.appendRow(voteRow);

    return { ok: true, id, timestamp };

  } catch(err) {
    if (err.message.includes('Timeout')) {
      return { ok: false, error: 'Sistema ocupado, intenta de nuevo en segundos' };
    }
    return { ok: false, error: err.message };
  } finally {
    try { lock.releaseLock(); } catch(e) {}
  }
}

// ===== VERIFICAR NIE =====
function checkNIE(data) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sheet = getSheet(SHEET_VOTES);
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return { ok: true, exists: false };
    const nies = sheet.getRange(2, 2, lastRow - 1, 1).getValues().flat();
    return { ok: true, exists: nies.includes(data.nie) };
  } finally {
    try { lock.releaseLock(); } catch(e) {}
  }
}

// ===== TIEMPO DE ELECCIÓN =====
function checkElectionTime() {
  const startTime = getConfigValue('ELECTION_START_TIME');
  const endTime   = getConfigValue('ELECTION_END_TIME');
  const status    = getConfigValue('ELECTION_STATUS');

  if (status === 'paused') return { canVote: false, message: 'La votación está pausada' };
  if (status === 'ended')  return { canVote: false, message: 'La votación ha finalizado' };

  const now = new Date();
  const svNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/El_Salvador' }));

  if (startTime && status === 'scheduled') {
    const start = new Date(startTime);
    if (svNow < start) return { canVote: false, message: 'La votación aún no ha comenzado' };
    // Auto-activar
    setConfigValue('ELECTION_STATUS', 'active');
  }

  if (endTime && status === 'active') {
    const end = new Date(endTime);
    if (svNow > end) {
      setConfigValue('ELECTION_STATUS', 'ended');
      return { canVote: false, message: 'La votación ha finalizado' };
    }
  }

  return { canVote: true };
}

// ===== RESULTADOS =====
function getResults() {
  const votes = getSheet(SHEET_VOTES);
  const lastRow = votes.getLastRow();
  
  const allCandidates = getCandidates().data || [];
  const allUrnas = getUrnas().data || [];
  const config = getConfig().data || {};

  if (lastRow < 2) {
    return {
      ok: true,
      data: {
        totalVotes: 0,
        byCandidate: {},
        byUrna: {},
        bySector: {},
        config,
        allCandidates,
        allUrnas,
        activeUrnas: allUrnas.filter(u => u.activo).length
      }
    };
  }

  const rows = votes.getRange(2, 1, lastRow - 1, 14).getValues();
  
  const byCandidate = {};
  const byUrna = {};
  const bySector = {};

  rows.forEach(row => {
    const [id, nie, nombre, apellido, seccion, lista, candId, candNombre, urnaId, urnaNombre, ubicacion, sector, timestamp] = row;
    
    // Por candidato
    if (!byCandidate[candId]) byCandidate[candId] = { id: candId, nombre: candNombre, count: 0 };
    byCandidate[candId].count++;

    // Por urna
    if (!byUrna[urnaId]) byUrna[urnaId] = { id: urnaId, nombre: urnaNombre, count: 0 };
    byUrna[urnaId].count++;

    // Por sector
    const sectorKey = sector || ubicacion || 'Sin sector';
    if (!bySector[sectorKey]) bySector[sectorKey] = { nombre: sectorKey, count: 0 };
    bySector[sectorKey].count++;
  });

  return {
    ok: true,
    data: {
      totalVotes: rows.length,
      byCandidate,
      byUrna,
      bySector,
      config,
      allCandidates,
      allUrnas,
      activeUrnas: allUrnas.filter(u => u.activo).length
    }
  };
}

// ===== CONFIGURACIÓN =====
function getConfig() {
  const sheet = getSheet(SHEET_CONFIG);
  const rows = sheet.getDataRange().getValues();
  const data = {};
  rows.slice(1).forEach(([k, v]) => { if(k) data[k] = v; });
  return { ok: true, data };
}

function saveConfig(data) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    Object.entries(data).forEach(([k, v]) => setConfigValue(k, v));
    return { ok: true };
  } finally {
    try { lock.releaseLock(); } catch(e) {}
  }
}

function getConfigValue(key) {
  const sheet = getSheet(SHEET_CONFIG);
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === key) return rows[i][1];
  }
  return null;
}

function setConfigValue(key, value) {
  const sheet = getSheet(SHEET_CONFIG);
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === key) {
      sheet.getRange(i + 1, 2).setValue(value);
      return;
    }
  }
  sheet.appendRow([key, value]);
}

// ===== ESTADO DE ELECCIÓN =====
function setElectionStatus(data) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    setConfigValue('ELECTION_STATUS', data.status);
    if (data.startTime) setConfigValue('ELECTION_START_TIME', data.startTime);
    if (data.endTime)   setConfigValue('ELECTION_END_TIME', data.endTime);
    return { ok: true };
  } finally {
    try { lock.releaseLock(); } catch(e) {}
  }
}

// ===== USUARIOS =====
function getUsers() {
  const sheet = getSheet(SHEET_USERS);
  const rows = sheet.getDataRange().getValues();
  const data = rows.slice(1).map(([id, username, passHash, role, nombre, urnaId, activo]) => ({
    id, username, role, nombre, urnaId, activo: activo === true
  }));
  return { ok: true, data };
}

function saveUser(data) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sheet = getSheet(SHEET_USERS);
    const rows = sheet.getDataRange().getValues();

    // Verificar username único
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][1] === data.username && rows[i][0] !== data.id) {
        return { ok: false, error: 'El nombre de usuario ya existe' };
      }
    }

    if (data.id) {
      // Actualizar
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === data.id) {
          const passHash = data.password ? hashPassword(data.password) : rows[i][2];
          sheet.getRange(i + 1, 1, 1, 7).setValues([[
            data.id, data.username, passHash, data.role, data.nombre, data.urnaId || '', data.activo !== false
          ]]);
          return { ok: true };
        }
      }
    }

    // Crear nuevo
    const id = generateId();
    const passHash = hashPassword(data.password);
    sheet.appendRow([id, data.username, passHash, data.role, data.nombre, data.urnaId || '', true]);
    return { ok: true, id };
  } finally {
    try { lock.releaseLock(); } catch(e) {}
  }
}

function deleteUser(data) {
  const sheet = getSheet(SHEET_USERS);
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.id) {
      sheet.deleteRow(i + 1);
      return { ok: true };
    }
  }
  return { ok: false, error: 'Usuario no encontrado' };
}

// ===== CANDIDATOS =====
function getCandidates() {
  const sheet = getSheet(SHEET_CANDS);
  const rows = sheet.getDataRange().getValues();
  const data = rows.slice(1).map(([id, nombre, seccion, cargo, fotoUrl, activo]) => ({
    id, nombre, seccion, cargo, fotoUrl, activo: activo === true
  }));
  return { ok: true, data };
}

function saveCandidate(data) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sheet = getSheet(SHEET_CANDS);
    const rows = sheet.getDataRange().getValues();

    if (data.id) {
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === data.id) {
          sheet.getRange(i + 1, 1, 1, 6).setValues([[
            data.id, data.nombre, data.seccion, data.cargo, data.fotoUrl || '', data.activo !== false
          ]]);
          return { ok: true };
        }
      }
    }

    const id = generateId();
    sheet.appendRow([id, data.nombre, data.seccion, data.cargo, data.fotoUrl || '', true]);
    return { ok: true, id };
  } finally {
    try { lock.releaseLock(); } catch(e) {}
  }
}

function deleteCandidate(data) {
  const sheet = getSheet(SHEET_CANDS);
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.id) { sheet.deleteRow(i + 1); return { ok: true }; }
  }
  return { ok: false, error: 'Candidato no encontrado' };
}

// ===== SECCIONES =====
function getSections() {
  const sheet = getSheet(SHEET_SECTIONS);
  const rows = sheet.getDataRange().getValues();
  const data = rows.slice(1).map(([id, nombre, activo]) => ({ id, nombre, activo: activo === true }));
  return { ok: true, data };
}

function saveSection(data) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sheet = getSheet(SHEET_SECTIONS);
    const rows = sheet.getDataRange().getValues();

    if (data.id) {
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === data.id) {
          sheet.getRange(i + 1, 1, 1, 3).setValues([[data.id, data.nombre, data.activo !== false]]);
          return { ok: true };
        }
      }
    }

    const id = generateId();
    sheet.appendRow([id, data.nombre, true]);
    return { ok: true, id };
  } finally {
    try { lock.releaseLock(); } catch(e) {}
  }
}

function deleteSection(data) {
  const sheet = getSheet(SHEET_SECTIONS);
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.id) { sheet.deleteRow(i + 1); return { ok: true }; }
  }
  return { ok: false, error: 'Sección no encontrada' };
}

// ===== URNAS =====
function getUrnas() {
  const sheet = getSheet(SHEET_URNAS);
  const rows = sheet.getDataRange().getValues();
  const data = rows.slice(1).map(([id, nombre, ubicacion, sector, username, passHash, activo]) => ({
    id, nombre, ubicacion, sector, username, activo: activo === true
  }));
  return { ok: true, data };
}

function saveUrna(data) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sheet = getSheet(SHEET_URNAS);
    const rows = sheet.getDataRange().getValues();

    // Verificar username único
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][4] === data.username && rows[i][0] !== data.id) {
        return { ok: false, error: 'El nombre de usuario ya existe' };
      }
    }

    if (data.id) {
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === data.id) {
          const passHash = data.password ? hashPassword(data.password) : rows[i][5];
          sheet.getRange(i + 1, 1, 1, 7).setValues([[
            data.id, data.nombre, data.ubicacion, data.sector, data.username, passHash, data.activo !== false
          ]]);
          // Sincronizar usuario de urna
          syncUrnaUser(data.id, data.username, data.password ? hashPassword(data.password) : null, data.nombre, data.activo !== false);
          return { ok: true };
        }
      }
    }

    const id = generateId();
    const passHash = hashPassword(data.password);
    sheet.appendRow([id, data.nombre, data.ubicacion, data.sector, data.username, passHash, true]);
    // Crear usuario automático
    syncUrnaUser(id, data.username, passHash, data.nombre, true);
    return { ok: true, id };
  } finally {
    try { lock.releaseLock(); } catch(e) {}
  }
}

function syncUrnaUser(urnaId, username, passHash, nombre, activo) {
  const sheet = getSheet(SHEET_USERS);
  const rows = sheet.getDataRange().getValues();
  
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][5] === urnaId) {
      const ph = passHash || rows[i][2];
      sheet.getRange(i + 1, 1, 1, 7).setValues([[
        rows[i][0], username, ph, 'URNA', nombre, urnaId, activo
      ]]);
      return;
    }
  }
  
  const id = generateId();
  sheet.appendRow([id, username, passHash || '', 'URNA', nombre, urnaId, activo]);
}

function toggleUrna(data) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sheet = getSheet(SHEET_URNAS);
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === data.id) {
        const newStatus = data.activo !== undefined ? data.activo : !rows[i][6];
        sheet.getRange(i + 1, 7).setValue(newStatus);
        syncUrnaUser(data.id, rows[i][4], null, rows[i][1], newStatus);
        return { ok: true };
      }
    }
    return { ok: false, error: 'Urna no encontrada' };
  } finally {
    try { lock.releaseLock(); } catch(e) {}
  }
}

function toggleSector(data) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sheet = getSheet(SHEET_URNAS);
    const rows = sheet.getDataRange().getValues();
    let count = 0;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][3] === data.sector || rows[i][2] === data.sector) {
        sheet.getRange(i + 1, 7).setValue(data.activo);
        syncUrnaUser(rows[i][0], rows[i][4], null, rows[i][1], data.activo);
        count++;
      }
    }
    return { ok: true, count };
  } finally {
    try { lock.releaseLock(); } catch(e) {}
  }
}

// ===== UBICACIONES =====
function getLocations() {
  const sheet = getSheet(SHEET_LOCS);
  const rows = sheet.getDataRange().getValues();
  const data = rows.slice(1).map(([id, nombre, tipo, activo]) => ({ id, nombre, tipo, activo: activo === true }));
  return { ok: true, data };
}

function saveLocation(data) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sheet = getSheet(SHEET_LOCS);
    const rows = sheet.getDataRange().getValues();

    if (data.id) {
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === data.id) {
          sheet.getRange(i + 1, 1, 1, 4).setValues([[data.id, data.nombre, data.tipo || '', data.activo !== false]]);
          return { ok: true };
        }
      }
    }

    const id = generateId();
    sheet.appendRow([id, data.nombre, data.tipo || '', true]);
    return { ok: true, id };
  } finally {
    try { lock.releaseLock(); } catch(e) {}
  }
}

function deleteLocation(data) {
  const sheet = getSheet(SHEET_LOCS);
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.id) { sheet.deleteRow(i + 1); return { ok: true }; }
  }
  return { ok: false, error: 'Ubicación no encontrada' };
}

// ===== INICIALIZAR TODAS LAS HOJAS =====
function initializeAllSheets() {
  const names = [SHEET_VOTES, SHEET_BACKUP, SHEET_CONFIG, SHEET_USERS, SHEET_CANDS, SHEET_SECTIONS, SHEET_URNAS, SHEET_LOCS];
  names.forEach(name => getSheet(name));
  
  // Crear admin por defecto si no existe
  const userSheet = getSheet(SHEET_USERS);
  if (userSheet.getLastRow() < 2) {
    const passHash = hashPassword('admin2024');
    userSheet.appendRow([generateId(), 'admin', passHash, 'ADMIN', 'Administrador', '', true]);
  }

  // Config por defecto
  const defaults = {
    INSTITUTION_NAME: 'Institución Educativa',
    ELECTION_NAME: 'Elecciones Estudiantiles 2024',
    ELECTION_STATUS: 'inactive',
    LOGO_URL: ''
  };
  Object.entries(defaults).forEach(([k, v]) => {
    if (!getConfigValue(k)) setConfigValue(k, v);
  });

  return { ok: true, message: 'Sistema inicializado correctamente' };
}
