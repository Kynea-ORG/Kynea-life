import { NextResponse } from 'next/server';
import { publishDuePosts } from '@/lib/blog/cron';

// Disparado por Vercel Cron (ver vercel.json, cada 5 minutos) — Vercel manda
// el header Authorization con el valor de CRON_SECRET cuando esa env var
// está configurada en el proyecto; sin ese secreto seteado, esta ruta queda
// bloqueada por defecto (falla el chequeo aunque alguien la pegue a mano),
// nunca abierta al público sin querer.
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const result = await publishDuePosts();
  return NextResponse.json(result);
}
