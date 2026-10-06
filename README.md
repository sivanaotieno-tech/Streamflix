# Streamivio

Legitimate entertainment discovery and playback platform built with Next.js, React and Tailwind CSS.

## Brand

The product name is **Streamivio**. The GitHub repository retains its historical name for now; the user-facing brand has been changed throughout the application.

## APIs

- **TVmaze** — TV metadata and search.
- **Jikan** — MyAnimeList-powered anime metadata and search.
- **Internet Archive** — public/open media catalog plus a server-side playable-file resolver at `/api/stream`.
- **iptv-org** — publicly listed live-TV channels and streams through `/api/live`.
- **Jellyfin/PeerTube** — optional self-hosted video library integration.
- **PyMovieDb** — optional IMDb title search and metadata details.
- **OMSS** — optional streaming-source API integration.

## Rights policy

Streamivio must only make video available when the operator has the necessary authorization, owns the content, or the content is legitimately available for the intended use. Metadata/discovery sources do not grant streaming rights. Do not configure Streamivio to resolve, proxy, embed, or distribute unauthorized copyrighted streams.

## Local development

1. Copy `.env.example` to `.env.local`.
2. Configure only authorized content/video sources.
3. Run `npm install` and `npm run dev`.
