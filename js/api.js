const API_BASE = "https://api.dreamfooter.com"; // Cloudflare frontend -> backend API

async function dfFetch(path, options = {}) {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: { "Accept": "application/json", ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    let body = "";
    try { body = await res.text(); } catch (_) {}
    throw new Error(`${res.status} ${res.statusText}${body ? ` - ${body.slice(0, 180)}` : ""}`);
  }
  return await res.json();
}

const apiGet = dfFetch;

function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function fmtDate(value) {
  if (!value) return "TBD";
  const d = new Date(String(value).replace(" ", "T") + (String(value).endsWith("Z") ? "" : "Z"));
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

function fmtTime(value) {
  if (!value) return "TBD";
  const d = new Date(String(value).replace(" ", "T") + (String(value).endsWith("Z") ? "" : "Z"));
  if (Number.isNaN(d.getTime())) return String(value).slice(11, 16) || "TBD";
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function logo(url, name = "") {
  if (url) return `<img src="${esc(url)}" alt="${esc(name)}" class="h-full w-full object-contain">`;
  const initials = String(name || "DF").split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join("").toUpperCase() || "⚽";
  return `<span>${esc(initials)}</span>`;
}

function flagOrLogo(team = {}) {
  if (team.logo_url) return `<img class="df-flag" src="${esc(team.logo_url)}" alt="${esc(team.name || "")}">`;
  return `<span class="df-flag-emoji">${esc(team.flag || "")}</span>`;
}

window.API_BASE = API_BASE;
window.dfFetch = dfFetch;
window.apiGet = apiGet;
window.esc = esc;
window.fmtDate = fmtDate;
window.fmtTime = fmtTime;
window.logo = logo;
window.flagOrLogo = flagOrLogo;
