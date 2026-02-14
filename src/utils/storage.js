const PREFIX = 'freepik-icons-';
const KEYS = {
  favorites: `${PREFIX}favorites`,
  history: `${PREFIX}history`,
  apiKey: `${PREFIX}api-key`,
  defaultFormat: `${PREFIX}default-format`,
  defaultSize: `${PREFIX}default-size`,
  defaultAiStyle: `${PREFIX}default-ai-style`,
};

const MAX_HISTORY = 100;

function getJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('localStorage write failed:', e);
  }
}

// --- Favorites ---

export function addFavorite(icon) {
  try {
    const favorites = getFavorites();
    if (favorites.some((f) => f.id === icon.id)) return;
    const saved = {
      id: icon.id,
      name: icon.name,
      slug: icon.slug,
      thumbnails: icon.thumbnails,
      style: icon.style,
      family: icon.family,
      tags: icon.tags,
    };
    favorites.push(saved);
    setJSON(KEYS.favorites, favorites);
  } catch (e) {
    console.error('addFavorite failed:', e);
  }
}

export function removeFavorite(id) {
  try {
    const favorites = getFavorites().filter((f) => f.id !== id);
    setJSON(KEYS.favorites, favorites);
  } catch (e) {
    console.error('removeFavorite failed:', e);
  }
}

export function getFavorites() {
  return getJSON(KEYS.favorites, []);
}

export function isFavorite(id) {
  return getFavorites().some((f) => f.id === id);
}

export function clearFavorites() {
  try {
    localStorage.removeItem(KEYS.favorites);
  } catch (e) {
    console.error('clearFavorites failed:', e);
  }
}

// --- History ---

export function addToHistory(icon) {
  try {
    const history = getHistory();
    const entry = {
      id: icon.id,
      name: icon.name,
      slug: icon.slug,
      thumbnails: icon.thumbnails,
      style: icon.style,
      family: icon.family,
      tags: icon.tags,
      timestamp: Date.now(),
    };
    // Remove duplicate if already in history
    const filtered = history.filter((h) => h.id !== icon.id);
    filtered.unshift(entry);
    // FIFO eviction at max capacity
    if (filtered.length > MAX_HISTORY) {
      filtered.length = MAX_HISTORY;
    }
    setJSON(KEYS.history, filtered);
  } catch (e) {
    console.error('addToHistory failed:', e);
  }
}

export function getHistory() {
  return getJSON(KEYS.history, []);
}

export function clearHistory() {
  try {
    localStorage.removeItem(KEYS.history);
  } catch (e) {
    console.error('clearHistory failed:', e);
  }
}

// --- Settings ---

export function saveApiKey(key) {
  try {
    localStorage.setItem(KEYS.apiKey, key);
  } catch (e) {
    console.error('saveApiKey failed:', e);
  }
}

export function getApiKey() {
  try {
    return localStorage.getItem(KEYS.apiKey) || '';
  } catch {
    return '';
  }
}

export function saveDefaultFormat(format) {
  try {
    localStorage.setItem(KEYS.defaultFormat, format);
  } catch (e) {
    console.error('saveDefaultFormat failed:', e);
  }
}

export function getDefaultFormat() {
  try {
    return localStorage.getItem(KEYS.defaultFormat) || 'png';
  } catch {
    return 'png';
  }
}

export function saveDefaultSize(size) {
  try {
    localStorage.setItem(KEYS.defaultSize, String(size));
  } catch (e) {
    console.error('saveDefaultSize failed:', e);
  }
}

export function getDefaultSize() {
  try {
    const val = localStorage.getItem(KEYS.defaultSize);
    return val ? Number(val) : 128;
  } catch {
    return 128;
  }
}

export function saveDefaultAiStyle(style) {
  try {
    localStorage.setItem(KEYS.defaultAiStyle, style);
  } catch (e) {
    console.error('saveDefaultAiStyle failed:', e);
  }
}

export function getDefaultAiStyle() {
  try {
    return localStorage.getItem(KEYS.defaultAiStyle) || 'solid';
  } catch {
    return 'solid';
  }
}
