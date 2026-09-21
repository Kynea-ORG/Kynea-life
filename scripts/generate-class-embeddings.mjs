#!/usr/bin/env node
/**
 * Script para generar embeddings retroactivos de clases en Supabase usando Google Gemini (text-embedding-004).
 *
 * Uso:
 *   node scripts/generate-class-embeddings.mjs --dev
 *   node scripts/generate-class-embeddings.mjs --dev --all      # Regenera todas incluso si ya tienen embedding
 *   node scripts/generate-class-embeddings.mjs --prod
 */

import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const args = process.argv.slice(2);
const flag = name => args.includes(`--${name}`);
const IS_DEV = flag('dev');
const IS_PROD = flag('prod');
const REGEN_ALL = flag('all');

function loadEnvFile() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, 'utf8');
  const vars = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      vars[key] = val;
    }
  }
  return vars;
}

const fileEnv = loadEnvFile();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || fileEnv.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error('❌ Error: GEMINI_API_KEY no está configurada en .env.local ni en las variables de entorno.');
  process.exit(1);
}

let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || fileEnv.NEXT_PUBLIC_SUPABASE_URL;
let supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || fileEnv.SUPABASE_SERVICE_ROLE_KEY;

if (IS_PROD) {
  supabaseUrl = 'https://hmvonvxgmvwfnhlmrgpg.supabase.co';
  supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || fileEnv.SUPABASE_SERVICE_ROLE_KEY;
} else if (IS_DEV) {
  supabaseUrl = 'https://uibigobubqrolozvrkzd.supabase.co';
  supabaseKey =
    process.env.DEV_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    fileEnv.SUPABASE_SERVICE_ROLE_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpYmlnb2J1YnFyb2xvenZya3pkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzI3OTU2MSwiZXhwIjoyMDk4ODU1NTYxfQ.Zqr5Qb1Yax_GUdawxKp1r-hveSs4Bb-PGf09ZVr2JYM';
}


if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Supabase URL o Service Role Key no encontradas.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function buildClassText(c) {
  const parts = [];
  parts.push(`Clase: ${c.title.trim()}`);

  const styles = (c.class_styles || [])
    .map(cs => cs.dance_styles?.name)
    .filter(Boolean);
  if (styles.length > 0) parts.push(`Estilos de baile: ${styles.join(', ')}`);

  const meta = [];
  if (c.level?.name) meta.push(`Nivel: ${c.level.name}`);
  if (c.modality) meta.push(`Modalidad: ${c.modality}`);
  if (c.age_group) meta.push(`Grupo etario: ${c.age_group}`);
  if (meta.length > 0) parts.push(meta.join(' | '));

  const location = [];
  if (c.venue?.name) location.push(c.venue.name);
  if (c.venue?.district) location.push(c.venue.district);
  if (c.venue?.city) location.push(c.venue.city);
  if (location.length > 0) parts.push(`Ubicación: ${location.join(', ')}`);

  if (c.price !== undefined && c.price !== null) {
    parts.push(`Precio: ${c.currency || 'PEN'} ${c.price}`);
  }

  if (c.short_description?.trim()) parts.push(`Resumen: ${c.short_description.trim()}`);
  if (c.full_description?.trim()) parts.push(`Detalles: ${c.full_description.trim()}`);

  if (Array.isArray(c.what_you_learn) && c.what_you_learn.length > 0) {
    parts.push(`Qué aprenderás: ${c.what_you_learn.join('. ')}`);
  }

  if (c.for_whom?.trim()) parts.push(`Para quién es: ${c.for_whom.trim()}`);

  if (Array.isArray(c.requirements) && c.requirements.length > 0) {
    const cleanReqs = c.requirements.map(r => String(r).trim()).filter(Boolean);
    if (cleanReqs.length > 0) parts.push(`Requisitos: ${cleanReqs.join('. ')}`);
  } else if (typeof c.requirements === 'string' && c.requirements.trim()) {
    parts.push(`Requisitos: ${c.requirements.trim()}`);
  }

  return parts.join('\n');

}

async function getEmbedding(text) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'models/gemini-embedding-001',
      content: { parts: [{ text }] },
      outputDimensionality: 768,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini Embedding Error HTTP ${res.status}: ${errText}`);
  }

  const data = await res.json();
  return data?.embedding?.values;
}


async function run() {
  console.log('🚀 Iniciando sincronización de embeddings con Google Gemini...');
  console.log(`📡 Conectado a: ${supabaseUrl}`);

  let query = supabase
    .from('classes')
    .select(`
      id, title, modality, price, currency, short_description, full_description,
      what_you_learn, for_whom, requirements, age_group, embedding,
      level:class_levels(name),
      venue:venues(name, district, city),
      class_styles(dance_styles(name))
    `)
    .eq('status', 'published');

  if (!REGEN_ALL) {
    query = query.is('embedding', null);
  }

  const { data: classes, error } = await query;
  if (error) {
    console.error('❌ Error consultando clases:', error.message);
    process.exit(1);
  }

  console.log(`📋 Encontradas ${classes.length} clases publicadas para vectorizar.`);
  if (classes.length === 0) {
    console.log('✅ Nada que actualizar.');
    return;
  }

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < classes.length; i++) {
    const c = classes[i];
    const text = buildClassText(c);
    console.log(`[${i + 1}/${classes.length}] Generando vector para: "${c.title}"...`);

    try {
      const vector = await getEmbedding(text);
      if (!vector || vector.length !== 768) {
        throw new Error(`Vector inválido recibido: longitud ${vector?.length}`);
      }

      const { error: updateErr } = await supabase
        .from('classes')
        .update({ embedding: vector })
        .eq('id', c.id);

      if (updateErr) throw updateErr;

      successCount++;
      // Pequeña pausa para respetar límites de cuota
      await new Promise(r => setTimeout(r, 150));
    } catch (err) {
      console.error(`❌ Falló la clase ${c.id}:`, err.message);
      errorCount++;
    }
  }

  console.log('\n📊 Resumen de sincronización:');
  console.log(`✅ Exitosas: ${successCount}`);
  console.log(`❌ Con error: ${errorCount}`);
  console.log('🎉 Finalizado con éxito.');
}

run();
