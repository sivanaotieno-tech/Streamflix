-- Streamivio Supabase catalog schema and starter seed.
-- Run this entire file in Supabase Dashboard -> SQL Editor.
create table if not exists public.titles (
  id text primary key,
  title text not null,
  overview text not null default '',
  release_year integer check (release_year is null or release_year between 1888 and 2200),
  rating numeric(3,1) check (rating is null or rating between 0 and 10),
  type text not null check (type in ('movie','tv','anime','documentary','kids','reality')),
  genres text[] not null default '{}',
  country text[] not null default '{}',
  age_rating text,
  poster_url text,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.titles enable row level security;
drop policy if exists "Public can read published titles" on public.titles;
create policy "Public can read published titles"
  on public.titles for select
  using (is_published = true);

create index if not exists titles_type_idx on public.titles(type);
create index if not exists titles_release_year_idx on public.titles(release_year desc);
create index if not exists titles_rating_idx on public.titles(rating desc);
create index if not exists titles_genres_idx on public.titles using gin(genres);
create index if not exists titles_country_idx on public.titles using gin(country);
create index if not exists titles_search_idx on public.titles using gin (
  to_tsvector('english', coalesce(title,'') || ' ' || coalesce(overview,''))
);

-- Public poster delivery via Supabase Storage. Upload files through the Dashboard;
-- public write access is intentionally NOT enabled.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('title-posters','title-posters',true,5242880,array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do update set public=true;

drop policy if exists "Public can view title posters" on storage.objects;
create policy "Public can view title posters"
  on storage.objects for select
  using (bucket_id = 'title-posters');

insert into public.titles (id,title,overview,release_year,rating,type,genres,country,age_rating)
values
('m-matrix','The Matrix','A computer hacker learns that reality may be a simulation and joins a rebellion against its controllers.',1999,8.7,'movie',ARRAY['Action','Sci-Fi' ]::text[],ARRAY['United States' ]::text[],'R'),
('m-inception','Inception','A skilled thief who steals secrets through dreams is offered a chance to erase his past by planting an idea.',2010,8.8,'movie',ARRAY['Action','Sci-Fi','Thriller' ]::text[],ARRAY['United States','United Kingdom' ]::text[],'PG-13'),
('m-interstellar','Interstellar','Explorers travel beyond this galaxy to discover whether humankind can find a future among the stars.',2014,8.7,'movie',ARRAY['Adventure','Drama','Sci-Fi' ]::text[],ARRAY['United States','United Kingdom' ]::text[],'PG-13'),
('m-spiderverse','Spider-Man: Into the Spider-Verse','A Brooklyn teenager meets other Spider-heroes from different dimensions and discovers what being a hero means.',2018,8.4,'movie',ARRAY['Action','Animation','Adventure' ]::text[],ARRAY['United States' ]::text[],'PG'),
('m-paddington','Paddington 2','A kind bear tries to find the perfect gift for his aunt and becomes caught up in a mystery.',2017,7.8,'movie',ARRAY['Comedy','Family' ]::text[],ARRAY['United Kingdom','France' ]::text[],'PG'),
('m-knivesout','Knives Out','A detective investigates a famous novelist''s death while a complicated family becomes full of suspects.',2019,7.9,'movie',ARRAY['Mystery','Comedy','Crime' ]::text[],ARRAY['United States' ]::text[],'PG-13'),
('m-hiddenfigures','Hidden Figures','Three brilliant Black women mathematicians help NASA make history during the space race.',2016,7.8,'movie',ARRAY['Drama','History' ]::text[],ARRAY['United States' ]::text[],'PG'),
('m-coco','Coco','A young musician journeys into the Land of the Dead to uncover the truth about his family''s history.',2017,8.4,'movie',ARRAY['Animation','Family','Music' ]::text[],ARRAY['United States' ]::text[],'PG'),
('m-jumanji','Jumanji: Welcome to the Jungle','Four students are pulled into a video game where they must work together to get home.',2017,6.9,'movie',ARRAY['Adventure','Comedy','Fantasy' ]::text[],ARRAY['United States' ]::text[],'PG-13'),
('m-getout','Get Out','A weekend visit to meet a girlfriend''s family turns into a disturbing mystery.',2017,7.8,'movie',ARRAY['Horror','Mystery','Thriller' ]::text[],ARRAY['United States' ]::text[],'R'),
('m-pride','Pride & Prejudice','Elizabeth Bennet navigates first impressions, family expectations and unexpected romance.',2005,7.8,'movie',ARRAY['Romance','Drama' ]::text[],ARRAY['United Kingdom','United States' ]::text[],'PG'),
('m-martian','The Martian','An astronaut stranded on Mars uses science, humour and determination to survive.',2015,8,'movie',ARRAY['Adventure','Drama','Sci-Fi' ]::text[],ARRAY['United States' ]::text[],'PG-13'),
('m-queen','Queen of Katwe','A Ugandan girl discovers a talent for chess and pursues a new future for herself and her family.',2016,7.4,'movie',ARRAY['Drama','Sport','Family' ]::text[],ARRAY['Uganda','United States' ]::text[],'PG'),
('m-lion','The Lion King','A young lion faces responsibility and finds the courage to reclaim his place in the circle of life.',1994,8.5,'movie',ARRAY['Animation','Adventure','Family' ]::text[],ARRAY['United States' ]::text[],'G'),
('m-wakanda','Black Panther','A new king must protect his nation while confronting a challenge to the future of Wakanda.',2018,7.3,'movie',ARRAY['Action','Adventure','Sci-Fi' ]::text[],ARRAY['United States' ]::text[],'PG-13'),
('tv-brooklyn99','Brooklyn Nine-Nine','A talented but immature detective and his colleagues solve crimes at a New York precinct.',2013,8.4,'tv',ARRAY['Comedy','Crime' ]::text[],ARRAY['United States' ]::text[],'TV-14'),
('tv-planetearth','Planet Earth','A sweeping natural-history series exploring remarkable habitats and wildlife around the world.',2006,9.4,'documentary',ARRAY['Nature','Science','Documentary' ]::text[],ARRAY['United Kingdom' ]::text[],'TV-PG'),
('tv-blueplanet','The Blue Planet','Discover the extraordinary life, landscapes and ecosystems beneath the world''s oceans.',2001,9,'documentary',ARRAY['Nature','Science','Documentary' ]::text[],ARRAY['United Kingdom' ]::text[],'TV-G'),
('tv-sherlock','Sherlock','A modern consulting detective and his flatmate solve unusual mysteries in London.',2010,9.1,'tv',ARRAY['Mystery','Crime','Drama' ]::text[],ARRAY['United Kingdom' ]::text[],'TV-14'),
('tv-modernfamily','Modern Family','Three connected families navigate everyday chaos, growing up and growing together.',2009,8.5,'tv',ARRAY['Comedy','Family' ]::text[],ARRAY['United States' ]::text[],'TV-PG'),
('tv-doctorwho','Doctor Who','A time-travelling adventurer explores space and time with a succession of human companions.',2005,8.5,'tv',ARRAY['Sci-Fi','Adventure','Drama' ]::text[],ARRAY['United Kingdom' ]::text[],'TV-PG'),
('tv-cosmos','Cosmos','A science series exploring the universe, the history of discovery and humanity''s place in space.',2014,9.2,'documentary',ARRAY['Science','Space','Documentary' ]::text[],ARRAY['United States' ]::text[],'TV-PG'),
('tv-greatbritish','The Great British Bake Off','Bakers compete in friendly challenges that test their creativity, skill and nerve.',2010,8.6,'reality',ARRAY['Reality','Cooking','Competition' ]::text[],ARRAY['United Kingdom' ]::text[],'TV-PG'),
('tv-amazingrace','The Amazing Race','Teams race across countries, solving clues and completing challenges on a global adventure.',2001,7.8,'reality',ARRAY['Reality','Travel','Competition' ]::text[],ARRAY['United States' ]::text[],'TV-PG'),
('kids-bluey','Bluey','A playful blue heeler pup turns everyday family life into imaginative adventures.',2018,9.3,'kids',ARRAY['Family','Animation','Comedy' ]::text[],ARRAY['Australia','United Kingdom' ]::text[],'TV-Y'),
('kids-avatar','Avatar: The Last Airbender','A young airbender travels with friends to master the elements and bring balance to the world.',2005,9.3,'kids',ARRAY['Animation','Adventure','Fantasy' ]::text[],ARRAY['United States' ]::text[],'TV-Y7'),
('kids-phineas','Phineas and Ferb','Two inventive stepbrothers make each summer day an outrageous project while their sister tries to expose them.',2007,8.1,'kids',ARRAY['Animation','Comedy','Family' ]::text[],ARRAY['United States' ]::text[],'TV-G'),
('a-onepiece','One Piece','Monkey D. Luffy and his crew sail across dangerous seas in search of the legendary treasure known as One Piece.',1999,9,'anime',ARRAY['Anime','Adventure','Action','Comedy' ]::text[],ARRAY['Japan' ]::text[],'TV-14'),
('a-naruto','Naruto','A determined young ninja seeks recognition and dreams of becoming the leader of his village.',2002,8.4,'anime',ARRAY['Anime','Action','Adventure' ]::text[],ARRAY['Japan' ]::text[],'TV-14'),
('a-fullmetal','Fullmetal Alchemist: Brotherhood','Two brothers search for the Philosopher''s Stone after an alchemical experiment changes their lives.',2009,9.1,'anime',ARRAY['Anime','Adventure','Drama','Fantasy' ]::text[],ARRAY['Japan' ]::text[],'TV-14'),
('a-haikyuu','Haikyu!!','A short but determined volleyball player works to become a great athlete with his high-school team.',2014,8.7,'anime',ARRAY['Anime','Sport','Comedy' ]::text[],ARRAY['Japan' ]::text[],'TV-14'),
('a-spyfamily','Spy x Family','A spy, an assassin and a telepath form a pretend family while hiding their secrets from one another.',2022,8.3,'anime',ARRAY['Anime','Comedy','Action','Family' ]::text[],ARRAY['Japan' ]::text[],'TV-14'),
('a-demon','Demon Slayer','A young swordsman joins a dangerous fight against demons while seeking a cure for his sister.',2019,8.6,'anime',ARRAY['Anime','Action','Fantasy' ]::text[],ARRAY['Japan' ]::text[],'TV-14')
on conflict (id) do update set
  title=excluded.title,
  overview=excluded.overview,
  release_year=excluded.release_year,
  rating=excluded.rating,
  type=excluded.type,
  genres=excluded.genres,
  country=excluded.country,
  age_rating=excluded.age_rating,
  updated_at=now();
