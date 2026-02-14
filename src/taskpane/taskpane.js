import "./taskpane.css";
import FreepikAPI from "../api/freepik.js";
import {
  addFavorite,
  removeFavorite,
  getFavorites,
  isFavorite,
  addToHistory,
  getHistory,
  clearHistory,
  saveApiKey,
  getApiKey,
  saveDefaultFormat,
  getDefaultFormat,
  saveDefaultSize,
  getDefaultSize,
  saveDefaultAiStyle,
  getDefaultAiStyle,
} from "../utils/storage.js";
import {
  initializeOffice,
  insertImageFromUrl,
  insertImageToSlide,
  getBase64FromUrl,
} from "../utils/office.js";

/* global Office */

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let api = null;
let searchState = {
  term: "",
  page: 1,
  lastPage: 1,
  results: [],
};
let aiGeneratedUrl = null;
let searchDebounceTimer = null;

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------
let officeReady = false;

async function init() {
  try {
    await initializeOffice();
    officeReady = true;
  } catch (err) {
    console.warn("Office initialization issue:", err.message);
    // Still show the app — the user is clearly inside PowerPoint if they see the pane.
    // Image insertion may not work but they can still browse/search.
    officeReady = false;
  }

  // Load API key
  const key = getApiKey();
  if (key) {
    api = new FreepikAPI(key);
  }

  // Load saved preferences into UI
  loadPreferences();

  // Bind events
  bindTabs();
  bindSearch();
  bindAIGenerate();
  bindFavorites();
  bindHistory();
  bindSettings();

  // Show settings if no API key
  if (!key) {
    switchTab("settings");
    showToast("Please enter your Freepik API key in Settings to get started.", "info");
  }

  if (!officeReady) {
    showToast("Office connection pending. Insert may retry automatically.", "info", 5000);
  }
}

init();

// ---------------------------------------------------------------------------
// Tab Navigation
// ---------------------------------------------------------------------------
function bindTabs() {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      switchTab(btn.dataset.tab);
    });
  });
}

function switchTab(tabId) {
  // Update tab buttons
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    const isActive = btn.dataset.tab === tabId;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-selected", isActive);
  });

  // Update tab panels
  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.style.display = panel.id === `tab-${tabId}` ? "" : "none";
  });

  // Refresh data when switching to certain tabs
  if (tabId === "favorites") renderFavorites();
  if (tabId === "history") renderHistory();
}

// ---------------------------------------------------------------------------
// Toast Notifications
// ---------------------------------------------------------------------------
function showToast(message, type = "info", duration = 3000) {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("toast-out");
    toast.addEventListener("animationend", () => toast.remove());
  }, duration);
}

// ---------------------------------------------------------------------------
// Search Tab
// ---------------------------------------------------------------------------
function bindSearch() {
  const input = document.getElementById("search-input");
  const orderSelect = document.getElementById("filter-order");
  const formatSelect = document.getElementById("search-format");
  const pngSizeSelect = document.getElementById("search-png-size");
  const prevBtn = document.getElementById("page-prev");
  const nextBtn = document.getElementById("page-next");
  const retryBtn = document.getElementById("search-retry-btn");

  // Debounced search on input
  input.addEventListener("input", () => {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      if (input.value.trim()) {
        searchState.page = 1;
        performSearch();
      }
    }, 400);
  });

  // Search on Enter
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && input.value.trim()) {
      clearTimeout(searchDebounceTimer);
      searchState.page = 1;
      performSearch();
    }
  });

  // Rerun search when filters change
  orderSelect.addEventListener("change", () => {
    if (searchState.term) {
      searchState.page = 1;
      performSearch();
    }
  });

  // Show/hide PNG size selector based on format
  formatSelect.addEventListener("change", () => {
    pngSizeSelect.style.display = formatSelect.value === "png" ? "" : "none";
  });

  // Pagination
  prevBtn.addEventListener("click", () => {
    if (searchState.page > 1) {
      searchState.page--;
      performSearch();
    }
  });

  nextBtn.addEventListener("click", () => {
    if (searchState.page < searchState.lastPage) {
      searchState.page++;
      performSearch();
    }
  });

  retryBtn.addEventListener("click", performSearch);
}

async function performSearch() {
  if (!ensureApiKey()) return;

  const term = document.getElementById("search-input").value.trim();
  if (!term) return;

  searchState.term = term;

  const order = document.getElementById("filter-order").value;

  // Show loading, hide others
  showSearchState("loading");

  try {
    const result = await api.searchIcons(term, {
      page: searchState.page,
      per_page: 18,
      order,
    });

    const data = result.data || [];
    const meta = result.meta?.pagination || {};

    searchState.results = data;
    searchState.lastPage = meta.last_page || 1;

    if (data.length === 0) {
      showSearchState("empty");
    } else {
      showSearchState("results");
      renderSearchResults(data);
      updatePagination(meta);
    }
  } catch (err) {
    showSearchError(err.message);
  }
}

function showSearchState(state) {
  document.getElementById("search-loading").style.display = state === "loading" ? "" : "none";
  document.getElementById("search-empty").style.display = state === "empty" ? "" : "none";
  document.getElementById("search-error").style.display = state === "error" ? "" : "none";
  document.getElementById("search-results").style.display = state === "results" ? "" : "none";
  document.getElementById("search-pagination").style.display = state === "results" ? "" : "none";
}

function showSearchError(msg) {
  showSearchState("error");
  document.getElementById("search-error-msg").textContent = msg;
}

function renderSearchResults(icons) {
  const grid = document.getElementById("search-results");
  grid.innerHTML = "";

  icons.forEach((icon) => {
    const card = createIconCard(icon, {
      showFavorite: true,
      showInsert: true,
      onInsert: () => handleInsertIcon(icon),
    });
    grid.appendChild(card);
  });
}

function updatePagination(meta) {
  const pageInfo = document.getElementById("page-info");
  const prevBtn = document.getElementById("page-prev");
  const nextBtn = document.getElementById("page-next");

  const current = meta.current_page || searchState.page;
  const last = meta.last_page || 1;

  pageInfo.textContent = `Page ${current} of ${last}`;
  prevBtn.disabled = current <= 1;
  nextBtn.disabled = current >= last;
}

// ---------------------------------------------------------------------------
// Icon Card Component
// ---------------------------------------------------------------------------
function createIconCard(icon, options = {}) {
  const card = document.createElement("div");
  card.className = "icon-card";
  card.title = icon.name || "";

  // Thumbnail
  const thumb = document.createElement("img");
  thumb.className = "icon-card-thumb";
  const thumbUrl = icon.thumbnails?.[0]?.url || "";
  thumb.src = thumbUrl;
  thumb.alt = icon.name || "icon";
  thumb.loading = "lazy";
  card.appendChild(thumb);

  // Name
  const name = document.createElement("span");
  name.className = "icon-card-name";
  name.textContent = icon.name || "";
  card.appendChild(name);

  // Timestamp for history
  if (icon.timestamp) {
    const time = document.createElement("span");
    time.className = "icon-card-time";
    time.textContent = formatTime(icon.timestamp);
    card.appendChild(time);
  }

  // Favorite button
  if (options.showFavorite !== false) {
    const favBtn = document.createElement("button");
    favBtn.className = `icon-card-fav${isFavorite(icon.id) ? " is-fav" : ""}`;
    favBtn.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="${isFavorite(icon.id) ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
    favBtn.title = isFavorite(icon.id) ? "Remove from favorites" : "Add to favorites";
    favBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleFavorite(icon, favBtn);
    });
    card.appendChild(favBtn);
  }

  // Insert button
  if (options.showInsert !== false) {
    const insertBtn = document.createElement("button");
    insertBtn.className = "icon-card-insert";
    insertBtn.innerHTML = "+";
    insertBtn.title = "Insert into slide";
    insertBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (options.onInsert) options.onInsert();
    });
    card.appendChild(insertBtn);
  }

  // Click on card = insert
  card.addEventListener("click", () => {
    if (options.onInsert) options.onInsert();
  });

  return card;
}

function toggleFavorite(icon, btn) {
  if (isFavorite(icon.id)) {
    removeFavorite(icon.id);
    btn.classList.remove("is-fav");
    btn.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
    btn.title = "Add to favorites";
    showToast("Removed from favorites", "info");
  } else {
    addFavorite(icon);
    btn.classList.add("is-fav");
    btn.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
    btn.title = "Remove from favorites";
    showToast("Added to favorites", "success");
  }
}

// ---------------------------------------------------------------------------
// Insert Icon into Slide
// ---------------------------------------------------------------------------
async function handleInsertIcon(icon) {
  if (!ensureApiKey()) return;

  const format = document.getElementById("search-format").value;
  const pngSize = parseInt(document.getElementById("search-png-size").value, 10);

  showToast("Downloading icon...", "info", 2000);

  try {
    const downloadResult = await api.downloadIcon(icon.id, format, format === "png" ? pngSize : undefined);

    if (!downloadResult.url) {
      throw new Error("No download URL returned from API.");
    }

    await insertImageFromUrl(downloadResult.url);
    addToHistory(icon);
    showToast("Icon inserted!", "success");
  } catch (err) {
    showToast(`Failed to insert: ${err.message}`, "error", 5000);
  }
}

// ---------------------------------------------------------------------------
// AI Generate Tab
// ---------------------------------------------------------------------------
function bindAIGenerate() {
  const generateBtn = document.getElementById("ai-generate-btn");
  const insertBtn = document.getElementById("ai-insert-btn");

  generateBtn.addEventListener("click", handleAIGenerate);
  insertBtn.addEventListener("click", handleAIInsert);
}

async function handleAIGenerate() {
  if (!ensureApiKey()) return;

  const prompt = document.getElementById("ai-prompt").value.trim();
  if (!prompt) {
    showToast("Please describe the icon you want.", "error");
    return;
  }

  const style = document.querySelector('input[name="ai-style"]:checked')?.value || "solid";
  const format = document.querySelector('input[name="ai-format"]:checked')?.value || "png";

  // Show loading
  document.getElementById("ai-loading").style.display = "";
  document.getElementById("ai-preview").style.display = "none";
  document.getElementById("ai-generate-btn").disabled = true;
  document.getElementById("ai-status-text").textContent = "Generating your icon...";

  try {
    const result = await api.generateIcon(prompt, { style, format });

    // The API returns a task_id for asynchronous generation
    const taskId = result.task_id || result.data?.task_id;
    if (!taskId) {
      throw new Error("Unexpected API response: no task ID returned.");
    }

    // Poll for completion
    document.getElementById("ai-status-text").textContent = "Processing... this may take a moment.";
    const completed = await api.pollGenerationStatus(taskId);

    if (completed.icon_url) {
      aiGeneratedUrl = completed.icon_url;
      showAIPreview(aiGeneratedUrl);
    } else if (completed.data?.generated && completed.data.generated.length > 0) {
      // Fallback for alternative response format
      aiGeneratedUrl = completed.data.generated[0];
      showAIPreview(aiGeneratedUrl);
    } else {
      throw new Error("Generation completed but no icon was returned.");
    }
  } catch (err) {
    document.getElementById("ai-loading").style.display = "none";
    showToast(`AI Generation failed: ${err.message}`, "error", 5000);
  } finally {
    document.getElementById("ai-generate-btn").disabled = false;
  }
}

function showAIPreview(url) {
  document.getElementById("ai-loading").style.display = "none";
  document.getElementById("ai-preview").style.display = "";
  document.getElementById("ai-preview-img").src = url;
}

async function handleAIInsert() {
  if (!aiGeneratedUrl) {
    showToast("No generated icon to insert.", "error");
    return;
  }

  showToast("Inserting generated icon...", "info", 2000);

  try {
    await insertImageFromUrl(aiGeneratedUrl);
    showToast("AI icon inserted!", "success");
  } catch (err) {
    showToast(`Failed to insert: ${err.message}`, "error", 5000);
  }
}

// ---------------------------------------------------------------------------
// Favorites Tab
// ---------------------------------------------------------------------------
function bindFavorites() {
  // Favorites render on tab switch
}

function renderFavorites() {
  const grid = document.getElementById("favorites-grid");
  const emptyState = document.getElementById("favorites-empty");
  const favorites = getFavorites();

  grid.innerHTML = "";

  if (favorites.length === 0) {
    emptyState.style.display = "";
    grid.style.display = "none";
    return;
  }

  emptyState.style.display = "none";
  grid.style.display = "";

  favorites.forEach((icon) => {
    const card = createIconCard(icon, {
      showFavorite: true,
      showInsert: true,
      onInsert: () => handleInsertIcon(icon),
    });
    grid.appendChild(card);
  });
}

// ---------------------------------------------------------------------------
// History Tab
// ---------------------------------------------------------------------------
function bindHistory() {
  document.getElementById("clear-history-btn").addEventListener("click", () => {
    clearHistory();
    renderHistory();
    showToast("History cleared", "info");
  });
}

function renderHistory() {
  const grid = document.getElementById("history-list");
  const emptyState = document.getElementById("history-empty");
  const clearBtn = document.getElementById("clear-history-btn");
  const history = getHistory();

  grid.innerHTML = "";

  if (history.length === 0) {
    emptyState.style.display = "";
    grid.style.display = "none";
    clearBtn.style.display = "none";
    return;
  }

  emptyState.style.display = "none";
  grid.style.display = "";
  clearBtn.style.display = "";

  history.forEach((icon) => {
    const card = createIconCard(icon, {
      showFavorite: true,
      showInsert: true,
      onInsert: () => handleInsertIcon(icon),
    });
    grid.appendChild(card);
  });
}

// ---------------------------------------------------------------------------
// Settings Tab
// ---------------------------------------------------------------------------
function bindSettings() {
  const saveKeyBtn = document.getElementById("save-api-key-btn");
  const testKeyBtn = document.getElementById("test-api-key-btn");
  const savePrefsBtn = document.getElementById("save-prefs-btn");
  const keyInput = document.getElementById("settings-api-key");

  // Load existing key
  keyInput.value = getApiKey();

  saveKeyBtn.addEventListener("click", () => {
    const key = keyInput.value.trim();
    if (!key) {
      showStatus("Please enter an API key.", "error");
      return;
    }
    saveApiKey(key);
    api = new FreepikAPI(key);
    showStatus("API key saved!", "success");
    showToast("API key saved", "success");
  });

  testKeyBtn.addEventListener("click", async () => {
    const key = keyInput.value.trim();
    if (!key) {
      showStatus("Please enter an API key first.", "error");
      return;
    }

    showStatus("Testing connection...", "info");
    const testApi = new FreepikAPI(key);

    try {
      await testApi.searchIcons("test", { per_page: 1 });
      showStatus("Connection successful!", "success");
    } catch (err) {
      showStatus(`Connection failed: ${err.message}`, "error");
    }
  });

  savePrefsBtn.addEventListener("click", () => {
    saveDefaultFormat(document.getElementById("default-format").value);
    saveDefaultSize(parseInt(document.getElementById("default-png-size").value, 10));
    saveDefaultAiStyle(document.getElementById("default-ai-style").value);
    showToast("Preferences saved", "success");

    // Apply to search dropdowns
    applyPreferencesToUI();
  });
}

function showStatus(message, type) {
  const el = document.getElementById("api-key-status");
  el.style.display = "";
  el.textContent = message;
  el.className = `status-indicator ${type}`;
}

function loadPreferences() {
  // Load into settings dropdowns
  const format = getDefaultFormat();
  const size = getDefaultSize();
  const aiStyle = getDefaultAiStyle();

  setSelectValue("default-format", format);
  setSelectValue("default-png-size", String(size));
  setSelectValue("default-ai-style", aiStyle);

  // Apply to search dropdowns
  applyPreferencesToUI();
}

function applyPreferencesToUI() {
  const format = getDefaultFormat();
  const size = getDefaultSize();
  const aiStyle = getDefaultAiStyle();

  setSelectValue("search-format", format);
  setSelectValue("search-png-size", String(size));

  // Set AI style radio
  const radio = document.querySelector(`input[name="ai-style"][value="${aiStyle}"]`);
  if (radio) radio.checked = true;

  // Show/hide PNG size selector
  const pngSizeSelect = document.getElementById("search-png-size");
  if (pngSizeSelect) {
    pngSizeSelect.style.display = format === "png" ? "" : "none";
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function ensureApiKey() {
  if (!api) {
    showToast("Please set your API key in Settings first.", "error");
    switchTab("settings");
    return false;
  }
  return true;
}

function setSelectValue(selectId, value) {
  const el = document.getElementById(selectId);
  if (el) {
    const option = el.querySelector(`option[value="${value}"]`);
    if (option) el.value = value;
  }
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}
