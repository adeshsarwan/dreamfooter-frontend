const box=document.getElementById('worldcups');
async function boot(){
  const d=await dfFetch('/api/public/world-cups');
  box.innerHTML=(d.data||[]).map(w=>`<a class="wc-card" href="/worldcup.html?season_id=${w.season_id}"><div class="pill">${w.year||w.season_id}</div><h2 class="mt-3 text-xl font-black">${w.name||'FIFA World Cup'}</h2><p class="muted mt-1">${w.host_country||''}</p><p class="mt-3 text-sm">Winner: <b>${w.winner||'TBD'}</b></p><p class="muted mt-3 text-sm">Open edition →</p></a>`).join('')||'<div class="panel muted">No World Cups imported yet.</div>';
}
boot().catch(e=>{console.error(e);box.innerHTML='<div class="panel muted">Could not load World Cups.</div>';});
