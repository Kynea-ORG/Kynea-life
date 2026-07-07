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
