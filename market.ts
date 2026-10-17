export const CATEGORIES = [
  { id: "furniture", label: "Furniture" },
  { id: "clothes", label: "Clothes" },
  { id: "kids", label: "Kids" },
  { id: "kitchen", label: "Kitchen" },
  { id: "books", label: "Books" },
  { id: "electronics", label: "Electronics" },
  { id: "garden", label: "Garden" },
  { id: "sports", label: "Sports" },
  { id: "other", label: "Other" },
] as const;

export const CONDITIONS = [
  { id: "like-new", label: "Like new" },
  { id: "good", label: "Good" },
  { id: "fair", label: "Fair" },
  { id: "for-parts", label: "For parts" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];
export type ConditionId = (typeof CONDITIONS)[number]["id"];

export type BoardQuery = {
  q: string;
  category: string;
  condition: string;
  area: string;
  maxPrice: number;
  includeSold: boolean;
};

export const emptyBoard: BoardQuery = {
  q: "",
  category: "",
  condition: "",
  area: "",
  maxPrice: -1,
  includeSold: false,
};

export type Profile = {
  displayName: string;
  area: string;
  bio: string;
  createdAt: string;
};

export type Me = {
  profile: Profile | null;
  openMeets: number;
};

export type ListingCard = {
  id: number;
  title: string;
  price: number;
  category: string;
  condition: string;
  area: string;
  status: string;
  photo: string | null;
  createdAt: string;
  sellerName: string;
  mine: boolean;
};

export type ListingDetail = ListingCard & {
  description: string;
  sellerBio: string;
};

export type Meetup = {
  id: number;
  listingId: number;
  listingTitle: string;
  listingStatus: string;
  listingPrice: number;
  buyerName: string;
  sellerName: string;
  message: string;
  place: string;
  whenNote: string;
  status: string;
  createdAt: string;
  role: "buyer" | "seller";
};

export type ListingPageData = {
  listing: ListingDetail;
  requests: Meetup[];
  myMeetup: Meetup | null;
};

export function categoryById(id: string) {
  return CATEGORIES.find((item) => item.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
}

export function conditionLabel(id: string): string {
  return CONDITIONS.find((item) => item.id === id)?.label ?? id;
}

export function statusLabel(status: string): string {
  if (status === "sold") return "Gone";
  if (status === "holding") return "Pickup arranged";
  return "On the stoep";
}

export function meetupLabel(status: string): string {
  if (status === "accepted") return "Agreed";
  if (status === "declined") return "Declined";
  if (status === "cancelled") return "Cancelled";
  return "Waiting";
}

export function formatPrice(price: number): string {
  if (price <= 0) return "Free";
  return `R\u00a0${new Intl.NumberFormat("en-ZA").format(price)}`;
}

export function formatWhen(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function errorText(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "object" && err && "message" in err && typeof err.message === "string") {
    return err.message;
  }
  return "Something went wrong. Try again.";
}
