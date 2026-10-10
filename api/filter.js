// ============================================
// /api/filter — fetch + filter + sort
// Query params:
//   filter = all | verified | keyless | key | free | paid | universal | hub | patched | unpatched | nokey
//   sort   = newest | views | rated | executes | trending | updated
//   pages  = 1-5 (default 3)
//   mode   = free | paid | all (default all)
// ============================================

const SCRIPTBLOX_API = 'https://scriptblox.com/api';
const DELAY_MS = 1200;

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Fetch 1 halaman dari ScriptBlox
async function fetchPage(page, mode = 'free') {
  const url = `${SCRIPTBLOX_API}/script/fetch?page=${page}&max=20&mode=${mode}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Accept': 'application/json'
    }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.result?.scripts || data.scripts || [];
}

// Filter logic — semua jenis
function applyFilter(list, filter) {
  switch (filter) {
    case 'verified':   return list.filter(s => s.verified);
    case 'keyless':    return list.filter(s => s.keyless || !s.key);
    case 'key':        return list.filter(s => s.key && !s.keyless);
    case 'free':       return list.filter(s => s.scriptType === 'free' || !s.scriptType);
    case 'paid':       return list.filter(s => s.scriptType === 'paid');
    case 'universal':  return list.filter(s => s.isUniversal);
    case 'hub':        return list.filter(s => s.isHub);
    case 'patched':    return list.filter(s => s.isPatched);
    case 'unpatched':  return list.filter(s => !s.isPatched);
    case 'nokey':      return list.filter(s => !s.key);
    case 'all':
    default:           return list;
  }
}

// Sort logic
function applySort(list, sort) {
  const arr = [...list];
  switch (sort) {
    case 'newest':
      return arr.sort((a, b) =>
        new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    case 'views':
      return arr.sort((a, b) => (b.views || 0) - (a.views || 0));
    case 'rated':
      return arr.sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0));
    case 'executes':
      return arr.sort((a, b) => (b.executes || 0) - (a.executes || 0));
    case 'updated':
      return arr.sort((a, b) =>
        new Date(b.lastBump || 0) - new Date(a.lastBump || 0));
    case 'trending':
    default:
      return arr;
  }
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const filter = (req.query.filter || 'all').toLowerCase();
    const sort = (req.query.sort || 'trending').toLowerCase();
    const mode = (req.query.mode || 'free').toLowerCase();
    const pageCount = Math.min(Math.max(parseInt(req.query.pages) || 3, 1), 5);

    // Fetch multiple pages
    const all = [];
    const seen = new Set();

    for (let p = 1; p <= pageCount; p++) {
      try {
        const list = await fetchPage(p, mode);
        if (!list.length) break;

        for (const s of list) {
          const id = s._id || s.slug;
          if (!seen.has(id)) {
            seen.add(id);
            all.push(s);
          }
        }
      } catch (e) {
        console.warn(`Page ${p} failed:`, e.message);
        break;
      }

      if (p < pageCount) await sleep(DELAY_MS);
    }

    // Apply filter
    let list = applyFilter(all, filter);

    // Apply sort
    list = applySort(list, sort);

    return res.status(200).json({
      result: {
        totalPages: 1,
        nextPage: null,
        max: list.length,
        filter,
        sort,
        mode,
        totalFetched: all.length,
        afterFilter: list.length,
        scripts: list
      }
    });
  } catch (e) {
    console.error('filter.js error:', e);
    return res.status(500).json({
      error: 'Failed to fetch filtered scripts',
      message: e.message
    });
  }
}
