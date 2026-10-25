import { NextResponse, type NextRequest } from 'next/server';
import { fetchPublishedClasses } from '@/lib/classes/queries';
import {
  generateCatalogAiSuggestions,
  getTodayLimaDateStr,
  getTodayWeekdayName,
  fetchDailySuggestionsFromDb,
} from '@/lib/search/catalogSignals';
import { getPublicClient } from '@/lib/supabase/public';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Verificación de seguridad de Vercel Cron mediante CRON_SECRET
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const todayDateStr = getTodayLimaDateStr();
  const todayWeekday = getTodayWeekdayName();

  try {
    const supabase = getPublicClient();

    // Verificamos si se solicita forzar regeneración vía query param ?force=true y la ciudad (?city=Lima o Online)
    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';
    const city = searchParams.get('city') || 'Lima';

    if (!force) {
      const existing = await fetchDailySuggestionsFromDb(supabase, todayDateStr, city);
      if (existing) {
        return NextResponse.json({
          ok: true,
          status: 'already_cached',
          date: todayDateStr,
          weekday: todayWeekday,
          city,
          suggestions: existing,
        });
      }
    }

    // Obtenemos clases publicadas del catálogo
    const classes = await fetchPublishedClasses();

    // Generamos con Gemini y persistimos en PostgreSQL
    const suggestions = await generateCatalogAiSuggestions(classes, supabase, { force, city });

    return NextResponse.json({
      ok: true,
      status: 'generated_and_saved',
      date: todayDateStr,
      weekday: todayWeekday,
      city,
      suggestions,
    });
  } catch (error) {
    console.error('[cron/daily-suggestions] Error ejecutando cron diario:', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
