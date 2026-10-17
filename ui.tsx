import type { ButtonHTMLAttributes, ReactNode } from "react";

const tap = "transition-transform duration-150 ease-out active:not-disabled:scale-[0.96] disabled:opacity-50";

const variants = {
  clay: "bg-clay text-clay-ink",
  moss: "bg-moss text-moss-ink",
  line: "border border-line bg-card text-ink",
  quiet: "bg-transparent text-ink",
  ink: "bg-ink text-paper",
} as const;

export function Button({
  variant = "clay",
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof variants }) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium ${tap} ${variants[variant]} ${className}`}
      {...props}
    />
  );
}

export const fieldClass =
  "w-full min-h-11 rounded-2xl border border-line bg-card px-4 text-base text-ink outline-none placeholder:text-muted focus:border-clay";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      {children}
      {hint ? <span className="mt-1.5 block text-sm text-pretty text-muted">{hint}</span> : null}
    </label>
  );
}

export function Alert({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-2xl bg-sand px-4 py-3 text-sm text-pretty text-ink" role="alert">
      {children}
    </p>
  );
}
