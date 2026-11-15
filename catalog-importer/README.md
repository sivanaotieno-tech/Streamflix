# Streamivio IMDb catalogue importer

This importer uses **Node.js only** and IMDb's official daily non-commercial bulk datasets. It does not use PHP, Composer, page scraping, an API key, or a third-party runtime package.

## Run locally

From the Streamivio repository root:

```powershell
npm run catalog:import
npm run build
```

The importer streams the compressed IMDb title and ratings datasets and writes `app/data/imdb-enriched.ts`. It does not save the full datasets to disk or load millions of rows into memory. Expect the first run to take several minutes and use network bandwidth; subsequent runs download the latest daily files again.

## What is included

- Existing IMDb IDs from `imdb-seed-ids.txt`.
- Exact title + release-year matches from `imdb-show-searches.tsv`, limited to IMDb TV series and mini-series.
- IMDb title IDs, primary titles, years, genres, and average ratings where available.
- Non-adult records only; ambiguous title matches are skipped and logged.

The public IMDb bulk datasets do not include plot summaries, poster images, or streaming links. Existing editorial descriptions and artwork are preserved by the catalogue merge. Playback providers and URL construction are not part of this importer.

## Automated verification

The GitHub Actions workflow runs the importer and `npm run build` on pushes to the importer branch. It commits the generated metadata file back to that branch only after the build succeeds.

## IMDb terms

IMDb states that these datasets are for personal and non-commercial use. Review and comply with IMDb's current dataset and licensing terms before publishing or using the data commercially:
https://developer.imdb.com/non-commercial-datasets/
