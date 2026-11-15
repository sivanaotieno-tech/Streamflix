# IMDbPHP catalogue enrichment

This importer uses [tboothman/imdbphp](https://github.com/tboothman/imdbphp) to search IMDb for Streamivio's show titles and enrich known IMDb IDs with metadata.

## Coverage

- `imdbphp-seed-ids.txt` contains the existing IMDb-linked catalogue IDs plus the TV entries in Streamivio's IMDb chart data.
- `imdbphp-show-searches.tsv` lists every TV, anime, documentary, kids and reality title in the expanded Streamivio catalogue, plus the additional hand-curated show picks. The importer searches IMDb for each title, filters to TV Series / TV Mini Series, and checks the requested title and release year before accepting a match.
- Search results that are uncertain are skipped and printed to STDERR rather than silently importing a wrong title.
- IMDbPHP does not contain a complete downloadable database of every show on IMDb. This imports every show represented in Streamivio's current catalogue plus the seeded IMDb chart IDs; it cannot enumerate every show ever listed on IMDb.

## Run

From the repository root:

```bash
cd catalog-importer
composer install
php import-imdbphp.php
```

The generated file is `app/data/imdbphp-enriched.ts`. The app imports this file into its catalogue. Commit the generated file after reviewing the imported records.

## Important

IMDbPHP scrapes IMDb pages; it is not an official IMDb API. IMDb can change its page structure, search results, or access rules. The importer uses a cache directory and delays between requests. Run it occasionally, respect IMDb's terms and rate limits, and do not run it on every page view. Poster URLs remain null unless a separate approved artwork source is configured.
