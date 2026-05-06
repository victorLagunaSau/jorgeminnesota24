#!/bin/bash
# =====================================================
# Setup script for Jorge Minnesota Scraper VPS
# Run as root on a fresh Ubuntu 22.04+ Digital Ocean droplet
# =====================================================

set -e

echo "=== Updating system ==="
apt-get update && apt-get upgrade -y

echo "=== Installing Node.js 20 ==="
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

echo "=== Installing Chromium dependencies ==="
apt-get install -y \
  wget \
  gnupg \
  ca-certificates \
  fonts-liberation \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libcups2 \
  libdbus-1-3 \
  libdrm2 \
  libgbm1 \
  libgtk-3-0 \
  libnspr4 \
  libnss3 \
  libx11-xcb1 \
  libxcomposite1 \
  libxdamage1 \
  libxrandr2 \
  xdg-utils \
  libxss1 \
  libappindicator3-1 \
  libgconf-2-4

echo "=== Creating app directory ==="
mkdir -p /opt/scraper
cp package.json server.js /opt/scraper/
cd /opt/scraper

echo "=== Installing npm dependencies ==="
npm install --production

echo "=== Creating systemd service ==="
cat > /etc/systemd/system/scraper.service << 'SERVICEEOF'
[Unit]
Description=Jorge Minnesota Vehicle Scraper
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/scraper
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5
Environment=PORT=4000
Environment=SCRAPER_API_KEY=CHANGE_ME_GENERATE_A_SECURE_KEY

[Install]
WantedBy=multi-user.target
SERVICEEOF

echo ""
echo "============================================"
echo "  SETUP COMPLETE!"
echo "============================================"
echo ""
echo "IMPORTANT — Before starting, do these two things:"
echo ""
echo "1. Generate a secure API key and set it:"
echo "   openssl rand -hex 32"
echo "   Then edit: nano /etc/systemd/system/scraper.service"
echo "   Replace CHANGE_ME_GENERATE_A_SECURE_KEY with the generated key"
echo ""
echo "2. Start the service:"
echo "   systemctl daemon-reload"
echo "   systemctl enable scraper"
echo "   systemctl start scraper"
echo ""
echo "3. Check it's running:"
echo "   systemctl status scraper"
echo "   curl http://localhost:4000/health"
echo ""
echo "4. Add the same API key to Vercel env vars:"
echo "   SCRAPER_API_KEY=<your-key>"
echo "   SCRAPER_URL=http://159.89.93.222:4000"
echo ""
echo "============================================"
