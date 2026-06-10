const list = document.getElementById('scheduleList');
const stageFilter = document.getElementById('stageFilter');
const groupFilter = document.getElementById('groupFilter');
const params = new URLSearchParams(location.search);
const seasonId = params.get('season_id');
let scheduleData = null;
const stageLabel = f => f.group_name || f.stage_name || f.round_name || 'Fixture';
const venueLabel = f => [f.venue_city, f.venue_name].filter(Boolean).join(' · ') || 'Venue TBA';
function renderSchedule() {
  const stage = stageFilter.value, group = groupFilter.value;
  const rows = (scheduleData?.data || []).filter(r => (!stage || r.stage_name === stage) && (!group || r.group_name === group));
  if(!rows.length){ list.innerHTML = '<div class="panel muted">No fixtures found for this edition/filter.</div>'; return; }
  const byDate = {};
  rows.forEach(r => { const k = fmtDate(r.starting_at); (byDate[k] ||= []).push(r); });
  list.innerHTML = Object.entries(byDate).map(([date, fixtures]) => `<div class="mt-5"><h2 class="mb-2 text-lg font-black text-white">${date}</h2>${fixtures.map(f => `<a class="fixture-row" href="/fixture.html?id=${f.sportmonks_fixture_id}"><div><b>${esc(stageLabel(f))}</b><br><span class="muted">${esc(f.stage_name || 'Group Stage')}</span></div><div class="grid grid-cols-[1fr_auto_1fr] items-center gap-3"><span class="text-right font-black">${f.home_logo?`<img class="inline h-6 w-6 object-contain mr-2" src="${esc(f.home_logo)}">`:''}${esc(f.home_team || 'TBD')}</span><span class="pill">vs</span><span class="font-black">${f.away_logo?`<img class="inline h-6 w-6 object-contain mr-2" src="${esc(f.away_logo)}">`:''}${esc(f.away_team || 'TBD')}</span></div><div class="text-right"><b>${esc(venueLabel(f))}</b><br><span class="muted">${fmtTime(f.starting_at)}</span></div></a>`).join('')}</div>`).join('');
}
async function boot(){
  const qs = seasonId ? `?season_id=${encodeURIComponent(seasonId)}` : '';
  scheduleData = await dfFetch(`/api/public/schedule${qs}`);
  document.title = `${scheduleData.edition?.name || 'Schedule'} | DreamFooter`;
  (scheduleData.filters?.stages||[]).forEach(x=>stageFilter.insertAdjacentHTML('beforeend',`<option>${esc(x)}</option>`));
  (scheduleData.filters?.groups||[]).forEach(x=>groupFilter.insertAdjacentHTML('beforeend',`<option>${esc(x)}</option>`));
  stageFilter.onchange = renderSchedule; groupFilter.onchange = renderSchedule; renderSchedule();
}
boot().catch(e=>{console.error(e); list.innerHTML='<div class="panel muted">Could not load schedule.</div>';});
