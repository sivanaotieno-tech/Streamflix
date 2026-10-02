# Free Hovod video server for Streamflix

Streamflix uses Hovod as a self-hosted video server. Hovod's self-hosted edition is open-source and free; it handles upload, FFmpeg transcoding and adaptive HLS playback. Video bytes are served by your own storage, not by Vercel.

## Architecture

- **Hovod** — dashboard, API, transcoding and playback.
- **MinIO** — local S3-compatible storage for source files and HLS output.
- **Streamflix/Vercel** — catalog and UI only; it does not proxy video bytes.

This is a $0 software setup when run on a computer you already own. Public internet access and bandwidth are separate infrastructure concerns.

## 1. Install Docker Desktop

Install Docker Desktop on Windows and make sure Docker is running.

## 2. Start the server

From the Streamflix repository:

```powershell
docker compose -f docker-compose.hovod.yml up -d
```

Open:

- Hovod dashboard: http://localhost:3001
- MinIO console: http://localhost:9001

Create your first Hovod account and upload a video. Hovod will process it into adaptive HLS.

## 3. Connect a Hovod video to Streamflix

After processing finishes, copy the video's playback ID from Hovod.

Create `.env.local` from `.env.hovod.example`:

```env
HOVOD_PUBLIC_URL=http://localhost:3001
STREAMFLIX_HOVOD_VIDEOS=[{"id":"movie-1","title":"My Movie","description":"My video","year":"2026","playbackId":"YOUR_PLAYBACK_ID"}]
```

Restart Next.js. Streamflix will show a **My Hovod Library** row and open the Hovod embed player.

## 4. Local vs public access

`localhost` only works on the computer running Docker. A Vercel visitor cannot reach your PC through `http://localhost:3001`.

For a public Streamflix site, the computer running Hovod needs a reachable public URL. That can be added later with a free networking/tunneling solution or a machine with a public IP.

Never put Hovod admin/API credentials in browser code or public GitHub files.

## 5. Video path

Browser → Streamflix on Vercel for UI/catalog.

Browser → Hovod embed → MinIO for video/HLS.

Vercel does not download and relay the full video.

## Content

Only upload videos you own, have permission to distribute, or that are legally available for redistribution. Self-hosting does not grant distribution rights.
