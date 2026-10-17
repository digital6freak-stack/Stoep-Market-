import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MemberGate, SignOutButton } from "@/components/gate";
import { ListingCardView } from "@/components/listing-card";
import { ProfileForm } from "@/components/profile-form";
import { errorText, formatWhen, type ListingCard, type Profile } from "@/lib/market";
import { listMine, saveProfile } from "@/lib/market.functions";

export const Route = createFileRoute("/me")({ component: MePage });

function MePage() {
  return (
    <MemberGate>
      {(profile, refresh) => <Stall profile={profile} refresh={refresh} />}
    </MemberGate>
  );
}

function Stall({ profile, refresh }: { profile: Profile; refresh: () => void }) {
  const [rows, setRows] = useState<ListingCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let live = true;
    listMine()
      .then((next) => {
        if (live) setRows(next);
      })
      .catch((err: unknown) => {
        if (live) setError(errorText(err));
      });
    return () => {
      live = false;
    };
  }, [profile.displayName, profile.area, profile.bio]);

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="display-bold text-4xl text-ink">{profile.displayName}</h1>
          <p className="mt-1 text-sm text-muted">
            {profile.area}
            {formatWhen(profile.createdAt) ? ` · joined ${formatWhen(profile.createdAt)}` : ""}
          </p>
        </div>
        <SignOutButton />
      </div>
      <section className="space-y-3">
        <h2 className="display text-2xl text-ink">Your details</h2>
        {saved ? <p className="text-sm text-moss">Saved.</p> : null}
        <ProfileForm
          initial={{ displayName: profile.displayName, area: profile.area, bio: profile.bio }}
          submitLabel="Save"
          onSubmit={async (draft) => {
            await saveProfile({ data: draft });
            setSaved(true);
            refresh();
          }}
        />
      </section>
      <section className="space-y-3">
        <h2 className="display text-2xl text-ink">Your posts</h2>
        {error ? <p className="text-sm text-clay">{error}</p> : null}
        {rows === null ? (
          <p className="text-sm text-muted">Loading your posts…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-pretty text-muted">You haven't put anything out yet.</p>
        ) : (
          <ul className="grid gap-4">
            {rows.map((listing) => (
              <li key={listing.id}>
                <ListingCardView listing={listing} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
