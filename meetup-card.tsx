import { Link } from "@tanstack/react-router";
import { formatPrice, formatWhen, meetupLabel, type Meetup } from "@/lib/market";
import { Button } from "@/components/ui";

export function MeetupCard({
  meetup,
  busy,
  onAccept,
  onDecline,
  onCancel,
}: {
  meetup: Meetup;
  busy?: boolean;
  onAccept?: () => void;
  onDecline?: () => void;
  onCancel?: () => void;
}) {
  const other = meetup.role === "seller" ? meetup.buyerName : meetup.sellerName;
  return (
    <article className="lift rounded-card border border-line bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link to="/listing/$id" params={{ id: String(meetup.listingId) }} className="display text-xl text-ink">
            {meetup.listingTitle}
          </Link>
          <p className="text-sm text-muted tabular-nums">{formatPrice(meetup.listingPrice)}</p>
        </div>
        <span className="shrink-0 rounded-full bg-sand px-2.5 py-1 text-xs font-medium text-ink">
          {meetupLabel(meetup.status)}
        </span>
      </div>
      <p className="mt-3 text-sm text-ink">
        {meetup.role === "seller" ? `${other} wants to collect` : `You asked ${other}`}
        {formatWhen(meetup.createdAt) ? ` · ${formatWhen(meetup.createdAt)}` : ""}
      </p>
      <p className="mt-2 text-pretty text-ink">{meetup.message}</p>
      <p className="mt-2 text-sm text-muted">
        {meetup.place}
        {meetup.whenNote ? ` · ${meetup.whenNote}` : ""}
      </p>
      {meetup.status === "open" && meetup.role === "seller" && onAccept && onDecline ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button disabled={busy} onClick={onAccept}>
            Agree to meet
          </Button>
          <Button variant="line" disabled={busy} onClick={onDecline}>
            Decline
          </Button>
        </div>
      ) : null}
      {(meetup.status === "open" || meetup.status === "accepted") && meetup.role === "buyer" && onCancel ? (
        <div className="mt-4">
          <Button variant="line" disabled={busy} onClick={onCancel}>
            Cancel
          </Button>
        </div>
      ) : null}
    </article>
  );
}
