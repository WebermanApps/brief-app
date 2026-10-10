(() => {
const C = window.BRIEF_CONFIG, $ = (s) => document.querySelector(s);
const LS = { token: "briefapp.dbx.token", verifier: "briefapp.dbx.verifier", mode: "briefapp.mode", taps: (d) => `briefapp.taps.${d}` };
const LABEL = { approve: "Approve", park: "Park With Date", done: "Done", ask: "Ask Me" };
const today = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD, device local
let brief = null, mode = localStorage.getItem(LS.mode) || "none";
const redirect = () => location.origin + location.pathname;

// ---- Taps store (localStorage is the source of truth on-device; saved flag = written to Dropbox) ----
const getTaps = () => JSON.parse(localStorage.getItem(LS.taps(brief.date)) || "[]");
const setTaps = (t) => { localStorage.setItem(LS.taps(brief.date), JSON.stringify(t)); renderStatus(); };
const exportTaps = () => getTaps().map(({ _saved, ...t }) => t); // taps-YYYY-MM-DD.json shape

function record(id, action, extra = {}) {
  const tap = { id, action, ...extra, ts: new Date().toISOString(), _saved: false };
  setTaps([...getTaps(), tap]); renderCards(); if (mode === "dropbox") sync();
}

// ---- Dropbox PKCE ----
const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
async function connect() {
  if (!C.DROPBOX_APP_KEY || C.DROPBOX_APP_KEY.startsWith("YOUR_")) return msg("Dropbox app key not set in config.js. Use Demo Mode.");
  const v = b64url(crypto.getRandomValues(new Uint8Array(48)));
  localStorage.setItem(LS.verifier, v);
  const ch = b64url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v)));
  const q = new URLSearchParams({ client_id: C.DROPBOX_APP_KEY, response_type: "code", code_challenge: ch, code_challenge_method: "S256", redirect_uri: redirect(), token_access_type: "offline" });
  location.href = "https://www.dropbox.com/oauth2/authorize?" + q;
}
async function tokenReq(body) {
  const r = await fetch("https://api.dropboxapi.com/oauth2/token", { method: "POST", body: new URLSearchParams({ client_id: C.DROPBOX_APP_KEY, ...body }) });
  if (!r.ok) throw new Error("Token request failed " + r.status);
  const j = await r.json(), old = JSON.parse(localStorage.getItem(LS.token) || "{}");
  localStorage.setItem(LS.token, JSON.stringify({ access: j.access_token, refresh: j.refresh_token || old.refresh, exp: Date.now() + (j.expires_in - 60) * 1000 }));
}
async function handleRedirect() {
  const code = new URLSearchParams(location.search).get("code");
  if (!code) return;
  await tokenReq({ grant_type: "authorization_code", code, code_verifier: localStorage.getItem(LS.verifier), redirect_uri: redirect() });
  localStorage.removeItem(LS.verifier); history.replaceState(null, "", redirect());
  mode = "dropbox"; localStorage.setItem(LS.mode, mode);
}
async function access() {
  let t = JSON.parse(localStorage.getItem(LS.token) || "null");
  if (!t) throw new Error("Not connected");
  if (Date.now() > t.exp) { await tokenReq({ grant_type: "refresh_token", refresh_token: t.refresh }); t = JSON.parse(localStorage.getItem(LS.token)); }
  return t.access;
}
async function dbxDownload(path) {
  const r = await fetch("https://content.dropboxapi.com/2/files/download", { method: "POST", headers: { Authorization: "Bearer " + await access(), "Dropbox-API-Arg": JSON.stringify({ path }) } });
  if (r.status === 409) return null; if (!r.ok) throw new Error("Download failed " + r.status);
  return r.json();
}
async function dbxUpload(path, data) {
  const r = await fetch("https://content.dropboxapi.com/2/files/upload", { method: "POST", headers: { Authorization: "Bearer " + await access(), "Content-Type": "application/octet-stream", "Dropbox-API-Arg": JSON.stringify({ path, mode: "overwrite", mute: true }) }, body: JSON.stringify(data, null, 2) });
  if (!r.ok) throw new Error("Upload failed " + r.status);
}
async function sync() {
  if (mode !== "dropbox") { msg("Demo Mode: taps stay on this device. Use Export Taps."); return; }
  const local = getTaps(); if (!local.some((t) => !t._saved)) return renderStatus();
  try {
    const remote = (await dbxDownload(C.tapsPath(brief.date))) || [];
    const key = (t) => t.id + "|" + t.ts, seen = new Set(remote.map(key));
    const merged = [...remote, ...exportTaps().filter((t) => !seen.has(key(t)))];
    await dbxUpload(C.tapsPath(brief.date), merged);
    setTaps(local.map((t) => ({ ...t, _saved: true }))); msg("Saved to Dropbox.");
  } catch (e) { msg("Not saved: " + e.message + ". Will retry on next tap or Sync."); }
}

// ---- Render ----
function msg(s) { $("#msg").textContent = s; }
function renderStatus() {
  const t = brief ? getTaps() : [], s = t.filter((x) => x._saved).length;
  $("#saved").textContent = s + " Saved"; $("#unsaved").textContent = (t.length - s) + " Unsaved";
  $("#mode").textContent = mode === "dropbox" ? "Dropbox" : mode === "demo" ? "Demo Mode · Sample Data" : "Not Connected";
}
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
function renderCards() {
  const taps = getTaps(), items = [...brief.items].sort((a, b) => a.rank - b.rank).slice(0, 5);
  $("#cards").innerHTML = items.map((it) => {
    const last = taps.filter((t) => t.id === it.id).pop(), opts = (it.options || []).filter((o) => LABEL[o]);
    const tapTxt = last ? `Last Tap: ${LABEL[last.action]}${last.park_date ? " → " + last.park_date : ""}${last.note ? " · “" + esc(last.note) + "”" : ""} · ${last._saved ? "Saved" : "Unsaved"}` : "";
    return `<article class="card${last?.action === "done" ? " done" : ""}" data-id="${esc(it.id)}">
      <div class="label">${esc(it.rank)} · ${esc(it.lane)}</div><h3>${esc(it.title)}</h3><p>${esc(it.detail)}</p>
      <div class="actions">${opts.map((o) => `<button class="btn${last?.action === o ? " on" : ""}" data-act="${o}">${LABEL[o]}</button>`).join("")}</div>
      ${opts.includes("park") ? `<div class="extra" data-x="park"><input type="date" aria-label="Park date" min="${today()}"><button class="btn sm" data-confirm="park">Confirm Park</button></div>` : ""}
      ${opts.includes("ask") ? `<div class="extra" data-x="ask"><textarea aria-label="Question" placeholder="What do you want to ask?"></textarea><button class="btn sm" data-confirm="ask">Send Question</button></div>` : ""}
      <div class="tapline">${tapTxt}</div></article>`;
  }).join("") || `<p class="muted">No items today.</p>`;
}
function renderChart(ch) {
  const placeholder = !ch || !Array.isArray(ch.values) || !ch.values.length;
  const c = placeholder ? { title: "Placeholder Chart (Sample Data)", labels: ["Mon", "Tue", "Wed", "Thu", "Fri"], values: [3, 5, 2, 4, 1] } : ch;
  const W = 320, H = 180, P = 24, max = Math.max(...c.values, 1), bw = (W - 2 * P) / c.values.length;
  const bars = c.values.map((v, i) => { const h = (v / max) * (H - 2 * P); return `<rect x="${P + i * bw + 4}" y="${H - P - h}" width="${bw - 8}" height="${h}" fill="${placeholder ? "#a3a3a3" : "#171717"}"/><text x="${P + i * bw + bw / 2}" y="${H - 6}" text-anchor="middle" font-size="11" fill="#737373">${esc(c.labels?.[i] ?? "")}</text>`; }).join("");
  $("#chart").innerHTML = `<div class="label">${esc(c.title)}</div><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(c.title)}"><line x1="${P}" y1="${H - P}" x2="${W - P}" y2="${H - P}" stroke="#e5e5e5"/>${bars}</svg>${placeholder ? '<p class="muted" style="font-size:.8rem;margin:.25rem 0 0">Placeholder. Not real data.</p>' : ""}`;
}
function render() {
  $("#heading").textContent = mode === "demo" ? "Morning Brief (Demo)" : "Morning Brief";
  $("#date").textContent = new Date(brief.date + "T00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  renderCards(); renderChart(brief.chart); renderStatus();
}

// ---- Events ----
$("#cards").addEventListener("click", (e) => {
  const card = e.target.closest(".card"); if (!card) return; const id = card.dataset.id;
  const act = e.target.dataset.act, conf = e.target.dataset.confirm;
  if (act === "approve" || act === "done") return record(id, act);
  if (act) { card.querySelectorAll(".extra").forEach((x) => x.classList.toggle("open", x.dataset.x === act && !x.classList.contains("open"))); return; }
  if (conf === "park") { const d = card.querySelector("input[type=date]").value; if (!d) return msg("Pick a park date first."); return record(id, "park", { park_date: d }); }
  if (conf === "ask") { const n = card.querySelector("textarea").value.trim(); if (!n) return msg("Type a question first."); return record(id, "ask", { note: n }); }
});
$("#export").onclick = () => {
  const blob = new Blob([JSON.stringify(exportTaps(), null, 2)], { type: "application/json" });
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `taps-${brief.date}.json` }); a.click();
};
$("#sync").onclick = sync; $("#connect").onclick = connect;
$("#demo").onclick = () => { localStorage.setItem(LS.mode, "demo"); location.reload(); };

async function boot() {
  try {
    await handleRedirect();
    if (mode === "dropbox") {
      brief = await dbxDownload(C.briefPath(today()));
      if (!brief) { brief = { date: today(), items: [], chart: null }; msg("No brief in Dropbox for today yet."); }
    } else if (mode === "demo") brief = await (await fetch(C.demoBriefUrl)).json();
    else { brief = { date: today(), items: [], chart: null }; msg("Connect Dropbox to load today's brief, or open Demo Mode."); }
    render();
  } catch (e) { brief = brief || { date: today(), items: [], chart: null }; render(); msg("Error: " + e.message); }
}
window.__brief = { exportTaps }; boot();
})();
