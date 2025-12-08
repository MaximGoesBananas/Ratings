/*
 * Main JavaScript for the Maxim's Ratings SPA
 *
 * This script handles navigation between sections, fetches CSV data
 * from the published Google Sheets, parses it into JavaScript objects,
 * and renders movie cards with filtering and sorting controls.
 */

// URL to the published CSV for the Movies category
const MOVIES_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vSmO1htUVAzTQHYcE73oHxvcKUmg5c4ZD6CdskMSA3wj3LkGhUbt1kpFqffbHNhERJ7_ksgfYEm_q2L/pub?gid=1920189918&single=true&output=csv';

// Store loaded data in memory to avoid refetching on every view switch
let moviesData = null;

// Keep track of current sort field ('score' or 'date')
let currentSort = 'score';

// DOM references
const sectionElements = {};
const categoryButtons = document.querySelectorAll('.category-button');
const sections = ['home', 'movies', 'games', 'mice', 'mousepads'];

// Initialize section references
sections.forEach(id => {
  sectionElements[id] = document.getElementById(id);
});

// Movie-specific DOM elements
const yearFilterEl = document.getElementById('yearFilter');
const directorFilterEl = document.getElementById('directorFilter');
const moviesContainer = document.getElementById('moviesContainer');
const sortButtons = document.querySelectorAll('.sort-button');

/**
 * Show the requested section and hide others.
 */
function showSection(id) {
  sections.forEach(sec => {
    sectionElements[sec].classList.toggle('hidden', sec !== id);
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

/**
 * Fetch CSV data and parse movies.
 */
function fetchMovies() {
  fetch(MOVIES_CSV_URL)
    .then(response => response.text())
    .then(text => {
      const parsed = Papa.parse(text.trim(), { header: true }).data;

      moviesData = parsed
        .map(row => ({
          title: row['Title']?.trim() || '',
          score: parseFloat(row['Score'] || 0) || 0,
          year: (row['Year'] || '').toString().trim(),
          director: row['Director']?.trim() || '',
          scoreDate: row['Score Date']?.trim() || '',
          posterUrl: row['PosterURL']?.trim() || '',
        }))
        .filter(movie => movie.title);

      populateFilters(moviesData);
      renderMovies();
    })
    .catch(err => {
      console.error('Error fetching or parsing movies CSV:', err);
    });
}

/**
 * Populate filters based on available movie data.
 */
function populateFilters(data) {
  const years = Array.from(new Set(data.map(m => m.year).filter(Boolean))).sort((a, b) => b.localeCompare(a));
  const directors = Array.from(new Set(data.map(m => m.director).filter(Boolean))).sort((a, b) => a.localeCompare(b));

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

/**
 * Render movie cards based on filters + sorting.
 */
function renderMovies() {
  if (!moviesData) return;

  const selectedYear = yearFilterEl.value;
  const selectedDirector = directorFilterEl.value;

  let filtered = moviesData.filter(m => {
    const yearMatch = selectedYear ? m.year === selectedYear : true;
    const directorMatch = selectedDirector ? m.director === selectedDirector : true;
    return yearMatch && directorMatch;
  });

  if (currentSort === 'score') {
    filtered.sort((a, b) => b.score - a.score);
  } else if (currentSort === 'date') {
    filtered.sort((a, b) => Date.parse(b.scoreDate) - Date.parse(a.scoreDate));
  }

  moviesContainer.innerHTML = '';

  filtered.forEach(m => {
    const card = document.createElement('div');
    card.className = 'card';

    const img = document.createElement('img');
    img.src = m.posterUrl || '';
    img.alt = m.title;
    img.onerror = () => {
      img.src = '';
      img.style.backgroundColor = '#3a3a3a';
    };

    const content = document.createElement('div');
    content.className = 'card-content';

    content.innerHTML = `
      <div class="card-title">${m.title}</div>
      <div class="card-details">Year: ${m.year}</div>
      <div class="card-details">Score: ${m.score}</div>
      <div class="card-details">Director: ${m.director}</div>
      <div class="card-details">Rated: ${m.scoreDate}</div>
    `;

    card.appendChild(img);
    card.appendChild(content);
    moviesContainer.appendChild(card);
  });
}

/**
 * Initialize navigation, sorting, filtering.
 */
function init() {
  categoryButtons.forEach(btn => {
    btn.addEventListener('click', () => showSection(btn.getAttribute('data-section')));
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

/**
 * Handle URL hash navigation on reload.
 */
function handleHashChange() {
  const hash = window.location.hash.replace('#', '');
  showSection(sections.includes(hash) ? hash : 'home');
}

// Start app
document.addEventListener('DOMContentLoaded', init);
