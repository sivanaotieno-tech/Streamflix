# Streamivio live-server deployment (no Docker)

Deploy Streamivio directly on a Linux VPS with Node.js and npm.

## Requirements
- Linux server with SSH access
- Node.js 24 and npm
- Git
- DNS pointed at the server; HTTPS reverse proxy (Caddy or Nginx) recommended

## Website setup
1. Clone the repo: `git clone https://github.com/sivanaotieno-tech/Streamflix.git && cd Streamflix`
2. Install dependencies: `npm ci`
3. Create `.env.local` and configure any required secrets/settings. Do not commit secrets.
4. Build: `npm run build`
5. Run: `npm start` (Next.js listens on port 3000 by default).

## Keep the website running
Install PM2 globally (`npm install -g pm2`) and run:
```bash
pm2 start npm --name streamivio -- start
pm2 save
pm2 startup
``
Follow the command PM2 prints for your OS to enable startup on reboot.

## Optional catalogue API
The Python catalogue service is in `pymoviedb-service`. If needed, run it separately:
```bash
cd pymoviedb-service
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
HOST=127.0.0.1 PORT=8001 python server.py
```
Use a process manager/systemd service to keep it running. Configure `PYMOVIEDB_SERVICE_URL` to the API's reachable HTTPS URL only if this service is used by the Next.js app. Do not expose the API publicly unless protected.

## Reverse proxy
Point your domain's reverse proxy to `127.0.0.1:3000`, enable HTTPS, and restrict public firewall access to SSH and ports 80/443.

## Updating
```bash
git pull
npm ci
npm run build
pm2 restart streamivio
```

This is a Node server deployment, not a static export. API routes and dynamic pages need the server runtime. Specific services (Firebase, email, payment, authorized playback) require their own valid credentials and configuration; don't present unconfigured services as working.
