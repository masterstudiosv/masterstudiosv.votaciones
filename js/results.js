/**
 * ============================================================
 * PANEL DE RESULTADOS - Visualización en Tiempo Real
 * results.js
 * ============================================================
 */

// ===== ACTUALIZAR RESULTADOS =====
async function refreshResults() {
  try {
    const res = await API.getResults();
    if (!res.ok) return;

    const data = res.data;

    // Actualizar config
    if (data.config) {
      AppState.config.electionStatus = data.config.ELECTION_STATUS || 'inactive';
      updateHeaderDisplay();
    }

    renderResultsDashboard(data);

  } catch (err) {
    // Silencioso en auto-refresh
    console.warn('Error actualizando resultados:', err.message);
  }
}

// ===== RENDERIZAR DASHBOARD DE RESULTADOS =====
function renderResultsDashboard(data) {
  const cont = el('results-content');
  if (!cont) return;

  const { totalVotes, byCandidate, byUrna, bySector, allCandidates, allUrnas, activeUrnas } = data;
  
  const candidateResults = Object.values(byCandidate || {}).sort((a,b) => b.count - a.count);
  const urnaResults      = Object.values(byUrna || {});
  const sectorResults    = Object.values(bySector || {}).sort((a,b) => b.count - a.count);
  const maxVotes         = candidateResults.length > 0 ? candidateResults[0].count : 1;

  cont.innerHTML = `
    <!-- Stats Header -->
    <div class="stats-grid" style="margin-bottom:28px">
      <div class="stat-card">
        <span class="stat-icon">🗳️</span>
        <div class="stat-value">${totalVotes.toLocaleString()}</div>
        <div class="stat-label">Votos Totales</div>
      </div>
      <div class="stat-card">
        <span class="stat-icon">✅</span>
        <div class="stat-value">${activeUrnas}</div>
        <div class="stat-label">Urnas Activas</div>
      </div>
      <div class="stat-card">
        <span class="stat-icon">📊</span>
        <div class="stat-value">${candidateResults.length}</div>
        <div class="stat-label">Candidatos</div>
      </div>
      <div class="stat-card">
        <span class="stat-icon">🏫</span>
        <div class="stat-value">${sectorResults.length}</div>
        <div class="stat-label">Sectores</div>
      </div>
    </div>

    <!-- Resultados por Candidato -->
    <div class="card" style="margin-bottom:24px">
      <div class="card-header">
        <div class="card-title">👤 Resultados por Candidato</div>
        <small style="color:var(--text-light)">Actualización automática cada 8 segundos</small>
      </div>
      ${candidateResults.length === 0
        ? `<div style="text-align:center;padding:32px;color:var(--text-light)">
             <div style="font-size:2.5rem">📭</div>
             <p>Aún no hay votos registrados</p>
           </div>`
        : candidateResults.map((c, i) => {
            const pct = totalVotes > 0 ? ((c.count / totalVotes) * 100).toFixed(1) : 0;
            const candData = (allCandidates || []).find(cd => cd.id === c.id);
            const isLeader = i === 0 && c.count > 0;
            return `
              <div style="display:flex;align-items:center;gap:16px;padding:14px 0;border-bottom:1px solid var(--border);${i===candidateResults.length-1?'border-bottom:none':''}">
                <div style="font-size:1.2rem;font-weight:800;color:${isLeader?'var(--warning)':'var(--text-light)'};width:24px;text-align:center">
                  ${isLeader ? '🥇' : i===1 ? '🥈' : i===2 ? '🥉' : `#${i+1}`}
                </div>
                ${candData?.fotoUrl
                  ? `<img src="${sanitize(candData.fotoUrl)}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;flex-shrink:0" onerror="this.outerHTML='<div style=width:44px;height:44px;border-radius:50%;background:var(--bg-soft);display:flex;align-items:center;justify-content:center;font-size:1.3rem;flex-shrink:0>👤</div>'">`
                  : `<div style="width:44px;height:44px;border-radius:50%;background:var(--bg-soft);display:flex;align-items:center;justify-content:center;font-size:1.3rem;flex-shrink:0">👤</div>`
                }
                <div style="flex:1;min-width:0">
                  <div style="font-weight:700;color:var(--primary-dark);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${sanitize(c.nombre)}</div>
                  ${candData ? `<div style="font-size:.75rem;color:var(--text-secondary)">${sanitize(candData.seccion)} · ${sanitize(candData.cargo)}</div>` : ''}
                  <div style="display:flex;align-items:center;gap:10px;margin-top:8px">
                    <div class="results-bar">
                      <div class="results-bar-fill" style="width:${(c.count/maxVotes)*100}%"></div>
                    </div>
                    <span style="font-size:.8rem;color:var(--text-secondary);white-space:nowrap">${c.count} votos</span>
                  </div>
                </div>
                <div style="text-align:right;flex-shrink:0">
                  <div style="font-size:1.4rem;font-weight:800;color:var(--primary)">${pct}%</div>
                  <div style="font-size:.72rem;color:var(--text-light)">${c.count} de ${totalVotes}</div>
                </div>
              </div>
            `;
          }).join('')
      }
    </div>

    <!-- Gráfica visual -->
    ${candidateResults.length > 0 ? `
    <div class="card" style="margin-bottom:24px">
      <div class="card-header">
        <div class="card-title">📊 Distribución Visual de Votos</div>
      </div>
      <div style="display:flex;align-items:flex-end;justify-content:center;gap:20px;height:200px;padding:20px 0">
        ${candidateResults.map((c, i) => {
          const pct = totalVotes > 0 ? (c.count / totalVotes) * 100 : 0;
          const barH = Math.max(pct * 1.8, 4);
          const colors = ['linear-gradient(180deg,#1565C0,#29B6F6)', 'linear-gradient(180deg,#2E7D32,#66BB6A)', 'linear-gradient(180deg,#E65100,#FFA726)', 'linear-gradient(180deg,#6A1B9A,#AB47BC)'];
          return `
            <div style="display:flex;flex-direction:column;align-items:center;gap:6px">
              <span style="font-size:.78rem;font-weight:700;color:var(--primary)">${pct.toFixed(1)}%</span>
              <div style="width:48px;height:${barH}px;background:${colors[i%colors.length]};border-radius:6px 6px 0 0;transition:height 1s ease;min-height:4px"></div>
              <div style="text-align:center;font-size:.7rem;color:var(--text-secondary);max-width:70px;line-height:1.3">${sanitize(c.nombre.split(' ')[0])}</div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
    ` : ''}

    <!-- Resultados por Urna y Sector -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
      
      <div class="card">
        <div class="card-header">
          <div class="card-title">🗳️ Votos por Urna</div>
        </div>
        ${urnaResults.length === 0
          ? `<p style="text-align:center;padding:24px;color:var(--text-light)">Sin datos</p>`
          : urnaResults.sort((a,b) => b.count - a.count).map(u => {
              const pct = totalVotes > 0 ? ((u.count/totalVotes)*100).toFixed(1) : 0;
              const urnaData = (allUrnas || []).find(ud => ud.id === u.id);
              const isActive = urnaData?.activo;
              return `
                <div style="padding:10px 0;border-bottom:1px solid var(--border)">
                  <div style="display:flex;justify-content:space-between;margin-bottom:6px">
                    <div>
                      <span style="font-weight:600;font-size:.88rem">${sanitize(u.nombre)}</span>
                      <span class="badge ${isActive?'badge-active':'badge-inactive'}" style="margin-left:6px">${isActive?'● Activa':'● Inactiva'}</span>
                    </div>
                    <span style="font-weight:700;color:var(--primary);font-size:.88rem">${u.count} <small style="color:var(--text-light)">(${pct}%)</small></span>
                  </div>
                  <div class="results-bar"><div class="results-bar-fill" style="width:${(u.count/Math.max(...urnaResults.map(x=>x.count),1))*100}%"></div></div>
                </div>
              `;
            }).join('')
        }
      </div>

      <div class="card">
        <div class="card-header">
          <div class="card-title">📍 Votos por Sector</div>
        </div>
        ${sectorResults.length === 0
          ? `<p style="text-align:center;padding:24px;color:var(--text-light)">Sin datos</p>`
          : sectorResults.map(s => {
              const pct = totalVotes > 0 ? ((s.count/totalVotes)*100).toFixed(1) : 0;
              return `
                <div style="padding:10px 0;border-bottom:1px solid var(--border)">
                  <div style="display:flex;justify-content:space-between;margin-bottom:6px">
                    <span style="font-weight:600;font-size:.88rem">📍 ${sanitize(s.nombre)}</span>
                    <span style="font-weight:700;color:var(--primary);font-size:.88rem">${s.count} <small style="color:var(--text-light)">(${pct}%)</small></span>
                  </div>
                  <div class="results-bar"><div class="results-bar-fill" style="width:${(s.count/Math.max(...sectorResults.map(x=>x.count),1))*100}%"></div></div>
                </div>
              `;
            }).join('')
        }
      </div>
    </div>

    <div style="text-align:center;margin-top:24px;padding:16px;background:var(--bg-soft);border-radius:var(--radius);border:1px solid var(--border)">
      <small style="color:var(--text-light)">
        🔄 Datos actualizados automáticamente · Último refresco: ${new Date().toLocaleTimeString('es-SV', {timeZone:'America/El_Salvador',hour12:false})}
      </small>
    </div>
  `;
}
