import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Frame, Opening, useMounted } from "@/components/gate";
import { Alert, Button, Field, fieldClass } from "@/components/ui";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/login")({ component: LoginPage });

const BEARER_KEY = "grok-auth.bearer-token";

function LoginPage() {
  const mounted = useMounted();
  const { user, isPending } = useCurrentUserState();
  if (!mounted || isPending) return <Opening />;
  if (user) return <Navigate to="/" />;
  return (
    <Frame>
      <LoginForm />
    </Frame>
  );
}

function LoginForm() {
  const [mode, setMode] = useState<"register" | "sign-in">("register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const path = mode === "register" ? "/api/auth/sign-up/email" : "/api/auth/sign-in/email";
      const body =
        mode === "register"
          ? { name: name.trim(), email: email.trim(), password }
          : { email: email.trim(), password };
      const res = await fetch(path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const token = res.headers.get("set-auth-token");
      const payload = (await res.json().catch(() => null)) as { message?: string } | null;
      if (!res.ok) {
        throw new Error(payload?.message || (mode === "register" ? "Could not register" : "Could not sign in"));
      }
      if (token) sessionStorage.setItem(BEARER_KEY, token);
      const session = await authClient.getSession();
      if (!session.data?.user) {
        throw new Error("That didn't keep you signed in. Try again, or continue with Google.");
      }
      window.location.assign("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not continue");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <p className="text-sm font-medium text-clay">Members only</p>
      <h1 className="display-bold mt-2 text-4xl text-ink">
        {mode === "register" ? "Register for Stoep" : "Welcome back"}
      </h1>
      <p className="mt-2 text-pretty text-sm text-muted">
        Buyers and sellers use the same account. You need one before you can see posts or put something out.
      </p>

      {!authEnabled ? (
        <p className="mt-6 text-sm text-muted">Sign-in is disabled.</p>
      ) : (
        <>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {error ? <Alert>{error}</Alert> : null}
            {mode === "register" ? (
              <Field label="Your name">
                <input
                  className={fieldClass}
                  value={name}
                  required
                  autoComplete="name"
                  onChange={(event) => setName(event.target.value)}
                />
              </Field>
            ) : null}
            <Field label="Email">
              <input
                className={fieldClass}
                type="email"
                value={email}
                required
                autoComplete="email"
                onChange={(event) => setEmail(event.target.value)}
              />
            </Field>
            <Field label="Password" hint="At least 8 characters.">
              <input
                className={fieldClass}
                type="password"
                value={password}
                required
                minLength={8}
                autoComplete={mode === "register" ? "new-password" : "current-password"}
                onChange={(event) => setPassword(event.target.value)}
              />
            </Field>
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? "One moment…" : mode === "register" ? "Create my account" : "Sign in"}
            </Button>
          </form>
          <button
            type="button"
            className="mt-4 min-h-11 text-sm font-medium text-ink"
            onClick={() => {
              setMode(mode === "register" ? "sign-in" : "register");
              setError(null);
            }}
          >
            {mode === "register" ? "I already have an account" : "I need to register"}
          </button>
          <div className="my-6 flex items-center gap-3 text-sm text-muted">
            <span className="h-px flex-1 bg-line" />
            or
            <span className="h-px flex-1 bg-line" />
          </div>
          <div className="space-y-2">
            {GROK_PROVIDERS.map((provider) => (
              <Button
                key={provider.providerId}
                variant="line"
                className="w-full"
                onClick={() => {
                  setError(null);
                  signIn(provider.providerId, { callbackURL: "/" }).catch((err: unknown) => {
                    setError(err instanceof Error ? err.message : "Could not continue");
                  });
                }}
              >
                Continue with {provider.label}
              </Button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
