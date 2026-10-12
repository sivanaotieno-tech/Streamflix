export type CatalogTitle = {
  id: string;
  title: string;
  overview: string;
  year: string;
  rating: number;
  type: "movie" | "tv" | "anime" | "documentary" | "kids" | "reality";
  genres: string[];
  source: string;
  poster: string | null;
};

export const catalog: CatalogTitle[] = [
  {id:"m-matrix",title:"The Matrix",overview:"A computer hacker learns that reality may be a simulation and joins a rebellion against its controllers.",year:"1999",rating:8.7,type:"movie",genres:["Action","Sci-Fi"],source:"Streamivio Library",poster:null},
  {id:"m-inception",title:"Inception",overview:"A skilled thief who steals secrets through dreams is offered a chance to erase his past by planting an idea.",year:"2010",rating:8.8,type:"movie",genres:["Action","Sci-Fi","Thriller"],source:"Streamivio Library",poster:null},
  {id:"m-interstellar",title:"Interstellar",overview:"Explorers travel beyond this galaxy to discover whether humankind can find a future among the stars.",year:"2014",rating:8.7,type:"movie",genres:["Adventure","Drama","Sci-Fi"],source:"Streamivio Library",poster:null},
  {id:"m-spiderverse",title:"Spider-Man: Into the Spider-Verse",overview:"A Brooklyn teenager meets other Spider-heroes from different dimensions and discovers what being a hero means.",year:"2018",rating:8.4,type:"movie",genres:["Action","Animation","Adventure"],source:"Streamivio Library",poster:null},
  {id:"m-paddington",title:"Paddington 2",overview:"A kind bear tries to find the perfect gift for his aunt and becomes caught up in a mystery.",year:"2017",rating:7.8,type:"movie",genres:["Comedy","Family"],source:"Streamivio Library",poster:null},
  {id:"m-knivesout",title:"Knives Out",overview:"A detective investigates a famous novelist's death while a complicated family becomes full of suspects.",year:"2019",rating:7.9,type:"movie",genres:["Mystery","Comedy","Crime"],source:"Streamivio Library",poster:null},
  {id:"m-hiddenfigures",title:"Hidden Figures",overview:"Three brilliant Black women mathematicians help NASA make history during the space race.",year:"2016",rating:7.8,type:"movie",genres:["Drama","History"],source:"Streamivio Library",poster:null},
  {id:"m-coco",title:"Coco",overview:"A young musician journeys into the Land of the Dead to uncover the truth about his family's history.",year:"2017",rating:8.4,type:"movie",genres:["Animation","Family","Music"],source:"Streamivio Library",poster:null},
  {id:"m-jumanji",title:"Jumanji: Welcome to the Jungle",overview:"Four students are pulled into a video game where they must work together to get home.",year:"2017",rating:6.9,type:"movie",genres:["Adventure","Comedy","Fantasy"],source:"Streamivio Library",poster:null},
  {id:"m-getout",title:"Get Out",overview:"A weekend visit to meet a girlfriend's family turns into a disturbing mystery.",year:"2017",rating:7.8,type:"movie",genres:["Horror","Mystery","Thriller"],source:"Streamivio Library",poster:null},
  {id:"m-pride",title:"Pride & Prejudice",overview:"Elizabeth Bennet navigates first impressions, family expectations and unexpected romance.",year:"2005",rating:7.8,type:"movie",genres:["Romance","Drama"],source:"Streamivio Library",poster:null},
  {id:"m-martian",title:"The Martian",overview:"An astronaut stranded on Mars uses science, humour and determination to survive.",year:"2015",rating:8.0,type:"movie",genres:["Adventure","Drama","Sci-Fi"],source:"Streamivio Library",poster:null},
  {id:"m-queen",title:"Queen of Katwe",overview:"A Ugandan girl discovers a talent for chess and pursues a new future for herself and her family.",year:"2016",rating:7.4,type:"movie",genres:["Drama","Sport","Family"],source:"Streamivio Library",poster:null},
  {id:"m-lion",title:"The Lion King",overview:"A young lion faces responsibility and finds the courage to reclaim his place in the circle of life.",year:"1994",rating:8.5,type:"movie",genres:["Animation","Adventure","Family"],source:"Streamivio Library",poster:null},
  {id:"m-wakanda",title:"Black Panther",overview:"A new king must protect his nation while confronting a challenge to the future of Wakanda.",year:"2018",rating:7.3,type:"movie",genres:["Action","Adventure","Sci-Fi"],source:"Streamivio Library",poster:null},
  {id:"tv-brooklyn99",title:"Brooklyn Nine-Nine",overview:"A talented but immature detective and his colleagues solve crimes at a New York precinct.",year:"2013",rating:8.4,type:"tv",genres:["Comedy","Crime"],source:"Streamivio Library",poster:null},
  {id:"tv-planetearth",title:"Planet Earth",overview:"A sweeping natural-history series exploring remarkable habitats and wildlife around the world.",year:"2006",rating:9.4,type:"documentary",genres:["Nature","Science","Documentary"],source:"Streamivio Library",poster:null},
  {id:"tv-blueplanet",title:"The Blue Planet",overview:"Discover the extraordinary life, landscapes and ecosystems beneath the world's oceans.",year:"2001",rating:9.0,type:"documentary",genres:["Nature","Science","Documentary"],source:"Streamivio Library",poster:null},
  {id:"tv-sherlock",title:"Sherlock",overview:"A modern consulting detective and his flatmate solve unusual mysteries in London.",year:"2010",rating:9.1,type:"tv",genres:["Mystery","Crime","Drama"],source:"Streamivio Library",poster:null},
  {id:"tv-modernfamily",title:"Modern Family",overview:"Three connected families navigate everyday chaos, growing up and growing together.",year:"2009",rating:8.5,type:"tv",genres:["Comedy","Family"],source:"Streamivio Library",poster:null},
  {id:"tv-doctorwho",title:"Doctor Who",overview:"A time-travelling adventurer explores space and time with a succession of human companions.",year:"2005",rating:8.5,type:"tv",genres:["Sci-Fi","Adventure","Drama"],source:"Streamivio Library",poster:null},
  {id:"tv-cosmos",title:"Cosmos",overview:"A science series exploring the universe, the history of discovery and humanity's place in space.",year:"2014",rating:9.2,type:"documentary",genres:["Science","Space","Documentary"],source:"Streamivio Library",poster:null},
  {id:"tv-greatbritish",title:"The Great British Bake Off",overview:"Bakers compete in friendly challenges that test their creativity, skill and nerve.",year:"2010",rating:8.6,type:"reality",genres:["Reality","Cooking","Competition"],source:"Streamivio Library",poster:null},
  {id:"tv-amazingrace",title:"The Amazing Race",overview:"Teams race across countries, solving clues and completing challenges on a global adventure.",year:"2001",rating:7.8,type:"reality",genres:["Reality","Travel","Competition"],source:"Streamivio Library",poster:null},
  {id:"kids-bluey",title:"Bluey",overview:"A playful blue heeler pup turns everyday family life into imaginative adventures.",year:"2018",rating:9.3,type:"kids",genres:["Family","Animation","Comedy"],source:"Streamivio Library",poster:null},
  {id:"kids-avatar",title:"Avatar: The Last Airbender",overview:"A young airbender travels with friends to master the elements and bring balance to the world.",year:"2005",rating:9.3,type:"kids",genres:["Animation","Adventure","Fantasy"],source:"Streamivio Library",poster:null},
  {id:"kids-phineas",title:"Phineas and Ferb",overview:"Two inventive stepbrothers make each summer day an outrageous project while their sister tries to expose them.",year:"2007",rating:8.1,type:"kids",genres:["Animation","Comedy","Family"],source:"Streamivio Library",poster:null},
  {id:"a-onepiece",title:"One Piece",overview:"Monkey D. Luffy and his crew sail across dangerous seas in search of the legendary treasure known as One Piece.",year:"1999",rating:9.0,type:"anime",genres:["Anime","Adventure","Action","Comedy"],source:"Streamivio Library",poster:null},
  {id:"a-naruto",title:"Naruto",overview:"A determined young ninja seeks recognition and dreams of becoming the leader of his village.",year:"2002",rating:8.4,type:"anime",genres:["Anime","Action","Adventure"],source:"Streamivio Library",poster:null},
  {id:"a-fullmetal",title:"Fullmetal Alchemist: Brotherhood",overview:"Two brothers search for the Philosopher's Stone after an alchemical experiment changes their lives.",year:"2009",rating:9.1,type:"anime",genres:["Anime","Adventure","Drama","Fantasy"],source:"Streamivio Library",poster:null},
  {id:"a-haikyuu",title:"Haikyu!!",overview:"A short but determined volleyball player works to become a great athlete with his high-school team.",year:"2014",rating:8.7,type:"anime",genres:["Anime","Sport","Comedy"],source:"Streamivio Library",poster:null},
  {id:"a-spyfamily",title:"Spy x Family",overview:"A spy, an assassin and a telepath form a pretend family while hiding their secrets from one another.",year:"2022",rating:8.3,type:"anime",genres:["Anime","Comedy","Action","Family"],source:"Streamivio Library",poster:null},
  {id:"a-demon",title:"Demon Slayer",overview:"A young swordsman joins a dangerous fight against demons while seeking a cure for his sister.",year:"2019",rating:8.6,type:"anime",genres:["Anime","Action","Fantasy"],source:"Streamivio Library",poster:null}
];
