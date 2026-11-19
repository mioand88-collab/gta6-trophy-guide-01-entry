/* Leonida Legend — GTA VI trophy guide & tracker.
   State (earned set + spoiler setting) lives in localStorage only.
   Data comes from data/trophies.js (window.TROPHY_DATA) so the app works from
   file:// as well as from any static server; data/trophies.json is the same data. */
'use strict';

const STORE_KEY = 'leonida-legend-v1';
const DEMO_EARNED = [2, 3, 4, 5, 8, 9, 10, 16, 19, 20, 21, 22, 28, 33, 35, 36, 39, 41, 44, 45, 46, 51, 53];
const KIND_LABELS = {
  story: 'Story', side: 'Strangers & side missions', activity: 'Activities', collectible: 'Collectibles',
  exploration: 'Exploration', crime: 'Crime & robberies', combat: 'Combat', coop: 'Partner / co-op',
  money: 'Money & property', completion: 'Completion', misc: 'Miscellaneous',
};

const DATA = window.TROPHY_DATA;
const TROPHIES = DATA.trophies;
const BY_ID = new Map(TROPHIES.map((t) => [t.id, t]));
const params = new URLSearchParams(location.search);

let state = loadState();
let gradeFilter = 'all';
let currentView = params.get('view') === 'roadmap' ? 'roadmap' : 'tracker';

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { earned: new Set(parsed.earned || []), spoilers: parsed.spoilers !== false };
    }
  } catch (e) { /* corrupted storage: fall through to a fresh state */ }
  const fresh = { earned: new Set(), spoilers: true };
  if (params.get('demo') === '1') fresh.earned = new Set(DEMO_EARNED);
  return fresh;
}
function saveState() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({ earned: [...state.earned], spoilers: state.spoilers }));
  } catch (e) { /* storage unavailable (private mode): the session still works */ }
}

const $ = (id) => document.getElementById(id);
const grid = $('grid');

function isSpoilerHidden(t) {
  return state.spoilers && t.kind === 'story' && !state.earned.has(t.id);
}

/* ---------------- progress ---------------- */
function renderProgress() {
  const total = TROPHIES.length;
  const done = state.earned.size;
  $('progress-count').textContent = done + ' / ' + total + ' trophies';
  $('progress-pct').textContent = Math.round((done / total) * 100) + '% to platinum';
  $('progress-fill').style.width = (done / total) * 100 + '%';
  const counts = {};
  for (const t of TROPHIES) {
    counts[t.grade] = counts[t.grade] || { have: 0, all: 0 };
    counts[t.grade].all += 1;
    if (state.earned.has(t.id)) counts[t.grade].have += 1;
  }
  $('grade-counts').innerHTML = ['platinum', 'gold', 'silver', 'bronze']
    .map((g) => '<span>' + g[0].toUpperCase() + g.slice(1) + ' <b>' + counts[g].have + '/' + counts[g].all + '</b></span>')
    .join('');
}

/* ---------------- tracker ---------------- */
function matchesFilters(t) {
  if (gradeFilter !== 'all' && t.grade !== gradeFilter) return false;
  const kind = $('kind-filter').value;
  if (kind !== 'all' && t.kind !== kind) return false;
  const status = $('status-filter').value;
  if (status === 'earned' && !state.earned.has(t.id)) return false;
  if (status === 'missing' && state.earned.has(t.id)) return false;
  if ($('missable-only').checked && !t.missable) return false;
  const q = $('search').value.trim().toLowerCase();
  if (q) {
    const hay = (t.name + ' ' + t.description + ' ' + t.guide + ' ' + t.kind).toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

function trophyCard(t) {
  const hidden = isSpoilerHidden(t);
  const card = document.createElement('article');
  card.className = 'card' + (state.earned.has(t.id) ? ' earned' : '');
  const nameHtml = hidden
    ? '<span class="spoiler-name">? ? ? ? ?</span>'
    : escapeHtml(t.name);
  const descHtml = hidden
    ? '<span class="spoiler-desc">' + escapeHtml(t.description) + '</span>'
    : escapeHtml(t.description);
  card.innerHTML =
    '<div class="card-top"><span class="badge ' + t.grade + '">' + t.grade + '</span><h3>' + nameHtml + '</h3></div>' +
    '<p class="desc">' + descHtml + '</p>' +
    '<div class="meta"><span class="tag">' + escapeHtml(KIND_LABELS[t.kind] || t.kind) + '</span>' +
    (t.missable ? '<span class="tag missable">⚠ Missable</span>' : '') +
    '<span class="tag">Guide ✓</span></div>' +
    '<div class="earn-row"><input type="checkbox" id="earn-' + t.id + '"' +
    (state.earned.has(t.id) ? ' checked' : '') + '><label for="earn-' + t.id + '">Earned</label></div>';
  const box = card.querySelector('input[type=checkbox]');
  box.addEventListener('click', (ev) => ev.stopPropagation());
  box.addEventListener('change', () => toggleEarned(t.id));
  card.addEventListener('click', () => openDetail(t.id));
  return card;
}

function renderGrid() {
  const shown = TROPHIES.filter(matchesFilters);
  grid.replaceChildren(...shown.map(trophyCard));
  $('empty-msg').hidden = shown.length > 0;
  $('result-count').textContent = 'Showing ' + shown.length + ' of ' + TROPHIES.length + ' trophies' +
    (state.spoilers ? ' · spoiler shield on: unearned story trophies are hidden' : '');
}

function toggleEarned(id) {
  if (state.earned.has(id)) state.earned.delete(id);
  else state.earned.add(id);
  saveState();
  renderProgress();
  renderGrid();
  renderRoadmap();
}

/* ---------------- detail modal ---------------- */
function openDetail(id) {
  const t = BY_ID.get(id);
  if (!t) return;
  const hidden = isSpoilerHidden(t);
  const earned = state.earned.has(t.id);
  $('modal-body').innerHTML =
    '<span class="badge ' + t.grade + '">' + t.grade + '</span>' +
    '<h2 id="modal-name">' + (hidden ? 'Hidden story trophy' : escapeHtml(t.name)) + '</h2>' +
    '<p class="official">“' + (hidden ? 'Earn this story trophy to reveal its description — or switch the spoiler shield off.' : escapeHtml(t.description)) + '”</p>' +
    '<div class="meta"><span class="tag">' + escapeHtml(KIND_LABELS[t.kind] || t.kind) + '</span>' +
    (t.missable ? '<span class="tag missable">⚠ Missable</span>' : '<span class="tag">Not missable</span>') + '</div>' +
    (t.missable && t.missableNote
      ? '<div class="missable-alert"><b>Missable — read first:</b> ' + escapeHtml(t.missableNote) + '</div>' : '') +
    '<h4>Guide</h4><p>' + escapeHtml(t.guide) + '</p>' +
    '<h4>Sources</h4><ul>' + t.sources.map((s) => '<li>' + escapeHtml(s) + '</li>').join('') + '</ul>' +
    '<button class="earn-btn' + (earned ? ' is-earned' : '') + '" id="modal-earn">' +
    (earned ? '✓ Earned — click to unmark' : 'Mark as earned') + '</button>';
  $('modal-earn').addEventListener('click', () => { toggleEarned(t.id); openDetail(t.id); });
  $('modal-backdrop').hidden = false;
  if (location.hash !== '#trophy-' + id) history.replaceState(null, '', '#trophy-' + id);
}
function closeDetail() {
  $('modal-backdrop').hidden = true;
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
}

/* ---------------- roadmap ---------------- */
function renderRoadmap() {
  const wrap = $('roadmap');
  wrap.replaceChildren();
  for (const step of DATA.roadmap) {
    const doneCount = step.trophies.filter((id) => state.earned.has(id)).length;
    const el = document.createElement('div');
    el.className = 'step';
    el.innerHTML =
      '<div class="step-head"><span class="step-num">' + step.step + '</span><h3>' + escapeHtml(step.title) + '</h3>' +
      '<span class="step-progress">' + doneCount + ' / ' + step.trophies.length + ' earned</span></div>' +
      '<p>' + escapeHtml(step.detail) + '</p>' +
      '<div class="step-chips">' + step.trophies.map((id) => {
        const t = BY_ID.get(id);
        const cls = 'tchip' + (state.earned.has(id) ? ' done' : '') + (step.missables.includes(id) ? ' miss' : '');
        return '<button class="' + cls + '" data-trophy="' + id + '">' +
          (step.missables.includes(id) ? '⚠ ' : '') + escapeHtml(t.name) + '</button>';
      }).join('') + '</div>';
    el.querySelectorAll('.tchip').forEach((chip) =>
      chip.addEventListener('click', () => openDetail(Number(chip.dataset.trophy))));
    wrap.appendChild(el);
  }
}

/* ---------------- views, export/import ---------------- */
function showView(view) {
  currentView = view;
  $('view-tracker').hidden = view !== 'tracker';
  $('view-roadmap').hidden = view !== 'roadmap';
  $('tab-tracker').classList.toggle('active', view === 'tracker');
  $('tab-roadmap').classList.toggle('active', view === 'roadmap');
}

function exportChecklist() {
  const payload = {
    app: 'leonida-legend', game: DATA.game, platform: DATA.platform,
    exported: new Date().toISOString(), earned: [...state.earned].sort((a, b) => a - b),
  };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  a.download = 'gta6-trophy-checklist.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

function importChecklist(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      const ids = Array.isArray(parsed) ? parsed : parsed.earned;
      if (!Array.isArray(ids)) throw new Error('no earned list');
      state.earned = new Set(ids.map(Number).filter((id) => BY_ID.has(id)));
      saveState();
      renderProgress(); renderGrid(); renderRoadmap();
    } catch (e) {
      alert('That file is not a checklist exported from this guide.');
    }
  };
  reader.readAsText(file);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

/* ---------------- wiring ---------------- */
function init() {
  const kinds = [...new Set(TROPHIES.map((t) => t.kind))].sort();
  $('kind-filter').innerHTML = '<option value="all">All kinds</option>' +
    kinds.map((k) => '<option value="' + k + '">' + (KIND_LABELS[k] || k) + '</option>').join('');

  $('spoiler-toggle').checked = state.spoilers;
  $('spoiler-toggle').addEventListener('change', (e) => {
    state.spoilers = e.target.checked;
    saveState(); renderGrid();
  });

  $('grade-chips').addEventListener('click', (e) => {
    const btn = e.target.closest('.chip');
    if (!btn) return;
    gradeFilter = btn.dataset.grade;
    document.querySelectorAll('#grade-chips .chip').forEach((c) => c.classList.toggle('active', c === btn));
    renderGrid();
  });
  for (const id of ['kind-filter', 'status-filter', 'missable-only', 'search']) {
    $(id).addEventListener('input', renderGrid);
    $(id).addEventListener('change', renderGrid);
  }
  $('btn-clear-filters').addEventListener('click', () => {
    gradeFilter = 'all';
    document.querySelectorAll('#grade-chips .chip').forEach((c) => c.classList.toggle('active', c.dataset.grade === 'all'));
    $('kind-filter').value = 'all'; $('status-filter').value = 'all';
    $('missable-only').checked = false; $('search').value = '';
    renderGrid();
  });

  $('tab-tracker').addEventListener('click', () => showView('tracker'));
  $('tab-roadmap').addEventListener('click', () => showView('roadmap'));
  $('btn-export').addEventListener('click', exportChecklist);
  $('file-import').addEventListener('change', (e) => { if (e.target.files[0]) importChecklist(e.target.files[0]); });
  $('btn-reset').addEventListener('click', () => {
    if (confirm('Clear every earned tick and start the checklist over?')) {
      state.earned = new Set();
      saveState(); renderProgress(); renderGrid(); renderRoadmap();
    }
  });

  $('modal-close').addEventListener('click', closeDetail);
  $('modal-backdrop').addEventListener('click', (e) => { if (e.target === $('modal-backdrop')) closeDetail(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDetail(); });

  renderProgress();
  renderGrid();
  renderRoadmap();
  showView(currentView);

  const m = location.hash.match(/^#trophy-(\d+)$/);
  if (m) openDetail(Number(m[1]));
}

init();
