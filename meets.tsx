import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MemberGate } from "@/components/gate";
import { MeetupCard } from "@/components/meetup-card";
import { Alert } from "@/components/ui";
import { errorText, type Meetup } from "@/lib/market";
import { cancelMeetup, listMeetups, respondMeetup } from "@/lib/market.functions";

export const Route = createFileRoute("/meets")({ component: MeetsPage });

function MeetsPage() {
  return (
    <MemberGate>
      {() => <Meets />}
    </MemberGate>
  );
}

function Meets() {
  const [rows, setRows] = useState<Meetup[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [tab, setTab] = useState<"in" | "out">("in");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let live = true;
    listMeetups()
      .then((next) => {
        if (!live) return;
        setRows(next);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!live) return;
        setError(errorText(err));
      });
    return () => {
      live = false;
    };
  }, [tick]);

  const incoming = (rows ?? []).filter((row) => row.role === "seller");
  const outgoing = (rows ?? []).filter((row) => row.role === "buyer");
  const shown = tab === "in" ? incoming : outgoing;

  async function run(id: number, task: () => Promise<unknown>) {
    setBusy(id);
    setError(null);
    try {
      await task();
      setTick((n) => n + 1);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div>
        <h1 className="display-bold text-4xl text-ink">Meetups</h1>
        <p className="mt-2 text-pretty text-sm text-muted">
          Agree a public place, in daylight. Stoep doesn't take payment or arrange a driver.
        </p>
      </div>
      <div className="flex gap-2" role="tablist">
        <TabButton active={tab === "in"} onClick={() => setTab("in")} label={`Asked of you (${incoming.length})`} />
        <TabButton active={tab === "out"} onClick={() => setTab("out")} label={`You asked (${outgoing.length})`} />
      </div>
      {error ? <Alert>{error}</Alert> : null}
      {rows === null ? (
        <p className="text-sm text-muted">Looking for meetups…</p>
      ) : shown.length === 0 ? (
        <p className="rounded-card border border-dashed border-line bg-card px-4 py-8 text-center text-sm text-pretty text-muted">
          {tab === "in"
            ? "When someone wants something you've posted, it lands here."
            : "Open a post and ask to meet. Your note shows up here."}
        </p>
      ) : (
        <ul className="space-y-3">
          {shown.map((meetup) => (
            <li key={meetup.id}>
              <MeetupCard
                meetup={meetup}
                busy={busy === meetup.id}
                onAccept={() => run(meetup.id, () => respondMeetup({ data: { id: meetup.id, status: "accepted" } }))}
                onDecline={() => run(meetup.id, () => respondMeetup({ data: { id: meetup.id, status: "declined" } }))}
                onCancel={() => run(meetup.id, () => cancelMeetup({ data: { id: meetup.id } }))}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TabButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`min-h-11 flex-1 rounded-full px-3 text-sm font-medium ${active ? "bg-ink text-paper" : "border border-line bg-card text-ink"}`}
    >
      {label}
    </button>
  );
}
