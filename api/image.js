module.exports = async function handler(req, res) {
    const url = req.query.url;
    if (!url) return res.status(400).send('Missing url');
    
    try {
        const target = url.startsWith('http') ? url : `https://scriptblox.com${url}`;
        const r = await fetch(target, {
            headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://scriptblox.com/' }
        });
        
        if (!r.ok) return res.status(r.status).send('Failed');
        
        const buffer = await r.arrayBuffer();
        const contentType = r.headers.get('content-type') || 'image/png';
        
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.status(200).send(Buffer.from(buffer));
    } catch (e) {
        res.status(500).send('Error');
    }
};
