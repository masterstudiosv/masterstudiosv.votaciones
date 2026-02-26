/**
 * SISTEMA DE VOTACIÓN v2.0 - results.js
 */

async function loadResultsPanel() {
  showLoading('Cargando resultados...');
  try {
    const [configRes, electionsRes] = await Promise.all([API.getConfig(), API.getElections()]);

    if (configRes.ok) {
      const cfg = configRes.data;
      AppState.config = { institutionName: cfg.INSTITUTION_NAME||'Institución', logoUrl: cfg.LOGO_URL||'' };
    }

    AppState.elections = electionsRes.ok ? electionsRes.data : [];

    updateHeaderDisplay();
    renderResultsElectionSelector();
    showPage('page-results');

  } catch(err) {
    showToast('Error al cargar: '+err.message,'error');
  } finally {
    hideLoading();
  }
}

function renderResultsElectionSelector() {
  const cont = el('results-main-content'); if (!cont) return;

  // Filtrar solo elecciones con resultados visibles (para rol RESULTADOS)
  const user = AppState.user;
  const elections = user?.role === 'ADMIN'
    ? AppState.elections
    : AppState.elections.filter(e => e.mostrarResultados);

  if (elections.length === 0) {
    cont.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:400px;text-align:center;padding:40px">
      <div style="font-size:3rem;margin-bottom:16px">📊</div>
      <h3 style="color:var(--primary-dark)">No hay resultados disponibles</h3>
      <p style="color:var(--text-secondary)">El administrador no ha habilitado resultados aún.</p>
    </div>`;
    return;
  }

  cont.innerHTML = `
    <div style="max-width:900px;margin:0 auto">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:12px">
        <div>
          <div style="font-size:1.3rem;font-weight:700;color:var(--primary-dark)">📊 Resultados en Tiempo Real</div>
          <div style="font-size:.82rem;color:var(--text-secondary)" id="results-last-update">Selecciona una votación</div>
        </div>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
          <select id="results-election-select" class="form-input form-select" style="max-width:280px" onchange="loadElectionResults(this.value)">
            <option value="">Selecciona una votación...</option>
            ${elections.map(e=>`<option value="${e.id}">${sanitize(e.nombre)} — ${statusLabel(e.estado)}</option>`).join('')}
          </select>
          <button class="btn btn-outline btn-sm" onclick="refreshCurrentResults()" title="Refrescar">🔄</button>
          <button class="btn btn-ghost btn-sm" id="results-export-btn" onclick="exportCurrentResultsPDF()" style="display:none">📄 PDF</button>
        </div>
      </div>
      <div id="results-content"></div>
    </div>`;
}

let resultsRefreshTimer = null;

async function loadElectionResults(electionId) {
  if (!electionId) return;
  if (resultsRefreshTimer) clearInterval(resultsRefreshTimer);

  el('results-export-btn').style.display = '';
  AppState.currentResultsElectionId = electionId;

  await refreshCurrentResults();

  // Auto-refresh cada 8 segundos
  resultsRefreshTimer = setInterval(refreshCurrentResults, APP_CONFIG.RESULTS_REFRESH_INTERVAL);
}

async function refreshCurrentResults() {
  const electionId = AppState.currentResultsElectionId;
  if (!electionId) return;
  try {
    const res = await API.getResults(electionId);
    if (!res.ok) { showToast('Error al actualizar resultados','error'); return; }
    renderResultsData(res.data);
    const upd = el('results-last-update');
    if (upd) upd.textContent = 'Última actualización: ' + new Date().toLocaleTimeString('es-SV',{hour12:false});
  } catch(err) {
    console.warn('Error actualizando resultados:', err.message);
  }
}

function renderResultsData(data) {
  const cont = el('results-content'); if (!cont) return;
  const election = data.election;
  const positions = data.positions || [];
  const byPos = data.byPosition || {};

  cont.innerHTML = `
    <!-- Stats generales -->
    <div class="stats-grid" style="margin-bottom:24px">
      <div class="stat-card"><span class="stat-icon">🗳️</span><div class="stat-value">${data.totalVotes}</div><div class="stat-label">Votos totales</div></div>
      <div class="stat-card"><span class="stat-icon">👥</span><div class="stat-value">${data.uniqueVoters}</div><div class="stat-label">Votantes únicos</div></div>
      <div class="stat-card"><span class="stat-icon">📋</span><div class="stat-value">${data.totalRegistered}</div><div class="stat-label">Registrados</div></div>
      <div class="stat-card"><span class="stat-icon">⏳</span><div class="stat-value">${data.pendingVoters}</div><div class="stat-label">Sin votar</div></div>
      <div class="stat-card"><span class="stat-icon">🏛️</span><div class="stat-value">${data.activeUrnas}</div><div class="stat-label">Urnas activas</div></div>
      <div class="stat-card"><span class="stat-icon">📈</span><div class="stat-value">${data.totalRegistered>0?((data.uniqueVoters/data.totalRegistered)*100).toFixed(1):0}%</div><div class="stat-label">Participación</div></div>
    </div>

    <!-- Resultados por cargo -->
    ${positions.map(pos => {
      const posData = byPos[pos.id];
      if (!posData) return '';
      const cands = Object.values(posData.byCandidato||{}).sort((a,b)=>b.count-a.count);
      const total = posData.total || 0;
      const winner = cands[0];

      return `<div class="card" style="margin-bottom:24px">
        <div class="card-header">
          <div class="card-title">🏆 ${sanitize(pos.nombre)}</div>
          <span style="font-size:.82rem;color:var(--text-secondary)">${total} votos</span>
        </div>
        ${cands.length===0?'<p style="color:var(--text-light);padding:16px">Sin votos aún</p>':
          `<div style="margin-bottom:20px">
            ${cands.map((c,i)=>{
              const pct = total>0?((c.count/total)*100).toFixed(1):0;
              const isWinner = i===0&&c.count>0;
              return `<div style="padding:12px 0;border-bottom:1px solid var(--border)">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
                  <span style="font-size:1.1rem">${i===0?'🥇':i===1?'🥈':i===2?'🥉':'#'+(i+1)}</span>
                  <strong style="flex:1;color:var(--primary-dark)">${sanitize(c.nombre)}</strong>
                  ${isWinner?'<span class="badge badge-active" style="font-size:.7rem">GANADOR</span>':''}
                  <span style="font-weight:700;color:${isWinner?'var(--success)':'var(--text-secondary)'}">${c.count} votos (${pct}%)</span>
                </div>
                <div style="background:#eee;border-radius:999px;height:12px;overflow:hidden">
                  <div style="width:${pct}%;background:${isWinner?'var(--success)':'var(--primary-light)'};height:100%;border-radius:999px;transition:width .5s ease"></div>
                </div>
              </div>`;
            }).join('')}
          </div>
          <!-- Gráfico de barras simple -->
          <div style="margin-top:8px">
            <canvas id="chart-${pos.id}" width="500" height="200" style="max-width:100%"></canvas>
          </div>`
        }
      </div>`;
    }).join('')}

    <!-- Votos por urna -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px">
      <div class="card">
        <div class="card-header"><div class="card-title">🗳️ Votos por Urna</div></div>
        ${Object.values(data.byUrna||{}).length===0?'<p style="color:var(--text-light);padding:12px">Sin datos</p>':
          Object.values(data.byUrna||{}).sort((a,b)=>b.count-a.count).map(u=>{
            const pct=data.totalVotes>0?((u.count/data.totalVotes)*100).toFixed(1):0;
            return `<div style="padding:10px 0;border-bottom:1px solid var(--border)">
              <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                <span style="font-size:.85rem;font-weight:600">${sanitize(u.nombre)}</span>
                <span style="font-size:.82rem;color:var(--text-secondary)">${u.count} (${pct}%)</span>
              </div>
              <div style="background:#eee;border-radius:999px;height:6px">
                <div style="width:${pct}%;background:var(--primary-light);height:100%;border-radius:999px"></div>
              </div></div>`;
          }).join('')}
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">📍 Votos por Sector</div></div>
        ${Object.values(data.bySector||{}).length===0?'<p style="color:var(--text-light);padding:12px">Sin datos</p>':
          Object.values(data.bySector||{}).sort((a,b)=>b.count-a.count).map(s=>{
            const pct=data.totalVotes>0?((s.count/data.totalVotes)*100).toFixed(1):0;
            return `<div style="padding:10px 0;border-bottom:1px solid var(--border)">
              <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                <span style="font-size:.85rem;font-weight:600">${sanitize(s.nombre)}</span>
                <span style="font-size:.82rem;color:var(--text-secondary)">${s.count} (${pct}%)</span>
              </div>
              <div style="background:#eee;border-radius:999px;height:6px">
                <div style="width:${pct}%;background:var(--primary-light);height:100%;border-radius:999px"></div>
              </div></div>`;
          }).join('')}
      </div>
    </div>`;

  // Dibujar gráficos con canvas
  positions.forEach(pos => {
    const posData = byPos[pos.id];
    if (!posData) return;
    const cands = Object.values(posData.byCandidato||{}).sort((a,b)=>b.count-a.count);
    if (cands.length === 0) return;
    drawBarChart('chart-'+pos.id, cands, posData.total);
  });
}

function drawBarChart(canvasId, cands, total) {
  const canvas = el(canvasId); if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const pad = { top:20, bottom:40, left:10, right:10 };
  const barW = Math.min(80, (W - pad.left - pad.right) / cands.length - 10);
  const colors = ['#1565C0','#29B6F6','#4CAF50','#FF9800','#9C27B0','#F44336'];

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#f8f9ff';
  ctx.fillRect(0, 0, W, H);

  const maxVal = Math.max(...cands.map(c=>c.count), 1);
  const chartH = H - pad.top - pad.bottom;
  const spacing = (W - pad.left - pad.right - barW * cands.length) / (cands.length + 1);

  cands.forEach((c, i) => {
    const x = pad.left + spacing * (i+1) + barW * i;
    const barH = (c.count / maxVal) * chartH;
    const y = pad.top + chartH - barH;
    const pct = total > 0 ? ((c.count/total)*100).toFixed(1) : 0;

    // Barra
    ctx.fillStyle = colors[i % colors.length];
    ctx.beginPath();
    ctx.roundRect(x, y, barW, barH, [4, 4, 0, 0]);
    ctx.fill();

    // Número encima
    ctx.fillStyle = '#333';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(c.count + ' (' + pct + '%)', x + barW/2, y - 5);

    // Nombre abajo (truncado)
    ctx.fillStyle = '#555';
    ctx.font = '11px Arial';
    const name = c.nombre.length > 12 ? c.nombre.substring(0,11)+'…' : c.nombre;
    ctx.fillText(name, x + barW/2, H - 10);
  });
}

async function exportCurrentResultsPDF() {
  const electionId = AppState.currentResultsElectionId;
  if (!electionId) { showToast('Selecciona una votación primero','warning'); return; }
  await exportResultsPDF(electionId);
}