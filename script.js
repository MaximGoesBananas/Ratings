const PUBLISHED_BASE =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vSmO1htUVAzTQHYcE73oHxvcKUmg5c4ZD6CdskMSA3wj3LkGhUbt1kpFqffbHNhERJ7_ksgfYEm_q2L/pub';

function buildPublishedCsvUrl(gid) {
  return `${PUBLISHED_BASE}?gid=${gid}&single=true&output=csv`;
}

// Published sheet tabs
const MOVIES_GID = '1920189918';
const SHOWS_GID = '791640483';
const SHOW_SEASONS_GID = '697316854';
const SIMPLE_GAMES_GID = '1303529120';
const COMPLEX_GAMES_GID = '1556084448';
const MICE_GID = '1727287959';
const MOUSEPADS_GID = '929203458';
const MOUSE_ASSET_VERSION = '1.0.2';
const MOUSEPAD_ASSET_VERSION = '1.0.0';

const GAME_POSTER_OVERRIDES = {
  'grand theft auto|1997': 'https://images.igdb.com/igdb/image/upload/t_cover_big/co2lb0.jpg',
};

function getGamePosterUrl(title, year, posterUrl) {
  const key = `${title.toLowerCase()}|${year}`;
  return GAME_POSTER_OVERRIDES[key] || posterUrl;
}

// Editable sheet deep links
const SHEET_ID = '1yl4E9f5lV_RVF9NItBrW_KwwM41x6YVDKRFONByFZE4';
const SHEET_EDIT_BASE = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`;

// Published CSV data begins at sheet row 2, after the header.
function buildRowLink(gid, rowNumber) {
  if (!gid || !rowNumber) return `${SHEET_EDIT_BASE}#gid=${gid}`;
  return `${SHEET_EDIT_BASE}#gid=${gid}&range=A${rowNumber}`;
}

function getMovieRecommendationLevel(row) {
  const recommendationHeader = Object.keys(row).find(header => {
    const normalizedHeader = header.toLowerCase();
    return normalizedHeader.includes('wow')
      && normalizedHeader.includes('factor');
  });

  if (!recommendationHeader) return null;

  const level = Number.parseInt(row[recommendationHeader], 10);
  return [1, 2, 3].includes(level) ? level : null;
}


/* ---------------------------
   Categories
---------------------------- */
const CATEGORY = {
  movies: {
    label: 'Movies',
    noun: ['movie', 'movies'],
    gids: [MOVIES_GID],
    sortDefault: 'date',
    searchKeys: ['title', 'person'],
    searchPlaceholder: 'Search movies',
    yearLabel: 'All years',
    makeMeta: item => [item.year, item.person].filter(Boolean).join(' · '),
    makeFacts: item => [
      ['Year', item.year],
      ['Director', item.person],
      ['Runtime', formatMinutes(item.runtime)],
    ],
    mapRow: row => ({
      title: row['Title']?.trim() || '',
      score: row['Score']?.trim() ? parseFloat(row['Score']) : null,
      year: (row['Year'] || '').toString().trim(),
      person: row['Director']?.trim() || '',
      scoreDate: row['Score Date']?.trim() || '',
      posterUrl: row['PosterURL']?.trim() || '',
      recommendationLevel: getMovieRecommendationLevel(row),
      runtime: Number.parseInt(row['Runtime'], 10) || 0,
      note: row['Personal notes']?.trim() || '',
    }),
  },

  shows: {
    label: 'Shows',
    noun: ['show', 'shows'],
    gids: [SHOWS_GID],
    sortDefault: 'date',
    searchKeys: ['title'],
    searchPlaceholder: 'Search shows',
    yearLabel: 'All years',
    makeMeta: item => (item.endYear && item.endYear !== item.year ? `${item.year}–${item.endYear}` : item.year),
    makeFacts: item => [
      ['Aired', CATEGORY.shows.makeMeta(item)],
      ['Watch time', formatHours(item.minutes / 60)],
    ],
    hasSeasons: true,
    // Final Score stays empty while a show is still airing, so it stays hidden.
    mapRow: row => ({
      title: row['Title']?.trim() || '',
      score: row['Final Score']?.trim() ? parseFloat(row['Final Score']) : null,
      year: (row['Release Year'] || '').toString().trim(),
      endYear: (row['Release End'] || '').toString().trim(),
      scoreDate: row['Last Score Date']?.trim() || '',
      posterUrl: row['PosterURL']?.trim() || '',
      minutes: Number.parseInt(row['Minutes'], 10) || 0,
    }),
  },

  games: {
    label: 'Games',
    noun: ['game', 'games'],
    gids: [SIMPLE_GAMES_GID, COMPLEX_GAMES_GID],
    sortDefault: 'date',
    searchKeys: ['title', 'person'],
    searchPlaceholder: 'Search games',
    yearLabel: 'All years',
    makeMeta: item => [item.year, item.person].filter(Boolean).join(' · '),
    makeFacts: item => [
      ['Year', item.year],
      ['Developer', item.person],
      ['Main story', formatHours(item.storyHours)],
    ],
    mapRow: row => {
      const title = row['Title']?.trim() || '';
      const year = (row['Year'] || '').toString().trim();
      const posterUrl = row['PosterURL']?.trim() || '';

      return {
        title,
        score: row['Score']?.trim() ? parseFloat(row['Score']) : null,
        year,
        person: row['Developers']?.trim() || '',
        scoreDate: row['Score Date']?.trim() || '',
        posterUrl: getGamePosterUrl(title, year, posterUrl),
        storyHours: Number.parseFloat(row['Main Story']) || 0,
        note: row['Notes']?.trim() || '',
      };
    },
  },

  mice: {
    label: 'Mice',
    noun: ['mouse', 'mice'],
    gids: [MICE_GID],
    sortDefault: 'date',
    searchKeys: ['brand', 'name', 'title'],
    searchPlaceholder: 'Search mice',
    yearLabel: 'All releases',
    product: true,
    makeTitle: item => item.name || item.title,
    makeMeta: item => [item.brand, item.year].filter(Boolean).join(' · '),
    makeFacts: item => [
      ['Brand', item.brand],
      ['Release', item.year],
    ],
    mapRow: row => {
      const brand = row['Brand']?.trim() || '';
      const name = row['Model']?.trim() || '';

      return {
        title: `${brand} ${name}`.trim(),
        brand,
        name,
        score: row['Score']?.trim() ? parseFloat(row['Score']) : null,
        year: (row['Release'] || '').toString().trim(),
        scoreDate: row['Score Date']?.trim() || '',
        posterUrl: buildMouseAssetUrl(brand, name),
        note: row['Personal Notes & Feelings']?.trim() || '',
      };
    },
  },

  mousepads: {
    label: 'Mousepads',
    noun: ['mousepad', 'mousepads'],
    gids: [MOUSEPADS_GID],
    sortDefault: 'date',
    searchKeys: ['brand', 'name', 'title'],
    searchPlaceholder: 'Search mousepads',
    yearLabel: 'All releases',
    product: true,
    makeTitle: item => item.name || item.title,
    makeMeta: item => [item.brand, item.year].filter(Boolean).join(' · '),
    makeFacts: item => [
      ['Brand', item.brand],
      ['Release', item.year],
      ['Glide speed', item.glide],
    ],
    mapRow: row => {
      const brand = row['Brand']?.trim() || '';
      const name = row['Product']?.trim() || '';

      return {
        title: `${brand} ${name}`.trim(),
        brand,
        name,
        score: row['Score']?.trim() ? parseFloat(row['Score']) : null,
        year: (row['Release'] || '').toString().trim(),
        scoreDate: row['Score Date']?.trim() || '',
        posterUrl: buildMousepadAssetUrl(brand, name),
        note: row['Personal Notes']?.trim() || '',
        glide: (Object.entries(row).find(([key]) => key.startsWith('Glide Speed'))?.[1] || '').trim(),
      };
    },
  },
};

const SORT_OPTIONS = [
  { value: 'date', label: 'Recent' },
  { value: 'score', label: 'Top rated' },
  { value: 'latest', label: 'Newest' },
];
const SCORE_CHIPS = [null, 9, 8, 7];

/* ---------------------------
   State
---------------------------- */
// The visitor's chosen sort per page, kept only in their own browser.
const SORT_STORAGE_PREFIX = 'maximsratings-sort-';
const SORT_VALUES = SORT_OPTIONS.map(o => o.value);

function loadSavedSort(key) {
  try {
    const saved = localStorage.getItem(SORT_STORAGE_PREFIX + key);
    return SORT_VALUES.includes(saved) ? saved : CATEGORY[key].sortDefault;
  } catch {
    return CATEGORY[key].sortDefault;
  }
}

function saveSort(key, value) {
  try {
    localStorage.setItem(SORT_STORAGE_PREFIX + key, value);
  } catch {
    // Storage can be blocked; the choice then lasts for this visit only.
  }
}

const state = Object.fromEntries(Object.keys(CATEGORY).map(key => [
  key, { data: null, request: null, sort: loadSavedSort(key), minScore: null },
]));

const sections = ['home', ...Object.keys(CATEGORY)];

/* ---------------------------
   Helpers
---------------------------- */
function formatScore(score) {
  if (!Number.isFinite(score)) return '0';
  return score.toFixed(1);
}

function scoreTierClass(score) {
  if (!Number.isFinite(score)) return 'tier-low';
  if (score >= 9.5) return 'tier-peak';
  if (score >= 9.0) return 'tier-high';
  if (score >= 8.0) return 'tier-good';
  if (score >= 5.0) return 'tier-mid';
  return 'tier-low';
}

function buildScoreBadge(score) {
  const badge = el('div', 'score-badge ' + scoreTierClass(score), formatScore(score));
  badge.setAttribute('aria-label', `Score ${formatScore(score)} out of 10`);
  return badge;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Sheet dates are YYYY-MM-DD; read them as written so no time zone can shift the day.
function formatRatedDate(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : value;
}

function formatMinutes(minutes) {
  if (!minutes) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h} h${m ? ` ${m} min` : ''}` : `${m} min`;
}

function formatHours(hours) {
  if (!hours) return '';
  const rounded = Math.round(hours);
  return `${rounded} hour${rounded === 1 ? '' : 's'}`;
}

function normalize(s) {
  return (s || '').toString().toLowerCase();
}

function buildAssetName(brand, model) {
  return `${brand.trim()} - ${model.trim()}`
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\.+$/, '');
}

function buildMouseAssetUrl(brand, model) {
  return `assets/mice/${encodeURIComponent(buildAssetName(brand, model))}.webp?v=${MOUSE_ASSET_VERSION}`;
}

function buildMousepadAssetUrl(brand, model) {
  return `assets/mousepads/${encodeURIComponent(buildAssetName(brand, model))}.png?v=${MOUSEPAD_ASSET_VERSION}`;
}

function getEl(id) {
  return document.getElementById(id);
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function matchesSearch(item, term, keys) {
  if (!term) return true;
  return (keys || []).some(k => normalize(item[k]).includes(term));
}

/* ---------------------------
   Page toolbars
---------------------------- */
function buildCategoryPage(key) {
  const cfg = CATEGORY[key];
  const page = getEl(key);

  page.innerHTML = `
    <div class="toolbar">
      <div class="toolbar-head">
        <h1 class="page-title" id="${key}Title">${cfg.label}<span class="result-count" id="${key}Count"></span></h1>
        <div class="segmented" role="group" aria-label="Sort by">
          ${SORT_OPTIONS.map(o => `<button type="button" class="sort-button" data-sort="${o.value}">${o.label}</button>`).join('')}
        </div>
      </div>
      <div class="toolbar-filters">
        <label class="search-field">
          <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
          <input id="${key}Search" type="search" placeholder="${cfg.searchPlaceholder}" autocomplete="off" spellcheck="false" aria-label="${cfg.searchPlaceholder}">
        </label>
        <button type="button" class="filter-toggle" id="${key}FilterToggle" aria-expanded="false" aria-controls="${key}Filters">
          <i class="fa-solid fa-sliders" aria-hidden="true"></i><span>Filters</span>
        </button>
        <div class="filter-group" id="${key}Filters">
          <div class="chips" role="group" aria-label="Minimum score">
            ${SCORE_CHIPS.map(min => `<button type="button" class="chip" data-min="${min ?? ''}">${min ? `${min}+` : 'Any score'}</button>`).join('')}
          </div>
          <select id="${key}Year" class="year-select" aria-label="${cfg.yearLabel}">
            <option value="">${cfg.yearLabel}</option>
          </select>
        </div>
      </div>
    </div>
    <div id="${key}Container" class="cards-container${cfg.product ? ' product-grid' : ''}"></div>
  `;

  getEl(`${key}Search`).addEventListener('input', () => renderCategory(key));
  getEl(`${key}Year`).addEventListener('change', () => renderCategory(key));

  const toggle = getEl(`${key}FilterToggle`);
  toggle.addEventListener('click', () => {
    const open = page.classList.toggle('filters-open');
    toggle.setAttribute('aria-expanded', String(open));
  });

  page.querySelectorAll('.sort-button').forEach(button => {
    button.addEventListener('click', () => {
      state[key].sort = button.dataset.sort;
      saveSort(key, state[key].sort);
      markActiveControls(key);
      renderCategory(key);
    });
  });

  page.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      state[key].minScore = chip.dataset.min ? Number(chip.dataset.min) : null;
      markActiveControls(key);
      renderCategory(key);
    });
  });

  markActiveControls(key);
}

function markActiveControls(key) {
  const page = getEl(key);
  page.querySelectorAll('.sort-button').forEach(b => {
    const active = b.dataset.sort === state[key].sort;
    b.classList.toggle('active', active);
    b.setAttribute('aria-pressed', String(active));
  });
  page.querySelectorAll('.chip').forEach(c => {
    const active = (c.dataset.min ? Number(c.dataset.min) : null) === state[key].minScore;
    c.classList.toggle('active', active);
    c.setAttribute('aria-pressed', String(active));
  });
}

/* ---------------------------
   Navigation
---------------------------- */
function showSection(id) {
  sections.forEach(sec => getEl(sec)?.classList.toggle('hidden', sec !== id));

  const onCategory = id !== 'home';
  document.querySelectorAll('.tab').forEach(tab => {
    const active = tab.dataset.section === id;
    tab.classList.toggle('active', active);
    if (active) {
      tab.setAttribute('aria-current', 'page');
    } else {
      tab.removeAttribute('aria-current');
    }
  });

  if (onCategory) {
    if (window.location.hash !== `#${id}`) window.location.hash = `#${id}`;
    document.querySelector('.tab.active')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    window.scrollTo(0, 0);
  } else {
    history.replaceState(null, '', window.location.pathname);
  }

  if (CATEGORY[id]) {
    showCategory(id);
  } else {
    renderHome();
  }
}

function handleHashChange() {
  const hash = window.location.hash.replace('#', '');
  showSection(sections.includes(hash) && hash !== '' ? hash : 'home');
}

/* ---------------------------
   Data loading
---------------------------- */
function parseCsvWithMap(text, mapRow, gid) {
  const parsed = Papa.parse(text.trim(), { header: true, skipEmptyLines: true }).data;

  return parsed.map((row, index) => {
    const item = mapRow(row) || {};
    item._row = index + 2; // header row is 1
    item._gid = gid;
    return item;
  }).filter(x => x.title);
}

function renderSkeletons(container, count) {
  container.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const card = el('div', 'card skeleton');
    card.setAttribute('aria-hidden', 'true');
    card.append(el('div', 'poster'), el('div', 'skeleton-line'), el('div', 'skeleton-line short'));
    container.appendChild(card);
  }
}

function loadCategory(key) {
  const cfg = CATEGORY[key];
  const st = state[key];
  if (!st.request) {
    st.request = Promise.all(
      cfg.gids.map(gid => fetch(buildPublishedCsvUrl(gid)).then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      }))
    ).then(texts => {
      st.data = texts.flatMap((t, i) => parseCsvWithMap(t, cfg.mapRow, cfg.gids[i]));
      populateYearFilter(key);
      return st.data;
    }).catch(err => {
      console.error(`${cfg.label} CSV error:`, err);
      st.request = null;
      throw err;
    });
  }
  return st.request;
}

async function showCategory(key) {
  const container = getEl(`${key}Container`);
  if (state[key].data) {
    renderCategory(key);
    return;
  }

  renderSkeletons(container, 8);
  try {
    await loadCategory(key);
    renderCategory(key);
  } catch {
    container.innerHTML = '';
    container.appendChild(el('p', 'empty-state', `Could not load ${CATEGORY[key].label.toLowerCase()} right now. Reload the page to try again.`));
  }
}

function populateYearFilter(key) {
  const cfg = CATEGORY[key];
  const yearEl = getEl(`${key}Year`);
  yearEl.innerHTML = '';
  yearEl.appendChild(new Option(cfg.yearLabel, ''));

  const years = Array.from(new Set((state[key].data || []).map(x => x.year).filter(Boolean)));
  years.sort((a, b) => b.localeCompare(a));
  years.forEach(y => yearEl.appendChild(new Option(y, y)));
}

/* ---------------------------
   Sorting
---------------------------- */
const byDate = (a, b) => (Date.parse(b.scoreDate || '1970-01-01') || 0) - (Date.parse(a.scoreDate || '1970-01-01') || 0);
const byYear = (a, b) => (parseInt(b.year, 10) || 0) - (parseInt(a.year, 10) || 0);
const byScore = (a, b) => (b.score || 0) - (a.score || 0);
const byTitle = (a, b) => (a.title || '').localeCompare(b.title || '');

const SORT_ORDERS = {
  latest: [byYear, byDate, byScore, byTitle],
  score: [byScore, byYear, byTitle],
  date: [byDate],
};

function applySort(list, sortKey) {
  const order = SORT_ORDERS[sortKey] || SORT_ORDERS.date;
  list.sort((a, b) => {
    for (const compare of order) {
      const d = compare(a, b);
      if (d !== 0) return d;
    }
    return 0;
  });
}

/* ---------------------------
   Cards
---------------------------- */
function buildPoster(item) {
  const poster = el('div', 'poster');

  if (item.posterUrl) {
    const img = document.createElement('img');
    img.src = item.posterUrl;
    img.alt = '';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.addEventListener('load', () => poster.classList.add('loaded'));
    img.addEventListener('error', () => {
      img.remove();
      poster.classList.add('missing');
    });
    poster.appendChild(img);
  } else {
    poster.classList.add('missing');
  }

  const badges = el('div', 'poster-badges');
  badges.appendChild(buildScoreBadge(item.score || 0));
  if ([2, 3].includes(item.recommendationLevel)) badges.appendChild(buildPickBadge(item.recommendationLevel));
  poster.appendChild(badges);
  return poster;
}

function buildCard(cfg, item) {
  const card = el('article', cfg.product ? 'card product-card' : 'card');
  card.appendChild(buildPoster(item));

  // Title, details and date each take exactly one line, so every row lines up.
  const body = el('div', 'card-body');
  const titleText = cfg.makeTitle ? cfg.makeTitle(item) : item.title;
  const title = el('h2', 'card-title', titleText);
  title.title = item.title;
  body.appendChild(title);

  const meta = el('p', 'card-meta', (cfg.makeMeta && cfg.makeMeta(item)) || ' ');
  meta.title = meta.textContent.trim();
  body.appendChild(meta);

  body.appendChild(el('p', 'card-date', item.scoreDate ? `Rated ${formatRatedDate(item.scoreDate)}` : 'Rated —'));

  card.appendChild(body);
  card.tabIndex = 0;
  card.setAttribute('role', 'button');
  card.setAttribute('aria-label', `${item.title}, score ${formatScore(item.score)}. Show details`);
  card.addEventListener('click', () => openDetails(cfg, item));
  card.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openDetails(cfg, item);
    }
  });
  return card;
}

/* ---------------------------
   Render
---------------------------- */
function renderCategory(key) {
  const cfg = CATEGORY[key];
  const st = state[key];
  if (!st.data) return;

  const container = getEl(`${key}Container`);
  const selectedYear = getEl(`${key}Year`).value;
  const searchTerm = normalize(getEl(`${key}Search`).value).trim();

  const filtered = st.data.filter(item => {
    if (!Number.isFinite(item.score)) return false;
    if (selectedYear && item.year !== selectedYear) return false;
    if (st.minScore !== null && item.score < st.minScore) return false;
    return matchesSearch(item, searchTerm, cfg.searchKeys);
  });

  applySort(filtered, st.sort);

  const [one, many] = cfg.noun;
  getEl(`${key}Count`).textContent = `${filtered.length} ${filtered.length === 1 ? one : many}`;

  container.innerHTML = '';
  if (filtered.length === 0) {
    container.appendChild(el('p', 'empty-state', `No ${many} match these filters.`));
    return;
  }

  const fragment = document.createDocumentFragment();
  filtered.forEach(item => fragment.appendChild(buildCard(cfg, item)));
  container.appendChild(fragment);
}

/* ---------------------------
   Details panel
---------------------------- */
let seasonsRequest = null;

function loadShowSeasons() {
  if (!seasonsRequest) {
    seasonsRequest = fetch(buildPublishedCsvUrl(SHOW_SEASONS_GID))
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then(text => Papa.parse(text.trim(), { header: true, skipEmptyLines: true }).data
        .map(row => ({
          title: row['Title']?.trim() || '',
          season: Number.parseInt(row['Season'], 10),
          score: Number.parseFloat(row['Score']),
        }))
        .filter(row => row.title && Number.isFinite(row.season) && Number.isFinite(row.score)))
      .catch(err => {
        seasonsRequest = null;
        throw err;
      });
  }
  return seasonsRequest;
}

async function fillSeasons(list, title) {
  try {
    const seasons = (await loadShowSeasons())
      .filter(row => row.title === title)
      .sort((a, b) => a.season - b.season);
    list.innerHTML = '';
    if (!seasons.length) {
      list.closest('.details-seasons')?.remove();
      return;
    }
    seasons.forEach(({ season, score }) => {
      const li = el('li', 'season-row');
      li.appendChild(el('span', 'season-name', `Season ${season}`));
      const bar = el('span', 'season-bar');
      const fill = el('span', `season-fill ${scoreTierClass(score)}`);
      fill.style.width = `${Math.max(0, Math.min(10, score)) * 10}%`;
      bar.appendChild(fill);
      li.appendChild(bar);
      li.appendChild(buildScoreBadge(score));
      list.appendChild(li);
    });
  } catch {
    list.closest('.details-seasons')?.remove();
  }
}

function buildPickBadge(level) {
  const top = level === 3;
  const pick = el('span', `pick-badge${top ? ' pick-top' : ''}`);
  pick.innerHTML = '<i class="fa-solid fa-star" aria-hidden="true"></i>';
  pick.appendChild(document.createTextNode(top ? 'Top pick' : 'Strong pick'));
  return pick;
}

function openDetails(cfg, item) {
  const dialog = getEl('details');
  const body = getEl('detailsBody');
  body.innerHTML = '';
  dialog.classList.toggle('is-product', Boolean(cfg.product));

  const media = buildPoster(item);
  media.classList.add('details-poster');
  media.querySelector('.poster-badges')?.remove();
  body.appendChild(media);

  const info = el('div', 'details-info');
  info.appendChild(el('p', 'details-kind', cfg.noun[0]));
  const title = el('h2', 'details-title', item.title);
  title.id = 'detailsTitle';
  info.appendChild(title);

  const scoreRow = el('div', 'details-score');
  scoreRow.appendChild(buildScoreBadge(item.score));
  if ([2, 3].includes(item.recommendationLevel)) scoreRow.appendChild(buildPickBadge(item.recommendationLevel));
  if (item.scoreDate) scoreRow.appendChild(el('span', 'details-date', `Rated ${formatRatedDate(item.scoreDate)}`));
  info.appendChild(scoreRow);

  const facts = (cfg.makeFacts ? cfg.makeFacts(item) : []).filter(([, value]) => value);
  if (facts.length) {
    const dl = el('dl', 'details-facts');
    facts.forEach(([label, value]) => {
      const row = el('div');
      row.append(el('dt', '', label), el('dd', '', value));
      dl.appendChild(row);
    });
    info.appendChild(dl);
  }

  if (item.note) {
    const note = el('blockquote', 'details-note');
    note.appendChild(el('p', '', item.note));
    info.appendChild(note);
  }

  if (cfg.hasSeasons) {
    const seasons = el('section', 'details-seasons');
    seasons.appendChild(el('h3', '', 'Seasons'));
    const list = el('ul', 'season-list');
    list.appendChild(el('li', 'season-loading', 'Loading seasons…'));
    seasons.appendChild(list);
    info.appendChild(seasons);
    fillSeasons(list, item.title);
  }

  const sheet = el('a', 'details-sheet', 'See it in my sheet');
  sheet.href = buildRowLink(item._gid, item._row);
  sheet.target = '_blank';
  sheet.rel = 'noopener noreferrer';
  info.appendChild(sheet);

  body.appendChild(info);

  if (!dialog.open) {
    dialog.showModal();
    // A history entry lets the phone back button close the panel.
    history.pushState({ details: true }, '');
  }
  body.scrollTop = 0;
}

function closeDetails() {
  const dialog = getEl('details');
  if (dialog.open) dialog.close();
}

function wireDetails() {
  const dialog = getEl('details');
  getEl('detailsClose').addEventListener('click', closeDetails);
  dialog.addEventListener('click', event => {
    if (event.target === dialog) closeDetails();
  });
  dialog.addEventListener('close', () => {
    if (history.state?.details) history.back();
  });
  window.addEventListener('popstate', () => {
    if (dialog.open) dialog.close();
  });
}

/* ---------------------------
   Home
---------------------------- */
const HOME_ROW_LIMIT = 12;
let homeRendered = false;

function scoredItems(key) {
  return (state[key].data || []).filter(item => Number.isFinite(item.score));
}

function newestFirst(items) {
  return items.slice().sort((a, b) => byDate(a, b) || byTitle(a, b));
}

function buildHomeRow(title, items, options = {}) {
  const row = el('section', 'home-row');
  const head = el('div', 'home-row-head');
  head.appendChild(el('h2', 'home-row-title', title));
  if (options.section) {
    const more = el('button', 'see-all', 'See all');
    more.type = 'button';
    more.dataset.section = options.section;
    more.addEventListener('click', () => showSection(options.section));
    head.appendChild(more);
  }
  row.appendChild(head);

  const track = el('div', `row-track${options.product ? ' product-grid' : ''}`);
  items.forEach(({ key, item }) => track.appendChild(buildCard(CATEGORY[key], item)));
  row.appendChild(track);
  return row;
}

function renderHomeSkeleton() {
  const rows = getEl('homeRows');
  rows.innerHTML = '';
  for (let r = 0; r < 2; r++) {
    const row = el('section', 'home-row');
    row.appendChild(el('div', 'skeleton-line home-row-skeleton'));
    const track = el('div', 'row-track');
    renderSkeletons(track, 6);
    row.appendChild(track);
    rows.appendChild(row);
  }
}

function renderHeroStats() {
  const stats = getEl('heroStats');
  stats.innerHTML = '';
  Object.keys(CATEGORY).forEach(key => {
    const count = scoredItems(key).length;
    if (!count) return;
    const [one, many] = CATEGORY[key].noun;
    const chip = el('button', 'stat');
    chip.type = 'button';
    chip.append(el('strong', '', String(count)), document.createTextNode(` ${count === 1 ? one : many}`));
    chip.addEventListener('click', () => showSection(key));
    stats.appendChild(chip);
  });
}

function renderHeroBackdrop() {
  const backdrop = getEl('heroBackdrop');
  const posters = newestFirst(['movies', 'shows', 'games'].flatMap(key => scoredItems(key)))
    .map(item => item.posterUrl)
    .filter(Boolean)
    .slice(0, 16);
  backdrop.innerHTML = '';
  posters.forEach(url => {
    const img = document.createElement('img');
    img.src = url;
    img.alt = '';
    img.decoding = 'async';
    img.addEventListener('load', () => img.classList.add('loaded'));
    backdrop.appendChild(img);
  });
}

async function renderHome() {
  if (homeRendered) return;
  renderHomeSkeleton();

  const keys = Object.keys(CATEGORY);
  await Promise.allSettled(keys.map(loadCategory));

  const rows = getEl('homeRows');
  rows.innerHTML = '';

  // Posters only: product photos look out of place between film and game posters.
  const recent = newestFirst(keys.filter(key => !CATEGORY[key].product)
    .flatMap(key => scoredItems(key).map(item => ({ key, item, scoreDate: item.scoreDate, title: item.title }))))
    .slice(0, HOME_ROW_LIMIT);
  if (recent.length) rows.appendChild(buildHomeRow('Recently rated', recent));

  keys.forEach(key => {
    const items = newestFirst(scoredItems(key)).slice(0, HOME_ROW_LIMIT).map(item => ({ key, item }));
    if (items.length) {
      rows.appendChild(buildHomeRow(CATEGORY[key].label, items, { section: key, product: CATEGORY[key].product }));
    }
  });

  if (!rows.children.length) {
    rows.appendChild(el('p', 'empty-state', 'Could not load the ratings right now. Reload the page to try again.'));
    return;
  }
  homeRendered = true;

  renderHeroStats();
  renderHeroBackdrop();
}

/* ---------------------------
   Init
---------------------------- */
function init() {
  Object.keys(CATEGORY).forEach(buildCategoryPage);
  wireDetails();

  document.querySelectorAll('[data-section]').forEach(btn => {
    btn.addEventListener('click', () => showSection(btn.dataset.section));
  });

  handleHashChange();
  window.addEventListener('hashchange', handleHashChange);
}

document.addEventListener('DOMContentLoaded', init);
