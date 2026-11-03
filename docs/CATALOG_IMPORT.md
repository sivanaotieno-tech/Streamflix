# Streamivio catalogue importer

This repository includes a safe importer for the CSV/JSON output of
[RomiconEZ/Scrapy-Wiki-IMDb-Movie-Info](https://github.com/RomiconEZ/Scrapy-Wiki-IMDb-Movie-Info).

## One-command Windows test

From the Streamivio repository root, double-click `IMPORT_WIKIPEDIA_MOVIES.bat`
or run it in PowerShell:

```powershell
.\IMPORT_WIKIPEDIA_MOVIES.bat
```

The batch file clones the scraper into `tools\` if needed, installs Scrapy,
locates the actual `scrapy.cfg` directory, runs `movies_spider`, then previews
the import. It does **not** modify the catalogue during its first pass.

If the preview looks right, run the printed command, for example:

```powershell
python scripts\import_wikipedia_catalog.py --input "$env:TEMP\streamivio_wikipedia_movies.csv"
```

The importer:
- accepts CSV or JSON exports;
- maps title, year, genre, director, country and IMDb rating;
- imports movie metadata only (the linked scraper is a Wikipedia movie scraper);
- matches existing records by IMDb ID when supplied, otherwise normalized title + year;
- preserves manually curated descriptions, artwork, ratings, IDs and playback URLs;
- never creates a playback URL or implies that metadata gives streaming rights;
- creates a `.bak` copy before changing `pymoviedb-service/data/catalog.json`.

## Important scope and rights notes

The referenced scraper's README describes a Wikipedia-based movie scraper with
title, genre, director, country, year and IMDb rating fields. It is **not** a
complete IMDb scraper and does not supply TV seasons, episodes, anime catalogues,
or guaranteed IMDb IDs. This importer therefore categorizes its rows as movies.
Use separately licensed sources and adapters for TV, anime, episodes and other
catalogue types.

Do not scrape IMDb's website. IMDb says its datasets are limited to personal,
non-commercial use and may not be republished to build an online database without
permission. For a public Streamivio catalogue, use metadata you are licensed to
publish or obtain an appropriate commercial licence. See
[IMDb's data-use guidance](https://help.imdb.com/article/imdb/general-information/can-i-use-imdb-data-in-my-software/G5JTRESSHJBBHTGX).

A metadata import does not add posters or video streams. Only add artwork you own
or are licensed to use, and only configure `video_url` for media you are
authorized to distribute.
