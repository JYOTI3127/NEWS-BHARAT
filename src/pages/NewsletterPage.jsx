import { useEffect, useMemo, useState } from "react";
import { apiUrl } from "../lib/api";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=1200&q=80";

const getNewsletterItems = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.newsletters)) return payload.newsletters;
  return [];
};

const getImageUrl = (newsletter) => {
  const image =
    newsletter?.image ||
    newsletter?.thumbnail ||
    newsletter?.cover_image ||
    newsletter?.featured_image ||
    newsletter?.image_url;

  if (!image) return FALLBACK_IMAGE;
  if (typeof image === "string") return image;
  return image?.url || FALLBACK_IMAGE;
};

const getReadMoreUrl = (newsletter) => {
  return (
    newsletter?.url ||
    newsletter?.link ||
    newsletter?.read_more_url ||
    newsletter?.article_url ||
    "#"
  );
};

const getNewsletterHtml = (newsletter) =>
  String(newsletter?.html || newsletter?.html_content || "").trim();

const stripHtml = (value) =>
  String(value || "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function NewsletterCard({ newsletter, isActive, onSelect, onDelete, deleting }) {
  const title = newsletter?.title || newsletter?.subject || "News4Bharat Newsletter";
  const description =
    newsletter?.description ||
    newsletter?.summary ||
    newsletter?.excerpt ||
    newsletter?.short_description ||
    "Stay informed with curated headlines, sharp context, and the stories shaping Bharat.";
  const imageUrl = getImageUrl(newsletter);
  const hasHtml = Boolean(getNewsletterHtml(newsletter));

  return (
    <article className={`group flex h-full flex-col overflow-hidden rounded-lg border bg-white shadow-[0_14px_40px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_55px_rgba(216,1,0,0.18)] ${isActive ? "border-[#D80100]" : "border-slate-100"}`}>
      <button
        type="button"
        onClick={onSelect}
        className="block overflow-hidden bg-slate-100 text-left"
        aria-label={`Open newsletter ${title}`}
      >
        <img
          src={imageUrl}
          alt={title}
          loading="lazy"
          className="h-52 w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105 min-[1440px]:h-60 min-[1800px]:h-72"
        />
      </button>

      <div className="flex flex-1 flex-col p-5 min-[425px]:p-6 min-[1440px]:p-7">
        <button
          type="button"
          onClick={onSelect}
          className="text-left"
        >
          <h3 className="line-clamp-2 text-lg font-semibold leading-snug text-slate-950 transition-colors duration-300 group-hover:text-[#D80100] min-[1440px]:text-xl min-[1800px]:text-2xl">
          {title}
          </h3>
        </button>

        <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600 min-[1440px]:text-[15px] min-[1800px]:text-base min-[1800px]:leading-7">
          {description || stripHtml(getNewsletterHtml(newsletter)).slice(0, 150)}
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onSelect}
            className="inline-flex w-fit items-center justify-center rounded-md bg-[#D80100] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(216,1,0,0.24)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#b80000] hover:shadow-[0_14px_32px_rgba(216,1,0,0.32)] focus:outline-none focus:ring-2 focus:ring-[#D80100] focus:ring-offset-2 active:translate-y-0 min-[1800px]:px-6 min-[1800px]:py-3 min-[1800px]:text-base"
          >
            {hasHtml ? "View Design" : "View Details"}
          </button>
          {newsletter?.id ? (
            <button
              type="button"
              onClick={onDelete}
              disabled={deleting}
              className="inline-flex w-fit items-center justify-center rounded-md border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-all duration-300 hover:border-[#D80100] hover:text-[#D80100] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deleting ? "Deleting..." : "Delete"}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function NewsletterSkeleton() {
  return (
    <article className="overflow-hidden rounded-lg border border-slate-100 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.08)]">
      <div className="h-52 animate-pulse bg-slate-200 min-[1440px]:h-60 min-[1800px]:h-72" />
      <div className="space-y-4 p-5 min-[425px]:p-6 min-[1440px]:p-7">
        <div className="h-5 w-4/5 animate-pulse rounded bg-slate-200" />
        <div className="space-y-2">
          <div className="h-3.5 animate-pulse rounded bg-slate-200" />
          <div className="h-3.5 w-11/12 animate-pulse rounded bg-slate-200" />
          <div className="h-3.5 w-8/12 animate-pulse rounded bg-slate-200" />
        </div>
        <div className="h-10 w-28 animate-pulse rounded-md bg-slate-200" />
      </div>
    </article>
  );
}

export default function NewsletterPage() {
  const [newsletters, setNewsletters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedNewsletterId, setSelectedNewsletterId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    const fetchNewsletters = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(apiUrl("/newsletters"), {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Newsletter request failed with status ${response.status}`);
        }

        const data = await response.json();
        const items = getNewsletterItems(data);
        setNewsletters(items);
        setSelectedNewsletterId((currentId) => currentId || items[0]?.id || null);
      } catch (fetchError) {
        if (fetchError?.name !== "AbortError") {
          setError("Unable to load newsletters right now.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchNewsletters();

    return () => controller.abort();
  }, []);

  const visibleNewsletters = useMemo(() => newsletters.slice(0, 9), [newsletters]);
  const selectedNewsletter = useMemo(() => {
    if (!visibleNewsletters.length) return null;
    return (
      visibleNewsletters.find((newsletter) => newsletter?.id === selectedNewsletterId) ||
      visibleNewsletters[0]
    );
  }, [selectedNewsletterId, visibleNewsletters]);
  const selectedHtml = getNewsletterHtml(selectedNewsletter);

  const deleteNewsletter = async (newsletter) => {
    if (!newsletter?.id || deletingId) return;

    setDeletingId(newsletter.id);
    setError("");

    try {
      const response = await fetch(apiUrl(`/newsletters/${newsletter.id}/`), {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`Delete failed with status ${response.status}`);
      }

      setNewsletters((current) => current.filter((item) => item?.id !== newsletter.id));
      setSelectedNewsletterId((currentId) =>
        currentId === newsletter.id ? null : currentId
      );
    } catch {
      setError("Unable to delete this newsletter right now.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <main className="min-h-screen bg-[#f8fafc] font-[Poppins,sans-serif]">
      <section
        className="w-full px-4 py-12 min-[375px]:px-5 min-[768px]:px-8 min-[1024px]:py-16 min-[1440px]:px-10 min-[1800px]:px-14 min-[1800px]:py-20"
        aria-labelledby="latest-newsletters-title"
      >
        <div className="mx-auto w-full max-w-[1180px] min-[1440px]:max-w-[1320px] min-[1800px]:max-w-[1640px] min-[2560px]:max-w-[1880px]">
          <div className="mx-auto mb-8 max-w-2xl text-center min-[1024px]:mb-10 min-[1800px]:mb-12">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-[#D80100] min-[1800px]:text-sm">
              News4Bharat Dispatch
            </p>
            <h1
              id="latest-newsletters-title"
              className="group relative inline-flex pb-3 text-2xl font-bold leading-tight text-slate-950 min-[375px]:text-3xl min-[768px]:text-4xl min-[1800px]:text-5xl"
            >
              Latest Newsletters
              <span className="absolute bottom-0 left-1/2 h-1 w-20 -translate-x-1/2 overflow-hidden rounded-full bg-slate-200">
                <span className="block h-full w-full origin-left scale-x-50 rounded-full bg-[#D80100] transition-transform duration-500 group-hover:scale-x-100" />
              </span>
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-slate-600 min-[768px]:text-base min-[1800px]:max-w-2xl min-[1800px]:text-lg min-[1800px]:leading-8">
              Curated editions with the biggest headlines, sharper context, and essential updates from across Bharat.
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-5 min-[768px]:grid-cols-2 min-[1024px]:grid-cols-3 min-[1440px]:gap-7 min-[1800px]:gap-8">
              {Array.from({ length: 6 }).map((_, index) => (
                <NewsletterSkeleton key={index} />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-lg border border-red-100 bg-white px-5 py-6 text-center text-sm font-medium text-red-600 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
              {error}
            </div>
          ) : visibleNewsletters.length ? (
            <>
              <div className="mb-8 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_14px_42px_rgba(15,23,42,0.08)]">
                {selectedHtml ? (
                  <iframe
                    title={selectedNewsletter?.title || selectedNewsletter?.subject || "Newsletter preview"}
                    srcDoc={selectedHtml}
                    className="block h-[720px] w-full border-0 bg-white min-[1800px]:h-[900px]"
                    sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                  />
                ) : (
                  <div className="p-6 text-sm leading-6 text-slate-700">
                    <h2 className="text-xl font-semibold text-slate-950">
                      {selectedNewsletter?.title || selectedNewsletter?.subject || "Newsletter"}
                    </h2>
                    <p className="mt-3">
                      {selectedNewsletter?.description ||
                        selectedNewsletter?.summary ||
                        "No HTML design is available for this newsletter yet."}
                    </p>
                    {getReadMoreUrl(selectedNewsletter) !== "#" ? (
                      <a
                        href={getReadMoreUrl(selectedNewsletter)}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-5 inline-flex rounded-md bg-[#D80100] px-4 py-2 text-sm font-semibold text-white"
                      >
                        Open Link
                      </a>
                    ) : null}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-5 min-[768px]:grid-cols-2 min-[1024px]:grid-cols-3 min-[1440px]:gap-7 min-[1800px]:gap-8">
                {visibleNewsletters.map((newsletter, index) => (
                  <NewsletterCard
                    key={newsletter?.id || newsletter?.slug || newsletter?.url || index}
                    newsletter={newsletter}
                    isActive={selectedNewsletter === newsletter}
                    deleting={deletingId === newsletter?.id}
                    onSelect={() => setSelectedNewsletterId(newsletter?.id || null)}
                    onDelete={() => deleteNewsletter(newsletter)}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-slate-100 bg-white px-5 py-8 text-center shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
              <h2 className="text-lg font-semibold text-slate-950">No newsletters published yet.</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Fresh editions will appear here as soon as they are available.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
