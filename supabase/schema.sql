-- ═══════════════════════════════════════════════════════════════════════════
-- KYNEA — Schema v2
-- Pegar completo en: Supabase Dashboard → SQL Editor → Run
-- ═══════════════════════════════════════════════════════════════════════════


-- ── 0. LIMPIEZA ─────────────────────────────────────────────────────────────
-- DROP TABLE CASCADE elimina automáticamente triggers y FK dependientes.
-- Los DROP TRIGGER separados no son necesarios y fallan si la tabla no existe.

DROP TABLE IF EXISTS
  public.saved_classes,
  public.class_schedules,
  public.class_styles,
  public.classes,
  public.venues,
  public.profile_styles,
  public.profiles,
  public.districts,
  public.class_levels,
  public.dance_styles
CASCADE;

-- El trigger on auth.users debe removerse por separado (no es una tabla pública)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

DROP FUNCTION IF EXISTS public.handle_new_user()               CASCADE;
DROP FUNCTION IF EXISTS public.set_class_slug()                CASCADE;
DROP FUNCTION IF EXISTS public.set_updated_at()                CASCADE;
DROP FUNCTION IF EXISTS public.slugify(text)                   CASCADE;
DROP FUNCTION IF EXISTS public.generate_class_slug(text, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.increment_class_contacts(uuid)  CASCADE;
DROP FUNCTION IF EXISTS public.email_signup_provider(text)     CASCADE;


-- ── 1. FUNCIONES HELPER ─────────────────────────────────────────────────────

-- Convierte texto a slug URL-safe (elimina tildes, espacios → guiones)
CREATE OR REPLACE FUNCTION public.slugify(input text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT lower(
    regexp_replace(
      regexp_replace(
        translate(
          trim(input),
          'áàäâéèëêíìïîóòöôúùüûñÁÀÄÂÉÈËÊÍÌÏÎÓÒÖÔÚÙÜÛÑ',
          'aaaaeeeeiiiioooouuuunAAAAEEEEIIIIOOOOUUUUN'
        ),
        '[^a-z0-9\s-]', '', 'g'
      ),
      '\s+', '-', 'g'
    )
  );
$$;

-- Genera slug único para una clase (añade sufijo numérico en caso de colisión)
CREATE OR REPLACE FUNCTION public.generate_class_slug(p_title text, p_id uuid)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  base      text    := public.slugify(p_title);
  candidate text    := base;
  counter   integer := 2;
BEGIN
  LOOP
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.classes WHERE slug = candidate AND id != p_id
    );
    candidate := base || '-' || counter;
    counter   := counter + 1;
  END LOOP;
  RETURN candidate;
END;
$$;

-- Trigger function: asigna slug al insertar
CREATE OR REPLACE FUNCTION public.set_class_slug()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.slug := public.generate_class_slug(NEW.title, NEW.id);
  RETURN NEW;
END;
$$;

-- Trigger function: actualiza updated_at automáticamente en cualquier UPDATE
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;


-- ── 2. CATÁLOGOS ────────────────────────────────────────────────────────────
-- Tablas de solo lectura desde el cliente. Escritura solo via SQL admin.

-- Estilos de danza
CREATE TABLE public.dance_styles (
  id    smallserial PRIMARY KEY,
  name  text        UNIQUE NOT NULL,
  slug  text        UNIQUE NOT NULL,
  emoji text,
  ord   smallint    NOT NULL DEFAULT 0
);

-- Niveles de clase
CREATE TABLE public.class_levels (
  id   smallserial PRIMARY KEY,
  name text        UNIQUE NOT NULL,
  ord  smallint    NOT NULL DEFAULT 0
);

-- Distritos del Perú (la ciudad se obtiene por JOIN en lugar de duplicar el campo)
CREATE TABLE public.districts (
  id   smallserial PRIMARY KEY,
  name text        NOT NULL,
  city text        NOT NULL DEFAULT 'Lima',
  UNIQUE (name, city)
);


-- ── 3. PERFILES ─────────────────────────────────────────────────────────────

CREATE TABLE public.profiles (
  id               uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  -- role es nullable: durante el flujo OAuth hay una ventana breve antes de /completar-registro
  role             text        CHECK (role IN ('alumno', 'profesor', 'academia')),
  name             text,
  photo_url        text,
  bio              text,
  district_id      smallint    REFERENCES public.districts(id),
  years_experience integer     DEFAULT 0,
  whatsapp         text,
  instagram        text,
  tiktok           text,
  youtube          text,
  website          text,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

-- Estilos que enseña el profesor/academia, o que prefiere el alumno
CREATE TABLE public.profile_styles (
  profile_id uuid     NOT NULL REFERENCES public.profiles(id)     ON DELETE CASCADE,
  style_id   smallint NOT NULL REFERENCES public.dance_styles(id) ON DELETE CASCADE,
  PRIMARY KEY (profile_id, style_id)
);


-- ── 4. LOCALES ──────────────────────────────────────────────────────────────
-- Locales físicos reutilizables. Un profesor puede tener varios locales
-- y asignarlos a distintas clases sin repetir la dirección.

CREATE TABLE public.venues (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name        text        NOT NULL,
  address     text,
  reference   text,
  district_id smallint    REFERENCES public.districts(id),
  maps_url    text,
  lat         double precision,
  lng         double precision,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);


-- ── 5. CLASES ───────────────────────────────────────────────────────────────

CREATE TABLE public.classes (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id        uuid          NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  venue_id          uuid          REFERENCES public.venues(id) ON DELETE SET NULL,

  slug              text          UNIQUE,  -- asignado por trigger al INSERT
  title             text          NOT NULL,
  type              text          NOT NULL
    CHECK (type IN ('clase', 'taller', 'curso', 'masterclass', 'evento', 'clase-suelta')),
  modality          text          NOT NULL
    CHECK (modality IN ('Presencial', 'Online')),
  level_id          smallint      REFERENCES public.class_levels(id),

  -- Contenido
  short_description text,
  full_description  text,
  what_you_learn    text[]        DEFAULT '{}',
  for_whom          text,
  requirements      text,

  -- Fechas
  start_date        date,
  end_date          date,

  -- Precio
  price_type        text          NOT NULL
    CHECK (price_type IN ('Gratis', 'Por clase', 'Mensual', 'Paquete')),
  price             numeric(10,2) NOT NULL DEFAULT 0,
  offer_price       numeric(10,2),
  currency          text          NOT NULL DEFAULT 'PEN'
    CHECK (currency IN ('PEN', 'USD')),
  is_trial_free     boolean       DEFAULT false,

  -- Cupos
  max_spots         integer,
  available_spots   integer,

  -- Contacto
  contact_mode      text          NOT NULL DEFAULT 'whatsapp'
    CHECK (contact_mode IN ('whatsapp', 'instagram', 'web')),

  -- Solo clases Online
  platform          text,
  access_link       text,

  -- Media
  cover_image       text,
  gallery           text[]        DEFAULT '{}',
  video_url         text,

  -- Equipamiento y restricciones
  footwear          text,
  clothing          text,
  to_bring          text[]        DEFAULT '{}',
  age_group         text,

  -- Contadores denormalizados (evitan JOINs costosos en listados)
  views_count       integer       NOT NULL DEFAULT 0,
  contacts_count    integer       NOT NULL DEFAULT 0,
  saved_count       integer       NOT NULL DEFAULT 0,

  status            text          NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'finished', 'archived')),

  created_at        timestamptz   DEFAULT now(),
  published_at      timestamptz,
  updated_at        timestamptz   DEFAULT now()
);

-- Estilos de la clase — uno marcado como principal (is_main = true)
CREATE TABLE public.class_styles (
  class_id uuid     NOT NULL REFERENCES public.classes(id)     ON DELETE CASCADE,
  style_id smallint NOT NULL REFERENCES public.dance_styles(id) ON DELETE CASCADE,
  is_main  boolean  NOT NULL DEFAULT false,
  PRIMARY KEY (class_id, style_id)
);

-- Horarios normalizados
-- day_of_week: 0 = Lunes … 6 = Domingo  (convención Perú / ISO 8601)
CREATE TABLE public.class_schedules (
  id          uuid      PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id    uuid      NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  day_of_week smallint  NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time  time      NOT NULL,
  end_time    time      NOT NULL
);

-- Bookmarks de alumnos
CREATE TABLE public.saved_classes (
  user_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  class_id   uuid        NOT NULL REFERENCES public.classes(id)  ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, class_id)
);


-- ── 6. TRIGGERS ─────────────────────────────────────────────────────────────

CREATE TRIGGER class_slug_on_insert
  BEFORE INSERT ON public.classes
  FOR EACH ROW EXECUTE FUNCTION public.set_class_slug();

CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_classes
  BEFORE UPDATE ON public.classes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_venues
  BEFORE UPDATE ON public.venues
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ── 7. TRIGGER: Nuevo usuario en Auth ───────────────────────────────────────
-- Crea el perfil automáticamente al registrarse. role puede ser NULL
-- (caso Google OAuth desde /login — se completa en /completar-registro).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role)
  VALUES (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'full_name'
    ),
    new.raw_user_meta_data->>'role'
  );
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ── 8. RPC: Incrementar contactos ───────────────────────────────────────────
-- SECURITY DEFINER para saltarse RLS en el UPDATE del contador.

CREATE OR REPLACE FUNCTION public.increment_class_contacts(target_class_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE public.classes
  SET contacts_count = contacts_count + 1
  WHERE id = target_class_id AND status = 'published';
$$;


-- ── 9. RPC: Proveedor de registro de un email ───────────────────────────────
-- SECURITY DEFINER para leer auth.identities (no accesible al rol anon/authenticated).
-- Devuelve 'email' | 'google' | 'none'.
-- Si la cuenta tiene ambos proveedores (email + Google vinculados), 'email' tiene prioridad.

CREATE OR REPLACE FUNCTION public.email_signup_provider(p_email text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE
  has_password boolean;
  has_google   boolean;
BEGIN
  SELECT bool_or(i.provider = 'email'), bool_or(i.provider = 'google')
  INTO has_password, has_google
  FROM auth.identities i
  JOIN auth.users u ON u.id = i.user_id
  WHERE lower(u.email) = lower(p_email);

  IF has_password THEN RETURN 'email';
  ELSIF has_google THEN RETURN 'google';
  ELSE RETURN 'none';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.email_signup_provider(text) TO anon, authenticated;


-- ── 10. ÍNDICES ──────────────────────────────────────────────────────────────

CREATE INDEX classes_teacher_idx      ON public.classes        (teacher_id);
CREATE INDEX classes_status_idx       ON public.classes        (status);
CREATE INDEX classes_level_idx        ON public.classes        (level_id);
CREATE INDEX classes_venue_idx        ON public.classes        (venue_id);
-- Índice parcial: solo clases publicadas ordenadas por fecha de publicación
CREATE INDEX classes_published_idx    ON public.classes        (published_at DESC)
  WHERE status = 'published';

CREATE INDEX class_styles_style_idx   ON public.class_styles   (style_id);

CREATE INDEX schedules_class_idx      ON public.class_schedules (class_id);
CREATE INDEX schedules_day_idx        ON public.class_schedules (day_of_week);

CREATE INDEX profile_styles_style_idx ON public.profile_styles  (style_id);

CREATE INDEX venues_owner_idx         ON public.venues          (owner_id);
CREATE INDEX venues_district_idx      ON public.venues          (district_id);

CREATE INDEX profiles_role_idx        ON public.profiles        (role);
CREATE INDEX profiles_district_idx    ON public.profiles        (district_id);


-- ── 10. RLS ─────────────────────────────────────────────────────────────────

-- Catálogos: lectura pública, sin escritura desde cliente
ALTER TABLE public.dance_styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.districts    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select" ON public.dance_styles FOR SELECT USING (true);
CREATE POLICY "select" ON public.class_levels FOR SELECT USING (true);
CREATE POLICY "select" ON public.districts    FOR SELECT USING (true);

-- Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Profile styles
ALTER TABLE public.profile_styles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profile_styles_select" ON public.profile_styles
  FOR SELECT USING (true);
CREATE POLICY "profile_styles_insert" ON public.profile_styles
  FOR INSERT WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "profile_styles_delete" ON public.profile_styles
  FOR DELETE USING (auth.uid() = profile_id);

-- Venues
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "venues_select" ON public.venues
  FOR SELECT USING (true);
CREATE POLICY "venues_insert" ON public.venues
  FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "venues_update" ON public.venues
  FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "venues_delete" ON public.venues
  FOR DELETE USING (auth.uid() = owner_id);

-- Classes
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "classes_select" ON public.classes
  FOR SELECT USING (status = 'published' OR teacher_id = auth.uid());
CREATE POLICY "classes_insert" ON public.classes
  FOR INSERT WITH CHECK (teacher_id = auth.uid());
CREATE POLICY "classes_update" ON public.classes
  FOR UPDATE USING (teacher_id = auth.uid());
CREATE POLICY "classes_delete" ON public.classes
  FOR DELETE USING (teacher_id = auth.uid());

-- Class styles (lectura pública — los estilos de una clase no son datos sensibles)
ALTER TABLE public.class_styles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "class_styles_select" ON public.class_styles
  FOR SELECT USING (true);
CREATE POLICY "class_styles_insert" ON public.class_styles
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.classes WHERE id = class_id AND teacher_id = auth.uid())
  );
CREATE POLICY "class_styles_delete" ON public.class_styles
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.classes WHERE id = class_id AND teacher_id = auth.uid())
  );

-- Class schedules (lectura pública)
ALTER TABLE public.class_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "class_schedules_select" ON public.class_schedules
  FOR SELECT USING (true);
CREATE POLICY "class_schedules_insert" ON public.class_schedules
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.classes WHERE id = class_id AND teacher_id = auth.uid())
  );
CREATE POLICY "class_schedules_update" ON public.class_schedules
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.classes WHERE id = class_id AND teacher_id = auth.uid())
  );
CREATE POLICY "class_schedules_delete" ON public.class_schedules
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.classes WHERE id = class_id AND teacher_id = auth.uid())
  );

-- Saved classes
ALTER TABLE public.saved_classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saved_classes_select" ON public.saved_classes
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "saved_classes_insert" ON public.saved_classes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "saved_classes_delete" ON public.saved_classes
  FOR DELETE USING (auth.uid() = user_id);


-- ── 11. SEED ────────────────────────────────────────────────────────────────

INSERT INTO public.dance_styles (name, slug, emoji, ord) VALUES
  ('Salsa',          'salsa',          '💃',  1),
  ('Bachata',        'bachata',        '🎶',  2),
  ('Reggaetón',      'reggaeton',      '🔥',  3),
  ('Hip Hop',        'hip-hop',        '🎤',  4),
  ('Urbano',         'urbano',         '🏙️',  5),
  ('Contemporáneo',  'contemporaneo',  '🎭',  6),
  ('Ballet',         'ballet',         '🩰',  7),
  ('Jazz',           'jazz',           '🎷',  8),
  ('Jazz Funk',      'jazz-funk',      '✨',  9),
  ('Heels',          'heels',          '👠', 10),
  ('K-pop',          'k-pop',          '⭐', 11),
  ('Tango',          'tango',          '🥀', 12),
  ('Cumbia',         'cumbia',         '🪘', 13),
  ('Marinera',       'marinera',       '🇵🇪', 14),
  ('Folklore',       'folklore',       '🌽', 15),
  ('Breakdance',     'breakdance',     '🌀', 16),
  ('Cha-cha-chá',    'cha-cha-cha',    '🎺', 17),
  ('Dancehall',      'dancehall',      '🎵', 18),
  ('House',          'house',          '🎧', 19),
  ('Zumba',          'zumba',          '⚡', 20),
  ('Acroverticales', 'acroverticales', '🤸', 21),
  ('Pole Dance',     'pole-dance',     '🎪', 22),
  ('Afro',           'afro',           '🥁', 23),
  ('Twerk',          'twerk',          '🔮', 24);

INSERT INTO public.class_levels (name, ord) VALUES
  ('Principiante',    1),
  ('Básico',          2),
  ('Intermedio',      3),
  ('Avanzado',        4),
  ('Todos los niveles', 5);

-- Lima
INSERT INTO public.districts (name, city) VALUES
  ('Miraflores',             'Lima'),
  ('San Isidro',             'Lima'),
  ('Barranco',               'Lima'),
  ('Surco',                  'Lima'),
  ('San Borja',              'Lima'),
  ('La Molina',              'Lima'),
  ('Jesús María',            'Lima'),
  ('Lince',                  'Lima'),
  ('Magdalena del Mar',      'Lima'),
  ('San Miguel',             'Lima'),
  ('Pueblo Libre',           'Lima'),
  ('Chorrillos',             'Lima'),
  ('Los Olivos',             'Lima'),
  ('Independencia',          'Lima'),
  ('Comas',                  'Lima'),
  ('San Juan de Miraflores', 'Lima'),
  ('Villa El Salvador',      'Lima'),
  ('Ate',                    'Lima'),
  ('Santa Anita',            'Lima'),
  ('La Victoria',            'Lima'),
  ('Breña',                  'Lima'),
  ('Cercado de Lima',        'Lima'),
  ('Rímac',                  'Lima'),
  ('Carabayllo',             'Lima'),
  ('San Juan de Lurigancho', 'Lima'),
  ('Lurín',                  'Lima'),
  ('Pachacámac',             'Lima'),
  -- Arequipa
  ('Arequipa',               'Arequipa'),
  ('Cayma',                  'Arequipa'),
  ('Yanahuara',              'Arequipa'),
  ('Cerro Colorado',         'Arequipa'),
  ('Paucarpata',             'Arequipa'),
  -- Cusco
  ('Cusco',                  'Cusco'),
  ('San Sebastián',          'Cusco'),
  ('San Jerónimo',           'Cusco'),
  ('Wanchaq',                'Cusco'),
  -- Trujillo
  ('Trujillo',               'Trujillo'),
  ('Víctor Larco',           'Trujillo'),
  ('El Porvenir',            'Trujillo'),
  ('Florencia de Mora',      'Trujillo'),
  -- Piura
  ('Piura',                  'Piura'),
  ('Castilla',               'Piura'),
  ('Veintiséis de Octubre',  'Piura'),
  -- Chiclayo
  ('Chiclayo',               'Chiclayo'),
  ('José Leonardo Ortiz',    'Chiclayo'),
  ('La Victoria',            'Chiclayo');


-- ── 12. STORAGE ─────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('class-images', 'class-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "class_images_read"   ON storage.objects;
DROP POLICY IF EXISTS "class_images_upload" ON storage.objects;
DROP POLICY IF EXISTS "class_images_delete" ON storage.objects;

-- Lectura pública (bucket público)
CREATE POLICY "class_images_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'class-images');

-- Subida: solo a la propia carpeta <user-id>/...
CREATE POLICY "class_images_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'class-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Borrado: solo el dueño de la carpeta
CREATE POLICY "class_images_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'class-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
