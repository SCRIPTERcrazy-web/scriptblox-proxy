// api/script.js
module.exports = async function handler(req, res) {
    const rawSlug = req.query.slug;
    if (!rawSlug) return res.status(400).json({ error: 'Missing slug' });
    const slug = decodeURIComponent(Array.isArray(rawSlug) ? rawSlug[0] : rawSlug);

    // Set CORS biar aman
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const apiUrl = `https://scriptblox.com/api/script/${encodeURIComponent(slug)}`;
        const apiRes = await fetch(apiUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; NexScriptProxy/1.0)',
                'Accept': 'application/json',
                'Referer': 'https://scriptblox.com/'
            }
        });

        if (!apiRes.ok) {
            return res.status(apiRes.status).json({ error: `Upstream returned ${apiRes.status}` });
        }

        const data = await apiRes.json();

        // Cache di Vercel biar nggak nembak ScriptBlox terus-terusan
        res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600');
        return res.status(200).json(data);
        
    } catch (e) {
        console.error('[proxy/script] Error:', e.message);
        return res.status(500).json({ error: 'Upstream fetch failed', detail: e.message });
    }
};
