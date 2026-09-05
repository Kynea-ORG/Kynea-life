import { COUNTRIES } from './countries';

export const NATIONALITIES: string[] = [
  ...COUNTRIES.map(c => c.name),
  'Otro',
];
