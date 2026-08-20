-- 42. ACADEMIA — marca de "ya vio la bienvenida" tras ser aprobada.
--
-- Cuando approve_academia_request() aprueba una solicitud, profiles.role
-- pasa a 'academia' y academia_approved_at queda seteado (migración 39),
-- pero eso ocurre del lado del admin — la academia recién se entera la
-- próxima vez que abre su dashboard. Este campo permite mostrarle una
-- pantalla de bienvenida/felicitación una sola vez la primera vez que
-- entra después de la aprobación, sin repetirla en visitas siguientes.
ALTER TABLE public.profiles
  ADD COLUMN academia_welcome_seen_at timestamptz;
