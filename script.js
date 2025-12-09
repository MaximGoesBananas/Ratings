/*
 * Maxim's Ratings SPA
 *
 * Supports:
 * - Movies
 * - Games (merged Simple + Complex)
 * - Mice
 * - Mousepads
 *
 * Uses a small config-driven architecture to avoid duplication.
 */

const PUBLISHED_BASE =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vSmO1htUVAzTQHYcE73oHxvcKUmg5c4ZD6CdskMSA3wj3LkGhUbt1kpFqffbHNhERJ7_ksgfYEm_q2L/pub';

function buildPublishedCsvUrl(gid) {
  return `${PUBLISHED_BASE}?gid=${gid}&single=true&output=csv`;
}

/* ---------------------------
   GIDs
---------------------------- */
const MOVIES_GID = '1920189918';
const SIMPLE_GAMES_GID = '1303529120';
const COMPLEX_GAMES_GID = '1556084448';
const MICE_GID = '1727287959';
const MOUSEPADS_GID = '929203458';

/* ---------------------------
   Config
---------------------------- */
const SHEET_LINK =
  'https://docs.google.com/spreadsheets/d/1yl4E9f5lV_RVF9NItBrW_KwwM41x6YVDKRFONByFZE4/edit?gid=0#gid=0';

const CATEGORY = {
  movies: {
    label: 'Movies',
    gids: [MOVIES_GID],
    dom: {
      container: 'moviesContainer',
      minScore: 'minScoreFilter',
      maxScore: 'maxScoreFilter',
      year: 'yearFilter',
      search: 'searchFilter',
      back: 'backToHomeMovies',
    },
    sortDefault: 'latest',
    searchKeys: ['title', 'person'],
    makeTitle: item => item.year ? `${item.title} (${item.year})` : item.title,
    renderDetails: item => item.person ? [item.person] : [],
    hasImages: true,
    mapRow: row => ({
      title: row['Title']?.trim() || '',
      score: parseFloat(row['Score'] || 0) || 0,
      year: (row['Year'] || '').toString().trim(),
      person: row['Director']?.trim() || '',
      scoreDate: row['Score Date']?.trim() || '',
      posterUrl: row['PosterURL']?.trim() || '',
    }),
  },

  games: {
    label: 'Games',
    gids: [SIMPLE_GAMES_GID, COMPLEX_GAMES_GID],
    dom: {
      container: 'gamesContainer',
      minScore: 'gamesMinScoreFilter',
      maxScore: 'gamesMaxScoreFilter',
      year: 'gamesYearFilter',
      search: 'gamesSearchFilter',
      back: 'backToHomeGames',
    },
    sortDefault: 'latest',
    searchKeys: ['title', 'person'],
    makeTitle: item => item.year ? `${item.title} (${item.year})` : item.title,
    renderDetails: item => item.person ? [item.person] : [],
    hasImages: true,
    mapRow: row => ({
      title: row['Title']?.trim() || '',
      score: parseFloat(row['Score'] || 0) || 0,
      year: (row['Year'] || '').toString().trim(),
      person: row['Developers']?.trim() || '',
      scoreDate: row['Score Date']?.trim() || '',
      posterUrl: row['PosterURL']?.trim() || '',
    }),
  },

  mice: {
    label: 'Mice',
    gids: [MICE_GID],
    dom: {
      container: 'miceContainer',
      minScore: 'miceMinScoreFilter',
      maxScore: 'miceMaxScoreFilter',
      year: 'miceYearFilter',
      search: 'miceSearchFilter',
      back: 'backToHomeMice',
    },
    sortDefault: 'latest',
    searchKeys: ['brand', 'name', 'title'],
    makeTitle: item => item.year ? `${item.title} (${item.year})` : item.title,
    renderDetails: () => [],
    hasImages: false,
    mapRow: row => {
      const brand = row['Brand']?.trim() || '';
      const name = row['Model']?.trim() || '';
      const title = `${brand} ${name}`.trim();

      return {
        title,
        brand,
        name,
        score: parseFloat(row['Score'] || 0) || 0,
        year: (row['Release'] || '').toString().trim(),
        scoreDate: row['Score Date']?.trim() || '',
        posterUrl: '',
      };
    },
  },

  mousepads: {
    label: 'Mousepads',
    gids: [MOUSEPADS_GID],
    dom: {
      container: 'mousepadsContainer',
      minScore: 'mousepadsMinScoreFilter',
      maxScore: 'mousepadsMaxScoreFilter',
      year: 'mousepadsYearFilter',
      search: 'mousepadsSearchFilter',
      back: 'backToHomeMousepads',
    },
    sortDefault: 'latest',
    searchKeys: ['brand', 'name', 'title'],
    makeTitle: item => item.year ? `${item.title} (${item.year})` : item.title,
    renderDetails: () => [],
    hasImages: false,
    mapRow: row => {
      const brand = row['Brand']?.trim() || '';
      const name = row['Product']?.trim() || '';
      const title = `${brand} ${name}`.trim();

      return {
        title,
        brand,
        name,
        score: parseFloat(row['Score'] || 0) || 0,
        year: (row['Release'] || '').toString().trim(),
        scoreDate: row['Score Date']?.trim() || '',
        posterUrl: '',
      };
    },
  },
};

/* ---------------------------
   State
---------------------------- */
const state = {
  movies: { data: null, sort: CATEGORY.movies.sortDefault },
  games: { data: null, sort: CATEGORY.games.sortDefault },
  mice: { data: null, sort: CATEGORY.mice.sortDefault },
  mousepads: { data: null, sort: CATEGORY.mousepads.sortDefault },
};

/* ---------------------------
   Sections
---------------------------- */
const sections = ['home', 'movies', 'games', 'mice', 'mousepads'];
const sectionElements = {};

/* ---------------------------
   Helpers
---------------------------- */
function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpColorHex(hexA, hexB, t) {
  const a = hexA.replace('#', '');
  const b = hexB.replace('#', '');

  const ar = parseInt(a.substring(0, 2), 16);
  const ag = parseInt(a.substring(2, 4), 16);
  const ab = parseInt(a.substring(4, 6), 16);

  const br = parseInt(b.substring(0, 2), 16);
  const bg = parseInt(b.substring(2, 4), 16);
  const bb = parseInt(b.substring(4, 6), 16);

  const rr = Math.round(lerp(ar, br, t));
  const rg = Math.round(lerp(ag, bg, t));
  const rb = Math.round(lerp(ab, bb, t));

  return `#${rr.toString(16).padStart(2, '0')}${rg.toString(16).padStart(2, '0')}${rb.toString(16).padStart(2, '0')}`;
}

function formatScore(score) {
  if (!Number.isFinite(score)) return '0';
  return Number.isInteger(score) ? String(score) : score.toFixed(1);
}

function getStarCount(score) {
  if (!Number.isFinite(score)) return 0;
  if (score <= 5) return 0;
  if (score <= 7) return 1;
  if (score <= 9) return 2;
  return 3; // > 9.0
}

function buildScoreBadge(score) {
  const badge = document.createElement('div');
  badge.className = 'score-badge';

  const t = clamp((score - 1) / 9, 0, 1);

  const lowColor = '#9b9b9b';
  const highColor = '#ffd54a';
  const scoreColor = lerpColorHex(lowColor, highColor, t);

  const numberSize = lerp(0.85, 1.35, Math.pow(t, 0.9));
  const starSize = lerp(0.75, 1.05, Math.pow(t, 0.9));
  const badgeSize = lerp(38, 58, Math.pow(t, 0.85));

  badge.style.setProperty('--score-color', scoreColor);
  badge.style.setProperty('--score-size', `${numberSize}rem`);
  badge.style.setProperty('--star-size', `${starSize}rem`);
  badge.style.setProperty('--badge-size', `${badgeSize}px`);

  if (score >= 9.0) badge.classList.add('is-high');

  const starCount = getStarCount(score);
  if (starCount > 0) {
    const stars = document.createElement('span');
    stars.className = 'score-stars';
    stars.textContent = '★'.repeat(starCount);
    badge.appendChild(stars);
  }

  const value = document.createElement('span');
  value.className = 'score-value';
  value.textContent = formatScore(score);

  badge.appendChild(value);

  return badge;
}

function normalize(s) {
  return (s || '').toString().toLowerCase();
}

function getEl(id) {
  return document.getElementById(id);
}

function getScoreBounds(minEl, maxEl) {
  const minVal = parseFloat(minEl?.value);
  const maxVal = parseFloat(maxEl?.value);

  let minScore = Number.isFinite(minVal) ? minVal : -Infinity;
  let maxScore = Number.isFinite(maxVal) ? maxVal : Infinity;

  if (minScore > maxScore) {
    const tmp = minScore;
    minScore = maxScore;
    maxScore = tmp;
  }

  return { minScore, maxScore };
}

function matchesSearch(item, term, keys) {
  if (!term) return true;
  return (keys || []).some(k => normalize(item[k]).includes(term));
}

/* ---------------------------
   Navigation
---------------------------- */
function showSection(id) {
  sections.forEach(sec => {
    const el = sectionElements[sec];
    if (el) el.classList.toggle('hidden', sec !== id);
  });

  if (id !== 'home') {
    window.location.hash = `#${id}`;
  } else {
    history.replaceState(null, '', window.location.pathname);
  }

  if (CATEGORY[id] && state[id].data === null) {
    fetchCategory(id);
  }
}

function handleHashChange() {
  const hash = window.location.hash.replace('#', '');
  if (sections.includes(hash) && hash !== '') {
    showSection(hash);
  } else {
    showSection('home');
  }
}

/* ---------------------------
   Data fetch
---------------------------- */
function parseCsvWithMap(text, mapRow) {
  const parsed = Papa.parse(text.trim(), { header: true, skipEmptyLines: true }).data;
  return parsed.map(mapRow).filter(x => x.title);
}

async function fetchCategory(key) {
  const cfg = CATEGORY[key];
  const st = state[key];
  const container = getEl(cfg.dom.container);

  try {
    const texts = await Promise.all(
      cfg.gids.map(gid => fetch(buildPublishedCsvUrl(gid)).then(r => r.text()))
    );

    const merged = texts.flatMap(t => parseCsvWithMap(t, cfg.mapRow));

    st.data = merged;

    populateYearFilter(key);
    renderCategory(key);
  } catch (err) {
    console.error(`${cfg.label} CSV error:`, err);
    st.data = [];

    if (container) {
      container.innerHTML = `
        <div class="card">
          <div class="card-content">
            <div class="card-title">Could not load ${cfg.label}</div>
            <div class="card-details">Check publishing and gid values.</div>
          </div>
        </div>
      `;
    }
  }
}

function populateYearFilter(key) {
  const cfg = CATEGORY[key];
  const st = state[key];
  const yearEl = getEl(cfg.dom.year);

  if (!yearEl) return;

  yearEl.innerHTML = '<option value="">All</option>';

  const years = Array.from(new Set((st.data || []).map(x => x.year).filter(Boolean)));
  years.sort((a, b) => b.localeCompare(a));

  years.forEach(y => {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    yearEl.appendChild(opt);
  });
}

/* ---------------------------
   Sorting
---------------------------- */
function applySort(list, sortKey) {
  if (sortKey === 'latest') {
    list.sort((a, b) => {
      const ya = parseInt(a.year, 10) || 0;
      const yb = parseInt(b.year, 10) || 0;
      const dy = yb - ya;
      if (dy !== 0) return dy;

      const da = Date.parse(a.scoreDate || '1970-01-01') || 0;
      const db = Date.parse(b.scoreDate || '1970-01-01') || 0;
      const dd = db - da;
      if (dd !== 0) return dd;

      const ds = (b.score || 0) - (a.score || 0);
      if (ds !== 0) return ds;

      return (a.title || '').localeCompare(b.title || '');
    });
  }

  if (sortKey === 'score') {
    list.sort((a, b) => {
      const ds = (b.score || 0) - (a.score || 0);
      if (ds !== 0) return ds;

      const ya = parseInt(a.year, 10) || 0;
      const yb = parseInt(b.year, 10) || 0;
      const dy = yb - ya;
      if (dy !== 0) return dy;

      return (a.title || '').localeCompare(b.title || '');
    });
  }

  if (sortKey === 'date') {
    list.sort((a, b) => {
      const da = Date.parse(a.scoreDate || '1970-01-01') || 0;
      const db = Date.parse(b.scoreDate || '1970-01-01') || 0;
      return db - da;
    });
  }
}

/* ---------------------------
   Render
---------------------------- */
function buildMedia(cfg, item) {
  const wrap = document.createElement('div');
  wrap.className = 'media-wrap';

  if (cfg.hasImages && item.posterUrl) {
    const img = document.createElement('img');
    img.src = item.posterUrl;
    img.alt = item.title || '';
    img.onerror = () => {
      img.src = '';
      img.style.backgroundColor = '#3a3a3a';
    };
    wrap.appendChild(img);
  } else {
    const placeholder = document.createElement('div');
    placeholder.className = 'media-placeholder';

    const text = document.createElement('div');
    text.className = 'placeholder-text';
    text.textContent = item.title || cfg.label;

    placeholder.appendChild(text);
    wrap.appendChild(placeholder);
  }

  wrap.appendChild(buildScoreBadge(item.score || 0));
  return wrap;
}

function renderCategory(key) {
  const cfg = CATEGORY[key];
  const st = state[key];

  if (!st.data) return;

  const container = getEl(cfg.dom.container);
  const minEl = getEl(cfg.dom.minScore);
  const maxEl = getEl(cfg.dom.maxScore);
  const yearEl = getEl(cfg.dom.year);
  const searchEl = getEl(cfg.dom.search);

  const selectedYear = yearEl?.value || '';
  const { minScore, maxScore } = getScoreBounds(minEl, maxEl);
  const searchTerm = normalize(searchEl?.value).trim();

  let filtered = (st.data || []).filter(item => {
    const yearMatch = selectedYear ? item.year === selectedYear : true;
    const scoreMatch = (item.score ?? 0) >= minScore && (item.score ?? 0) <= maxScore;
    const searchMatch = matchesSearch(item, searchTerm, cfg.searchKeys);
    return yearMatch && scoreMatch && searchMatch;
  });

  applySort(filtered, st.sort);

  if (!container) return;

  container.innerHTML = '';

  filtered.forEach(item => {
    const card = document.createElement('div');
    card.className = 'card';

    // Media area (poster or placeholder)
    card.appendChild(buildMedia(cfg, item));

    const content = document.createElement('div');
    content.className = 'card-content';

    const titleEl = document.createElement('div');
    titleEl.className = 'card-title';
    titleEl.textContent = cfg.makeTitle ? cfg.makeTitle(item) : (item.year ? `${item.title} (${item.year})` : item.title);
    content.appendChild(titleEl);

    const details = cfg.renderDetails ? cfg.renderDetails(item) : [];
    details.filter(Boolean).forEach(line => {
      const d = document.createElement('div');
      d.className = 'card-details';
      d.textContent = line;
      content.appendChild(d);
    });

    const dateEl = document.createElement('div');
    dateEl.className = 'rated-pill';
    dateEl.textContent = item.scoreDate ? `Rated: ${item.scoreDate}` : 'Rated: —';
    content.appendChild(dateEl);

    card.appendChild(content);
    container.appendChild(card);
  });
}

/* ---------------------------
   Events
---------------------------- */
function wireCategoryFilters(key) {
  const cfg = CATEGORY[key];

  const minEl = getEl(cfg.dom.minScore);
  const maxEl = getEl(cfg.dom.maxScore);
  const yearEl = getEl(cfg.dom.year);
  const searchEl = getEl(cfg.dom.search);
  const backEl = getEl(cfg.dom.back);

  minEl?.addEventListener('change', () => renderCategory(key));
  maxEl?.addEventListener('change', () => renderCategory(key));
  yearEl?.addEventListener('change', () => renderCategory(key));
  searchEl?.addEventListener('input', () => renderCategory(key));

  backEl?.addEventListener('click', () => showSection('home'));
}

/* ---------------------------
   Init
---------------------------- */
function init() {
  sections.forEach(id => {
    sectionElements[id] = getEl(id);
  });

  // Category navigation
  const categoryButtons = document.querySelectorAll('.category-button');
  categoryButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-section');
      showSection(target);
    });
  });

  // Sort buttons
  const sortButtons = document.querySelectorAll('.sort-button');
  sortButtons.forEach(button => {
    button.addEventListener('click', () => {
      const target = button.getAttribute('data-target');
      const sortValue = button.getAttribute('data-sort');

      if (!target || !state[target]) return;

      document.querySelectorAll(`.sort-button[data-target="${target}"]`)
        .forEach(b => b.classList.remove('active'));

      button.classList.add('active');

      state[target].sort = sortValue;
      renderCategory(target);
    });
  });

  // Wire filters/back
  Object.keys(CATEGORY).forEach(wireCategoryFilters);

  // Initial route
  handleHashChange();
  window.addEventListener('hashchange', handleHashChange);
}

document.addEventListener('DOMContentLoaded', init);
