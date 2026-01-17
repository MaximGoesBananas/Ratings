// Matväljaren - Script
document.addEventListener('DOMContentLoaded', () => {
    // State
    let recipes = [];
    let selectedEnergy = null;
    let selectedCategory = null;
    let currentSort = 'time';
    let filteredRecipes = [];

    // DOM Elements
    const filtersSection = document.getElementById('filters');
    const resultsSection = document.getElementById('results');
    const recipesGrid = document.getElementById('recipes-grid');
    const resultsCount = document.getElementById('results-count');
    const resetBtn = document.getElementById('reset-btn');
    const modal = document.getElementById('recipe-modal');
    const modalBody = document.getElementById('modal-body');
    const modalClose = document.querySelector('.modal-close');

    // Energy buttons
    const energyButtons = document.querySelectorAll('[data-energy]');
    // Category buttons
    const categoryButtons = document.querySelectorAll('[data-category]');
    // Sort buttons
    const sortButtons = document.querySelectorAll('[data-sort]');

    // Load recipes
    async function loadRecipes() {
        try {
            const response = await fetch('recipes.json');
            recipes = await response.json();
        } catch (error) {
            console.error('Kunde inte ladda recept:', error);
            recipesGrid.innerHTML = `
                <div class="no-results">
                    <div class="no-results-icon">😕</div>
                    <h3>Kunde inte ladda recepten</h3>
                    <p>Försök ladda om sidan</p>
                </div>
            `;
        }
    }

    // Filter recipes based on selections
    function filterRecipes() {
        let result = [...recipes];

        // Filter by energy (time)
        if (selectedEnergy === 'tired') {
            result = result.filter(r => r.time <= 30);
        }
        // 'good' and 'all' show all recipes

        // Filter by category
        if (selectedCategory && selectedCategory !== 'all') {
            result = result.filter(r => r.category === selectedCategory);
        }

        filteredRecipes = result;
        sortRecipes();
    }

    // Sort recipes
    function sortRecipes() {
        switch (currentSort) {
            case 'time':
                filteredRecipes.sort((a, b) => a.time - b.time);
                break;
            case 'price':
                filteredRecipes.sort((a, b) => a.estimatedCost - b.estimatedCost);
                break;
            case 'name':
                filteredRecipes.sort((a, b) => a.name.localeCompare(b.name, 'sv'));
                break;
        }
        renderRecipes();
    }

    // Render recipe cards
    function renderRecipes() {
        if (filteredRecipes.length === 0) {
            recipesGrid.innerHTML = `
                <div class="no-results">
                    <div class="no-results-icon">🍽️</div>
                    <h3>Inga rätter hittades</h3>
                    <p>Prova att ändra dina val</p>
                </div>
            `;
            resultsCount.textContent = '(0 rätter)';
            return;
        }

        resultsCount.textContent = `(${filteredRecipes.length} ${filteredRecipes.length === 1 ? 'rätt' : 'rätter'})`;

        recipesGrid.innerHTML = filteredRecipes.map((recipe, index) => `
            <article class="recipe-card fade-in" data-id="${recipe.id}" style="animation-delay: ${index * 0.05}s">
                <div class="card-content">
                    <img
                        src="${recipe.image}"
                        alt="${recipe.name}"
                        class="card-image"
                        loading="lazy"
                        onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%23f0f0f0%22 width=%22100%22 height=%22100%22/><text x=%2250%22 y=%2255%22 text-anchor=%22middle%22 font-size=%2240%22>🍽️</text></svg>'"
                    >
                    <div class="card-info">
                        <h3 class="card-title">${recipe.name}</h3>
                        <div class="card-meta">
                            <span class="meta-item">
                                <span class="meta-icon">⏱️</span>
                                ${recipe.time} min
                            </span>
                            <span class="meta-item">
                                <span class="meta-icon">💰</span>
                                ${recipe.estimatedCost} kr
                            </span>
                        </div>
                    </div>
                </div>
            </article>
        `).join('');

        // Add click handlers to cards
        document.querySelectorAll('.recipe-card').forEach(card => {
            card.addEventListener('click', () => openRecipeModal(card.dataset.id));
        });
    }

    // Open recipe modal
    function openRecipeModal(recipeId) {
        const recipe = recipes.find(r => r.id === recipeId);
        if (!recipe) return;

        modalBody.innerHTML = `
            <img
                src="${recipe.image}"
                alt="${recipe.name}"
                class="modal-image"
                onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%23f0f0f0%22 width=%22100%22 height=%22100%22/><text x=%2250%22 y=%2255%22 text-anchor=%22middle%22 font-size=%2240%22>🍽️</text></svg>'"
            >
            <div class="modal-details">
                <h2 class="modal-title">${recipe.name}</h2>
                <div class="modal-meta">
                    <span class="meta-item">
                        <span class="meta-icon">⏱️</span>
                        ${recipe.time} min
                    </span>
                    <span class="meta-item">
                        <span class="meta-icon">👥</span>
                        ${recipe.servings} port
                    </span>
                    <span class="meta-item">
                        <span class="meta-icon">💰</span>
                        ~${recipe.estimatedCost} kr
                    </span>
                </div>

                <h3 class="section-title">🛒 Ingredienser</h3>
                <ul class="ingredients-list">
                    ${recipe.ingredients.map(ing => `
                        <li>
                            <span class="ingredient-name">${ing.item}</span>
                            <span class="ingredient-amount">${ing.amount}</span>
                        </li>
                    `).join('')}
                </ul>

                <h3 class="section-title">👨‍🍳 Gör så här</h3>
                <ol class="steps-list">
                    ${recipe.steps.map(step => `<li>${step}</li>`).join('')}
                </ol>
            </div>
        `;

        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    // Close modal
    function closeModal() {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }

    // Show results
    function showResults() {
        if (selectedEnergy && selectedCategory) {
            filtersSection.classList.add('hidden');
            resultsSection.classList.remove('hidden');
            filterRecipes();
        }
    }

    // Reset to start
    function resetToStart() {
        selectedEnergy = null;
        selectedCategory = null;
        currentSort = 'time';

        // Reset button states
        energyButtons.forEach(btn => btn.classList.remove('active'));
        categoryButtons.forEach(btn => btn.classList.remove('active'));
        sortButtons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.sort === 'time') btn.classList.add('active');
        });

        // Show filters, hide results
        filtersSection.classList.remove('hidden');
        resultsSection.classList.add('hidden');
    }

    // Event Listeners

    // Energy buttons
    energyButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            energyButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedEnergy = btn.dataset.energy;
            showResults();
        });
    });

    // Category buttons
    categoryButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            categoryButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedCategory = btn.dataset.category;
            showResults();
        });
    });

    // Sort buttons
    sortButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            sortButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentSort = btn.dataset.sort;
            sortRecipes();
        });
    });

    // Reset button
    resetBtn.addEventListener('click', resetToStart);

    // Modal close button
    modalClose.addEventListener('click', closeModal);

    // Close modal on backdrop click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    // Close modal on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
            closeModal();
        }
    });

    // Prevent body scroll when modal is open on touch devices
    modal.addEventListener('touchmove', (e) => {
        if (e.target === modal) {
            e.preventDefault();
        }
    }, { passive: false });

    // Initialize
    loadRecipes();
});