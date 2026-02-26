/**
 * ============================================================
 * SISTEMA DE VOTACIÓN INSTITUCIONAL v2.0
 * Google Apps Script - Backend Completo
 * ============================================================
 */

// ===== HOJAS FIJAS =====
const SHEET_CONFIG    = 'CONFIGURACION';
const SHEET_USERS     = 'USUARIOS';
const SHEET_SECTIONS  = 'SECCIONES';
const SHEET_URNAS     = 'URNAS';
const SHEET_LOCS      = 'UBICACIONES';
const SHEET_VOTERS    = 'PADRON';
const SHEET_ELECTIONS = 'ELECCIONES';
const SHEET_AUDIT     = 'AUDITORIA';
const SHEET_POSITIONS = 'CARGOS';
const SHEET_CANDS     = 'CANDIDATOS';
const SHEET_ID_TYPES  = 'TIPOS_IDENTIFICACION';

// ===== CLAVE SECRETA =====
const API_SECRET = 'VOTACION_MSSV_2026';

// ===== PUNTO DE ENTRADA =====
function doPost(e) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
  try {
    let body;
    const raw = e.postData.contents;
    if (raw.startsWith('payload=')) {
      body = JSON.parse(decodeURIComponent(raw.replace('payload=', '').replace(/\+/g, ' ')));
    } else {
      body = JSON.parse(raw);
    }
    if (body.secret !== API_SECRET) return buildResponse({ ok: false, error: 'Unauthorized' }, headers);

    let result;
    switch (body.action) {
      // Auth
      case 'authenticate':       result = authenticate(body.data);       break;
      // Config
      case 'getConfig':          result = getConfig();                   break;
      case 'saveConfig':         result = saveConfig(body.data);         break;
      // Elections
      case 'getElections':       result = getElections();                break;
      case 'saveElection':       result = saveElection(body.data);       break;
      case 'setElectionStatus':  result = setElectionStatus(body.data);  break;
      case 'getElectionDetail':  result = getElectionDetail(body.data);  break;
      // Positions
      case 'getPositions':       result = getPositions(body.data);       break;
      case 'savePosition':       result = savePosition(body.data);       break;
      case 'deletePosition':     result = deletePosition(body.data);     break;
      // Candidates
      case 'getCandidates':      result = getCandidates(body.data);      break;
      case 'saveCandidate':      result = saveCandidate(body.data);      break;
      case 'deleteCandidate':    result = deleteCandidate(body.data);    break;
      // Sections
      case 'getSections':        result = getSections();                 break;
      case 'saveSection':        result = saveSection(body.data);        break;
      case 'deleteSection':      result = deleteSection(body.data);      break;
      // Voters (padron)
      case 'getVoters':          result = getVoters(body.data);          break;
      case 'saveVoter':          result = saveVoter(body.data);          break;
      case 'deleteVoter':        result = deleteVoter(body.data);        break;
      case 'importVoters':       result = importVoters(body.data);       break;
      // Urnas
      case 'getUrnas':           result = getUrnas();                    break;
      case 'saveUrna':           result = saveUrna(body.data);           break;
      case 'deleteUrna':         result = deleteUrna(body.data);         break;
      case 'toggleUrna':         result = toggleUrna(body.data);         break;
      case 'toggleSector':       result = toggleSector(body.data);       break;
      // Locations
      case 'getLocations':       result = getLocations();                break;
      case 'saveLocation':       result = saveLocation(body.data);       break;
      case 'deleteLocation':     result = deleteLocation(body.data);     break;
      // Users
      case 'getUsers':           result = getUsers();                    break;
      case 'saveUser':           result = saveUser(body.data);           break;
      case 'deleteUser':         result = deleteUser(body.data);         break;
      case 'toggleUser':         result = toggleUser(body.data);         break;
      // Votes
      case 'registerVote':       result = registerVote(body.data);       break;
      case 'checkVoterID':       result = checkVoterID(body.data);       break;
      case 'getVoterByID':       result = getVoterByID(body.data);       break;
      // Results
      case 'getResults':         result = getResults(body.data);         break;
      case 'toggleResultsVisibility': result = toggleResultsVisibility(body.data); break;
      // Audit
      case 'getAudit':           result = getAudit(body.data);           break;
      // Init
      case 'initializeSystem':   result = initializeAllSheets();         break;
      default: result = { ok: false, error: 'Unknown action' };
    }
    return buildResponse(result, headers);
  } catch(err) {
    return buildResponse({ ok: false, error: err.message }, headers);
  }
}

function doGet(e) {
  if (e.parameter.action === 'health') return buildResponse({ ok: true, status: 'online' });
  return buildResponse({ ok: false, error: 'Use POST' });
}

function buildResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

// ===== HELPERS =====
function getSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) { sheet = ss.insertSheet(name); initSheetHeaders(sheet, name); }
  return sheet;
}

function initSheetHeaders(sheet, name) {
  const headers = {
    [SHEET_CONFIG]:    ['CLAVE','VALOR'],
    [SHEET_USERS]:     ['ID','USERNAME','PASSWORD_HASH','ROLE','NOMBRE','URNA_ID','ACTIVO'],
    [SHEET_SECTIONS]:  ['ID','NOMBRE','TIPO','ACTIVO'],
    [SHEET_URNAS]:     ['ID','NOMBRE','UBICACION','SECTOR','USERNAME','PASSWORD_HASH','ACTIVO','SECCIONES_PERMITIDAS'],
    [SHEET_LOCS]:      ['ID','NOMBRE','TIPO','ACTIVO'],
    [SHEET_VOTERS]:    ['ID','IDENTIFICADOR','APELLIDOS','NOMBRES','SECCION_ID','SECCION_NOMBRE','ACTIVO','FECHA_REGISTRO'],
    [SHEET_ELECTIONS]: ['ID','NOMBRE','DESCRIPCION','TIPO_ID','ESTADO','CLAVE_CONTROL','INICIO_PROGRAMADO','FIN_PROGRAMADO','CREADO','MOSTRAR_RESULTADOS','ID_CONFIG'],
    [SHEET_AUDIT]:     ['ID','ELECCION_ID','USUARIO','ACCION','DETALLE','TIMESTAMP'],
    [SHEET_POSITIONS]: ['ID','ELECCION_ID','NOMBRE','ORDEN','ACTIVO'],
    [SHEET_CANDS]:     ['ID','ELECCION_ID','POSICION_ID','POSICION_NOMBRE','NOMBRE','SECCION','FOTO_URL','ACTIVO'],
    [SHEET_ID_TYPES]:  ['ID','NOMBRE','PREFIJO','ACTIVO'],
  };
  if (headers[name]) {
    sheet.getRange(1,1,1,headers[name].length).setValues([headers[name]])
      .setBackground('#1565C0').setFontColor('#FFFFFF').setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
}

function getVoteSheet(electionId) {
  const sheetName = 'VOTOS_' + electionId;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    const headers = ['ID','IDENTIFICADOR','APELLIDOS','NOMBRES','SECCION','POSICION_ID','POSICION_NOMBRE','CANDIDATO_ID','CANDIDATO_NOMBRE','URNA_ID','URNA_NOMBRE','UBICACION','SECTOR','TIMESTAMP'];
    sheet.getRange(1,1,1,headers.length).setValues([headers])
      .setBackground('#1B5E20').setFontColor('#FFFFFF').setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getBackupSheet(electionId) {
  const sheetName = 'BACKUP_' + electionId;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    const headers = ['ID','IDENTIFICADOR','APELLIDOS','NOMBRES','SECCION','POSICION_ID','POSICION_NOMBRE','CANDIDATO_ID','CANDIDATO_NOMBRE','URNA_ID','URNA_NOMBRE','UBICACION','SECTOR','TIMESTAMP'];
    sheet.getRange(1,1,1,headers.length).setValues([headers])
      .setBackground('#B71C1C').setFontColor('#FFFFFF').setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function generateId() {
  return Utilities.getUuid().replace(/-/g,'').substring(0,16).toUpperCase();
}

function generateElectionKey() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let key = '';
  for (let i = 0; i < 12; i++) {
    if (i > 0 && i % 4 === 0) key += '-';
    key += chars[Math.floor(Math.random() * chars.length)];
  }
  return key;
}

function hashPassword(password) {
  const hash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password + 'SV_SALT_2024');
  return hash.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
}

function getSVTime() {
  return new Date().toLocaleString('es-SV', { timeZone: 'America/El_Salvador', year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false });
}

function addAudit(electionId, usuario, accion, detalle) {
  try {
    const sheet = getSheet(SHEET_AUDIT);
    sheet.appendRow([generateId(), electionId || '', usuario || 'SISTEMA', accion, detalle || '', getSVTime()]);
  } catch(e) {}
}

// ===== CONFIG =====
function getConfig() {
  const sheet = getSheet(SHEET_CONFIG);
  const rows = sheet.getDataRange().getValues();
  const data = {};
  rows.slice(1).forEach(([k,v]) => { if(k) data[k] = v; });
  return { ok: true, data };
}

function saveConfig(data) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    Object.entries(data).forEach(([k,v]) => setConfigValue(k,v));
    return { ok: true };
  } finally { try { lock.releaseLock(); } catch(e) {} }
}

function getConfigValue(key) {
  const sheet = getSheet(SHEET_CONFIG);
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) { if (rows[i][0] === key) return rows[i][1]; }
  return null;
}

function setConfigValue(key, value) {
  const sheet = getSheet(SHEET_CONFIG);
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === key) { sheet.getRange(i+1,2).setValue(value); return; }
  }
  sheet.appendRow([key, value]);
}

// ===== AUTENTICACIÓN =====
function authenticate(data) {
  const { username, password } = data;
  const passHash = hashPassword(password);
  const sheet = getSheet(SHEET_USERS);
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    const [id, uname, pHash, role, nombre, urnaId, activo] = rows[i];
    if (uname === username && pHash === passHash) {
      if (!activo) return { ok: false, error: 'Usuario desactivado. Contacta al administrador.' };
      if (role === 'URNA') {
        const urnaData = getUrnaById(urnaId);
        if (!urnaData || !urnaData.activo) return { ok: false, error: 'Esta urna está desactivada.' };
        return { ok: true, role, nombre, urnaId, urnaData };
      }
      return { ok: true, role, nombre, userId: id };
    }
  }
  return { ok: false, error: 'Usuario o contraseña incorrectos.' };
}

// ===== ELECCIONES =====
function getElections() {
  const sheet = getSheet(SHEET_ELECTIONS);
  const rows = sheet.getDataRange().getValues();
  const data = rows.slice(1).map(r => ({
    id: r[0], nombre: r[1], descripcion: r[2], tipoId: r[3],
    estado: r[4], claveControl: r[5], inicioProgramado: r[6],
    finProgramado: r[7], creado: r[8], mostrarResultados: r[9] === true, idConfig: r[10]
  }));
  return { ok: true, data };
}

function saveElection(data) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const sheet = getSheet(SHEET_ELECTIONS);
    const rows = sheet.getDataRange().getValues();

    if (data.id) {
      // Verificar clave de control
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === data.id) {
          if (data.claveControl && rows[i][5] !== data.claveControl) {
            return { ok: false, error: 'Clave de control incorrecta.' };
          }
          sheet.getRange(i+1,1,1,11).setValues([[
            data.id, data.nombre, data.descripcion || '', data.tipoId || '',
            rows[i][4], rows[i][5], data.inicioProgramado || '', data.finProgramado || '',
            rows[i][8], rows[i][9], data.idConfig || ''
          ]]);
          addAudit(data.id, data.usuario || 'ADMIN', 'EDITAR_ELECCION', 'Editada: ' + data.nombre);
          return { ok: true };
        }
      }
    }

    // Nueva elección
    const id = generateId();
    const claveControl = generateElectionKey();
    const creado = getSVTime();
    sheet.appendRow([id, data.nombre, data.descripcion || '', data.tipoId || '', 'inactive', claveControl, data.inicioProgramado || '', data.finProgramado || '', creado, false, data.idConfig || '']);
    // Crear hojas de votos y backup
    getVoteSheet(id);
    getBackupSheet(id);
    addAudit(id, data.usuario || 'ADMIN', 'CREAR_ELECCION', 'Creada: ' + data.nombre);
    return { ok: true, id, claveControl };
  } finally { try { lock.releaseLock(); } catch(e) {} }
}

function setElectionStatus(data) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sheet = getSheet(SHEET_ELECTIONS);
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === data.id) {
        if (rows[i][5] !== data.claveControl) return { ok: false, error: 'Clave de control incorrecta.' };
        sheet.getRange(i+1,5).setValue(data.estado);
        if (data.inicioProgramado !== undefined) sheet.getRange(i+1,7).setValue(data.inicioProgramado);
        if (data.finProgramado !== undefined)    sheet.getRange(i+1,8).setValue(data.finProgramado);
        addAudit(data.id, data.usuario || 'ADMIN', 'CAMBIO_ESTADO', 'Estado cambiado a: ' + data.estado);
        return { ok: true };
      }
    }
    return { ok: false, error: 'Elección no encontrada.' };
  } finally { try { lock.releaseLock(); } catch(e) {} }
}

function getElectionDetail(data) {
  const elections = getElections().data;
  const election = elections.find(e => e.id === data.id);
  if (!election) return { ok: false, error: 'Elección no encontrada.' };
  const positions = getPositions({ electionId: data.id }).data;
  const candidates = getCandidates({ electionId: data.id }).data;
  return { ok: true, data: { election, positions, candidates } };
}

function toggleResultsVisibility(data) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sheet = getSheet(SHEET_ELECTIONS);
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === data.id) {
        if (rows[i][5] !== data.claveControl) return { ok: false, error: 'Clave de control incorrecta.' };
        sheet.getRange(i+1,10).setValue(data.mostrar);
        addAudit(data.id, data.usuario || 'ADMIN', 'VISIBILIDAD_RESULTADOS', data.mostrar ? 'Resultados visibles' : 'Resultados ocultos');
        return { ok: true };
      }
    }
    return { ok: false, error: 'Elección no encontrada.' };
  } finally { try { lock.releaseLock(); } catch(e) {} }
}

// ===== CARGOS (POSICIONES) =====
function getPositions(data) {
  const sheet = getSheet(SHEET_POSITIONS);
  const rows = sheet.getDataRange().getValues();
  const all = rows.slice(1).map(r => ({ id:r[0], eleccionId:r[1], nombre:r[2], orden:r[3], activo:r[4]===true }));
  const filtered = data && data.electionId ? all.filter(p => p.eleccionId === data.electionId) : all;
  return { ok: true, data: filtered.sort((a,b) => (a.orden||0)-(b.orden||0)) };
}

function savePosition(data) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sheet = getSheet(SHEET_POSITIONS);
    const rows = sheet.getDataRange().getValues();
    if (data.id) {
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === data.id) {
          sheet.getRange(i+1,1,1,5).setValues([[data.id, data.eleccionId, data.nombre, data.orden||0, data.activo!==false]]);
          return { ok: true };
        }
      }
    }
    const id = generateId();
    sheet.appendRow([id, data.eleccionId, data.nombre, data.orden||0, true]);
    return { ok: true, id };
  } finally { try { lock.releaseLock(); } catch(e) {} }
}

function deletePosition(data) {
  const sheet = getSheet(SHEET_POSITIONS);
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.id) { sheet.deleteRow(i+1); return { ok: true }; }
  }
  return { ok: false, error: 'Cargo no encontrado.' };
}

// ===== CANDIDATOS =====
function getCandidates(data) {
  const sheet = getSheet(SHEET_CANDS);
  const rows = sheet.getDataRange().getValues();
  const all = rows.slice(1).map(r => ({ id:r[0], eleccionId:r[1], posicionId:r[2], posicionNombre:r[3], nombre:r[4], seccion:r[5], fotoUrl:r[6], activo:r[7]===true }));
  const filtered = data && data.electionId ? all.filter(c => c.eleccionId === data.electionId) : all;
  return { ok: true, data: filtered };
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
          sheet.getRange(i+1,1,1,8).setValues([[data.id, data.eleccionId, data.posicionId, data.posicionNombre, data.nombre, data.seccion||'', data.fotoUrl||'', data.activo!==false]]);
          return { ok: true };
        }
      }
    }
    const id = generateId();
    sheet.appendRow([id, data.eleccionId, data.posicionId, data.posicionNombre, data.nombre, data.seccion||'', data.fotoUrl||'', true]);
    return { ok: true, id };
  } finally { try { lock.releaseLock(); } catch(e) {} }
}

function deleteCandidate(data) {
  const sheet = getSheet(SHEET_CANDS);
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.id) { sheet.deleteRow(i+1); return { ok: true }; }
  }
  return { ok: false, error: 'Candidato no encontrado.' };
}

// ===== SECCIONES =====
function getSections() {
  const sheet = getSheet(SHEET_SECTIONS);
  const rows = sheet.getDataRange().getValues();
  const data = rows.slice(1).map(r => ({ id:r[0], nombre:String(r[1]||'').trim(), tipo:r[2]||'', activo:r[3]===true }));
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
          const r = sheet.getRange(i+1,2); r.setNumberFormat('@STRING@'); r.setValue(String(data.nombre).trim());
          sheet.getRange(i+1,3).setValue(data.tipo||'');
          sheet.getRange(i+1,4).setValue(data.activo!==false);
          return { ok: true };
        }
      }
    }
    const id = generateId();
    const newRow = sheet.getLastRow()+1;
    sheet.getRange(newRow,1).setValue(id);
    const nc = sheet.getRange(newRow,2); nc.setNumberFormat('@STRING@'); nc.setValue(String(data.nombre).trim());
    sheet.getRange(newRow,3).setValue(data.tipo||'');
    sheet.getRange(newRow,4).setValue(true);
    return { ok: true, id };
  } finally { try { lock.releaseLock(); } catch(e) {} }
}

function deleteSection(data) {
  const sheet = getSheet(SHEET_SECTIONS);
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.id) { sheet.deleteRow(i+1); return { ok: true }; }
  }
  return { ok: false, error: 'Sección no encontrada.' };
}

// ===== PADRÓN DE VOTANTES =====
function getVoters(data) {
  const sheet = getSheet(SHEET_VOTERS);
  const rows = sheet.getDataRange().getValues();
  let voters = rows.slice(1).map(r => ({ id:r[0], identificador:String(r[1]||'').trim(), apellidos:r[2], nombres:r[3], seccionId:r[4], seccionNombre:String(r[5]||'').trim(), activo:r[6]===true, fechaRegistro:r[7] }));
  if (data && data.seccionId) voters = voters.filter(v => v.seccionId === data.seccionId);
  return { ok: true, data: voters };
}

function saveVoter(data) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sheet = getSheet(SHEET_VOTERS);
    const rows = sheet.getDataRange().getValues();

    // Verificar identificador único
    for (let i = 1; i < rows.length; i++) {
      const existingId = String(rows[i][1]||'').trim().toUpperCase();
      const newId = String(data.identificador||'').trim().toUpperCase();
      if (existingId === newId && rows[i][0] !== data.id) {
        return { ok: false, error: 'Este identificador ya está registrado.' };
      }
    }

    if (data.id) {
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === data.id) {
          sheet.getRange(i+1,1,1,8).setValues([[data.id, String(data.identificador).trim().toUpperCase(), data.apellidos, data.nombres, data.seccionId||'', String(data.seccionNombre||'').trim(), data.activo!==false, rows[i][7]]]);
          return { ok: true };
        }
      }
    }
    const id = generateId();
    sheet.appendRow([id, String(data.identificador).trim().toUpperCase(), data.apellidos, data.nombres, data.seccionId||'', String(data.seccionNombre||'').trim(), true, getSVTime()]);
    return { ok: true, id };
  } finally { try { lock.releaseLock(); } catch(e) {} }
}

function deleteVoter(data) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sheet = getSheet(SHEET_VOTERS);
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === data.id) { sheet.deleteRow(i+1); return { ok: true }; }
    }
    return { ok: false, error: 'Votante no encontrado.' };
  } finally { try { lock.releaseLock(); } catch(e) {} }
}

function importVoters(data) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const sheet = getSheet(SHEET_VOTERS);
    let imported = 0, skipped = 0;
    const existing = sheet.getDataRange().getValues().slice(1).map(r => String(r[1]||'').trim().toUpperCase());

    data.voters.forEach(v => {
      const idClean = String(v.identificador||'').trim().toUpperCase();
      if (existing.includes(idClean)) { skipped++; return; }
      sheet.appendRow([generateId(), idClean, v.apellidos||'', v.nombres||'', v.seccionId||'', String(v.seccionNombre||'').trim(), true, getSVTime()]);
      existing.push(idClean);
      imported++;
    });
    return { ok: true, imported, skipped };
  } finally { try { lock.releaseLock(); } catch(e) {} }
}

// ===== REGISTRO DE VOTO =====
function registerVote(data) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);

    // Verificar estado elección
    const elections = getElections().data;
    const election = elections.find(e => e.id === data.eleccionId);
    if (!election) return { ok: false, error: 'Elección no encontrada.' };
    if (election.estado !== 'active') return { ok: false, error: 'La votación no está activa.' };

    // Verificar urna activa
    const urna = getUrnaById(data.urnaId);
    if (!urna || !urna.activo) return { ok: false, error: 'Esta urna está desactivada.' };

    // Verificar que votante no haya votado ya en esta posición
    const voteSheet = getVoteSheet(data.eleccionId);
    const lastRow = voteSheet.getLastRow();
    if (lastRow >= 2) {
      const votes = voteSheet.getRange(2,1,lastRow-1,14).getValues();
      const alreadyVoted = votes.some(v =>
        String(v[1]).trim().toUpperCase() === String(data.identificador).trim().toUpperCase() &&
        v[5] === data.posicionId
      );
      if (alreadyVoted) return { ok: false, error: 'Este votante ya emitió su voto para este cargo.', duplicate: true };
    }

    const id = generateId();
    const ts = getSVTime();
    const row = [id, String(data.identificador).trim().toUpperCase(), data.apellidos||'', data.nombres||'', data.seccion||'', data.posicionId, data.posicionNombre, data.candidatoId, data.candidatoNombre, data.urnaId, urna.nombre, urna.ubicacion, urna.sector||'', ts];

    voteSheet.appendRow(row);
    getBackupSheet(data.eleccionId).appendRow(row);

    return { ok: true, id, timestamp: ts };
  } catch(err) {
    if (err.message.includes('Timeout')) return { ok: false, error: 'Sistema ocupado, intenta de nuevo.' };
    return { ok: false, error: err.message };
  } finally { try { lock.releaseLock(); } catch(e) {} }
}

function checkVoterID(data) {
  // Verificar si ya votó en una posición específica
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const voteSheet = getVoteSheet(data.eleccionId);
    const lastRow = voteSheet.getLastRow();
    if (lastRow < 2) return { ok: true, votedPositions: [] };
    const votes = voteSheet.getRange(2,1,lastRow-1,14).getValues();
    const idClean = String(data.identificador).trim().toUpperCase();
    const votedPositions = votes
      .filter(v => String(v[1]).trim().toUpperCase() === idClean)
      .map(v => v[5]);
    return { ok: true, votedPositions };
  } finally { try { lock.releaseLock(); } catch(e) {} }
}

function getVoterByID(data) {
  const sheet = getSheet(SHEET_VOTERS);
  const rows = sheet.getDataRange().getValues();
  const idClean = String(data.identificador).trim().toUpperCase();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][1]||'').trim().toUpperCase() === idClean) {
      if (rows[i][6] !== true) return { ok: false, error: 'Votante desactivado.' };
      return { ok: true, data: { id:rows[i][0], identificador:rows[i][1], apellidos:rows[i][2], nombres:rows[i][3], seccionId:rows[i][4], seccionNombre:String(rows[i][5]||'').trim() }};
    }
  }
  return { ok: false, error: 'Identificador no registrado en el padrón de votantes.' };
}

// ===== RESULTADOS =====
function getResults(data) {
  const elections = getElections().data;
  const election = data && data.eleccionId ? elections.find(e => e.id === data.eleccionId) : null;
  if (!election) return { ok: false, error: 'Elección no especificada.' };

  const positions = getPositions({ electionId: election.id }).data;
  const candidates = getCandidates({ electionId: election.id }).data;
  const urnas = getUrnas().data;
  const voters = getVoters({}).data;

  const voteSheet = getVoteSheet(election.id);
  const lastRow = voteSheet.getLastRow();
  const votes = lastRow >= 2 ? voteSheet.getRange(2,1,lastRow-1,14).getValues() : [];

  // Agrupar votos por posición y candidato
  const byPosition = {};
  positions.forEach(p => { byPosition[p.id] = { position: p, byCandidato: {}, total: 0 }; });

  const byUrna = {};
  const bySector = {};

  votes.forEach(v => {
    const posId = v[5], candId = v[7], candNombre = v[8];
    const urnaId = v[9], urnaNombre = v[10], sector = v[12];

    if (byPosition[posId]) {
      byPosition[posId].total++;
      if (!byPosition[posId].byCandidato[candId]) byPosition[posId].byCandidato[candId] = { id:candId, nombre:candNombre, count:0 };
      byPosition[posId].byCandidato[candId].count++;
    }
    if (!byUrna[urnaId]) byUrna[urnaId] = { id:urnaId, nombre:urnaNombre, count:0 };
    byUrna[urnaId].count++;
    const sk = sector||'Sin sector';
    if (!bySector[sk]) bySector[sk] = { nombre:sk, count:0 };
    bySector[sk].count++;
  });

  // Votantes únicos
  const uniqueVoters = [...new Set(votes.map(v => String(v[1]).trim().toUpperCase()))];

  return {
    ok: true,
    data: {
      election,
      positions,
      candidates,
      byPosition,
      byUrna,
      bySector,
      totalVotes: votes.length,
      uniqueVoters: uniqueVoters.length,
      totalRegistered: voters.length,
      pendingVoters: voters.length - uniqueVoters.length,
      activeUrnas: urnas.filter(u => u.activo).length,
      allUrnas: urnas
    }
  };
}

// ===== AUDITORÍA =====
function getAudit(data) {
  const sheet = getSheet(SHEET_AUDIT);
  const rows = sheet.getDataRange().getValues();
  let audits = rows.slice(1).map(r => ({ id:r[0], eleccionId:r[1], usuario:r[2], accion:r[3], detalle:r[4], timestamp:r[5] }));
  if (data && data.eleccionId) audits = audits.filter(a => a.eleccionId === data.eleccionId);
  return { ok: true, data: audits.reverse() };
}

// ===== URNAS =====
function getUrnaById(id) {
  const sheet = getSheet(SHEET_URNAS);
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === id) return { id:rows[i][0], nombre:rows[i][1], ubicacion:rows[i][2], sector:rows[i][3], username:rows[i][4], activo:rows[i][6]===true, seccionesPermitidas:rows[i][7]||'' };
  }
  return null;
}

function getUrnas() {
  const sheet = getSheet(SHEET_URNAS);
  const rows = sheet.getDataRange().getValues();
  const data = rows.slice(1).map(r => ({ id:r[0], nombre:r[1], ubicacion:r[2], sector:r[3], username:r[4], activo:r[6]===true, seccionesPermitidas:r[7]||'' }));
  return { ok: true, data };
}

function saveUrna(data) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sheet = getSheet(SHEET_URNAS);
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][4] === data.username && rows[i][0] !== data.id) return { ok: false, error: 'El nombre de usuario ya existe.' };
    }
    if (data.id) {
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === data.id) {
          const ph = data.password ? hashPassword(data.password) : rows[i][5];
          sheet.getRange(i+1,1,1,8).setValues([[data.id, data.nombre, data.ubicacion, data.sector||'', data.username, ph, data.activo!==false, data.seccionesPermitidas||'']]);
          syncUrnaUser(data.id, data.username, data.password ? ph : null, data.nombre, data.activo!==false);
          return { ok: true };
        }
      }
    }
    if (AppState && AppState.urnas && AppState.urnas.length >= 30) return { ok: false, error: 'Límite de 30 urnas alcanzado.' };
    const id = generateId();
    const ph = hashPassword(data.password);
    sheet.appendRow([id, data.nombre, data.ubicacion, data.sector||'', data.username, ph, true, data.seccionesPermitidas||'']);
    syncUrnaUser(id, data.username, ph, data.nombre, true);
    return { ok: true, id };
  } finally { try { lock.releaseLock(); } catch(e) {} }
}

function deleteUrna(data) {
  // Verificar si tiene votos en alguna elección
  const elections = getElections().data;
  for (const e of elections) {
    const vs = getVoteSheet(e.id);
    const lr = vs.getLastRow();
    if (lr >= 2) {
      const votes = vs.getRange(2,1,lr-1,14).getValues();
      if (votes.some(v => v[9] === data.id)) return { ok: false, error: 'No se puede eliminar: esta urna tiene votos registrados.' };
    }
  }
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sheet = getSheet(SHEET_URNAS);
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === data.id) {
        // Eliminar usuario asociado
        deleteUrnaUser(data.id);
        sheet.deleteRow(i+1);
        return { ok: true };
      }
    }
    return { ok: false, error: 'Urna no encontrada.' };
  } finally { try { lock.releaseLock(); } catch(e) {} }
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
        sheet.getRange(i+1,7).setValue(newStatus);
        syncUrnaUser(data.id, rows[i][4], null, rows[i][1], newStatus);
        return { ok: true };
      }
    }
    return { ok: false, error: 'Urna no encontrada.' };
  } finally { try { lock.releaseLock(); } catch(e) {} }
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
        sheet.getRange(i+1,7).setValue(data.activo);
        syncUrnaUser(rows[i][0], rows[i][4], null, rows[i][1], data.activo);
        count++;
      }
    }
    return { ok: true, count };
  } finally { try { lock.releaseLock(); } catch(e) {} }
}

// ===== USUARIOS =====
function syncUrnaUser(urnaId, username, passHash, nombre, activo) {
  const sheet = getSheet(SHEET_USERS);
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][5] === urnaId) {
      const ph = passHash || rows[i][2];
      sheet.getRange(i+1,1,1,7).setValues([[rows[i][0], username, ph, 'URNA', nombre, urnaId, activo]]);
      return;
    }
  }
  sheet.appendRow([generateId(), username, passHash||'', 'URNA', nombre, urnaId, activo]);
}

function deleteUrnaUser(urnaId) {
  const sheet = getSheet(SHEET_USERS);
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][5] === urnaId) { sheet.deleteRow(i+1); return; }
  }
}

function getUsers() {
  const sheet = getSheet(SHEET_USERS);
  const rows = sheet.getDataRange().getValues();
  const data = rows.slice(1).map(r => ({ id:r[0], username:r[1], role:r[3], nombre:r[4], urnaId:r[5], activo:r[6]===true }));
  return { ok: true, data };
}

function saveUser(data) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sheet = getSheet(SHEET_USERS);
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][1] === data.username && rows[i][0] !== data.id) return { ok: false, error: 'El nombre de usuario ya existe.' };
    }
    if (data.id) {
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === data.id) {
          const ph = data.password ? hashPassword(data.password) : rows[i][2];
          sheet.getRange(i+1,1,1,7).setValues([[data.id, data.username, ph, data.role, data.nombre, data.urnaId||'', data.activo!==false]]);
          return { ok: true };
        }
      }
    }
    const id = generateId();
    sheet.appendRow([id, data.username, hashPassword(data.password), data.role, data.nombre, data.urnaId||'', true]);
    return { ok: true, id };
  } finally { try { lock.releaseLock(); } catch(e) {} }
}

function deleteUser(data) {
  const sheet = getSheet(SHEET_USERS);
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.id) { sheet.deleteRow(i+1); return { ok: true }; }
  }
  return { ok: false, error: 'Usuario no encontrado.' };
}

function toggleUser(data) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sheet = getSheet(SHEET_USERS);
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === data.id) {
        sheet.getRange(i+1,7).setValue(data.activo);
        return { ok: true };
      }
    }
    return { ok: false, error: 'Usuario no encontrado.' };
  } finally { try { lock.releaseLock(); } catch(e) {} }
}

// ===== UBICACIONES =====
function getLocations() {
  const sheet = getSheet(SHEET_LOCS);
  const rows = sheet.getDataRange().getValues();
  return { ok: true, data: rows.slice(1).map(r => ({ id:r[0], nombre:r[1], tipo:r[2]||'', activo:r[3]===true })) };
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
          sheet.getRange(i+1,1,1,4).setValues([[data.id, data.nombre, data.tipo||'', data.activo!==false]]);
          return { ok: true };
        }
      }
    }
    const id = generateId();
    sheet.appendRow([id, data.nombre, data.tipo||'', true]);
    return { ok: true, id };
  } finally { try { lock.releaseLock(); } catch(e) {} }
}

function deleteLocation(data) {
  const sheet = getSheet(SHEET_LOCS);
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.id) { sheet.deleteRow(i+1); return { ok: true }; }
  }
  return { ok: false, error: 'Ubicación no encontrada.' };
}

// ===== INICIALIZAR =====
function initializeAllSheets() {
  const names = [SHEET_CONFIG, SHEET_USERS, SHEET_SECTIONS, SHEET_URNAS, SHEET_LOCS, SHEET_VOTERS, SHEET_ELECTIONS, SHEET_AUDIT, SHEET_POSITIONS, SHEET_CANDS, SHEET_ID_TYPES];
  names.forEach(name => getSheet(name));

  if (getSheet(SHEET_USERS).getLastRow() < 2) {
    getSheet(SHEET_USERS).appendRow([generateId(), 'admin', hashPassword('admin2024'), 'ADMIN', 'Administrador', '', true]);
  }

  const defaults = { INSTITUTION_NAME:'Institución Educativa', LOGO_URL:'', ACTIVE_ELECTION_ID:'' };
  Object.entries(defaults).forEach(([k,v]) => { if (!getConfigValue(k)) setConfigValue(k,v); });

  // Tipos de identificación por defecto
  const idSheet = getSheet(SHEET_ID_TYPES);
  if (idSheet.getLastRow() < 2) {
    idSheet.appendRow([generateId(), 'NIE', 'NIE', true]);
    idSheet.appendRow([generateId(), 'DUI', 'DUI', true]);
  }

  return { ok: true, message: 'Sistema v2.0 inicializado correctamente.' };
}