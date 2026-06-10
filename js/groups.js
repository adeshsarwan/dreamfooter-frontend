const box=document.getElementById('groups');
const seasonId = new URLSearchParams(location.search).get('season_id');
function num(v){return v??0}
async function boot(){
  const qs = seasonId ? `?season_id=${encodeURIComponent(seasonId)}` : '';
  const data=await dfFetch(`/api/public/standings${qs}`);
  const groups=data.groups||[];
  if(!groups.length){box.innerHTML='<div class="panel muted">No groups found.</div>'; return;}
  box.innerHTML=groups.map(g=>`<article class="panel group-card group-card-wide"><h2><span class="text-xl font-black text-white">${esc(g.group_name)}</span><span class="pill">${g.teams.length} teams</span></h2><div class="group-table-wrap"><table class="stat-table group-stat-table"><thead><tr><th>Team</th><th>MP</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th></tr></thead><tbody>${g.teams.sort((a,b)=>(a.position??999)-(b.position??999)||(b.points??0)-(a.points??0)||(b.goal_difference??0)-(a.goal_difference??0)||(b.goals_for??0)-(a.goals_for??0)).map((t,i)=>`<tr><td><span class="rank-no">${t.position??i+1}</span><a href="/team.html?id=${t.team_id}&season_id=${data.season_id}" class="team-link-cell">${t.logo_url?`<img class="inline h-5 w-5 mr-2 object-contain" src="${esc(t.logo_url)}">`:''}<span>${esc(t.name)}</span></a></td><td>${num(t.played)}</td><td>${num(t.won)}</td><td>${num(t.drawn)}</td><td>${num(t.lost)}</td><td>${num(t.goals_for)}</td><td>${num(t.goals_against)}</td><td>${num(t.goal_difference)}</td><td><b>${num(t.points)}</b></td></tr>`).join('')}</tbody></table></div></article>`).join('');
}
boot().catch(e=>{console.error(e);box.innerHTML='<div class="panel muted">Could not load groups.</div>';});
