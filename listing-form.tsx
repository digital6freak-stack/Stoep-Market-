import { useRef, useState, type FormEvent } from "react";
import { CATEGORIES, CONDITIONS } from "@/lib/market";
import { Alert, Button, Field, fieldClass } from "@/components/ui";

export type ListingDraft = {
  title: string;
  description: string;
  price: string;
  category: string;
  condition: string;
  area: string;
  photo: string | null;
  photoAction: "keep" | "set" | "clear";
};

async function readPhoto(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Choose a photo");
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Could not read that photo. Try a JPEG."));
      image.src = url;
    });
    const max = 960;
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not read that photo");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL("image/jpeg", 0.72);
    if (data.length > 220_000) throw new Error("That photo is still too big. Try a smaller one.");
    return data;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function ListingForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial: ListingDraft;
  submitLabel: string;
  onSubmit: (draft: ListingDraft) => Promise<void>;
}) {
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const preview = draft.photoAction === "clear" ? null : draft.photo;

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
      <Field label="What is it?">
        <input
          className={fieldClass}
          value={draft.title}
          maxLength={80}
          required
          onChange={(event) => setDraft({ ...draft, title: event.target.value })}
        />
      </Field>
      <Field label="The honest description" hint="What's wrong with it, what's included, why you're letting it go.">
        <textarea
          className={`${fieldClass} min-h-32 py-3`}
          value={draft.description}
          maxLength={2000}
          required
          onChange={(event) => setDraft({ ...draft, description: event.target.value })}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Price in rands" hint="0 if you're giving it away.">
          <input
            className={`${fieldClass} tabular-nums`}
            inputMode="numeric"
            value={draft.price}
            required
            onChange={(event) => setDraft({ ...draft, price: event.target.value.replace(/[^\d]/g, "") })}
          />
        </Field>
        <Field label="Pickup area">
          <input
            className={fieldClass}
            value={draft.area}
            maxLength={60}
            required
            onChange={(event) => setDraft({ ...draft, area: event.target.value })}
          />
        </Field>
        <Field label="Category">
          <select
            className={fieldClass}
            value={draft.category}
            required
            onChange={(event) => setDraft({ ...draft, category: event.target.value })}
          >
            <option value="">Choose</option>
            {CATEGORIES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Condition">
          <select
            className={fieldClass}
            value={draft.condition}
            required
            onChange={(event) => setDraft({ ...draft, condition: event.target.value })}
          >
            {CONDITIONS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="space-y-2">
        <span className="block text-sm font-medium text-ink">Photo</span>
        {preview ? (
          <img src={preview} alt="" className="aspect-[4/3] w-full max-w-sm rounded-card object-cover" />
        ) : (
          <p className="text-sm text-muted">Optional. A clear photo gets it off the stoep faster.</p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button variant="line" onClick={() => fileRef.current?.click()}>
            {preview ? "Change photo" : "Add a photo"}
          </Button>
          {preview ? (
            <Button
              variant="quiet"
              onClick={() => setDraft({ ...draft, photo: null, photoAction: "clear" })}
            >
              Remove
            </Button>
          ) : null}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            readPhoto(file)
              .then((photo) => setDraft((current) => ({ ...current, photo, photoAction: "set" })))
              .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not read that photo"));
          }}
        />
      </div>
      <Button type="submit" disabled={busy} className="w-full sm:w-auto">
        {busy ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
