const params = new URLSearchParams(location.search);
const id = params.get('id');
let currentSeason = params.get('season_id');
let teamPayload = null;

const el = (id) => document.getElementById(id);
const teamHero = el('teamHero');
const formationPill = el('formationPill');
const lineupPitch = el('lineupPitch');
const subsList = el('subsList');
const standoutPlayers = el('standoutPlayers');
const fixturesEl = el('fixtures');
const historyCards = el('historyCards');
const historyDetail = el('historyDetail');
const viewPlayersLink = el('viewPlayersLink');

const POS_META = {
  GK: { label: 'GK', group: 'gk', cls: 'pos-gk' },
  RB: { label: 'RB', group: 'def', cls: 'pos-def' },
  CB: { label: 'CB', group: 'def', cls: 'pos-def' },
  LB: { label: 'LB', group: 'def', cls: 'pos-def' },
  RWB: { label: 'RWB', group: 'def', cls: 'pos-def' },
  LWB: { label: 'LWB', group: 'def', cls: 'pos-def' },
  DM: { label: 'DM', group: 'mid', cls: 'pos-mid' },
  CDM: { label: 'DM', group: 'mid', cls: 'pos-mid' },
  CM: { label: 'CM', group: 'mid', cls: 'pos-mid' },
  AM: { label: 'CAM', group: 'mid', cls: 'pos-mid' },
  CAM: { label: 'CAM', group: 'mid', cls: 'pos-mid' },
  RM: { label: 'RM', group: 'mid', cls: 'pos-mid' },
  LM: { label: 'LM', group: 'mid', cls: 'pos-mid' },
  RW: { label: 'RW', group: 'fwd', cls: 'pos-fwd' },
  LW: { label: 'LW', group: 'fwd', cls: 'pos-fwd' },
  ST: { label: 'ST', group: 'fwd', cls: 'pos-fwd' },
  CF: { label: 'ST', group: 'fwd', cls: 'pos-fwd' },
  FW: { label: 'ST', group: 'fwd', cls: 'pos-fwd' },
};

function resultText(x) {
  if (!x) return 'Played';
  if (x.won_tournament) return 'Winner';
  if (Number(x.final_rank) === 2) return 'Runner-up';
  if (Number(x.final_rank) === 3) return '3rd Place';
  if (x.final_rank) return `Finished #${x.final_rank}`;
  return x.reached_stage || 'Played';
}

function yearLabel(row, isCurrent) {
  const year = row?.year || row?.edition_year || '2026';
  return isCurrent ? `${year} - LIVE` : `${year}`;
}

function posKey(player, index = 0) {
  const raw = String(player.position || player.position_name || '').trim().toUpperCase();
  if (POS_META[raw]) return raw;
  if (raw.includes('GOAL') || raw.includes('KEEP')) return 'GK';
  if (raw.includes('DEF') || raw.includes('BACK')) return ['RB', 'CB', 'CB', 'LB'][index % 4];
  if (raw.includes('MID')) return ['CM', 'CAM', 'CM'][index % 3];
  if (raw.includes('WING')) return index % 2 ? 'RW' : 'LW';
  if (raw.includes('ATT') || raw.includes('FOR') || raw.includes('STRIK')) return 'ST';
  return ['GK','RB','CB','CB','LB','CM','CM','CAM','RW','ST','LW'][index] || 'CM';
}

function badge(player, index = 0) {
  return POS_META[posKey(player, index)] || POS_META.CM;
}

function shortName(name = '') {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return parts[0] || 'Player';
  return `${parts[0][0]}. ${parts.slice(-1)[0]}`;
}

function fullName(player) {
  return player.display_name || player.common_name || player.player_name || player.name || 'Player';
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
  const byGroup = (g) => sorted.filter((p, i) => badge(p, i).group === g);
  const gk = byGroup('gk').slice(0, 1);
  const def = byGroup('def').slice(0, 4);
  const mid = byGroup('mid').slice(0, 3);
  const fwd = byGroup('fwd').slice(0, 3);
  const used = new Set([...gk, ...def, ...mid, ...fwd].map(p => `${p.player_id || p._idx}`));
  const rest = sorted.filter(p => !used.has(`${p.player_id || p._idx}`));
  while (gk.length < 1 && rest.length) gk.push(rest.shift());
  while (def.length < 4 && rest.length) def.push(rest.shift());
  while (mid.length < 3 && rest.length) mid.push(rest.shift());
  while (fwd.length < 3 && rest.length) fwd.push(rest.shift());
  return { gk, def, mid, fwd };
}

const SLOTS = {
  fwd: [[25,18], [50,14], [75,18]],
  mid: [[28,43], [50,43], [72,43]],
  def: [[18,70], [38,70], [62,70], [82,70]],
  gk: [[50,88]],
};

function playerToken(player, index, xy) {
  const b = badge(player, index);
  const num = player.jersey_number || index + 1;
  const playerId = player.player_id || player.sportmonks_player_id || '';
  const href = playerId ? `/player.html?id=${encodeURIComponent(playerId)}` : '#';
  return `<a class="shirt-token" style="left:${xy[0]}%;top:${xy[1]}%" href="${href}">
    <div class="shirt ${b.group === 'gk' ? 'keeper' : ''}"><span>${esc(num)}</span></div>
    <b>${esc(shortName(fullName(player)))}</b>
    <em class="${b.cls}">${esc(b.label)}</em>
  </a>`;
}

function renderPitchInto(container, starters) {
  if (!container) return;
  const rows = orderedPitchPlayers(starters);
  const tokens = [];
  rows.fwd.slice(0, 3).forEach((p, i) => tokens.push(playerToken(p, i + 8, SLOTS.fwd[i])));
  rows.mid.slice(0, 3).forEach((p, i) => tokens.push(playerToken(p, i + 5, SLOTS.mid[i])));
  rows.def.slice(0, 4).forEach((p, i) => tokens.push(playerToken(p, i + 1, SLOTS.def[i])));
  rows.gk.slice(0, 1).forEach((p, i) => tokens.push(playerToken(p, i, SLOTS.gk[i])));
  container.innerHTML = `<div class="pitch-markings"></div>${tokens.join('')}`;
}

function renderSubs(subs) {
  if (!subsList) return;
  subsList.innerHTML = subs.length ? subs.slice(0, 18).map((p, i) => {
    const b = badge(p, i + 11);
    const pid = p.player_id || p.sportmonks_player_id || '';
    return `<a class="squad-mini" href="${pid ? `/player.html?id=${pid}` : '#'}">
      <span class="num">${esc(p.jersey_number || i + 12)}</span>
      <b>${esc(shortName(fullName(p)))}</b>
      <em class="${b.cls}">${esc(b.label)}</em>
    </a>`;
  }).join('') : '<p class="muted">No substitute list available.</p>';
}

function renderStandouts(data) {
  if (!standoutPlayers) return;
  const awards = data.awards || [];
  const list = awards.length ? awards : (data.top_players || []).slice(0, 3).map((p, i) => ({ ...p, award: i === 0 ? 'Top Player' : 'Standout Player' }));
  standoutPlayers.innerHTML = list.length ? list.slice(0, 4).map(p => {
    const pid = p.player_id || p.sportmonks_player_id || '';
    return `<a class="standout-card" href="${pid ? `/player.html?id=${pid}` : '#'}">
      ${p.image_url ? `<img src="${esc(p.image_url)}" alt="">` : '<div class="avatar-fallback">⚽</div>'}
      <div><b>${esc(fullName(p))}</b><span>${esc(p.award || 'Standout Player')}</span><p>${p.goals || 0} G · ${p.assists || 0} A · ${p.appearances || 0} Apps · ${p.yellow_cards || 0} YC · ${p.red_cards || 0} RC</p></div>
    </a>`;
  }).join('') : '<p class="muted">Standout players will appear after squad import.</p>';
}

function scoreText(f) {
  const hs = f.display_home_score ?? f.ft_home_score ?? f.home_score;
  const as = f.display_away_score ?? f.ft_away_score ?? f.away_score;
  if (hs === null || hs === undefined || as === null || as === undefined) return '0 - 0';
  return `${hs} - ${as}`;
}

function matchRow(f) {
  const score = scoreText(f);
  const fixtureId = f.sportmonks_fixture_id || f.id || '';
  const href = fixtureId ? `/fixture.html?id=${fixtureId}` : '#';
  return `<a class="team-match-row" href="${href}">
    <div class="when"><span>${fmtDate(f.starting_at)}</span><b>${fmtTime(f.starting_at)}</b></div>
    <div class="side right"><span>${esc(f.home_team || 'TBD')}</span>${f.home_logo ? `<img src="${esc(f.home_logo)}" alt="">` : ''}</div>
    <div class="vs">vs</div>
    <div class="side">${f.away_logo ? `<img src="${esc(f.away_logo)}" alt="">` : ''}<span>${esc(f.away_team || 'TBD')}</span></div>
    <div class="stage">${esc(f.round_name || f.stage_name || f.group_name || '')}</div>
    <div class="score">${esc(score)}</div>
  </a>`;
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
    const isLive = isActive && String(wc.year || '') === String((data.edition || {}).year || wc.year);
    return `<button class="history-card ${isActive ? 'active' : ''}" type="button" onclick="setSeason('${esc(wc.season_id)}')">
      <div class="crest mini">${logo((data.team || {}).logo_url, (data.team || {}).name)}</div>
      <div><strong>${esc(wc.year || wc.season_id)}</strong><span>${esc(wc.host_country || wc.edition_name || '')}</span><b>${isLive ? 'LIVE' : esc(resultText(wc))}</b></div>
    </button>`;
  }).join('') : '<p class="muted">Past World Cup cards will appear after stats rebuild.</p>';
}

function renderHistoryDetail(data) {
  if (!historyDetail) return;
  historyDetail.innerHTML = '';
}

function recordText(data, selected) {
  const src = selected || data.standing || {};
  return `${src.won ?? 0}-${src.drawn ?? 0}-${src.lost ?? 0}`;
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
  if (viewPlayersLink) viewPlayersLink.href = `/players.html?team_id=${encodeURIComponent(t.sportmonks_team_id || t.id || id)}&season_id=${encodeURIComponent(currentSeason || '')}`;

  const groupName = (data.standing || {}).group_name || (selected || {}).group_name || '—';
  const rankText = (data.standing || {}).position ? `#${(data.standing || {}).position}` : ((selected || {}).final_rank ? `#${selected.final_rank}` : resultText(selected));
  teamHero.innerHTML = `<div class="team-hero-main">
    <div class="crest hero-crest">${logo(t.logo_url, t.name)}</div>
    <div><div class="pill ${isCurrent ? 'live-pill' : ''}">${esc(yearLabel(selected, isCurrent))}</div><h1 class="title mt-3">${esc(t.name)}</h1><p class="team-subtitle">FIFA World Cup ${esc(selected?.year || (data.edition || {}).year || '')}</p></div>
  </div>
  <div class="team-quick-stats">
    <div><span>Group</span><b>${esc(groupName)}</b></div>
    <div><span>Rank</span><b>${esc(rankText || '—')}</b></div>
    <div><span>Record</span><b>${esc(recordText(data, selected))}</b></div>
  </div>`;

  const { starters, subs } = pickLineup(data.squad_players || data.top_players || []);
  if (formationPill) formationPill.textContent = '4-3-3';
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
