import puppeteer from 'puppeteer';

async function scrapeSingleSource(lotNumber, prefix, sourceName, gatePass) {
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: 'shell',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        '--window-size=1920,1080'
      ]
    });

    const page = await browser.newPage();

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    await page.setViewport({ width: 1920, height: 1080 });

    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });
    });

    const url = `https://bid.cars/en/lot/${prefix}-${lotNumber}`;
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));
    await page.waitForSelector('body', { timeout: 10000 });

    const pageText = await page.evaluate(() => document.body.innerText.toLowerCase());
    if (pageText.includes('not found') || pageText.includes('404') || pageText.includes('does not exist')) {
      await browser.close();
      return null;
    }

    const vehicleInfo = await page.evaluate(() => {
      const bodyText = document.body.innerText || document.body.textContent || '';

      let make = '';
      let model = '';
      let year = '';
      let vin = '';
      let location = '';
      let imageUrl = '';
      let auctionDate = '';

      // Estrategia 1: Buscar patrón específico
      const vehiclePatternMatch = bodyText.match(/(\d{4})\s+(Chevrolet|Ford|Toyota|Honda|Nissan|BMW|Mercedes|Audi|Volkswagen|Hyundai|Kia|Mazda|Subaru|Lexus|Jeep|Ram|GMC|Cadillac|Dodge|Chrysler|Buick|Lincoln|Acura|Infiniti|Volvo|Porsche|Tesla|Land Rover|Jaguar|Mini|Mitsubishi|Suzuki|Genesis|Alfa Romeo|Bentley|Maserati|Fiat|Smart)\s+([A-Za-z0-9\s\-\/]+?)(?=\s+[A-HJ-NPR-Z0-9]{17}|\n|$)/i);

      if (vehiclePatternMatch) {
        year = vehiclePatternMatch[1];
        make = vehiclePatternMatch[2];
        model = vehiclePatternMatch[3].trim();
      }

      // Estrategia 1.5: Buscar en títulos
      if (!year || !make || !model) {
        const titles = Array.from(document.querySelectorAll('h1, h2, h3, [class*="title"], [class*="vehicle"], [class*="lot"]'));
        for (const title of titles) {
          const titleText = title.textContent?.trim() || '';
          const match = titleText.match(/(\d{4})\s+([A-Za-z\-]+)\s+([A-Za-z0-9\s\-\/]+)/);
          if (match) {
            if (!year) year = match[1];
            if (!make) make = match[2];
            if (!model) model = match[3].trim();
            break;
          }
        }
      }

      // Estrategia 2: Buscar líneas con YEAR MAKE MODEL
      if (!year || !make || !model) {
        const lines = bodyText.split('\n');
        for (const line of lines) {
          if (line.length < 10 || line.length > 200) continue;
          const match = line.match(/(\d{4})\s+([A-Z][A-Za-z\-]+)\s+([A-Z][A-Za-z0-9\s\-\/]+)/);
          if (match) {
            if (!year) year = match[1];
            if (!make) make = match[2];
            if (!model) model = match[3].trim();
            break;
          }
        }
      }

      // Buscar VIN
      let vinMatch = bodyText.match(/VIN[:\s]*([A-HJ-NPR-Z0-9]{17})/i);
      if (vinMatch) {
        vin = vinMatch[1];
      }
      if (!vin) {
        vinMatch = bodyText.match(/\b([A-HJ-NPR-Z0-9]{17})\b/);
        if (vinMatch) vin = vinMatch[1];
      }

      // Buscar Location
      const locationMatch = bodyText.match(/Location[:\s]*([^\n]+)/i);
      if (locationMatch) {
        location = locationMatch[1].trim();
      }

      // Buscar fecha de subasta
      const auctionDateMatch = bodyText.match(/Auction\s+ended\s+on\s+([^.]+)/i);
      if (auctionDateMatch) {
        auctionDate = auctionDateMatch[1].trim();
      }
      if (!auctionDate) {
        const datePatternMatch = bodyText.match(/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}/i);
        if (datePatternMatch) {
          auctionDate = datePatternMatch[0];
        }
      }

      // Buscar imagen
      const images = Array.from(document.querySelectorAll('img'));
      for (const img of images) {
        const src = img.src || img.getAttribute('src') || '';
        const alt = img.alt?.toLowerCase() || '';
        const className = img.className?.toLowerCase() || '';

        if (src &&
            !src.includes('logo') &&
            !src.includes('icon') &&
            !className.includes('logo') &&
            !className.includes('icon') &&
            (img.width > 200 || img.naturalWidth > 200 || alt.includes('vehicle') || alt.includes('car'))) {
          imageUrl = src;
          break;
        }
      }

      if (!imageUrl) {
        for (const img of images) {
          const src = img.src || img.getAttribute('src') || '';
          if (src && (img.width > 200 || img.naturalWidth > 200)) {
            imageUrl = src;
            break;
          }
        }
      }

      return { make, model, year, vin, location, imageUrl, auctionDate };
    });

    await browser.close();

    if (!vehicleInfo.make && !vehicleInfo.model && !vehicleInfo.year && !vehicleInfo.vin) {
      return null;
    }

    return {
      ...vehicleInfo,
      lotNumber,
      source: sourceName,
      gatePass,
      auctionDate: vehicleInfo.auctionDate || '',
    };

  } catch (error) {
    if (browser) {
      await browser.close();
    }
    return null;
  }
}

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

  try {
    // Buscar en ambas fuentes en paralelo
    const [iaa, copart] = await Promise.all([
      scrapeSingleSource(lotNumber, '0', 'IAA', gatePass.toUpperCase()),
      scrapeSingleSource(lotNumber, '1', 'Copart', gatePass.toUpperCase()),
    ]);

    // Priorizar IAA, si no hay resultado usar Copart
    const result = iaa || copart;

    if (!result) {
      return res.status(404).json({ error: 'Vehicle not found in IAA or Copart' });
    }

    return res.status(200).json({ vehicle: result, sources: { iaa: !!iaa, copart: !!copart } });

  } catch (error) {
    console.error('Scraping error:', error);
    return res.status(500).json({ error: 'Error searching for vehicle' });
  }
}
