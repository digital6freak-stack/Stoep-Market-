import { Link } from "@tanstack/react-router";
import {
  Armchair,
  Baby,
  Bike,
  BookOpen,
  CookingPot,
  Flower2,
  Package,
  Shirt,
  Smartphone,
  type LucideIcon,
} from "lucide-react";
import { categoryById, conditionLabel, formatPrice, statusLabel, type ListingCard } from "@/lib/market";

const icons: Record<string, LucideIcon> = {
  furniture: Armchair,
  clothes: Shirt,
  kids: Baby,
  kitchen: CookingPot,
  books: BookOpen,
  electronics: Smartphone,
  garden: Flower2,
  sports: Bike,
  other: Package,
};

export function CategoryPlate({ category, className = "" }: { category: string; className?: string }) {
  const meta = categoryById(category);
  const Icon = icons[meta.id] ?? Package;
  return (
    <div className={`plate plate-${meta.id} grid place-items-center text-ink ${className}`} aria-hidden>
      <Icon className="size-8" strokeWidth={1.5} />
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  if (status === "sold") {
    return <span className="rounded-full bg-ink px-2.5 py-1 text-xs font-medium text-paper">{statusLabel(status)}</span>;
  }
  if (status === "holding") {
    return <span className="rounded-full bg-sand px-2.5 py-1 text-xs font-medium text-ink">{statusLabel(status)}</span>;
  }
  return <span className="rounded-full bg-moss px-2.5 py-1 text-xs font-medium text-moss-ink">{statusLabel(status)}</span>;
}

export function ListingCardView({ listing }: { listing: ListingCard }) {
  return (
    <Link
      to="/listing/$id"
      params={{ id: String(listing.id) }}
      className="lift block overflow-hidden rounded-card border border-line bg-card"
    >
      <div className="relative aspect-[4/3]">
        {listing.photo ? (
          <img src={listing.photo} alt="" className="h-full w-full object-cover" />
        ) : (
          <CategoryPlate category={listing.category} className="h-full w-full" />
        )}
        <span className="absolute top-3 left-3 rounded-full bg-clay px-3 py-1 text-sm font-medium text-clay-ink tabular-nums">
          {formatPrice(listing.price)}
        </span>
        {listing.status !== "available" ? (
          <span className="absolute top-3 right-3">
            <StatusPill status={listing.status} />
          </span>
        ) : null}
      </div>
      <div className="space-y-1 px-4 py-3">
        <h2 className="display text-xl leading-tight text-ink">{listing.title}</h2>
        <p className="text-sm text-muted">
          {conditionLabel(listing.condition)} · {listing.area}
        </p>
        <p className="text-sm text-ink">
          {listing.mine ? "Your post" : listing.sellerName}
        </p>
      </div>
    </Link>
  );
}
