/*
 * Main JavaScript for the Maxim's Ratings SPA
 *
 * Now supports:
 * - Movies (single tab)
 * - Games (MERGED from "Simple Games" + "Complex Games")
 *
 * Each category has independent filters, sorting, and rendering.
 */

/* ---------------------------
   Published sheet base
---------------------------- */

const PUBLISHED_BASE =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vSmO1htUVAzTQHYcE73oHxvcKUmg5c4ZD6CdskMSA3wj3LkGhUbt1kpFqffbHNhERJ7_ksgfYEm_q2L/pub';

function buildPublishedCsvUrl(gid) {
  return `${PUBLISHED_BASE}?gid=${gid}&single=true&output=csv`;
}

/* ---------------------------
   GIDs (set these)
---------------------------- */

// GIDs
const MOVIES_GID = '1920189918';
const SIMPLE_GAMES_GID = '1303529120';
const COMPLEX_GAMES_GID = '1556084448';

const MOVIES_CSV_URL = buildPublishedCsvUrl(MOVIES_GID);

// Games URLs will be constructed only if gids exist
const SIMPLE_GAMES_CSV_URL = SIMPLE_GAMES_GID ? buildPublishedCsvUrl(SIMPLE_GAMES_GID) : '';
const COMPLEX_GAMES_CSV_URL = COMPLEX_GAMES_GID ? buildPublishedCsvUrl(COMPLEX_GAMES_GID) : '';

/* ---------------------------
   State
---------------------------- */

let moviesData = null;
let gamesData = null;

let currentMoviesSort = 'latest';
let currentGamesSort = 'latest';

/* ---------------------------
   Section management
---------------------------- */

const sections = ['home', 'movies', 'games', 'mice', 'mousepads'];
const sectionElements = {};
let categoryButtons;

/* ---------------------------
   Movies DOM
---------------------------- */

let minScoreFilterEl;
let maxScoreFilterEl;
let yearFilterEl;
let searchFilterEl;
let moviesContainer;
let backToHomeBtn;

/* ---------------------------
   Games DOM
---------------------------- */

let gamesMinScoreFilterEl;
let gamesMaxScoreFilterEl;
let gamesYearFilterEl;
let gamesSearchFilterEl;
let gamesContainer;
let backToHomeGamesBtn;

/* ---------------------------
   Shared DOM
---------------------------- */

let sortButtons;

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

function buildScoreBadge(score) {
  const badge = document.createElement('div');
  badge.className = 'score-badge';

  const t = clamp((score - 1) / 9, 0, 1);

  const lowColor = '#9b9b9b';
  const highColor = '#ffd54a';
  const scoreColor = lerpColorHex(lowColor, highColor, t);

  const minNumber = 0.85;
  const maxNumber = 1.35;
  const numberSize = lerp(minNumber, maxNumber, Math.pow(t, 0.9));

  const minStar = 0.75;
  const maxStar = 1.05;
  const starSize = lerp(minStar, maxStar, Math.pow(t, 0.9));

  const minBadge = 38;
  const maxBadge = 58;
  const badgeSize = lerp(minBadge, maxBadge, Math.pow(t, 0.85));

  badge.style.setProperty('--score-color', scoreColor);
  badge.style.setProperty('--score-size', `${numberSize}rem`);
  badge.style.setProperty('--star-size', `${starSize}rem`);
  badge.style.setProperty('--badge-size', `${badgeSize}px`);

  if (score >= 9.0) badge.classList.add('is-high');

  const star = document.createElement('span');
  star.className = 'score-star';
  star.textContent = '★';

  const value = document.createElement('span');
  value.className = 'score-value';
  value.textContent = formatScore(score);

  badge.appendChild(star);
  badge.appendChild(value);

  return badge;
}

function normalize(s) {
  return (s || '').toString().toLowerCase();
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

  if (id === 'movies' && moviesData === null) {
    fetchMovies();
  }

  if (id === 'games' && gamesData === null) {
    fetchGames();
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
   Movies: fetch + parse + filters
---------------------------- */

function fetchMovies() {
  fetch(MOVIES_CSV_URL)
    .then(r => r.text())
    .then(text => {
      const parsed = Papa.parse(text.trim(), { header: true }).data;

      moviesData = parsed.map(row => ({
        title: row['Title']?.trim() || '',
        score: parseFloat(row['Score'] || 0) || 0,
        year: (row['Year'] || '').toString().trim(),
        director: row['Director']?.trim() || '',
        scoreDate: row['Score Date']?.trim() || '',
        posterUrl: row['PosterURL']?.trim() || '',
      })).filter(m => m.title);

      populateMoviesYearFilter(moviesData);
      renderMovies();
    })
    .catch(err => console.error('Movies CSV error:', err));
}

function populateMoviesYearFilter(data) {
  yearFilterEl.innerHTML = '<option value="">All</option>';
  const years = Array.from(new Set(data.map(m => m.year).filter(Boolean)));
  years.sort((a, b) => b.localeCompare(a));
  years.forEach(y => {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    yearFilterEl.appendChild(opt);
  });
}

/* ---------------------------
   Movies: render
---------------------------- */

function sortMovies(list) {
  if (currentMoviesSort === 'latest') {
    list.sort((a, b) => {
      const ya = parseInt(a.year, 10) || 0;
      const yb = parseInt(b.year, 10) || 0;
      const dy = yb - ya;
      if (dy !== 0) return dy;

      const da = Date.parse(a.scoreDate || '1970-01-01') || 0;
      const db = Date.parse(b.scoreDate || '1970-01-01') || 0;
      const dd = db - da;
      if (dd !== 0) return dd;

      const ds = b.score - a.score;
      if (ds !== 0) return ds;

      return a.title.localeCompare(b.title);
    });
  } else if (currentMoviesSort === 'score') {
    list.sort((a, b) => {
      const ds = b.score - a.score;
      if (ds !== 0) return ds;

      const ya = parseInt(a.year, 10) || 0;
      const yb = parseInt(b.year, 10) || 0;
      const dy = yb - ya;
      if (dy !== 0) return dy;

      return a.title.localeCompare(b.title);
    });
  } else if (currentMoviesSort === 'date') {
    list.sort((a, b) => {
      const da = Date.parse(a.scoreDate || '1970-01-01') || 0;
      const db = Date.parse(b.scoreDate || '1970-01-01') || 0;
      return db - da;
    });
  }
}

function renderMovies() {
  if (!moviesData) return;

  const selectedYear = yearFilterEl.value;
  const { minScore, maxScore } = getScoreBounds(minScoreFilterEl, maxScoreFilterEl);
  const searchTerm = normalize(searchFilterEl?.value).trim();

  let filtered = moviesData.filter(movie => {
    const yearMatch = selectedYear ? movie.year === selectedYear : true;
    const scoreMatch = movie.score >= minScore && movie.score <= maxScore;

    const title = normalize(movie.title);
    const director = normalize(movie.director);

    const searchMatch = searchTerm
      ? (title.includes(searchTerm) || director.includes(searchTerm))
      : true;

    return yearMatch && scoreMatch && searchMatch;
  });

  sortMovies(filtered);

  moviesContainer.innerHTML = '';

  filtered.forEach(movie => {
    const card = document.createElement('div');
    card.className = 'card';

    const posterWrap = document.createElement('div');
    posterWrap.className = 'poster-wrap';

    const img = document.createElement('img');
    img.src = movie.posterUrl || '';
    img.alt = movie.title;
    img.onerror = () => {
      img.src = '';
      img.style.backgroundColor = '#3a3a3a';
    };

    posterWrap.appendChild(img);
    posterWrap.appendChild(buildScoreBadge(movie.score));
    card.appendChild(posterWrap);

    const content = document.createElement('div');
    content.className = 'card-content';

    const titleEl = document.createElement('div');
    titleEl.className = 'card-title';
    titleEl.textContent = movie.year ? `${movie.title} (${movie.year})` : movie.title;
    content.appendChild(titleEl);

    const directorEl = document.createElement('div');
    directorEl.className = 'card-details';
    directorEl.textContent = movie.director || '';
    content.appendChild(directorEl);

    const dateEl = document.createElement('div');
    dateEl.className = 'rated-pill';
    dateEl.textContent = movie.scoreDate ? `Rated: ${movie.scoreDate}` : 'Rated: —';
    content.appendChild(dateEl);

    card.appendChild(content);
    moviesContainer.appendChild(card);
  });
}

/* ---------------------------
   Games: fetch + parse + filters
---------------------------- */

function parseGamesCsv(text) {
  const parsed = Papa.parse(text.trim(), { header: true }).data;

  return parsed.map(row => ({
    title: row['Title']?.trim() || '',
    score: parseFloat(row['Score'] || 0) || 0,
    year: (row['Year'] || '').toString().trim(),
    developers: row['Developers']?.trim() || '',
    scoreDate: row['Score Date']?.trim() || '',
    posterUrl: row['PosterURL']?.trim() || '',
  })).filter(g => g.title);
}

function fetchGames() {
  // If gids not configured yet, keep section empty but safe
  if (!SIMPLE_GAMES_CSV_URL || !COMPLEX_GAMES_CSV_URL) {
    gamesData = [];
    gamesContainer.innerHTML =
      '<div class="card"><div class="card-content"><div class="card-title">Games data not linked yet</div><div class="card-details">Paste the Simple Games and Complex Games gid values into script.js.</div></div></div>';
    return;
  }

  Promise.all([
    fetch(SIMPLE_GAMES_CSV_URL).then(r => r.text()),
    fetch(COMPLEX_GAMES_CSV_URL).then(r => r.text()),
  ])
    .then(([simpleText, complexText]) => {
      const simple = parseGamesCsv(simpleText);
      const complex = parseGamesCsv(complexText);

      // Merge
      gamesData = [...simple, ...complex];

      populateGamesYearFilter(gamesData);
      renderGames();
    })
    .catch(err => console.error('Games CSV error:', err));
}

function populateGamesYearFilter(data) {
  gamesYearFilterEl.innerHTML = '<option value="">All</option>';
  const years = Array.from(new Set(data.map(g => g.year).filter(Boolean)));
  years.sort((a, b) => b.localeCompare(a));
  years.forEach(y => {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    gamesYearFilterEl.appendChild(opt);
  });
}

/* ---------------------------
   Games: render
---------------------------- */

function sortGames(list) {
  if (currentGamesSort === 'latest') {
    list.sort((a, b) => {
      const ya = parseInt(a.year, 10) || 0;
      const yb = parseInt(b.year, 10) || 0;
      const dy = yb - ya;
      if (dy !== 0) return dy;

      const da = Date.parse(a.scoreDate || '1970-01-01') || 0;
      const db = Date.parse(b.scoreDate || '1970-01-01') || 0;
      const dd = db - da;
      if (dd !== 0) return dd;

      const ds = b.score - a.score;
      if (ds !== 0) return ds;

      return a.title.localeCompare(b.title);
    });
  } else if (currentGamesSort === 'score') {
    list.sort((a, b) => {
      const ds = b.score - a.score;
      if (ds !== 0) return ds;

      const ya = parseInt(a.year, 10) || 0;
      const yb = parseInt(b.year, 10) || 0;
      const dy = yb - ya;
      if (dy !== 0) return dy;

      return a.title.localeCompare(b.title);
    });
  } else if (currentGamesSort === 'date') {
    list.sort((a, b) => {
      const da = Date.parse(a.scoreDate || '1970-01-01') || 0;
      const db = Date.parse(b.scoreDate || '1970-01-01') || 0;
      return db - da;
    });
  }
}

function renderGames() {
  if (!gamesData) return;

  const selectedYear = gamesYearFilterEl.value;
  const { minScore, maxScore } = getScoreBounds(gamesMinScoreFilterEl, gamesMaxScoreFilterEl);
  const searchTerm = normalize(gamesSearchFilterEl?.value).trim();

  let filtered = gamesData.filter(game => {
    const yearMatch = selectedYear ? game.year === selectedYear : true;
    const scoreMatch = game.score >= minScore && game.score <= maxScore;

    const title = normalize(game.title);
    const devs = normalize(game.developers);

    const searchMatch = searchTerm
      ? (title.includes(searchTerm) || devs.includes(searchTerm))
      : true;

    return yearMatch && scoreMatch && searchMatch;
  });

  sortGames(filtered);

  gamesContainer.innerHTML = '';

  filtered.forEach(game => {
    const card = document.createElement('div');
    card.className = 'card';

    const posterWrap = document.createElement('div');
    posterWrap.className = 'poster-wrap';

    const img = document.createElement('img');
    img.src = game.posterUrl || '';
    img.alt = game.title;
    img.onerror = () => {
      img.src = '';
      img.style.backgroundColor = '#3a3a3a';
    };

    posterWrap.appendChild(img);
    posterWrap.appendChild(buildScoreBadge(game.score));
    card.appendChild(posterWrap);

    const content = document.createElement('div');
    content.className = 'card-content';

    const titleEl = document.createElement('div');
    titleEl.className = 'card-title';
    titleEl.textContent = game.year ? `${game.title} (${game.year})` : game.title;
    content.appendChild(titleEl);

    const devEl = document.createElement('div');
    devEl.className = 'card-details';
    devEl.textContent = game.developers || '';
    content.appendChild(devEl);

    const dateEl = document.createElement('div');
    dateEl.className = 'rated-pill';
    dateEl.textContent = game.scoreDate ? `Rated: ${game.scoreDate}` : 'Rated: —';
    content.appendChild(dateEl);

    card.appendChild(content);
    gamesContainer.appendChild(card);
  });
}

/* ---------------------------
   Init
---------------------------- */

function init() {
  // Section elements
  sections.forEach(id => {
    sectionElements[id] = document.getElementById(id);
  });

  categoryButtons = document.querySelectorAll('.category-button');
  sortButtons = document.querySelectorAll('.sort-button');

  // Movies refs
  minScoreFilterEl = document.getElementById('minScoreFilter');
  maxScoreFilterEl = document.getElementById('maxScoreFilter');
  yearFilterEl = document.getElementById('yearFilter');
  searchFilterEl = document.getElementById('searchFilter');
  moviesContainer = document.getElementById('moviesContainer');
  backToHomeBtn = document.getElementById('backToHome') || document.querySelector('#movies .back-button');

  // Games refs
  gamesMinScoreFilterEl = document.getElementById('gamesMinScoreFilter');
  gamesMaxScoreFilterEl = document.getElementById('gamesMaxScoreFilter');
  gamesYearFilterEl = document.getElementById('gamesYearFilter');
  gamesSearchFilterEl = document.getElementById('gamesSearchFilter');
  gamesContainer = document.getElementById('gamesContainer');
  backToHomeGamesBtn = document.getElementById('backToHomeGames') || document.querySelector('#games .back-button');

  // Category navigation
  categoryButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-section');
      showSection(target);
    });
  });

  // Sort buttons (scoped by data-target)
  sortButtons.forEach(button => {
    button.addEventListener('click', () => {
      const target = button.getAttribute('data-target') || 'movies';
      const sortValue = button.getAttribute('data-sort');

      document.querySelectorAll(`.sort-button[data-target="${target}"]`)
        .forEach(b => b.classList.remove('active'));

      button.classList.add('active');

      if (target === 'movies') {
        currentMoviesSort = sortValue;
        renderMovies();
      } else if (target === 'games') {
        currentGamesSort = sortValue;
        renderGames();
      }
    });
  });

  // Back buttons
  backToHomeBtn?.addEventListener('click', () => showSection('home'));
  backToHomeGamesBtn?.addEventListener('click', () => showSection('home'));

  // Movies filters
  minScoreFilterEl?.addEventListener('change', renderMovies);
  maxScoreFilterEl?.addEventListener('change', renderMovies);
  yearFilterEl?.addEventListener('change', renderMovies);
  searchFilterEl?.addEventListener('input', renderMovies);

  // Games filters
  gamesMinScoreFilterEl?.addEventListener('change', renderGames);
  gamesMaxScoreFilterEl?.addEventListener('change', renderGames);
  gamesYearFilterEl?.addEventListener('change', renderGames);
  gamesSearchFilterEl?.addEventListener('input', renderGames);

  // Initial route
  handleHashChange();
  window.addEventListener('hashchange', handleHashChange);
}

document.addEventListener('DOMContentLoaded', init);
