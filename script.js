/*
 * Main JavaScript for the Maxim's Ratings SPA
 *
 * This script handles navigation between sections, fetches CSV data
 * from the published Google Sheets, parses it into JavaScript objects,
 * and renders movie cards with filtering and sorting controls.
 */

// Movies CSV URL
const MOVIES_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vSmO1htUVAzTQHYcE73oHxvcKUmg5c4ZD6CdskMSA3wj3LkGhUbt1kpFqffbHNhERJ7_ksgfYEm_q2L/pub?gid=1920189918&single=true&output=csv';

// Store loaded data in memory to avoid refetching on every view switch
let moviesData = null;

// Keep track of current sort field ('score' or 'date')
let currentSort = 'score';

// DOM element references
const sectionElements = {};
const categoryButtons = document.querySelectorAll('.category-button');
const sections = ['home', 'movies', 'games', 'mice', 'mousepads'];

// Initialize references to each section for quick lookup
sections.forEach(id => {
  sectionElements[id] = document.getElementById(id);
});

// Movie-specific DOM elements
const yearFilterEl = document.getElementById('yearFilter');
const directorFilterEl = document.getElementById('directorFilter');
const moviesContainer = document.getElementById('moviesContainer');
const sortButtons = document.querySelectorAll('.sort-button');

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

  // Normalize: 1 -> 0, 10 -> 1
  const t = clamp((score - 1) / 9, 0, 1);

  // Number/star color: gray -> rich yellow
  const lowColor = '#9b9b9b';
  const highColor = '#ffd54a';
  const scoreColor = lerpColorHex(lowColor, highColor, t);

  // Number size scaling (rem)
  const minNumber = 0.85;
  const maxNumber = 1.35;
  const numberSize = lerp(minNumber, maxNumber, Math.pow(t, 0.9));

  // Star size scaling (rem)
  const minStar = 0.75;
  const maxStar = 1.05;
  const starSize = lerp(minStar, maxStar, Math.pow(t, 0.9));

  // Badge circle size scaling (px)
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

/**
 * Show the requested section and hide others. Also update the URL hash.
 */
function showSection(id) {
  sections.forEach(sec => {
    if (sectionElements[sec]) {
      sectionElements[sec].classList.toggle('hidden', sec !== id);
    }
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

/* ---------------------------
   Data loading
---------------------------- */

/**
 * Fetch the CSV data for movies, parse it using PapaParse, then
 * populate the filters and render the movie cards.
 *
 * Expected headers (matching your updated sheet):
 * Title, Score, Year, Runtime, Director, Score Date, PosterURL, ...
 */
function fetchMovies() {
  fetch(MOVIES_CSV_URL)
    .then(response => response.text())
    .then(text => {
      const parsed = Papa.parse(text.trim(), { header: true }).data;

      moviesData = parsed.map(row => {
        return {
          title: row['Title']?.trim() || '',
          score: parseFloat(row['Score'] || 0) || 0,
          year: (row['Year'] || '').toString().trim(),
          runtime: (row['Runtime'] || '').toString().trim(),
          director: row['Director']?.trim() || '',
          scoreDate: row['Score Date']?.trim() || '',
          posterUrl: row['PosterURL']?.trim() || '',
        };
      }).filter(movie => movie.title);

      populateFilters(moviesData);
      renderMovies();
    })
    .catch(err => {
      console.error('Error fetching or parsing movies CSV:', err);
    });
}

/**
 * Populate the year and director filters based on available data.
 */
function populateFilters(data) {
  // Reset back to just "All" (avoid duplicates if refetch ever happens)
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
   Rendering
---------------------------- */

/**
 * Render the movie cards based on current filters and sorting.
 * Score is displayed as a circular overlay badge on the poster.
 */
function renderMovies() {
  if (!moviesData) return;

  const selectedYear = yearFilterEl.value;
  const selectedDirector = directorFilterEl.value;

  let filtered = moviesData.filter(movie => {
    const yearMatch = selectedYear ? movie.year === selectedYear : true;
    const directorMatch = selectedDirector ? movie.director === selectedDirector : true;
    return yearMatch && directorMatch;
  });

  if (currentSort === 'score') {
    filtered.sort((a, b) => b.score - a.score);
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

    // Poster wrapper for overlay badge
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

    // Content
    const content = document.createElement('div');
    content.className = 'card-content';

    const title = document.createElement('div');
    title.className = 'card-title';
    title.textContent = movie.title;
    content.appendChild(title);

    const year = document.createElement('div');
    year.className = 'card-details';
    year.textContent = `Year: ${movie.year}`;
    content.appendChild(year);

    const director = document.createElement('div');
    director.className = 'card-details';
    director.textContent = `Director: ${movie.director}`;
    content.appendChild(director);

    const date = document.createElement('div');
    date.className = 'card-details';
    date.textContent = `Rated: ${movie.scoreDate}`;
    content.appendChild(date);

    card.appendChild(content);
    moviesContainer.appendChild(card);
  });
}

/* ---------------------------
   Init
---------------------------- */

function init() {
  categoryButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-section');
      showSection(target);
    });
  });

  sortButtons.forEach(button => {
    button.addEventListener('click', () => {
      sortButtons.forEach(b => b.classList.remove('active'));
      button.classList.add('active');
      currentSort = button.getAttribute('data-sort');
      renderMovies();
    });
  });

  yearFilterEl.addEventListener('change', renderMovies);
  directorFilterEl.addEventListener('change', renderMovies);

  handleHashChange();
  window.addEventListener('hashchange', handleHashChange);
}

function handleHashChange() {
  const hash = window.location.hash.replace('#', '');
  if (sections.includes(hash) && hash !== '') {
    showSection(hash);
  } else {
    showSection('home');
  }
}

document.addEventListener('DOMContentLoaded', init);
