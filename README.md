# Streamflix

Netflix-inspired discovery and playback app built with Next.js, React and Tailwind CSS.

## APIs

Streamflix uses multiple sources:

- **TVmaze** — TV metadata and search.
- **Jikan** — MyAnimeList-powered anime metadata and search.
- **Internet Archive** — public/open media catalog plus a server-side playable-file resolver at `/api/stream`.
- **iptv-org** — publicly listed live-TV channels and streams through `/api/live`.
- **OMSS** — optional streaming-source API integration. Set `OMSS_API_URL` to an OMSS-compatible backend; Streamflix requests standardized movie sources from `/v1/movies/:id`.

The OMSS integration follows the open OMSS standard, which supports multiple sources, HLS/MP4 metadata, quality, audio tracks and subtitles.

## Local development

1. Copy `.env.example` to `.env.local`.
2. Optionally set `OMSS_API_URL`.
3. Run `npm install`.
4. Run `npm run dev`.

## Playback model

Streamflix does not upload third-party videos to Vercel. For public/open media, the browser receives the authorized source URL and plays it directly. The Internet Archive resolver discovers a browser-playable file from an Archive item.

Do not configure the app to resolve or proxy unauthorized copyrighted streams.
