# Streamflix

Netflix-inspired discovery and playback app built with Next.js, React and Tailwind CSS.

## APIs

Streamflix uses multiple sources:

- **TVmaze** — TV metadata and search.
- **Jikan** — MyAnimeList-powered anime metadata and search.
- **Internet Archive** — public/open media catalog plus a server-side playable-file resolver at `/api/stream`.
- **iptv-org** — publicly listed live-TV channels and streams through `/api/live`.
- **Hovod** — optional self-hosted video server integration. Run `docker-compose.hovod.yml` with Hovod + MinIO and list your playback IDs in `STREAMFLIX_HOVOD_VIDEOS`.
- **OMSS** — optional streaming-source API integration. Set `OMSS_API_URL` to an OMSS-compatible backend; Streamflix requests standardized movie sources from `/v1/movies/:id`.

The OMSS integration follows the open OMSS standard, which supports multiple sources, HLS/MP4 metadata, quality, audio tracks and subtitles.

## Local development

1. Copy `.env.example` to `.env.local`.
2. Optionally set `OMSS_API_URL` and/or the Hovod variables from `.env.hovod.example`.
3. Run `npm install`.
4. Run `npm run dev`.

## Playback model

Streamflix does not proxy full video files through Vercel. Public/open media is played from its authorized source URL. For your own videos, the browser uses the self-hosted Hovod player; Hovod handles transcoding and HLS delivery from your storage.

See [docs/HOVOD.md](docs/HOVOD.md) for the free local video-server setup.

Do not configure the app to resolve or proxy unauthorized copyrighted streams.
