import Link from "next/link";

const ONE_PACE_PROJECT_URL = "https://onepace.net/";

const ARCS = [
  "Romance Dawn", "Orange Town", "Syrup Village", "Gaimon", "Baratie",
  "Arlong Park", "Buggy's Crew", "Loguetown", "Reverse Mountain", "Whisky Peak",
  "Little Garden", "Drum Island", "Alabasta", "Jaya", "Skypiea",
  "Long Ring Long Land", "Water Seven", "Enies Lobby", "Post-Enies Lobby",
  "Thriller Bark", "Sabaody Archipelago", "Amazon Lily", "Impel Down",
  "Marineford", "Post-War", "Return to Sabaody", "Fish-Man Island",
  "Punk Hazard", "Dressrosa", "Zou", "Whole Cake Island", "Reverie",
  "Wano", "Egghead", "Elbaph",
];

export default function OnePiecePage() {
  return (
    <main className="min-h-screen bg-[#101014] px-4 py-6 text-white sm:px-8 md:px-12">
      <nav className="mx-auto mb-10 flex max-w-7xl items-center justify-between">
        <Link href="/" className="text-xl font-black tracking-[-.06em] text-[#e50914] sm:text-2xl">STREAMIVIO</Link>
        <Link href="/" className="text-sm text-zinc-300 hover:text-white">Back to browse</Link>
      </nav>
      <section className="mx-auto max-w-7xl">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#2b1716] via-[#17151b] to-[#101014] p-7 sm:p-12">
          <p className="text-xs font-bold uppercase tracking-[.28em] text-amber-300">One Piece · fan project guide</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">ONE PACE</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-300 sm:text-base">
            One Pace is an independently made fan edit that aims to bring the anime closer to the manga's pacing. This Streamivio page is an arc guide only: it does not host episodes, extract video links, or provide unlicensed streams.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href={ONE_PACE_PROJECT_URL} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-white/20 px-5 py-3 text-sm font-bold hover:bg-white/10">Visit the One Pace project</a>
            <a href="https://one-piece.com/" target="_blank" rel="noopener noreferrer" className="rounded-lg bg-[#e50914] px-5 py-3 text-sm font-bold hover:bg-red-700">Official One Piece website</a>
          </div>
          <p className="mt-4 text-xs leading-5 text-zinc-500">
            One Pace is a fan project and is not affiliated with or endorsed by the One Piece rights holders. Use licensed services in your region to watch the original anime.
          </p>
        </div>
        <section className="mt-10">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.2em] text-amber-300">Grand Line route</p>
              <h2 className="mt-1 text-2xl font-bold">Arc guide</h2>
            </div>
            <span className="text-xs text-zinc-500">{ARCS.length} arcs</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ARCS.map((arc, index) => (
              <article key={arc} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[.035] p-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-xs font-bold text-amber-200">{String(index + 1).padStart(2, "0")}</span>
                <h3 className="min-w-0 flex-1 text-sm font-semibold">{arc}</h3>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
