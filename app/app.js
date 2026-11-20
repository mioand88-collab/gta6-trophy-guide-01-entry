/* Leonida Legends — GTA VI trophy guide & tracker.
   Plain vanilla JS, no libraries, no network at run time beyond loading the
   trophy data file that ships with the app. Progress lives in localStorage. */

const DATA_URL = 'data/trophies.json';
const STORAGE_KEY = 'leonida-legends-progress-v1';
const SPOILER_KEY = 'leonida-legends-spoiler-v1';
const TOTAL = 55;

const KIND_LABELS = {
  story: 'Story',
  missable: 'Missable',
  collectibles: 'Collectibles',
  activities: 'Activities',
  side: 'Contacts & strangers',
  world: 'Open world',
  online: 'Online',
  platinum: 'Platinum'
};

/** The ids of trophies the reader has marked earned, kept in a Set. */
let earnedIds = new Set();
/** Whether spoiler mode is on: story trophies stay masked until earned. */
let spoilerOn = true;
/** The active filter chip and the search text. */
let activeFilter = 'all';
let searchText = '';
/** The roadmap stage the list is narrowed to, or 0 for every stage. */
let activeStage = 0;

const listEl = document.getElementById('trophy-list');
const emptyEl = document.getElementById('empty-state');
const showingEl = document.getElementById('showing');
const searchEl = document.getElementById('search');
const spoilerEl = document.getElementById('spoiler-toggle');
const progressFill = document.getElementById('progress-fill');
const progressBar = document.getElementById('progress-bar');
const earnedCountEl = document.getElementById('earned-count');
const earnedPctEl = document.getElementById('earned-pct');

/** Escape a string for safe insertion into the page's HTML. */
function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/** Read the earned set back from localStorage; a broken value starts empty. */
function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) earnedIds = new Set(parsed.filter((n) => Number.isInteger(n)));
  } catch {
    earnedIds = new Set();
  }
}

/** Write the earned set to localStorage. */
function saveProgress() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...earnedIds].sort((a, b) => a - b)));
  } catch {
    /* Storage full or blocked: progress still shows until the page closes. */
  }
}

/** Read the saved spoiler preference, defaulting to on. */
function loadSpoiler() {
  try {
    const raw = localStorage.getItem(SPOILER_KEY);
    if (raw === 'off') spoilerOn = false;
    if (raw === 'on') spoilerOn = true;
  } catch {
    spoilerOn = true;
  }
}

/** Persist the spoiler preference. */
function saveSpoiler() {
  try {
    localStorage.setItem(SPOILER_KEY, spoilerOn ? 'on' : 'off');
  } catch {
    /* Preference still applies until the page closes. */
  }
}

/** Capitalise a grade word for display. */
function gradeLabel(grade) {
  return grade.charAt(0).toUpperCase() + grade.slice(1);
}

/** Whether a trophy's name and description stay masked under spoiler mode. */
function isSpoilerMasked(trophy) {
  return spoilerOn && trophy.kind === 'story' && !earnedIds.has(trophy.id);
}

/** Whether a trophy passes the active filter, stage and search text. */
function trophyVisible(trophy) {
  if (activeStage && trophy.roadmap_stage !== activeStage) return false;
  if (activeFilter === 'story' && trophy.kind !== 'story') return false;
  if (activeFilter === 'missable' && !trophy.missable) return false;
  if (activeFilter === 'collectibles' && trophy.kind !== 'collectibles') return false;
  if (activeFilter === 'activities' && trophy.kind !== 'activities') return false;
  if (activeFilter === 'side' && trophy.kind !== 'side') return false;
  if (activeFilter === 'world' && trophy.kind !== 'world') return false;
  if (activeFilter === 'online') return false;
  if (activeFilter === 'earned' && !earnedIds.has(trophy.id)) return false;
  if (activeFilter === 'remaining' && earnedIds.has(trophy.id)) return false;
  if (searchText) {
    const hay = `${trophy.name} ${trophy.description} ${trophy.guide} ${trophy.source}`.toLowerCase();
    if (!hay.includes(searchText)) return false;
  }
  return true;
}

/** One trophy's card HTML: checkbox, grade, flags, description and cited guide. */
function trophyCardHtml(trophy) {
  const earned = earnedIds.has(trophy.id);
  const masked = isSpoilerMasked(trophy);
  const nameHtml = masked
    ? `<span class="hidden-mark">Hidden story trophy — earn it to reveal its name</span>`
    : escapeHtml(trophy.name);
  const descHtml = masked
    ? `<span class="spoiler-hidden">Its name and description are hidden until you earn it. The guide below stays visible so you can still prepare.</span>`
    : escapeHtml(trophy.description);
  const flags = [];
  flags.push(`<span class="grade-badge grade-${escapeHtml(trophy.grade)}">${escapeHtml(gradeLabel(trophy.grade))}</span>`);
  if (trophy.missable) flags.push('<span class="flag flag-missable">Missable</span>');
  if (trophy.hidden) flags.push('<span class="flag flag-hidden">Hidden on PSN</span>');
  flags.push(`<span class="flag flag-kind">${escapeHtml(KIND_LABELS[trophy.kind] || trophy.kind)}</span>`);
  const countHtml = trophy.count
    ? `<p class="trophy-meta">Target: <b>${Number(trophy.count).toLocaleString('en-US')}</b> &middot; Roadmap stage ${trophy.roadmap_stage}</p>`
    : `<p class="trophy-meta">Roadmap stage ${trophy.roadmap_stage}</p>`;
  const sourceHtml = trophy.source_url
    ? `<p class="trophy-source">Source: <a href="${escapeHtml(trophy.source_url)}" rel="noopener">${escapeHtml(trophy.source)}</a></p>`
    : `<p class="trophy-source">Source: ${escapeHtml(trophy.source)}</p>`;
  return `<li class="trophy${earned ? ' is-earned' : ''}" id="trophy-${trophy.id}" data-id="${trophy.id}">
    <label class="trophy-check"><input type="checkbox" data-trophy-id="${trophy.id}"${earned ? ' checked' : ''} aria-label="Mark ${masked ? 'this hidden story trophy' : escapeHtml(trophy.name)} as earned"></label>
    <div class="trophy-body">
      <div class="trophy-head"><h3 class="trophy-name">${nameHtml}</h3>${flags.join('')}</div>
      <p class="trophy-desc">${descHtml}</p>
      ${countHtml}
      <p class="trophy-guide"><span class="guide-label">Guide:</span> ${escapeHtml(trophy.guide)}</p>
      ${sourceHtml}
    </div>
  </li>`;
}

/** Re-render the trophy list for the current filter, search and spoiler state. */
function renderList(trophies) {
  const visible = trophies.filter(trophyVisible);
  listEl.innerHTML = visible.map(trophyCardHtml).join('');
  emptyEl.hidden = visible.length > 0;
  const earned = earnedIds.size;
  const stageNote = activeStage ? ` (roadmap stage ${activeStage})` : '';
  showingEl.textContent = visible.length === trophies.length
    ? `Showing all ${trophies.length} trophies${stageNote}.`
    : `Showing ${visible.length} of ${trophies.length} trophies${stageNote}.`;
  earnedCountEl.textContent = String(earned);
  const pct = Math.round((earned / TOTAL) * 100);
  earnedPctEl.textContent = `${pct}%`;
  progressFill.style.width = `${pct}%`;
  progressBar.setAttribute('aria-valuenow', String(earned));
  document.getElementById('progress-sub').textContent = earned === TOTAL
    ? 'All 55 earned — Leonida Legend. The platinum is yours.'
    : `Tick a trophy when you earn it. Progress is saved in this browser only.`;
}

/** Render the five roadmap stages with their trophy counts. */
function renderRoadmap(data) {
  const list = document.getElementById('roadmap-list');
  list.innerHTML = data.roadmap.map((stage) => {
    const members = data.trophies.filter((t) => t.roadmap_stage === stage.stage);
    const earned = members.filter((t) => earnedIds.has(t.id)).length;
    return `<li id="stage-${stage.stage}" tabindex="0" role="button" title="Show this stage's trophies">
      <span class="stage-num" aria-hidden="true">${stage.stage}</span>
      <div><h3>${escapeHtml(stage.title)}</h3><p>${escapeHtml(stage.summary)}</p></div>
      <span class="stage-count">${earned}/${members.length} earned</span>
    </li>`;
  }).join('');
  const missable = data.trophies.filter((t) => t.missable);
  document.getElementById('roadmap-note').textContent =
    `${missable.length} trophies are missable — tied to one story moment or one-time opportunity. ` +
    `Keep a manual save before each one, or replay the mission from the pause menu. ` +
    `Click a stage to see only its trophies; click it again to show them all.`;
}

/** Render the grade legend strip under the trophy list heading. */
function renderLegend(trophies) {
  const counts = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  for (const t of trophies) counts[t.grade] = (counts[t.grade] || 0) + 1;
  document.getElementById('grade-legend').innerHTML =
    `<span class="legend-platinum"><b>${counts.platinum}</b> platinum</span>` +
    `<span class="legend-gold"><b>${counts.gold}</b> gold</span>` +
    `<span class="legend-silver"><b>${counts.silver}</b> silver</span>` +
    `<span class="legend-bronze"><b>${counts.bronze}</b> bronze</span>` +
    `<span><b>${trophies.filter((t) => t.hidden).length}</b> hidden on PSN</span>` +
    `<span><b>${trophies.filter((t) => t.missable).length}</b> missable</span>`;
}

/** Download the earned list as a JSON file the reader can import back. */
function exportProgress() {
  const payload = {
    app: 'leonida-legends',
    game: 'Grand Theft Auto VI',
    exported: new Date().toISOString(),
    earned: [...earnedIds].sort((a, b) => a - b)
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'gta6-trophy-progress.json';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Read an exported progress file and apply its earned list. */
function importProgress(file, trophies, onDone) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      const ids = Array.isArray(parsed) ? parsed : parsed.earned;
      if (!Array.isArray(ids)) throw new Error('no earned list');
      const valid = new Set(trophies.map((t) => t.id));
      const next = new Set(ids.filter((n) => Number.isInteger(n) && valid.has(n)));
      earnedIds = next;
      saveProgress();
      onDone(true, `${next.size} trophies imported.`);
    } catch {
      onDone(false, 'That file is not a Leonida Legends export. Nothing changed.');
    }
  };
  reader.onerror = () => onDone(false, 'Could not read that file. Nothing changed.');
  reader.readAsText(file);
}

/** Apply the page's ?spoiler=, ?filter= and ?open= parameters for deep links. */
function applyUrlParams(trophies) {
  const params = new URLSearchParams(window.location.search);
  const spoilerParam = params.get('spoiler');
  if (spoilerParam === 'off' || spoilerParam === 'on') {
    spoilerOn = spoilerParam === 'on';
    saveSpoiler();
  }
  const filterParam = params.get('filter');
  if (filterParam && document.querySelector(`.chip[data-filter="${filterParam}"]`)) {
    activeFilter = filterParam;
  }
  const openParam = Number(params.get('open'));
  if (Number.isInteger(openParam) && trophies.some((t) => t.id === openParam)) {
    activeFilter = 'all';
    searchText = '';
  }
  return openParam;
}

/** Start the app: load the data, wire the controls, render everything. */
async function start() {
  loadProgress();
  loadSpoiler();
  const response = await fetch(DATA_URL);
  if (!response.ok) throw new Error(`could not load ${DATA_URL}`);
  const data = await response.json();
  const trophies = data.trophies;

  spoilerEl.checked = spoilerOn;
  const openId = applyUrlParams(trophies);
  spoilerEl.checked = spoilerOn;
  document.querySelectorAll('.chip').forEach((chip) => {
    chip.classList.toggle('is-active', chip.dataset.filter === activeFilter);
  });

  renderRoadmap(data);
  renderLegend(trophies);
  renderList(trophies);

  listEl.addEventListener('change', (event) => {
    const box = event.target;
    if (!box.matches('input[data-trophy-id]')) return;
    const id = Number(box.dataset.trophyId);
    if (box.checked) earnedIds.add(id);
    else earnedIds.delete(id);
    saveProgress();
    renderRoadmap(data);
    renderList(trophies);
  });

  document.getElementById('filters').addEventListener('click', (event) => {
    const chip = event.target.closest('.chip');
    if (!chip) return;
    activeFilter = chip.dataset.filter;
    activeStage = 0;
    document.querySelectorAll('.chip').forEach((c) => c.classList.toggle('is-active', c === chip));
    renderList(trophies);
  });

  /** Clicking (or pressing Enter on) a roadmap stage narrows the list to it. */
  const pickStage = (stageEl) => {
    const stage = Number(stageEl.id.replace('stage-', ''));
    if (!Number.isInteger(stage)) return;
    activeStage = activeStage === stage ? 0 : stage;
    activeFilter = 'all';
    document.querySelectorAll('.chip').forEach((c) => c.classList.toggle('is-active', c.dataset.filter === 'all'));
    renderList(trophies);
    document.getElementById('trophy-list-heading').scrollIntoView({ block: 'start' });
  };
  document.getElementById('roadmap-list').addEventListener('click', (event) => {
    const stageEl = event.target.closest('li[id^="stage-"]');
    if (stageEl) pickStage(stageEl);
  });
  document.getElementById('roadmap-list').addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    const stageEl = event.target.closest('li[id^="stage-"]');
    if (stageEl) pickStage(stageEl);
  });

  searchEl.addEventListener('input', () => {
    searchText = searchEl.value.trim().toLowerCase();
    renderList(trophies);
  });

  spoilerEl.addEventListener('change', () => {
    spoilerOn = spoilerEl.checked;
    saveSpoiler();
    renderList(trophies);
  });

  document.getElementById('export-btn').addEventListener('click', exportProgress);

  document.getElementById('import-btn').addEventListener('click', () => {
    document.getElementById('import-file').click();
  });

  document.getElementById('import-file').addEventListener('change', (event) => {
    const file = event.target.files && event.target.files[0];
    event.target.value = '';
    if (!file) return;
    importProgress(file, trophies, (ok, message) => {
      renderRoadmap(data);
      renderList(trophies);
      showingEl.textContent = message;
    });
  });

  document.getElementById('reset-btn').addEventListener('click', () => {
    if (!window.confirm('Clear all earned trophies? This cannot be undone.')) return;
    earnedIds = new Set();
    saveProgress();
    renderRoadmap(data);
    renderList(trophies);
  });

  if (Number.isInteger(openId) && trophies.some((t) => t.id === openId)) {
    const card = document.getElementById(`trophy-${openId}`);
    if (card) {
      card.classList.add('is-open');
      card.scrollIntoView({ block: 'center' });
    }
  }
  const stageParam = Number(new URLSearchParams(window.location.search).get('stage'));
  if (Number.isInteger(stageParam) && stageParam >= 1 && stageParam <= 5) {
    const stageEl = document.getElementById(`stage-${stageParam}`);
    if (stageEl) stageEl.scrollIntoView({ block: 'start' });
  }
}

start().catch((error) => {
  listEl.innerHTML = `<li class="trophy"><div class="trophy-body"><p class="trophy-guide">The trophy data could not be loaded (${escapeHtml(error.message)}). Open this guide from its own folder with a static server, for example <code>python3 -m http.server</code> inside app/.</p></div></li>`;
});
