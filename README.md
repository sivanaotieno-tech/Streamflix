# Streamivio

Legitimate entertainment discovery and playback app built with Next.js, React and Tailwind CSS.

The GitHub repository retains its historical name; the user-facing brand is Streamivio.

## APIs

Streamivio uses multiple sources:

- **PyMovieDb** — IMDb-backed popular movie and TV catalogs, search, and title details through the local Python service in `pymoviedb-service/`.
- **Kitsu** — anime metadata, popular anime, and search.
- **`/api/search`** — debounced, category-filterable search across PyMovieDb movies/TV and Kitsu anime. Results from healthy sources remain available when another source is offline.
- **iptv-org** — publicly listed live-TV channels and streams through `/api/live`.
- **Jellyfin** — optional self-hosted movie/TV library shown on the Jellyfin page and played in Streamivio through a server-side, range-aware proxy.
- **PeerTube** — optional self-hosted video catalog and playback.
- **OMSS** — optional streaming-source API integration. Set `OMSS_API_URL` to an OMSS-compatible backend; Streamivio requests standardized movie sources from `/v1/movies/:id`.

The OMSS integration follows the open OMSS standard, which supports multiple sources, HLS/MP4 metadata, quality, audio tracks and subtitles.

Movie and TV discovery uses PyMovieDb for metadata; it does not provide video streams. Connect Jellyfin or PeerTube for in-site playback of media you are authorized to access. Anime discovery also provides metadata, not video. Streamivio does not use the Internet Archive as a catalog or streaming source.
The Movies page includes IMDb genre filters; title details include available release, rating, genre, runtime, director, and cast metadata.

## Local development

1. Copy `.env.example` to `.env.local`.
2. Configure the PyMovieDb service URL and optionally set `JELLYFIN_URL` and `JELLYFIN_API_KEY` in `.env.local` for your Jellyfin library.
3. Start the PyMovieDb service in a separate terminal:

   ```powershell
   cd pymoviedb-service
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   python -m pip install -r requirements.txt
   python server.py
   ```

   The default `PYMOVIEDB_API_URL` is `http://127.0.0.1:8001`. See [pymoviedb-service/README.md](./pymoviedb-service/README.md) for details.
4. Run `npm install` and `npm run dev` from the website directory.

PyMovieDb scrapes IMDb for metadata. Use it in accordance with IMDb's terms and applicable laws.

## Playback model

Metadata search does not stream movies or TV. For in-site playback, connect an authorized self-hosted Jellyfin or PeerTube library. Jellyfin video bytes are relayed through the Next.js server, including byte ranges for seeking; ensure that server can reach Jellyfin and can handle the bandwidth. Read [docs/Jellyfin.md](./docs/Jellyfin.md) for setup and access-control notes.

See [docs/Jellyfin.md](docs/Jellyfin.md) for the free local video-server setup.

Only make video available when you own it, have the necessary authorization, or it is legitimately available for the intended use. Metadata and discovery sources do not grant streaming rights. Do not configure Streamivio to resolve, proxy, embed, or distribute unauthorized copyrighted streams.
