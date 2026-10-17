import { Link, Navigate, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Frame, Opening, Shell, useMember } from "@/components/gate";
import { ListingCardView } from "@/components/listing-card";
import { Alert, Button, fieldClass } from "@/components/ui";
import { CATEGORIES, CONDITIONS, emptyBoard, errorText, type BoardQuery, type ListingCard } from "@/lib/market";
import { listListings } from "@/lib/market.functions";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const state = useMember();
  if (state.pending) return <Opening />;
  if (state.signedOut || state.failed === "Unauthorized") return <Landing />;
  if (state.failed || !state.me) {
    return <Opening message={state.failed ?? "Could not open the market"} onRetry={state.refresh} />;
  }
  if (!state.me.profile) return <Navigate to="/join" />;
  return (
    <Shell me={state.me}>
      <Board />
    </Shell>
  );
}

function Landing() {
  return (
    <Frame>
      <div className="grid items-center gap-10 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div>
          <p className="rise text-sm font-medium tracking-wide text-clay uppercase">Neighbourhood market</p>
          <h1 className="rise rise-2 display-bold mt-3 text-4xl text-ink md:text-6xl">
            Second-hand, from the step outside.
          </h1>
          <p className="rise rise-3 mt-4 max-w-xl text-pretty text-lg text-muted">
            Register once. Post what you're finished with. Search what the street is letting go of.
            Meet nearby and pay cash — Stoep never sits in the middle of the money.
          </p>
          <div className="mt-6">
            <Link to="/login" className="inline-flex min-h-11 items-center justify-center rounded-full bg-clay px-5 text-sm font-medium text-clay-ink">
              Register to join
            </Link>
          </div>
        </div>
        <ol className="space-y-3">
          {[
            ["1", "Take a stall", "Your name and the area you can meet in. Buyers and sellers are the same members."],
            ["2", "Put it out, or hunt", "Furniture, kids' things, the kettle you replaced. Prices in rands, including free."],
            ["3", "Meet in public", "Agree a place and a time. Hand it over yourself. No delivery, no checkout."],
          ].map(([n, title, copy], index) => (
            <li key={n} className={`lift rise rise-${index + 1} rounded-card border border-line bg-card p-4`}>
              <p className="display text-clay">{n}</p>
              <h2 className="display mt-1 text-2xl text-ink">{title}</h2>
              <p className="mt-1 text-pretty text-sm text-muted">{copy}</p>
            </li>
          ))}
        </ol>
      </div>
    </Frame>
  );
}

function Board() {
  const [draft, setDraft] = useState({ q: "", area: "", max: "", condition: "" });
  const [filters, setFilters] = useState<BoardQuery>(emptyBoard);
  const [rows, setRows] = useState<ListingCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    listListings({ data: filters })
      .then((next) => {
        if (!live) return;
        setRows(next);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!live) return;
        setError(errorText(err));
        setRows([]);
      });
    return () => {
      live = false;
    };
  }, [filters]);

  const filtering =
    Boolean(filters.q || filters.area || filters.category || filters.condition || filters.includeSold || filters.maxPrice >= 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="display-bold text-4xl text-ink">On the stoep</h1>
          <p className="mt-1 text-sm text-muted">Newest first. Cash in person, in rands.</p>
        </div>
        <Link
          to="/sell"
          className="inline-flex min-h-11 items-center rounded-full bg-clay px-5 text-sm font-medium text-clay-ink"
        >
          Put something out
        </Link>
      </div>

      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          const max = draft.max.trim();
          setFilters((current) => ({
            ...current,
            q: draft.q.trim(),
            area: draft.area.trim(),
            condition: draft.condition,
            maxPrice: max === "" ? -1 : Number(max),
          }));
        }}
      >
        <div className="flex gap-2">
          <input
            className={fieldClass}
            value={draft.q}
            placeholder="Search a kettle, a desk, a name…"
            aria-label="Search posts"
            onChange={(event) => setDraft({ ...draft, q: event.target.value })}
          />
          <Button type="submit" className="shrink-0">
            Search
          </Button>
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          <Chip active={filters.category === ""} onClick={() => setFilters((current) => ({ ...current, category: "" }))}>
            All
          </Chip>
          {CATEGORIES.map((item) => (
            <Chip
              key={item.id}
              active={filters.category === item.id}
              onClick={() => setFilters((current) => ({ ...current, category: item.id }))}
            >
              {item.label}
            </Chip>
          ))}
        </div>
        <details className="rounded-2xl border border-line bg-card px-4 py-3">
          <summary className="cursor-pointer text-sm font-medium text-ink">Area, condition, price</summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <input
              className={fieldClass}
              value={draft.area}
              placeholder="Area"
              aria-label="Area"
              onChange={(event) => setDraft({ ...draft, area: event.target.value })}
            />
            <select
              className={fieldClass}
              value={draft.condition}
              aria-label="Condition"
              onChange={(event) => setDraft({ ...draft, condition: event.target.value })}
            >
              <option value="">Any condition</option>
              {CONDITIONS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
            <input
              className={`${fieldClass} tabular-nums`}
              inputMode="numeric"
              value={draft.max}
              placeholder="Max rands"
              aria-label="Maximum price in rands"
              onChange={(event) => setDraft({ ...draft, max: event.target.value.replace(/[^\d]/g, "") })}
            />
          </div>
          <label className="mt-3 flex min-h-11 items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={filters.includeSold}
              onChange={(event) => setFilters((current) => ({ ...current, includeSold: event.target.checked }))}
            />
            Show things that have already gone
          </label>
        </details>
      </form>

      {error ? <Alert>{error}</Alert> : null}
      {rows === null ? (
        <p className="text-sm text-muted">Checking what's out…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-card border border-dashed border-line bg-card px-5 py-10 text-center">
          <h2 className="display text-3xl text-ink">{filtering ? "Nothing matches" : "The stoep is clear"}</h2>
          <p className="mx-auto mt-2 max-w-md text-pretty text-sm text-muted">
            {filtering
              ? "Try a wider search, or clear the filters."
              : "Be the first on your street to put something out."}
          </p>
          {filtering ? (
            <Button
              variant="line"
              className="mt-4"
              onClick={() => {
                setDraft({ q: "", area: "", max: "", condition: "" });
                setFilters(emptyBoard);
              }}
            >
              Clear filters
            </Button>
          ) : null}
        </div>
      ) : (
        <>
          <p className="text-sm text-muted tabular-nums">
            {rows.length === 24 ? "Latest 24 posts" : `${rows.length} ${rows.length === 1 ? "post" : "posts"}`}
          </p>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((listing) => (
              <li key={listing.id} className="min-w-0">
                <ListingCardView listing={listing} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function Chip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-medium ${active ? "bg-ink text-paper" : "bg-card text-ink border border-line"}`}
    >
      {children}
    </button>
  );
}
