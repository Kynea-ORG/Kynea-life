export type ClassStatus = 'published' | 'draft' | 'finished' | 'archived';
export type ClassType = 'clase' | 'taller' | 'curso' | 'masterclass' | 'evento' | 'clase-suelta';
export type DanceStyle = string;
export type Level = string;
export type Modality = 'Presencial' | 'Online';
export type PriceType = 'Gratis' | 'Por clase' | 'Mensual' | 'Paquete';

// Catalog types returned by fetch functions (DB tables)
export interface DbDanceStyle { id: number; name: string; slug: string; emoji: string; }
export interface DbLevel { id: number; name: string; }
export interface DbDistrict { id: number; name: string; city: string; }

export interface Teacher {
  id: string;
  name: string;
  type: 'profesor' | 'academia';
  photo: string;
  city: string;
  district: string;
  bio: string;
  experience: number;
  styles: DanceStyle[];
  whatsapp: string;
  email: string;
  instagram?: string;
  tiktok?: string;
  youtube?: string;
  website?: string;
  rating?: number;
  totalClasses?: number;
}

export interface TimeSlot {
  days: string[];
  startTime: string;
  endTime: string;
}

export interface ClassMetrics {
  views: number;
  contacts: number;
  saved: number;
}

export interface DanceClass {
  id: string;
  type: ClassType;
  title: string;
  slug?: string;
  style: DanceStyle;
  secondaryStyles?: DanceStyle[];
  level: Level;
  shortDescription: string;
  fullDescription: string;
  whatYouLearn?: string[];
  forWhom?: string;
  requirements?: string;

  startDate: string;
  endDate?: string;
  timeSlots: TimeSlot[];

  priceType: PriceType;
  price: number;
  offerPrice?: number;
  currency: string;
  maxSpots?: number;
  availableSpots?: number;
  isTrialFree?: boolean;

  modality: Modality;
  city: string;
  district: string;
  venueName?: string;
  address?: string;
  reference?: string;
  mapsUrl?: string;
  lat?: number;
  lng?: number;
  platform?: string;
  accessLink?: string;

  coverImage: string;
  gallery?: string[];
  videoUrl?: string;

  footwear?: string;
  clothing?: string;
  toBring?: string[];
  ageGroup?: string;
  contactMode?: 'whatsapp' | 'instagram' | 'web';

  status: ClassStatus;
  teacher: Teacher;
  metrics: ClassMetrics;
  createdAt: string;
  publishedAt?: string;
}
