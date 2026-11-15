#!/usr/bin/env node
/**
 * Build Streamivio's static IMDb metadata catalogue from IMDb's official
 * non-commercial bulk datasets. Uses only Node.js built-ins; no PHP, Composer,
 * scraping library, API key, or runtime dependency is required.
 */
import { createGunzip } from "node:zlib";
import { Readable } from "node:stream";
import { createInterface } from "node:readline";
import { readFile, mkdir, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const idsPath = resolve(root, "catalog-importer/imdb-seed-ids.txt");
const searchesPath = resolve(root, "catalog-importer/imdb-show-searches.tsv");
const outputPath = resolve(root, "app/data/imdb-enriched.ts");
const DATASETS = "https://datasets.imdbws.com";
const MISSING = "\\N";

function normalize(value) {
  return value.normalize("NFKD").replace(/[\\u0300-\\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function parseList(value) {
  return !value || value === MISSING ? [] : value.split(",").filter(Boolean);
}

async function* readDataset(filename) {
  const url = `${DATASETS}/${filename}.tsv.gz`;
  console.log(`Downloading and streaming ${filename}.tsv.gz ...`);
  const response = await fetch(url, {
    headers: { "user-agent": "Streamivio-IMDb-Catalog-Importer/1.0" },
    signal: AbortSignal.timeout(15 * 60 * 1000),
  });
  if (!response.ok || !response.body) {
    throw new Error(`IMDb dataset request failed (${response.status}): ${url}`);
  }

  const input = Readable.fromWeb(response.body);
  const lines = createInterface({
    input: input.pipe(createGunzip()),
    crlfDelay: Infinity,
  });
  let headers;
  for await (const line of lines) {
    if (!headers) {
      headers = line.split("\\t");
      continue;
    }
    if (!line) continue;
    const values = line.split("\\t");
    const row = {};
    for (let index = 0; index < headers.length; index += 1) {
      row[headers[index]] = values[index] ?? "";
    }
    yield row;
  }
}

function mapType(titleType, requestedType) {
  if (requestedType) return requestedType;
  if (titleType === "movie" || titleType === "tvMovie") return "movie";
  return "tv";
}

async function main() {
  const seedText = await readFile(idsPath, "utf8");
  const seedIds = new Set(seedText.split(/\\r?\\n/).map((value) => value.trim()).filter((value) => /^tt\\d{5,12}$/.test(value)));

  const searchText = await readFile(searchesPath, "utf8");
  const searches = searchText.split(/\\r?\\n/).filter(Boolean).map((line) => {
    const [type, year, ...nameParts] = line.split("\\t");
    return { type, year: Number(year), title: nameParts.join("\\t").trim(), key: normalize(nameParts.join("\\t")) };
  }).filter((item) => item.key && Number.isFinite(item.year));

  const searchesByName = new Map();
  for (const search of searches) {
    const list = searchesByName.get(search.key) ?? [];
    list.push(search);
    searchesByName.set(search.key, list);
  }

  const selected = new Map();
  const matches = new Map(searches.map((search) => [search, []]));
  let scanned = 0;

  for await (const row of readDataset("title.basics")) {
    scanned += 1;
    if (row.isAdult === "1") continue;
    const supportedType = ["movie", "tvMovie", "tvSeries", "tvMiniSeries"].includes(row.titleType);
    if (!supportedType) continue;

    if (seedIds.has(row.tconst)) {
      selected.set(row.tconst, { row, requestedType: undefined });
    }

    if (row.titleType !== "tvSeries" && row.titleType !== "tvMiniSeries") continue;
    const key = normalize(row.primaryTitle);
    const candidates = searchesByName.get(key);
    if (!candidates) continue;

    for (const search of candidates) {
      const year = row.startYear === MISSING ? 0 : Number(row.startYear);
      const distance = year ? Math.abs(year - search.year) : Number.POSITIVE_INFINITY;
      if (distance <= 1) matches.get(search).push({ row, distance });
    }
  }

  let resolvedSearches = 0;
  let ambiguousSearches = 0;
  for (const [search, candidates] of matches) {
    candidates.sort((a, b) => a.distance - b.distance);
    if (!candidates.length) continue;
    if (candidates.length > 1 && candidates[0].distance === candidates[1].distance && candidates[0].row.tconst !== candidates[1].row.tconst) {
      ambiguousSearches += 1;
      console.warn(`Ambiguous match skipped: ${search.title} (${search.year})`);
      continue;
    }
    selected.set(candidates[0].row.tconst, { row: candidates[0].row, requestedType: search.type });
    resolvedSearches += 1;
  }

  if (!selected.size) throw new Error("No matching IMDb titles were found; existing catalogue output was not changed.");
  console.log(`Scanned ${scanned.toLocaleString()} IMDb title rows; selected ${selected.size} titles.`);

  const ratings = new Map();
  for await (const row of readDataset("title.ratings")) {
    if (selected.has(row.tconst)) {
      const rating = Number(row.averageRating);
      if (Number.isFinite(rating)) ratings.set(row.tconst, rating);
    }
  }

  const items = [...selected.values()].map(({ row, requestedType }) => ({
    id: `imdb-${row.tconst}`,
    imdbId: row.tconst,
    title: row.primaryTitle,
    overview: "",
    year: row.startYear === MISSING ? "" : row.startYear,
    rating: ratings.get(row.tconst) ?? 0,
    type: mapType(row.titleType, requestedType),
    genres: parseList(row.genres),
    country: [],
    source: "IMDb Non-Commercial Datasets",
    poster: null,
  })).sort((a, b) => a.title.localeCompare(b.title) || a.year.localeCompare(b.year));

  const source = [
    'import type { CatalogTitle } from "./catalog";',
    "",
    "// Generated by catalog-importer/import-imdb.mjs from IMDb's official bulk datasets.",
    "// Re-run with: npm run catalog:import",
    `export const imdbEnrichedCatalog: CatalogTitle[] = ${JSON.stringify(items, null, 2)};`,
    "",
  ].join("\\n");

  await mkdir(dirname(outputPath), { recursive: true });
  const temporaryPath = `${outputPath}.tmp`;
  await writeFile(temporaryPath, source, "utf8");
  await rename(temporaryPath, outputPath);

  console.log(`Generated ${items.length} metadata records at app/data/imdb-enriched.ts`);
  console.log(`Resolved ${resolvedSearches}/${searches.length} named catalogue searches; skipped ${ambiguousSearches} ambiguous matches.`);
  console.log(`Ratings available for ${ratings.size}/${items.length} selected titles.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
