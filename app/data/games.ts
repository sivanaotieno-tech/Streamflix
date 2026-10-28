export type GameRecord = {
  id: string;
  title: string;
  overview: string;
  year: string;
  genres: string[];
  platforms: string[];
  developer: string;
  publisher: string;
  ageRating: string;
  officialUrl?: string;
};

export const gamesCatalog: GameRecord[] = [
  { id: "game-minecraft", title: "Minecraft", overview: "Explore, build, craft and survive in a block-based sandbox world.", year: "2011", genres: ["Sandbox", "Survival", "Adventure"], platforms: ["PC", "PlayStation", "Xbox", "Nintendo Switch", "Mobile"], developer: "Mojang Studios", publisher: "Mojang Studios", ageRating: "E10+", officialUrl: "https://www.minecraft.net/" },
  { id: "game-zelda-botw", title: "The Legend of Zelda: Breath of the Wild", overview: "Explore a vast wilderness, solve ancient puzzles and help Link reclaim his memories.", year: "2017", genres: ["Adventure", "Action"], platforms: ["Nintendo Switch", "Wii U"], developer: "Nintendo EPD", publisher: "Nintendo", ageRating: "E10+", officialUrl: "https://www.nintendo.com/" },
  { id: "game-mario-odyssey", title: "Super Mario Odyssey", overview: "Join Mario and Cappy on a globe-spanning 3D platform adventure.", year: "2017", genres: ["Platformer", "Adventure"], platforms: ["Nintendo Switch"], developer: "Nintendo EPD", publisher: "Nintendo", ageRating: "E10+", officialUrl: "https://www.nintendo.com/" },
  { id: "game-sonic-frontiers", title: "Sonic Frontiers", overview: "Race across open zones, solve puzzles and battle powerful enemies as Sonic.", year: "2022", genres: ["Action", "Adventure", "Platformer"], platforms: ["PC", "PlayStation", "Xbox", "Nintendo Switch"], developer: "Sonic Team", publisher: "SEGA", ageRating: "E10+", officialUrl: "https://www.sonicthehedgehog.com/" },
  { id: "game-stardew-valley", title: "Stardew Valley", overview: "Build a farm, meet the locals, explore caves and shape a new life in the valley.", year: "2016", genres: ["Simulation", "RPG", "Farming"], platforms: ["PC", "PlayStation", "Xbox", "Nintendo Switch", "Mobile"], developer: "ConcernedApe", publisher: "ConcernedApe", ageRating: "E10+", officialUrl: "https://www.stardewvalley.net/" },
  { id: "game-fortnite", title: "Fortnite", overview: "Play competitive battle royale matches and explore a changing world of creator experiences.", year: "2017", genres: ["Battle Royale", "Action", "Multiplayer"], platforms: ["PC", "PlayStation", "Xbox", "Nintendo Switch", "Mobile"], developer: "Epic Games", publisher: "Epic Games", ageRating: "T", officialUrl: "https://www.fortnite.com/" },
  { id: "game-rocket-league", title: "Rocket League", overview: "Compete in fast-paced soccer matches using rocket-powered cars.", year: "2015", genres: ["Sports", "Racing", "Multiplayer"], platforms: ["PC", "PlayStation", "Xbox", "Nintendo Switch"], developer: "Psyonix", publisher: "Psyonix", ageRating: "E", officialUrl: "https://www.rocketleague.com/" },
  { id: "game-roblox", title: "Roblox", overview: "Discover and play a wide variety of community-created interactive experiences.", year: "2006", genres: ["Sandbox", "Social", "Adventure"], platforms: ["PC", "PlayStation", "Xbox", "Mobile"], developer: "Roblox Corporation", publisher: "Roblox Corporation", ageRating: "Varies by experience", officialUrl: "https://www.roblox.com/" },
  { id: "game-animal-crossing", title: "Animal Crossing: New Horizons", overview: "Create an island home, collect resources and build a community at your own pace.", year: "2020", genres: ["Simulation", "Life Sim"], platforms: ["Nintendo Switch"], developer: "Nintendo EPD", publisher: "Nintendo", ageRating: "E", officialUrl: "https://www.nintendo.com/" },
  { id: "game-mario-kart-8", title: "Mario Kart 8 Deluxe", overview: "Race across imaginative tracks with familiar characters, items and multiplayer modes.", year: "2017", genres: ["Racing", "Sports", "Multiplayer"], platforms: ["Nintendo Switch"], developer: "Nintendo EPD", publisher: "Nintendo", ageRating: "E", officialUrl: "https://www.nintendo.com/" },
  { id: "game-baldurs-gate-3", title: "Baldur's Gate 3", overview: "Lead a party of adventurers through a story-rich fantasy role-playing game.", year: "2023", genres: ["RPG", "Fantasy", "Strategy"], platforms: ["PC", "PlayStation", "Xbox"], developer: "Larian Studios", publisher: "Larian Studios", ageRating: "M", officialUrl: "https://baldursgate3.game/" },
  { id: "game-hogwarts-legacy", title: "Hogwarts Legacy", overview: "Explore a magical open world, learn spells and uncover an ancient mystery.", year: "2023", genres: ["Action RPG", "Adventure", "Fantasy"], platforms: ["PC", "PlayStation", "Xbox", "Nintendo Switch"], developer: "Avalanche Software", publisher: "Warner Bros. Games", ageRating: "T", officialUrl: "https://www.hogwartslegacy.com/" },
  { id: "game-civ6", title: "Sid Meier's Civilization VI", overview: "Build an empire, research technologies and guide a civilization through history.", year: "2016", genres: ["Strategy", "Turn-Based"], platforms: ["PC", "PlayStation", "Xbox", "Nintendo Switch", "Mobile"], developer: "Firaxis Games", publisher: "2K", ageRating: "E10+", officialUrl: "https://civilization.2k.com/" },
  { id: "game-pokemon-arceus", title: "Pokémon Legends: Arceus", overview: "Explore the Hisui region and research Pokémon in an action-oriented adventure.", year: "2022", genres: ["Action RPG", "Adventure"], platforms: ["Nintendo Switch"], developer: "Game Freak", publisher: "Nintendo", ageRating: "E10+", officialUrl: "https://www.pokemon.com/" },
  { id: "game-eafc25", title: "EA SPORTS FC 25", overview: "Play club and international football with a range of competitive and career modes.", year: "2024", genres: ["Sports", "Football", "Multiplayer"], platforms: ["PC", "PlayStation", "Xbox", "Nintendo Switch"], developer: "EA Canada", publisher: "Electronic Arts", ageRating: "E", officialUrl: "https://www.ea.com/games/ea-sports-fc" }
];
