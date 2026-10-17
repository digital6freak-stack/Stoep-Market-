create table if not exists profiles (
  user_id text primary key,
  display_name text not null,
  area text not null,
  bio text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists listings (
  id serial primary key,
  seller_id text not null references profiles (user_id),
  title text not null,
  description text not null,
  price integer not null check (price >= 0 and price <= 1000000),
  category text not null,
  condition text not null,
  area text not null,
  photo text,
  status text not null default 'available' check (status in ('available', 'holding', 'sold')),
  created_at timestamptz not null default now()
);

create index if not exists listings_status_created_idx on listings (status, created_at desc);
create index if not exists listings_seller_idx on listings (seller_id);

create table if not exists meetups (
  id serial primary key,
  listing_id integer not null references listings (id) on delete cascade,
  buyer_id text not null,
  seller_id text not null,
  message text not null,
  place text not null default '',
  when_note text not null default '',
  status text not null default 'open' check (status in ('open', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now()
);

create index if not exists meetups_seller_idx on meetups (seller_id, status);
create index if not exists meetups_buyer_idx on meetups (buyer_id, status);
create index if not exists meetups_listing_idx on meetups (listing_id);
