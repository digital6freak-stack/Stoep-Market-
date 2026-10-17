import { useState, type FormEvent } from "react";
import { Alert, Button, Field, fieldClass } from "@/components/ui";

export type ProfileDraft = {
  displayName: string;
  area: string;
  bio: string;
};

export function ProfileForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial: ProfileDraft;
  submitLabel: string;
  onSubmit: (draft: ProfileDraft) => Promise<void>;
}) {
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSubmit(draft);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error ? <Alert>{error}</Alert> : null}
      <Field label="What should neighbours call you?" hint="A first name is enough.">
        <input
          className={fieldClass}
          value={draft.displayName}
          maxLength={40}
          required
          autoComplete="nickname"
          onChange={(event) => setDraft({ ...draft, displayName: event.target.value })}
        />
      </Field>
      <Field label="Your area" hint="Where you can hand something over.">
        <input
          className={fieldClass}
          value={draft.area}
          maxLength={60}
          required
          onChange={(event) => setDraft({ ...draft, area: event.target.value })}
        />
      </Field>
      <Field label="A line about you" hint="Optional. A landmark helps: near the park, the school, the taxi rank.">
        <textarea
          className={`${fieldClass} min-h-24 py-3`}
          value={draft.bio}
          maxLength={280}
          onChange={(event) => setDraft({ ...draft, bio: event.target.value })}
        />
      </Field>
      <Button type="submit" disabled={busy} className="w-full sm:w-auto">
        {busy ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
