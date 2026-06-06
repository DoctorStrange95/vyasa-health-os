#!/bin/bash
# Vyasa Backend — One-command server setup
# Run as root on a fresh Ubuntu 22.04 / 24.04 VPS
# Usage: bash setup-server.sh

set -e

REPO_URL="https://github.com/DoctorStrange95/nurselink-frontend.git"
APP_DIR="/var/www/vyasa-backend"
APP_PORT=3000
DB_NAME="vyasa_db"
DB_USER="vyasa_user"
DB_PASS=$(openssl rand -base64 20 | tr -dc 'a-zA-Z0-9' | head -c 20)
JWT_SECRET=$(openssl rand -base64 32)
DOMAIN=""  # Set this if you have a domain: e.g. api.yourdomain.com

echo "======================================"
echo " Vyasa Backend Setup"
echo "======================================"

# ── 1. System packages ──────────────────────────────────────────────
echo "[1/7] Installing system packages..."
apt-get update -qq
apt-get install -y -qq curl git nginx postgresql postgresql-contrib ufw

# ── 2. Node.js 20 ───────────────────────────────────────────────────
echo "[2/7] Installing Node.js 20..."
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
echo "  Node: $(node -v) | npm: $(npm -v)"

# ── 3. PM2 (keeps app alive) ────────────────────────────────────────
echo "[3/7] Installing PM2..."
npm install -g pm2 --silent
pm2 startup systemd -u root --hp /root | tail -1 | bash || true

# ── 4. PostgreSQL ───────────────────────────────────────────────────
echo "[4/7] Setting up PostgreSQL..."
service postgresql start
sudo -u postgres psql <<SQL
CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';
CREATE DATABASE $DB_NAME OWNER $DB_USER;
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
SQL
echo "  Database: $DB_NAME | User: $DB_USER"

# ── 5. Clone & install backend ──────────────────────────────────────
echo "[5/7] Cloning backend..."
rm -rf $APP_DIR
git clone $REPO_URL /tmp/nurselink-repo
# Backend is inside nurselink_frontend-main/backend or a separate repo
# Adjust path as needed:
mkdir -p $APP_DIR
cp /tmp/nurselink-repo/backend/server.js $APP_DIR/ 2>/dev/null || \
cp /tmp/nurselink-repo/server.js $APP_DIR/ 2>/dev/null || true
cp /tmp/nurselink-repo/backend/schema.sql $APP_DIR/ 2>/dev/null || \
cp /tmp/nurselink-repo/schema.sql $APP_DIR/ 2>/dev/null || true
cp /tmp/nurselink-repo/backend/package.json $APP_DIR/ 2>/dev/null || \
cp /tmp/nurselink-repo/package.json $APP_DIR/ 2>/dev/null || true

cd $APP_DIR
npm install --production --silent

# Run schema migrations
PGPASSWORD=$DB_PASS psql -h localhost -U $DB_USER -d $DB_NAME -f schema.sql

# Write .env
cat > $APP_DIR/.env <<ENV
PORT=$APP_PORT
DATABASE_URL=postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME
JWT_SECRET=$JWT_SECRET
NODE_ENV=production
ENV

echo "  .env written"

# ── 6. Start with PM2 ───────────────────────────────────────────────
echo "[6/7] Starting app with PM2..."
cd $APP_DIR
pm2 delete vyasa-backend 2>/dev/null || true
pm2 start server.js --name vyasa-backend --env production
pm2 save
echo "  App running on port $APP_PORT"

# ── 7. Nginx reverse proxy ──────────────────────────────────────────
echo "[7/7] Configuring Nginx..."
cat > /etc/nginx/sites-available/vyasa-backend <<NGINX
server {
    listen 80;
    server_name ${DOMAIN:-_};

    location / {
        proxy_pass http://localhost:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/vyasa-backend /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && service nginx restart

# ── Firewall ────────────────────────────────────────────────────────
ufw allow ssh
ufw allow 'Nginx Full'
ufw --force enable

# ── Summary ─────────────────────────────────────────────────────────
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')

echo ""
echo "======================================"
echo " SETUP COMPLETE"
echo "======================================"
echo " API URL : http://$SERVER_IP"
if [ -n "$DOMAIN" ]; then
  echo " Domain  : http://$DOMAIN"
fi
echo " DB Name : $DB_NAME"
echo " DB User : $DB_USER"
echo " DB Pass : $DB_PASS   ← save this!"
echo " JWT     : $JWT_SECRET"
echo ""
echo " PM2 status  : pm2 status"
echo " App logs    : pm2 logs vyasa-backend"
echo " Restart app : pm2 restart vyasa-backend"
echo ""
if [ -n "$DOMAIN" ]; then
  echo " To add free SSL (HTTPS):"
  echo "   apt install certbot python3-certbot-nginx -y"
  echo "   certbot --nginx -d $DOMAIN"
fi
echo "======================================"

# ── Update frontend env ─────────────────────────────────────────────
echo ""
echo " NEXT STEP — update your frontend:"
echo "   In Vercel dashboard → Settings → Environment Variables"
echo "   VITE_API_URL = http://$SERVER_IP/api"
echo ""
