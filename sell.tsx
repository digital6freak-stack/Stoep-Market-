import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { MemberGate } from "@/components/gate";
import { ListingForm, type ListingDraft } from "@/components/listing-form";
import { createListing } from "@/lib/market.functions";
import type { Profile } from "@/lib/market";

export const Route = createFileRoute("/sell")({ component: SellPage });

function SellPage() {
  return (
    <MemberGate>
      {(profile) => <SellForm profile={profile} />}
    </MemberGate>
  );
}

function SellForm({ profile }: { profile: Profile }) {
  const navigate = useNavigate();
  const initial: ListingDraft = {
    title: "",
    description: "",
    price: "",
    category: "",
    condition: "good",
    area: profile.area,
    photo: null,
    photoAction: "keep",
  };
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="display-bold text-4xl text-ink">Put something out</h1>
      <p className="mt-2 text-pretty text-sm text-muted">
        Say what it is, what you'll take for it, and where someone can collect it. You meet them yourself.
      </p>
      <div className="mt-6">
        <ListingForm
          initial={initial}
          submitLabel="Put it on the stoep"
          onSubmit={async (draft) => {
            const created = await createListing({
              data: {
                title: draft.title,
                description: draft.description,
                price: Number(draft.price || "0"),
                category: draft.category,
                condition: draft.condition,
                area: draft.area,
                photo: draft.photo,
              },
            });
            await navigate({ to: "/listing/$id", params: { id: String(created.id) } });
          }}
        />
      </div>
    </div>
  );
}
