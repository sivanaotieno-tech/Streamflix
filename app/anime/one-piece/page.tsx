import Link from "next/link";

const CRUNCHYROLL_URL = "https://www.crunchyroll.com/series/GRMG8ZQZR/one-piece";

function getLicensedEmbedUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_ONE_PIECE_EMBED_URL;
  if (!raw) return null;

  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export default function OnePiecePage() {
  const embedUrl = getLicensedEmbedUrl();

  return (
    <main className="min-h-screen bg-[#141414] px-4 py-6 text-white sm:px-8 md:px-12">
      <nav className="mb-8 flex items-center justify-between">
        <Link href="/" className="text-xl font-black tracking-[-.06em] text-[#e50914] sm:text-2xl">
          STREAMIVIO
        </Link>
        <Link href="/" className="text-sm text-zinc-300 hover:text-white">
          Back to browse
        </Link>
      </nav>

      <section className="mx-auto max-w-6xl">
        <p className="mb-2 text-xs font-bold uppercase tracking-[.25em] text-red-400">
          Anime Spotlight
        </p>
        <h1 className="text-3xl font-black sm:text-5xl">One Piece</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">
          Follow Luffy and the Straw Hat crew on their journey to find the legendary treasure.
        </p>

        <div className="mt-7 overflow-hidden rounded-xl border border-white/10 bg-black shadow-2xl">
          {embedUrl ? (
            <iframe
              src={embedUrl}
              title="One Piece authorized video player"
              className="aspect-video w-full"
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          ) : (
            <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center sm:min-h-96">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-3xl">▶</div>
              <h2 className="text-xl font-bold">Ready to watch?</h2>
              <p className="mt-2 max-w-lg text-sm leading-6 text-zinc-400">
                Streamivio does not have a licensed in-site video embed configured yet. You can open the official series page below while you connect a provider-approved embed.
              </p>
              <a
                href={CRUNCHYROLL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 rounded bg-[#e50914] px-5 py-3 text-sm font-bold text-white hover:bg-red-700"
              >
                Watch on Crunchyroll
              </a>
            </div>
          )}
        </div>

        <p className="mt-4 text-xs leading-5 text-zinc-500">
          In-site playback requires an HTTPS embed URL explicitly supplied or authorized by the rights holder or licensed provider. A normal streaming-page URL may not be embeddable. Configure NEXT_PUBLIC_ONE_PIECE_EMBED_URL only with a provider-approved player URL, then redeploy.
        </p>
      </section>
    </main>
  );
}
