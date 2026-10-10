// ============================================
// newest.js — Client-side "Newest" sort helper
// ============================================
// Karena proxy ScriptBlox abaikan parameter sortBy,
// kita fetch dari /api/fetch dan sort di client.
// ============================================

const API = 'https://scriptblox-proxy-pzq8.vercel.app';

// Rate limit: 1 request/detik. Delay antar request.
const sleep = ms => new Promise(r => setTimeout(r, ms));
let lastReq = 0;

async function rateLimitedFetch(url, signal) {
  const wait = 1200 - (Date.now() - lastReq);
  if (wait > 0) await sleep(wait);
  lastReq = Date.now();

  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 10000);
  if (signal) signal.addEventListener('abort', () => ac.abort());

  try {
    const res = await fetch(url, { signal: ac.signal });
    if (res.status === 429) {
      await sleep(5000);
      throw new Error('Rate limited');
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(to);
  }
}

// ============================================
// Fetch 1 halaman, return array script
// ============================================
async function fetchPage(page, signal) {
  const url = `${API}/api/fetch?page=${page}&mode=free`;
  const data = await rateLimitedFetch(url, signal);
  const r = data.result || data;
  return r.scripts || [];
}

// ============================================
// Fetch multiple pages, deduplicate
// ============================================
async function fetchMultiplePages(pageCount = 3, signal) {
  const all = [];
  const seen = new Set();

  for (let p = 1; p <= pageCount; p++) {
    if (signal && signal.aborted) throw new Error('cancelled');
    try {
      const list = await fetchPage(p, signal);
      if (!list.length) break; // no more data

      for (const s of list) {
        const id = s._id || s.slug;
        if (!seen.has(id)) {
          seen.add(id);
          all.push(s);
        }
      }
    } catch (e) {
      if (e.name === 'AbortError') throw e;
      // Partial results better than nothing
      console.warn(`newest.js: page ${p} failed`, e.message);
      break;
    }
  }

  return all;
}

// ============================================
// Sort by createdAt descending (newest first)
// ============================================
function sortByNewest(scripts) {
  return [...scripts].sort((a, b) => {
    const da = new Date(a.createdAt || 0).getTime();
    const db = new Date(b.createdAt || 0).getTime();
    return db - da;
  });
}

// ============================================
// MAIN: getNewestScripts
// ============================================
// @param {number} pageCount — berapa halaman di-fetch (default 3 = 60 script)
// @param {AbortSignal} signal — buat cancel
// @returns {Promise<Array>} — script yang udah di-sort newest
// ============================================
export async function getNewestScripts(pageCount = 3, signal) {
  const all = await fetchMultiplePages(pageCount, signal);
  return sortByNewest(all);
}

// ============================================
// Helper: filter + sort sekaligus
// ============================================
export async function getNewestFiltered(filter = 'all', pageCount = 3, signal) {
  const all = await fetchMultiplePages(pageCount, signal);

  let list = all;

  // Filter
  if (filter === 'nokey') list = list.filter(x => !x.key);
  if (filter === 'verified') list = list.filter(x => x.verified);
  if (filter === 'universal') list = list.filter(x => x.isUniversal);

  // Sort
  return sortByNewest(list);
}
