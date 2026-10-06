# Jellyfin streaming

Streamivio uses the open-source Jellyfin media server API for self-hosted video playback.

## Environment variables

For local development, add these to the website directory's `.env.local`. For a deployment, configure them as server-only environment variables in your hosting provider:

```env
JELLYFIN_URL=http://127.0.0.1:8096
JELLYFIN_API_KEY=your-jellyfin-api-key
```

Use the base URL of your Jellyfin server. Use `http://127.0.0.1:8096` when Jellyfin runs on the same computer as Streamivio; use its LAN hostname/address when it runs on another device in your home.

The Jellyfin page in Streamivio loads your Movie, Series, and Episode library. Selecting a title plays it in Streamivio's in-page player. Stream and poster requests go through same-origin Next.js routes, which keep the Jellyfin API key on the server and forward byte-range requests for seeking. The app server relays the video bytes, so make sure it can reach Jellyfin and has enough network capacity.

## Jellyfin setup

1. Install Jellyfin and ensure the Streamivio server can reach it.
2. Add your owned, licensed, or public-domain videos to a Jellyfin library.
3. In Jellyfin's dashboard, create an API key for Streamivio.
4. Set `JELLYFIN_URL` and `JELLYFIN_API_KEY` in `.env.local`.
5. Restart the Next.js server and open **Jellyfin** in the Streamivio navigation.

For best playback, use browser-friendly MP4/H.264/AAC files. Jellyfin can also transcode media when needed, but transcoding consumes server CPU.

Do not commit `.env.local` or expose the API key in browser code. The Streamivio Jellyfin proxy does not add website sign-in; if Streamivio is reachable by other people, protect the whole site (for example, using a private network/VPN or an authentication layer) so they cannot access your library through the proxy.
