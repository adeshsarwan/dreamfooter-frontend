const params = new URLSearchParams(location.search);
const id = params.get('id');
let currentSeason = params.get('season_id');
let teamPayload = null;

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
  CF: { label: 'CF', group: 'fwd', cls: 'pos-fwd' },
};

function resultText(x) {
  if (!x) return 'Played';
  if (x.won_tournament) return 'Winner';
  if (x.final_rank === 2) return 'Runner-up';
  if (x.final_rank === 3) return '3rd Place';
  if (x.final_rank) return `Finished #${x.final_rank}`;
  return x.reached_stage || 'Played';
}

function yearLabel(row, selected) {
  if (!row) return selected ? '2026 - LIVE' : 'World Cup';
  if (selected) return `${row.year || '2026'} - LIVE`;
  return `${row.year || row.season_id}`;
}

function posKey(player, index = 0) {
  const raw = String(player.position || '').trim().toUpperCase();
  if (POS_META[raw]) return raw;
  if (raw.includes('GOAL')) return 'GK';
  if (raw.includes('KEEP')) return 'GK';
  if (raw.includes('DEF')) return index % 2 ? 'CB' : 'LB';
  if (raw.includes('BACK')) return index % 2 ? 'RB' : 'LB';
  if (raw.includes('MID')) return index % 2 ? 'CM' : 'CAM';
  if (raw.includes('WING')) return index % 2 ? 'RW' : 'LW';
  if (raw.includes('ATT')) return 'ST';
  if (raw.includes('FOR')) return 'ST';
  return ['GK','RB','CB','CB','LB','CM','CM','CAM','RW','ST','LW'][index] || 'CM';
}

function badge(player, index = 0) {
  const key = posKey(player, index);
  return POS_META[key] || POS_META.CM;
}

function shortName(name = '') {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return parts[0] || 'Player';
  return `${parts[0][0]}. ${parts.slice(-1)[0]}`;
}

function pickLineup(players = []) {
  const list = players.map((p, i) => ({ ...p, _idx: i, _badge: badge(p, i) }));
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

function orderedPitchPlayers(starters) {
  const sorted = [...starters];
  const byGroup = g => sorted.filter((p, i) => badge(p, i).group === g);
  const gk = byGroup('gk').slice(0, 1);
  const def = byGroup('def').slice(0, 4);
  const mid = byGroup('mid').slice(0, 3);
  const fwd = byGroup('fwd').slice(0, 3);
  const used = new Set([...gk, ...def, ...mid, ...fwd].map(p => p.player_id));
  const rest = sorted.filter(p => !used.has(p.player_id));
  while (gk.length < 1 && rest.length) gk.push(rest.shift());
  while (def.length < 4 && rest.length) def.push(rest.shift());
  while (mid.length < 3 && rest.length) mid.push(rest.shift());
  while (fwd.length < 3 && rest.length) fwd.push(rest.shift());
  return { gk, def, mid, fwd };
}

function playerToken(player, index, zoneClass) {
  const b = badge(player, index);
  const num = player.jersey_number || index + 1;
  const name = esc(shortName(player.display_name || player.common_name || 'Player'));
  return `<a class="shirt-token ${zoneClass}" href="/player.html?id=${player.player_id}"><div class="shirt ${b.group === 'gk' ? 'keeper' : ''}"><span>${esc(num)}</span></div><b>${name}</b><em class="${b.cls}">${esc(b.label)}</em></a>`;
}

function renderPitchInto(container, starters) {
  const rows = orderedPitchPlayers(starters);
  const zones = [];
  rows.fwd.slice(0, 3).forEach((p, i) => zones.push(playerToken(p, i + 8, `slot-fwd-${i + 1}`)));
  rows.mid.slice(0, 3).forEach((p, i) => zones.push(playerToken(p, i + 5, `slot-mid-${i + 1}`)));
  rows.def.slice(0, 4).forEach((p, i) => zones.push(playerToken(p, i + 1, `slot-def-${i + 1}`)));
  rows.gk.slice(0, 1).forEach((p, i) => zones.push(playerToken(p, i, 'slot-gk')));
  container.innerHTML = `<div class="pitch-markings"></div>${zones.join('')}`;
}

function renderPitch(starters) {
  renderPitchInto(document.getElementById('lineupPitch'), starters);
}

function renderSubs(subs) {
  subsList.innerHTML = subs.length ? subs.map((p, i) => {
    const b = badge(p, i + 11);
    return `<a class="squad-mini" href="/player.html?id=${p.player_id}"><span class="num">${esc(p.jersey_number || i + 12)}</span><b>${esc(shortName(p.display_name || p.common_name))}</b><em class="${b.cls}">${esc(b.label)}</em></a>`;
  }).join('') : '<p class="muted">No substitute list available.</p>';
}

function renderStandouts(data) {
  const awards = data.awards || [];
  const list = awards.length ? awards : (data.top_players || []).slice(0, 3).map((p, i) => ({ ...p, award: i === 0 ? 'Top Player' : 'Standout Player' }));
  standoutPlayers.innerHTML = list.length ? list.slice(0, 4).map(p => `<a class="standout-card" href="/player.html?id=${p.player_id}">${p.image_url ? `<img src="${esc(p.image_url)}" alt="">` : '<div class="avatar-fallback">⚽</div>'}<div><b>${esc(p.display_name || p.common_name)}</b><span>${esc(p.award || 'Standout Player')}</span><p>${p.goals || 0} G · ${p.assists || 0} A · ${p.appearances || 0} Apps · ${p.yellow_cards || 0} YC · ${p.red_cards || 0} RC</p></div></a>`).join('') : '<p class="muted">Standout players will appear after squad import.</p>';
}

function matchRow(f) {
  const score = `${f.home_score ?? 0} - ${f.away_score ?? 0}`;
  return `<a class="team-match-row" href="/fixture.html?id=${f.sportmonks_fixture_id}"><div class="when"><span>${fmtDate(f.starting_at)}</span><b>${fmtTime(f.starting_at)}</b></div><div class="side right"><span>${esc(f.home_team || 'TBD')}</span>${f.home_logo ? `<img src="${esc(f.home_logo)}" alt="">` : ''}</div><div class="vs">vs</div><div class="side">${f.away_logo ? `<img src="${esc(f.away_logo)}" alt="">` : ''}<span>${esc(f.away_team || 'TBD')}</span></div><div class="stage">${esc(f.round_name || f.stage_name || f.group_name || '')}</div><div class="score">${esc(score)}</div></a>`;
}

function renderFixtures(list) {
  const el = document.getElementById('fixtures');
  el.innerHTML = (list || []).length ? list.map(matchRow).join('') : '<p class="muted">No matches found for this World Cup.</p>';
}

function setSeason(seasonId) {
  currentSeason = seasonId ? String(seasonId) : '';
  const next = new URL(location.href);
  if (currentSeason) next.searchParams.set('season_id', currentSeason);
  history.replaceState(null, '', next.toString());
  loadTeam();
}

function renderHistoryCards(data) {
  const active = String(data.season_id || currentSeason || '');
  historyCards.innerHTML = (data.world_cups || []).length ? data.world_cups.map(wc => {
    const isActive = String(wc.season_id) === active;
    const live = isActive && String(wc.year || '') === String((data.edition || {}).year || wc.year);
    return `<button class="history-card ${isActive ? 'active' : ''}" onclick="setSeason('${wc.season_id}')"><div class="crest mini">${logo(data.team.logo_url, data.team.name)}</div><div><strong>${esc(wc.year || wc.season_id)}</strong><span>${esc(wc.host_country || wc.edition_name || '')}</span><b>${live ? 'LIVE' : esc(resultText(wc))}</b></div></button>`;
  }).join('') : '<p class="muted">Past World Cup cards will appear after stats rebuild.</p>';
}

function renderHistoryDetail(data) {
  const selected = data.selected_history;
  if (!selected || String(selected.season_id) === String((data.edition || {}).sportmonks_season_id)) {
    historyDetail.innerHTML = '';
    return;
  }
  const { starters, subs } = pickLineup(data.squad_players || data.top_players || []);
  historyDetail.innerHTML = `<section class="team-season-layout past"><article class="panel team-lineup-panel"><div class="team-panel-head"><h2>${esc(selected.year)} Squad ${selected.host_country ? `(${esc(selected.host_country)})` : ''}</h2><div class="pill">${esc(resultText(selected))}</div></div><div class="lineup-pitch" id="pastPitch"></div></article><article class="panel team-subs-panel"><h2>Substitutes</h2><div id="pastSubs" class="squad-mini-list"></div></article><article class="panel"><h2>Past Standout Players</h2><div id="pastStandouts" class="standout-list"></div></article></section><section class="panel mt-4"><h2 class="text-xl font-black">${esc(selected.year)} Matches & Results</h2><div class="team-match-list mt-3">${(data.fixtures || []).map(matchRow).join('') || '<p class="muted">No matches found.</p>'}</div></section>`;
  renderPitchInto(document.getElementById('pastPitch'), starters);
  document.getElementById('pastSubs').innerHTML = subs.length ? subs.map((p, i) => {
    const b = badge(p, i + 11);
    return `<a class="squad-mini" href="/player.html?id=${p.player_id}"><span class="num">${esc(p.jersey_number || i + 12)}</span><b>${esc(shortName(p.display_name || p.common_name))}</b><em class="${b.cls}">${esc(b.label)}</em></a>`;
  }).join('') : '<p class="muted">No substitute list available.</p>';
  document.getElementById('pastStandouts').innerHTML = (data.awards || data.top_players || []).slice(0, 4).map(p => `<a class="standout-card" href="/player.html?id=${p.player_id}">${p.image_url ? `<img src="${esc(p.image_url)}" alt="">` : '<div class="avatar-fallback">⚽</div>'}<div><b>${esc(p.display_name || p.common_name)}</b><span>${esc(p.award || 'Standout Player')}</span><p>${p.goals || 0} G · ${p.assists || 0} A · ${p.appearances || 0} Apps</p></div></a>`).join('') || '<p class="muted">No standout players available.</p>';
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
  teamHero.innerHTML = `<div class="team-hero-main"><div class="crest hero-crest">${logo(t.logo_url, t.name)}</div><div><div class="pill ${isCurrent ? 'live-pill' : ''}">${esc(yearLabel(selected, isCurrent))}</div><h1 class="title mt-3">${esc(t.name)}</h1><p class="team-subtitle">FIFA World Cup ${esc(selected?.year || (data.edition || {}).year || '')}</p></div></div><div class="team-quick-stats"><div><span>Group</span><b>${esc((data.standing || {}).group_name || '—')}</b></div><div><span>Rank</span><b>${esc((data.standing || {}).position ? `#${(data.standing || {}).position}` : ((selected || {}).final_rank ? `#${selected.final_rank}` : '—'))}</b></div><div><span>Record</span><b>${esc(`${(selected || data.standing || {}).won ?? 0}-${(selected || data.standing || {}).drawn ?? 0}-${(selected || data.standing || {}).lost ?? 0}`)}</b></div></div>`;

  const { starters, subs } = pickLineup(data.squad_players || data.top_players || []);
  formationPill.textContent = '4-3-3';
  renderPitch(starters);
  renderSubs(subs);
  renderStandouts(data);
  renderFixtures(data.fixtures || []);
  renderHistoryCards(data);
  renderHistoryDetail(data);
}

loadTeam().catch(e => {
  console.error(e);
  teamHero.innerHTML = '<div class="muted">Could not load team.</div>';
});
