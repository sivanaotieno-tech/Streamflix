import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { catalog } from "@/app/data/catalog";
import { TitleDetailPlayer } from "@/components/title-detail-player";
import { ImdbPoster } from "@/components/imdb-poster";

type Props = { params: Promise<{ id: string }> };

export default async function TvShowPage({ params }: Props) {
  const { id } = await params;
  const decoded = decodeURIComponent(id);
  const imdbId = decoded.startsWith("tt") ? decoded : decoded.startsWith("imdb-") ? decoded.slice(5) : "";
  const item = catalog.find((entry) =>
    (entry.id === decoded || (imdbId && entry.imdbId === imdbId)) &&
    ["tv", "anime", "documentary", "kids", "reality"].includes(entry.type)
  );
  if (!item) notFound();
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-6xl px-5 py-8 md:px-10">
        <Link href="/" className="text-sm text-zinc-400 hover:text-white">← Back to Streamivio</Link>
        <section className="mt-8 grid gap-8 md:grid-cols-[280px_1fr]">
          <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-zinc-900">
            {item.poster ? <Image src={item.poster} alt={item.title} fill sizes="(max-width: 768px) 80vw, 280px" className="object-cover" unoptimized /> : <ImdbPoster title={item.title} year={item.year} />}
          </div>
          <div className="flex flex-col justify-center">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-400">Streamivio · Series</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight md:text-6xl">{item.title}</h1>
            <p className="mt-4 text-sm text-zinc-400">{[item.year, item.genres.join(" · "), item.rating > 0 ? "IMDb " + item.rating.toFixed(1) : ""].filter(Boolean).join("  •  ")}</p>
            {item.overview && <p className="mt-6 max-w-2xl leading-7 text-zinc-300">{item.overview}</p>}
            <TitleDetailPlayer id={item.id} title={item.title} kind="tv" imdbId={item.imdbId} />
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/" className="rounded-lg bg-white px-5 py-3 text-sm font-semibold text-black">Explore catalogue</Link>
              {item.imdbId && <a href={"https://www.imdb.com/title/" + item.imdbId + "/"} target="_blank" rel="noreferrer" className="rounded-lg border border-zinc-700 px-5 py-3 text-sm font-semibold">IMDb details ↗</a>}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
