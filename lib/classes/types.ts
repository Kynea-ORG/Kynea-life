import type { ClassStatus, ClassType, Modality, PriceType } from '@/lib/types';

export type FormSlot = { days: string[]; startTime: string; endTime: string };

export interface ClassFilters {
  query?:      string;
  styles?:     string[];
  levels?:     string[];
  modalities?: string[];
  types?:      string[];
  days?:       string[];
  city?:       string;
  withSpots?:  boolean;
}

export interface ClassUpdatePayload {
  status?:           ClassStatus;
  published_at?:     string | null;
  type?:             ClassType;
  title?:            string;
  level_id?:         number | null;
  venue_id?:         string | null;
  short_description?: string | null;
  full_description?: string | null;
  start_date?:       string | null;
  end_date?:         string | null;
  price_type?:       PriceType;
  price?:            number;
  offer_price?:      number | null;
  currency?:         string;
  max_spots?:        number | null;
  available_spots?:  number | null;
  modality?:         Modality;
  platform?:         string | null;
  access_link?:      string | null;
  footwear?:         string | null;
  clothing?:         string | null;
  requirements?:     string | null;
  age_group?:        string | null;
  to_bring?:         string[];
  contact_mode?:     'whatsapp' | 'instagram' | 'both';
  cover_image?:      string | null;
  cover_image_position?: string;
}

// Shape returned by CLASS_SELECT (DB columns + joined relations)

export interface DbClassSchedule {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export interface DbClassStyle {
  style_id: number;
  is_main: boolean;
  dance_styles: { id: number; name: string } | null;
}

export interface DbVenue {
  name: string | null;
  address: string | null;
  reference: string | null;
  maps_url: string | null;
  place_id: string | null;
  lat: number | null;
  lng: number | null;
  district: { name: string; city: string } | null;
}

export interface DbTeacherProfile {
  id: string;
  name: string;
  role: string;
  photo_url: string | null;
  photo_position?: string | null;
  bio: string | null;
  years_experience: number | null;
  whatsapp: string | null;
  instagram: string | null;
  tiktok: string | null;
  youtube: string | null;
  website: string | null;
  district: { name: string; city: string } | null;
  profile_styles: Array<{ style_id: number; dance_styles: { name: string } | null }>;
  rating?: number | null;
  total_classes?: number | null;
}

export interface DbClassRow {
  id: string;
  type: string;
  title: string;
  slug: string | null;
  status: string;
  teacher_id: string;
  level_id: number | null;
  venue_id: string | null;
  short_description: string | null;
  full_description: string | null;
  what_you_learn: string[] | null;
  for_whom: string | null;
  requirements: string | null;
  start_date: string | null;
  end_date: string | null;
  price_type: string;
  price: number | string;
  offer_price: number | string | null;
  currency: string | null;
  max_spots: number | null;
  available_spots: number | null;
  is_trial_free: boolean | null;
  modality: string;
  platform: string | null;
  access_link: string | null;
  cover_image: string | null;
  cover_image_position: string | null;
  gallery: string[] | null;
  video_url: string | null;
  footwear: string | null;
  clothing: string | null;
  to_bring: string[] | null;
  age_group: string | null;
  contact_mode: string | null;
  views_count: number | null;
  contacts_count: number | null;
  saved_count: number | null;
  created_at: string | null;
  updated_at: string | null;
  published_at: string | null;
  // Relations
  level: { id: number; name: string } | null;
  class_styles: DbClassStyle[];
  class_schedules: DbClassSchedule[];
  venue: DbVenue | null;
  teacher: DbTeacherProfile | null;
}
