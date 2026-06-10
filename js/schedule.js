const list = document.getElementById('scheduleList');
const stageFilter = document.getElementById('stageFilter');
const groupFilter = document.getElementById('groupFilter');
const params = new URLSearchParams(location.search);
const seasonId = params.get('season_id');
let scheduleData = null;
const stageLabel = f => f.group_name || f.stage_name || f.round_name || 'Fixture';
const venueLabel = f => [f.venue_city, f.venue_name].filter(Boolean).join(' · ') || 'Venue TBA';
const teamBadge = (name, logo) => `${logo?`<img class="df-flag" src="${esc(logo)}" alt="">`:''}<span>${esc(name || 'TBD')}</span>`;
const scoreLabel = f => (f.home_score != null || f.away_score != null) ? `${f.home_score ?? 0} - ${f.away_score ?? 0}` : 'vs';
const knockoutOrder = ['Round of 32','Round of 16','Quarter-finals','Semi-finals','3rd Place Final','Final'];
function isKnockout(f){
  const label = `${f.round_name||''} ${f.stage_name||''}`.toLowerCase();
  return !f.group_name && /(round of 32|round of 16|quarter|semi|final|3rd|third)/i.test(label);
}
function roundName(f){
  const raw = f.round_name || f.stage_name || 'Knockout';
  if(/32/.test(raw)) return 'Round of 32';
  if(/16/.test(raw)) return 'Round of 16';
  if(/quarter/i.test(raw)) return 'Quarter-finals';
  if(/semi/i.test(raw)) return 'Semi-finals';
  if(/3rd|third/i.test(raw)) return '3rd Place Final';
  if(/final/i.test(raw)) return 'Final';
  return raw;
}
function renderMiniGroups(rows){
  const groupMap = {};
  rows.filter(f=>f.group_name).forEach(f=>{
    const g = f.group_name;
    groupMap[g] ||= new Map();
    if(f.home_team) groupMap[g].set(f.home_team, {name:f.home_team, logo:f.home_logo});
    if(f.away_team) groupMap[g].set(f.away_team, {name:f.away_team, logo:f.away_logo});
  });
  const groups = Object.entries(groupMap).sort(([a],[b])=>String(a).localeCompare(String(b))).slice(0,8);
  if(!groups.length) return '';
  return `<div class="bracket-groups">${groups.map(([g,teams])=>`<div class="bracket-group-card"><b>${esc(g)}</b>${[...teams.values()].slice(0,4).map(t=>`<span>${t.logo?`<img src="${esc(t.logo)}" alt="">`:''}${esc(t.name)}</span>`).join('')}</div>`).join('')}</div>`;
}
function splitRound(fixtures, perSide){
  const sorted = [...(fixtures||[])].sort((a,b)=>String(a.starting_at||'').localeCompare(String(b.starting_at||'')) || Number(a.sportmonks_fixture_id||0)-Number(b.sportmonks_fixture_id||0));
  const half = perSide || Math.ceil(sorted.length/2);
  return { left: sorted.slice(0, half), right: sorted.slice(half) };
}
function matchCard(f, side='left', round=''){
  return `<article class="bracket2-match ${side==='left'?'to-right':'to-left'}">
    <div class="bracket2-time">${fmtDate(f.starting_at)} · ${fmtTime(f.starting_at)}</div>
    <div class="bracket2-teams"><div>${teamBadge(f.home_team,f.home_logo)}</div><strong>${esc(scoreLabel(f))}</strong><div>${teamBadge(f.away_team,f.away_logo)}</div></div>
    <div class="bracket2-meta"><span>${esc(venueLabel(f))}</span><span>${esc(f.stage_name || round)}</span></div>
  </article>`;
}
function emptyCard(label, side='left'){
  return `<article class="bracket2-match bracket2-empty ${side==='left'?'to-right':'to-left'}">
    <div class="bracket2-time">${esc(label)}</div>
    <div class="bracket2-teams"><div><span>TBD</span></div><strong>0 - 0</strong><div><span>TBD</span></div></div>
    <div class="bracket2-meta"><span>Venue TBA</span><span>${esc(label)}</span></div>
  </article>`;
}
function renderGroupColumn(rows, wanted){
  const groupMap = {};
  rows.filter(f=>f.group_name).forEach(f=>{
    const g = f.group_name;
    groupMap[g] ||= new Map();
    if(f.home_team) groupMap[g].set(f.home_team, {name:f.home_team, logo:f.home_logo});
    if(f.away_team) groupMap[g].set(f.away_team, {name:f.away_team, logo:f.away_logo});
  });
  const names = wanted.filter(g=>groupMap[g]).concat(Object.keys(groupMap).filter(g=>!wanted.includes(g))).slice(0,4);
  return `<div class="bracket2-groups">${names.map(g=>`<div class="bracket2-group"><b>${esc(g)}</b>${[...groupMap[g].values()].slice(0,4).map(t=>`<span>${t.logo?`<img src="${esc(t.logo)}" alt="">`:''}${esc(t.name)}</span>`).join('')}</div>`).join('')}</div>`;
}
function renderRoundColumn(title, fixtures, side, expected){
  const items = [...(fixtures||[])];
  while(items.length < expected) items.push(null);
  return `<div class="bracket2-round ${side}"><h3>${esc(title)}</h3>${items.slice(0,expected).map(f=>f?matchCard(f,side,title):emptyCard(title,side)).join('')}</div>`;
}
function renderFinalColumn(finals, thirds){
  const final = (finals||[]).find(f=>/final/i.test(roundName(f)) && !/3rd|third/i.test(roundName(f))) || (finals||[])[0];
  const third = (thirds||[])[0];
  return `<div class="bracket2-center"><div class="champion-box big">Champion</div><h3>Final</h3>${final?matchCard(final,'center','Final'):emptyCard('Final','center')}<h3>3rd Place</h3>${third?matchCard(third,'center','3rd Place Final'):emptyCard('3rd Place Final','center')}</div>`;
}
function renderBracket(rows){
  const knockouts = rows.filter(isKnockout);
  if(!knockouts.length) return '';
  const byRound = {};
  knockouts.forEach(f=>{ const r=roundName(f); (byRound[r] ||= []).push(f); });
  const r32 = splitRound(byRound['Round of 32'] || [], 8);
  const r16 = splitRound(byRound['Round of 16'] || [], 4);
  const qf = splitRound(byRound['Quarter-finals'] || [], 2);
  const sf = splitRound(byRound['Semi-finals'] || [], 1);
  const leftGroups = ['Group A','Group C','Group E','Group G'];
  const rightGroups = ['Group B','Group D','Group F','Group H'];
  return `<section class="panel knockout-panel knockout-bottom"><div class="ko-head"><div><span class="pill">Knockout Flow</span><h2>Road to the Champion</h2><p>From Round of 32 onwards, the left and right sides progress toward the Final. Teams will fill in as group rankings are confirmed. Each card shows kickoff, stadium and score.</p></div></div><div class="bracket2-board">
    ${renderGroupColumn(rows,leftGroups)}
    ${renderRoundColumn('Round of 32', r32.left, 'left', 8)}
    ${renderRoundColumn('Round of 16', r16.left, 'left', 4)}
    ${renderRoundColumn('Quarter-finals', qf.left, 'left', 2)}
    ${renderRoundColumn('Semi-finals', sf.left, 'left', 1)}
    ${renderFinalColumn(byRound['Final']||[], byRound['3rd Place Final']||[])}
    ${renderRoundColumn('Semi-finals', sf.right, 'right', 1)}
    ${renderRoundColumn('Quarter-finals', qf.right, 'right', 2)}
    ${renderRoundColumn('Round of 16', r16.right, 'right', 4)}
    ${renderRoundColumn('Round of 32', r32.right, 'right', 8)}
    ${renderGroupColumn(rows,rightGroups)}
  </div></section>`;
}
function renderSchedule() {
  const stage = stageFilter.value, group = groupFilter.value;
  const rows = (scheduleData?.data || []).filter(r => (!stage || r.stage_name === stage || r.round_name === stage) && (!group || r.group_name === group));
  if(!rows.length){ list.innerHTML = '<div class="panel muted">No fixtures found for this edition/filter.</div>'; return; }
  const byDate = {};
  rows.forEach(r => { const k = fmtDate(r.starting_at); (byDate[k] ||= []).push(r); });
  const bracket = (!stage || /round|quarter|semi|final/i.test(stage)) && !group ? renderBracket(scheduleData?.data || []) : '';
  const dateList = Object.entries(byDate).map(([date, fixtures]) => `<div class="mt-5"><h2 class="mb-2 text-lg font-black text-white">${date}</h2>${fixtures.map(f => `<a class="fixture-row" href="/fixture.html?id=${f.sportmonks_fixture_id}"><div><b>${esc(stageLabel(f))}</b><br><span class="muted">${esc(f.stage_name || f.round_name || 'Group Stage')}</span></div><div class="grid grid-cols-[1fr_auto_1fr] items-center gap-3"><span class="text-right font-black">${f.home_logo?`<img class="inline h-6 w-6 object-contain mr-2" src="${esc(f.home_logo)}">`:''}${esc(f.home_team || 'TBD')}</span><span class="pill">${esc(scoreLabel(f))}</span><span class="font-black">${f.away_logo?`<img class="inline h-6 w-6 object-contain mr-2" src="${esc(f.away_logo)}">`:''}${esc(f.away_team || 'TBD')}</span></div><div class="text-right"><b>${esc(venueLabel(f))}</b><br><span class="muted">${fmtTime(f.starting_at)}</span></div></a>`).join('')}</div>`).join('');
  list.innerHTML = `${dateList}${bracket}`;
}
async function boot(){
  const qs = seasonId ? `?season_id=${encodeURIComponent(seasonId)}` : '';
  scheduleData = await dfFetch(`/api/public/schedule${qs}`);
  document.title = `${scheduleData.edition?.name || 'Schedule'} | DreamFooter`;
  const existingStages = new Set();
  (scheduleData.filters?.stages||[]).forEach(x=>{ existingStages.add(x); stageFilter.insertAdjacentHTML('beforeend',`<option>${esc(x)}</option>`); });
  (scheduleData.data||[]).map(roundName).filter(x=>x && /round|quarter|semi|final/i.test(x)).forEach(x=>{ if(!existingStages.has(x)){ existingStages.add(x); stageFilter.insertAdjacentHTML('beforeend',`<option>${esc(x)}</option>`); } });
  (scheduleData.filters?.groups||[]).forEach(x=>groupFilter.insertAdjacentHTML('beforeend',`<option>${esc(x)}</option>`));
  stageFilter.onchange = renderSchedule; groupFilter.onchange = renderSchedule; renderSchedule();
}
boot().catch(e=>{console.error(e); list.innerHTML='<div class="panel muted">Could not load schedule.</div>';});
