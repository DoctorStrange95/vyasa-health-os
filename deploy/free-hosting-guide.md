# Vyasa Hosting Guide

## Option A — 100% Free (Recommended to start)

### Stack
| What | Where | Cost |
|------|-------|------|
| Frontend | Vercel | Free |
| Backend (Node.js) | Railway | Free ($5/mo credit) |
| Database (PostgreSQL) | Neon | Free forever |

### Steps (30 minutes)

#### 1. Database — Neon (free, never sleeps)
1. Go to neon.tech → Sign up free
2. Create project → name it "vyasa"
3. Copy the connection string: `postgresql://user:pass@host/vyasa`

#### 2. Backend — Railway
1. Go to railway.app → Login with GitHub
2. New Project → Deploy from GitHub repo (push your backend first)
3. Add environment variables:
   - `DATABASE_URL` = paste Neon connection string
   - `JWT_SECRET` = any long random string
   - `PORT` = 3000
4. Railway gives you a URL like `https://vyasa-backend.up.railway.app`

#### 3. Frontend — Vercel
1. Push the `/vyasa` frontend folder to GitHub
2. Go to vercel.com → Import the repo
3. Add env variable: `VITE_API_URL=https://your-railway-url/api`
4. Deploy

---

## Option B — Your Own Server (VPS)

### Requirements
- Ubuntu 22.04 or 24.04 VPS
- Minimum: 1 CPU, 1GB RAM (₹200-400/month on Hostinger/DigitalOcean)
- SSH access

### Providers (cheapest)
| Provider | Price | Notes |
|----------|-------|-------|
| **Hostinger VPS** | ₹149/mo | Cheapest, good for India |
| **DigitalOcean** | $4/mo | Reliable, easy |
| **AWS Lightsail** | $3.50/mo | Amazon infra |
| **Hetzner** | €3.29/mo | Best value in Europe |
| **Oracle Cloud** | Free forever | 2 free VMs (ARM), takes setup |

### One-command setup
```bash
# SSH into your server, then run:
curl -sL https://raw.githubusercontent.com/your-repo/main/deploy/setup-server.sh | bash
```

Or manually:
```bash
# Upload the script
scp deploy/setup-server.sh root@YOUR_SERVER_IP:/root/
# SSH in and run
ssh root@YOUR_SERVER_IP
bash setup-server.sh
```

The script installs everything: Node.js 20, PostgreSQL, PM2, Nginx.

### After setup
- API runs at: `http://YOUR_SERVER_IP/api`
- Add free SSL: `certbot --nginx -d api.yourdomain.com`
- Update Vercel env: `VITE_API_URL=https://api.yourdomain.com/api`

---

## Option C — Completely Free Forever (Oracle Cloud)

Oracle gives 2 ARM VMs free permanently:
1. Sign up at cloud.oracle.com (needs credit card for verification, never charged)
2. Create a free ARM instance (Ubuntu 22.04)
3. SSH in and run the setup script above

This is the only option that's truly free with no monthly limits.
