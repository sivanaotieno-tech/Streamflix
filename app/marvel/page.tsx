import Link from "next/link";
import { catalog } from "../data/catalog";

const mcuMovies = catalog
  .filter((item) => item.genres.includes("MCU"))
  .sort((a, b) => Number(a.year) - Number(b.year));

export default function MarvelPage() {
  return (
    <main className="min-h-screen bg-[#09090b] px-5 py-12 text-white md:px-12">
      <div className="mx-auto max-w-7xl">
        <Link href="/" className="text-sm text-zinc-400 hover:text-white">← Streamivio</Link>
        <h1 className="mt-5 text-4xl font-black tracking-tight md:text-6xl">Marvel Cinematic Universe</h1>
        <p className="mt-3 max-w-2xl text-zinc-400">MCU theatrical movies in release order. Browse the collection and open each title's Streamivio detail page.</p>
        <p className="mt-5 text-sm text-zinc-500">{mcuMovies.length} movies · Release order</p>
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {mcuMovies.map((movie) => (
            <Link key={movie.id} href={`/movie/${movie.id}`} className="group rounded-xl border border-white/10 bg-zinc-900 p-4 transition hover:border-white/30 hover:bg-zinc-800">
              <div className="flex aspect-[2/3] items-center justify-center rounded-lg bg-gradient-to-br from-red-950 via-zinc-800 to-zinc-950 p-3 text-center font-bold text-zinc-200">{movie.title}</div>
              <h2 className="mt-3 text-sm font-semibold">{movie.title}</h2>
              <p className="mt-1 text-xs text-zinc-500">{movie.year}</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
