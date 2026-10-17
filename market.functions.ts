import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import {
  CATEGORIES,
  CONDITIONS,
  type BoardQuery,
  type ListingCard,
  type ListingDetail,
  type ListingPageData,
  type Me,
  type Meetup,
  type Profile,
} from "@/lib/market";

const CATEGORY_IDS = new Set<string>(CATEGORIES.map((item) => item.id));
const CONDITION_IDS = new Set<string>(CONDITIONS.map((item) => item.id));

function asObject(data: unknown): Record<string, unknown> {
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    throw new Error("Invalid request");
  }
  return data as Record<string, unknown>;
}

function reqText(value: unknown, label: string, min: number, max: number): string {
  if (typeof value !== "string") throw new Error(`${label} is required`);
  const trimmed = value.trim();
  if (trimmed.length < min) throw new Error(`${label} needs at least ${min} characters`);
  if (trimmed.length > max) throw new Error(`${label} is too long`);
  return trimmed;
}

function optText(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (trimmed.length > max) throw new Error("That text is too long");
  return trimmed;
}

function priceOf(value: unknown): number {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(number) || number < 0 || number > 1_000_000) {
    throw new Error("Use a whole number of rands, from 0 (free) up to 1 000 000");
  }
  return number;
}

function idOf(value: unknown): number {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(number) || number < 1) throw new Error("That post could not be found");
  return number;
}

function photoOrNull(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value !== "string" || !value.startsWith("data:image/jpeg;base64,")) {
    throw new Error("Use a JPEG photo");
  }
  if (value.length > 220_000) throw new Error("That photo is too large");
  return value;
}

function likePattern(value: string): string {
  return `%${value.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

function boardQuery(data: unknown): BoardQuery {
  const body = asObject(data ?? {});
  const category = optText(body.category, 40);
  if (category && !CATEGORY_IDS.has(category)) throw new Error("Unknown category");
  const condition = optText(body.condition, 40);
  if (condition && !CONDITION_IDS.has(condition)) throw new Error("Unknown condition");
  let maxPrice = -1;
  if (body.maxPrice !== undefined && body.maxPrice !== null && body.maxPrice !== -1 && body.maxPrice !== "") {
    maxPrice = priceOf(body.maxPrice);
  }
  return {
    q: optText(body.q, 80),
    category,
    condition,
    area: optText(body.area, 60),
    maxPrice,
    includeSold: body.includeSold === true,
  };
}

type CardRow = {
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

function asBool(value: unknown): boolean {
  return value === true || value === 1 || value === "t" || value === "true";
}

function toCard(row: CardRow): ListingCard {
  return {
    id: Number(row.id),
    title: row.title,
    price: Number(row.price),
    category: row.category,
    condition: row.condition,
    area: row.area,
    status: row.status,
    photo: row.photo,
    createdAt: row.createdAt,
    sellerName: row.sellerName,
    mine: asBool(row.mine),
  };
}

type MeetupRow = {
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
  role: string;
};

function toMeetup(row: MeetupRow): Meetup {
  return {
    id: Number(row.id),
    listingId: Number(row.listingId),
    listingTitle: row.listingTitle,
    listingStatus: row.listingStatus,
    listingPrice: Number(row.listingPrice),
    buyerName: row.buyerName,
    sellerName: row.sellerName,
    message: row.message,
    place: row.place,
    whenNote: row.whenNote,
    status: row.status,
    createdAt: row.createdAt,
    role: row.role === "seller" ? "seller" : "buyer",
  };
}

async function db() {
  return getSql();
}

export const getMe = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<Me> => {
    const sql = await db();
    const profiles = await sql<{
      displayName: string;
      area: string;
      bio: string;
      createdAt: string;
    }>`
      select display_name as "displayName", area, bio,
        to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as "createdAt"
      from profiles
      where user_id = ${context.userId}
      limit 1
    `;
    const counts = await sql<{ n: number }>`
      select count(*)::int as n from meetups
      where seller_id = ${context.userId} and status = 'open'
    `;
    const row = profiles[0];
    const profile: Profile | null = row
      ? { displayName: row.displayName, area: row.area, bio: row.bio, createdAt: row.createdAt }
      : null;
    return { profile, openMeets: Number(counts[0]?.n ?? 0) };
  });

export const saveProfile = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const body = asObject(data);
    return {
      displayName: reqText(body.displayName, "Your name", 2, 40),
      area: reqText(body.area, "Your area", 2, 60),
      bio: optText(body.bio, 280),
    };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }): Promise<Profile> => {
    const sql = await db();
    const rows = await sql<{
      displayName: string;
      area: string;
      bio: string;
      createdAt: string;
    }>`
      insert into profiles (user_id, display_name, area, bio)
      values (${context.userId}, ${data.displayName}, ${data.area}, ${data.bio})
      on conflict (user_id) do update
        set display_name = excluded.display_name,
            area = excluded.area,
            bio = excluded.bio
      returning display_name as "displayName", area, bio,
        to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as "createdAt"
    `;
    const row = rows[0];
    if (!row) throw new Error("Could not save your details");
    return row;
  });

async function requireMember(userId: string) {
  const sql = await db();
  const rows = await sql<{ user_id: string }>`
    select user_id from profiles where user_id = ${userId} limit 1
  `;
  if (!rows[0]) throw new Error("Join the market with your name and area first");
  return sql;
}

export const listListings = createServerFn({ method: "GET" })
  .validator((data: unknown) => boardQuery(data))
  .middleware([authMiddleware])
  .handler(async ({ context, data }): Promise<ListingCard[]> => {
    const sql = await requireMember(context.userId);
    const qLike = likePattern(data.q);
    const areaLike = likePattern(data.area);
    const sold = data.includeSold ? "yes" : "no";
    const rows = await sql<CardRow>`
      select
        l.id, l.title, l.price, l.category, l.condition, l.area, l.status, l.photo,
        to_char(l.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as "createdAt",
        p.display_name as "sellerName",
        (l.seller_id = ${context.userId}) as mine
      from listings l
      join profiles p on p.user_id = l.seller_id
      where (${sold} = 'yes' or l.status <> 'sold')
        and (${data.category} = '' or l.category = ${data.category})
        and (${data.condition} = '' or l.condition = ${data.condition})
        and (${data.area} = '' or l.area ilike ${areaLike} escape '\\')
        and (${data.maxPrice} < 0 or l.price <= ${data.maxPrice})
        and (
          ${data.q} = ''
          or l.title ilike ${qLike} escape '\\'
          or l.description ilike ${qLike} escape '\\'
          or p.display_name ilike ${qLike} escape '\\'
        )
      order by l.created_at desc
      limit 24
    `;
    return rows.map(toCard);
  });

export const getListing = createServerFn({ method: "GET" })
  .validator((data: unknown) => {
    const body = asObject(data);
    return { id: idOf(body.id) };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }): Promise<ListingPageData | null> => {
    const sql = await requireMember(context.userId);
    const rows = await sql<CardRow & { description: string; sellerBio: string }>`
      select
        l.id, l.title, l.description, l.price, l.category, l.condition, l.area, l.status, l.photo,
        to_char(l.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as "createdAt",
        p.display_name as "sellerName",
        p.bio as "sellerBio",
        (l.seller_id = ${context.userId}) as mine
      from listings l
      join profiles p on p.user_id = l.seller_id
      where l.id = ${data.id}
      limit 1
    `;
    const row = rows[0];
    if (!row) return null;
    const listing: ListingDetail = { ...toCard(row), description: row.description, sellerBio: row.sellerBio };
    if (listing.mine) {
      const requests = await sql<MeetupRow>`
        select
          m.id,
          m.listing_id as "listingId",
          l.title as "listingTitle",
          l.status as "listingStatus",
          l.price as "listingPrice",
          bp.display_name as "buyerName",
          sp.display_name as "sellerName",
          m.message, m.place, m.when_note as "whenNote", m.status,
          to_char(m.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as "createdAt",
          'seller' as role
        from meetups m
        join listings l on l.id = m.listing_id
        join profiles bp on bp.user_id = m.buyer_id
        join profiles sp on sp.user_id = m.seller_id
        where m.listing_id = ${data.id} and m.seller_id = ${context.userId}
        order by m.created_at desc
      `;
      return { listing, requests: requests.map(toMeetup), myMeetup: null };
    }
    const mine = await sql<MeetupRow>`
      select
        m.id,
        m.listing_id as "listingId",
        l.title as "listingTitle",
        l.status as "listingStatus",
        l.price as "listingPrice",
        bp.display_name as "buyerName",
        sp.display_name as "sellerName",
        m.message, m.place, m.when_note as "whenNote", m.status,
        to_char(m.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as "createdAt",
        'buyer' as role
      from meetups m
      join listings l on l.id = m.listing_id
      join profiles bp on bp.user_id = m.buyer_id
      join profiles sp on sp.user_id = m.seller_id
      where m.listing_id = ${data.id} and m.buyer_id = ${context.userId}
      order by m.created_at desc
      limit 1
    `;
    return { listing, requests: [], myMeetup: mine[0] ? toMeetup(mine[0]) : null };
  });

function listingInput(data: unknown, withPhotoAction: boolean) {
  const body = asObject(data);
  const category = reqText(body.category, "Category", 1, 40);
  if (!CATEGORY_IDS.has(category)) throw new Error("Choose a category");
  const condition = reqText(body.condition, "Condition", 1, 40);
  if (!CONDITION_IDS.has(condition)) throw new Error("Choose a condition");
  const photoAction = body.photoAction === "set" || body.photoAction === "clear" ? body.photoAction : "keep";
  const photo = photoAction === "set" || !withPhotoAction ? photoOrNull(body.photo) : null;
  if ((photoAction === "set" || !withPhotoAction) && body.photo) {
    photoOrNull(body.photo);
  }
  return {
    title: reqText(body.title, "Title", 3, 80),
    description: reqText(body.description, "Description", 10, 2000),
    price: priceOf(body.price),
    category,
    condition,
    area: reqText(body.area, "Pickup area", 2, 60),
    photo: withPhotoAction ? photo : photoOrNull(body.photo),
    photoAction,
  };
}

export const createListing = createServerFn({ method: "POST" })
  .validator((data: unknown) => listingInput(data, false))
  .middleware([authMiddleware])
  .handler(async ({ context, data }): Promise<{ id: number }> => {
    const sql = await requireMember(context.userId);
    const rows = await sql<{ id: number }>`
      insert into listings (seller_id, title, description, price, category, condition, area, photo)
      values (
        ${context.userId}, ${data.title}, ${data.description}, ${data.price},
        ${data.category}, ${data.condition}, ${data.area}, ${data.photo}
      )
      returning id
    `;
    const row = rows[0];
    if (!row) throw new Error("Could not post that");
    return { id: row.id };
  });

export const updateListing = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const body = asObject(data);
    return { id: idOf(body.id), ...listingInput(data, true) };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }): Promise<{ id: number }> => {
    const sql = await requireMember(context.userId);
    const rows = await sql<{ id: number }>`
      update listings
      set title = ${data.title},
          description = ${data.description},
          price = ${data.price},
          category = ${data.category},
          condition = ${data.condition},
          area = ${data.area},
          photo = case
            when ${data.photoAction} = 'keep' then photo
            when ${data.photoAction} = 'clear' then null
            else ${data.photo}
          end
      where id = ${data.id} and seller_id = ${context.userId}
      returning id
    `;
    if (!rows[0]) throw new Error("You can only edit your own posts");
    return { id: rows[0].id };
  });

export const setListingStatus = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const body = asObject(data);
    const status = body.status === "sold" ? "sold" : body.status === "available" ? "available" : "";
    if (!status) throw new Error("Choose available or sold");
    return { id: idOf(body.id), status };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    const sql = await requireMember(context.userId);
    const rows = await sql<{ id: number }>`
      update listings set status = ${data.status}
      where id = ${data.id} and seller_id = ${context.userId}
      returning id
    `;
    if (!rows[0]) throw new Error("You can only update your own posts");
    if (data.status === "sold") {
      await sql`
        update meetups set status = 'declined'
        where listing_id = ${data.id} and seller_id = ${context.userId} and status = 'open'
      `;
    } else {
      await sql`
        update meetups set status = 'cancelled'
        where listing_id = ${data.id} and seller_id = ${context.userId} and status = 'accepted'
      `;
    }
    return { ok: true };
  });

export const deleteListing = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const body = asObject(data);
    return { id: idOf(body.id) };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    const sql = await requireMember(context.userId);
    const rows = await sql<{ id: number }>`
      delete from listings where id = ${data.id} and seller_id = ${context.userId} returning id
    `;
    if (!rows[0]) throw new Error("You can only remove your own posts");
    return { ok: true };
  });

export const requestMeetup = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const body = asObject(data);
    return {
      listingId: idOf(body.listingId),
      message: reqText(body.message, "A note", 2, 500),
      place: reqText(body.place, "A meeting place", 2, 120),
      whenNote: reqText(body.whenNote, "A time", 2, 120),
    };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }): Promise<{ id: number }> => {
    const sql = await requireMember(context.userId);
    const listings = await sql<{ seller_id: string; status: string }>`
      select seller_id, status from listings where id = ${data.listingId} limit 1
    `;
    const listing = listings[0];
    if (!listing) throw new Error("That post is gone");
    if (listing.seller_id === context.userId) throw new Error("That's your own post");
    if (listing.status === "sold") throw new Error("That's already gone");
    const existing = await sql<{ id: number }>`
      select id from meetups
      where listing_id = ${data.listingId}
        and buyer_id = ${context.userId}
        and status in ('open', 'accepted')
      limit 1
    `;
    if (existing[0]) throw new Error("You already asked to meet about this");
    const rows = await sql<{ id: number }>`
      insert into meetups (listing_id, buyer_id, seller_id, message, place, when_note)
      values (
        ${data.listingId}, ${context.userId}, ${listing.seller_id},
        ${data.message}, ${data.place}, ${data.whenNote}
      )
      returning id
    `;
    const row = rows[0];
    if (!row) throw new Error("Could not send that");
    return { id: row.id };
  });

export const respondMeetup = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const body = asObject(data);
    const status = body.status === "accepted" || body.status === "declined" ? body.status : "";
    if (!status) throw new Error("Accept or decline");
    return { id: idOf(body.id), status };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    const sql = await requireMember(context.userId);
    const rows = await sql<{ id: number; listingId: number }>`
      update meetups set status = ${data.status}
      where id = ${data.id} and seller_id = ${context.userId} and status = 'open'
      returning id, listing_id as "listingId"
    `;
    const row = rows[0];
    if (!row) throw new Error("That request is no longer waiting");
    if (data.status === "accepted") {
      await sql`
        update listings set status = 'holding'
        where id = ${row.listingId} and seller_id = ${context.userId} and status = 'available'
      `;
    }
    return { ok: true };
  });

export const cancelMeetup = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const body = asObject(data);
    return { id: idOf(body.id) };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    const sql = await requireMember(context.userId);
    const rows = await sql<{ listingId: number }>`
      update meetups set status = 'cancelled'
      where id = ${data.id} and buyer_id = ${context.userId} and status in ('open', 'accepted')
      returning listing_id as "listingId"
    `;
    const row = rows[0];
    if (!row) throw new Error("That meetup can no longer be cancelled");
    const still = await sql<{ n: number }>`
      select count(*)::int as n from meetups
      where listing_id = ${row.listingId} and status = 'accepted'
    `;
    if (Number(still[0]?.n ?? 0) === 0) {
      await sql`
        update listings set status = 'available'
        where id = ${row.listingId} and status = 'holding'
      `;
    }
    return { ok: true };
  });

export const listMeetups = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<Meetup[]> => {
    const sql = await requireMember(context.userId);
    const rows = await sql<MeetupRow>`
      select
        m.id,
        m.listing_id as "listingId",
        l.title as "listingTitle",
        l.status as "listingStatus",
        l.price as "listingPrice",
        bp.display_name as "buyerName",
        sp.display_name as "sellerName",
        m.message, m.place, m.when_note as "whenNote", m.status,
        to_char(m.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as "createdAt",
        case when m.seller_id = ${context.userId} then 'seller' else 'buyer' end as role
      from meetups m
      join listings l on l.id = m.listing_id
      join profiles bp on bp.user_id = m.buyer_id
      join profiles sp on sp.user_id = m.seller_id
      where m.buyer_id = ${context.userId} or m.seller_id = ${context.userId}
      order by m.created_at desc
      limit 100
    `;
    return rows.map(toMeetup);
  });

export const listMine = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<ListingCard[]> => {
    const sql = await requireMember(context.userId);
    const rows = await sql<CardRow>`
      select
        l.id, l.title, l.price, l.category, l.condition, l.area, l.status, l.photo,
        to_char(l.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as "createdAt",
        p.display_name as "sellerName",
        true as mine
      from listings l
      join profiles p on p.user_id = l.seller_id
      where l.seller_id = ${context.userId}
      order by l.created_at desc
    `;
    return rows.map(toCard);
  });
