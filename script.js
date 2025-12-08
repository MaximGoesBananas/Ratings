/*
 * Main JavaScript for the Maxim's Ratings SPA
 *
 * Handles navigation, fetches CSV data from Google Sheets,
 * parses it into objects, and renders movie cards with
 * sorting + filtering + score badge + rated pill.
 */

// Movies CSV URL
const MOVIES_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vSmO1htUVAzTQHYcE73oHxvcKUmg5c4ZD6CdskMSA3wj3LkGhUbt1kpFqffbHNhERJ7_ksgfYEm_q2L/pub?gid=1920189918&single=true&output=csv';

// Store loaded data in memory
let moviesData = null;

// Default sort
let currentSort = 'latest';

// Section management
const sections = ['home', 'movies', 'games', 'mice', 'mousepads'];
const sectionElements = {};

// DOM refs populated in init
let categoryButtons;
let minScoreFilterEl;
let maxScoreFilterEl;
let yearFilterEl;
let directorFilterEl;
let moviesContainer;
let sortButtons;
let backToHomeBtn;

/* ---------------------------
   Helpers for score visuals
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
   Data loading
---------------------------- */

function fetchMovies() {
  fetch(MOVIES_CSV_URL)
    .then(response => response.text())
    .then(text => {
      const parsed = Papa.parse(text.trim(), { header: true }).data;

      moviesData = parsed.map(row => ({
        title: row['Title']?.trim() || '',
        score: parseFloat(row['Score'] || 0) || 0,
        year: (row['Year'] || '').toString().trim(),
        runtime: (row['Runtime'] || '').toString().trim(),
        director: row['Director']?.trim() || '',
        scoreDate: row['Score Date']?.trim() || '',
        posterUrl: row['PosterURL']?.trim() || '',
      })).filter(movie => movie.title);

      populateFilters(moviesData);
      renderMovies();
    })
    .catch(err => {
      console.error('Error fetching or parsing movies CSV:', err);
    });
}

function populateFilters(data) {
  yearFilterEl.innerHTML = '<option value="">All</option>';
  directorFilterEl.innerHTML = '<option value="">All</option>';

  const years = Array.from(new Set(data.map(m => m.year).filter(Boolean)));
  const directors = Array.from(new Set(data.map(m => m.director).filter(Boolean)));

  years.sort((a, b) => b.localeCompare(a));
  directors.sort((a, b) => a.localeCompare(b));

  years.forEach(y => {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    yearFilterEl.appendChild(opt);
  });

  directors.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d;
    opt.textContent = d;
    directorFilterEl.appendChild(opt);
  });
}

/* ---------------------------
   Filtering + Sorting
---------------------------- */

function getScoreBounds() {
  const minVal = parseFloat(minScoreFilterEl?.value);
  const maxVal = parseFloat(maxScoreFilterEl?.value);

  let minScore = Number.isFinite(minVal) ? minVal : -Infinity;
  let maxScore = Number.isFinite(maxVal) ? maxVal : Infinity;

  if (minScore > maxScore) {
    const tmp = minScore;
    minScore = maxScore;
    maxScore = tmp;
  }

  return { minScore, maxScore };
}

function renderMovies() {
  if (!moviesData) return;

  const selectedYear = yearFilterEl.value;
  const selectedDirector = directorFilterEl.value;
  const { minScore, maxScore } = getScoreBounds();

  let filtered = moviesData.filter(movie => {
    const yearMatch = selectedYear ? movie.year === selectedYear : true;
    const directorMatch = selectedDirector ? movie.director === selectedDirector : true;
    const scoreMatch = movie.score >= minScore && movie.score <= maxScore;
    return yearMatch && directorMatch && scoreMatch;
  });

  if (currentSort === 'latest') {
    filtered.sort((a, b) => {
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
  } else if (currentSort === 'score') {
    filtered.sort((a, b) => {
      const ds = b.score - a.score;
      if (ds !== 0) return ds;

      const ya = parseInt(a.year, 10) || 0;
      const yb = parseInt(b.year, 10) || 0;
      const dy = yb - ya;
      if (dy !== 0) return dy;

      return a.title.localeCompare(b.title);
    });
  } else if (currentSort === 'date') {
    filtered.sort((a, b) => {
      const da = Date.parse(a.scoreDate || '1970-01-01') || 0;
      const db = Date.parse(b.scoreDate || '1970-01-01') || 0;
      return db - da;
    });
  }

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

    const title = document.createElement('div');
    title.className = 'card-title';
    title.textContent = movie.year ? `${movie.title} (${movie.year})` : movie.title;
    content.appendChild(title);

    const director = document.createElement('div');
    director.className = 'card-details';
    director.textContent = movie.director || '';
    content.appendChild(director);

    // Rated pill (THIS is the key fix)
    const date = document.createElement('div');
    date.className = 'rated-pill';
    date.textContent = movie.scoreDate ? `Rated: ${movie.scoreDate}` : 'Rated: —';
    content.appendChild(date);

    card.appendChild(content);
    moviesContainer.appendChild(card);
  });
}

/* ---------------------------
   Init
---------------------------- */

function init() {
  // Sections
  sections.forEach(id => {
    sectionElements[id] = document.getElementById(id);
  });

  // Navigation buttons
  categoryButtons = document.querySelectorAll('.category-button');

  // Filters
  minScoreFilterEl = document.getElementById('minScoreFilter');
  maxScoreFilterEl = document.getElementById('maxScoreFilter');
  yearFilterEl = document.getElementById('yearFilter');
  directorFilterEl = document.getElementById('directorFilter');

  // Sort buttons
  sortButtons = document.querySelectorAll('.sort-button');

  // Container
  moviesContainer = document.getElementById('moviesContainer');

  // Home/back button (robust: id OR class)
  backToHomeBtn =
    document.getElementById('backToHome') ||
    document.querySelector('.back-button');

  // Category navigation
  categoryButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-section');
      showSection(target);
    });
  });

  // Sort buttons
  sortButtons.forEach(button => {
    button.addEventListener('click', () => {
      sortButtons.forEach(b => b.classList.remove('active'));
      button.classList.add('active');
      currentSort = button.getAttribute('data-sort');
      renderMovies();
    });
  });

  // Back to home (THIS is the key fix)
  if (backToHomeBtn) {
    backToHomeBtn.addEventListener('click', () => showSection('home'));
  }

  // Filter changes
  minScoreFilterEl?.addEventListener('change', renderMovies);
  maxScoreFilterEl?.addEventListener('change', renderMovies);
  yearFilterEl?.addEventListener('change', renderMovies);
  directorFilterEl?.addEventListener('change', renderMovies);

  // Initial route
  handleHashChange();
  window.addEventListener('hashchange', handleHashChange);
}

document.addEventListener('DOMContentLoaded', init);
