<?php
declare(strict_types=1);

require __DIR__ . '/vendor/autoload.php';

use Hooshid\ImdbScraper\Chart;

$root = dirname(__DIR__);
$output = $root . '/app/data/imdb-catalog.ts';
$charts = [
    ['TOP_250', 'movie'],
    ['TOP_250_TV', 'tv'],
];

function cleanText(mixed $value): string {
    return trim(preg_replace('/\\s+/u', ' ', strip_tags((string)($value ?? ''))) ?? '');
}

function normalizeTitle(array $row, string $type): ?array {
    $imdbId = (string)($row['id'] ?? '');
    $title = cleanText($row['title'] ?? '');
    if (!preg_match('/^tt\\d{5,12}$/', $imdbId) || $title === '') return null;

    $image = $row['image']['url'] ?? null;
    $poster = is_string($image) && str_starts_with($image, 'https://') ? $image : null;
    $year = isset($row['year']) ? (string)$row['year'] : '';
    $rating = isset($row['rating']) && is_numeric($row['rating']) ? (float)$row['rating'] : 0.0;

    return [
        'id' => 'imdb-' . strtolower($imdbId),
        'imdbId' => $imdbId,
        'title' => $title,
        'overview' => '',
        'year' => $year,
        'rating' => $rating,
        'type' => $type,
        'genres' => [],
        'country' => [],
        'source' => 'IMDb Top Charts',
        'poster' => $poster,
    ];
}

$chart = new Chart();
$byId = [];
$errors = [];

foreach ($charts as [$chartName, $type]) {
    try {
        $rows = $chart->getList($chartName);
        foreach ($rows as $row) {
            if (!is_array($row)) continue;
            $item = normalizeTitle($row, $type);
            if ($item !== null) $byId[$item['imdbId']] = $item;
        }
        fwrite(STDOUT, sprintf("%s: %d titles\n", $chartName, count($rows)));
    } catch (Throwable $error) {
        $errors[] = $chartName . ': ' . $error->getMessage();
        fwrite(STDERR, end($errors) . "\n");
    }
}

if (count($byId) < 100) {
    fwrite(STDERR, "IMDb import returned fewer than 100 unique titles; refusing to replace the generated catalogue.\n");
    exit(1);
}

$items = array_values($byId);
usort($items, static fn(array $a, array $b): int => ($b['rating'] <=> $a['rating']) ?: strcmp($a['title'], $b['title']));
$json = json_encode($items, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
$source = "import type { CatalogTitle } from './catalog';\\n\\nexport const imdbCatalog: CatalogTitle[] = " . $json . ";\\n";
if (file_put_contents($output, $source) === false) {
    fwrite(STDERR, "Could not write generated IMDb catalogue.\n");
    exit(1);
}

fwrite(STDOUT, sprintf("Wrote %d unique IMDb chart titles to %s\\n", count($items), $output));
if ($errors) fwrite(STDERR, "Some charts could not be refreshed; review the log above.\n");
