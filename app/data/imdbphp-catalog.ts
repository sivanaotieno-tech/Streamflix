import type { CatalogTitle } from "./catalog";

// Additional editorial picks with stable IMDb identifiers. Metadata is enriched
// at request time by the optional IMDbPHP importer; IDs also drive canonical URLs.
export const editorialCatalog: CatalogTitle[] = [
  { id: "editorial-avengers-endgame", title: "Avengers: Endgame", overview: "", year: "2019", rating: 0, type: "movie", genres: ["Action","Adventure","Drama"], country: [], source: "Streamivio Editorial", poster: null },
  { id: "editorial-dune-part-two", title: "Dune: Part Two", overview: "", year: "2024", rating: 0, type: "movie", genres: ["Adventure","Drama","Sci-Fi"], country: [], source: "Streamivio Editorial", poster: null },
  { id: "editorial-oppenheimer", title: "Oppenheimer", overview: "", year: "2023", rating: 0, type: "movie", genres: ["Biography","Drama","History"], country: [], source: "Streamivio Editorial", poster: null },
  { id: "editorial-barbie", title: "Barbie", overview: "", year: "2023", rating: 0, type: "movie", genres: ["Adventure","Comedy","Fantasy"], country: [], source: "Streamivio Editorial", poster: null },
  { id: "editorial-inside-out-2", title: "Inside Out 2", overview: "", year: "2024", rating: 0, type: "movie", genres: ["Animation","Adventure","Comedy"], country: [], source: "Streamivio Editorial", poster: null },
  { id: "editorial-spider-man-across-the-spider-verse", title: "Spider-Man: Across the Spider-Verse", overview: "", year: "2023", rating: 0, type: "movie", genres: ["Animation","Action","Adventure"], country: [], source: "Streamivio Editorial", poster: null },
  { id: "editorial-top-gun-maverick", title: "Top Gun: Maverick", overview: "", year: "2022", rating: 0, type: "movie", genres: ["Action","Drama"], country: [], source: "Streamivio Editorial", poster: null },
  { id: "editorial-everything-everywhere-all-at-once", title: "Everything Everywhere All at Once", overview: "", year: "2022", rating: 0, type: "movie", genres: ["Action","Adventure","Comedy"], country: [], source: "Streamivio Editorial", poster: null },
  { id: "editorial-the-batman", title: "The Batman", overview: "", year: "2022", rating: 0, type: "movie", genres: ["Action","Crime","Drama"], country: [], source: "Streamivio Editorial", poster: null },
  { id: "editorial-interstellar", title: "Interstellar", overview: "", year: "2014", rating: 0, type: "movie", genres: ["Adventure","Drama","Sci-Fi"], country: [], source: "Streamivio Editorial", poster: null },
  { id: "editorial-parasite", title: "Parasite", overview: "", year: "2019", rating: 0, type: "movie", genres: ["Drama","Thriller"], country: [], source: "Streamivio Editorial", poster: null },
  { id: "editorial-puss-in-boots-the-last-wish", title: "Puss in Boots: The Last Wish", overview: "", year: "2022", rating: 0, type: "movie", genres: ["Animation","Adventure","Comedy"], country: [], source: "Streamivio Editorial", poster: null },
  { id: "editorial-godzilla-minus-one", title: "Godzilla Minus One", overview: "", year: "2023", rating: 0, type: "movie", genres: ["Action","Drama","Sci-Fi"], country: [], source: "Streamivio Editorial", poster: null },
  { id: "editorial-sonic-the-hedgehog-3", title: "Sonic the Hedgehog 3", overview: "", year: "2024", rating: 0, type: "movie", genres: ["Action","Adventure","Comedy"], country: [], source: "Streamivio Editorial", poster: null },
  { id: "editorial-the-last-of-us", title: "The Last of Us", overview: "", year: "2023", rating: 0, type: "tv", genres: ["Action","Adventure","Drama"], country: [], source: "Streamivio Editorial", poster: null },
  { id: "editorial-stranger-things", title: "Stranger Things", overview: "", year: "2016", rating: 0, type: "tv", genres: ["Drama","Fantasy","Horror"], country: [], source: "Streamivio Editorial", poster: null },
  { id: "editorial-severance", title: "Severance", overview: "", year: "2022", rating: 0, type: "tv", genres: ["Drama","Mystery","Sci-Fi"], country: [], source: "Streamivio Editorial", poster: null },
  { id: "editorial-fallout", title: "Fallout", overview: "", year: "2024", rating: 0, type: "tv", genres: ["Action","Adventure","Drama"], country: [], source: "Streamivio Editorial", poster: null },
  { id: "editorial-arcane", title: "Arcane", overview: "", year: "2021", rating: 0, type: "tv", genres: ["Animation","Action","Adventure"], country: [], source: "Streamivio Editorial", poster: null },
  { id: "editorial-one-piece", title: "One Piece", overview: "", year: "2023", rating: 0, type: "tv", genres: ["Action","Adventure","Comedy"], country: [], source: "Streamivio Editorial", poster: null },
  { id: "editorial-one-piece", title: "One Piece", overview: "", year: "1999", rating: 0, type: "anime", genres: ["Anime","Action","Adventure"], country: [], source: "Streamivio Editorial", poster: null },
  { id: "editorial-naruto", title: "Naruto", overview: "", year: "2002", rating: 0, type: "anime", genres: ["Anime","Action","Adventure"], country: [], source: "Streamivio Editorial", poster: null },
  { id: "editorial-bleach", title: "Bleach", overview: "", year: "2004", rating: 0, type: "anime", genres: ["Anime","Action","Adventure"], country: [], source: "Streamivio Editorial", poster: null },
  { id: "editorial-my-hero-academia", title: "My Hero Academia", overview: "", year: "2016", rating: 0, type: "anime", genres: ["Anime","Action","Adventure"], country: [], source: "Streamivio Editorial", poster: null },
  { id: "editorial-vinland-saga", title: "Vinland Saga", overview: "", year: "2019", rating: 0, type: "anime", genres: ["Anime","Action","Adventure"], country: [], source: "Streamivio Editorial", poster: null },
  { id: "editorial-chainsaw-man", title: "Chainsaw Man", overview: "", year: "2022", rating: 0, type: "anime", genres: ["Anime","Action","Horror"], country: [], source: "Streamivio Editorial", poster: null },
  { id: "editorial-jujutsu-kaisen", title: "Jujutsu Kaisen", overview: "", year: "2020", rating: 0, type: "anime", genres: ["Anime","Action","Fantasy"], country: [], source: "Streamivio Editorial", poster: null },
  { id: "editorial-demon-slayer-kimetsu-no-yaiba", title: "Demon Slayer: Kimetsu no Yaiba", overview: "", year: "2019", rating: 0, type: "anime", genres: ["Anime","Action","Fantasy"], country: [], source: "Streamivio Editorial", poster: null },
  { id: "editorial-invincible", title: "Invincible", overview: "", year: "2021", rating: 0, type: "tv", genres: ["Animation","Action","Drama"], country: [], source: "Streamivio Editorial", poster: null },
  { id: "editorial-breaking-bad", title: "Breaking Bad", overview: "", year: "2008", rating: 0, type: "tv", genres: ["Crime","Drama","Thriller"], country: [], source: "Streamivio Editorial", poster: null },
  { id: "editorial-game-of-thrones", title: "Game of Thrones", overview: "", year: "2011", rating: 0, type: "tv", genres: ["Action","Adventure","Drama"], country: [], source: "Streamivio Editorial", poster: null }
];
