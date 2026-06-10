const HOME_API_BASE = window.API_BASE || ""; // same-origin API proxy
let homeData = null;
let selectedPrediction = null;

const $ = (id) => document.getElementById(id);
const safe = (value, fallback = "—") => value ?? fallback;
const teamCode = (name = "") => name.split(/\s+/).filter(Boolean).map(x => x[0]).join("").slice(0,3).toUpperCase() || "TBD";

function formatDateTime(value) {
  if (!value) return "Kickoff TBA";
  const date = new Date(value.replace(" ", "T") + "Z");
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function formatTime(value) {
  if (!value) return "TBA";
  const date = new Date(value.replace(" ", "T") + "Z");
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function setBadge(el, team, code, logo) {
  el.textContent = code || teamCode(team);
  if (logo) {
    el.innerHTML = `<img src="${logo}" alt="${team}" class="h-11 w-11 rounded-full object-contain">`;
  }
}

function startCountdown(kickoff) {
  const tick = () => {
    const target = kickoff ? new Date(kickoff.replace(" ", "T") + "Z").getTime() : Date.now();
    let diff = Math.max(0, target - Date.now());
    const days = Math.floor(diff / 86400000); diff -= days * 86400000;
    const hours = Math.floor(diff / 3600000); diff -= hours * 3600000;
    const mins = Math.floor(diff / 60000); diff -= mins * 60000;
    const secs = Math.floor(diff / 1000);
    $("cdDays").textContent = String(days);
    $("cdHours").textContent = String(hours).padStart(2, "0");
    $("cdMins").textContent = String(mins).padStart(2, "0");
    $("cdSecs").textContent = String(secs).padStart(2, "0");
  };
  tick();
  setInterval(tick, 1000);
}

function renderUpcoming(match, edition) {
  const live = homeData?.live_matches || [];
  if (live.length) {
    const m = live[0];
    $("matchCompetition").textContent = "LIVE NOW";
    $("matchMeta").innerHTML = `<a class="text-rose-300 font-black" href="/live.html">Open Live Center</a>`;
    $("homeTeam").textContent = safe(m.home_team, "TBD");
    $("awayTeam").textContent = safe(m.away_team, "TBD");
    setBadge($("homeBadge"), m.home_team, m.home_code, m.home_logo);
    setBadge($("awayBadge"), m.away_team, m.away_code, m.away_logo);
    $("kickoffText").innerHTML = `<a href="/live.html" class="font-black text-white">${m.home_score ?? 0} - ${m.away_score ?? 0} · Watch live score and commentary</a>`;
    ["cdDays","cdHours","cdMins","cdSecs"].forEach(id => $(id).textContent = "LIVE");
    return;
  }
  if (!match) {
    $("matchMeta").textContent = "Schedule will appear once fixtures are available.";
    return;
  }
  $("matchCompetition").textContent = safe(edition?.name, "FIFA World Cup");
  $("matchMeta").textContent = [safe(match.group_name, "Fixture"), match.name].filter(Boolean).join(" · ");
  $("homeTeam").textContent = safe(match.home_team, "TBD");
  $("awayTeam").textContent = safe(match.away_team, "TBD");
  setBadge($("homeBadge"), match.home_team, match.home_code, match.home_logo);
  setBadge($("awayBadge"), match.away_team, match.away_code, match.away_logo);
  $("kickoffText").textContent = `${formatDateTime(match.starting_at)}${match.venue_name ? ` · ${match.venue_name}` : ""}`;
  startCountdown(match.starting_at);
}

function renderMatches(matches = []) {
  const box = $("matchesToday");
  if (!matches.length) {
    box.innerHTML = `<div class="rounded-xl bg-white/5 p-3 text-slate-400">No fixtures listed for this matchday yet.</div>`;
    return;
  }
  box.innerHTML = matches.map(m => `
    <div class="grid grid-cols-[70px_1fr_auto_1fr] items-center gap-2 rounded-xl bg-white/5 px-3 py-2">
      <span class="text-xs text-slate-400">${formatTime(m.starting_at)}</span>
      <span class="truncate font-bold">${safe(m.home_code, teamCode(m.home_team))}</span>
      <span class="rounded-md bg-slate-800 px-2 py-1 text-[10px] font-black">VS</span>
      <span class="truncate text-right font-bold">${safe(m.away_code, teamCode(m.away_team))}</span>
    </div>`).join("");
}

function renderPredictions(options = []) {
  const trophy = `<div class="hidden place-items-center text-8xl md:grid">🏆</div>`;
  const cards = options.slice(0,4).map(opt => `
    <button class="prediction-card" data-key="${opt.key}" data-label="${opt.label}">
      <div class="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-white/10 text-xl font-black">
        ${opt.logo_url ? `<img src="${opt.logo_url}" class="h-12 w-12 object-contain" alt="${opt.label}">` : safe(opt.short_code, teamCode(opt.label))}
      </div>
      <div class="mt-3 text-sm font-black uppercase">${opt.label}</div>
      <div class="mt-2 font-mono text-2xl font-black">${opt.odds || "Vote"}</div>
    </button>`);
  cards.splice(2, 0, trophy);
  $("predictionOptions").innerHTML = cards.join("");
  document.querySelectorAll(".prediction-card").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".prediction-card").forEach(x => x.classList.remove("selected"));
      btn.classList.add("selected");
      selectedPrediction = { key: btn.dataset.key, label: btn.dataset.label };
    });
  });
}

function renderAwards(markets = []) {
  $("awardMarkets").innerHTML = markets.map(m => `
    <div class="award-card">
      <div class="text-4xl">${m.icon}</div>
      <div class="mt-3 min-h-10 text-xs font-black uppercase">${m.title}</div>
      <button class="vote-award mt-3 w-full rounded-lg bg-purple-700/70 py-2 text-xs font-black uppercase" data-key="${m.key}" data-label="${m.title}">Vote Now</button>
    </div>`).join("");
}

function renderStandings(rows = []) {
  const box = $("standingsList");
  if (!rows.length) {
    box.innerHTML = `<div class="rounded-xl bg-white/5 p-3 text-sm text-slate-400">Standings will update when matches begin.</div>`;
    return;
  }
  box.innerHTML = rows.slice(0,8).map((r, idx) => `
    <div class="grid grid-cols-[28px_1fr_42px_42px] items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm">
      <span class="font-mono text-slate-400">${r.position || idx + 1}</span>
      <span class="truncate font-bold">${r.logo_url ? `<img src="${r.logo_url}" class="mr-2 inline h-5 w-5 object-contain">` : ""}${r.name}</span>
      <span class="text-right text-slate-300">${r.goal_difference ?? 0}</span>
      <span class="text-right font-black text-white">${r.points ?? 0}</span>
    </div>`).join("");
}

function renderPerformers(rows = []) {
  const box = $("topPerformers");
  if (!rows.length) {
    box.innerHTML = `<div class="rounded-xl bg-white/5 p-3 text-sm text-slate-400">Player performance data will update after import/rebuild.</div>`;
    return;
  }
  box.innerHTML = rows.slice(0,5).map((p, i) => `
    <div class="grid grid-cols-[28px_1fr_42px] items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm">
      <span class="font-mono text-slate-400">${i + 1}</span>
      <span class="truncate font-bold">${p.image_url ? `<img src="${p.image_url}" class="mr-2 inline h-6 w-6 rounded-full object-cover">` : ""}${p.display_name}</span>
      <span class="text-right font-black">${p.goals ?? 0} ⚽</span>
    </div>`).join("");
}

function renderCards(cards = []) {
  const fallback = [
    { player_name: "Mbappé", rarity: "Legendary", base_stat: 93, team_code: "FRA", card_type: "FW" },
    { player_name: "Bellingham", rarity: "Epic", base_stat: 91, team_code: "ENG", card_type: "MF" },
    { player_name: "Vinicius Jr.", rarity: "Epic", base_stat: 89, team_code: "BRA", card_type: "FW" },
    { player_name: "Saliba", rarity: "Rare", base_stat: 88, team_code: "FRA", card_type: "DF" },
    { player_name: "Martínez", rarity: "Rare", base_stat: 87, team_code: "ARG", card_type: "GK" }
  ];
  const data = cards.length ? cards : fallback;
  $("featuredCards").innerHTML = data.map(c => `
    <div class="player-card card-rarity-${c.rarity}">
      <div class="flex items-start justify-between">
        <div class="font-mono text-3xl font-black">${c.base_stat || 80}</div>
        <div class="text-xs font-black uppercase text-slate-300">${safe(c.team_code, "DF")}</div>
      </div>
      <div class="mt-4 grid place-items-center">
        ${c.player_image ? `<img src="${c.player_image}" class="h-20 w-20 rounded-full object-cover" alt="${c.player_name}">` : `<div class="grid h-20 w-20 place-items-center rounded-full bg-white/10 text-4xl">⚽</div>`}
      </div>
      <div class="mt-3 text-center text-sm font-black">${c.player_name}</div>
      <div class="text-center text-xs uppercase text-purple-300">${c.card_type || c.rarity}</div>
    </div>`).join("");
}

async function submitVote(marketKey, option) {
  const sessionId = localStorage.getItem("df_session") || crypto.randomUUID();
  localStorage.setItem("df_session", sessionId);
  const body = {
    session_id: sessionId,
    season_id: homeData?.edition?.sportmonks_season_id || homeData?.next_match?.season_id || null,
    market_key: marketKey,
    option_key: option.key,
    option_label: option.label
  };
  const res = await fetch(`${HOME_API_BASE}/api/public/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error("Vote failed");
  return res.json();
}

async function boot() {
  try {
    const res = await fetch(`${HOME_API_BASE}/api/public/home`);
    if (!res.ok) throw new Error(`API ${res.status}`);
    homeData = await res.json();
    $("coinBalance").textContent = homeData.wallet?.coins ?? 420;
    renderUpcoming(homeData.next_match, homeData.edition);
    renderMatches(homeData.matches_today);
    renderPredictions(homeData.prediction_options);
    renderAwards(homeData.award_markets);
    renderStandings(homeData.standings);
    renderPerformers(homeData.top_performers);
    renderCards(homeData.featured_cards);

    $("predictBtn").addEventListener("click", async () => {
      if (!selectedPrediction) return alert("Pick a team first.");
      await submitVote("world_cup_winner", selectedPrediction);
      alert(`Prediction saved: ${selectedPrediction.label}`);
    });
    document.querySelectorAll(".vote-award").forEach(btn => btn.addEventListener("click", async () => {
      await submitVote(btn.dataset.key, { key: btn.dataset.key, label: btn.dataset.label });
      alert(`${btn.dataset.label} vote saved.`);
    }));
  } catch (err) {
    console.error(err);
    renderUpcoming(null, null);
    renderMatches([]);
    renderPredictions([]);
    renderAwards([
      {key:'world_cup_winner',title:'World Cup Winner',icon:'🏆'},
      {key:'golden_boot',title:'Golden Boot',icon:'👟'},
      {key:'best_goalkeeper',title:'Best Goalkeeper',icon:'🧤'}
    ]);
    renderStandings([]);
    renderPerformers([]);
    renderCards([]);
  }
}

boot();
