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
