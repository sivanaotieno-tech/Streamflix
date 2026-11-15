<?php
declare(strict_types=1);

// Run from the repository root: cd catalog-importer && composer install && php import-imdbphp.php
// IMDbPHP scrapes IMDb pages. Run this as a cached, occasional import job, not per visitor request.
// Respect IMDb's terms, robots policies, and rate limits.

require __DIR__ . '/vendor/autoload.php';
use Imdb\Title;

$root = dirname(__DIR__);
$seedFile = __DIR__ . '/imdbphp-seed-ids.txt';
$outputFile = $root . '/app/data/imdbphp-metadata.json';
if (!is_dir(__DIR__ . '/cache') && !mkdir(__DIR__ . '/cache', 0775, true) && !is_dir(__DIR__ . '/cache')) {
    throw new RuntimeException('Unable to create IMDbPHP cache directory.');
}
$ids = file($seedFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
$items = [];
$errors = [];
foreach (array_unique(array_map('trim', $ids)) as $imdbId) {
    if (!preg_match('/^tt\d{5,12}$/', $imdbId)) continue;
    try {
        $title = new Title(substr($imdbId, 2));
        $name = trim((string) $title->title());
        if ($name === '') continue;
        $rating = $title->rating();
        $items[] = [
            'id' => 'imdb-' . $imdbId,
            'imdbId' => $imdbId,
            'title' => $name,
            'overview' => trim((string) $title->plotoutline(true)),
            'year' => (string) $title->year(),
            'rating' => is_numeric($rating) ? (float) $rating : 0,
            'genres' => array_values(array_filter($title->genres(), 'is_string')),
            'source' => 'IMDb via IMDbPHP',
            'imdbUrl' => 'https://www.imdb.com/title/' . $imdbId . '/',
        ];
        fwrite(STDOUT, "Imported {$imdbId}: {$name}\n");
    } catch (Throwable $error) {
        $errors[] = $imdbId . ': ' . $error->getMessage();
        fwrite(STDERR, end($errors) . "\n");
    }
    usleep(350000);
}
if (!$items) {
    fwrite(STDERR, "No IMDb titles imported; the existing catalogue has not been changed.\n");
    exit(1);
}
$tmp = $outputFile . '.tmp';
$json = json_encode($items, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
if (file_put_contents($tmp, $json . PHP_EOL, LOCK_EX) === false || !rename($tmp, $outputFile)) {
    throw new RuntimeException('Unable to write IMDbPHP metadata output.');
}
fwrite(STDOUT, sprintf("Saved %d IMDbPHP records to %s\n", count($items), $outputFile));
if ($errors) fwrite(STDERR, sprintf("%d titles could not be refreshed.\n", count($errors)));
