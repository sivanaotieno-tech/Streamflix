# Streamivio live-server deployment (Docker)

This runs the Next.js site and its bundled Python catalogue API on a VPS or Linux server. It is an alternative to Vercel and preserves dynamic Next.js routes.

## Requirements
- Linux VPS with Docker Engine and the Docker Compose plugin
- A DNS A record for your domain pointing to the server IP
- Reverse proxy and HTTPS (recommended: Caddy or Nginx)

## Deploy
1. Clone the repository and enter it: `git clone https://github.com/sivanaotieno-tech/Streamflix.git && cd Streamflix`
2. Review environment requirements in the README and configure any needed secrets in a local `.env` file. Never commit secrets.
3. Build and start: `docker compose up -d --build`
4. Check: `docker compose ps` and `curl -fsS http://127.0.0.1:3000`.
5. For updates: `git pull && docker compose up -d --build`.

The web app is on port 3000. Do not expose the catalogue API port directly to the internet; it is available to the web container on the Compose network. Configure your reverse proxy to send the public domain to 127.0.0.1:3000. Enable HTTPS and firewall the host so only SSH and HTTP/HTTPS are public.

## Caddy example
If Caddy is installed on the host, add a site block (replace the domain):

```caddy
streamivio.com, www.streamivio.com {
    reverse_proxy 127.0.0.1:3000
}
```

Caddy will manage TLS certificates after DNS is pointed correctly and ports 80/443 are reachable.

## Important
- This is a server-side deployment, not a static export. API routes and dynamic pages require Node.
- The app may still require Firebase, email, payment and authorized media resolver credentials for those specific features. Features without configuration should not be presented as live/verified.
- Playback providers must be authorized to distribute the media. This deployment does not scrape or unlock third-party streams.
