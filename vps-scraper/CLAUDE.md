# CLAUDE.md — VPS Scraper Service

This file provides context to Claude Code running on the Digital Ocean VPS for Jorge Minnesota Logistic LLC.

## What This Is

This is a **dedicated vehicle scraping microservice** that runs on a Digital Ocean VPS (159.89.93.222). It uses Puppeteer + Chromium to scrape vehicle data from auction sites (IAA/Copart) via bid.cars.

The main app is a Next.js 12 app deployed on **Vercel**. Vercel cannot run Puppeteer (serverless limits), so this VPS handles all scraping. The Vercel API route `/api/scrape-vehicle` is a proxy that forwards requests here.

## Architecture

```
Client (browser) → Vercel (/api/scrape-vehicle) → This VPS (:4000/api/scrape) → bid.cars → response
```

## Files

- `server.js` — Express server with Puppeteer scraping logic. Exposes:
  - `GET /health` — Health check (no auth)
  - `POST /api/scrape` — Vehicle search (requires `x-api-key` header)
- `package.json` — Dependencies: express, puppeteer
- `setup.sh` — System setup script (Node.js, Chromium deps, systemd service)

## Setup Steps (if not done yet)

```bash
# 1. Set terminal
export TERM=xterm

# 2. Run setup script (installs Node, Chromium deps, creates systemd service)
cd /root/scraper-setup
chmod +x setup.sh
./setup.sh

# 3. Generate a secure API key
openssl rand -hex 32
# SAVE THIS KEY — you need it for both the VPS service and Vercel env vars

# 4. Set the API key in the service file
# Edit /etc/systemd/system/scraper.service
# Replace CHANGE_ME_GENERATE_A_SECURE_KEY with the generated key

# 5. Start the service
systemctl daemon-reload
systemctl enable scraper
systemctl start scraper

# 6. Verify
curl http://localhost:4000/health
```

## After VPS is running — Vercel Config

Add these environment variables in Vercel dashboard (Settings → Environment Variables):

| Variable | Value |
|---|---|
| `SCRAPER_URL` | `http://159.89.93.222:4000` |
| `SCRAPER_API_KEY` | The key generated with `openssl rand -hex 32` |

## Service Management

```bash
systemctl status scraper      # Check status
systemctl restart scraper     # Restart
systemctl stop scraper        # Stop
journalctl -u scraper -f      # View live logs
journalctl -u scraper --since "10 min ago"  # Recent logs
```

## How the Scraper Works

1. Receives `lotNumber` + `gatePass` via POST
2. Launches 2 Puppeteer instances in parallel (IAA prefix=0, Copart prefix=1)
3. Navigates to `https://bid.cars/en/lot/{prefix}-{lotNumber}`
4. Waits for page to render (bid.cars has Cloudflare protection, needs real browser)
5. Scrapes: year, make, model, VIN, location, auction date, image URL
6. Returns first successful result (IAA prioritized over Copart)

## Security

- All scrape requests require `x-api-key` header matching `SCRAPER_API_KEY` env var
- The health endpoint `/health` is public (for monitoring)
- Port 4000 should be open in the firewall for Vercel to reach it

## Firewall (if needed)

```bash
ufw allow 22      # SSH
ufw allow 4000    # Scraper service
ufw enable
```

## Parent Project

The main codebase is a vehicle logistics system for **Jorge Minnesota Logistic LLC**. Stack: Next.js 12, React 17, Tailwind + DaisyUI, Firebase v7. Deployed on Vercel. The `/solicitar` page lets clients search and request auction vehicles — that page calls this scraper.
