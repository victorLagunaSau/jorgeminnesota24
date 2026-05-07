// Proxy to VPS scraper service
// The actual scraping runs on a dedicated Digital Ocean VPS with Puppeteer + Chromium

export const config = {
  maxDuration: 60,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { lotNumber, gatePass } = req.body;

  if (!lotNumber || !gatePass) {
    return res.status(400).json({ error: 'Lot number and gate pass are required' });
  }

  if (!/^\d+$/.test(lotNumber)) {
    return res.status(400).json({ error: 'Lot number must contain only digits' });
  }

  if (gatePass.length < 4 || gatePass.length > 5) {
    return res.status(400).json({ error: 'Gate pass must be 4-5 characters' });
  }

  const SCRAPER_URL = 'http://159.89.93.222:4000';
  const SCRAPER_API_KEY = 'db831f6fb15f35bd5ecaece924d27b482e7dde9a3dff56d86acc9000b4c24ed6';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 55000);

    const response = await fetch(`${SCRAPER_URL}/api/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': SCRAPER_API_KEY,
      },
      body: JSON.stringify({ lotNumber, gatePass }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const data = await response.json();
    return res.status(response.status).json(data);

  } catch (error) {
    console.error('Scraper proxy error:', error);
    if (error.name === 'AbortError') {
      return res.status(504).json({ error: 'La búsqueda tardó demasiado. Intenta de nuevo.' });
    }
    return res.status(503).json({ error: 'Servicio de búsqueda no disponible. Intenta más tarde.' });
  }
}
