export type ClassStatus = 'published' | 'draft' | 'finished' | 'archived';
export type ClassType = 'clase' | 'taller' | 'curso' | 'masterclass' | 'intensivo';
export type DanceStyle =
  | 'Salsa' | 'Bachata' | 'Ballet' | 'Breakdance' | 'Cha-cha-chá'
  | 'Contemporáneo' | 'Dancehall' | 'Folklore' | 'Heels' | 'Hip Hop'
  | 'House' | 'Jazz' | 'Jazz Funk' | 'K-pop' | 'Reggaetón'
  | 'Tango' | 'Urbano' | 'Zumba' | 'Acroverticales';
export type Level = 'Inicial' | 'Básico' | 'Intermedio' | 'Avanzado' | 'Todos los niveles';
export type Modality = 'Presencial' | 'Online' | 'Híbrida';
export type PriceType = 'Gratis' | 'Por clase' | 'Mensual' | 'Paquete' | 'Precio único';

export interface Teacher {
  id: string;
  name: string;
  type: 'profesor' | 'academia' | 'colectivo';
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
  tiktokUrl?: string;
  instagramUrl?: string;

  footwear?: string;
  clothing?: string;
  toBring?: string[];
  ageGroup?: string;
  prerequisites?: string;

  status: ClassStatus;
  teacher: Teacher;
  metrics: ClassMetrics;
  createdAt: string;
  publishedAt?: string;
}
