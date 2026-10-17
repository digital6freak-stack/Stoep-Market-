import { Navigate, createFileRoute } from "@tanstack/react-router";
import { Frame, Opening, SignOutButton, useMember } from "@/components/gate";
import { ProfileForm } from "@/components/profile-form";
import { saveProfile } from "@/lib/market.functions";

export const Route = createFileRoute("/join")({ component: JoinPage });

function JoinPage() {
  const state = useMember();
  if (state.pending) return <Opening />;
  if (state.signedOut) return <Navigate to="/login" />;
  if (state.failed || !state.me) {
    return <Opening message={state.failed ?? "Could not open the market"} onRetry={state.refresh} />;
  }
  if (state.me.profile) return <Navigate to="/" />;
  const suggested = state.user?.displayName && !state.user.isDevFallback ? state.user.displayName : "";
  return (
    <Frame aside={<SignOutButton />}>
      <div className="mx-auto max-w-lg">
        <h1 className="display-bold text-4xl text-ink">Take a place on the stoep</h1>
        <p className="mt-2 text-pretty text-sm text-muted">
          You're registered. Tell neighbours what to call you and which area you can meet in. Then you can post and search.
        </p>
        <div className="mt-6">
          <ProfileForm
            initial={{ displayName: suggested, area: "", bio: "" }}
            submitLabel="Step onto the stoep"
            onSubmit={async (draft) => {
              await saveProfile({ data: draft });
              window.location.assign("/");
            }}
          />
        </div>
      </div>
    </Frame>
  );
}
