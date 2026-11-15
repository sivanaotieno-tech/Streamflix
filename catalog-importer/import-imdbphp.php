<?php
declare(strict_types=1);

// Run from the repository root: cd catalog-importer && composer install && php import-imdbphp.php
// IMDbPHP searches and reads IMDb pages. This is an occasional cached import job,
// never a per-visitor request. Respect IMDb's terms, robots policies and rate limits.

require __DIR__ . '/vendor/autoload.php';

use Imdb\Title;
use Imdb\TitleSearch;

$root = dirname(__DIR__);
$seedFile = __DIR__ . '/imdbphp-seed-ids.txt';
$searchFile = __DIR__ . '/imdbphp-show-searches.tsv';
$outputFile = $root . '/app/data/imdbphp-enriched.ts';
$cacheDir = __DIR__ . '/cache';

if (!is_dir($cacheDir) && !mkdir($cacheDir, 0775, true) && !is_dir($cacheDir)) {
    throw new RuntimeException('Unable to create IMDbPHP cache directory.');
}

function normalizeTitle(string $value): string
{
    $value = html_entity_decode($value, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    if (function_exists('iconv')) {
        $ascii = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value);
        if ($ascii !== false) $value = $ascii;
    }
    return strtolower((string) preg_replace('/[^a-z0-9]+/i', '', $value));
}

function cleanText(string $value): string
{
    return trim(html_entity_decode(strip_tags($value), ENT_QUOTES | ENT_HTML5, 'UTF-8'));
}

function catalogType(string $imdbType, ?string $override = null): string
{
    if (in_array($override, ['tv', 'anime', 'documentary', 'kids', 'reality'], true)) {
        return $override;
    }
    $type = strtolower($imdbType);
    return str_contains($type, 'tv') || str_contains($type, 'series') ? 'tv' : 'movie';
}

$ids = file($seedFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
$typeOverrides = [];
$searchErrors = [];
$searcher = new TitleSearch();

// Resolve every TV/anime/documentary/kids/reality entry in Streamivio's expanded
// catalogue by name + year. Search is type-filtered so a similarly named film
// is not accidentally imported as a show.
$searchLines = file($searchFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
foreach ($searchLines as $line) {
    $parts = explode("\t", $line, 3);
    if (count($parts) !== 3) continue;
    [$requestedType, $requestedYear, $requestedTitle] = $parts;
    if (!in_array($requestedType, ['tv', 'anime', 'documentary', 'kids', 'reality'], true)) continue;

    try {
        $matches = $searcher->search($requestedTitle, [TitleSearch::TV_SERIES, TitleSearch::TV_MINI_SERIES], 10);
        if (!$matches) {
            fwrite(STDERR, "No IMDb show match: {$requestedTitle}\n");
            continue;
        }

        $wantedName = normalizeTitle($requestedTitle);
        $exact = array_values(array_filter($matches, static function ($match) use ($wantedName): bool {
            return normalizeTitle((string) $match->title()) === $wantedName;
        }));
        $pool = $exact ?: $matches;
        usort($pool, static function ($a, $b) use ($requestedYear): int {
            $aYear = (int) $a->year();
            $bYear = (int) $b->year();
            $target = (int) $requestedYear;
            return abs($aYear - $target) <=> abs($bYear - $target);
        });

        $chosen = $pool[0];
        if (!$exact && abs((int) $chosen->year() - (int) $requestedYear) > 1) {
            fwrite(STDERR, "Skipped uncertain match: {$requestedTitle}\n");
            continue;
        }
        $digits = preg_replace('/\D+/', '', (string) $chosen->imdbid());
        if (!$digits) continue;
        $imdbId = 'tt' . $digits;
        $ids[] = $imdbId;
        $typeOverrides[$imdbId] = $requestedType;
        fwrite(STDOUT, "Resolved {$requestedTitle} -> {$imdbId}\n");
    } catch (Throwable $error) {
        $searchErrors[] = $requestedTitle . ': ' . $error->getMessage();
        fwrite(STDERR, end($searchErrors) . "\n");
    }
    usleep(250000);
}

$items = [];
$seen = [];
$errors = [];
foreach (array_unique(array_map('trim', $ids)) as $imdbId) {
    if (!preg_match('/^tt\d{5,12}$/', $imdbId) || isset($seen[$imdbId])) continue;
    $seen[$imdbId] = true;
    try {
        $title = new Title(substr($imdbId, 2));
        $name = trim((string) $title->title());
        if ($name === '') continue;

        $rating = $title->rating();
        $items[] = [
            'id' => 'imdb-' . $imdbId,
            'imdbId' => $imdbId,
            'title' => $name,
            'overview' => cleanText((string) $title->plotoutline(true)),
            'year' => (string) $title->year(),
            'rating' => is_numeric($rating) ? (float) $rating : 0,
            'type' => catalogType((string) $title->movietype(), $typeOverrides[$imdbId] ?? null),
            'genres' => array_values(array_filter($title->genres(), 'is_string')),
            'country' => [],
            'source' => 'IMDb via IMDbPHP',
            'poster' => null,
        ];
        fwrite(STDOUT, "Imported {$imdbId}: {$name}\n");
    } catch (Throwable $error) {
        $errors[] = $imdbId . ': ' . $error->getMessage();
        fwrite(STDERR, end($errors) . "\n");
    }
    usleep(250000);
}

if (!$items) {
    fwrite(STDERR, "No IMDb titles imported; the existing catalogue has not been changed.\n");
    exit(1);
}

$tmp = $outputFile . '.tmp';
$json = json_encode($items, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
$source = "import type { CatalogTitle } from './catalog';\n\nexport const imdbPhpEnrichedCatalog: CatalogTitle[] = " . $json . ";\n";
if (file_put_contents($tmp, $source, LOCK_EX) === false || !rename($tmp, $outputFile)) {
    throw new RuntimeException('Unable to write IMDbPHP metadata output.');
}

fwrite(STDOUT, sprintf("Saved %d IMDbPHP records to %s\n", count($items), $outputFile));
if ($errors) fwrite(STDERR, sprintf("%d title IDs could not be refreshed.\n", count($errors)));
if ($searchErrors) fwrite(STDERR, sprintf("%d show searches failed.\n", count($searchErrors)));
