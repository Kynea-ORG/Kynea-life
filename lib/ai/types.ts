// lib/ai/types.ts

export interface AiSearchFilters {
  style?: string | null;
  district?: string | null;
  city?: string | null;
  maxPrice?: number | null;
  daysOfWeek?: number[] | null; // 0 = Lunes, 1 = Martes, ..., 6 = Domingo
  modality?: 'Presencial' | 'Online' | null;
  level?: string | null;
  ageGroup?: string | null;
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night' | null;
}

export interface AiSearchInterpretation {
  filters: AiSearchFilters;
  semanticQuery: string;
  aiSummary: string;
  matchBadges: string[];
  isDirectProfileSearch: boolean;
  profileTarget?: {
    name: string;
    role: 'profesor' | 'academia';
  } | null;
}

export interface ClassEmbeddingInput {
  title: string;
  styles: string[];
  level?: string | null;
  modality: string;
  ageGroup?: string | null;
  district?: string | null;
  city?: string | null;
  venueName?: string | null;
  price?: number | null;
  currency?: string | null;
  shortDescription?: string | null;
  fullDescription?: string | null;
  whatYouLearn?: string[] | null;
  forWhom?: string | null;
  requirements?: string[] | string | null;
}


export interface AiSearchResult {
  classes: import('@/lib/types').DanceClass[];
  aiSummary: string | null;
  matchBadges: string[];
  interpretation: AiSearchInterpretation | null;
}
