-- 57_pgvector_ai_search.sql
-- Habilita pgvector y búsqueda híbrida (semántica + relacional) para clases

-- 1. Habilitar extensión vector
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Columna de embeddings en classes (768 dimensiones para Google text-embedding-004)
ALTER TABLE classes 
ADD COLUMN IF NOT EXISTS embedding vector(768);

-- 3. Índice HNSW para similitud coseno ultrarrápida
CREATE INDEX IF NOT EXISTS classes_embedding_hnsw_idx 
ON classes 
USING hnsw (embedding vector_cosine_ops)
WHERE status = 'published';

-- 4. Función RPC de búsqueda híbrida
-- Combina filtros duros (estilo, distrito, ciudad, precio, días, modalidad, nivel, grupo etario)
-- con afinidad semántica vectorial en una sola pasada.
CREATE OR REPLACE FUNCTION match_classes_hybrid(
  query_embedding vector(768) DEFAULT NULL,
  filter_style text DEFAULT NULL,
  filter_district text DEFAULT NULL,
  filter_city text DEFAULT NULL,
  filter_max_price numeric DEFAULT NULL,
  filter_days int[] DEFAULT NULL,
  filter_modality text DEFAULT NULL,
  filter_level text DEFAULT NULL,
  filter_age_group text DEFAULT NULL,
  match_threshold float DEFAULT 0.0,
  match_count int DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  similarity float
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    CASE
      WHEN query_embedding IS NOT NULL AND c.embedding IS NOT NULL
        THEN (1 - (c.embedding <=> query_embedding))::float
      ELSE 1.0::float
    END AS similarity
  FROM classes c
  LEFT JOIN venues v ON c.venue_id = v.id
  WHERE c.status = 'published'
    AND (c.end_date IS NULL OR c.end_date >= CURRENT_DATE)
    AND (filter_max_price IS NULL OR c.price <= filter_max_price)
    AND (filter_modality IS NULL OR c.modality ILIKE filter_modality)
    AND (filter_age_group IS NULL OR c.age_group ILIKE '%' || filter_age_group || '%')
    AND (filter_city IS NULL OR v.city ILIKE '%' || filter_city || '%')
    AND (filter_district IS NULL OR v.district ILIKE '%' || filter_district || '%')
    -- Filtro de estilo (dance_styles)
    AND (
      filter_style IS NULL OR EXISTS (
        SELECT 1 FROM class_styles cs
        JOIN dance_styles ds ON cs.style_id = ds.id
        WHERE cs.class_id = c.id AND ds.name ILIKE '%' || filter_style || '%'
      )
    )
    -- Filtro de nivel (class_levels)
    AND (
      filter_level IS NULL OR EXISTS (
        SELECT 1 FROM class_levels cl
        WHERE cl.id = c.level_id AND cl.name ILIKE '%' || filter_level || '%'
      )
    )
    -- Filtro de días de la semana (0=Lunes, ..., 6=Domingo)
    AND (
      filter_days IS NULL OR EXISTS (
        SELECT 1 FROM class_schedules sched
        WHERE sched.class_id = c.id AND sched.day_of_week = ANY(filter_days)
      )
    )
    -- Umbral de similitud semántica (si se proporcionó query_embedding)
    AND (
      query_embedding IS NULL 
      OR c.embedding IS NULL 
      OR (1 - (c.embedding <=> query_embedding)) >= match_threshold
    )
  ORDER BY
    CASE 
      WHEN query_embedding IS NOT NULL AND c.embedding IS NOT NULL
        THEN (c.embedding <=> query_embedding)
      ELSE 0
    END ASC,
    c.views_count DESC,
    c.created_at DESC
  LIMIT match_count;
END;
$$;

-- 5. Permisos de ejecución
GRANT EXECUTE ON FUNCTION match_classes_hybrid TO anon, authenticated, service_role;
