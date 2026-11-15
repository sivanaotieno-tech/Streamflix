# IMDbPHP catalogue enrichment

Streamivio keeps catalogue imports out of visitor requests. The checked-in
`app/data/imdbphp-catalog.ts` provides stable IMDb IDs immediately, while this
optional importer refreshes descriptions, years, ratings and genres through
[tboothman/imdbphp](https://github.com/tboothman/imdbphp).

## Run locally

From the repository root:

```bash
cd catalog-importer
composer update imdbphp/imdbphp
php import-imdbphp.php
```

The script reads `imdbphp-seed-ids.txt`, uses IMDbPHP's local cache, and writes
`app/data/imdbphp-enriched.ts`. The app imports that generated file at build
time. Commit the refreshed generated file to publish the enriched metadata.

IMDbPHP scrapes IMDb pages rather than using an official IMDb API. IMDb can
change its markup or block automated requests; individual failures are logged
and a failed/empty run never replaces the current catalogue. Run imports
occasionally, respect IMDb's terms and rate limits, and review metadata before
publishing. Posters are resolved separately by Streamivio's existing poster
lookup using the stable IMDb ID.

## Canonical title URLs

- Movies: `/movie/{imdb-id}`, e.g. `/movie/tt4154796`
- TV and anime: `/tv-show/{imdb-id}`, e.g. `/tv-show/tt11737520`
- Custom IDs are supported when the catalogue record's `id` matches the URL
  segment, e.g. `/tv-show/t9140554`.

A catalogue record does not imply playable media exists. Playback is still
resolved and checked separately by the existing playback API.
