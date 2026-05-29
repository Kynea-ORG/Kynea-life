-- ─────────────────────────────────────────────────────────────────────────────
-- Kynea MVP — Schema completo
-- Pégalo en: Supabase Dashboard → SQL Editor → New query → Run
-- ─────────────────────────────────────────────────────────────────────────────

-- PROFILES (extiende auth.users)
create table public.profiles (
  id               uuid references auth.users(id) on delete cascade primary key,
  role             text not null check (role in ('alumno', 'profesor', 'academia')),
  name             text not null,
  photo_url        text,
  phone            text,
  bio              text,
  city             text,
  district         text,
  years_experience integer default 0,
  whatsapp         text,
  instagram        text,
  tiktok           text,
  youtube          text,
  website          text,
  dance_styles     text[] default '{}',
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- CLASSES
create table public.classes (
  id               uuid primary key default gen_random_uuid(),
  teacher_id       uuid not null references public.profiles(id) on delete cascade,
  type             text not null,
  title            text not null,
  style            text not null,
  secondary_styles text[] default '{}',
  level            text not null,
  short_description text,
  full_description  text,
  what_you_learn   text[] default '{}',
  for_whom         text,
  requirements     text,
  start_date       date,
  end_date         date,
  time_slots       jsonb not null default '[]',
  price_type       text not null,
  price            numeric(10,2) not null default 0,
  currency         text not null default 'PEN',
  max_spots        integer,
  available_spots  integer,
  is_trial_free    boolean default false,
  modality         text not null,
  city             text,
  district         text,
  venue_name       text,
  address          text,
  reference        text,
  maps_url         text,
  lat              double precision,
  lng              double precision,
  platform         text,
  access_link      text,
  cover_image      text,
  gallery          text[] default '{}',
  video_url        text,
  footwear         text,
  clothing         text,
  to_bring         text[] default '{}',
  age_group        text,
  prerequisites    text,
  offer_price      numeric(10,2),
  contact_mode     text not null default 'whatsapp',
  status           text not null default 'draft',
  views            integer not null default 0,
  contacts         integer not null default 0,
  saved_count      integer not null default 0,
  created_at       timestamptz default now(),
  published_at     timestamptz,
  updated_at       timestamptz default now()
);

create index classes_status_idx  on public.classes (status);
create index classes_teacher_idx on public.classes (teacher_id);
create index classes_style_idx   on public.classes (style);

-- SAVED_CLASSES (bookmarks)
create table public.saved_classes (
  user_id  uuid not null references public.profiles(id) on delete cascade,
  class_id uuid not null references public.classes(id)  on delete cascade,
  saved_at timestamptz default now(),
  primary key (user_id, class_id)
);

-- RLS
alter table public.profiles      enable row level security;
alter table public.classes       enable row level security;
alter table public.saved_classes enable row level security;

-- profiles: lectura pública, escritura solo propia
create policy "profiles_read"   on public.profiles for select using (true);
create policy "profiles_insert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update" on public.profiles for update using (auth.uid() = id);

-- classes: publicadas son públicas; propietario gestiona las suyas
create policy "classes_read"   on public.classes for select
  using (status = 'published' or teacher_id = auth.uid());
create policy "classes_insert" on public.classes for insert
  with check (teacher_id = auth.uid());
create policy "classes_update" on public.classes for update using (teacher_id = auth.uid());
create policy "classes_delete" on public.classes for delete using (teacher_id = auth.uid());

-- saved_classes
create policy "saved_own" on public.saved_classes using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Trigger: auto-crear profile al registrarse
create or replace function public.handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, role, name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'alumno'),
    coalesce(new.raw_user_meta_data->>'name', new.email)
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Incrementa contactos sin race condition
create or replace function increment_class_contacts(class_id uuid)
returns void language sql security definer as $$
  update public.classes set contacts = contacts + 1
  where id = class_id and status = 'published';
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- STORAGE: bucket para imágenes de clases
-- ─────────────────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public) values ('class-images', 'class-images', true);

-- Política: cualquiera puede leer (bucket público)
create policy "class_images_read" on storage.objects for select
  using (bucket_id = 'class-images');

-- Política: usuarios autenticados pueden subir a su propia carpeta (user-id/...)
create policy "class_images_upload" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'class-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Política: solo el dueño puede borrar
create policy "class_images_delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'class-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
