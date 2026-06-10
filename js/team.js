const params = new URLSearchParams(location.search);
const id = params.get('id');
let currentSeason = params.get('season_id');
let teamPayload = null;

const teamHero = document.getElementById('teamHero');
const formationPill = document.getElementById('formationPill');
const lineupPitch = document.getElementById('lineupPitch');
const subsList = document.getElementById('subsList');
const standoutPlayers = document.getElementById('standoutPlayers');
const fixturesEl = document.getElementById('fixtures');
const historyCards = document.getElementById('historyCards');
const historyDetail = document.getElementById('historyDetail');

const POS_META = {
  GK: { label: 'GK', group: 'gk', cls: 'pos-gk' },
  RB: { label: 'RB', group: 'def', cls: 'pos-def' },
  CB: { label: 'CB', group: 'def', cls: 'pos-def' },
  LB: { label: 'LB', group: 'def', cls: 'pos-def' },
  RWB: { label: 'RWB', group: 'def', cls: 'pos-def' },
  LWB: { label: 'LWB', group: 'def', cls: 'pos-def' },
  DM: { label: 'DM', group: 'mid', cls: 'pos-mid' },
  CM: { label: 'CM', group: 'mid', cls: 'pos-mid' },
  AM: { label: 'CAM', group: 'mid', cls: 'pos-mid' },
  CAM: { label: 'CAM', group: 'mid', cls: 'pos-mid' },
  RM: { label: 'RM', group: 'mid', cls: 'pos-mid' },
  LM: { label: 'LM', group: 'mid', cls: 'pos-mid' },
  RW: { label: 'RW', group: 'fwd', cls: 'pos-fwd' },
  LW: { label: 'LW', group: 'fwd', cls: 'pos-fwd' },
  ST: { label: 'ST', group: 'fwd', cls: 'pos-fwd' },
  CF: { label: 'ST', group: 'fwd', cls: 'pos-fwd' },
};

function resultText(x) {
  if (!x) return 'Played';
  if (x.won_tournament) return 'Winner';
  if (Number(x.final_rank) === 2) return 'Runner-up';
  if (Number(x.final_rank) === 3) return '3rd Place';
  if (x.final_rank) return `Finished #${x.final_rank}`;
  return x.reached_stage || x.stage_name || 'Played';
}

function seasonLabel(row, isCurrent) {
  const year = row?.year || row?.season_year || '2026';
  return isCurrent ? `${year} - LIVE` : String(year);
}

function normalizePos(player, index = 0) {
  const raw = String(player.position || player.position_name || player.detailed_position || '').trim().toUpperCase();
  if (POS_META[raw]) return raw;
  if (raw.includes('GOAL') || raw.includes('KEEP')) return 'GK';
  if (raw.includes('RIGHT') && raw.includes('BACK')) return 'RB';
  if (raw.includes('LEFT') && raw.includes('BACK')) return 'LB';
  if (raw.includes('CENTRE') && raw.includes('BACK')) return 'CB';
  if (raw.includes('CENTER') && raw.includes('BACK')) return 'CB';
  if (raw.includes('DEF')) return ['RB','CB','CB','LB'][index % 4];
  if (raw.includes('MID')) return ['CM','CAM','CM'][index % 3];
  if (raw.includes('WING') || raw.includes('ATTACK')) return ['LW','ST','RW'][index % 3];
  if (raw.includes('FOR') || raw.includes('STRIK')) return 'ST';
  return ['GK','RB','CB','CB','LB','CM','CM','CAM','LW','ST','RW'][index] || 'CM';
}

function badge(player, index = 0) {
  return POS_META[normalizePos(player, index)] || POS_META.CM;
}

function playerId(p) {
  return p.player_id || p.id || p.sportmonks_player_id || '';
}

function playerName(p) {
  return p.display_name || p.common_name || p.name || p.player_name || 'Player';
}

function shortName(name = '') {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return parts[0] || 'Player';
  return `${parts[0][0]}. ${parts.slice(-1)[0]}`;
}

function pickLineup(players = []) {
  const list = players.map((p, i) => ({ ...p, _idx: i, _badge: badge(p, i), _key: playerId(p) || `idx-${i}` }));
  const take = (filter, count) => {
    const picked = [];
    for (const p of list) {
      if (!p._taken && filter(p) && picked.length < count) {
        p._taken = true;
        picked.push(p);
      }
    }
    return picked;
  };
  const gk = take(p => p._badge.group === 'gk', 1);
  const def = take(p => p._badge.group === 'def', 4);
  const mid = take(p => p._badge.group === 'mid', 3);
  const fwd = take(p => p._badge.group === 'fwd', 3);
  const picked = [...gk, ...def, ...mid, ...fwd];
  for (const p of list) {
    if (picked.length >= 11) break;
    if (!p._taken) {
      p._taken = true;
      picked.push(p);
    }
  }
  return { starters: picked.slice(0, 11), subs: list.filter(p => !p._taken) };
}

function orderedPitchPlayers(starters = []) {
  const pool = starters.map((p, i) => ({ ...p, _badge: badge(p, i), _key: playerId(p) || `idx-${i}` }));
  const used = new Set();
  const takeGroup = (group, count) => {
    const picked = [];
    for (const p of pool) {
      if (!used.has(p._key) && p._badge.group === group && picked.length < count) {
        used.add(p._key);
        picked.push(p);
      }
    }
    return picked;
  };
  const gk = takeGroup('gk', 1);
  const def = takeGroup('def', 4);
  const mid = takeGroup('mid', 3);
  const fwd = takeGroup('fwd', 3);
  const rest = pool.filter(p => !used.has(p._key));
  while (gk.length < 1 && rest.length) gk.push(rest.shift());
  while (def.length < 4 && rest.length) def.push(rest.shift());
  while (mid.length < 3 && rest.length) mid.push(rest.shift());
  while (fwd.length < 3 && rest.length) fwd.push(rest.shift());
  return { gk, def, mid, fwd };
}

function playerToken(player, index, zoneClass) {
  const b = badge(player, index);
  const num = player.jersey_number || player.number || index + 1;
  const name = esc(shortName(playerName(player)));
  const href = playerId(player) ? `/player.html?id=${encodeURIComponent(playerId(player))}` : '#';
  return `<a class="shirt-token ${zoneClass}" href="${href}"><div class="shirt ${b.group === 'gk' ? 'keeper' : ''}"><span>${esc(num)}</span></div><b>${name}</b><em class="${b.cls}">${esc(b.label)}</em></a>`;
}

function renderPitchInto(container, starters) {
  if (!container) return;
  const rows = orderedPitchPlayers(starters);
  const zones = [];
  rows.fwd.slice(0, 3).forEach((p, i) => zones.push(playerToken(p, i + 8, `slot-fwd-${i + 1}`)));
  rows.mid.slice(0, 3).forEach((p, i) => zones.push(playerToken(p, i + 5, `slot-mid-${i + 1}`)));
  rows.def.slice(0, 4).forEach((p, i) => zones.push(playerToken(p, i + 1, `slot-def-${i + 1}`)));
  rows.gk.slice(0, 1).forEach((p, i) => zones.push(playerToken(p, i, 'slot-gk')));
  container.innerHTML = `<div class="pitch-markings"></div>${zones.join('')}`;
}

function renderSubs(subs) {
  if (!subsList) return;
  subsList.innerHTML = subs.length ? subs.map((p, i) => {
    const b = badge(p, i + 11);
    const href = playerId(p) ? `/player.html?id=${encodeURIComponent(playerId(p))}` : '#';
    return `<a class="squad-mini" href="${href}"><span class="num">${esc(p.jersey_number || p.number || i + 12)}</span><b>${esc(shortName(playerName(p)))}</b><em class="${b.cls}">${esc(b.label)}</em></a>`;
  }).join('') : '<p class="muted">No substitute list available.</p>';
}

function renderStandouts(data) {
  if (!standoutPlayers) return;
  const awards = data.awards || [];
  const list = awards.length ? awards : (data.top_players || data.squad_players || []).slice(0, 3).map((p, i) => ({ ...p, award: i === 0 ? 'Top Player' : 'Standout Player' }));
  standoutPlayers.innerHTML = list.length ? list.slice(0, 4).map(p => {
    const href = playerId(p) ? `/player.html?id=${encodeURIComponent(playerId(p))}` : '#';
    return `<a class="standout-card" href="${href}">${p.image_url ? `<img src="${esc(p.image_url)}" alt="">` : '<div class="avatar-fallback">⚽</div>'}<div><b>${esc(playerName(p))}</b><span>${esc(p.award || 'Standout Player')}</span><p>${p.goals || 0} G · ${p.assists || 0} A · ${p.appearances || 0} Apps · ${p.yellow_cards || 0} YC · ${p.red_cards || 0} RC</p></div></a>`;
  }).join('') : '<p class="muted">Standout players will appear after squad import.</p>';
}

function finalScore(f) {
  const hs = f.home_score ?? f.home_goals ?? f.localteam_score ?? f.score_home ?? 0;
  const as = f.away_score ?? f.away_goals ?? f.visitorteam_score ?? f.score_away ?? 0;
  return `${hs} - ${as}`;
}

function matchRow(f) {
  const homeLogo = f.home_logo ? `<img src="${esc(f.home_logo)}" alt="">` : '';
  const awayLogo = f.away_logo ? `<img src="${esc(f.away_logo)}" alt="">` : '';
  return `<a class="team-match-row" href="/fixture.html?id=${esc(f.sportmonks_fixture_id || f.id || '')}"><div class="when"><span>${fmtDate(f.starting_at)}</span><b>${fmtTime(f.starting_at)}</b></div><div class="side right"><span>${esc(f.home_team || 'TBD')}</span>${homeLogo}</div><div class="vs">vs</div><div class="side">${awayLogo}<span>${esc(f.away_team || 'TBD')}</span></div><div class="stage">${esc(f.round_name || f.stage_name || f.group_name || '')}</div><div class="score">${esc(finalScore(f))}</div></a>`;
}

function renderFixtures(list) {
  if (!fixturesEl) return;
  fixturesEl.innerHTML = (list || []).length ? list.map(matchRow).join('') : '<p class="muted">No matches found for this World Cup.</p>';
}

function setSeason(seasonId) {
  currentSeason = seasonId ? String(seasonId) : '';
  const next = new URL(location.href);
  if (currentSeason) next.searchParams.set('season_id', currentSeason);
  history.replaceState(null, '', next.toString());
  loadTeam();
}
window.setSeason = setSeason;

function renderHistoryCards(data) {
  if (!historyCards) return;
  const active = String(data.season_id || currentSeason || '');
  historyCards.innerHTML = (data.world_cups || []).length ? data.world_cups.map(wc => {
    const isActive = String(wc.season_id) === active;
    const live = isActive && String(wc.year || '') === String((data.edition || {}).year || wc.year);
    return `<button class="history-card ${isActive ? 'active' : ''}" onclick="setSeason('${esc(wc.season_id)}')"><div class="crest mini">${logo((data.team || {}).logo_url, (data.team || {}).name)}</div><div><strong>${esc(wc.year || wc.season_id)}</strong><span>${esc(wc.host_country || wc.edition_name || '')}</span><b>${live ? 'LIVE' : esc(resultText(wc))}</b></div></button>`;
  }).join('') : '<p class="muted">Past World Cup cards will appear after stats rebuild.</p>';
}

function renderHistoryDetail(data) {
  if (!historyDetail) return;
  const selected = data.selected_history;
  const currentEditionSeason = String((data.edition || {}).sportmonks_season_id || '');
  if (!selected || String(selected.season_id) === currentEditionSeason) {
    historyDetail.innerHTML = '';
    return;
  }
  const { starters, subs } = pickLineup(data.squad_players || data.top_players || []);
  historyDetail.innerHTML = `<section class="team-season-layout past"><article class="panel team-lineup-panel"><div class="team-panel-head"><h2>${esc(selected.year)} Squad ${selected.host_country ? `(${esc(selected.host_country)})` : ''}</h2><div class="pill">${esc(resultText(selected))}</div></div><div class="lineup-pitch" id="pastPitch"></div></article><article class="panel team-subs-panel"><h2>Substitutes</h2><div id="pastSubs" class="squad-mini-list"></div></article><article class="panel"><h2>Past Standout Players</h2><div id="pastStandouts" class="standout-list"></div></article></section><section class="panel mt-4"><h2 class="text-xl font-black">${esc(selected.year)} Matches & Results</h2><div class="team-match-list mt-3">${(data.fixtures || []).map(matchRow).join('') || '<p class="muted">No matches found.</p>'}</div></section>`;
  renderPitchInto(document.getElementById('pastPitch'), starters);
  const pastSubs = document.getElementById('pastSubs');
  if (pastSubs) {
    pastSubs.innerHTML = subs.length ? subs.map((p, i) => {
      const b = badge(p, i + 11);
      const href = playerId(p) ? `/player.html?id=${encodeURIComponent(playerId(p))}` : '#';
      return `<a class="squad-mini" href="${href}"><span class="num">${esc(p.jersey_number || p.number || i + 12)}</span><b>${esc(shortName(playerName(p)))}</b><em class="${b.cls}">${esc(b.label)}</em></a>`;
    }).join('') : '<p class="muted">No substitute list available.</p>';
  }
  const pastStandouts = document.getElementById('pastStandouts');
  if (pastStandouts) {
    pastStandouts.innerHTML = (data.awards || data.top_players || []).slice(0, 4).map(p => {
      const href = playerId(p) ? `/player.html?id=${encodeURIComponent(playerId(p))}` : '#';
      return `<a class="standout-card" href="${href}">${p.image_url ? `<img src="${esc(p.image_url)}" alt="">` : '<div class="avatar-fallback">⚽</div>'}<div><b>${esc(playerName(p))}</b><span>${esc(p.award || 'Standout Player')}</span><p>${p.goals || 0} G · ${p.assists || 0} A · ${p.appearances || 0} Apps</p></div></a>`;
    }).join('') || '<p class="muted">No standout players available.</p>';
  }
}

function recordText(data, selected) {
  const source = data.standing || selected || {};
  return `${source.won ?? source.wins ?? 0}-${source.drawn ?? source.draws ?? 0}-${source.lost ?? source.losses ?? 0}`;
}

function rankText(data, selected) {
  const st = data.standing || {};
  if (st.position) return `#${st.position}`;
  if (selected?.final_rank) return `#${selected.final_rank}`;
  return selected?.reached_stage || '—';
}

async function loadTeam() {
  if (!id) throw new Error('Missing team id');
  const qs = currentSeason ? `?season_id=${encodeURIComponent(currentSeason)}` : '';
  const data = await dfFetch(`/api/public/team/${id}${qs}`);
  teamPayload = data;
  currentSeason = data.season_id || currentSeason;
  const t = data.team || {};
  const selected = data.selected_history || (data.world_cups || []).find(x => String(x.season_id) === String(currentSeason));
  const isCurrent = String((data.edition || {}).sportmonks_season_id || '') === String(currentSeason || '');
  document.title = `${t.name || 'Team'} | DreamFooter`;

  teamHero.innerHTML = `<div class="team-hero-main"><div class="crest hero-crest">${logo(t.logo_url, t.name)}</div><div><div class="pill ${isCurrent ? 'live-pill' : ''}">${esc(seasonLabel(selected, isCurrent))}</div><h1 class="title mt-3">${esc(t.name || 'Team')}</h1><p class="team-subtitle">FIFA World Cup ${esc(selected?.year || (data.edition || {}).year || '')}</p></div></div><div class="team-quick-stats"><div><span>Group</span><b>${esc((data.standing || {}).group_name || data.group_name || '—')}</b></div><div><span>Rank</span><b>${esc(rankText(data, selected))}</b></div><div><span>Record</span><b>${esc(recordText(data, selected))}</b></div></div>`;

  const { starters, subs } = pickLineup(data.squad_players || data.top_players || []);
  if (formationPill) formationPill.textContent = data.formation || '4-3-3';
  renderPitchInto(lineupPitch, starters);
  renderSubs(subs);
  renderStandouts(data);
  renderFixtures(data.fixtures || []);
  renderHistoryCards(data);
  renderHistoryDetail(data);
}

loadTeam().catch(e => {
  console.error(e);
  if (teamHero) teamHero.innerHTML = '<div class="muted">Could not load team.</div>';
});
