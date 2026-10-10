// ============================================
// /api/views — sort by views desc
// ============================================

const SCRIPTBLOX_API = 'https://scriptblox.com/api';
const MAX_PAGES = 3;
const DELAY_MS = 1200;

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchPage(page) {
  const url = `${SCRIPTBLOX_API}/script/fetch?page=${page}&max=20&mode=free`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.result?.scripts || data.scripts || [];
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const pageCount = Math.min(parseInt(req.query.pages) || MAX_PAGES, 10);
    const all = [];
    const seen = new Set();

    for (let p = 1; p <= pageCount; p++) {
      try {
        const list = await fetchPage(p);
        if (!list.length) break;
        for (const s of list) {
          const id = s._id || s.slug;
          if (!seen.has(id)) { seen.add(id); all.push(s); }
        }
      } catch (e) {
        console.warn(`Page ${p} failed:`, e.message);
        break;
      }
      if (p < pageCount) await sleep(DELAY_MS);
    }

    // Sort by views desc
    all.sort((a, b) => (b.views || 0) - (a.views || 0));

    return res.status(200).json({
      result: { totalPages: 1, nextPage: null, max: all.length, scripts: all }
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
