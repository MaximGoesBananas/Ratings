/*
 * Main JavaScript for the Maxim's Ratings SPA
 *
 * This script handles navigation between sections, fetches CSV data
 * from the published Google Sheets, parses it into JavaScript objects,
 * and renders movie cards with filtering and sorting controls.
 */

// URL to the published CSV for the Movies category. Using a constant
// makes it easy to change or extend later when new categories are added.
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

/**
 * Show the requested section and hide others. Also update the URL
 * hash so that the correct section is displayed when the page reloads.
 *
 * @param {string} id - The id of the section to show (e.g. 'movies').
 */
function showSection(id) {
  sections.forEach(sec => {
    if (sectionElements[sec]) {
      sectionElements[sec].classList.toggle('hidden', sec !== id);
    }
  });
  // When showing a section other than home, update the hash
  if (id !== 'home') {
    window.location.hash = `#${id}`;
  } else {
    // Remove any existing hash when returning to home
    history.replaceState(null, '', window.location.pathname);
  }
  // If entering the movies section for the first time, trigger load
  if (id === 'movies' && moviesData === null) {
    fetchMovies();
  }
}

/**
 * Fetch the CSV data for movies, parse it using PapaParse, then
 * populate the filters and render the movie cards. Errors are
 * logged to the console but not displayed to users for simplicity.
 */
function fetchMovies() {
  fetch(MOVIES_CSV_URL)
    .then(response => response.text())
    .then(text => {
      const parsed = Papa.parse(text.trim(), { header: true }).data;
      moviesData = parsed.map(row => {
        return {
          title: row['Title']?.trim() || '',
          score: parseFloat(row['Score (1-10)'] || row['Score'] || 0) || 0,
          year: (row['Year'] || '').toString().trim(),
          director: row['Director']?.trim() || '',
          scoreDate: row['Score Date']?.trim() || row['Date']?.trim() || '',
          posterUrl: row['PosterURL']?.trim() || row['Poster']?.trim() || '',
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
 * Creates <option> elements dynamically and appends them to the
 * corresponding select elements. Sorting ensures that years are
 * listed from newest to oldest and directors are alphabetical.
 *
 * @param {Array<Object>} data - Array of movie objects.
 */
function populateFilters(data) {
  // Unique years and directors
  const years = Array.from(new Set(data.map(m => m.year).filter(Boolean)));
  const directors = Array.from(new Set(data.map(m => m.director).filter(Boolean)));
  years.sort((a, b) => b.localeCompare(a));
  directors.sort((a, b) => a.localeCompare(b));
  // Populate year filter
  years.forEach(y => {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    yearFilterEl.appendChild(opt);
  });
  // Populate director filter
  directors.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d;
    opt.textContent = d;
    directorFilterEl.appendChild(opt);
  });
}

/**
 * Render the movie cards based on current filters and sorting.
 * Reads selected values from the filters and sorts the data
 * accordingly before constructing and injecting card elements.
 */
function renderMovies() {
  if (!moviesData) return;
  // Read filter values
  const selectedYear = yearFilterEl.value;
  const selectedDirector = directorFilterEl.value;
  // Filter based on year and director
  let filtered = moviesData.filter(movie => {
    const yearMatch = selectedYear ? movie.year === selectedYear : true;
    const directorMatch = selectedDirector ? movie.director === selectedDirector : true;
    return yearMatch && directorMatch;
  });
  // Sort based on currentSort
  if (currentSort === 'score') {
    filtered.sort((a, b) => b.score - a.score);
  } else if (currentSort === 'date') {
    filtered.sort((a, b) => {
      // Compare ISO date strings; fallback to 0 for invalid dates
      const da = Date.parse(a.scoreDate || '1970-01-01') || 0;
      const db = Date.parse(b.scoreDate || '1970-01-01') || 0;
      return db - da;
    });
  }
  // Clear container
  moviesContainer.innerHTML = '';
  // Build cards
  filtered.forEach(movie => {
    const card = document.createElement('div');
    card.className = 'card';
    // Image element
    const img = document.createElement('img');
    img.src = movie.posterUrl || '';
    img.alt = movie.title;
    // Fallback for broken images
    img.onerror = () => {
      img.src = '';
      img.style.backgroundColor = '#3a3a3a';
    };
    card.appendChild(img);
    // Content container
    const content = document.createElement('div');
    content.className = 'card-content';
    // Title
    const title = document.createElement('div');
    title.className = 'card-title';
    title.textContent = movie.title;
    content.appendChild(title);
    // Year
    const year = document.createElement('div');
    year.className = 'card-details';
    year.textContent = `Year: ${movie.year}`;
    content.appendChild(year);
    // Score
    const score = document.createElement('div');
    score.className = 'card-details';
    score.textContent = `Score: ${movie.score}`;
    content.appendChild(score);
    // Director
    const director = document.createElement('div');
    director.className = 'card-details';
    director.textContent = `Director: ${movie.director}`;
    content.appendChild(director);
    // Date rated
    const date = document.createElement('div');
    date.className = 'card-details';
    date.textContent = `Rated: ${movie.scoreDate}`;
    content.appendChild(date);
    card.appendChild(content);
    moviesContainer.appendChild(card);
  });
}

/**
 * Initialize event listeners for navigation, sorting and filtering.
 */
function init() {
  // Navigation: clicking a category button shows the corresponding section
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
  // Filter changes
  yearFilterEl.addEventListener('change', renderMovies);
  directorFilterEl.addEventListener('change', renderMovies);
  // Check the initial hash on page load
  handleHashChange();
  // Update view when the hash changes (e.g. back/forward browser navigation)
  window.addEventListener('hashchange', handleHashChange);
}

/**
 * Display a section based on the URL hash. Called on page load and
 * whenever the hash changes. Defaults to home if no hash is present.
 */
function handleHashChange() {
  const hash = window.location.hash.replace('#', '');
  if (sections.includes(hash) && hash !== '') {
    showSection(hash);
  } else {
    showSection('home');
  }
}

// Kick off initialization once the DOM is fully loaded
document.addEventListener('DOMContentLoaded', init);

// Override fetchMovies to use correct CSV URL
function fetchMovies() {
  fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vSmO1htUVAzTQHYcE73oHxvcKUmg5c4ZD6CdskMSA3wj3LkGhUbt1kpFqffbHNhERJ7_ksgfYEm_q2L/pub?gid=1920189918&single=true&output=csv')
    .then(response => response.text())
    .then(text => {
      const parsed = Papa.parse(text.trim(), { header: true }).data;
      moviesData = parsed.map(row => {
        return {
          title: row['Title']?.trim() || '',
          score: parseFloat(row['Score (1-10)'] || row['Score'] || 0) || 0,
          year: (row['Year'] || '').toString().trim(),
          director: row['Director']?.trim() || '',
          scoreDate: row['Score Date']?.trim() || row['Date']?.trim() || '',
          posterUrl: row['PosterURL']?.trim() || row['Poster']?.trim() || '',
        };
      }).filter(movie => movie.title);
      populateFilters(moviesData);
      renderMovies();
    })
    .catch(err => {
      console.error('Error fetching or parsing movies CSV:', err);
    });
}
