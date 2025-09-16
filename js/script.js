// js/script.js
function qs(sel, ctx = document) { return ctx.querySelector(sel); }
function qsa(sel, ctx = document) { return Array.from(ctx.querySelectorAll(sel)); }

const debounce = (fn, wait = 300) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
};

// Cache for search results
const searchCache = new Map();
let favorites = JSON.parse(localStorage.getItem('recipe-favorites') || '[]');

/* Enhanced fetch helper */
async function fetchFromSpoonacular(endpoint) {
  try {
    const url = `/api/search?${endpoint}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch from API");
    return await res.json();
  } catch (err) {
    console.error("Error fetching from API:", err);
    return { results: [] };
  }
}
/* Enhanced search with filters and caching */
async function searchRecipes(query = "", number = 12, filters = {}) {
  const recipesEl = qs('#recipes');
  const loadingEl = qs('#loading');
  const noResultsEl = qs('#no-results');
  const errorEl = qs('#error-state');

  if (loadingEl) loadingEl.hidden = false;
  if (noResultsEl) noResultsEl.hidden = true;
  if (errorEl) errorEl.hidden = true;

  // Create cache key
  const cacheKey = JSON.stringify({ query, number, filters });
  if (searchCache.has(cacheKey)) {
    const cachedData = searchCache.get(cacheKey);
    renderRecipeCards(cachedData);
    if (loadingEl) loadingEl.hidden = true;
    return;
  }

  try {
    let endpoint = `q=${encodeURIComponent(query)}&number=${encodeURIComponent(number)}`;
    
    // Add filters
    if (filters.cuisine) endpoint += `&cuisine=${encodeURIComponent(filters.cuisine)}`;
    if (filters.diet) endpoint += `&diet=${encodeURIComponent(filters.diet)}`;
    if (filters.intolerances) endpoint += `&intolerances=${encodeURIComponent(filters.intolerances)}`;
    if (filters.type) endpoint += `&type=${encodeURIComponent(filters.type)}`;

    const data = await fetchFromSpoonacular(endpoint);
    const results = data.results || [];
    
    // Cache results
    searchCache.set(cacheKey, results);
    
    renderRecipeCards(results);

    if (results.length === 0 && noResultsEl) {
      noResultsEl.hidden = false;
      qs('#no-results p').textContent = query 
        ? `No recipes found for "${query}". Try "pasta" or "chicken"!` 
        : 'No recipes found. Try searching for something delicious!';
    }
  } catch (e) {
    console.error('Search error:', e);
    if (errorEl) {
      errorEl.hidden = false;
      qs('#error-message').textContent = e.message;
    } else {
      recipesEl.innerHTML = `
        <div class="error-state">
          <p class="error-message">${escapeHtml(e.message)}</p>
          <button class="retry-btn" onclick="retryLastSearch()">Try Again</button>
        </div>
      `;
    }
  } finally {
    if (loadingEl) loadingEl.hidden = true;
  }
}


let lastSearchParams = {};
function retryLastSearch() {
  const { query, number, filters } = lastSearchParams;
  searchRecipes(query, number, filters);
}

function renderRecipeCards(recipes) {
  const container = qs('#recipes') || qs('#featured-list');
  if (!container) return;
  container.innerHTML = "";

  recipes.forEach(r => {
    const isFavorite = favorites.includes(r.id);
    const article = document.createElement('article');
    article.className = 'recipe-card';
    article.innerHTML = `
      <img src="${r.image || '/api/placeholder/300/200'}" alt="${escapeHtml(r.title || 'Recipe')}" loading="lazy">
      <div class="card-body">
        <h3 class="recipe-title">${escapeHtml(r.title || 'Untitled')}</h3>
        <div class="card-actions">
          <button class="view-btn" data-id="${r.id}" aria-label="View ${escapeHtml(r.title)} recipe">View Recipe</button>
          <button class="favorite-btn ${isFavorite ? 'favorited' : ''}" data-id="${r.id}" aria-label="${isFavorite ? 'Remove from' : 'Add to'} favorites">
            ${isFavorite ? '❤️' : '🤍'}
          </button>
        </div>
      </div>
    `;
    container.appendChild(article);
  });

  // Attach event listeners
  qsa('.view-btn', container).forEach(btn => {
    btn.addEventListener('click', () => openRecipeModal(btn.dataset.id));
  });

  qsa('.favorite-btn', container).forEach(btn => {
    btn.addEventListener('click', () => toggleFavorite(btn.dataset.id, btn));
  });
}

/* Favorites system */
function toggleFavorite(recipeId, btn) {
  const id = parseInt(recipeId);
  const isFavorite = favorites.includes(id);
  
  if (isFavorite) {
    favorites = favorites.filter(fId => fId !== id);
    btn.textContent = '🤍';
    btn.className = 'favorite-btn';
    btn.setAttribute('aria-label', 'Add to favorites');
  } else {
    favorites.push(id);
    btn.textContent = '❤️';
    btn.className = 'favorite-btn favorited';
    btn.setAttribute('aria-label', 'Remove from favorites');
  }
  
  localStorage.setItem('recipe-favorites', JSON.stringify(favorites));
  
  // Update favorites display if on favorites view
  if (qs('#favorites-toggle')?.classList.contains('active')) {
    showFavorites();
  }
}

/* Enhanced modal with focus trapping */
let focusableElements = [];
let firstFocusable = null;
let lastFocusable = null;

async function openRecipeModal(id) {
  const modal = qs('#modal');
  const modalBody = qs('#modal-body');
  if (!modal || !modalBody) return;

  modal.setAttribute('aria-hidden', 'false');
  modalBody.innerHTML = '<div class="loading-spinner"></div><p>Loading recipe details...</p>';
  document.body.style.overflow = 'hidden'; 

  try {
    const data = await fetchFromSpoonacular(`recipes/${id}/information`);
    modalBody.innerHTML = renderRecipeDetailHtml(data);
    setupFocusTrap();
    
    // Focus first interactive element
    const firstBtn = qs('.modal-close', modal);
    if (firstBtn) firstBtn.focus();
  } catch (e) {
    modalBody.innerHTML = `
      <div class="error-state">
        <p class="error-message">Error loading recipe: ${escapeHtml(e.message)}</p>
        <button onclick="openRecipeModal(${id})">Try Again</button>
      </div>
    `;
  }
}

function setupFocusTrap() {
  const modal = qs('#modal');
  focusableElements = qsa('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])', modal);
  firstFocusable = focusableElements[0];
  lastFocusable = focusableElements[focusableElements.length - 1];
}

function closeModal() {
  const modal = qs('#modal');
  if (modal) {
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = ''; // Restore scroll
    
    // Return focus to trigger element if possible
    const lastFocused = document.activeElement;
    if (lastFocused && lastFocused.blur) lastFocused.blur();
  }
}

function renderRecipeDetailHtml(data) {
  const ingredients = (data.extendedIngredients || []).map(i => 
    `<li><span class="ingredient">${escapeHtml(i.original)}</span></li>`
  ).join('');
  
  const instructions = data.analyzedInstructions?.[0]?.steps?.map((step, i) => 
    `<div class="instruction-step">
      <span class="step-number">${i + 1}</span>
      <span class="step-text">${escapeHtml(step.step)}</span>
    </div>`
  ).join('') || data.summary || '<em>Instructions unavailable</em>';
  
  const servings = data.servings ? `${data.servings}` : '-';
  const ready = data.readyInMinutes ? `${data.readyInMinutes} min` : '-';
  const isFavorite = favorites.includes(data.id);

  return `
    <div class="recipe-header">
      <h2>${escapeHtml(data.title || 'Recipe')}</h2>
      <button class="favorite-btn modal-favorite ${isFavorite ? 'favorited' : ''}" 
              data-id="${data.id}" 
              aria-label="${isFavorite ? 'Remove from' : 'Add to'} favorites">
        ${isFavorite ? '❤️' : '🤍'}
      </button>
    </div>
    
    <div class="recipe-content">
      <img src="${data.image || '/api/placeholder/400/300'}" alt="${escapeHtml(data.title || '')}" class="recipe-image">
      <div class="recipe-meta">
        <div class="meta-item">
          <span class="meta-label">Servings:</span>
          <span class="meta-value">${servings}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Ready in:</span>
          <span class="meta-value">${ready}</span>
        </div>
        ${data.sourceUrl ? `<div class="meta-item">
          <a href="${escapeHtml(data.sourceUrl)}" target="_blank" rel="noopener" class="source-link">
            View Original Recipe
          </a>
        </div>` : ''}
      </div>
    </div>
    
    <div class="recipe-details">
      <div class="ingredients-section">
        <h3>Ingredients</h3>
        <ul class="ingredients-list">${ingredients || '<li>No ingredients listed</li>'}</ul>
      </div>
      
      <div class="instructions-section">
        <h3>Instructions</h3>
        <div class="instructions-list">${instructions}</div>
      </div>
    </div>
  `;
}

/* Get current filters */
function getCurrentFilters() {
  return {
    cuisine: qs('#cuisine-filter')?.value || '',
    diet: qs('#diet-filter')?.value || '',
    intolerances: qs('#intolerances-filter')?.value || '',
    type: qs('#meal-type-filter')?.value || ''
  };
}

/* Clear filters */
function clearFilters() {
  qsa('.filter-select').forEach(select => select.value = '');
  performSearch();
}

/* Clear search */
function clearSearch() {
  const searchInput = qs('#search');
  if (searchInput) {
    searchInput.value = '';
    searchInput.focus();
    performSearch();
  }
}

/* Perform search with current values */
function performSearch() {
  const searchInput = qs('#search');
  const perpage = qs('#perpage');
  const query = searchInput?.value || '';
  const number = perpage?.value || 12;
  const filters = getCurrentFilters();
  
  lastSearchParams = { query, number, filters };
  searchRecipes(query, number, filters);
}

/* Show favorites */
async function showFavorites() {
  if (favorites.length === 0) {
    qs('#recipes').innerHTML = '<div class="no-favorites"><p>No favorites yet! Heart some recipes to see them here.</p></div>';
    return;
  }
  
  const loadingEl = qs('#loading');
  if (loadingEl) loadingEl.hidden = false;
  
  try {
    // Fetch details for all favorites (in batches to avoid rate limits)
    const batchSize = 5;
    const results = [];
    
    for (let i = 0; i < favorites.length; i += batchSize) {
      const batch = favorites.slice(i, i + batchSize);
      const promises = batch.map(id => 
        fetchFromSpoonacular(`recipes/${id}/information`).catch(e => null)
      );
      const batchResults = await Promise.all(promises);
      results.push(...batchResults.filter(r => r !== null));
    }
    
    renderRecipeCards(results);
  } catch (e) {
    qs('#recipes').innerHTML = `<div class="error-state"><p>Error loading favorites: ${escapeHtml(e.message)}</p></div>`;
  } finally {
    if (loadingEl) loadingEl.hidden = true;
  }
}

/* Enhanced modal and keyboard handlers */
function setupModalHandlers() {
  const modal = qs('#modal');
  if (!modal) return;
  
  modal.addEventListener('click', (ev) => {
    if (ev.target === modal) closeModal();
  });
  
  const closeBtn = qs('.modal-close', modal);
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
}

/* Keyboard event handlers */
function setupKeyboardHandlers() {
  document.addEventListener('keydown', (e) => {
    const modal = qs('#modal');
    
    // ESC to close modal
    if (e.key === 'Escape' && modal && modal.getAttribute('aria-hidden') === 'false') {
      closeModal();
      return;
    }
    
    // Tab trapping in modal
    if (e.key === 'Tab' && modal && modal.getAttribute('aria-hidden') === 'false') {
      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          lastFocusable.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          firstFocusable.focus();
          e.preventDefault();
        }
      }
    }
    
    // Enter to search
    if (e.key === 'Enter' && e.target.matches('#search, .filter-select')) {
      performSearch();
    }
  });
}

/* Contact form with better validation */
async function handleContactSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const statusEl = qs('#contact-status');
  const submitBtn = form.querySelector('button[type="submit"]');
  const name = form.name.value.trim();
  const email = form.email.value.trim();
  const message = form.message.value.trim();

  // Clear previous status
  statusEl.textContent = "";
  statusEl.className = "";

  if (!name || !email || !message) {
    statusEl.textContent = "Please fill in all fields.";
    statusEl.className = "error";
    return;
  }
  
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    statusEl.textContent = "Please enter a valid email address.";
    statusEl.className = "error";
    return;
  }

  // Show loading state
  submitBtn.disabled = true;
  submitBtn.textContent = "Sending...";
  
  // Simulate API delay
  setTimeout(() => {
    statusEl.textContent = "Message sent successfully! (Demo mode)";
    statusEl.className = "success";
    form.reset();
    submitBtn.disabled = false;
    submitBtn.textContent = "Send";
  }, 1000);
}

/* Dark mode toggle */
function toggleDarkMode() {
  document.body.classList.toggle('dark-mode');
  const isDark = document.body.classList.contains('dark-mode');
  localStorage.setItem('dark-mode', isDark);
  
  const toggle = qs('#dark-mode-toggle');
  if (toggle) {
    toggle.textContent = isDark ? '☀️' : '🌙';
    toggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
  }
}

/* Initialize dark mode from localStorage */
function initDarkMode() {
  const isDark = localStorage.getItem('dark-mode') === 'true';
  if (isDark) {
    document.body.classList.add('dark-mode');
    const toggle = qs('#dark-mode-toggle');
    if (toggle) {
      toggle.textContent = '☀️';
      toggle.setAttribute('aria-label', 'Switch to light mode');
    }
  }
}

/* Escape helper */
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, function (m) {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m];
  });
}

/* Page bootstrap */
document.addEventListener('DOMContentLoaded', () => {
  setupModalHandlers();
  setupKeyboardHandlers();
  initDarkMode();

  // Dark mode toggle
  const darkToggle = qs('#dark-mode-toggle');
  if (darkToggle) darkToggle.addEventListener('click', toggleDarkMode);

  // On recipes page
  if (qs('#recipes')) {
    const searchInput = qs('#search');
    const perpage = qs('#perpage');
    const favoritesToggle = qs('#favorites-toggle');
    const clearSearchBtn = qs('#clear-search');
    const clearFiltersBtn = qs('#clear-filters');
    
    const debouncedSearch = debounce(performSearch, 300);

    if (searchInput) {
      searchInput.addEventListener('input', debouncedSearch);
    }
    
    if (perpage) {
      perpage.addEventListener('change', performSearch);
    }

    // Filter change handlers
    qsa('.filter-select').forEach(select => {
      select.addEventListener('change', performSearch);
    });

    // Button handlers
    if (clearSearchBtn) clearSearchBtn.addEventListener('click', clearSearch);
    if (clearFiltersBtn) clearFiltersBtn.addEventListener('click', clearFilters);
    if (favoritesToggle) {
      favoritesToggle.addEventListener('click', () => {
        const isActive = favoritesToggle.classList.toggle('active');
        if (isActive) {
          showFavorites();
          favoritesToggle.textContent = 'Show All Recipes';
        } else {
          performSearch();
          favoritesToggle.textContent = `My Favorites (${favorites.length})`;
        }
      });
      favoritesToggle.textContent = `My Favorites (${favorites.length})`;
    }

    // Load initial recipes
    performSearch();
  }

  // On index page, load featured list
  if (qs('#featured-list')) {
    (async () => {
      try {
        const data = await fetchFromSpoonacular('q=&number=6');
        renderRecipeCards(data.results || []);
      } catch (e) {
        console.warn("Featured list failed:", e);
        qs('#featured-list').innerHTML = '<p class="error-message">Unable to load featured recipes.</p>';
      }
    })();
  }

  // Contact form
  const contactForm = qs('#contact-form');
  if (contactForm) contactForm.addEventListener('submit', handleContactSubmit);

  // Modal favorite button delegation
  document.addEventListener('click', (e) => {
    if (e.target.matches('.modal-favorite')) {
      const recipeId = e.target.dataset.id;
      toggleFavorite(recipeId, e.target);
    }
  });
});
