-- Catalogue: read-only set index, managed by admin scripts
create table public.sets (
  set_code         text primary key,
  set_name         text not null,
  series_name      text not null,
  release_date     date not null,
  logo_url         text,
  card_count       int not null default 0,
  total_slots      int not null default 0
);

alter table public.sets enable row level security;

create policy "sets are public read"
  on public.sets for select
  using (true);

-- User data: tracked sets
create table public.tracked_sets (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users on delete cascade,
  set_code     text not null references public.sets on delete cascade,
  date_added   timestamptz not null default now(),
  column_count int not null default 3,
  is_list      boolean not null default false,
  focus        text not null default 'all' check (focus in ('all', 'missing', 'collected')),
  unique (user_id, set_code)
);

alter table public.tracked_sets enable row level security;

create policy "users manage own tracked sets"
  on public.tracked_sets for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- User data: owned slots
create table public.owned_slots (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  slot_id     text not null,
  set_code    text not null,
  date_owned  timestamptz not null default now(),
  unique (user_id, slot_id)
);

alter table public.owned_slots enable row level security;

create policy "users manage own owned slots"
  on public.owned_slots for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index owned_slots_user_set on public.owned_slots (user_id, set_code);

-- User profiles
create table public.profiles (
  user_id      uuid primary key references auth.users on delete cascade,
  username     text unique,
  display_name text,
  default_layout text
);

alter table public.profiles enable row level security;

create policy "profiles are public read"
  on public.profiles for select
  using (true);

create policy "users manage own profile"
  on public.profiles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (user_id)
  values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
