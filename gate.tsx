import { Link, Navigate, useRouterState } from "@tanstack/react-router";
import { useSyncExternalStore, useState, useEffect, useCallback, type ReactNode } from "react";
import { authEnabled, signOut } from "@/lib/auth/client";
import { hasGateSessionMarker } from "@/lib/auth/gate-session-marker";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { errorText, type Me, type Profile } from "@/lib/market";
import { getMe } from "@/lib/market.functions";
import { Handshake, Plus, Store, UserRound } from "lucide-react";

function subscribe() {
  return () => {};
}

export function useMounted() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}

export function useMember() {
  const mounted = useMounted();
  const { user, isPending } = useCurrentUserState();
  const [me, setMe] = useState<Me | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    if (!mounted || isPending || !user) return;
    let live = true;
    getMe()
      .then((row) => {
        if (!live) return;
        setMe(row);
        setFailed(null);
      })
      .catch((err: unknown) => {
        if (!live) return;
        setFailed(errorText(err));
      });
    return () => {
      live = false;
    };
  }, [mounted, isPending, user?.id, tick]);

  const pending = !mounted || isPending || (Boolean(user) && me === null && !failed);
  return {
    user,
    me,
    failed,
    refresh,
    pending,
    signedOut: mounted && !isPending && !user,
  };
}

export function Opening({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center px-6">
      <div className="text-center">
        <p className="display-bold text-4xl text-ink">Stoep</p>
        <p className="mt-3 text-sm text-muted">{message ?? "Opening the market…"}</p>
        {onRetry ? (
          <button type="button" onClick={onRetry} className="mt-4 text-sm font-medium text-clay">
            Try again
          </button>
        ) : null}
      </div>
    </main>
  );
}

export function SignOutButton() {
  const gate = useSyncExternalStore(subscribe, hasGateSessionMarker, () => false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  if (!authEnabled || gate) return null;
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => {
        setBusy(true);
        setFailed(false);
        signOut().catch(() => {
          setBusy(false);
          setFailed(true);
        });
      }}
      className="min-h-11 px-2 text-sm font-medium text-muted"
    >
      {busy ? "Signing out…" : failed ? "Sign out failed — retry" : "Sign out"}
    </button>
  );
}

export function Frame({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-line bg-paper/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4">
          <Link to="/" className="display-bold text-2xl leading-none text-ink">
            Stoep
          </Link>
          {aside}
        </div>
      </header>
      <div className="mx-auto w-full max-w-5xl px-4 py-8">{children}</div>
    </div>
  );
}

const links = [
  { to: "/", label: "Board", icon: Store, exact: true },
  { to: "/sell", label: "Post", icon: Plus, exact: false },
  { to: "/meets", label: "Meets", icon: Handshake, exact: false },
  { to: "/me", label: "Stall", icon: UserRound, exact: false },
] as const;

export function Shell({ me, children }: { me: Me; children: ReactNode }) {
  const path = useRouterState({ select: (state) => state.location.pathname });
  const profile = me.profile;
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-line bg-paper/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4">
          <Link to="/" className="display-bold shrink-0 text-2xl leading-none text-ink">
            Stoep
          </Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Market">
            {links.map((item) => {
              const active = item.exact ? path === item.to : path.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm font-medium ${active ? "bg-sand text-ink" : "text-muted"}`}
                >
                  {item.label}
                  {item.to === "/meets" && me.openMeets > 0 ? (
                    <span className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-clay px-1.5 text-xs text-clay-ink tabular-nums">
                      {me.openMeets}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
          {profile ? (
            <Link
              to="/me"
              className="grid size-11 shrink-0 place-items-center rounded-full bg-clay text-sm font-semibold text-clay-ink"
              aria-label={`${profile.displayName}, your stall`}
            >
              {profile.displayName.charAt(0).toUpperCase()}
            </Link>
          ) : (
            <SignOutButton />
          )}
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl px-4 pt-5 pb-28 md:pb-12">{children}</main>
      <nav
        className="dock fixed inset-x-0 bottom-0 z-20 border-t border-line bg-paper/95 backdrop-blur-md md:hidden"
        aria-label="Market"
      >
        <ul className="mx-auto grid max-w-lg grid-cols-4">
          {links.map((item) => {
            const active = item.exact ? path === item.to : path.startsWith(item.to);
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={`flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium ${active ? "text-clay" : "text-muted"}`}
                >
                  <span className="relative">
                    <Icon className="size-5" strokeWidth={1.75} aria-hidden />
                    {item.to === "/meets" && me.openMeets > 0 ? (
                      <span className="absolute -top-1 -right-2 size-2 rounded-full bg-clay" />
                    ) : null}
                  </span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

export function MemberGate({
  children,
}: {
  children: (profile: Profile, refresh: () => void) => ReactNode;
}) {
  const state = useMember();
  if (state.pending) return <Opening />;
  if (state.signedOut || state.failed === "Unauthorized") return <RedirectToSignIn />;
  if (state.failed || !state.me) {
    return <Opening message={state.failed ?? "Could not open the market"} onRetry={state.refresh} />;
  }
  if (!state.me.profile) return <Navigate to="/join" />;
  return <Shell me={state.me}>{children(state.me.profile, state.refresh)}</Shell>;
}
