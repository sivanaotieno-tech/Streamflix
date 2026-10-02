# Jellyfin streaming

Streamflix uses the open-source Jellyfin media server API for self-hosted video playback.

## Environment variables

Set these in Vercel:

```env
JELLYFIN_URL=https://your-jellyfin-server.example.com
JELLYFIN_API_KEY=your-restricted-jellyfin-api-key
```

The Streamflix server calls Jellyfin for the media catalog. The browser then plays the video directly from Jellyfin, so Vercel is not used as a video-byte proxy.

## Jellyfin setup

1. Install Jellyfin on a server that stays online.
2. Add your owned, licensed, or public-domain videos to a Jellyfin library.
3. Create a dedicated Jellyfin user with access only to the Streamflix library.
4. Create a Jellyfin API key for the integration.
5. Put the Jellyfin public HTTPS URL and restricted API key in Vercel environment variables.
6. Redeploy Streamflix.

For best direct playback, use browser-friendly MP4/H.264/AAC files. Jellyfin can also transcode media when needed, but transcoding consumes server CPU.

The Jellyfin API exposes media metadata and video streaming endpoints; Streamflix uses those endpoints directly rather than hosting video files on GitHub or Vercel.
