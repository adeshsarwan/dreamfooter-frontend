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
function renderBracket(rows){
  const knockouts = rows.filter(isKnockout);
  if(!knockouts.length) return '';
  const byRound = {};
  knockouts.forEach(f=>{ const r=roundName(f); (byRound[r] ||= []).push(f); });
  const rounds = knockoutOrder.filter(r => byRound[r]?.length).concat(Object.keys(byRound).filter(r=>!knockoutOrder.includes(r)));
  return `<section class="panel knockout-panel"><div class="ko-head"><div><span class="pill">Knockout Flow</span><h2>Road to the Champion</h2><p>From Round of 32 onwards, fixtures fill in as teams progress. Each card shows kickoff, stadium and score.</p></div><div class="champion-box">Champion</div></div><div class="bracket-board"><div class="bracket-side bracket-left">${renderMiniGroups(rows)}</div><div class="bracket-scroll">${rounds.map((round,idx)=>`<div class="bracket-round"><h3>${esc(round)}</h3>${(byRound[round]||[]).map((f,i)=>`<article class="bracket-match ${idx<rounds.length-1?'connect-right':''}"><div class="bracket-time">${fmtDate(f.starting_at)} · ${fmtTime(f.starting_at)}</div><div class="bracket-teams"><div>${teamBadge(f.home_team,f.home_logo)}</div><strong>${esc(scoreLabel(f))}</strong><div>${teamBadge(f.away_team,f.away_logo)}</div></div><div class="bracket-meta"><span>${esc(venueLabel(f))}</span><span>${esc(f.stage_name || round)}</span></div></article>`).join('')}</div>`).join('')}</div></div></section>`;
}
function renderSchedule() {
  const stage = stageFilter.value, group = groupFilter.value;
  const rows = (scheduleData?.data || []).filter(r => (!stage || r.stage_name === stage || r.round_name === stage) && (!group || r.group_name === group));
  if(!rows.length){ list.innerHTML = '<div class="panel muted">No fixtures found for this edition/filter.</div>'; return; }
  const byDate = {};
  rows.forEach(r => { const k = fmtDate(r.starting_at); (byDate[k] ||= []).push(r); });
  const bracket = (!stage || /round|quarter|semi|final/i.test(stage)) && !group ? renderBracket(scheduleData?.data || []) : '';
  const dateList = Object.entries(byDate).map(([date, fixtures]) => `<div class="mt-5"><h2 class="mb-2 text-lg font-black text-white">${date}</h2>${fixtures.map(f => `<a class="fixture-row" href="/fixture.html?id=${f.sportmonks_fixture_id}"><div><b>${esc(stageLabel(f))}</b><br><span class="muted">${esc(f.stage_name || f.round_name || 'Group Stage')}</span></div><div class="grid grid-cols-[1fr_auto_1fr] items-center gap-3"><span class="text-right font-black">${f.home_logo?`<img class="inline h-6 w-6 object-contain mr-2" src="${esc(f.home_logo)}">`:''}${esc(f.home_team || 'TBD')}</span><span class="pill">${esc(scoreLabel(f))}</span><span class="font-black">${f.away_logo?`<img class="inline h-6 w-6 object-contain mr-2" src="${esc(f.away_logo)}">`:''}${esc(f.away_team || 'TBD')}</span></div><div class="text-right"><b>${esc(venueLabel(f))}</b><br><span class="muted">${fmtTime(f.starting_at)}</span></div></a>`).join('')}</div>`).join('');
  list.innerHTML = `${bracket}${dateList}`;
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
