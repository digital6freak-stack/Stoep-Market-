import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { MemberGate } from "@/components/gate";
import { CategoryPlate, StatusPill } from "@/components/listing-card";
import { ListingForm, type ListingDraft } from "@/components/listing-form";
import { MeetupCard } from "@/components/meetup-card";
import { Alert, Button, Field, fieldClass } from "@/components/ui";
import {
  categoryById,
  conditionLabel,
  errorText,
  formatPrice,
  formatWhen,
  type ListingPageData,
} from "@/lib/market";
import {
  cancelMeetup,
  deleteListing,
  getListing,
  requestMeetup,
  respondMeetup,
  setListingStatus,
  updateListing,
} from "@/lib/market.functions";

export const Route = createFileRoute("/listing/$id")({ component: ListingRoute });

function ListingRoute() {
  const { id } = Route.useParams();
  return (
    <MemberGate>
      {() => <ListingScreen id={Number(id)} />}
    </MemberGate>
  );
}

function ListingScreen({ id }: { id: number }) {
  const navigate = useNavigate();
  const [page, setPage] = useState<ListingPageData | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!Number.isInteger(id) || id < 1) {
      setPage(null);
      return;
    }
    let live = true;
    getListing({ data: { id } })
      .then((next) => {
        if (live) setPage(next);
      })
      .catch((err: unknown) => {
        if (!live) return;
        setError(errorText(err));
        setPage(null);
      });
    return () => {
      live = false;
    };
  }, [id, tick]);

  async function run(task: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await task();
      setTick((n) => n + 1);
      setEditing(false);
      setConfirmDelete(false);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  if (page === undefined) {
    return <p className="text-sm text-muted">Fetching that post…</p>;
  }
  if (!page) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <h1 className="display-bold text-4xl text-ink">That post is gone</h1>
        <p className="mt-2 text-sm text-muted">{error ?? "It may have been removed."}</p>
        <Link to="/" className="mt-4 inline-flex min-h-11 items-center text-sm font-medium text-clay">
          Back to the board
        </Link>
      </div>
    );
  }

  const { listing } = page;
  return (
    <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <div>
        <Link to="/" className="text-sm font-medium text-muted">
          Back to the board
        </Link>
        <div className="lift mt-3 overflow-hidden rounded-card border border-line bg-card">
          {listing.photo ? (
            <img src={listing.photo} alt="" className="aspect-[4/3] w-full object-cover" />
          ) : (
            <CategoryPlate category={listing.category} className="aspect-[4/3] w-full" />
          )}
        </div>
      </div>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill status={listing.status} />
          <span className="text-sm text-muted">
            {categoryById(listing.category).label} · {conditionLabel(listing.condition)}
          </span>
        </div>
        <h1 className="display-bold text-4xl text-ink">{listing.title}</h1>
        <p className="display text-3xl text-clay tabular-nums">{formatPrice(listing.price)}</p>
        <p className="text-pretty whitespace-pre-wrap text-ink">{listing.description}</p>
        <p className="text-sm text-muted">
          Pickup in {listing.area}
          {formatWhen(listing.createdAt) ? ` · posted ${formatWhen(listing.createdAt)}` : ""}
        </p>
        <div className="rounded-card border border-line bg-card p-4">
          <p className="text-sm text-muted">{listing.mine ? "Your stall" : "Posted by"}</p>
          <p className="display text-2xl text-ink">{listing.sellerName}</p>
          {listing.sellerBio ? <p className="mt-1 text-pretty text-sm text-muted">{listing.sellerBio}</p> : null}
        </div>
        {error ? <Alert>{error}</Alert> : null}
        {listing.mine ? (
          <OwnerPanel
            page={page}
            editing={editing}
            busy={busy}
            confirmDelete={confirmDelete}
            onEdit={() => setEditing((value) => !value)}
            onConfirmDelete={() => setConfirmDelete(true)}
            onRun={run}
            onDelete={async () => {
              await deleteListing({ data: { id: listing.id } });
              await navigate({ to: "/" });
            }}
          />
        ) : (
          <BuyerPanel page={page} busy={busy} onRun={run} />
        )}
      </div>
    </div>
  );
}

function OwnerPanel({
  page,
  editing,
  busy,
  confirmDelete,
  onEdit,
  onConfirmDelete,
  onRun,
  onDelete,
}: {
  page: ListingPageData;
  editing: boolean;
  busy: boolean;
  confirmDelete: boolean;
  onEdit: () => void;
  onConfirmDelete: () => void;
  onRun: (task: () => Promise<unknown>) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const { listing, requests } = page;
  const draft: ListingDraft = {
    title: listing.title,
    description: listing.description,
    price: String(listing.price),
    category: listing.category,
    condition: listing.condition,
    area: listing.area,
    photo: listing.photo,
    photoAction: "keep",
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button variant="line" disabled={busy} onClick={onEdit}>
          {editing ? "Close editor" : "Edit post"}
        </Button>
        {listing.status !== "sold" ? (
          <Button disabled={busy} onClick={() => onRun(() => setListingStatus({ data: { id: listing.id, status: "sold" } }))}>
            Mark as gone
          </Button>
        ) : (
          <Button
            variant="moss"
            disabled={busy}
            onClick={() => onRun(() => setListingStatus({ data: { id: listing.id, status: "available" } }))}
          >
            Put it back
          </Button>
        )}
        {listing.status === "holding" ? (
          <Button
            variant="line"
            disabled={busy}
            onClick={() => onRun(() => setListingStatus({ data: { id: listing.id, status: "available" } }))}
          >
            Cancel the pickup
          </Button>
        ) : null}
        {confirmDelete ? (
          <Button variant="ink" disabled={busy} onClick={() => onRun(onDelete)}>
            Remove for good
          </Button>
        ) : (
          <Button variant="quiet" disabled={busy} onClick={onConfirmDelete}>
            Remove
          </Button>
        )}
      </div>
      {editing ? (
        <ListingForm
          initial={draft}
          submitLabel="Save changes"
          onSubmit={(next) =>
            onRun(() =>
              updateListing({
                data: {
                  id: listing.id,
                  title: next.title,
                  description: next.description,
                  price: Number(next.price || "0"),
                  category: next.category,
                  condition: next.condition,
                  area: next.area,
                  photo: next.photo,
                  photoAction: next.photoAction,
                },
              }),
            )
          }
        />
      ) : null}
      <section className="space-y-3">
        <h2 className="display text-2xl text-ink">People who asked</h2>
        {requests.length === 0 ? (
          <p className="text-sm text-muted">No one has asked yet.</p>
        ) : (
          requests.map((meetup) => (
            <MeetupCard
              key={meetup.id}
              meetup={meetup}
              busy={busy}
              onAccept={() => onRun(() => respondMeetup({ data: { id: meetup.id, status: "accepted" } }))}
              onDecline={() => onRun(() => respondMeetup({ data: { id: meetup.id, status: "declined" } }))}
            />
          ))
        )}
      </section>
    </div>
  );
}

function BuyerPanel({
  page,
  busy,
  onRun,
}: {
  page: ListingPageData;
  busy: boolean;
  onRun: (task: () => Promise<unknown>) => Promise<void>;
}) {
  const { listing, myMeetup } = page;
  const [message, setMessage] = useState("");
  const [place, setPlace] = useState("");
  const [whenNote, setWhenNote] = useState("");
  const openRequest = myMeetup && (myMeetup.status === "open" || myMeetup.status === "accepted");

  if (listing.status === "sold") {
    return <p className="text-sm text-muted">This has already gone.</p>;
  }

  if (openRequest && myMeetup) {
    return (
      <MeetupCard
        meetup={myMeetup}
        busy={busy}
        onCancel={() => onRun(() => cancelMeetup({ data: { id: myMeetup.id } }))}
      />
    );
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void onRun(() =>
      requestMeetup({
        data: { listingId: listing.id, message, place, whenNote },
      }),
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-card border border-line bg-card p-4">
      <h2 className="display text-2xl text-ink">Ask to meet</h2>
      <p className="text-pretty text-sm text-muted">
        {listing.status === "holding"
          ? "Someone is already arranging pickup. You can still ask, in case it falls through."
          : "Suggest a public place and a time. Pay them in cash when you collect it."}
      </p>
      <Field label="Note">
        <textarea
          className={`${fieldClass} min-h-24 py-3`}
          value={message}
          required
          maxLength={500}
          onChange={(event) => setMessage(event.target.value)}
        />
      </Field>
      <Field label="Where">
        <input className={fieldClass} value={place} required maxLength={120} onChange={(event) => setPlace(event.target.value)} />
      </Field>
      <Field label="When">
        <input
          className={fieldClass}
          value={whenNote}
          required
          maxLength={120}
          placeholder="Saturday morning"
          onChange={(event) => setWhenNote(event.target.value)}
        />
      </Field>
      <Button type="submit" disabled={busy}>
        {busy ? "Sending…" : "Send request"}
      </Button>
    </form>
  );
}
