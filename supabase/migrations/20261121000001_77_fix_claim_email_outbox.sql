-- ============================================================================
-- Migración 77: Corrige ambigüedad de columna `attempts` en claim_email_outbox
-- En PL/pgSQL con RETURNS TABLE (..., attempts integer), `attempts` sin
-- calificar en el UPDATE previo provocaba SQLSTATE 42702 ("column reference
-- attempts is ambiguous") e impedía reclamar correos de email_outbox.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.claim_email_outbox(p_limit integer DEFAULT 25)
RETURNS TABLE (id uuid, to_email text, template text, payload jsonb, attempts integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  -- Marca como fallidos los correos que ya agotaron sus 5 intentos y quedaron abandonados.
  UPDATE public.email_outbox e
  SET status = 'failed',
      claimed_at = NULL,
      last_error = COALESCE(e.last_error, 'Máximo de reintentos alcanzado tras abandono')
  WHERE e.status = 'sending'
    AND e.attempts >= 5
    AND e.claimed_at < now() - interval '10 minutes';

  RETURN QUERY
  UPDATE public.email_outbox o
  SET status = 'sending',
      claimed_at = now(),
      attempts = o.attempts + 1
  WHERE o.id IN (
    SELECT q.id FROM public.email_outbox q
    WHERE q.attempts < 5
      AND (q.status = 'pending' OR (q.status = 'sending' AND q.claimed_at < now() - interval '10 minutes'))
    ORDER BY q.created_at
    LIMIT GREATEST(COALESCE(p_limit, 25), 1)
    FOR UPDATE SKIP LOCKED
  )
  RETURNING o.id, o.to_email, o.template, o.payload, o.attempts;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_email_outbox(integer) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.claim_email_outbox(integer) TO service_role;
