# PyMovieDb metadata service

This local Python service exposes PyMovieDb's IMDb search, popular movies, popular TV, and title-detail methods to Streamivio. It provides metadata only; it does not resolve or serve video.

## Setup

From this directory, create and activate a virtual environment, then install the dependency:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python server.py
```

The service listens on `http://127.0.0.1:8001` by default. Configure the Next.js app's `.env.local` with:

```env
PYMOVIEDB_API_URL=http://127.0.0.1:8001
```

Restart Next.js after changing environment variables. The service exposes:

- `/health`
- `/search?q=title&type=movie` or `/search?q=title&type=tv`
- `/popular?type=movie` or `/popular?type=tv`, optionally with a supported IMDb genre such as `genre=action`
- `/title?id=tt1234567`

PyMovieDb scrapes IMDb pages. Use it in accordance with IMDb's terms and applicable laws; its upstream project describes itself as educational.
